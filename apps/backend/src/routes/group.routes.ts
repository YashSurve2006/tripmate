import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export const groupRouter = Router();

// Protect all group routes
groupRouter.use(requireAuth);

const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Group name must be at least 2 characters'),
    description: z.string().optional(),
    type: z.enum(['TRIP', 'ROOMMATES', 'OUTING', 'EVENT', 'OTHER']).default('TRIP'),
    currency: z.string().default('INR'),
    budgetPaise: z.union([z.number(), z.string(), z.bigint()]).optional(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
  }),
});

const joinGroupSchema = z.object({
  body: z.object({
    inviteCode: z.string().min(4, 'Valid invite code is required'),
  }),
});

// List groups for current user
groupRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, avatarUrl: true, email: true },
                },
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
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const groupsWithSummary = memberships.map((m) => {
      const g = m.group;
      let totalSpentPaise = 0n;
      let userPaidPaise = 0n;
      let userSharePaise = 0n;

      for (const exp of g.expenses) {
        totalSpentPaise += exp.amountPaise;
        for (const p of exp.payments) {
          if (p.userId === userId) userPaidPaise += p.amountPaise;
        }
        for (const s of exp.splits) {
          if (s.userId === userId) userSharePaise += s.amountPaise;
        }
      }

      let userSettlementPaid = 0n;
      let userSettlementRecv = 0n;
      for (const st of g.settlements) {
        if (st.payerId === userId) userSettlementPaid += st.amountPaise;
        if (st.payeeId === userId) userSettlementRecv += st.amountPaise;
      }

      const netBalancePaise = userPaidPaise - userSharePaise + userSettlementPaid - userSettlementRecv;

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        type: g.type,
        currency: g.currency,
        budgetPaise: g.budgetPaise ? g.budgetPaise.toString() : null,
        startDate: g.startDate,
        endDate: g.endDate,
        inviteCode: g.inviteCode,
        myRole: m.role,
        memberCount: g.members.length,
        members: g.members.map((mem) => ({
          userId: mem.user.id,
          name: mem.user.name,
          email: mem.user.email,
          avatarUrl: mem.user.avatarUrl,
          role: mem.role,
        })),
        totalSpentPaise: totalSpentPaise.toString(),
        myNetBalancePaise: netBalancePaise.toString(),
        createdAt: g.createdAt,
      };
    });

    return sendSuccess(res, { groups: groupsWithSummary });
  } catch (err) {
    next(err);
  }
});

// Create a new group
groupRouter.post('/', validate(createGroupSchema), async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { name, description, type, currency, budgetPaise, startDate, endDate } = req.body;

    const parsedBudget = budgetPaise ? BigInt(budgetPaise) : null;

    // Use a transaction to create group and add creator as ADMIN
    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: {
          name,
          description: description || null,
          type,
          currency,
          budgetPaise: parsedBudget,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          createdById: userId,
          members: {
            create: {
              userId,
              role: 'ADMIN',
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
        },
      });

      // Record activity
      await tx.activity.create({
        data: {
          groupId: created.id,
          userId,
          action: 'GROUP_CREATED',
          message: `Group "${created.name}" created`,
        },
      });

      return created;
    });

    return sendSuccess(res, { group }, 201);
  } catch (err) {
    next(err);
  }
});

// Get group by ID
groupRouter.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;

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

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, upiId: true },
            },
          },
        },
        expenses: {
          orderBy: { date: 'desc' },
          take: 20,
          include: {
            payments: {
              include: { user: { select: { id: true, name: true } } },
            },
            splits: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
        },
        settlements: {
          orderBy: { createdAt: 'desc' },
          include: {
            payer: { select: { id: true, name: true } },
            payee: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    return sendSuccess(res, { group, myRole: membership.role });
  } catch (err) {
    next(err);
  }
});

// Join group via invite code
groupRouter.post('/join', validate(joinGroupSchema), async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { inviteCode } = req.body;

    const group = await prisma.group.findUnique({
      where: { inviteCode },
    });

    if (!group) {
      throw new NotFoundError('No group found with this invite code');
    }

    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId,
        },
      },
    });

    if (existingMember) {
      return sendSuccess(res, { message: 'Already a member', group });
    }

    const membership = await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: 'MEMBER',
      },
    });

    await prisma.activity.create({
      data: {
        groupId: group.id,
        userId,
        action: 'MEMBER_JOINED',
        message: 'A new member joined the group',
      },
    });

    return sendSuccess(res, { message: 'Successfully joined group', group, membership }, 201);
  } catch (err) {
    next(err);
  }
});
