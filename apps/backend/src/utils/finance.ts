export interface BalanceSummary {
  userId: string;
  balancePaise: bigint;
  totalPaidPaise: bigint;
  totalSharePaise: bigint;
  totalSettlementReceivedPaise: bigint;
  totalSettlementPaidPaise: bigint;
}

export interface DebtTransferPaise {
  fromUserId: string;
  toUserId: string;
  amountPaise: bigint;
}

/**
 * Deterministic equal split for minor units (paise).
 * Returns integer shares that sum exactly to totalPaise.
 */
export function calculateEqualSplitPaise(
  totalPaise: bigint,
  participantUserIds: string[]
): { userId: string; amountPaise: bigint }[] {
  if (participantUserIds.length === 0) {
    throw new Error('At least one participant required');
  }
  if (totalPaise < 0n) {
    throw new Error('Total paise cannot be negative');
  }

  const sorted = [...participantUserIds].sort();
  const n = BigInt(sorted.length);
  const baseShare = totalPaise / n;
  const remainder = totalPaise % n;

  return sorted.map((userId, index) => {
    const extra = BigInt(index) < remainder ? 1n : 0n;
    return {
      userId,
      amountPaise: baseShare + extra,
    };
  });
}

/**
 * Validates that total payments match total expense amount.
 */
export function validatePaymentsReconciliation(
  totalPaise: bigint,
  payments: { userId: string; amountPaise: bigint }[]
): boolean {
  const sum = payments.reduce((acc, p) => acc + p.amountPaise, 0n);
  return sum === totalPaise;
}

/**
 * Validates that total splits match total expense amount.
 */
export function validateSplitsReconciliation(
  totalPaise: bigint,
  splits: { userId: string; amountPaise: bigint }[]
): boolean {
  const sum = splits.reduce((acc, s) => acc + s.amountPaise, 0n);
  return sum === totalPaise;
}

/**
 * Computes net balances for all members in a group.
 * Positive balance: user is OWED money
 * Negative balance: user OWES money
 * Sum across single-currency group must be zero.
 */
export function computeGroupBalances(
  memberIds: string[],
  payments: { userId: string; amountPaise: bigint }[],
  splits: { userId: string; amountPaise: bigint }[],
  confirmedSettlements: { payerId: string; payeeId: string; amountPaise: bigint }[]
): {
  balances: Record<string, BalanceSummary>;
  isZeroSum: boolean;
  transfers: DebtTransferPaise[];
} {
  const balances: Record<string, BalanceSummary> = {};

  for (const id of memberIds) {
    balances[id] = {
      userId: id,
      balancePaise: 0n,
      totalPaidPaise: 0n,
      totalSharePaise: 0n,
      totalSettlementReceivedPaise: 0n,
      totalSettlementPaidPaise: 0n,
    };
  }

  for (const p of payments) {
    if (balances[p.userId]) {
      balances[p.userId].totalPaidPaise += p.amountPaise;
    }
  }

  for (const s of splits) {
    if (balances[s.userId]) {
      balances[s.userId].totalSharePaise += s.amountPaise;
    }
  }

  for (const st of confirmedSettlements) {
    if (balances[st.payerId]) {
      balances[st.payerId].totalSettlementPaidPaise += st.amountPaise;
    }
    if (balances[st.payeeId]) {
      balances[st.payeeId].totalSettlementReceivedPaise += st.amountPaise;
    }
  }

  let groupSum = 0n;
  for (const id of Object.keys(balances)) {
    const b = balances[id];
    b.balancePaise =
      b.totalPaidPaise -
      b.totalSharePaise +
      b.totalSettlementPaidPaise -
      b.totalSettlementReceivedPaise;
    groupSum += b.balancePaise;
  }

  // Debt simplification
  const debtors: { userId: string; amount: bigint }[] = [];
  const creditors: { userId: string; amount: bigint }[] = [];

  for (const b of Object.values(balances)) {
    if (b.balancePaise < 0n) {
      debtors.push({ userId: b.userId, amount: -b.balancePaise });
    } else if (b.balancePaise > 0n) {
      creditors.push({ userId: b.userId, amount: b.balancePaise });
    }
  }

  debtors.sort((a, b) => (b.amount > a.amount ? 1 : -1));
  creditors.sort((a, b) => (b.amount > a.amount ? 1 : -1));

  const transfers: DebtTransferPaise[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const d = debtors[dIdx];
    const c = creditors[cIdx];
    const transfer = d.amount < c.amount ? d.amount : c.amount;

    if (transfer > 0n) {
      transfers.push({
        fromUserId: d.userId,
        toUserId: c.userId,
        amountPaise: transfer,
      });
      d.amount -= transfer;
      c.amount -= transfer;
    }

    if (d.amount === 0n) dIdx++;
    if (c.amount === 0n) cIdx++;
  }

  return {
    balances,
    isZeroSum: groupSum === 0n,
    transfers,
  };
}
