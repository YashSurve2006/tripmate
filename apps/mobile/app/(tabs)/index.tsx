import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BalanceSummaryCard } from '../../src/components/common/BalanceSummaryCard';
import { ExpenseItem, ExpenseItemData } from '../../src/components/common/ExpenseItem';
import { GroupCard, GroupCardData } from '../../src/components/common/GroupCard';
import { Avatar } from '../../src/components/ui/Avatar';
import { Badge } from '../../src/components/ui/Badge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Loading } from '../../src/components/ui/Loading';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';
import { useTheme } from '../../src/theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../src/theme/tokens';
import { formatCurrency } from '../../src/utils/finance';

type DateRange = 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('THIS_MONTH');
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [groups, setGroups] = useState<GroupCardData[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [stats, fetchedGroups] = await Promise.all([
        api.getDashboardStats(dateRange),
        api.getGroups(),
      ]);
      setDashboardStats(stats);
      setGroups(fetchedGroups);
    } catch (err) {
      console.warn('Failed to fetch home dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading && !refreshing) {
    return <Loading fullScreen message="Loading dynamic dashboard..." />;
  }

  const firstName = user?.name ? user.name.split(' ')[0] : 'Friend';
  const currentDateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const rangeLabels: Record<DateRange, string> = {
    THIS_WEEK: 'This Week',
    THIS_MONTH: 'This Month',
    LAST_MONTH: 'Last Month',
    ALL_TIME: 'All Time',
  };

  const categoryColors: Record<string, string> = {
    FOOD_AND_DRINK: '#F59E0B',
    TRANSPORT: '#0D9488',
    ACCOMMODATION: '#8B5CF6',
    ENTERTAINMENT: '#EC4899',
    SHOPPING: '#3B82F6',
    GROCERIES: '#10B981',
    UTILITIES: '#F97316',
    OTHER: '#64748B',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={styles.greetingCol}>
          <Text style={[styles.greetingSmall, { color: colors.textMuted }]}>{currentDateStr}</Text>
          <Text style={[styles.greetingName, { color: colors.text }]}>Welcome back, {firstName} 👋</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.connectionChip, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
            <View style={[styles.dot, { backgroundColor: colors.positive }]} />
            <Text style={[styles.chipText, { color: colors.positive }]}>SQLite Ready</Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatarButton}>
            <Avatar name={user?.name || 'User'} size="sm" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Date Range Selector */}
        <View style={styles.rangeSelectorRow}>
          {(['THIS_WEEK', 'THIS_MONTH', 'LAST_MONTH', 'ALL_TIME'] as DateRange[]).map((r) => {
            const active = dateRange === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setDateRange(r)}
                style={[
                  styles.rangeChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.borderLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rangeChipText,
                    { color: active ? '#FFFFFF' : colors.textMuted },
                  ]}
                >
                  {rangeLabels[r]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dynamic Balance Summary Card */}
        <BalanceSummaryCard
          totalSpentPaise={dashboardStats?.totalSpentPaise || 0}
          youAreOwedPaise={dashboardStats?.amountOwedPaise || 0}
          youOwePaise={dashboardStats?.amountOwesPaise || 0}
          currency="INR"
          rangeLabel={`Total spent (${rangeLabels[dateRange].toLowerCase()})`}
        />

        {/* Quick Actions Shortcuts */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/add-expense')}
            style={[styles.quickActionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <View style={styles.quickActionIconWhite}>
              <Feather name="plus" size={18} color={colors.primary} />
            </View>
            <Text style={styles.quickActionTextWhite}>Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/groups/new')}
            style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.primaryMuted }]}>
              <Feather name="users" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.quickActionText, { color: colors.text }]}>New Group</Text>
          </TouchableOpacity>
        </View>

        {/* Budget Warnings Alert */}
        {dashboardStats?.budgetWarnings && dashboardStats.budgetWarnings.length > 0 && (
          <View style={styles.budgetWarningSection}>
            {dashboardStats.budgetWarnings.map((w: any) => (
              <TouchableOpacity
                key={w.groupId}
                activeOpacity={0.8}
                onPress={() => router.push(`/groups/${w.groupId}` as any)}
                style={[
                  styles.warningCard,
                  {
                    backgroundColor: w.isExceeded ? '#FEF2F2' : '#FFFBEB',
                    borderColor: w.isExceeded ? '#FCA5A5' : '#FDE68A',
                  },
                ]}
              >
                <Feather
                  name={w.isExceeded ? 'alert-octagon' : 'alert-triangle'}
                  size={20}
                  color={w.isExceeded ? '#DC2626' : '#D97706'}
                />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text
                    style={[
                      styles.warningTitle,
                      { color: w.isExceeded ? '#991B1B' : '#92400E' },
                    ]}
                  >
                    {w.isExceeded ? 'Budget Exceeded!' : 'Budget Alert'}
                  </Text>
                  <Text
                    style={[
                      styles.warningSub,
                      { color: w.isExceeded ? '#B91C1C' : '#B45309' },
                    ]}
                  >
                    {w.groupName} has used {w.percentage}% of its target budget.
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={w.isExceeded ? '#DC2626' : '#D97706'} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming Trips Card */}
        {dashboardStats?.upcomingTrips && dashboardStats.upcomingTrips.length > 0 && (
          <View style={[styles.upcomingCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={styles.upcomingHeader}>
              <View style={[styles.calendarIcon, { backgroundColor: colors.primaryMuted }]}>
                <Ionicons name="airplane" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.upcomingTitle, { color: colors.text }]}>Upcoming Trip</Text>
            </View>
            {dashboardStats.upcomingTrips.slice(0, 1).map((t: any) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => router.push(`/groups/${t.id}` as any)}
                style={styles.tripRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tripName, { color: colors.text }]}>{t.name}</Text>
                  <Text style={[styles.tripDate, { color: colors.textMuted }]}>
                    Starts{' '}
                    {new Date(t.startDate).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Badge label="Explore" variant="primary" size="sm" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Top Spending Categories Breakdown */}
        {dashboardStats?.categoryBreakdown && dashboardStats.categoryBreakdown.length > 0 && (
          <View style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.categoryCardHeading, { color: colors.text }]}>Top Spending Categories</Text>
            {dashboardStats.categoryBreakdown.slice(0, 4).map((c: any) => {
              const catColor = categoryColors[c.category] || colors.primary;
              return (
                <View key={c.category} style={styles.categoryRow}>
                  <View style={styles.catLabelRow}>
                    <View style={[styles.catDot, { backgroundColor: catColor }]} />
                    <Text style={[styles.catName, { color: colors.text }]}>{c.category.replace(/_/g, ' ')}</Text>
                    <Text style={[styles.catPercent, { color: colors.textMuted }]}>{c.percentage}%</Text>
                  </View>
                  <Text style={[styles.catAmount, { color: colors.text }]}>
                    {formatCurrency(c.totalPaise, 'INR')}
                  </Text>
                  <View style={[styles.catTrack, { backgroundColor: colors.surfaceAlt }]}>
                    <View
                      style={[
                        styles.catBarFill,
                        {
                          width: `${Math.min(c.percentage, 100)}%`,
                          backgroundColor: catColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Active Groups Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Groups ({groups.length})</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/groups')}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>

        {groups.length === 0 ? (
          <EmptyState
            icon="account-group-outline"
            title="No Groups Yet"
            description="Create your first group for a trip, flatmates, or an outing."
            actionTitle="Create Group"
            onAction={() => router.push('/groups/new')}
          />
        ) : (
          groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onPress={() => router.push(`/groups/${group.id}` as any)}
            />
          ))
        )}

        {/* Recent Activity Section */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.md }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Expense Activity</Text>
        </View>

        {!dashboardStats?.recentExpenses || dashboardStats.recentExpenses.length === 0 ? (
          <EmptyState
            icon="receipt"
            title="No Expenses in this Range"
            description="Expenses recorded by you or your friends will show up here."
          />
        ) : (
          <View style={[styles.recentExpensesList, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            {dashboardStats.recentExpenses.map((exp: any) => (
              <ExpenseItem key={exp.id} expense={exp} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 54,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  greetingCol: {
    flex: 1,
  },
  greetingSmall: {
    ...Typography.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greetingName: {
    ...Typography.h2,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  connectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    ...Typography.tiny,
    fontWeight: '700',
  },
  avatarButton: {
    padding: 2,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  rangeSelectorRow: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
    marginBottom: Spacing.md,
  },
  rangeChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  rangeChipText: {
    ...Typography.tiny,
    fontWeight: '700',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickActionBtn: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Shadows.sm,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickActionIconWhite: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickActionText: {
    ...Typography.tiny,
    fontWeight: '700',
  },
  quickActionTextWhite: {
    ...Typography.tiny,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  budgetWarningSection: {
    marginBottom: Spacing.md,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  warningTitle: {
    ...Typography.bodyBold,
    fontSize: 13,
  },
  warningSub: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
  upcomingCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  calendarIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingTitle: {
    ...Typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripName: {
    ...Typography.bodyBold,
    fontSize: 15,
  },
  tripDate: {
    ...Typography.caption,
    marginTop: 2,
  },
  categoryCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  categoryCardHeading: {
    ...Typography.h3,
    fontSize: 15,
    marginBottom: Spacing.md,
  },
  categoryRow: {
    marginBottom: Spacing.sm + 2,
  },
  catLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catName: {
    ...Typography.caption,
    fontWeight: '600',
    flex: 1,
  },
  catPercent: {
    ...Typography.caption,
    fontSize: 11,
  },
  catAmount: {
    ...Typography.bodyBold,
    fontSize: 13,
    marginBottom: 4,
  },
  catTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  sectionHeader: {
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
  recentExpensesList: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    ...Shadows.sm,
  },
});
