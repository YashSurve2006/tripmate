import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { DocumentItem } from '../../src/components/common/DocumentItem';
import { DocumentViewerModal } from '../../src/components/common/DocumentViewerModal';
import { Avatar } from '../../src/components/ui/Avatar';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { ConfirmationDialog } from '../../src/components/ui/ConfirmationDialog';
import { Loading } from '../../src/components/ui/Loading';
import { api } from '../../src/services/api';
import { GroupDocumentRow } from '../../src/services/database';
import { useTheme } from '../../src/theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../src/theme/tokens';
import { formatCurrency } from '../../src/utils/finance';

export default function ExpenseDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();

  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<GroupDocumentRow | null>(null);

  const loadExpense = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getExpenseById(id);
      setExpense(data);
    } catch (err) {
      console.warn('Failed to load expense details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadExpense();
  }, [loadExpense]);

  const onRefresh = () => {
    setRefreshing(true);
    loadExpense();
  };

  const handleDeleteExpense = async () => {
    setDeleting(true);
    try {
      await api.deleteExpense(expense.id);
      Alert.alert('Deleted', 'Expense has been removed and balances recalculated.');
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to delete expense.');
    } finally {
      setDeleting(false);
      setDeleteConfirmVisible(false);
    }
  };

  if (loading && !refreshing) {
    return <Loading fullScreen message="Loading expense details..." />;
  }

  if (!expense) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Expense Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={48} color={colors.negative} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Expense Not Found</Text>
          <Text style={[styles.errorSub, { color: colors.textMuted }]}>
            This expense may have been deleted or settled.
          </Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: Spacing.md }} />
        </View>
      </View>
    );
  }

  const categoryIcons: Record<string, string> = {
    FOOD_AND_DRINK: 'fast-food',
    TRANSPORT: 'car',
    ACCOMMODATION: 'bed',
    ENTERTAINMENT: 'game-controller',
    GROCERIES: 'basket',
    UTILITIES: 'flash',
    SHOPPING: 'cart',
    OTHER: 'receipt',
  };

  const catIcon = categoryIcons[expense.category] || 'receipt';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          Expense Breakdown
        </Text>
        <TouchableOpacity onPress={() => setDeleteConfirmVisible(true)} style={styles.deleteHeaderBtn}>
          <Feather name="trash-2" size={20} color={colors.negative} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Main Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={[styles.categoryCircle, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name={catIcon as any} size={28} color={colors.primary} />
          </View>

          <Text style={[styles.expenseTitle, { color: colors.text }]}>{expense.title}</Text>
          <Text style={[styles.expenseAmount, { color: colors.text }]}>
            {formatCurrency(expense.amountPaise, expense.currency)}
          </Text>

          <View style={styles.tagRow}>
            <Badge label={expense.category.replace(/_/g, ' ')} variant="primary" size="sm" />
            <Text style={[styles.dateText, { color: colors.textMuted }]}>
              {new Date(expense.date).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>

          {expense.notes && (
            <View style={[styles.notesContainer, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.notesText, { color: colors.textSecondary }]}>{expense.notes}</Text>
            </View>
          )}
        </View>

        {/* Payer Section */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>Paid By</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.memberRow}>
            <Avatar name={expense.payerName} size="md" />
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: colors.text }]}>{expense.payerName}</Text>
              <Text style={[styles.memberSub, { color: colors.textMuted }]}>Paid the full bill</Text>
            </View>
            <Text style={[styles.amountPaid, { color: colors.positive }]}>
              {formatCurrency(expense.amountPaise, expense.currency)}
            </Text>
          </View>
        </View>

        {/* Participants & Split Breakdown */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
          Split Breakdown ({expense.participantCount} {expense.participantCount === 1 ? 'person' : 'people'})
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          {expense.splits && expense.splits.length > 0 ? (
            expense.splits.map((s: any, idx: number) => (
              <View
                key={s.userId || idx}
                style={[
                  styles.splitRow,
                  idx < expense.splits.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderLight,
                  },
                ]}
              >
                <Avatar name={s.userName} size="sm" />
                <View style={styles.splitInfo}>
                  <Text style={[styles.splitName, { color: colors.text }]}>{s.userName}</Text>
                  <Text style={[styles.splitType, { color: colors.textMuted }]}>
                    {s.splitType === 'EQUAL' ? 'Equal share' : 'Custom split'}
                  </Text>
                </View>
                <Text style={[styles.splitAmount, { color: colors.text }]}>
                  {formatCurrency(s.amountPaise, expense.currency)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptySplit, { color: colors.textMuted }]}>
              Split equally among participants ({formatCurrency(expense.userSharePaise, expense.currency)} each)
            </Text>
          )}
        </View>

        {/* Associated Receipts & Invoices */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary, marginBottom: 0 }]}>
            Associated Receipts & Bills
          </Text>
          <Badge
            label={`${(expense.receipts || []).length} Document${(expense.receipts || []).length === 1 ? '' : 's'}`}
            variant="neutral"
            size="sm"
          />
        </View>

        {expense.receipts && expense.receipts.length > 0 ? (
          <View style={{ marginTop: Spacing.sm }}>
            {expense.receipts.map((doc: GroupDocumentRow) => (
              <DocumentItem
                key={doc.id}
                document={doc}
                onPress={() => setSelectedDoc(doc)}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.noDocsCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Feather name="file-text" size={24} color={colors.textSubtle} />
            <Text style={[styles.noDocsText, { color: colors.textMuted }]}>
              No receipt or invoice was attached to this expense.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Document Viewer Modal */}
      {selectedDoc && (
        <DocumentViewerModal
          visible={!!selectedDoc}
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDelete={async (docId) => {
            await api.deleteDocument(docId);
            loadExpense();
          }}
          onUpdate={async (docId, updates) => {
            await api.updateDocument(docId, updates);
            loadExpense();
          }}
        />
      )}

      {/* Delete Expense Dialog */}
      <ConfirmationDialog
        visible={deleteConfirmVisible}
        title="Delete Expense"
        message={`Are you sure you want to delete "${expense.title}"? Group member balances will be recalculated. Any attached receipts will remain preserved in the group repository.`}
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        isDestructive
        onConfirm={handleDeleteExpense}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 54,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  deleteHeaderBtn: {
    padding: 4,
  },
  headerTitle: {
    ...Typography.h3,
    fontSize: 17,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  categoryCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  expenseTitle: {
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  expenseAmount: {
    ...Typography.currencyHero,
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  dateText: {
    ...Typography.caption,
  },
  notesContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    width: '100%',
  },
  notesText: {
    ...Typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
  sectionHeading: {
    ...Typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: Spacing.xs + 2,
    marginTop: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs + 2,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  memberName: {
    ...Typography.bodyBold,
  },
  memberSub: {
    ...Typography.tiny,
    marginTop: 2,
  },
  amountPaid: {
    ...Typography.bodyBold,
    fontSize: 16,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  splitInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  splitName: {
    ...Typography.bodyBold,
    fontSize: 13,
  },
  splitType: {
    ...Typography.tiny,
    marginTop: 1,
  },
  splitAmount: {
    ...Typography.bodyBold,
    fontSize: 14,
  },
  emptySplit: {
    ...Typography.caption,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  noDocsCard: {
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  noDocsText: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    ...Typography.h2,
    marginTop: Spacing.md,
  },
  errorSub: {
    ...Typography.body,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
