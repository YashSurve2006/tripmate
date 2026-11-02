import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../prisma';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import { sendSuccess } from '../utils/response';

export const settlementRouter = Router({ mergeParams: true });

settlementRouter.use(requireAuth);

const positivePaiseSchema = z.union([
  z.number().int().positive().safe(),
  z.string().regex(/^[1-9]\d*$/, 'Amount must be a positive integer number of paise'),
]);

const createSettlementSchema = z.object({
  body: z.object({
    payeeId: z.string().uuid('Valid payee userId is required'),
    amountPaise: positivePaiseSchema,
    currency: z.string().length(3).default('INR'),
    confirmationMode: z.enum(['INSTANT', 'REQUEST_CONFIRMATION']).default('REQUEST_CONFIRMATION'),
    notes: z.string().trim().max(180).optional(),
    proofUrl: z.string().url().optional().or(z.literal('')),
  }),
});

/**
 * Rebuilds the same deterministic greedy debt transfers used by the mobile
 * finance engine. Pending requests reserve part of a pair's debt but never
 * alter member balances until confirmed.
 */
async function getAvailablePairDebt(
  tx: any,
  groupId: string,
  payerId: string,
  payeeId: string,
  excludePendingSettlementId?: string
): Promise<bigint> {
  const group = await tx.group.findUnique({
    where: { id: groupId },
    include: {
      members: { orderBy: { joinedAt: 'asc' } },
      expenses: { include: { payments: true, splits: true } },
      settlements: true,
    },
  });

  if (!group) throw new NotFoundError('Group not found');

  const balances = new Map<string, bigint>();
  for (const member of group.members) balances.set(member.userId, 0n);

  for (const expense of group.expenses) {
    for (const payment of expense.payments) {
      balances.set(payment.userId, (balances.get(payment.userId) || 0n) + payment.amountPaise);
    }
    for (const split of expense.splits) {
      balances.set(split.userId, (balances.get(split.userId) || 0n) - split.amountPaise);
    }
  }

  for (const settlement of group.settlements) {
    if (settlement.status !== 'CONFIRMED') continue;
    balances.set(settlement.payerId, (balances.get(settlement.payerId) || 0n) + settlement.amountPaise);
    balances.set(settlement.payeeId, (balances.get(settlement.payeeId) || 0n) - settlement.amountPaise);
  }

  const debtors = [...balances.entries()]
    .filter(([, balance]) => balance < 0n)
    .map(([userId, balance]) => ({ userId, amount: -balance }))
    .sort((a, b) => a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1);

  const creditors = [...balances.entries()]
    .filter(([, balance]) => balance > 0n)
    .map(([userId, balance]) => ({ userId, amount: balance }))
    .sort((a, b) => a.amount === b.amount ? a.userId.localeCompare(b.userId) : a.amount > b.amount ? -1 : 1);

  let pairDebt = 0n;
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const transfer = debtor.amount < creditor.amount ? debtor.amount : creditor.amount;

    if (debtor.userId === payerId && creditor.userId === payeeId) {
      pairDebt = transfer;
      break;
    }

    debtor.amount -= transfer;
    creditor.amount -= transfer;
    if (debtor.amount === 0n) debtorIndex++;
    if (creditor.amount === 0n) creditorIndex++;
  }

  const pendingReserved = group.settlements
    .filter((item: any) =>
      item.status === 'PENDING' &&
      item.id !== excludePendingSettlementId &&
      item.payerId === payerId &&
      item.payeeId === payeeId
    )
    .reduce((sum: bigint, item: any) => sum + item.amountPaise, 0n);

  return pairDebt > pendingReserved ? pairDebt - pendingReserved : 0n;
}

// List all group settlements, including pending and rejected history.
settlementRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.groupId;

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new ForbiddenError('You are not a member of this group');

    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      include: {
        payer: { select: { id: true, name: true, avatarUrl: true, upiId: true } },
        payee: { select: { id: true, name: true, avatarUrl: true, upiId: true } },
      },
    });

    return sendSuccess(res, {
      settlements: settlements.map((item: any) => ({
        ...item,
        amountPaise: item.amountPaise.toString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Create either an instantly-confirmed payment or a pending receipt request.
settlementRouter.post('/', validate(createSettlementSchema), async (req, res, next) => {
  try {
    const payerId = req.user!.userId;
    const groupId = req.params.groupId;
    const { payeeId, amountPaise, currency, confirmationMode, notes, proofUrl } = req.body;
    const amount = BigInt(amountPaise);

    if (payerId === payeeId) throw new BadRequestError('You cannot settle a payment to yourself.');

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
    if (!group) throw new NotFoundError('Group not found');

    const memberIds = new Set(group.members.map((member: any) => member.userId));
    if (!memberIds.has(payerId)) throw new ForbiddenError('You are not a member of this group');
    if (!memberIds.has(payeeId)) throw new ForbiddenError('Payee is not a member of this group');

    const status = confirmationMode === 'INSTANT' ? 'CONFIRMED' : 'PENDING';
    const settlement = await prisma.$transaction(async (tx) => {
      const available = await getAvailablePairDebt(tx, groupId, payerId, payeeId);
      if (amount > available) {
        throw new ConflictError(
          available === 0n
            ? 'There is no available outstanding balance for this payment pair.'
            : `Payment exceeds the available outstanding balance of ${available.toString()} paise.`
        );
      }

      const created = await tx.settlement.create({
        data: {
          groupId,
          payerId,
          payeeId,
          amountPaise: amount,
          currency,
          notes: notes || null,
          proofUrl: proofUrl || null,
          status,
          confirmedAt: status === 'CONFIRMED' ? new Date() : null,
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
          action: status === 'CONFIRMED' ? 'SETTLEMENT_RECORDED' : 'SETTLEMENT_REQUESTED',
          message: status === 'CONFIRMED'
            ? `${created.payer.name} recorded a payment to ${created.payee.name}`
            : `${created.payer.name} requested confirmation for a payment to ${created.payee.name}`,
          metadata: { settlementId: created.id, amountPaise: amount.toString() },
        },
      });

      return created;
    }, { isolationLevel: 'Serializable' });

    return sendSuccess(res, {
      settlement: { ...settlement, amountPaise: settlement.amountPaise.toString() },
    }, 201);
  } catch (err) {
    next(err);
  }
});

// Only the recipient can confirm a pending payment. Confirmation is idempotent.
settlementRouter.patch('/:id/confirm', async (req, res, next) => {
  try {
    const currentUserId = req.user!.userId;
    const { id } = req.params;

    const settlement = await prisma.settlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundError('Settlement not found');
    if (settlement.payeeId !== currentUserId) {
      throw new ForbiddenError('Only the recipient can confirm receipt');
    }
    if (settlement.status !== 'PENDING') {
      throw new ConflictError('Only pending settlements can be confirmed');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const available = await getAvailablePairDebt(
        tx, settlement.groupId, settlement.payerId, settlement.payeeId, settlement.id
      );
      if (settlement.amountPaise > available) {
        throw new ConflictError('The outstanding balance changed. This payment can no longer be confirmed.');
      }

      const result = await tx.settlement.updateMany({
        where: { id, status: 'PENDING', payeeId: currentUserId },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });
      if (result.count !== 1) throw new ConflictError('This settlement has already been processed.');

      const confirmed = await tx.settlement.findUniqueOrThrow({
        where: { id },
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
          metadata: { settlementId: id, amountPaise: confirmed.amountPaise.toString() },
        },
      });
      return confirmed;
    }, { isolationLevel: 'Serializable' });

    return sendSuccess(res, {
      settlement: { ...updated, amountPaise: updated.amountPaise.toString() },
    });
  } catch (err) {
    next(err);
  }
});

// Only the recipient can reject a pending payment.
settlementRouter.patch('/:id/reject', async (req, res, next) => {
  try {
    const currentUserId = req.user!.userId;
    const { id } = req.params;
    const settlement = await prisma.settlement.findUnique({ where: { id } });

    if (!settlement) throw new NotFoundError('Settlement not found');
    if (settlement.payeeId !== currentUserId) {
      throw new ForbiddenError('Only the recipient can reject this payment');
    }
    if (settlement.status !== 'PENDING') {
      throw new ConflictError('Only pending settlements can be rejected');
    }

    const rejected = await prisma.$transaction(async (tx) => {
      const result = await tx.settlement.updateMany({
        where: { id, status: 'PENDING', payeeId: currentUserId },
        data: { status: 'REJECTED' },
      });
      if (result.count !== 1) throw new ConflictError('This settlement has already been processed.');

      const updated = await tx.settlement.findUniqueOrThrow({
        where: { id },
        include: {
          payer: { select: { id: true, name: true } },
          payee: { select: { id: true, name: true } },
        },
      });

      await tx.activity.create({
        data: {
          groupId: settlement.groupId,
          userId: currentUserId,
          action: 'SETTLEMENT_REJECTED',
          message: `${updated.payee.name} rejected the payment confirmation request from ${updated.payer.name}`,
          metadata: { settlementId: id },
        },
      });
      return updated;
    });

    return sendSuccess(res, {
      settlement: { ...rejected, amountPaise: rejected.amountPaise.toString() },
    });
  } catch (err) {
    next(err);
  }
});
