/**
 * Formats integer minor units (paise) into INR or target currency display
 * e.g. 12550 -> "₹125.50"
 */
export function formatCurrency(
  paise: number | bigint | string,
  currency = 'INR',
  options: { showSymbol?: boolean; showSign?: boolean } = {}
): string {
  const numPaise = typeof paise === 'bigint' ? Number(paise) : typeof paise === 'string' ? parseInt(paise, 10) : paise;
  if (isNaN(numPaise)) return '₹0.00';

  const { showSymbol = true, showSign = false } = options;
  const isNegative = numPaise < 0;
  const abs = Math.abs(numPaise);
  const whole = Math.floor(abs / 100);
  const fraction = (abs % 100).toString().padStart(2, '0');

  let formattedWhole = whole.toString();
  if (currency === 'INR') {
    formattedWhole = formatIndian(whole);
  } else {
    formattedWhole = whole.toLocaleString('en-US');
  }

  const symbol = showSymbol ? (currency === 'INR' ? '₹' : '$') : '';
  const sign = isNegative ? '-' : showSign && numPaise > 0 ? '+' : '';

  return `${sign}${symbol}${formattedWhole}.${fraction}`;
}

function formatIndian(x: number): string {
  const s = x.toString();
  if (s.length <= 3) return s;
  const lastThree = s.slice(-3);
  const otherNumbers = s.slice(0, -3);
  const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${formattedOther},${lastThree}`;
}

/**
 * Converts user string input e.g. "150.50" into integer minor units (paise: 15050)
 */
export function parseAmountToPaise(input: string): number {
  const clean = input.trim().replace(/,/g, '');
  if (!clean || !/^-?\d+(\.\d+)?$/.test(clean)) {
    return 0;
  }
  const isNegative = clean.startsWith('-');
  const unsigned = isNegative ? clean.slice(1) : clean;
  const parts = unsigned.split('.');
  const whole = parseInt(parts[0], 10) || 0;
  const fracStr = (parts[1] || '').padEnd(2, '0').slice(0, 2);
  const frac = parseInt(fracStr, 10) || 0;
  const paise = whole * 100 + frac;
  return isNegative ? -paise : paise;
}

export interface ExpensePaymentRecord {
  id?: string;
  userId: string;
  amount: number; // in minor units (paise)
}

export interface ExpenseSplitRecord {
  id?: string;
  userId: string;
  amount: number; // in minor units (paise)
  splitType?: string;
  percentage?: number;
}

export interface ExpenseRecord {
  id: string;
  groupId: string;
  title: string;
  notes?: string | null;
  amount: number; // in minor units (paise)
  currency: string;
  category: string;
  date: string;
  createdById?: string;
  payments: ExpensePaymentRecord[];
  splits: ExpenseSplitRecord[];
  createdAt?: string;
}

export interface SettlementRecord {
  id: string;
  groupId: string;
  payerId: string;
  payeeId: string;
  amount: number; // in minor units (paise)
  currency: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  confirmedAt?: string | null;
  createdAt?: string;
  notes?: string | null;
}

export interface DebtTransfer {
  fromUserId: string;
  toUserId: string;
  amount: number; // in minor units (paise)
  currency: string;
}

export interface MemberBalance {
  userId: string;
  balance: number; // in minor units (paise). > 0 means user is owed, < 0 means user owes
  totalPaid: number;
  totalShare: number;
  totalSettlementReceived: number;
  totalSettlementPaid: number;
}

export interface GroupFinancialSummary {
  groupId: string;
  currency: string;
  totalExpenses: number; // in paise
  memberBalances: Record<string, MemberBalance>;
  suggestedSettlements: DebtTransfer[];
  isBalancedZeroSum: boolean;
}

/**
 * Calculates deterministic equal split for UI preview & storage
 */
export function calculateEqualSplit(
  totalPaise: number,
  participantIds: string[]
): { userId: string; amountPaise: number }[] {
  if (participantIds.length === 0 || totalPaise <= 0) return [];
  const sorted = [...participantIds].sort();
  const n = sorted.length;
  const base = Math.floor(totalPaise / n);
  const remainder = totalPaise - base * n;

  return sorted.map((userId, idx) => ({
    userId,
    amountPaise: base + (idx < remainder ? 1 : 0),
  }));
}

export interface CustomSplitShare {
  userId: string;
  amountPaise: number;
}

export interface CustomSplitValidationResult {
  isValid: boolean;
  totalPaise: number;
  allocatedPaise: number;
  remainingPaise: number;
  status: 'BALANCED' | 'UNDER_ALLOCATED' | 'OVER_ALLOCATED';
  error?: string;
}

/**
 * Validates custom amount-wise allocations.
 * Checks for negative amounts, ensures integer paise precision,
 * and dynamically calculates allocated total, remaining amount, and status.
 */
export function validateCustomSplit(
  totalPaise: number,
  shares: CustomSplitShare[]
): CustomSplitValidationResult {
  if (totalPaise < 0) {
    return {
      isValid: false,
      totalPaise,
      allocatedPaise: 0,
      remainingPaise: totalPaise,
      status: 'OVER_ALLOCATED',
      error: 'Total amount cannot be negative',
    };
  }

  for (const s of shares) {
    if (s.amountPaise < 0) {
      return {
        isValid: false,
        totalPaise,
        allocatedPaise: 0,
        remainingPaise: totalPaise,
        status: 'UNDER_ALLOCATED',
        error: 'Individual split amounts cannot be negative',
      };
    }
    if (!Number.isInteger(s.amountPaise)) {
      return {
        isValid: false,
        totalPaise,
        allocatedPaise: 0,
        remainingPaise: totalPaise,
        status: 'UNDER_ALLOCATED',
        error: 'Split amounts must be integer paise',
      };
    }
  }

  const allocatedPaise = shares.reduce((acc, s) => acc + s.amountPaise, 0);
  const remainingPaise = totalPaise - allocatedPaise;

  if (remainingPaise === 0) {
    return {
      isValid: true,
      totalPaise,
      allocatedPaise,
      remainingPaise: 0,
      status: 'BALANCED',
    };
  } else if (remainingPaise > 0) {
    return {
      isValid: false,
      totalPaise,
      allocatedPaise,
      remainingPaise,
      status: 'UNDER_ALLOCATED',
      error: `Remaining amount: ${formatCurrency(remainingPaise, 'INR')} under-allocated`,
    };
  } else {
    return {
      isValid: false,
      totalPaise,
      allocatedPaise,
      remainingPaise,
      status: 'OVER_ALLOCATED',
      error: `Allocated amount exceeds total by ${formatCurrency(Math.abs(remainingPaise), 'INR')}`,
    };
  }
}


/**
 * Computes individual member balances and verifies the zero-sum invariant across the group.
 * Balance definition:
 *   Balance(user) = Total Paid by user - Total Consumed (Share) by user +
 *                   Confirmed Settlements Received - Confirmed Settlements Paid
 */
export function calculateGroupBalances(
  memberUserIds: string[],
  expenses: ExpenseRecord[],
  settlements: SettlementRecord[] = []
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

  for (const exp of expenses) {
    totalExpenses += exp.amount;

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

  // Process ONLY confirmed settlements
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

    memberBalances[settlement.payerId].totalSettlementPaid += settlement.amount;
    memberBalances[settlement.payeeId].totalSettlementReceived += settlement.amount;
  }

  let groupSumCheck = 0;
  for (const userId of Object.keys(memberBalances)) {
    const m = memberBalances[userId];
    m.balance = m.totalPaid - m.totalShare + m.totalSettlementPaid - m.totalSettlementReceived;
    groupSumCheck += m.balance;
  }

  const isBalancedZeroSum = groupSumCheck === 0;
  const suggestedSettlements = simplifyDebts(memberBalances, expenses[0]?.currency || 'INR');

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
  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  for (const mb of Object.values(memberBalances)) {
    if (mb.balance < 0) {
      debtors.push({ userId: mb.userId, amount: Math.abs(mb.balance) });
    } else if (mb.balance > 0) {
      creditors.push({ userId: mb.userId, amount: mb.balance });
    }
  }

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

