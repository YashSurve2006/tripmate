import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Radius, Spacing, Typography } from '../../theme/tokens';
import { formatCurrency } from '../../utils/finance';

export interface ExpenseItemData {
  id: string;
  title: string;
  amountPaise: number;
  currency: string;
  category: string;
  date: string;
  payerName: string;
  isCurrentUserPayer: boolean;
  participantCount: number;
  userSharePaise: number;
}

interface ExpenseItemProps {
  expense: ExpenseItemData;
  onPress?: () => void;
}

const CATEGORY_ICONS: Record<
  string,
  { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; bg: string }
> = {
  FOOD_AND_DRINK: { icon: 'silverware-fork-knife', color: '#EA580C', bg: '#FFEDD5' },
  TRANSPORT: { icon: 'car-multiple', color: '#2563EB', bg: '#DBEAFE' },
  ACCOMMODATION: { icon: 'bed', color: '#7C3AED', bg: '#EDE9FE' },
  ENTERTAINMENT: { icon: 'movie-open', color: '#DB2777', bg: '#FCE7F3' },
  SHOPPING: { icon: 'shopping', color: '#059669', bg: '#D1FAE5' },
  GROCERIES: { icon: 'cart-outline', color: '#16A34A', bg: '#DCFCE7' },
  FLIGHTS: { icon: 'airplane', color: '#0284C7', bg: '#E0F2FE' },
  UTILITIES: { icon: 'lightning-bolt', color: '#D97706', bg: '#FEF3C7' },
  OTHER: { icon: 'tag-outline', color: '#64748B', bg: '#F1F5F9' },
};

export const ExpenseItem: React.FC<ExpenseItemProps> = ({ expense, onPress }) => {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const cat = CATEGORY_ICONS[expense.category] || CATEGORY_ICONS.OTHER;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/expenses/${expense.id}` as any);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={[styles.container, { borderBottomColor: colors.borderLight }]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: isDark ? colors.surfaceAlt : cat.bg },
        ]}
      >
        <MaterialCommunityIcons name={cat.icon} size={20} color={cat.color} />
      </View>

      <View style={styles.infoCol}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {expense.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {expense.isCurrentUserPayer ? 'You paid' : `${expense.payerName} paid`}{' '}
          • {expense.participantCount} {expense.participantCount === 1 ? 'person' : 'people'}
        </Text>
      </View>

      <View style={styles.amountCol}>
        <Text style={[styles.totalAmount, { color: colors.text }]}>
          {formatCurrency(expense.amountPaise, expense.currency)}
        </Text>
        <Text
          style={[
            styles.shareAmount,
            { color: expense.isCurrentUserPayer ? colors.positive : colors.negative },
          ]}
        >
          {expense.isCurrentUserPayer
            ? `+${formatCurrency(expense.amountPaise - expense.userSharePaise, expense.currency)}`
            : `-${formatCurrency(expense.userSharePaise, expense.currency)}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  infoCol: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    ...Typography.bodyBold,
    fontSize: 15,
    marginBottom: 2,
  },
  subtitle: {
    ...Typography.caption,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    ...Typography.bodyBold,
    fontSize: 15,
  },
  shareAmount: {
    ...Typography.tiny,
    marginTop: 2,
    fontWeight: '700',
  },
});
