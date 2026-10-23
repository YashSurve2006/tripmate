import { api } from '../api';
import { ExportFilters, ExportPreviewData, DetailedGroupReportData } from './types';
import { formatCurrency } from '../../utils/finance';

export class ExpenseReportService {
  /**
   * Generates a fast live preview of the export metrics for the export modal dialog.
   */
  async getExportPreview(groupId: string, filters: ExportFilters): Promise<ExportPreviewData> {
    const reportData = await api.getGroupDetailedReport(groupId, filters);

    let filterSummary = 'All expenses, all members, all categories';
    if (filters.dateRange === 'CUSTOM') {
      filterSummary = `Period: ${filters.startDate || 'Start'} to ${filters.endDate || 'End'}`;
    }
    if (filters.categoryId !== 'ALL') {
      filterSummary += ` • Category: ${filters.categoryId.replace(/_/g, ' ')}`;
    }
    if (filters.memberId !== 'ALL') {
      const selectedMember = reportData.members.find((m) => m.userId === filters.memberId);
      filterSummary += ` • Member: ${selectedMember?.name || 'Selected Member'}`;
    }

    return {
      groupName: reportData.group.name,
      reportingPeriod: reportData.reportingPeriodLabel,
      expenseCount: reportData.kpis.expenseCount,
      totalSpendingPaise: reportData.kpis.totalExpensesPaise,
      currency: reportData.group.currency,
      memberCount: reportData.kpis.memberCount,
      outstandingBalancePaise: reportData.kpis.totalOutstandingBalancesPaise,
      settlementCount: reportData.settlements.length,
      documentCount: reportData.documents.length,
      filterSummary,
    };
  }

  /**
   * Obtains the complete financial dataset required to render the 10 Excel worksheets.
   */
  async getFullReportData(groupId: string, filters: ExportFilters): Promise<DetailedGroupReportData> {
    return api.getGroupDetailedReport(groupId, filters);
  }
}

export const expenseReportService = new ExpenseReportService();
