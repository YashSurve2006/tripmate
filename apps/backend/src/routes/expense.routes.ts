import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../prisma';
import {
  calculateEqualSplitPaise,
  computeGroupBalances,
  validatePaymentsReconciliation,
  validateSplitsReconciliation,
} from '../utils/finance';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export const expenseRouter = Router({ mergeParams: true });

expenseRouter.use(requireAuth);

const createExpenseSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(100),
    notes: z.string().optional(),
    amountPaise: z.union([z.number(), z.string(), z.bigint()]),
    currency: z.string().default('INR'),
    category: z.enum([
      'FOOD_AND_DRINK',
      'TRANSPORT',
      'ACCOMMODATION',
      'ENTERTAINMENT',
      'SHOPPING',
      'GROCERIES',
      'FLIGHTS',
      'UTILITIES',
      'OTHER',
    ]).default('FOOD_AND_DRINK'),
    date: z.string().optional(),
    idempotencyKey: z.string().optional(),
    receiptUrl: z.string().url().optional().or(z.literal('')),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    // Payments: [{ userId: string, amountPaise: number | string }]
    payments: z.array(
      z.object({
        userId: z.string().uuid(),
        amountPaise: z.union([z.number(), z.string(), z.bigint()]),
      })
    ).min(1, 'At least one payer is required'),
    // Splits: can be explicit or equal
    splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE']).default('EQUAL'),
    participants: z.array(z.string().uuid()).optional(),
    customSplits: z.array(
      z.object({
        userId: z.string().uuid(),
        amountPaise: z.union([z.number(), z.string(), z.bigint()]),
        percentage: z.number().optional(),
      })
    ).optional(),
  }),
});

// List expenses for a group
expenseRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const groupId = (req.params as any).groupId;

    // Verify user is in group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You are not a member of this group');
    }

    const expenses = await prisma.expense.findMany({
      where: { groupId },
      orderBy: { date: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, avatarUrl: true },
        },
        payments: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        splits: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    return sendSuccess(res, { expenses });
  } catch (err) {
    next(err);
  }
});

// Create expense with transactional guarantee
expenseRouter.post('/', validate(createExpenseSchema), async (req, res, next) => {
  try {
    const currentUserId = req.user!.userId;
    const groupId = (req.params as any).groupId;
    const {
      title,
      notes,
      amountPaise,
      currency,
      category,
      date,
      idempotencyKey,
      receiptUrl,
      latitude,
      longitude,
      payments,
      splitType,
      participants,
      customSplits,
    } = req.body;

    const totalPaise = BigInt(amountPaise);
    if (totalPaise <= 0n) {
      throw new BadRequestError('Amount must be greater than zero');
    }

    // Check idempotency if key provided
    if (idempotencyKey) {
      const existing = await prisma.expense.findUnique({
        where: { idempotencyKey },
        include: { payments: true, splits: true },
      });
      if (existing) {
        return sendSuccess(res, { expense: existing, isDuplicate: true }, 200);
      }
    }

    // Check membership of current user
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    const memberUserIds = new Set(group.members.map((m: any) => m.userId));
    if (!memberUserIds.has(currentUserId)) {
      throw new ForbiddenError('You are not a member of this group');
    }

    // Validate all payers are group members
    const parsedPayments: { userId: string; amountPaise: bigint }[] = payments.map(
      (p: { userId: string; amountPaise: any }) => ({
        userId: p.userId,
        amountPaise: BigInt(p.amountPaise),
      })
    );

    for (const p of parsedPayments) {
      if (!memberUserIds.has(p.userId)) {
        throw new BadRequestError(`Payer ${p.userId} is not a member of this group`);
      }
    }

    // Enforce: sum of payments equals total amount
    if (!validatePaymentsReconciliation(totalPaise, parsedPayments)) {
      throw new BadRequestError('Sum of payments must equal the total expense amount');
    }

    // Compute splits
    let parsedSplits: { userId: string; amountPaise: bigint; splitType: any; percentage?: number }[] = [];

    if (splitType === 'EQUAL') {
      const targetParticipants: string[] =
        participants && participants.length > 0 ? participants : Array.from(memberUserIds);

      // Verify all participants are members
      for (const pId of targetParticipants) {
        if (!memberUserIds.has(pId)) {
          throw new BadRequestError(`Participant ${pId} is not a member of this group`);
        }
      }

      const calculated = calculateEqualSplitPaise(totalPaise, targetParticipants);
      parsedSplits = calculated.map((c) => ({
        userId: c.userId,
        amountPaise: c.amountPaise,
        splitType: 'EQUAL',
      }));
    } else {
      if (!customSplits || customSplits.length === 0) {
        throw new BadRequestError('customSplits must be provided for non-equal split');
      }

      parsedSplits = customSplits.map((s: { userId: string; amountPaise: any; percentage?: number }) => ({
        userId: s.userId,
        amountPaise: BigInt(s.amountPaise),
        splitType,
        percentage: s.percentage,
      }));

      // Verify all participants are members
      for (const s of parsedSplits) {
        if (!memberUserIds.has(s.userId)) {
          throw new BadRequestError(`Split participant ${s.userId} is not a member of this group`);
        }
      }

      // Enforce: sum of splits equals total amount
      if (!validateSplitsReconciliation(totalPaise, parsedSplits)) {
        throw new BadRequestError('Sum of expense splits must equal the total expense amount');
      }
    }

    // Execute in a single transactional unit
    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          groupId,
          title,
          notes: notes || null,
          amountPaise: totalPaise,
          currency,
          category,
          date: date ? new Date(date) : new Date(),
          idempotencyKey: idempotencyKey || null,
          receiptUrl: receiptUrl || null,
          latitude: latitude || null,
          longitude: longitude || null,
          createdById: currentUserId,
          payments: {
            create: parsedPayments.map((p) => ({
              userId: p.userId,
              amountPaise: p.amountPaise,
            })),
          },
          splits: {
            create: parsedSplits.map((s) => ({
              userId: s.userId,
              amountPaise: s.amountPaise,
              splitType: s.splitType,
              percentage: s.percentage || null,
            })),
          },
        },
        include: {
          payments: {
            include: { user: { select: { id: true, name: true } } },
          },
          splits: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });

      // Record activity
      await tx.activity.create({
        data: {
          groupId,
          userId: currentUserId,
          action: 'EXPENSE_CREATED',
          message: `Expense "${title}" added`,
          metadata: { expenseId: created.id, amountPaise: totalPaise.toString() },
        },
      });

      return created;
    });

    return sendSuccess(res, { expense }, 201);
  } catch (err) {
    next(err);
  }
});

// Group Balances & Debt Simplification
expenseRouter.get('/balances', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const groupId = (req.params as any).groupId;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, upiId: true } },
          },
        },
        expenses: {
          include: {
            payments: true,
            splits: true,
          },
        },
        settlements: {
          where: { status: 'CONFIRMED' },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    const isMember = group.members.some((m: any) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenError('You are not a member of this group');
    }

    const memberIds = group.members.map((m: any) => m.userId);

    const allPayments: { userId: string; amountPaise: bigint }[] = [];
    const allSplits: { userId: string; amountPaise: bigint }[] = [];

    for (const exp of group.expenses) {
      for (const p of exp.payments) {
        allPayments.push({ userId: p.userId, amountPaise: p.amountPaise });
      }
      for (const s of exp.splits) {
        allSplits.push({ userId: s.userId, amountPaise: s.amountPaise });
      }
    }

    const confirmedSettlements = group.settlements.map((s: any) => ({
      payerId: s.payerId,
      payeeId: s.payeeId,
      amountPaise: s.amountPaise,
    }));

    const result = computeGroupBalances(memberIds, allPayments, allSplits, confirmedSettlements);

    // Map user metadata
    const userMap: Record<string, any> = {};
    for (const m of group.members) {
      userMap[m.userId] = m.user;
    }

    const enrichedTransfers = result.transfers.map((t) => ({
      fromUser: userMap[t.fromUserId],
      toUser: userMap[t.toUserId],
      amountPaise: t.amountPaise.toString(),
      currency: group.currency,
    }));

    const formattedBalances: Record<string, any> = {};
    for (const [id, b] of Object.entries(result.balances)) {
      formattedBalances[id] = {
        user: userMap[id],
        balancePaise: b.balancePaise.toString(),
        totalPaidPaise: b.totalPaidPaise.toString(),
        totalSharePaise: b.totalSharePaise.toString(),
        totalSettlementReceivedPaise: b.totalSettlementReceivedPaise.toString(),
        totalSettlementPaidPaise: b.totalSettlementPaidPaise.toString(),
      };
    }

    return sendSuccess(res, {
      groupId,
      currency: group.currency,
      isZeroSum: result.isZeroSum,
      balances: formattedBalances,
      suggestedTransfers: enrichedTransfers,
    });
  } catch (err) {
    next(err);
  }
});
