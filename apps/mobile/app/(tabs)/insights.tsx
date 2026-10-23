import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ExportExcelModal } from '../../src/components/common/ExportExcelModal';
import { Button } from '../../src/components/ui/Button';
import { Loading } from '../../src/components/ui/Loading';
import { api } from '../../src/services/api';
import { useTheme } from '../../src/theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../src/theme/tokens';
import { formatCurrency } from '../../src/utils/finance';

interface CategoryBreakdown {
  category: string;
  label: string;
  amountPaise: number;
  percentage: number;
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const CATEGORY_MAP: Record<string, { label: string; color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  FOOD_AND_DRINK: { label: 'Food & Drinks', color: '#EA580C', icon: 'silverware-fork-knife' },
  TRANSPORT: { label: 'Transport & Travel', color: '#2563EB', icon: 'car-multiple' },
  ACCOMMODATION: { label: 'Stay & Hotels', color: '#7C3AED', icon: 'bed' },
  ENTERTAINMENT: { label: 'Entertainment & Fun', color: '#DB2777', icon: 'movie-open' },
  GROCERIES: { label: 'Groceries', color: '#16A34A', icon: 'cart-outline' },
  UTILITIES: { label: 'Bills & Utilities', color: '#D97706', icon: 'lightning-bolt' },
  OTHER: { label: 'Other Expenses', color: '#64748B', icon: 'tag-outline' },
};

export default function InsightsScreen() {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [totalSpentPaise, setTotalSpentPaise] = useState(0);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupForExport, setSelectedGroupForExport] = useState<any | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const [expenses, fetchedGroups] = await Promise.all([
          api.getExpenses(),
          api.getGroups(),
        ]);
        setGroups(fetchedGroups);
        let total = 0;
        const catTotals: Record<string, number> = {};

        for (const exp of expenses) {
          total += exp.amountPaise;
          catTotals[exp.category] = (catTotals[exp.category] || 0) + exp.amountPaise;
        }

        setTotalSpentPaise(total);

        const breakdown: CategoryBreakdown[] = Object.entries(catTotals).map(([catKey, amt]) => {
          const meta = CATEGORY_MAP[catKey] || CATEGORY_MAP.OTHER;
          return {
            category: catKey,
            label: meta.label,
            amountPaise: amt,
            percentage: total > 0 ? Math.round((amt / total) * 100) : 0,
            color: meta.color,
            icon: meta.icon,
          };
        });

        // Sort descending
        breakdown.sort((a, b) => b.amountPaise - a.amountPaise);
        setCategories(breakdown);
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, []);

  if (loading) {
    return <Loading fullScreen message="Crunching numbers..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Spending Analytics</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Where your shared money goes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Total Spend Hero Banner */}
        <View style={[styles.heroBanner, { backgroundColor: colors.primary }]}>
          <Text style={styles.heroEyebrow}>CUMULATIVE EXPENSES</Text>
          <Text style={styles.heroTotal}>{formatCurrency(totalSpentPaise, 'INR')}</Text>
          <View style={styles.heroSubRow}>
            <Feather name="trending-up" size={14} color="#FFFFFF" />
            <Text style={styles.heroSubText}>Tracked across all trips & flat groups</Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Breakdown By Category</Text>
        <View
          style={[
            styles.categoriesCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderLight,
            },
          ]}
        >
          {categories.length === 0 ? (
            <Text style={{ color: colors.textTertiary, textAlign: 'center', padding: Spacing.md }}>
              No expenses recorded yet.
            </Text>
          ) : (
            categories.map((c) => (
              <View key={c.category} style={styles.catRow}>
                <View style={[styles.catIconCircle, { backgroundColor: c.color + '20' }]}>
                  <MaterialCommunityIcons name={c.icon} size={18} color={c.color} />
                </View>

                <View style={styles.catContent}>
                  <View style={styles.catTopLine}>
                    <Text style={[styles.catLabel, { color: colors.text }]}>{c.label}</Text>
                    <Text style={[styles.catAmount, { color: colors.text }]}>{formatCurrency(c.amountPaise, 'INR')}</Text>
                  </View>
                  <View
                    style={[
                      styles.progressBarTrack,
                      { backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceAlt },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${c.percentage}%`, backgroundColor: c.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.catPercent, { color: colors.textSecondary }]}>
                    {c.percentage}% of overall spend
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Group Excel Expense Reports Section */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.lg }]}>
          Group Excel Expense Reports
        </Text>
        <View style={[styles.exportCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[styles.exportDesc, { color: colors.textSecondary }]}>
            Export full audit-ready .xlsx reports with executive summaries, complete ledgers, member balances, and zero-sum audits.
          </Text>
          <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
            {groups.map((g) => (
              <View
                key={g.id}
                style={[styles.groupExportRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}
              >
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <Text style={[styles.groupExportName, { color: colors.text }]}>{g.name}</Text>
                  <Text style={[styles.groupExportMeta, { color: colors.textMuted }]}>
                    {(g.members || []).length} members • {formatCurrency(g.totalSpentPaise || 0, g.currency)}
                  </Text>
                </View>
                <Button
                  title="Export"
                  size="sm"
                  variant="outline"
                  leftIcon={<MaterialCommunityIcons name="file-excel" size={14} color="#107C41" />}
                  onPress={() => setSelectedGroupForExport(g)}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Financial Rule Card */}
        <View
          style={[
            styles.tipCard,
            {
              backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : '#F5F3FF',
              borderColor: isDark ? 'rgba(124, 58, 237, 0.3)' : '#DDD6FE',
              marginTop: Spacing.lg,
            },
          ]}
        >
          <View
            style={[
              styles.tipIconCircle,
              { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.3)' : '#EDE9FE' },
            ]}
          >
            <Feather name="shield" size={18} color={colors.primary} />
          </View>
          <View style={styles.tipTextCol}>
            <Text style={[styles.tipHeading, { color: isDark ? colors.primaryLight : colors.primaryDark }]}>
              TripMate Financial Rule
            </Text>
            <Text style={[styles.tipBody, { color: colors.textSecondary }]}>
              Every group expense is reconciled down to the single paisa using integer minor units. No floating point
              discrepancies, ever.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Advanced Excel Export Modal */}
      {selectedGroupForExport && (
        <ExportExcelModal
          visible={!!selectedGroupForExport}
          groupId={selectedGroupForExport.id}
          groupName={selectedGroupForExport.name}
          groupCurrency={selectedGroupForExport.currency}
          members={(selectedGroupForExport.members || []).map((m: any) => ({
            userId: m.userId || m.id,
            name: m.name,
          }))}
          onClose={() => setSelectedGroupForExport(null)}
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
    paddingHorizontal: Spacing.lg,
    paddingTop: 54,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    ...Typography.h1,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 110,
  },
  heroBanner: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  heroEyebrow: {
    ...Typography.tiny,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  heroTotal: {
    ...Typography.currencyHero,
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroSubText: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  categoriesCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    ...Shadows.sm,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  catContent: {
    flex: 1,
  },
  catTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catLabel: {
    ...Typography.bodyBold,
  },
  catAmount: {
    ...Typography.bodyBold,
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
  catPercent: {
    ...Typography.tiny,
    marginTop: 3,
  },
  tipCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  tipIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  tipTextCol: {
    flex: 1,
  },
  tipHeading: {
    ...Typography.bodyBold,
  },
  tipBody: {
    ...Typography.caption,
    marginTop: 2,
  },
  exportCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  exportDesc: {
    ...Typography.caption,
    lineHeight: 18,
  },
  groupExportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  groupExportName: {
    ...Typography.bodyBold,
    fontSize: 14,
  },
  groupExportMeta: {
    ...Typography.tiny,
    marginTop: 2,
  },
});
