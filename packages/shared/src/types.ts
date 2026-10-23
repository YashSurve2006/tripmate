export type GroupType = 'TRIP' | 'ROOMMATES' | 'OUTING' | 'EVENT' | 'OTHER';

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE';

export type ExpenseCategory =
  | 'FOOD_AND_DRINK'
  | 'TRANSPORT'
  | 'ACCOMMODATION'
  | 'ENTERTAINMENT'
  | 'SHOPPING'
  | 'GROCERIES'
  | 'FLIGHTS'
  | 'UTILITIES'
  | 'OTHER';

export type SettlementStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export type MemberRole = 'ADMIN' | 'MEMBER';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  upiId?: string | null;
}

export interface GroupMemberSummary {
  userId: string;
  role: MemberRole;
  joinedAt: string;
  user: UserSummary;
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
  splitType?: SplitType;
  percentage?: number; // e.g. 33.33 for percentage splits
}

export interface ExpenseRecord {
  id: string;
  groupId: string;
  title: string;
  notes?: string | null;
  amount: number; // in minor units (paise)
  currency: string;
  category: ExpenseCategory;
  date: string;
  createdById: string;
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
  status: SettlementStatus;
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
