import * as XLSX from 'xlsx';
import { DetailedGroupReportData } from './types';

export class ExcelWorkbookBuilder {
  /**
   * Builds the genuine 10-sheet .xlsx workbook from real group report data.
   */
  static buildWorkbook(data: DetailedGroupReportData): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();

    // 1. Executive Summary
    const ws1 = ExcelWorkbookBuilder.buildExecutiveSummarySheet(data);
    XLSX.utils.book_append_sheet(wb, ws1, 'Executive Summary');

    // 2. Complete Expense Ledger
    const ws2 = ExcelWorkbookBuilder.buildExpenseLedgerSheet(data);
    XLSX.utils.book_append_sheet(wb, ws2, 'Expense Ledger');

    // 3. Member Summary
    const ws3 = ExcelWorkbookBuilder.buildMemberSummarySheet(data);
    XLSX.utils.book_append_sheet(wb, ws3, 'Member Summary');

    // 4. Detailed Payment Records
    const ws4 = ExcelWorkbookBuilder.buildPaymentRecordsSheet(data);
    XLSX.utils.book_append_sheet(wb, ws4, 'Payment Records');

    // 5. Split Details
    const ws5 = ExcelWorkbookBuilder.buildSplitDetailsSheet(data);
    XLSX.utils.book_append_sheet(wb, ws5, 'Split Details');

    if (data.filters.scope === 'COMPLETE') {
      // 6. Settlement History
      const ws6 = ExcelWorkbookBuilder.buildSettlementHistorySheet(data);
      XLSX.utils.book_append_sheet(wb, ws6, 'Settlement History');

      // 7. Outstanding Balances
      const ws7 = ExcelWorkbookBuilder.buildOutstandingBalancesSheet(data);
      XLSX.utils.book_append_sheet(wb, ws7, 'Outstanding Balances');

      // 8. Category Analysis
      const ws8 = ExcelWorkbookBuilder.buildCategoryAnalysisSheet(data);
      XLSX.utils.book_append_sheet(wb, ws8, 'Category Analysis');

      // 9. Daily Spending
      const ws9 = ExcelWorkbookBuilder.buildDailySpendingSheet(data);
      XLSX.utils.book_append_sheet(wb, ws9, 'Daily Spending');

      // 10. Receipts and Documents
      const ws10 = ExcelWorkbookBuilder.buildDocumentsSheet(data);
      XLSX.utils.book_append_sheet(wb, ws10, 'Receipts & Documents');
    }

    return wb;
  }

  // --- SHEET 1: EXECUTIVE SUMMARY ---
  private static buildExecutiveSummarySheet(data: DetailedGroupReportData): XLSX.WorkSheet {
    const { group, kpis, reportingPeriodLabel, generationDate } = data;
    const currency = group.currency;

    const rows: any[][] = [
      ['TRIPMATE EXPENSE & FINANCIAL AUDIT REPORT'],
      ['Generated on', new Date(generationDate).toLocaleString('en-IN'), '', 'Report Scope', data.filters.scope],
      [],
      ['GROUP PROFILE', '', '', 'REPORTING PARAMETERS'],
      ['Group Name', group.name, '', 'Reporting Period', reportingPeriodLabel],
      ['Group Type', group.type, '', 'Date Filter', data.filters.dateRange],
      ['Currency', currency, '', 'Category Scope', data.filters.categoryId === 'ALL' ? 'All Categories' : data.filters.categoryId],
      ['Created Date', new Date(group.createdAt).toLocaleDateString('en-IN'), '', 'Member Scope', data.filters.memberId === 'ALL' ? 'All Members' : 'Single Member Filter'],
      ['Total Group Members', kpis.memberCount, '', 'Group Invite Code', group.inviteCode || 'N/A'],
      [],
      ['KEY PERFORMANCE INDICATORS (FINANCIAL SUMMARY)'],
      ['KPI Metric', 'Value', 'Unit', 'Accounting Note'],
      ['Total Expenses Recorded', kpis.totalExpensesPaise / 100, currency, 'Sum of all shared group expenses in reporting period'],
      ['Total Allocated Expense Shares', kpis.totalAllocatedSharesPaise / 100, currency, 'Sum of participant consumption shares (reconciled)'],
      ['Total Outstanding Balances', kpis.totalOutstandingBalancesPaise / 100, currency, 'Net unsettled debt across all members'],
      ['Total Confirmed Repayments', kpis.totalConfirmedRepaymentsPaise / 100, currency, 'Confirmed debt settlements processed in group'],
      ['Total Pending Repayments', kpis.totalPendingRepaymentsPaise / 100, currency, 'Settlements awaiting confirmation'],
      ['Group Budget Allocation', kpis.budgetPaise > 0 ? kpis.budgetPaise / 100 : 'Not Set', currency, 'Total designated trip budget'],
      ['Remaining Budget Available', kpis.budgetPaise > 0 ? kpis.remainingBudgetPaise / 100 : 'N/A', currency, 'Budget surplus or headroom'],
      ['Zero-Sum Ledger Status', kpis.isBalancedZeroSum ? 'VERIFIED (Sum = 0.00)' : 'UNBALANCED', '', 'Reconciliation invariant: Sum of member balances == 0'],
      [],
      ['SPENDING HIGHLIGHTS & AWARDS'],
      ['Highlight', 'Details', 'Amount', 'Participant / Entity'],
      [
        'Largest Expense',
        kpis.largestExpense ? kpis.largestExpense.title : 'None',
        kpis.largestExpense ? kpis.largestExpense.amountPaise / 100 : 0,
        kpis.largestExpense ? `${kpis.largestExpense.payerName} (${new Date(kpis.largestExpense.date).toLocaleDateString('en-IN')})` : 'N/A',
      ],
      [
        'Top Spending Category',
        kpis.topSpendingCategory ? kpis.topSpendingCategory.categoryLabel : 'None',
        kpis.topSpendingCategory ? kpis.topSpendingCategory.amountPaise / 100 : 0,
        kpis.topSpendingCategory ? `${kpis.topSpendingCategory.percentage}% of total group spending` : 'N/A',
      ],
      [
        'Highest Spending Member (Share)',
        kpis.highestSpendingMember ? kpis.highestSpendingMember.name : 'None',
        kpis.highestSpendingMember ? kpis.highestSpendingMember.sharePaise / 100 : 0,
        kpis.highestSpendingMember ? `${kpis.highestSpendingMember.percentage}% of total group consumption` : 'N/A',
      ],
      [],
      ['AUDIT NOTES & COMPLIANCE'],
      ['1. Financial Invariant: In TripMate, single-currency closed-group net balances strictly sum to zero.'],
      ['2. Offline Generation: This genuine Excel report was compiled directly from on-device SQLite database records.'],
      ['3. Receipts: Linked bill receipts and invoices are detailed in Sheet 10.'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ExcelWorkbookBuilder.formatSheet(ws, [35, 30, 20, 45]);
    return ws;
  }

  // --- SHEET 2: COMPLETE EXPENSE LEDGER ---
  private static buildExpenseLedgerSheet(data: DetailedGroupReportData): XLSX.WorkSheet {
    const headers = [
      'Expense ID',
      'Expense Title',
      'Description / Notes',
      'Category',
      'Expense Date',
      'Expense Time',
      'Creation Timestamp',
      'Recorded By',
      'Group Name',
      'Currency',
      'Total Amount',
      'Payer Names',
      'Payer-wise Amounts',
      'Participant Names',
      'Participant Count',
      'Split Method',
      'Per-Member Share Details',
      'Expense Location Name',
      'Linked Receipts',
      'Expense Status',
    ];

    const rows: any[][] = [headers];

    if (data.expenses.length === 0) {
      rows.push(['No expenses recorded in the selected period.', '', '', '', '', '', '', '', '', '', 0, '', '', '', 0, '', '', '', '', '']);
    } else {
      for (const exp of data.expenses) {
        const d = new Date(exp.date);
        const dateStr = d.toLocaleDateString('en-IN');
        const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        const payerNames = exp.payerName || 'Member';
        const payerAmounts = `${exp.payerName || 'Member'}: ${(exp.amountPaise / 100).toFixed(2)}`;

        const participantNames = (exp.splits || []).map((s: any) => s.userName).join(', ');
        const participantCount = exp.splits ? exp.splits.length : 1;
        const splitMethod = exp.splits?.[0]?.splitType || 'EQUAL';

        const shareDetails = (exp.splits || [])
          .map((s: any) => `${s.userName}: ${(s.amountPaise / 100).toFixed(2)}`)
          .join('; ');

        const receipts = (exp.receipts || [])
          .map((r: any) => r.title || r.original_filename)
          .join(', ') || 'None';

        rows.push([
          exp.id,
          exp.title,
          exp.notes || '—',
          exp.category ? exp.category.replace(/_/g, ' ') : 'OTHER',
          dateStr,
          timeStr,
          exp.created_at || exp.date,
          'You (Logged user)',
          data.group.name,
          exp.currency || data.group.currency,
          exp.amountPaise / 100, // Real numeric cell
          payerNames,
          payerAmounts,
          participantNames,
          participantCount,
          splitMethod,
          shareDetails,
          'On-Trip',
          receipts,
          'CONFIRMED',
        ]);
      }

      // Add Total Formula Row
      const lastRowNum = rows.length;
      const totalExpPaise = data.expenses.reduce((acc: number, e: any) => acc + (e.amountPaise || 0), 0);
      const totalPartCount = data.expenses.reduce((acc: number, e: any) => acc + (e.splits ? e.splits.length : 1), 0);
      rows.push([
        'TOTALS',
        `Total ${data.expenses.length} Expenses`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        data.group.currency,
        { t: 'n', f: `SUM(K2:K${lastRowNum})`, v: totalExpPaise / 100 },
        '',
        '',
        '',
        { t: 'n', f: `SUM(O2:O${lastRowNum})`, v: totalPartCount },
        '',
        '',
        '',
        '',
        '',
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ExcelWorkbookBuilder.formatSheet(ws, [16, 25, 25, 18, 14, 12, 22, 18, 20, 10, 16, 20, 25, 30, 16, 14, 35, 18, 20, 14]);
    ws['!autofilter'] = { ref: `A1:T${rows.length}` };
    return ws;
  }

  // --- SHEET 3: MEMBER SUMMARY ---
  private static buildMemberSummarySheet(data: DetailedGroupReportData): XLSX.WorkSheet {
    const headers = [
      'Member ID',
      'Full Name',
      'Nickname',
      'Role',
      'Status',
      'Join Date',
      'Total Amount Paid',
      'Total Expense Share',
      'Net Balance',
      'Amount Owed to Member',
      'Amount Member Owes',
      'Confirmed Repayments Made',
      'Confirmed Repayments Received',
      'Pending Repayments',
      'Expenses Paid Count',
      'Expenses Participated Count',
    ];

    const rows: any[][] = [headers];

    for (const m of data.members) {
      rows.push([
        m.userId,
        m.name,
        m.nickname || '—',
        m.role,
        m.isActive ? 'Active' : 'Archived',
        new Date(m.joinedAt).toLocaleDateString('en-IN'),
        m.totalPaidPaise / 100,
        m.totalSharePaise / 100,
        m.netBalancePaise / 100,
        m.amountOwedPaise / 100,
        m.amountOwingPaise / 100,
        m.confirmedRepaymentsMadePaise / 100,
        m.confirmedRepaymentsReceivedPaise / 100,
        m.pendingRepaymentsPaise / 100,
        m.paidExpenseCount,
        m.participatedExpenseCount,
      ]);
    }

    // Totals row with formulas
    const lastRowNum = rows.length;
    const totalPaidSum = data.members.reduce((acc, m) => acc + m.totalPaidPaise, 0) / 100;
    const totalShareSum = data.members.reduce((acc, m) => acc + m.totalSharePaise, 0) / 100;
    const netBalanceSum = data.members.reduce((acc, m) => acc + m.netBalancePaise, 0) / 100;
    const totalOwedSum = data.members.reduce((acc, m) => acc + m.amountOwedPaise, 0) / 100;
    const totalOwingSum = data.members.reduce((acc, m) => acc + m.amountOwingPaise, 0) / 100;
    const repMadeSum = data.members.reduce((acc, m) => acc + m.confirmedRepaymentsMadePaise, 0) / 100;
    const repRecSum = data.members.reduce((acc, m) => acc + m.confirmedRepaymentsReceivedPaise, 0) / 100;
    const repPendingSum = data.members.reduce((acc, m) => acc + m.pendingRepaymentsPaise, 0) / 100;
    const paidExpSum = data.members.reduce((acc, m) => acc + m.paidExpenseCount, 0);
    const partExpSum = data.members.reduce((acc, m) => acc + m.participatedExpenseCount, 0);

    rows.push([
      'TOTALS',
      `All ${data.members.length} Members`,
      '',
      '',
      '',
      '',
      { t: 'n', f: `SUM(G2:G${lastRowNum})`, v: totalPaidSum },
      { t: 'n', f: `SUM(H2:H${lastRowNum})`, v: totalShareSum },
      { t: 'n', f: `SUM(I2:I${lastRowNum})`, v: netBalanceSum }, // Net Balance sum must equal 0.00!
      { t: 'n', f: `SUM(J2:J${lastRowNum})`, v: totalOwedSum },
      { t: 'n', f: `SUM(K2:K${lastRowNum})`, v: totalOwingSum },
      { t: 'n', f: `SUM(L2:L${lastRowNum})`, v: repMadeSum },
      { t: 'n', f: `SUM(M2:M${lastRowNum})`, v: repRecSum },
      { t: 'n', f: `SUM(N2:N${lastRowNum})`, v: repPendingSum },
      { t: 'n', f: `SUM(O2:O${lastRowNum})`, v: paidExpSum },
      { t: 'n', f: `SUM(P2:P${lastRowNum})`, v: partExpSum },
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ExcelWorkbookBuilder.formatSheet(ws, [18, 22, 16, 12, 12, 14, 18, 18, 16, 22, 20, 24, 26, 20, 18, 24]);
    ws['!autofilter'] = { ref: `A1:P${rows.length}` };
    return ws;
  }

  // --- SHEET 4: DETAILED PAYMENT RECORDS ---
  private static buildPaymentRecordsSheet(data: DetailedGroupReportData): XLSX.WorkSheet {
    const headers = [
      'Expense ID',
      'Expense Title',
      'Payer ID',
      'Payer Name',
      'Payment Amount',
      'Currency',
      'Payment Date',
      'Associated Notes',
    ];

    const rows: any[][] = [headers];

    if (data.payments.length === 0) {
      rows.push(['No payment records found.', '', '', '', 0, data.group.currency, '', '']);
    } else {
      for (const p of data.payments) {
        rows.push([
          p.expenseId,
          p.expenseTitle,
          p.userId,
          p.userName,
          p.amountPaise / 100,
          p.currency,
          new Date(p.date).toLocaleDateString('en-IN'),
          p.notes || '—',
        ]);
      }

      const lastRowNum = rows.length;
      const totalPaymentsSum = data.payments.reduce((acc, p) => acc + p.amountPaise, 0) / 100;
      rows.push([
        'TOTALS',
        `Total ${data.payments.length} Payments`,
        '',
        '',
        { t: 'n', f: `SUM(E2:E${lastRowNum})`, v: totalPaymentsSum },
        data.group.currency,
        '',
        '',
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ExcelWorkbookBuilder.formatSheet(ws, [16, 25, 18, 20, 16, 10, 14, 30]);
    ws['!autofilter'] = { ref: `A1:H${rows.length}` };
    return ws;
  }

  // --- SHEET 5: SPLIT DETAILS ---
  private static buildSplitDetailsSheet(data: DetailedGroupReportData): XLSX.WorkSheet {
    const headers = [
      'Expense ID',
      'Expense Title',
      'Participant ID',
      'Participant Name',
      'Expense Total',
      'Participant Share',
      'Split Method',
      'Split Percentage (%)',
      'Currency',
    ];

    const rows: any[][] = [headers];

    if (data.splits.length === 0) {
      rows.push(['No split records found.', '', '', '', 0, 0, '', 0, data.group.currency]);
    } else {
      for (const s of data.splits) {
        rows.push([
          s.expenseId,
          s.expenseTitle,
          s.userId,
          s.userName,
          s.expenseTotalPaise / 100,
          s.amountPaise / 100,
          s.splitType,
          s.percentage || 0,
          s.currency,
        ]);
      }

      const lastRowNum = rows.length;
      const totalSplitsSum = data.splits.reduce((acc, s) => acc + s.amountPaise, 0) / 100;
      rows.push([
        'TOTALS',
        `Total ${data.splits.length} Allocations`,
        '',
        '',
        '',
        { t: 'n', f: `SUM(F2:F${lastRowNum})`, v: totalSplitsSum },
        '',
        '',
        data.group.currency,
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ExcelWorkbookBuilder.formatSheet(ws, [16, 25, 18, 20, 16, 18, 14, 20, 10]);
    ws['!autofilter'] = { ref: `A1:I${rows.length}` };
    return ws;
  }

  // --- SHEET 6: SETTLEMENT HISTORY ---
  private static buildSettlementHistorySheet(data: DetailedGroupReportData): XLSX.WorkSheet {
    const headers = [
      'Settlement ID',
      'Group Name',
      'Payer Name',
      'Recipient Name',
      'Amount',
      'Currency',
      'Creation Timestamp',
      'Confirmation Timestamp',
      'Status',
      'Notes',
    ];

    const rows: any[][] = [headers];

    if (data.settlements.length === 0) {
      rows.push(['No settlements recorded yet.', data.group.name, '', '', 0, data.group.currency, '', '', 'NONE', '']);
    } else {
      for (const st of data.settlements) {
        rows.push([
          st.id,
          st.groupName,
          st.payerName,
          st.payeeName,
          st.amountPaise / 100,
          st.currency,
          new Date(st.createdAt).toLocaleString('en-IN'),
          st.confirmedAt ? new Date(st.confirmedAt).toLocaleString('en-IN') : 'Pending',
          st.status,
          st.notes || '—',
        ]);
      }

      const lastRowNum = rows.length;
      const totalSettlementsSum = data.settlements.reduce((acc, s) => acc + s.amountPaise, 0) / 100;
      rows.push([
        'TOTALS',
        `Total ${data.settlements.length} Settlements`,
        '',
        '',
        { t: 'n', f: `SUM(E2:E${lastRowNum})`, v: totalSettlementsSum },
        data.group.currency,
        '',
        '',
        '',
        '',
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ExcelWorkbookBuilder.formatSheet(ws, [16, 20, 20, 20, 14, 10, 22, 22, 14, 30]);
    ws['!autofilter'] = { ref: `A1:J${rows.length}` };
    return ws;
  }

  // --- SHEET 7: OUTSTANDING BALANCES & SUGGESTED SETTLEMENTS ---
  private static buildOutstandingBalancesSheet(data: DetailedGroupReportData): XLSX.WorkSheet {
    const rows: any[][] = [
      ['CURRENT MEMBER NET BALANCES (ZERO-SUM AUDIT)'],
      ['Member Name', 'Role', 'Status', 'Net Balance', 'Amount Owed to Member', 'Amount Member Owes', 'Financial Standing'],
    ];

    for (const m of data.members) {
      let standing = 'Settled Up (Balance 0.00)';
      if (m.netBalancePaise > 0) {
        standing = `Owed ${(m.netBalancePaise / 100).toFixed(2)} ${data.group.currency}`;
      } else if (m.netBalancePaise < 0) {
        standing = `Owes ${Math.abs(m.netBalancePaise / 100).toFixed(2)} ${data.group.currency}`;
      }

      rows.push([
        m.name,
        m.role,
        m.isActive ? 'Active' : 'Archived',
        m.netBalancePaise / 100,
        m.amountOwedPaise / 100,
        m.amountOwingPaise / 100,
        standing,
      ]);
    }

    const memberTableEnd = rows.length;
    const netBalSum = data.members.reduce((acc, m) => acc + m.netBalancePaise, 0) / 100;
    const owedSum = data.members.reduce((acc, m) => acc + m.amountOwedPaise, 0) / 100;
    const owingSum = data.members.reduce((acc, m) => acc + m.amountOwingPaise, 0) / 100;
    rows.push([
      'TOTALS (Zero-Sum Invariant)',
      '',
      '',
      { t: 'n', f: `SUM(D3:D${memberTableEnd})`, v: netBalSum },
      { t: 'n', f: `SUM(E3:E${memberTableEnd})`, v: owedSum },
      { t: 'n', f: `SUM(F3:F${memberTableEnd})`, v: owingSum },
      data.kpis.isBalancedZeroSum ? 'BALANCED (Sum = 0.00)' : 'AUDIT WARNING',
    ]);

    rows.push([]);
    rows.push(['OPTIMIZED SETTLEMENT PLAN (MINIMAL DEBT TRANSFERS)']);
    rows.push(['Suggested Payer (Debtor)', 'Suggested Recipient (Creditor)', 'Transfer Amount', 'Currency', 'Settlement Status', 'Instructions']);

    if (data.suggestedSettlements.length === 0) {
      rows.push(['All group balances are settled!', '', 0, data.group.currency, 'COMPLETE', 'No payment transfers needed.']);
    } else {
      for (const s of data.suggestedSettlements) {
        rows.push([
          s.fromUserName,
          s.toUserName,
          s.amountPaise / 100,
          s.currency,
          'SUGGESTED',
          `Pay ${(s.amountPaise / 100).toFixed(2)} to ${s.toUserName} to settle debt.`,
        ]);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ExcelWorkbookBuilder.formatSheet(ws, [22, 14, 12, 16, 22, 20, 30]);
    return ws;
  }

  // --- SHEET 8: CATEGORY ANALYSIS ---
  private static buildCategoryAnalysisSheet(data: DetailedGroupReportData): XLSX.WorkSheet {
    const headers = [
      'Category Name',
      'Expense Count',
      'Total Amount',
      '% of Total Spending',
      'Average Expense',
      'Largest Single Expense',
      'Budget Limit',
      'Remaining Category Budget',
    ];

    const rows: any[][] = [headers];

    if (data.categories.length === 0) {
      rows.push(['No categorized expenses recorded.', 0, 0, 0, 0, 0, 0, 0]);
    } else {
      for (const cat of data.categories) {
        rows.push([
          cat.categoryLabel,
          cat.expenseCount,
          cat.totalPaise / 100,
          cat.percentage,
          cat.averagePaise / 100,
          cat.largestExpensePaise / 100,
          cat.budgetPaise > 0 ? cat.budgetPaise / 100 : 'N/A',
          cat.budgetPaise > 0 ? cat.remainingBudgetPaise / 100 : 'N/A',
        ]);
      }

      const lastRowNum = rows.length;
      const catCountSum = data.categories.reduce((acc, c) => acc + c.expenseCount, 0);
      const catAmtSum = data.categories.reduce((acc, c) => acc + c.totalPaise, 0) / 100;
      rows.push([
        'TOTALS',
        { t: 'n', f: `SUM(B2:B${lastRowNum})`, v: catCountSum },
        { t: 'n', f: `SUM(C2:C${lastRowNum})`, v: catAmtSum },
        100.0,
        '',
        '',
        '',
        '',
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ExcelWorkbookBuilder.formatSheet(ws, [24, 16, 18, 20, 18, 22, 16, 24]);
    ws['!autofilter'] = { ref: `A1:H${rows.length}` };
    return ws;
  }

  // --- SHEET 9: DAILY SPENDING ---
  private static buildDailySpendingSheet(data: DetailedGroupReportData): XLSX.WorkSheet {
    const headers = [
      'Expense Date',
      'Expense Count',
      'Daily Total Spending',
      'Category Breakdown',
      'Daily Average Expense',
      'Cumulative Spending',
    ];

    const rows: any[][] = [headers];

    if (data.dailySpending.length === 0) {
      rows.push(['No expenses recorded in period.', 0, 0, '—', 0, 0]);
    } else {
      for (const ds of data.dailySpending) {
        rows.push([
          ds.date,
          ds.expenseCount,
          ds.totalPaise / 100,
          ds.categoryBreakdown,
          ds.dailyAveragePaise / 100,
          ds.cumulativePaise / 100,
        ]);
      }

      const lastRowNum = rows.length;
      const dailyCountSum = data.dailySpending.reduce((acc, d) => acc + d.expenseCount, 0);
      const dailyAmtSum = data.dailySpending.reduce((acc, d) => acc + d.totalPaise, 0) / 100;
      rows.push([
        'TOTALS',
        { t: 'n', f: `SUM(B2:B${lastRowNum})`, v: dailyCountSum },
        { t: 'n', f: `SUM(C2:C${lastRowNum})`, v: dailyAmtSum },
        'All categories',
        '',
        '',
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ExcelWorkbookBuilder.formatSheet(ws, [16, 16, 22, 40, 22, 22]);
    ws['!autofilter'] = { ref: `A1:F${rows.length}` };
    return ws;
  }

  // --- SHEET 10: RECEIPTS AND DOCUMENTS ---
  private static buildDocumentsSheet(data: DetailedGroupReportData): XLSX.WorkSheet {
    const headers = [
      'Document ID',
      'Document Title',
      'Group Name',
      'Linked Expense ID',
      'Linked Expense Title',
      'Category',
      'Original Filename',
      'File Type (MIME)',
      'File Size (KB)',
      'Upload Date & Time',
      'Associated Expense Amount',
      'Local Storage Availability',
    ];

    const rows: any[][] = [headers];

    if (data.documents.length === 0) {
      rows.push(['No documents attached in group.', '', data.group.name, '', '', '', '', '', 0, '', 0, 'N/A']);
    } else {
      for (const doc of data.documents) {
        rows.push([
          doc.id,
          doc.title,
          doc.groupName,
          doc.expenseId || 'Not linked',
          doc.expenseTitle || 'Unattached Bill',
          doc.category,
          doc.originalFilename,
          doc.mimeType,
          Math.round(doc.fileSizeBytes / 1024),
          new Date(doc.uploadedAt).toLocaleString('en-IN'),
          doc.expenseAmountPaise ? doc.expenseAmountPaise / 100 : 'N/A',
          doc.isAvailableLocally ? 'Available On Device' : 'Missing File',
        ]);
      }

      const lastRowNum = rows.length;
      const docKbSum = data.documents.reduce((acc, d) => acc + Math.round(d.fileSizeBytes / 1024), 0);
      rows.push([
        'TOTALS',
        `Total ${data.documents.length} Attachments`,
        '',
        '',
        '',
        '',
        '',
        '',
        { t: 'n', f: `SUM(I2:I${lastRowNum})`, v: docKbSum },
        '',
        '',
        '',
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ExcelWorkbookBuilder.formatSheet(ws, [16, 25, 20, 18, 25, 14, 25, 20, 14, 22, 26, 24]);
    ws['!autofilter'] = { ref: `A1:L${rows.length}` };
    return ws;
  }

  /**
   * Sets auto column widths and views/panes.
   */
  private static formatSheet(ws: XLSX.WorkSheet, columnWidths: number[]): void {
    ws['!cols'] = columnWidths.map((wch) => ({ wch }));
    ws['!views'] = [{ state: 'frozen', ySplit: 1 }];
  }
}
