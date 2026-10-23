import {
  DebtTransfer,
  ExpensePaymentRecord,
  ExpenseRecord,
  GroupFinancialSummary,
  MemberBalance,
  SettlementRecord,
  SplitType,
} from './types';

/**
 * Parses user string input (e.g. "125.50" or "125") into exact integer minor units (paise).
 * Avoids direct float multiplication by parsing integer and fractional parts as strings.
 */
export function parseCurrencyToMinorUnits(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || isNaN(value)) {
      throw new Error('Invalid numeric amount');
    }
    // If it's already an integer, check if caller provided minor units or decimal.
    // We treat standard decimal numbers by converting to string first.
    value = value.toString();
  }

  const clean = value.trim().replace(/,/g, '');
  if (!clean || !/^-?\d+(\.\d+)?$/.test(clean)) {
    throw new Error(`Invalid currency format: "${value}"`);
  }

  const isNegative = clean.startsWith('-');
  const unsigned = isNegative ? clean.slice(1) : clean;
  const parts = unsigned.split('.');
  const whole = parseInt(parts[0], 10);
  const fracStr = (parts[1] || '').padEnd(2, '0').slice(0, 2);
  const frac = parseInt(fracStr, 10);

  const minorUnits = whole * 100 + frac;
  return isNegative ? -minorUnits : minorUnits;
}

/**
 * Formats integer minor units (paise) to display string (e.g. ₹125.50, ₹1,250.00).
 */
export function formatCurrency(
  minorUnits: number,
  currency = 'INR',
  options: { showSymbol?: boolean; showSign?: boolean } = {}
): string {
  const { showSymbol = true, showSign = false } = options;
  const isNegative = minorUnits < 0;
  const absUnits = Math.abs(minorUnits);
  const whole = Math.floor(absUnits / 100);
  const fraction = absUnits % 100;
  const fractionStr = fraction.toString().padStart(2, '0');

  // Indian number formatting for INR (e.g. 1,00,000) or standard international
  let formattedWhole = whole.toString();
  if (currency === 'INR') {
    formattedWhole = formatIndianNumber(whole);
  } else {
    formattedWhole = whole.toLocaleString('en-US');
  }

  const symbol = showSymbol ? (currency === 'INR' ? '₹' : '$') : '';
  const sign = isNegative ? '-' : showSign && minorUnits > 0 ? '+' : '';

  return `${sign}${symbol}${formattedWhole}.${fractionStr}`;
}

function formatIndianNumber(x: number): string {
  const s = x.toString();
  if (s.length <= 3) return s;
  const lastThree = s.slice(-3);
  const otherNumbers = s.slice(0, -3);
  const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${formattedOther},${lastThree}`;
}

/**
 * Equal split calculation with deterministic remainder distribution.
 * Guarantees that sum(splits) === totalMinorUnits exactly.
 */
export function calculateEqualSplit(
  totalMinorUnits: number,
  participantIds: string[]
): { userId: string; amount: number; splitType: SplitType }[] {
  if (participantIds.length === 0) {
    throw new Error('At least one participant is required for an equal split');
  }
  if (totalMinorUnits < 0) {
    throw new Error('Total amount cannot be negative');
  }

  // Sort deterministically to ensure consistent allocation of remainders
  const sortedParticipants = [...participantIds].sort();
  const n = sortedParticipants.length;
  const baseShare = Math.floor(totalMinorUnits / n);
  const remainder = totalMinorUnits - baseShare * n;

  return sortedParticipants.map((userId, index) => {
    // Distribute 1 extra paisa to the first `remainder` participants
    const amount = baseShare + (index < remainder ? 1 : 0);
    return {
      userId,
      amount,
      splitType: 'EQUAL' as SplitType,
    };
  });
}

/**
 * Percentage split calculation with deterministic remainder reconciliation.
 * Guarantees that sum(splits) === totalMinorUnits exactly.
 */
export function calculatePercentageSplit(
  totalMinorUnits: number,
  allocations: { userId: string; percentage: number }[]
): { userId: string; amount: number; percentage: number; splitType: SplitType }[] {
  if (allocations.length === 0) {
    throw new Error('At least one allocation is required');
  }

  const totalPercentage = allocations.reduce((acc, a) => acc + a.percentage, 0);
  // Float tolerance check for sum of percentages (must equal 100%)
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(`Total percentage must equal 100%, got ${totalPercentage}%`);
  }

  // Sort deterministically
  const sorted = [...allocations].sort((a, b) => a.userId.localeCompare(b.userId));

  // Compute tentative shares in minor units
  let assignedTotal = 0;
  const results = sorted.map((item) => {
    // Compute integer floor of percentage share
    const share = Math.floor((totalMinorUnits * item.percentage) / 100);
    assignedTotal += share;
    return {
      userId: item.userId,
      amount: share,
      percentage: item.percentage,
      splitType: 'PERCENTAGE' as SplitType,
    };
  });

  // Distribute any rounding discrepancy (usually a few paise)
  let discrepancy = totalMinorUnits - assignedTotal;
  let idx = 0;
  while (discrepancy > 0 && idx < results.length) {
    results[idx].amount += 1;
    discrepancy -= 1;
    idx++;
  }

  return results;
}

/**
 * Validates that an exact split sums to the total amount without any discrepancy.
 */
export function validateExactSplit(
  totalMinorUnits: number,
  splits: { userId: string; amount: number }[]
): { isValid: boolean; difference: number } {
  const sum = splits.reduce((acc, s) => acc + s.amount, 0);
  return {
    isValid: sum === totalMinorUnits,
    difference: totalMinorUnits - sum,
  };
}

/**
 * Validates that total payments match the expense total.
 */
export function validateExpensePayments(
  totalMinorUnits: number,
  payments: ExpensePaymentRecord[]
): { isValid: boolean; difference: number } {
  const sum = payments.reduce((acc, p) => acc + p.amount, 0);
  return {
    isValid: sum === totalMinorUnits,
    difference: totalMinorUnits - sum,
  };
}

/**
 * Computes individual member balances and verifies the zero-sum invariant across the group.
 * Balance definition:
 *   Balance(user) = Total Paid by user - Total Consumed (Share) by user +
 *                   Confirmed Settlements Received - Confirmed Settlements Paid
 *
 * Balance > 0 : User is OWED money
 * Balance < 0 : User OWES money
 * Balance = 0 : User is settled
 */
export function calculateGroupBalances(
  memberUserIds: string[],
  expenses: ExpenseRecord[],
  settlements: SettlementRecord[]
): GroupFinancialSummary {
  const memberBalances: Record<string, MemberBalance> = {};

  for (const id of memberUserIds) {
    memberBalances[id] = {
      userId: id,
      balance: 0,
      totalPaid: 0,
      totalShare: 0,
      totalSettlementReceived: 0,
      totalSettlementPaid: 0,
    };
  }

  let totalExpenses = 0;

  // Process all expenses
  for (const exp of expenses) {
    totalExpenses += exp.amount;

    // Payments: who paid for this expense
    for (const payment of exp.payments) {
      if (!memberBalances[payment.userId]) {
        memberBalances[payment.userId] = {
          userId: payment.userId,
          balance: 0,
          totalPaid: 0,
          totalShare: 0,
          totalSettlementReceived: 0,
          totalSettlementPaid: 0,
        };
      }
      memberBalances[payment.userId].totalPaid += payment.amount;
    }

    // Splits: who owes their share for this expense
    for (const split of exp.splits) {
      if (!memberBalances[split.userId]) {
        memberBalances[split.userId] = {
          userId: split.userId,
          balance: 0,
          totalPaid: 0,
          totalShare: 0,
          totalSettlementReceived: 0,
          totalSettlementPaid: 0,
        };
      }
      memberBalances[split.userId].totalShare += split.amount;
    }
  }

  // Process ONLY confirmed settlements (pending settlements must not affect balances)
  for (const settlement of settlements) {
    if (settlement.status !== 'CONFIRMED') {
      continue;
    }

    if (!memberBalances[settlement.payerId]) {
      memberBalances[settlement.payerId] = {
        userId: settlement.payerId,
        balance: 0,
        totalPaid: 0,
        totalShare: 0,
        totalSettlementReceived: 0,
        totalSettlementPaid: 0,
      };
    }
    if (!memberBalances[settlement.payeeId]) {
      memberBalances[settlement.payeeId] = {
        userId: settlement.payeeId,
        balance: 0,
        totalPaid: 0,
        totalShare: 0,
        totalSettlementReceived: 0,
        totalSettlementPaid: 0,
      };
    }

    // When payer pays settlement: payer owes less (balance increases towards 0)
    memberBalances[settlement.payerId].totalSettlementPaid += settlement.amount;
    // When payee receives settlement: payee is owed less (balance decreases towards 0)
    memberBalances[settlement.payeeId].totalSettlementReceived += settlement.amount;
  }

  // Calculate final net balance for each member
  let groupSumCheck = 0;
  for (const userId of Object.keys(memberBalances)) {
    const m = memberBalances[userId];
    m.balance = m.totalPaid - m.totalShare + m.totalSettlementPaid - m.totalSettlementReceived;
    groupSumCheck += m.balance;
  }

  // The sum of balances in a fully allocated, single-currency group must equal zero.
  const isBalancedZeroSum = groupSumCheck === 0;

  // Compute minimal simplified debt transfers
  const suggestedSettlements = simplifyDebts(memberBalances);

  return {
    groupId: expenses[0]?.groupId || 'default',
    currency: expenses[0]?.currency || 'INR',
    totalExpenses,
    memberBalances,
    suggestedSettlements,
    isBalancedZeroSum,
  };
}

/**
 * Simplifies group debts using a greedy flow matching algorithm.
 * Transforms net positive and negative balances into the minimal number of transactions.
 */
export function simplifyDebts(
  memberBalances: Record<string, MemberBalance>,
  currency = 'INR'
): DebtTransfer[] {
  // Debtors: balance < 0 (they owe money)
  const debtors: { userId: string; amount: number }[] = [];
  // Creditors: balance > 0 (they are owed money)
  const creditors: { userId: string; amount: number }[] = [];

  for (const mb of Object.values(memberBalances)) {
    if (mb.balance < 0) {
      debtors.push({ userId: mb.userId, amount: Math.abs(mb.balance) });
    } else if (mb.balance > 0) {
      creditors.push({ userId: mb.userId, amount: mb.balance });
    }
  }

  // Sort descending by amount for efficient matching
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: DebtTransfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0) {
      transfers.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: transferAmount,
        currency,
      });

      debtor.amount -= transferAmount;
      creditor.amount -= transferAmount;
    }

    if (debtor.amount === 0) dIdx++;
    if (creditor.amount === 0) cIdx++;
  }

  return transfers;
}
