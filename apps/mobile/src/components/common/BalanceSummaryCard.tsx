import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../theme/tokens';
import { formatCurrency } from '../../utils/finance';

interface BalanceSummaryCardProps {
  totalSpentPaise: number;
  youAreOwedPaise: number;
  youOwePaise: number;
  currency?: string;
  rangeLabel?: string;
}

export const BalanceSummaryCard: React.FC<BalanceSummaryCardProps> = ({
  totalSpentPaise,
  youAreOwedPaise,
  youOwePaise,
  currency = 'INR',
  rangeLabel = 'Total group spending',
}) => {
  const { colors, isDark } = useTheme();
  const netPaise = youAreOwedPaise - youOwePaise;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
        },
      ]}
    >
      {/* Top Banner: Net Status */}
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>TOTAL NET BALANCE</Text>
          <Text
            style={[
              styles.netAmount,
              {
                color:
                  netPaise > 0
                    ? colors.positive
                    : netPaise < 0
                    ? colors.negative
                    : colors.textMuted,
              },
            ]}
          >
            {formatCurrency(netPaise, currency, { showSign: true })}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            {
              backgroundColor:
                netPaise > 0
                  ? isDark
                    ? '#064E3B'
                    : '#D1FAE5'
                  : netPaise < 0
                  ? isDark
                    ? '#7F1D1D'
                    : '#FEE2E2'
                  : colors.surfaceAlt,
            },
          ]}
        >
          <Feather
            name={
              netPaise > 0
                ? 'arrow-up-right'
                : netPaise < 0
                ? 'arrow-down-left'
                : 'check'
            }
            size={14}
            color={
              netPaise > 0
                ? colors.positive
                : netPaise < 0
                ? colors.negative
                : colors.textMuted
            }
          />
          <Text
            style={[
              styles.badgeText,
              {
                color:
                  netPaise > 0
                    ? colors.positive
                    : netPaise < 0
                    ? colors.negative
                    : colors.textMuted,
              },
            ]}
          >
            {netPaise > 0
              ? 'You are owed'
              : netPaise < 0
              ? 'You owe'
              : 'Settled Up'}
          </Text>
        </View>
      </View>

      {/* Split Details Cards */}
      <View style={styles.detailsRow}>
        {/* You Are Owed (Teal/Emerald) */}
        <View
          style={[
            styles.detailBox,
            {
              backgroundColor: isDark ? '#062B21' : '#ECFDF5',
              borderColor: isDark ? '#065F46' : '#A7F3D0',
            },
          ]}
        >
          <View
            style={[
              styles.detailIconCircle,
              { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' },
            ]}
          >
            <MaterialCommunityIcons
              name="cash-plus"
              size={18}
              color={colors.positive}
            />
          </View>
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>YOU ARE OWED</Text>
          <Text style={[styles.detailAmount, { color: colors.positive }]}>
            {formatCurrency(youAreOwedPaise, currency)}
          </Text>
        </View>

        {/* You Owe (Coral/Orange) */}
        <View
          style={[
            styles.detailBox,
            {
              backgroundColor: isDark ? '#2E0C0C' : '#FFF1F2',
              borderColor: isDark ? '#991B1B' : '#FECDD3',
            },
          ]}
        >
          <View
            style={[
              styles.detailIconCircle,
              { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' },
            ]}
          >
            <MaterialCommunityIcons
              name="cash-minus"
              size={18}
              color={colors.negative}
            />
          </View>
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>YOU OWE</Text>
          <Text style={[styles.detailAmount, { color: colors.negative }]}>
            {formatCurrency(youOwePaise, currency)}
          </Text>
        </View>
      </View>

      {/* Footer Total Spending info */}
      <View style={[styles.footerRow, { borderTopColor: colors.borderLight }]}>
        <Feather name="pie-chart" size={13} color={colors.textMuted} />
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          {rangeLabel}:{' '}
          <Text style={[styles.footerTextBold, { color: colors.text }]}>
            {formatCurrency(totalSpentPaise, currency)}
          </Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  eyebrow: {
    ...Typography.tiny,
    marginBottom: 2,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  netAmount: {
    ...Typography.currencyHero,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    gap: 4,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  detailBox: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  detailIconCircle: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    ...Typography.tiny,
    marginBottom: 2,
    fontWeight: '700',
  },
  detailAmount: {
    ...Typography.h3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
  },
  footerText: {
    ...Typography.caption,
  },
  footerTextBold: {
    fontWeight: '700',
  },
});
