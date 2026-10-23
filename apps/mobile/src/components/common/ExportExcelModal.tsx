import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../theme/tokens';
import { formatCurrency } from '../../utils/finance';
import { Button } from '../ui/Button';
import {
  ExportFilters,
  ExportPreviewData,
  expenseReportService,
  ExcelWorkbookBuilder,
  ExportFileService,
} from '../../services/export';

const CATEGORIES = [
  { key: 'ALL', label: 'All Categories' },
  { key: 'FOOD_AND_DRINK', label: 'Food & Dining' },
  { key: 'TRANSPORT', label: 'Transport' },
  { key: 'ACCOMMODATION', label: 'Stay / Hotel' },
  { key: 'ENTERTAINMENT', label: 'Entertainment' },
  { key: 'SHOPPING', label: 'Shopping' },
  { key: 'GROCERIES', label: 'Groceries' },
  { key: 'FLIGHTS', label: 'Flights' },
  { key: 'UTILITIES', label: 'Bills / Utilities' },
  { key: 'OTHER', label: 'Other' },
];

interface ExportExcelModalProps {
  visible: boolean;
  groupId: string;
  groupName: string;
  groupCurrency: string;
  members: Array<{ userId: string; name: string }>;
  onClose: () => void;
}

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({
  visible,
  groupId,
  groupName,
  groupCurrency,
  members,
  onClose,
}) => {
  const { colors } = useTheme();

  // Filter states
  const [dateRange, setDateRange] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('ALL');
  const [memberId, setMemberId] = useState('ALL');
  const [scope, setScope] = useState<'COMPLETE' | 'EXPENSES_ONLY'>('COMPLETE');

  // Preview & export states
  const [preview, setPreview] = useState<ExportPreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Load preview whenever filters change
  useEffect(() => {
    if (!visible || !groupId) return;

    let isMounted = true;
    async function updatePreview() {
      try {
        setLoadingPreview(true);
        const filters: ExportFilters = {
          dateRange,
          startDate: dateRange === 'CUSTOM' && startDate ? startDate : undefined,
          endDate: dateRange === 'CUSTOM' && endDate ? endDate : undefined,
          categoryId,
          memberId,
          scope,
        };

        const previewData = await expenseReportService.getExportPreview(groupId, filters);
        if (isMounted) {
          setPreview(previewData);
        }
      } catch (err) {
        console.warn('Failed to load export preview:', err);
      } finally {
        if (isMounted) setLoadingPreview(false);
      }
    }

    updatePreview();
    return () => {
      isMounted = false;
    };
  }, [visible, groupId, dateRange, startDate, endDate, categoryId, memberId, scope]);

  const handleGenerateAndShare = async () => {
    try {
      setExporting(true);
      setExportSuccess(null);

      const filters: ExportFilters = {
        dateRange,
        startDate: dateRange === 'CUSTOM' && startDate ? startDate : undefined,
        endDate: dateRange === 'CUSTOM' && endDate ? endDate : undefined,
        categoryId,
        memberId,
        scope,
      };

      // 1. Gather real full report data from database engine
      const reportData = await expenseReportService.getFullReportData(groupId, filters);

      // 2. Build the genuine 10-sheet .xlsx workbook
      const workbook = ExcelWorkbookBuilder.buildWorkbook(reportData);

      // 3. Write file and present native share sheet or web download
      const result = await ExportFileService.exportAndShareWorkbook(workbook, groupName);

      if (result.success) {
        setExportSuccess(`Report "${result.filename}" successfully generated!`);
        Alert.alert(
          'Excel Export Ready',
          `Workbook "${result.filename}" has been generated successfully with all worksheets and calculations.`
        );
      } else {
        Alert.alert('Export Failed', result.error || 'Could not export Excel report.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.excelBadge, { backgroundColor: '#107C41' }]}>
                <MaterialCommunityIcons name="file-excel" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Export Expense Report</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {groupName} • Genuine .xlsx Workbook
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Live Preview Card */}
            <View style={[styles.previewCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
              <View style={styles.previewHeader}>
                <View style={styles.previewTag}>
                  <Feather name="eye" size={12} color={colors.primary} />
                  <Text style={[styles.previewTagText, { color: colors.primary }]}>Live Report Preview</Text>
                </View>
                {loadingPreview && <ActivityIndicator size="small" color={colors.primary} />}
              </View>

              {preview ? (
                <View style={styles.previewStatsGrid}>
                  <View style={styles.previewStatCol}>
                    <Text style={[styles.previewStatLabel, { color: colors.textMuted }]}>Reporting Period</Text>
                    <Text style={[styles.previewStatValue, { color: colors.text }]} numberOfLines={1}>
                      {preview.reportingPeriod}
                    </Text>
                  </View>

                  <View style={styles.previewStatCol}>
                    <Text style={[styles.previewStatLabel, { color: colors.textMuted }]}>Expenses Count</Text>
                    <Text style={[styles.previewStatValue, { color: colors.text }]}>
                      {preview.expenseCount} items
                    </Text>
                  </View>

                  <View style={styles.previewStatCol}>
                    <Text style={[styles.previewStatLabel, { color: colors.textMuted }]}>Total Spending</Text>
                    <Text style={[styles.previewStatValue, { color: colors.primary }]}>
                      {formatCurrency(preview.totalSpendingPaise, groupCurrency)}
                    </Text>
                  </View>

                  <View style={styles.previewStatCol}>
                    <Text style={[styles.previewStatLabel, { color: colors.textMuted }]}>Outstanding Balances</Text>
                    <Text style={[styles.previewStatValue, { color: colors.text }]}>
                      {formatCurrency(preview.outstandingBalancePaise, groupCurrency)}
                    </Text>
                  </View>
                </View>
              ) : (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: Spacing.md }} />
              )}

              <View style={[styles.zeroSumPill, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.positive} />
                <Text style={[styles.zeroSumText, { color: colors.textMuted }]}>
                  Reconciled offline with zero-sum accounting invariant
                </Text>
              </View>
            </View>

            {/* Scope Filter: Complete Financial Report vs Expenses Only */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Report Depth</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  onPress={() => setScope('COMPLETE')}
                  style={[
                    styles.toggleBtn,
                    {
                      backgroundColor: scope === 'COMPLETE' ? colors.primary : colors.surfaceAlt,
                      borderColor: scope === 'COMPLETE' ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="book-open-page-variant"
                    size={16}
                    color={scope === 'COMPLETE' ? '#FFFFFF' : colors.text}
                  />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      { color: scope === 'COMPLETE' ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    Complete (10 Sheets)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setScope('EXPENSES_ONLY')}
                  style={[
                    styles.toggleBtn,
                    {
                      backgroundColor: scope === 'EXPENSES_ONLY' ? colors.primary : colors.surfaceAlt,
                      borderColor: scope === 'EXPENSES_ONLY' ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <Feather
                    name="list"
                    size={16}
                    color={scope === 'EXPENSES_ONLY' ? '#FFFFFF' : colors.text}
                  />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      { color: scope === 'EXPENSES_ONLY' ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    Expenses Only (5 Sheets)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Range Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Date Range</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  onPress={() => setDateRange('ALL')}
                  style={[
                    styles.toggleBtn,
                    {
                      backgroundColor: dateRange === 'ALL' ? colors.primary : colors.surfaceAlt,
                      borderColor: dateRange === 'ALL' ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <Feather name="calendar" size={14} color={dateRange === 'ALL' ? '#FFFFFF' : colors.text} />
                  <Text style={[styles.toggleBtnText, { color: dateRange === 'ALL' ? '#FFFFFF' : colors.text }]}>
                    Entire Trip History
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setDateRange('CUSTOM')}
                  style={[
                    styles.toggleBtn,
                    {
                      backgroundColor: dateRange === 'CUSTOM' ? colors.primary : colors.surfaceAlt,
                      borderColor: dateRange === 'CUSTOM' ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <Feather name="clock" size={14} color={dateRange === 'CUSTOM' ? '#FFFFFF' : colors.text} />
                  <Text style={[styles.toggleBtnText, { color: dateRange === 'CUSTOM' ? '#FFFFFF' : colors.text }]}>
                    Custom Date Range
                  </Text>
                </TouchableOpacity>
              </View>

              {dateRange === 'CUSTOM' && (
                <View style={styles.customDateInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Start Date (YYYY-MM-DD)</Text>
                    <TextInput
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="e.g. 2026-10-01"
                      placeholderTextColor={colors.textSubtle}
                      style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.borderLight }]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>End Date (YYYY-MM-DD)</Text>
                    <TextInput
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholder="e.g. 2026-10-31"
                      placeholderTextColor={colors.textSubtle}
                      style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.borderLight }]}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Category Filter */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Scope</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => setCategoryId(c.key)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: categoryId === c.key ? colors.primary : colors.surfaceAlt,
                        borderColor: categoryId === c.key ? colors.primary : colors.borderLight,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: categoryId === c.key ? '#FFFFFF' : colors.text }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Member Filter */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Member Scope</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                <TouchableOpacity
                  onPress={() => setMemberId('ALL')}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: memberId === 'ALL' ? colors.primary : colors.surfaceAlt,
                      borderColor: memberId === 'ALL' ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: memberId === 'ALL' ? '#FFFFFF' : colors.text }]}>
                    All Members ({members.length})
                  </Text>
                </TouchableOpacity>

                {members.map((m) => (
                  <TouchableOpacity
                    key={m.userId}
                    onPress={() => setMemberId(m.userId)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: memberId === m.userId ? colors.primary : colors.surfaceAlt,
                        borderColor: memberId === m.userId ? colors.primary : colors.borderLight,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: memberId === m.userId ? '#FFFFFF' : colors.text }]}>
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Worksheet Manifest */}
            <View style={[styles.manifestBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
              <Text style={[styles.manifestTitle, { color: colors.text }]}>
                Included Worksheets ({scope === 'COMPLETE' ? '10' : '5'} Sheets)
              </Text>
              <Text style={[styles.manifestList, { color: colors.textMuted }]}>
                1. Executive Summary • 2. Expense Ledger • 3. Member Summary • 4. Payment Records • 5. Split Details
                {scope === 'COMPLETE' && (
                  <>
                    {'\n'}6. Settlement History • 7. Outstanding Balances • 8. Category Analysis • 9. Daily Spending • 10. Receipts & Documents
                  </>
                )}
              </Text>
            </View>

            {exportSuccess && (
              <View style={[styles.successBox, { backgroundColor: colors.positiveMuted, borderColor: colors.positive }]}>
                <Feather name="check-circle" size={16} color={colors.positive} />
                <Text style={[styles.successText, { color: colors.positive }]}>{exportSuccess}</Text>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
            <Button
              title={exporting ? 'Generating Genuine .xlsx...' : 'Export to Excel (.xlsx)'}
              variant="primary"
              size="lg"
              leftIcon={<MaterialCommunityIcons name="file-excel" size={20} color="#FFFFFF" />}
              onPress={handleGenerateAndShare}
              loading={exporting}
              style={{ flex: 1, backgroundColor: '#107C41' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  excelBadge: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.base,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: Typography.xs,
    marginTop: 2,
  },
  scrollBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  previewCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  previewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewTagText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  previewStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  previewStatCol: {
    width: '47%',
    marginBottom: 4,
  },
  previewStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  previewStatValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
    marginTop: 2,
  },
  zeroSumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  zeroSumText: {
    fontSize: 11,
    flex: 1,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
  },
  toggleBtnText: {
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  customDateInputs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  fieldLabel: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: Typography.sm,
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  chipText: {
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  manifestBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  manifestTitle: {
    fontSize: Typography.xs,
    fontWeight: '700',
    marginBottom: 4,
  },
  manifestList: {
    fontSize: 11,
    lineHeight: 16,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  successText: {
    fontSize: Typography.xs,
    fontWeight: '600',
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
});
