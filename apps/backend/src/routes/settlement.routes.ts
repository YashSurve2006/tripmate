import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export const settlementRouter = Router({ mergeParams: true });

settlementRouter.use(requireAuth);

const createSettlementSchema = z.object({
  body: z.object({
    payeeId: z.string().uuid('Valid payee userId is required'),
    amountPaise: z.union([z.number(), z.string(), z.bigint()]),
    currency: z.string().default('INR'),
    notes: z.string().optional(),
    proofUrl: z.string().url().optional().or(z.literal('')),
  }),
});

// List settlements for group
settlementRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const groupId = (req.params as any).groupId;

    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You are not a member of this group');
    }

    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      include: {
        payer: { select: { id: true, name: true, avatarUrl: true, upiId: true } },
        payee: { select: { id: true, name: true, avatarUrl: true, upiId: true } },
      },
    });

    return sendSuccess(res, { settlements });
  } catch (err) {
    next(err);
  }
});

// Record a settlement payment
settlementRouter.post('/', validate(createSettlementSchema), async (req, res, next) => {
  try {
    const payerId = req.user!.userId;
    const groupId = (req.params as any).groupId;
    const { payeeId, amountPaise, currency, notes, proofUrl } = req.body;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    const memberIds = new Set(group.members.map((m: any) => m.userId));
    if (!memberIds.has(payerId)) {
      throw new ForbiddenError('You are not a member of this group');
    }
    if (!memberIds.has(payeeId)) {
      throw new ForbiddenError('Payee is not a member of this group');
    }

    const settlement = await prisma.$transaction(async (tx) => {
      const created = await tx.settlement.create({
        data: {
          groupId,
          payerId,
          payeeId,
          amountPaise: BigInt(amountPaise),
          currency,
          notes: notes || null,
          proofUrl: proofUrl || null,
          status: 'PENDING',
        },
        include: {
          payer: { select: { id: true, name: true } },
          payee: { select: { id: true, name: true } },
        },
      });

      await tx.activity.create({
        data: {
          groupId,
          userId: payerId,
          action: 'SETTLEMENT_RECORDED',
          message: `${created.payer.name} recorded a payment to ${created.payee.name}`,
        },
      });

      return created;
    });

    return sendSuccess(res, { settlement }, 201);
  } catch (err) {
    next(err);
  }
});

// Confirm settlement receipt
settlementRouter.patch('/:id/confirm', async (req, res, next) => {
  try {
    const currentUserId = req.user!.userId;
    const { id } = req.params;

    const settlement = await prisma.settlement.findUnique({
      where: { id },
    });

    if (!settlement) {
      throw new NotFoundError('Settlement not found');
    }

    if (settlement.payeeId !== currentUserId) {
      throw new ForbiddenError('Only the recipient of the settlement can confirm receipt');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const confirmed = await tx.settlement.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
        include: {
          payer: { select: { id: true, name: true } },
          payee: { select: { id: true, name: true } },
        },
      });

      await tx.activity.create({
        data: {
          groupId: settlement.groupId,
          userId: currentUserId,
          action: 'SETTLEMENT_CONFIRMED',
          message: `${confirmed.payee.name} confirmed receiving payment from ${confirmed.payer.name}`,
        },
      });

      return confirmed;
    });

    return sendSuccess(res, { settlement: updated });
  } catch (err) {
    next(err);
  }
});
