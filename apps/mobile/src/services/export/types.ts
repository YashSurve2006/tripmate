export interface ExportFilters {
  dateRange: 'ALL' | 'CUSTOM';
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  categoryId: string; // 'ALL' or specific category
  memberId: string;   // 'ALL' or specific user_id
  scope: 'COMPLETE' | 'EXPENSES_ONLY';
}

export interface ExportPreviewData {
  groupName: string;
  reportingPeriod: string;
  expenseCount: number;
  totalSpendingPaise: number;
  currency: string;
  memberCount: number;
  outstandingBalancePaise: number;
  settlementCount: number;
  documentCount: number;
  filterSummary: string;
}

export interface ReportExpensePayment {
  paymentId: string;
  expenseId: string;
  expenseTitle: string;
  userId: string;
  userName: string;
  amountPaise: number;
  currency: string;
  date: string;
  notes?: string | null;
}

export interface ReportExpenseSplit {
  splitId: string;
  expenseId: string;
  expenseTitle: string;
  userId: string;
  userName: string;
  expenseTotalPaise: number;
  amountPaise: number;
  splitType: string;
  percentage?: number | null;
  currency: string;
}

export interface ReportMemberSummary {
  id: string;
  userId: string;
  name: string;
  nickname?: string | null;
  role: string;
  isActive: boolean;
  joinedAt: string;
  email?: string;
  phone?: string | null;
  avatarColor?: string | null;
  totalPaidPaise: number;
  totalSharePaise: number;
  netBalancePaise: number;
  amountOwedPaise: number;
  amountOwingPaise: number;
  confirmedRepaymentsMadePaise: number;
  confirmedRepaymentsReceivedPaise: number;
  pendingRepaymentsPaise: number;
  paidExpenseCount: number;
  participatedExpenseCount: number;
}

export interface ReportSettlement {
  id: string;
  groupId: string;
  groupName: string;
  payerId: string;
  payerName: string;
  payeeId: string;
  payeeName: string;
  amountPaise: number;
  currency: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  notes?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
}

export interface ReportDocument {
  id: string;
  groupId: string;
  groupName: string;
  expenseId?: string | null;
  expenseTitle?: string | null;
  expenseAmountPaise?: number | null;
  title: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  category: string;
  notes?: string | null;
  uploadedAt: string;
  isAvailableLocally: boolean;
}

export interface ReportCategoryAnalysis {
  category: string;
  categoryLabel: string;
  expenseCount: number;
  totalPaise: number;
  percentage: number;
  averagePaise: number;
  largestExpensePaise: number;
  budgetPaise: number;
  remainingBudgetPaise: number;
}

export interface ReportDailySpending {
  date: string;
  expenseCount: number;
  totalPaise: number;
  categoryBreakdown: string;
  dailyAveragePaise: number;
  cumulativePaise: number;
}

export interface SuggestedSettlement {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amountPaise: number;
  currency: string;
  status: string;
}

export interface DetailedGroupReportData {
  group: {
    id: string;
    name: string;
    type: string;
    currency: string;
    budgetPaise: number;
    startDate?: string | null;
    endDate?: string | null;
    inviteCode: string;
    createdById: string;
    createdAt: string;
  };
  filters: ExportFilters;
  reportingPeriodLabel: string;
  generationDate: string;
  // Summary KPIs
  kpis: {
    memberCount: number;
    activeMemberCount: number;
    expenseCount: number;
    totalExpensesPaise: number;
    totalAllocatedSharesPaise: number;
    totalOutstandingBalancesPaise: number;
    totalConfirmedRepaymentsPaise: number;
    totalPendingRepaymentsPaise: number;
    budgetPaise: number;
    remainingBudgetPaise: number;
    largestExpense?: {
      title: string;
      amountPaise: number;
      date: string;
      payerName: string;
    } | null;
    topSpendingCategory?: {
      category: string;
      categoryLabel: string;
      amountPaise: number;
      percentage: number;
    } | null;
    highestSpendingMember?: {
      userId: string;
      name: string;
      sharePaise: number;
      percentage: number;
    } | null;
    isBalancedZeroSum: boolean;
  };
  // Detailed collections
  expenses: any[];
  members: ReportMemberSummary[];
  payments: ReportExpensePayment[];
  splits: ReportExpenseSplit[];
  settlements: ReportSettlement[];
  suggestedSettlements: SuggestedSettlement[];
  categories: ReportCategoryAnalysis[];
  dailySpending: ReportDailySpending[];
  documents: ReportDocument[];
}
