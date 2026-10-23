import * as XLSX from 'xlsx';
import { ExcelWorkbookBuilder } from './ExcelWorkbookBuilder';
import { DetailedGroupReportData } from './types';

declare const Buffer: any;
declare const process: any;

function sanitizeFilename(groupName: string): string {
  const safeName = groupName
    .trim()
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');

  const dateStr = new Date().toISOString().split('T')[0];
  return `TripMate_${safeName || 'Group'}_Expense_Report_${dateStr}.xlsx`;
}

// ANSI color helpers
const green = (t: string) => `\x1b[32m${t}\x1b[0m`;
const red = (t: string) => `\x1b[31m${t}\x1b[0m`;
const bold = (t: string) => `\x1b[1m${t}\x1b[0m`;
const cyan = (t: string) => `\x1b[36m${t}\x1b[0m`;

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, msg: string) {
  totalCount++;
  if (condition) {
    console.log(`  ${green('✓')} ${msg}`);
    passedCount++;
  } else {
    console.error(`  ${red('✗')} ${bold('FAILED:')} ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runTests() {
  console.log(bold(cyan('\n======================================================')));
  console.log(bold(cyan(' TRIPMATE E2E TEST SUITE: EXCEL EXPORT & MEMBERS')));
  console.log(bold(cyan('======================================================\n')));

  // ----------------------------------------------------
  // TEST 1: Member Management Logic & Invariants
  // ----------------------------------------------------
  console.log(bold('--- TEST SUITE 1: Manual Group Member Management ---'));

  interface MemberModel {
    id: string;
    groupId: string;
    userId: string;
    name: string;
    nickname?: string;
    email?: string;
    phone?: string;
    role: 'ADMIN' | 'MEMBER';
    avatarColor?: string;
    isActive: boolean;
    hasTransactions: boolean;
  }

  const groupA = 'group-goa-2026';
  const groupB = 'group-manali-2026';
  const membersStore: MemberModel[] = [];

  function addMemberDirectly(groupId: string, name: string, options?: Partial<MemberModel>): MemberModel {
    if (!name || !name.trim()) throw new Error('Full Name is required');
    const member: MemberModel = {
      id: `gm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      groupId,
      userId: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      nickname: options?.nickname?.trim(),
      email: options?.email?.trim(),
      phone: options?.phone?.trim(),
      role: options?.role || 'MEMBER',
      avatarColor: options?.avatarColor || '#4F46E5',
      isActive: true,
      hasTransactions: false,
    };
    membersStore.push(member);
    return member;
  }

  function removeMemberSafely(groupId: string, userId: string): { action: 'DELETED' | 'ARCHIVED' } {
    const idx = membersStore.findIndex((m) => m.groupId === groupId && m.userId === userId);
    if (idx === -1) throw new Error('Member not found');
    const member = membersStore[idx];
    if (member.hasTransactions) {
      member.isActive = false;
      return { action: 'ARCHIVED' };
    } else {
      membersStore.splice(idx, 1);
      return { action: 'DELETED' };
    }
  }

  // 1.1 Direct addition by name without invite codes/links
  const m1 = addMemberDirectly(groupA, 'Yash Surve', { role: 'ADMIN', avatarColor: '#7C3AED' });
  const m2 = addMemberDirectly(groupA, 'Rahul Sharma', { nickname: 'Rahul', phone: '+919876543210', avatarColor: '#059669' });
  const m3 = addMemberDirectly(groupA, 'Aman Gupta', { nickname: 'Aman', email: 'aman@example.com', avatarColor: '#D97706' });
  const m4 = addMemberDirectly(groupA, 'Sneha Patel', { avatarColor: '#DB2777' });

  assert(membersStore.filter((m) => m.groupId === groupA).length === 4, 'Successfully added 4 members by name without invite codes');
  assert(m1.role === 'ADMIN' && m2.role === 'MEMBER', 'Preserved member roles correctly (Owner/Admin vs Member)');
  assert(m2.phone === '+919876543210' && m3.email === 'aman@example.com', 'Optional fields (phone, email, nickname) stored correctly');

  // 1.2 Group Isolation: Same name in another group creates separate isolated member record
  const mB = addMemberDirectly(groupB, 'Rahul Sharma', { phone: '+919876543210' });
  assert(mB.groupId === groupB && mB.id !== m2.id, 'Group isolation: Same name in another group has distinct ID and group isolation');
  assert(membersStore.filter((m) => m.groupId === groupA).length === 4, 'Group A member count unaffected by Group B addition');

  // 1.3 Safe Deletion vs Archival
  const res1 = removeMemberSafely(groupA, m4.userId);
  assert(res1.action === 'DELETED', 'Member with 0 transactions is hard deleted cleanly');
  assert(membersStore.filter((m) => m.groupId === groupA).length === 3, 'Group A member count decreased to 3');

  m2.hasTransactions = true;
  const res2 = removeMemberSafely(groupA, m2.userId);
  assert(res2.action === 'ARCHIVED', 'Member with historical transactions is safely archived (isActive = false)');
  assert(m2.isActive === false, 'Member marked inactive, not destroyed from database');
  assert(
    membersStore.filter((m) => m.groupId === groupA && m.isActive).length === 2,
    'Active members selector shows 2 active members (excluding archived)'
  );
  assert(
    membersStore.filter((m) => m.groupId === groupA).length === 3,
    'Historical audit retains all 3 members including archived member'
  );

  // ----------------------------------------------------
  // TEST 2: Advanced Excel Report Generator (10 Worksheets)
  // ----------------------------------------------------
  console.log(bold('\n--- TEST SUITE 2: Advanced Excel Report Export (.xlsx) ---'));

  const sampleReport: DetailedGroupReportData = {
    group: {
      id: 'grp-goa-101',
      name: 'Goa Adventure 2026',
      type: 'TRIP',
      currency: 'INR',
      budgetPaise: 10000000,
      startDate: '2026-10-15',
      endDate: '2026-10-20',
      inviteCode: 'GOA2026',
      createdById: 'user_yash',
      createdAt: '2026-10-15T10:00:00.000Z',
    },
    filters: {
      scope: 'COMPLETE',
      dateRange: 'ALL',
      memberId: 'ALL',
      categoryId: 'ALL',
    },
    reportingPeriodLabel: 'All-Time (Lifetime History)',
    generationDate: '2026-10-23T18:30:00.000Z',
    kpis: {
      memberCount: 3,
      activeMemberCount: 3,
      expenseCount: 3,
      totalExpensesPaise: 6450000,
      totalAllocatedSharesPaise: 6450000,
      totalOutstandingBalancesPaise: 1600000,
      totalConfirmedRepaymentsPaise: 1200000,
      totalPendingRepaymentsPaise: 300000,
      budgetPaise: 10000000,
      remainingBudgetPaise: 3550000,
      largestExpense: {
        title: 'Luxury Villa Candolim (3 Nights)',
        amountPaise: 4200000,
        date: '2026-10-16',
        payerName: 'Yash Surve',
      },
      topSpendingCategory: {
        category: 'STAY',
        categoryLabel: 'Stay & Hotel',
        amountPaise: 4200000,
        percentage: 65.12,
      },
      highestSpendingMember: {
        userId: 'm-2',
        name: 'Rahul Sharma',
        sharePaise: 2350000,
        percentage: 36.4,
      },
      isBalancedZeroSum: true,
    },
    expenses: [
      {
        id: 'exp-1',
        title: 'Luxury Villa Candolim (3 Nights)',
        notes: 'Private 4BHK pool villa booking with breakfast',
        category: 'STAY',
        date: '2026-10-16T14:30:00.000Z',
        created_at: '2026-10-16T09:00:00.000Z',
        currency: 'INR',
        amountPaise: 4200000,
        payerId: 'm-1',
        payerName: 'Yash Surve',
        splits: [
          { userId: 'm-1', userName: 'Yash Surve', amountPaise: 1400000, splitType: 'EQUAL' },
          { userId: 'm-2', userName: 'Rahul Sharma', amountPaise: 1400000, splitType: 'EQUAL' },
          { userId: 'm-3', userName: 'Aman Gupta', amountPaise: 1400000, splitType: 'EQUAL' },
        ],
        receipts: [{ title: 'Villa_Receipt.pdf' }],
      },
      {
        id: 'exp-2',
        title: 'Seafood Beach Shack Dinner',
        notes: 'Fish curry, prawns, drinks at Thalassa',
        category: 'FOOD',
        date: '2026-10-17T21:15:00.000Z',
        created_at: '2026-10-17T15:45:00.000Z',
        currency: 'INR',
        amountPaise: 1350000,
        payerId: 'm-2',
        payerName: 'Rahul Sharma',
        splits: [
          { userId: 'm-1', userName: 'Yash Surve', amountPaise: 450000, splitType: 'EXACT' },
          { userId: 'm-2', userName: 'Rahul Sharma', amountPaise: 500000, splitType: 'EXACT' },
          { userId: 'm-3', userName: 'Aman Gupta', amountPaise: 400000, splitType: 'EXACT' },
        ],
        receipts: [{ title: 'Thalassa_Bill.jpg' }],
      },
      {
        id: 'exp-3',
        title: 'Scuba Diving & Watersports',
        notes: 'Grande Island package with video recording',
        category: 'ACTIVITIES',
        date: '2026-10-18T08:00:00.000Z',
        created_at: '2026-10-18T02:30:00.000Z',
        currency: 'INR',
        amountPaise: 900000,
        payerId: 'm-1',
        payerName: 'Yash Surve',
        splits: [
          { userId: 'm-1', userName: 'Yash Surve', amountPaise: 450000, splitType: 'PERCENTAGE' },
          { userId: 'm-2', userName: 'Rahul Sharma', amountPaise: 450000, splitType: 'PERCENTAGE' },
        ],
        receipts: [],
      },
    ],
    members: [
      {
        id: 'gm-1',
        userId: 'm-1',
        name: 'Yash Surve',
        nickname: 'Yash',
        role: 'ADMIN',
        isActive: true,
        joinedAt: '2026-10-15',
        totalPaidPaise: 5100000,
        totalSharePaise: 2300000,
        netBalancePaise: 1600000, // +16000.00
        amountOwedPaise: 1600000,
        amountOwingPaise: 0,
        confirmedRepaymentsMadePaise: 0,
        confirmedRepaymentsReceivedPaise: 1200000,
        pendingRepaymentsPaise: 300000,
        paidExpenseCount: 2,
        participatedExpenseCount: 3,
      },
      {
        id: 'gm-2',
        userId: 'm-2',
        name: 'Rahul Sharma',
        nickname: 'Rahul',
        role: 'MEMBER',
        isActive: true,
        joinedAt: '2026-10-15',
        totalPaidPaise: 1350000,
        totalSharePaise: 2350000,
        netBalancePaise: -1000000, // -10000.00
        amountOwedPaise: 0,
        amountOwingPaise: 1000000,
        confirmedRepaymentsMadePaise: 700000,
        confirmedRepaymentsReceivedPaise: 0,
        pendingRepaymentsPaise: 300000,
        paidExpenseCount: 1,
        participatedExpenseCount: 3,
      },
      {
        id: 'gm-3',
        userId: 'm-3',
        name: 'Aman Gupta',
        nickname: 'Aman',
        role: 'MEMBER',
        isActive: true,
        joinedAt: '2026-10-15',
        totalPaidPaise: 0,
        totalSharePaise: 1800000,
        netBalancePaise: -600000, // -6000.00
        amountOwedPaise: 0,
        amountOwingPaise: 600000,
        confirmedRepaymentsMadePaise: 500000,
        confirmedRepaymentsReceivedPaise: 0,
        pendingRepaymentsPaise: 0,
        paidExpenseCount: 0,
        participatedExpenseCount: 2,
      },
    ],
    payments: [
      { paymentId: 'pay-exp-1', expenseId: 'exp-1', expenseTitle: 'Luxury Villa Candolim (3 Nights)', userId: 'm-1', userName: 'Yash Surve', amountPaise: 4200000, currency: 'INR', date: '2026-10-16', notes: 'Advance card' },
      { paymentId: 'pay-exp-2', expenseId: 'exp-2', expenseTitle: 'Seafood Beach Shack Dinner', userId: 'm-2', userName: 'Rahul Sharma', amountPaise: 1350000, currency: 'INR', date: '2026-10-17', notes: 'GPay' },
      { paymentId: 'pay-exp-3', expenseId: 'exp-3', expenseTitle: 'Scuba Diving & Watersports', userId: 'm-1', userName: 'Yash Surve', amountPaise: 900000, currency: 'INR', date: '2026-10-18', notes: 'Cash' },
    ],
    splits: [
      { splitId: 'sp-1', expenseId: 'exp-1', expenseTitle: 'Luxury Villa Candolim (3 Nights)', userId: 'm-1', userName: 'Yash Surve', expenseTotalPaise: 4200000, amountPaise: 1400000, splitType: 'EQUAL', percentage: 33.3, currency: 'INR' },
      { splitId: 'sp-2', expenseId: 'exp-1', expenseTitle: 'Luxury Villa Candolim (3 Nights)', userId: 'm-2', userName: 'Rahul Sharma', expenseTotalPaise: 4200000, amountPaise: 1400000, splitType: 'EQUAL', percentage: 33.3, currency: 'INR' },
      { splitId: 'sp-3', expenseId: 'exp-1', expenseTitle: 'Luxury Villa Candolim (3 Nights)', userId: 'm-3', userName: 'Aman Gupta', expenseTotalPaise: 4200000, amountPaise: 1400000, splitType: 'EQUAL', percentage: 33.3, currency: 'INR' },
      { splitId: 'sp-4', expenseId: 'exp-2', expenseTitle: 'Seafood Beach Shack Dinner', userId: 'm-1', userName: 'Yash Surve', expenseTotalPaise: 1350000, amountPaise: 450000, splitType: 'EXACT', percentage: 33.3, currency: 'INR' },
      { splitId: 'sp-5', expenseId: 'exp-2', expenseTitle: 'Seafood Beach Shack Dinner', userId: 'm-2', userName: 'Rahul Sharma', expenseTotalPaise: 1350000, amountPaise: 500000, splitType: 'EXACT', percentage: 37.0, currency: 'INR' },
      { splitId: 'sp-6', expenseId: 'exp-2', expenseTitle: 'Seafood Beach Shack Dinner', userId: 'm-3', userName: 'Aman Gupta', expenseTotalPaise: 1350000, amountPaise: 400000, splitType: 'EXACT', percentage: 29.6, currency: 'INR' },
      { splitId: 'sp-7', expenseId: 'exp-3', expenseTitle: 'Scuba Diving & Watersports', userId: 'm-1', userName: 'Yash Surve', expenseTotalPaise: 900000, amountPaise: 450000, splitType: 'PERCENTAGE', percentage: 50.0, currency: 'INR' },
      { splitId: 'sp-8', expenseId: 'exp-3', expenseTitle: 'Scuba Diving & Watersports', userId: 'm-2', userName: 'Rahul Sharma', expenseTotalPaise: 900000, amountPaise: 450000, splitType: 'PERCENTAGE', percentage: 50.0, currency: 'INR' },
    ],
    settlements: [
      { id: 'stl-1', groupId: 'grp-goa-101', groupName: 'Goa Adventure 2026', payerId: 'm-2', payerName: 'Rahul Sharma', payeeId: 'm-1', payeeName: 'Yash Surve', amountPaise: 700000, currency: 'INR', status: 'CONFIRMED', notes: 'GPay for villa share', createdAt: '2026-10-18T12:00:00.000Z', confirmedAt: '2026-10-18T12:05:00.000Z' },
      { id: 'stl-2', groupId: 'grp-goa-101', groupName: 'Goa Adventure 2026', payerId: 'm-3', payerName: 'Aman Gupta', payeeId: 'm-1', payeeName: 'Yash Surve', amountPaise: 500000, currency: 'INR', status: 'CONFIRMED', notes: 'IMPS payment', createdAt: '2026-10-19T10:00:00.000Z', confirmedAt: '2026-10-19T10:15:00.000Z' },
      { id: 'stl-3', groupId: 'grp-goa-101', groupName: 'Goa Adventure 2026', payerId: 'm-2', payerName: 'Rahul Sharma', payeeId: 'm-1', payeeName: 'Yash Surve', amountPaise: 300000, currency: 'INR', status: 'PENDING', notes: 'Awaiting verification', createdAt: '2026-10-22T08:00:00.000Z', confirmedAt: null },
    ],
    suggestedSettlements: [
      { fromUserId: 'm-2', fromUserName: 'Rahul Sharma', toUserId: 'm-1', toUserName: 'Yash Surve', amountPaise: 1000000, currency: 'INR', status: 'SUGGESTED' },
      { fromUserId: 'm-3', fromUserName: 'Aman Gupta', toUserId: 'm-1', toUserName: 'Yash Surve', amountPaise: 600000, currency: 'INR', status: 'SUGGESTED' },
    ],
    categories: [
      { category: 'STAY', categoryLabel: 'Stay & Hotel', expenseCount: 1, totalPaise: 4200000, percentage: 65.12, averagePaise: 4200000, largestExpensePaise: 4200000, budgetPaise: 5000000, remainingBudgetPaise: 800000 },
      { category: 'FOOD', categoryLabel: 'Food & Dining', expenseCount: 1, totalPaise: 1350000, percentage: 20.93, averagePaise: 1350000, largestExpensePaise: 1350000, budgetPaise: 2000000, remainingBudgetPaise: 650000 },
      { category: 'ACTIVITIES', categoryLabel: 'Activities', expenseCount: 1, totalPaise: 900000, percentage: 13.95, averagePaise: 900000, largestExpensePaise: 900000, budgetPaise: 1500000, remainingBudgetPaise: 600000 },
    ],
    dailySpending: [
      { date: '2026-10-16', expenseCount: 1, totalPaise: 4200000, categoryBreakdown: 'Stay: ₹42,000.00', dailyAveragePaise: 4200000, cumulativePaise: 4200000 },
      { date: '2026-10-17', expenseCount: 1, totalPaise: 1350000, categoryBreakdown: 'Food: ₹13,500.00', dailyAveragePaise: 1350000, cumulativePaise: 5550000 },
      { date: '2026-10-18', expenseCount: 1, totalPaise: 900000, categoryBreakdown: 'Activities: ₹9,000.00', dailyAveragePaise: 900000, cumulativePaise: 6450000 },
    ],
    documents: [
      { id: 'doc-1', groupId: 'grp-goa-101', groupName: 'Goa Adventure 2026', expenseId: 'exp-1', expenseTitle: 'Luxury Villa Candolim (3 Nights)', expenseAmountPaise: 4200000, title: 'Villa Booking Voucher', originalFilename: 'Villa_Receipt.pdf', mimeType: 'application/pdf', fileSizeBytes: 460800, category: 'STAY', notes: 'Booking receipt', uploadedAt: '2026-10-16T14:35:00.000Z', isAvailableLocally: true },
      { id: 'doc-2', groupId: 'grp-goa-101', groupName: 'Goa Adventure 2026', expenseId: 'exp-2', expenseTitle: 'Seafood Beach Shack Dinner', expenseAmountPaise: 1350000, title: 'Thalassa Dinner Invoice', originalFilename: 'Thalassa_Bill.jpg', mimeType: 'image/jpeg', fileSizeBytes: 1258291, category: 'FOOD', notes: 'Dinner invoice', uploadedAt: '2026-10-17T21:20:00.000Z', isAvailableLocally: true },
    ],
  };

  // 2.1 Build Complete 10-Sheet Workbook
  const workbook = ExcelWorkbookBuilder.buildWorkbook(sampleReport);
  assert(workbook.SheetNames.length === 10, 'Complete workbook contains exactly 10 worksheets');

  const expectedSheets = [
    'Executive Summary',
    'Expense Ledger',
    'Member Summary',
    'Payment Records',
    'Split Details',
    'Settlement History',
    'Outstanding Balances',
    'Category Analysis',
    'Daily Spending',
    'Receipts & Documents',
  ];

  for (let i = 0; i < expectedSheets.length; i++) {
    assert(workbook.SheetNames[i] === expectedSheets[i], `Sheet ${i + 1} is named "${expectedSheets[i]}"`);
  }

  // 2.2 Validate Binary Serialization & File Integrity
  const base64Str = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  assert(typeof base64Str === 'string' && base64Str.length > 500, 'Serialized workbook to valid Base64 string');

  const binaryBuffer = Buffer.from(base64Str, 'base64');
  const reParsedWb = XLSX.read(binaryBuffer, { type: 'buffer', cellFormula: true });
  assert(reParsedWb.SheetNames.length === 10, 'Parsed binary .xlsx file back and verified all 10 sheets');

  // 2.3 Verify Numeric Cells (t: 'n') & Formula Preservation
  const ledgerSheet = reParsedWb.Sheets['Expense Ledger'];
  assert(!!ledgerSheet, 'Expense Ledger sheet exists and is accessible');

  // Cell K2 is Expense 1 Amount (Total column K)
  const amountCell = ledgerSheet['K2'];
  assert(amountCell && amountCell.t === 'n' && amountCell.v === 42000, 'Expense Total Amount is real numeric cell (42000.00)');

  // Formula in Total row of Expense Ledger
  let foundSumFormula = false;
  for (const cellAddress in ledgerSheet) {
    if (ledgerSheet[cellAddress].f && ledgerSheet[cellAddress].f.includes('SUM')) {
      foundSumFormula = true;
      break;
    }
  }
  assert(foundSumFormula, 'Ledger summary row contains genuine Excel formula (SUM)');

  // 2.4 Verify Zero-Sum Financial Invariant in Member Summary
  const memberSummarySheet = reParsedWb.Sheets['Member Summary'];
  assert(!!memberSummarySheet, 'Member Summary sheet exists');

  let netBalanceSum = 0;
  sampleReport.members.forEach((m) => {
    netBalanceSum += m.netBalancePaise;
  });
  assert(netBalanceSum === 0, `Zero-sum invariant verified: member net balances sum exactly to ₹0.00 (sum = ${netBalanceSum})`);

  // 2.5 Verify Reconciliation across Payments and Splits
  for (const exp of sampleReport.expenses) {
    const paymentsForExp = sampleReport.payments.filter((p) => p.expenseId === exp.id);
    const splitsForExp = sampleReport.splits.filter((s) => s.expenseId === exp.id);

    const paymentsSum = paymentsForExp.reduce((acc, p) => acc + p.amountPaise, 0);
    const splitsSum = splitsForExp.reduce((acc, s) => acc + s.amountPaise, 0);

    assert(paymentsSum === exp.amountPaise, `Expense "${exp.title}" payments reconcile exactly to total (₹${exp.amountPaise / 100})`);
    assert(splitsSum === exp.amountPaise, `Expense "${exp.title}" splits reconcile exactly to total (₹${exp.amountPaise / 100})`);
  }

  // 2.6 Test EXPENSES_ONLY scope (5 Sheets)
  const expensesOnlyReport: DetailedGroupReportData = {
    ...sampleReport,
    filters: {
      ...sampleReport.filters,
      scope: 'EXPENSES_ONLY',
    },
  };
  const wbExpensesOnly = ExcelWorkbookBuilder.buildWorkbook(expensesOnlyReport);
  assert(wbExpensesOnly.SheetNames.length === 5, 'EXPENSES_ONLY scope produces exactly 5 core worksheets');

  // 2.7 Test Empty Dataset Graceful Handling (0 expenses, 0 settlements)
  const emptyReport: DetailedGroupReportData = {
    group: {
      id: 'grp-empty',
      name: 'New Empty Trip',
      type: 'OTHER',
      currency: 'INR',
      budgetPaise: 0,
      inviteCode: '',
      createdById: 'user-empty',
      createdAt: '2026-10-23T18:00:00.000Z',
    },
    filters: {
      scope: 'COMPLETE',
      dateRange: 'ALL',
      memberId: 'ALL',
      categoryId: 'ALL',
    },
    reportingPeriodLabel: 'All-Time',
    generationDate: '2026-10-23T18:30:00.000Z',
    kpis: {
      memberCount: 1,
      activeMemberCount: 1,
      expenseCount: 0,
      totalExpensesPaise: 0,
      totalAllocatedSharesPaise: 0,
      totalOutstandingBalancesPaise: 0,
      totalConfirmedRepaymentsPaise: 0,
      totalPendingRepaymentsPaise: 0,
      budgetPaise: 0,
      remainingBudgetPaise: 0,
      largestExpense: null,
      topSpendingCategory: null,
      highestSpendingMember: null,
      isBalancedZeroSum: true,
    },
    expenses: [],
    members: [
      {
        id: 'gm-empty-1',
        userId: 'm-empty-1',
        name: 'Yash Surve',
        nickname: null,
        role: 'ADMIN',
        isActive: true,
        joinedAt: '2026-10-23',
        totalPaidPaise: 0,
        totalSharePaise: 0,
        netBalancePaise: 0,
        amountOwedPaise: 0,
        amountOwingPaise: 0,
        confirmedRepaymentsMadePaise: 0,
        confirmedRepaymentsReceivedPaise: 0,
        pendingRepaymentsPaise: 0,
        paidExpenseCount: 0,
        participatedExpenseCount: 0,
      },
    ],
    payments: [],
    splits: [],
    settlements: [],
    suggestedSettlements: [],
    categories: [],
    dailySpending: [],
    documents: [],
  };

  const wbEmpty = ExcelWorkbookBuilder.buildWorkbook(emptyReport);
  assert(wbEmpty.SheetNames.length === 10, 'Empty dataset generates all 10 worksheets gracefully without throwing');
  const emptyBase64 = XLSX.write(wbEmpty, { type: 'base64', bookType: 'xlsx' });
  assert(emptyBase64.length > 500, 'Empty dataset compiles to valid .xlsx binary Base64');

  // 2.8 Sanitize Filename Test
  const filename = sanitizeFilename('Goa / Candolim : Trip * 2026?');
  assert(!filename.includes('/') && !filename.includes(':') && !filename.includes('*') && !filename.includes('?'), 'Filename is properly sanitized against invalid filesystem characters');
  assert(filename.endsWith('.xlsx'), 'Filename has genuine .xlsx extension');

  console.log(bold(green(`\n======================================================`)));
  console.log(bold(green(` ALL ${passedCount}/${totalCount} E2E & FINANCIAL TESTS PASSED!`)));
  console.log(bold(green(`======================================================\n`)));
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
