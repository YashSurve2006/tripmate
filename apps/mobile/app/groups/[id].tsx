import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Clipboard,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AddDocumentModal } from '../../src/components/common/AddDocumentModal';
import { AddMemberModal } from '../../src/components/common/AddMemberModal';
import { DocumentItem } from '../../src/components/common/DocumentItem';
import { DocumentViewerModal } from '../../src/components/common/DocumentViewerModal';
import { EditMemberModal } from '../../src/components/common/EditMemberModal';
import { ExpenseItem, ExpenseItemData } from '../../src/components/common/ExpenseItem';
import { ExportExcelModal } from '../../src/components/common/ExportExcelModal';
import { WhatsAppReminderModal } from '../../src/components/common/WhatsAppReminderModal';
import { Avatar } from '../../src/components/ui/Avatar';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { ConfirmationDialog } from '../../src/components/ui/ConfirmationDialog';

import { EmptyState } from '../../src/components/ui/EmptyState';
import { Loading } from '../../src/components/ui/Loading';
import { useAuth } from '../../src/context/AuthContext';
import { api, ReportMemberSummary } from '../../src/services/api';
import { ActivityRow, GroupDocumentRow } from '../../src/services/database';
import { useTheme } from '../../src/theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../src/theme/tokens';
import { formatCurrency, simplifyDebts } from '../../src/utils/finance';
import { buildSettlementReminderMessage } from '../../src/utils/whatsapp';

type TabOption = 'OVERVIEW' | 'EXPENSES' | 'BALANCES' | 'DOCUMENTS' | 'MEMBERS' | 'ACTIVITY';


export default function GroupDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabOption>('OVERVIEW');
  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<ExpenseItemData[]>([]);
  const [documents, setDocuments] = useState<GroupDocumentRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Document UI state
  const [selectedDoc, setSelectedDoc] = useState<GroupDocumentRow | null>(null);
  const [addDocModalVisible, setAddDocModalVisible] = useState(false);
  const [docCategoryFilter, setDocCategoryFilter] = useState('ALL');
  const [docSearchQuery, setDocSearchQuery] = useState('');

  // Settlement UI state
  const [settlements, setSettlements] = useState<any[]>([]);
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

  // Member Management UI state
  const [detailedMembers, setDetailedMembers] = useState<ReportMemberSummary[]>([]);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<ReportMemberSummary | null>(null);

  // Advanced Excel Export UI state
  const [exportModalVisible, setExportModalVisible] = useState(false);

  // Group Management & Danger Zone UI state
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [clearBillsConfirmVisible, setClearBillsConfirmVisible] = useState(false);
  const [groupMenuVisible, setGroupMenuVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // WhatsApp Reminder UI state
  const [whatsappModalVisible, setWhatsappModalVisible] = useState(false);
  const [whatsappTarget, setWhatsappTarget] = useState<{
    recipientName: string;
    memberUserId?: string;
    phoneNumber?: string;
    message: string;
  } | null>(null);


  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [fetchedGroup, fetchedExpenses, fetchedDocs, fetchedActs, fetchedMembers, fetchedSettlements] = await Promise.all([
        api.getGroupById(id),
        api.getExpenses(id),
        api.getDocuments(id, {
          category: docCategoryFilter !== 'ALL' ? docCategoryFilter : undefined,
          query: docSearchQuery.trim() || undefined,
        }),
        api.getActivities(id),
        api.getGroupMembers(id, true),
        api.getSettlements(id),
      ]);
      setGroup(fetchedGroup);
      setExpenses(fetchedExpenses);
      setDocuments(fetchedDocs);
      setActivities(fetchedActs);
      setDetailedMembers(fetchedMembers);
      setSettlements(fetchedSettlements);
    } catch (err) {
      console.warn('Failed to load group details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, docCategoryFilter, docSearchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const debtTransfers = React.useMemo(() => {
    if (!detailedMembers || detailedMembers.length < 2) return [];
    const memberBalanceMap: Record<string, any> = {};
    for (const m of detailedMembers) {
      memberBalanceMap[m.userId] = {
        userId: m.userId,
        balance: m.netBalancePaise,
        totalPaid: m.totalPaidPaise,
        totalShare: m.totalSharePaise,
        totalSettlementReceived: m.confirmedRepaymentsReceivedPaise,
        totalSettlementPaid: m.confirmedRepaymentsMadePaise,
      };
    }
    return simplifyDebts(memberBalanceMap, group?.currency || 'INR');
  }, [detailedMembers, group?.currency]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const copyInviteCode = () => {
    if (group?.inviteCode) {
      try {
        Clipboard.setString(group.inviteCode);
        Alert.alert('Invite Code Copied', `Code: ${group.inviteCode} copied to clipboard!`);
      } catch {
        Alert.alert('Invite Code', `Code: ${group.inviteCode}`);
      }
    }
  };

  const handleCreateDocument = async (docData: any) => {
    await api.createDocument(docData);
    loadData();
  };

  const handleDeleteDocument = async (docId: string) => {
    await api.deleteDocument(docId);
    loadData();
  };

  const handleUpdateDocument = async (docId: string, updates: any) => {
    await api.updateDocument(docId, updates);
    loadData();
  };

  const handleConfirmSettlement = async () => {
    if (!selectedTransfer || !group) return;
    try {
      await api.createSettlement({
        groupId: group.id,
        payerId: selectedTransfer.fromId,
        payeeId: selectedTransfer.toId,
        amountPaise: selectedTransfer.amountPaise,
        currency: group.currency,
        notes: `Settlement between ${selectedTransfer.fromName} and ${selectedTransfer.toName}`,
      });
      setSettleModalVisible(false);
      setSelectedTransfer(null);
      await loadData();
      Alert.alert('Settled!', 'Settlement recorded and account balances updated.');
    } catch {
      Alert.alert('Error', 'Failed to record settlement.');
    }
  };

  const handleAddMember = async (memberData: any, addAnother: boolean) => {
    if (!group) return;
    await api.addGroupMember(group.id, memberData);
    await loadData();
    if (!addAnother) {
      Alert.alert('Member Added', `"${memberData.name}" has been added to ${group.name}.`);
    }
  };

  const handleUpdateMember = async (memberId: string, updates: any) => {
    if (!group) return;
    await api.updateGroupMember(group.id, memberId, updates);
    await loadData();
    Alert.alert('Member Updated', 'Member profile details updated successfully.');
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!group) return;
    const result = await api.removeGroupMember(group.id, memberId);
    await loadData();
    Alert.alert(result.archived ? 'Member Archived' : 'Member Removed', result.message);
  };

  const handleDeleteGroup = async () => {
    if (!group) return;
    setActionLoading(true);
    try {
      await api.deleteGroup(group.id);
      setDeleteConfirmVisible(false);
      setGroupMenuVisible(false);
      Alert.alert('Group Deleted', `"${group.name}" and all its records have been permanently removed.`);
      router.replace('/(tabs)/groups' as any);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to delete group.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearBills = async () => {
    if (!group) return;
    setActionLoading(true);
    try {
      await api.clearGroupExpenses(group.id);
      setClearBillsConfirmVisible(false);
      setGroupMenuVisible(false);
      await loadData();
      Alert.alert(
        'Bills & Expenses Cleared',
        `All financial records and receipts have been cleared for "${group.name}". Balances have been reset to ₹0.00.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to clear bills.');
    } finally {
      setActionLoading(false);
    }
  };


  if (loading && !refreshing) {
    return <Loading fullScreen message="Loading group details..." />;
  }

  if (!group) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="alert-circle-outline"
          title="Group Not Found"
          description="This group does not exist or has been removed."
          actionTitle="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  // Budget calculations
  const hasBudget = group.budgetPaise && group.budgetPaise > 0;
  const budgetRatio = hasBudget ? (group.totalSpentPaise || 0) / group.budgetPaise : 0;
  const budgetPercent = Math.min(Math.round(budgetRatio * 100), 100);
  const isBudgetWarning = budgetPercent >= 80;
  const isBudgetExceeded = budgetPercent >= 100;

  const members = group.members || [];
  const displayMembers = detailedMembers.length > 0 ? detailedMembers : members;
  const currentUserMember = detailedMembers.find((m) => m.userId === user?.id);
  const myNetBalance = currentUserMember ? currentUserMember.netBalancePaise : (group.myNetBalancePaise || 0);


  const docCategories = ['ALL', 'FOOD', 'HOTEL', 'TRANSPORT', 'TICKETS', 'SHOPPING', 'UTILITIES', 'OTHER'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {group.name}
        </Text>
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={() => setExportModalVisible(true)}
            style={[styles.headerBtn, { marginRight: 4 }]}
            accessibilityLabel="Export to Excel"
          >
            <MaterialCommunityIcons name="file-excel" size={22} color="#107C41" />
          </TouchableOpacity>
          <TouchableOpacity onPress={copyInviteCode} style={[styles.headerBtn, { marginRight: 4 }]} accessibilityLabel="Share Invite Code">
            <Feather name="share-2" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setGroupMenuVisible(true)}
            style={styles.headerBtn}
            accessibilityLabel="Group Options"
          >
            <Feather name="more-vertical" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>


      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Group Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>{group.name}</Text>
              {group.description && (
                <Text style={[styles.heroDesc, { color: colors.textMuted }]}>{group.description}</Text>
              )}
            </View>
            <Badge label={group.type} variant="primary" />
          </View>

          {/* Stats Bar */}
          <View style={[styles.statsBar, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.statCol}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Spent</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(group.totalSpentPaise || 0, group.currency)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
            <View style={[styles.statCol, { alignItems: 'flex-end' }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Your Balance</Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      myNetBalance > 0
                        ? colors.positive
                        : myNetBalance < 0
                        ? colors.negative
                        : colors.textMuted,
                  },
                ]}
              >
                {myNetBalance === 0
                  ? 'Settled up ✔'
                  : (myNetBalance > 0 ? '+' : '') + formatCurrency(Math.abs(myNetBalance), group.currency, { showSign: true })}
              </Text>
            </View>
          </View>

          {/* Budget Progress Bar */}
          {hasBudget && (
            <View style={styles.budgetBox}>
              <View style={styles.budgetRow}>
                <Text style={[styles.budgetSpent, { color: colors.textMuted }]}>
                  Budget Target: {formatCurrency(group.budgetPaise, group.currency)}
                </Text>
                <Text
                  style={[
                    styles.budgetPercent,
                    { color: isBudgetExceeded ? colors.negative : isBudgetWarning ? colors.warning : colors.primary },
                  ]}
                >
                  {isBudgetExceeded ? 'Exceeded!' : `${budgetPercent}% used`}
                </Text>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceAlt }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${budgetPercent}%`,
                      backgroundColor: isBudgetExceeded
                        ? colors.negative
                        : isBudgetWarning
                        ? colors.warning
                        : colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Quick Actions 2x2 Grid */}
          <View style={styles.quickActionsGrid}>
            {/* Row 1 */}
            <View style={styles.quickActionsRow}>
              {/* Add Expense — Primary purple */}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => router.push(`/add-expense?groupId=${group.id}` as any)}
                style={[styles.quickActionCard, { backgroundColor: colors.primary }]}
                accessibilityLabel="Add Expense"
              >
                <View style={[styles.quickActionIconBox, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                  <Feather name="plus" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.quickActionLabelPrimary}>Add Expense</Text>
              </TouchableOpacity>

              {/* Add Member — Neutral elegant */}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => setAddMemberModalVisible(true)}
                style={[
                  styles.quickActionCard,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 },
                ]}
                accessibilityLabel="Add Member"
              >
                <View style={[styles.quickActionIconBox, { backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : colors.primaryMuted }]}>
                  <Feather name="user-plus" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.quickActionLabelNeutral, { color: colors.text }]}>Add Member</Text>
              </TouchableOpacity>
            </View>

            {/* Row 2 */}
            <View style={styles.quickActionsRow}>
              {/* Excel Export — Green accent */}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => setExportModalVisible(true)}
                style={[
                  styles.quickActionCard,
                  { backgroundColor: isDark ? 'rgba(16,124,65,0.18)' : '#F0FDF4', borderColor: isDark ? '#166534' : '#86EFAC', borderWidth: 1 },
                ]}
                accessibilityLabel="Export to Excel"
              >
                <View style={[styles.quickActionIconBox, { backgroundColor: isDark ? 'rgba(16,124,65,0.28)' : '#DCFCE7' }]}>
                  <MaterialCommunityIcons name="file-excel" size={20} color="#107C41" />
                </View>
                <Text style={[styles.quickActionLabelNeutral, { color: '#107C41' }]}>Excel Export</Text>
              </TouchableOpacity>

              {/* Upload Bill — Secondary purple */}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => setAddDocModalVisible(true)}
                style={[
                  styles.quickActionCard,
                  { backgroundColor: isDark ? 'rgba(124,58,237,0.12)' : '#F5F3FF', borderColor: isDark ? '#4C1D95' : '#DDD6FE', borderWidth: 1 },
                ]}
                accessibilityLabel="Upload Bill"
              >
                <View style={[styles.quickActionIconBox, { backgroundColor: isDark ? 'rgba(124,58,237,0.22)' : '#EDE9FE' }]}>
                  <Feather name="upload" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.quickActionLabelNeutral, { color: colors.primary }]}>Upload Bill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 6 Tabs Navigation Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {(['OVERVIEW', 'EXPENSES', 'DOCUMENTS', 'BALANCES', 'MEMBERS', 'ACTIVITY'] as TabOption[]).map(
            (tab) => {
              const active = activeTab === tab;
              const docCountBadge = tab === 'DOCUMENTS' && documents.length > 0;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    styles.tabButton,
                    {
                      borderBottomColor: active ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: active ? colors.primary : colors.textMuted,
                        fontWeight: active ? '700' : '600',
                      },
                    ]}
                  >
                    {tab === 'OVERVIEW'
                      ? 'Overview'
                      : tab === 'EXPENSES'
                      ? `Expenses (${expenses.length})`
                      : tab === 'DOCUMENTS'
                      ? `Bills (${documents.length})`
                      : tab === 'BALANCES'
                      ? 'Balances'
                      : tab === 'MEMBERS'
                      ? `Members (${members.length})`
                      : 'Activity'}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>

        {/* --- TAB 1: OVERVIEW --- */}
        {activeTab === 'OVERVIEW' && (
          <View style={styles.tabContent}>
            {/* Recent Expenses Preview */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Expenses</Text>
              <TouchableOpacity onPress={() => setActiveTab('EXPENSES')}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>View All ({expenses.length})</Text>
              </TouchableOpacity>
            </View>

            {expenses.length === 0 ? (
              <EmptyState
                icon="receipt"
                title="No Expenses Yet"
                description="Tap 'Add Expense' to record your first shared expense."
              />
            ) : (
              <View style={[styles.cardList, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                {expenses.slice(0, 3).map((exp) => (
                  <ExpenseItem key={exp.id} expense={exp} />
                ))}
              </View>
            )}

            {/* Recent Bills & Documents Preview */}
            <View style={[styles.sectionHeaderRow, { marginTop: Spacing.lg }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Group Bills & Receipts</Text>
              <TouchableOpacity onPress={() => setActiveTab('DOCUMENTS')}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>View All ({documents.length})</Text>
              </TouchableOpacity>
            </View>

            {documents.length === 0 ? (
              <EmptyState
                icon="file-document-outline"
                title="No Bills Saved"
                description="Attach restaurant receipts, hotel vouchers, or invoices for this group."
                actionTitle="Upload First Bill"
                onAction={() => setAddDocModalVisible(true)}
              />
            ) : (
              documents.slice(0, 2).map((doc) => (
                <DocumentItem key={doc.id} document={doc} onPress={() => setSelectedDoc(doc)} />
              ))
            )}

            {/* Quick Balances Preview */}
            <View style={[styles.sectionHeaderRow, { marginTop: Spacing.lg }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Member Net Status</Text>
              <TouchableOpacity onPress={() => setActiveTab('BALANCES')}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Settle Up</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.cardList, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              {members.map((m: any, idx: number) => (
                <View
                  key={m.userId || m.id || idx}
                  style={[
                    styles.memberRow,
                    idx < members.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                  ]}
                >
                  <Avatar name={m.name} url={m.avatarUrl} size="sm" />
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>{m.name}</Text>
                    <Text style={[styles.memberRole, { color: colors.textMuted }]}>{m.role}</Text>
                  </View>
                  {m.upiId && (
                    <View style={[styles.upiPill, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={[styles.upiPillText, { color: colors.textMuted }]}>{m.upiId}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Group Settings & Financial Actions (Danger Zone) */}
            <View style={[styles.sectionHeaderRow, { marginTop: Spacing.xl }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Group Management</Text>
            </View>

            <View
              style={[
                styles.managementCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                },
              ]}
            >
              {/* Action 1: Clear Bills & Expenses */}
              <View style={styles.managementActionRow}>
                <View
                  style={[
                    styles.managementIconCircle,
                    { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7' },
                  ]}
                >
                  <Feather name="refresh-cw" size={18} color="#D97706" />
                </View>
                <View style={styles.managementInfo}>
                  <Text style={[styles.managementTitle, { color: colors.text }]}>
                    Clear Bills & Expenses
                  </Text>
                  <Text style={[styles.managementDesc, { color: colors.textMuted }]}>
                    Clear all expenses, bills, and settlements, resetting balances to ₹0.00. Preserves the group, members, and settings.
                  </Text>
                </View>
                <Button
                  title="Clear Bills"
                  variant="outline"
                  size="sm"
                  onPress={() => setClearBillsConfirmVisible(true)}
                  style={{ alignSelf: 'center' }}
                />
              </View>

              <View style={[styles.managementDivider, { backgroundColor: colors.borderLight }]} />

              {/* Action 2: Delete Group */}
              <View style={styles.managementActionRow}>
                <View
                  style={[
                    styles.managementIconCircle,
                    { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' },
                  ]}
                >
                  <Feather name="trash-2" size={18} color={colors.negative} />
                </View>
                <View style={styles.managementInfo}>
                  <Text style={[styles.managementTitle, { color: colors.negative }]}>
                    Delete Group
                  </Text>
                  <Text style={[styles.managementDesc, { color: colors.textMuted }]}>
                    Permanently delete this group and all its expenses, split allocations, settlements, receipts, and group members.
                  </Text>
                </View>
                <Button
                  title="Delete Group"
                  variant="danger"
                  size="sm"
                  onPress={() => setDeleteConfirmVisible(true)}
                  style={{ alignSelf: 'center' }}
                />
              </View>
            </View>
          </View>
        )}


        {/* --- TAB 2: EXPENSES --- */}
        {activeTab === 'EXPENSES' && (
          <View style={styles.tabContent}>
            <View style={styles.tabHeaderActionRow}>
              <Text style={[styles.tabSubheading, { color: colors.textMuted }]}>
                {expenses.length} shared expense{expenses.length === 1 ? '' : 's'} recorded
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                <Button
                  title="Excel"
                  size="sm"
                  variant="outline"
                  leftIcon={<MaterialCommunityIcons name="file-excel" size={14} color="#107C41" />}
                  onPress={() => setExportModalVisible(true)}
                />
                <Button
                  title="Add Expense"
                  size="sm"
                  leftIcon={<Feather name="plus" size={14} color="#FFFFFF" />}
                  onPress={() => router.push(`/add-expense?groupId=${group.id}` as any)}
                />
              </View>
            </View>

            {expenses.length === 0 ? (
              <EmptyState
                icon="receipt"
                title="No Expenses In This Group"
                description="Split bills with friends, flatmates, or travel companions."
                actionTitle="Add First Expense"
                onAction={() => router.push(`/add-expense?groupId=${group.id}` as any)}
              />
            ) : (
              <View style={[styles.cardList, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                {expenses.map((exp) => (
                  <ExpenseItem key={exp.id} expense={exp} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* --- TAB 3: DOCUMENTS / BILLS (GROUP SPECIFIC) --- */}
        {activeTab === 'DOCUMENTS' && (
          <View style={styles.tabContent}>
            {/* Search and Category Filter */}
            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Feather name="search" size={18} color={colors.textSubtle} />
              <TextInput
                value={docSearchQuery}
                onChangeText={setDocSearchQuery}
                placeholder="Search bills, receipts, tickets..."
                placeholderTextColor={colors.textSubtle}
                style={[styles.searchInput, { color: colors.text }]}
              />
              {docSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setDocSearchQuery('')}>
                  <Feather name="x" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {docCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setDocCategoryFilter(cat)}
                  style={[
                    styles.catFilterChip,
                    {
                      backgroundColor: docCategoryFilter === cat ? colors.primary : colors.surface,
                      borderColor: docCategoryFilter === cat ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.catFilterText,
                      { color: docCategoryFilter === cat ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.tabHeaderActionRow}>
              <Text style={[styles.tabSubheading, { color: colors.textMuted }]}>
                Group Repository • {documents.length} Document{documents.length === 1 ? '' : 's'}
              </Text>
              <Button
                title="Add Bill"
                size="sm"
                leftIcon={<Feather name="upload" size={14} color="#FFFFFF" />}
                onPress={() => setAddDocModalVisible(true)}
              />
            </View>

            {documents.length === 0 ? (
              <EmptyState
                icon="file-document-outline"
                title="No Documents Found"
                description={
                  docSearchQuery || docCategoryFilter !== 'ALL'
                    ? 'No bills match your active filter.'
                    : 'Every group stores its own independent hotel vouchers, cafe receipts, and invoices.'
                }
                actionTitle="Upload Document"
                onAction={() => setAddDocModalVisible(true)}
              />
            ) : (
              documents.map((doc) => (
                <DocumentItem key={doc.id} document={doc} onPress={() => setSelectedDoc(doc)} />
              ))
            )}
          </View>
        )}

        {/* --- TAB 4: BALANCES & SETTLEMENTS --- */}
        {activeTab === 'BALANCES' && (
          <View style={styles.tabContent}>
            <View style={styles.tabHeaderActionRow}>
              <Text style={[styles.tabSubheading, { color: colors.textMuted }]}>
                {debtTransfers.length === 0
                  ? 'Zero-sum reconciled • All settled up'
                  : `${debtTransfers.length} pending transfer${debtTransfers.length === 1 ? '' : 's'} to settle`}
              </Text>
              <Button
                title="Excel Report"
                size="sm"
                variant="outline"
                leftIcon={<MaterialCommunityIcons name="file-excel" size={14} color="#107C41" />}
                onPress={() => setExportModalVisible(true)}
              />
            </View>

            {detailedMembers.length < 2 ? (
              <EmptyState icon="account-multiple" title="Need More Members" description="Add members to calculate debt transfers." />
            ) : debtTransfers.length === 0 ? (
              <View style={[styles.allSettledCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <View style={[styles.allSettledIconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' }]}>
                  <Ionicons name="checkmark-circle" size={42} color={colors.positive} />
                </View>
                <Text style={[styles.allSettledTitle, { color: colors.text }]}>All Settled Up!</Text>
                <Text style={[styles.allSettledDesc, { color: colors.textMuted }]}>
                  All shared expenses have been reconciled and there are zero outstanding debts in this group.
                </Text>
              </View>
            ) : (
              <View style={[styles.cardList, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                {debtTransfers.map((t, idx) => {
                  const fromMember = detailedMembers.find((m) => m.userId === t.fromUserId);
                  const toMember = detailedMembers.find((m) => m.userId === t.toUserId);
                  const isDebtor = t.fromUserId === user?.id;
                  const isCreditor = t.toUserId === user?.id;

                  const debtorName = isDebtor ? 'You' : fromMember?.name || 'Member';
                  const creditorName = isCreditor ? 'You' : toMember?.name || 'Member';

                  return (
                    <View
                      key={`transfer-${t.fromUserId}-${t.toUserId}-${idx}`}
                      style={[
                        styles.settlementRow,
                        idx < debtTransfers.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                      ]}
                    >
                      <View style={styles.settlementAvatars}>
                        <Avatar name={fromMember?.name || 'Debtor'} size="sm" />
                        <Feather name="arrow-right" size={14} color={colors.textTertiary} style={{ marginHorizontal: 4 }} />
                        <Avatar name={toMember?.name || 'Creditor'} size="sm" />
                      </View>
                      <View style={styles.settlementInfo}>
                        <Text style={[styles.settlementName, { color: colors.text }]}>
                          <Text style={{ fontWeight: '700' }}>{debtorName}</Text> owes{' '}
                          <Text style={{ fontWeight: '700' }}>{creditorName}</Text>
                        </Text>
                        <Text
                          style={[
                            styles.settlementAmount,
                            { color: isCreditor ? colors.positive : isDebtor ? colors.negative : colors.text },
                          ]}
                        >
                          {formatCurrency(t.amount, group.currency)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            const msg = buildSettlementReminderMessage({
                              recipientName: fromMember?.name,
                              groupName: group.name,
                              debtorName,
                              creditorName,
                              amountPaise: t.amount,
                              currency: group.currency,
                            });
                            setWhatsappTarget({
                              recipientName: fromMember?.name || 'Member',
                              memberUserId: fromMember?.userId,
                              phoneNumber: fromMember?.phone || '',
                              message: msg,
                            });
                            setWhatsappModalVisible(true);
                          }}
                          style={styles.transferWhatsAppBtn}
                          accessibilityLabel="WhatsApp Reminder"
                        >
                          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                        </TouchableOpacity>

                        <Button
                          title="Settle"
                          size="sm"
                          variant={isDebtor ? 'primary' : 'outline'}
                          onPress={() => {
                            setSelectedTransfer({
                              fromId: t.fromUserId,
                              fromName: fromMember?.name || 'Member',
                              toId: t.toUserId,
                              toName: toMember?.name || 'Member',
                              amountPaise: t.amount,
                            });
                            setSettleModalVisible(true);
                          }}
                        />
                      </View>
                    </View>

                  );
                })}
              </View>
            )}

            {/* Settlement History List */}
            {settlements && settlements.length > 0 && (
              <View style={{ marginTop: Spacing.lg }}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Settlement History</Text>
                <View style={[styles.cardList, { backgroundColor: colors.surface, borderColor: colors.borderLight, marginTop: Spacing.xs }]}>
                  {settlements.map((s: any, sIdx: number) => (
                    <View
                      key={s.id || sIdx}
                      style={[
                        styles.settlementHistoryRow,
                        sIdx < settlements.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                      ]}
                    >
                      <View style={[styles.historyIconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' }]}>
                        <Feather name="check" size={14} color={colors.positive} />
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                        <Text style={[styles.historyTitle, { color: colors.text }]}>
                          {s.payer_name || 'Member'} paid {s.payee_name || 'Member'}
                        </Text>
                        <Text style={[styles.historySub, { color: colors.textMuted }]}>
                          {s.confirmed_at || s.created_at ? new Date(s.confirmed_at || s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Confirmed'}
                        </Text>
                      </View>
                      <Text style={[styles.historyAmount, { color: colors.positive }]}>
                        {formatCurrency(s.amount_paise, s.currency || group.currency)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* --- TAB 5: MEMBERS (MANUAL MANAGEMENT) --- */}
        {activeTab === 'MEMBERS' && (
          <View style={styles.tabContent}>
            <View style={styles.tabHeaderActionRow}>
              <Text style={[styles.tabSubheading, { color: colors.textMuted }]}>
                {displayMembers.length} member{displayMembers.length === 1 ? '' : 's'} ({displayMembers.filter((m: any) => m.isActive !== false).length} active)
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                <Button
                  title="Excel"
                  size="sm"
                  variant="outline"
                  leftIcon={<MaterialCommunityIcons name="file-excel" size={14} color="#107C41" />}
                  onPress={() => setExportModalVisible(true)}
                />
                <Button
                  title="Add Member"
                  size="sm"
                  variant="primary"
                  leftIcon={<Feather name="user-plus" size={14} color="#FFFFFF" />}
                  onPress={() => setAddMemberModalVisible(true)}
                />
              </View>
            </View>

            {displayMembers.length === 0 ? (
              <EmptyState
                icon="account-group"
                title="No Members in Group"
                description="Add members by name directly without invitation codes or email signups."
                actionTitle="Add First Member"
                onAction={() => setAddMemberModalVisible(true)}
              />
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {displayMembers.map((m: any, idx: number) => {
                  const isNetPos = (m.netBalancePaise || 0) > 0;
                  const isNetNeg = (m.netBalancePaise || 0) < 0;

                  return (
                    <TouchableOpacity
                      key={m.userId || m.id || idx}
                      activeOpacity={0.8}
                      onPress={() => setEditingMember(m)}
                      style={[
                        styles.memberCardEnriched,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.borderLight,
                          opacity: m.isActive === false ? 0.75 : 1,
                        },
                      ]}
                    >
                      <View style={styles.memberCardTop}>
                        <View
                          style={[
                            styles.avatarInitialsCircle,
                            { backgroundColor: m.avatarColor || '#4F46E5' },
                          ]}
                        >
                          <Text style={styles.avatarInitialsText}>
                            {(m.name ? m.name.substring(0, 2) : 'M').toUpperCase()}
                          </Text>
                        </View>

                        <View style={styles.memberCardDetails}>
                          <View style={styles.memberNameRoleRow}>
                            <Text style={[styles.memberName, { color: colors.text }]}>{m.name}</Text>
                            {m.nickname && (
                              <View style={[styles.nicknameChip, { backgroundColor: colors.surfaceAlt }]}>
                                <Text style={[styles.nicknameText, { color: colors.textMuted }]}>
                                  "{m.nickname}"
                                </Text>
                              </View>
                            )}
                            <View
                              style={[
                                styles.roleBadge,
                                {
                                  backgroundColor:
                                    m.role === 'ADMIN' ? colors.primaryLight : colors.surfaceAlt,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.roleBadgeText,
                                  { color: m.role === 'ADMIN' ? colors.primary : colors.textMuted },
                                ]}
                              >
                                {m.role}
                              </Text>
                            </View>
                            {m.isActive === false && (
                              <View style={[styles.archivedBadge, { backgroundColor: colors.surfaceAlt }]}>
                                <Text style={[styles.archivedBadgeText, { color: colors.textMuted }]}>
                                  Archived
                                </Text>
                              </View>
                            )}
                          </View>

                          {(m.phone || m.email) && (
                            <Text style={[styles.memberContactText, { color: colors.textMuted }]}>
                              {m.phone ? `📞 ${m.phone}` : ''}{' '}
                              {m.email && !m.email.includes('@tripmate.local') ? `✉️ ${m.email}` : ''}
                            </Text>
                          )}
                        </View>

                        <View
                          style={[styles.editMemberBtn, { backgroundColor: colors.surfaceAlt }]}
                        >
                          <Feather name="chevron-right" size={16} color={colors.textMuted} />
                        </View>
                      </View>

                      {/* Financial Metrics Strip */}
                      <View style={[styles.memberFinancialStrip, { backgroundColor: colors.surfaceAlt }]}>
                        <View style={styles.memberFinItem}>
                          <Text style={[styles.memberFinLabel, { color: colors.textMuted }]}>Paid</Text>
                          <Text style={[styles.memberFinValue, { color: colors.text }]}>
                            {formatCurrency(m.totalPaidPaise || 0, group.currency)}
                          </Text>
                        </View>
                        <View style={styles.memberFinDivider} />
                        <View style={styles.memberFinItem}>
                          <Text style={[styles.memberFinLabel, { color: colors.textMuted }]}>Share</Text>
                          <Text style={[styles.memberFinValue, { color: colors.text }]}>
                            {formatCurrency(m.totalSharePaise || 0, group.currency)}
                          </Text>
                        </View>
                        <View style={styles.memberFinDivider} />
                        <View style={styles.memberFinItem}>
                          <Text style={[styles.memberFinLabel, { color: colors.textMuted }]}>Net Balance</Text>
                          <Text
                            style={[
                              styles.memberFinValue,
                              {
                                color: isNetPos
                                  ? colors.positive
                                  : isNetNeg
                                  ? colors.negative
                                  : colors.textMuted,
                              },
                            ]}
                          >
                            {isNetPos ? '+' : ''}
                            {formatCurrency(m.netBalancePaise || 0, group.currency)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* --- TAB 6: ACTIVITY --- */}
        {activeTab === 'ACTIVITY' && (
          <View style={styles.tabContent}>
            <Text style={[styles.tabSubheading, { color: colors.textMuted, marginBottom: Spacing.sm }]}>
              Audit history & verified events
            </Text>

            {activities.length === 0 ? (
              <EmptyState
                icon="history"
                title="No Activities Yet"
                description="Events like expense creation, settlements, and receipt uploads are logged here."
              />
            ) : (
              <View style={[styles.cardList, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                {activities.map((act, idx) => (
                  <View
                    key={act.id || idx}
                    style={[
                      styles.activityRow,
                      idx < activities.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                    ]}
                  >
                    <View style={[styles.activityDot, { backgroundColor: colors.primary }]} />
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityMsg, { color: colors.text }]}>{act.message}</Text>
                      <Text style={[styles.activityTime, { color: colors.textMuted }]}>
                        {new Date(act.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Document Modal */}
      <AddDocumentModal
        visible={addDocModalVisible}
        groupId={group.id}
        groupExpenses={expenses.map((e) => ({ id: e.id, title: e.title, amountPaise: e.amountPaise }))}
        onClose={() => setAddDocModalVisible(false)}
        onSave={handleCreateDocument}
      />

      {/* Document Viewer & Editor Modal */}
      {selectedDoc && (
        <DocumentViewerModal
          visible={!!selectedDoc}
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDelete={handleDeleteDocument}
          onUpdate={handleUpdateDocument}
          onNavigateToExpense={(expenseId) => router.push(`/expenses/${expenseId}` as any)}
        />
      )}

      {/* Settlement Confirmation Dialog */}
      {selectedTransfer && (
        <ConfirmationDialog
          visible={settleModalVisible}
          title="Record Settlement"
          message={`Confirm recording a settlement of ${formatCurrency(
            selectedTransfer.amountPaise,
            group.currency
          )} from ${selectedTransfer.fromName} to ${selectedTransfer.toName}?`}
          confirmText="Confirm & Settle"
          onConfirm={handleConfirmSettlement}
          onCancel={() => {
            setSettleModalVisible(false);
            setSelectedTransfer(null);
          }}
        />
      )}

      {/* Add Member Modal */}
      <AddMemberModal
        visible={addMemberModalVisible}
        groupId={group.id}
        groupName={group.name}
        onClose={() => setAddMemberModalVisible(false)}
        onMemberAdded={handleAddMember}
      />

      {/* Edit Member Modal */}
      <EditMemberModal
        visible={!!editingMember}
        member={editingMember}
        currency={group.currency}
        onClose={() => setEditingMember(null)}
        onUpdate={handleUpdateMember}
        onRemove={handleRemoveMember}
      />

      {/* Advanced Excel Export Modal */}
      <ExportExcelModal
        visible={exportModalVisible}
        groupId={group.id}
        groupName={group.name}
        groupCurrency={group.currency}
        members={displayMembers.map((m: any) => ({ userId: m.userId || m.id, name: m.name }))}
        onClose={() => setExportModalVisible(false)}
      />

      {/* Delete Group Confirmation Dialog */}
      <ConfirmationDialog
        visible={deleteConfirmVisible}
        title="Delete Group Permanently?"
        message={`Are you sure you want to delete "${group.name}"?\n\nThis will permanently remove all expenses, bills, split allocations, settlements, receipt documents, and membership records for this group.\n\nThis action cannot be undone.`}
        confirmText="Delete Group"
        isDestructive
        loading={actionLoading}
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeleteConfirmVisible(false)}
      />

      {/* Clear Bills & Expenses Confirmation Dialog */}
      <ConfirmationDialog
        visible={clearBillsConfirmVisible}
        title="Clear All Bills & Expenses?"
        message={`Are you sure you want to clear all bills and expenses for "${group.name}"?\n\nThis will remove all expense records, split allocations, settlements, and receipt attachments, resetting balances to ₹0.00.\n\nThe group, its members, and settings will remain completely intact.`}
        confirmText="Clear All Bills"
        isDestructive
        loading={actionLoading}
        onConfirm={handleClearBills}
        onCancel={() => setClearBillsConfirmVisible(false)}
      />

      {/* Group Options Sheet / Modal */}
      <Modal
        visible={groupMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGroupMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setGroupMenuVisible(false)}>
          <View style={styles.menuBackdrop}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.menuSheet,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <View style={[styles.menuHeader, { borderBottomColor: colors.borderLight }]}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>Group Actions</Text>
                  <TouchableOpacity onPress={() => setGroupMenuVisible(false)}>
                    <Feather name="x" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setGroupMenuVisible(false);
                    setExportModalVisible(true);
                  }}
                >
                  <MaterialCommunityIcons name="file-excel" size={20} color="#107C41" style={{ marginRight: 12 }} />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>Export 10-Sheet Excel (.xlsx)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setGroupMenuVisible(false);
                    copyInviteCode();
                  }}
                >
                  <Feather name="share-2" size={18} color={colors.primary} style={{ marginRight: 12 }} />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>Share Group Invite Code</Text>
                </TouchableOpacity>

                <View style={[styles.menuDivider, { backgroundColor: colors.borderLight }]} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setGroupMenuVisible(false);
                    setClearBillsConfirmVisible(true);
                  }}
                >
                  <Feather name="refresh-cw" size={18} color="#D97706" style={{ marginRight: 12 }} />
                  <Text style={[styles.menuItemText, { color: '#D97706', fontWeight: '600' }]}>
                    Clear Bills & Expenses
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setGroupMenuVisible(false);
                    setDeleteConfirmVisible(true);
                  }}
                >
                  <Feather name="trash-2" size={18} color={colors.negative} style={{ marginRight: 12 }} />
                  <Text style={[styles.menuItemText, { color: colors.negative, fontWeight: '700' }]}>
                    Delete Group Permanently
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* WhatsApp Settlement Reminder Modal */}
      {whatsappTarget && (
        <WhatsAppReminderModal
          visible={whatsappModalVisible}
          title="WhatsApp Settlement Reminder"
          recipientName={whatsappTarget.recipientName}
          initialPhoneNumber={whatsappTarget.phoneNumber}
          defaultMessage={whatsappTarget.message}
          onClose={() => {
            setWhatsappModalVisible(false);
            setWhatsappTarget(null);
          }}
          onSavePhoneNumber={async (newPhone) => {
            if (whatsappTarget.memberUserId) {
              await api.updateGroupMember(group.id, whatsappTarget.memberUserId, { phone: newPhone });
              await loadData();
            }
          }}
        />
      )}
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    ...Typography.h2,
    fontSize: 18,
    flex: 1,
    marginHorizontal: Spacing.md,
    textAlign: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  heroCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 0.5,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    ...Typography.h1,
    fontSize: 22,
  },
  heroDesc: {
    ...Typography.caption,
    marginTop: 2,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  statDivider: {
    width: 1,
    height: 32,
    marginHorizontal: Spacing.md,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    ...Typography.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    ...Typography.bodyBold,
    fontSize: 16,
    marginTop: 2,
  },
  budgetBox: {
    marginBottom: Spacing.md,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  budgetSpent: {
    ...Typography.caption,
    fontSize: 11,
  },
  budgetPercent: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  quickActionsGrid: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.lg,
    minHeight: 82,
    gap: 6,
  },
  quickActionIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabelPrimary: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  quickActionLabelNeutral: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  tabScroll: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  tabButton: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 2,
    marginRight: Spacing.xs,
  },
  tabText: {
    ...Typography.bodyBold,
    fontSize: 13,
  },
  tabContent: {
    marginBottom: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    fontSize: 16,
  },
  seeAllText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  tabHeaderActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tabSubheading: {
    ...Typography.caption,
  },
  cardList: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    ...Shadows.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    ...Typography.body,
    fontSize: 13,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  catFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.xs + 2,
  },
  catFilterText: {
    ...Typography.tiny,
    fontWeight: '700',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
  },
  memberInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  memberName: {
    ...Typography.bodyBold,
    fontSize: 14,
  },
  memberRole: {
    ...Typography.caption,
    fontSize: 11,
  },
  upiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    alignSelf: 'flex-start',
  },
  upiPillText: {
    ...Typography.tiny,
    fontSize: 10,
    fontWeight: '600',
  },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  settlementInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  settlementName: {
    ...Typography.bodyBold,
    fontSize: 14,
  },
  settlementSub: {
    ...Typography.tiny,
    marginTop: 1,
  },
  settlementAmount: {
    ...Typography.bodyBold,
    fontSize: 14,
    marginTop: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm + 4,
    gap: Spacing.sm + 2,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  activityInfo: {
    flex: 1,
  },
  activityMsg: {
    ...Typography.body,
    fontSize: 13,
  },
  activityTime: {
    ...Typography.tiny,
    marginTop: 2,
  },
  memberCardEnriched: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  memberCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarInitialsCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: Typography.base,
  },
  memberCardDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  memberNameRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  nicknameChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  nicknameText: {
    fontSize: 10,
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  archivedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  archivedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  memberContactText: {
    fontSize: Typography.xs,
    marginTop: 4,
  },
  editMemberBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberFinancialStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  memberFinItem: {
    flex: 1,
    alignItems: 'center',
  },
  memberFinDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  memberFinLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  memberFinValue: {
    fontSize: Typography.xs,
    fontWeight: '700',
    marginTop: 2,
  },
  allSettledCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  allSettledIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  allSettledTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    marginBottom: 4,
  },
  allSettledDesc: {
    fontSize: Typography.xs,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  settlementAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settlementHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  historyIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  historySub: {
    fontSize: 10,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: Typography.xs,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: Typography.sm,
    fontWeight: '700',
    marginBottom: 6,
  },
  transferWhatsAppBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  managementCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  managementActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  managementIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  managementInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  managementTitle: {
    ...Typography.body,
    fontWeight: '700',
    marginBottom: 2,
  },
  managementDesc: {
    ...Typography.caption,
    fontSize: 11,
    lineHeight: 15,
  },
  managementDivider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  menuSheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  menuTitle: {
    ...Typography.h3,
    fontSize: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  menuItemText: {
    fontSize: 14,
  },
  menuDivider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
});

