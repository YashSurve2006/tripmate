import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../theme/tokens';
import { formatCurrency } from '../../utils/finance';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';

export interface GroupCardData {
  id: string;
  name: string;
  type: 'TRIP' | 'ROOMMATES' | 'OUTING' | 'EVENT' | 'OTHER';
  currency: string;
  totalSpentPaise: number;
  myNetBalancePaise: number;
  budgetPaise?: number | null;
  members: { userId?: string; id?: string; name: string; avatarUrl?: string | null }[];
  startDate?: string | null;
  endDate?: string | null;
  documentCount?: number;
}

interface GroupCardProps {
  group: GroupCardData;
  onPress: () => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, onPress }) => {
  const { colors, isDark } = useTheme();

  const isOwed = group.myNetBalancePaise > 0;
  const isOwes = group.myNetBalancePaise < 0;

  // Budget progress calculation
  const hasBudget = group.budgetPaise && group.budgetPaise > 0;
  const budgetRatio = hasBudget ? group.totalSpentPaise / group.budgetPaise! : 0;
  const budgetPercent = Math.min(Math.round(budgetRatio * 100), 100);
  const isBudgetWarning = budgetPercent >= 80;
  const isBudgetExceeded = budgetPercent >= 100;

  const getGroupIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (group.type) {
      case 'TRIP':
        return 'airplane-outline';
      case 'ROOMMATES':
        return 'home-outline';
      case 'OUTING':
        return 'restaurant-outline';
      case 'EVENT':
        return 'calendar-outline';
      default:
        return 'people-outline';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
        },
      ]}
    >
      {/* Header: Title and Type Badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.typeIconContainer, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name={getGroupIcon()} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
              {group.name}
            </Text>
            {group.startDate && (
              <Text style={[styles.dateText, { color: colors.textMuted }]}>
                {new Date(group.startDate).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                })}
                {group.endDate
                  ? ` - ${new Date(group.endDate).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                    })}`
                  : ''}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.headerRightBadges}>
          {(group.documentCount ?? 0) > 0 && (
            <View style={[styles.docCountBadge, { backgroundColor: colors.surfaceAlt }]}>
              <Feather name="file-text" size={11} color={colors.primary} />
              <Text style={[styles.docCountText, { color: colors.primary }]}>{group.documentCount}</Text>
            </View>
          )}
          <Badge label={group.type} variant="primary" size="sm" />
        </View>
      </View>

      {/* Budget Progress (if set) */}
      {hasBudget && (
        <View style={styles.budgetSection}>
          <View style={styles.budgetLabels}>
            <Text style={[styles.budgetLabelText, { color: colors.textMuted }]}>
              Spent {formatCurrency(group.totalSpentPaise, group.currency)}
            </Text>
            <Text
              style={[
                styles.budgetLimitText,
                { color: isBudgetExceeded ? colors.negative : isBudgetWarning ? colors.warning : colors.text },
              ]}
            >
              {isBudgetExceeded ? 'Exceeded' : `${budgetPercent}% of budget`}
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

      {/* Footer: Member avatars and Net balance */}
      <View style={styles.footerRow}>
        {/* Avatars stack */}
        <View style={styles.avatarsStack}>
          {(group.members || []).slice(0, 3).map((m: any, idx) => (
            <View
              key={m.userId || m.id || idx}
              style={[
                styles.stackedAvatar,
                {
                  marginLeft: idx > 0 ? -10 : 0,
                  borderColor: colors.surface,
                },
              ]}
            >
              <Avatar name={m.name} url={m.avatarUrl} size="sm" />
            </View>
          ))}
          {(group.members || []).length > 3 && (
            <View
              style={[
                styles.stackedAvatar,
                styles.moreAvatar,
                {
                  marginLeft: -10,
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.surface,
                },
              ]}
            >
              <Text style={[styles.moreAvatarText, { color: colors.textMuted }]}>
                +{(group.members || []).length - 3}
              </Text>
            </View>
          )}
        </View>

        {/* My Balance in this Group */}
        <View style={styles.balanceStatus}>
          <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
            {isOwed ? 'You are owed' : isOwes ? 'You owe' : 'Settled up'}
          </Text>
          <Text
            style={[
              styles.balanceAmount,
              {
                color: isOwed ? colors.positive : isOwes ? colors.negative : colors.textMuted,
              },
            ]}
          >
            {formatCurrency(Math.abs(group.myNetBalancePaise), group.currency)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  typeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: {
    ...Typography.bodyBold,
    fontSize: 16,
  },
  dateText: {
    ...Typography.tiny,
    marginTop: 1,
  },
  headerRightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  docCountText: {
    ...Typography.tiny,
    fontWeight: '700',
  },
  budgetSection: {
    marginVertical: Spacing.xs,
  },
  budgetLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  budgetLabelText: {
    ...Typography.caption,
    fontSize: 11,
  },
  budgetLimitText: {
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  avatarsStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatar: {
    borderWidth: 2,
    borderRadius: Radius.full,
  },
  moreAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreAvatarText: {
    ...Typography.tiny,
    fontWeight: '700',
  },
  balanceStatus: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    ...Typography.tiny,
    marginBottom: 1,
  },
  balanceAmount: {
    ...Typography.bodyBold,
    fontSize: 15,
  },
});
