import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { CalendarPickerModal } from '../../src/components/common/CalendarPickerModal';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { api } from '../../src/services/api';
import { useTheme } from '../../src/theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../src/theme/tokens';
import { parseAmountToPaise } from '../../src/utils/finance';

const GROUP_TYPES = [
  { type: 'TRIP', label: 'Trip', icon: 'airplane-outline' },
  { type: 'ROOMMATES', label: 'Roommates', icon: 'home-outline' },
  { type: 'OUTING', label: 'Outing', icon: 'restaurant-outline' },
  { type: 'EVENT', label: 'Event', icon: 'calendar-outline' },
  { type: 'OTHER', label: 'Other', icon: 'people-outline' },
] as const;

export default function NewGroupScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<string>('TRIP');
  const [customType, setCustomType] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [budgetStr, setBudgetStr] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [calendarTarget, setCalendarTarget] = useState<'START' | 'END' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please provide a group name');
      return;
    }

    if (selectedType === 'OTHER' && !customType.trim()) {
      setError('Please specify the group type for "Other"');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const budgetPaise = budgetStr.trim() ? parseAmountToPaise(budgetStr) : undefined;
      const finalType = selectedType === 'OTHER' && customType.trim() ? customType.trim() : selectedType;

      const created = await api.createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        type: finalType,
        currency,
        budgetPaise,
        startDate: startDateStr ? new Date(startDateStr).toISOString() : undefined,
        endDate: endDateStr ? new Date(endDateStr).toISOString() : undefined,
      });

      router.replace(`/groups/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create New Group</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {error && (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' },
            ]}
          >
            <Feather name="alert-circle" size={16} color={colors.negative} />
            <Text style={[styles.errorText, { color: colors.negative }]}>{error}</Text>
          </View>
        )}

        {/* Group Name & Description */}
        <Input
          label="Group Name *"
          placeholder="e.g. Manali Snow Trip 🏔️ or Flat 301"
          placeholderTextColor={colors.placeholder}
          value={name}
          onChangeText={(t) => {
            setName(t);
            setError(null);
          }}
          leftIcon={<Feather name="users" size={18} color={colors.textTertiary} />}
        />

        <Input
          label="Description (Optional)"
          placeholder="What is this group for?"
          placeholderTextColor={colors.placeholder}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
          leftIcon={<Feather name="align-left" size={18} color={colors.textTertiary} />}
        />

        {/* Group Type Selector */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Group Type</Text>
        <View style={styles.typeGrid}>
          {GROUP_TYPES.map((item) => {
            const isSelected = selectedType === item.type;
            return (
              <TouchableOpacity
                key={item.type}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedType(item.type);
                  if (item.type !== 'OTHER') {
                    setCustomType('');
                  }
                  if (error) setError(null);
                }}
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(124, 58, 237, 0.2)'
                        : '#F5F3FF'
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.typeIconBox,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark
                        ? colors.surfaceElevated
                        : colors.primaryMuted,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={isSelected ? '#FFFFFF' : colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.typeLabel,
                    {
                      color: isSelected
                        ? isDark
                          ? colors.primaryLight
                          : colors.primary
                        : colors.text,
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom Type Input for "OTHER" */}
        {selectedType === 'OTHER' && (
          <View style={styles.customTypeSection}>
            <Input
              label="Specify Group Type *"
              placeholder="e.g. College Reunion, Hackathon, Wedding, Office Party..."
              placeholderTextColor={colors.placeholder}
              value={customType}
              onChangeText={(t) => {
                setCustomType(t);
                setError(null);
              }}
              leftIcon={<Feather name="tag" size={18} color={colors.primary} />}
              hint="Enter a descriptive category for this custom group"
            />
          </View>
        )}

        {/* Currency & Budget */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Financial Settings</Text>
        <Input
          label="Base Currency"
          value={currency}
          onChangeText={setCurrency}
          placeholder="INR"
          placeholderTextColor={colors.placeholder}
          leftIcon={<Feather name="globe" size={18} color={colors.textTertiary} />}
        />

        <Input
          label="Group Budget (Optional)"
          placeholder="0.00"
          placeholderTextColor={colors.placeholder}
          value={budgetStr}
          onChangeText={setBudgetStr}
          keyboardType="numeric"
          currencyPrefix="₹"
          hint="We will track your spending against this target"
        />

        {/* Trip / Event Dates with Interactive Calendar Picker */}
        <View style={styles.tripDatesSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {selectedType === 'TRIP' ? 'Trip Dates (Optional)' : 'Dates (Optional)'}
          </Text>
          <View style={styles.dateRow}>
            {/* Start Date Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setCalendarTarget('START')}
              style={[
                styles.dateCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: startDateStr ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.dateCardHeader}>
                <Feather name="calendar" size={14} color={startDateStr ? colors.primary : colors.textTertiary} />
                <Text style={[styles.dateCardLabel, { color: colors.textSecondary }]}>Start Date</Text>
              </View>
              <Text
                style={[
                styles.dateCardValue,
                { color: startDateStr ? colors.text : colors.placeholder },
              ]}
            >
              {startDateStr
                ? new Date(startDateStr).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Tap to pick'}
            </Text>
            {startDateStr ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setStartDateStr('');
                }}
                style={styles.dateClearBtn}
              >
                <Feather name="x-circle" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>

          {/* End Date Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setCalendarTarget('END')}
            style={[
              styles.dateCard,
              {
                backgroundColor: colors.surface,
                borderColor: endDateStr ? colors.primary : colors.border,
              },
            ]}
          >
            <View style={styles.dateCardHeader}>
              <Feather name="calendar" size={14} color={endDateStr ? colors.primary : colors.textTertiary} />
              <Text style={[styles.dateCardLabel, { color: colors.textSecondary }]}>End Date</Text>
            </View>
            <Text
              style={[
                styles.dateCardValue,
                { color: endDateStr ? colors.text : colors.placeholder },
              ]}
            >
              {endDateStr
                ? new Date(endDateStr).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Tap to pick'}
            </Text>
            {endDateStr ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setEndDateStr('');
                }}
                style={styles.dateClearBtn}
              >
                <Feather name="x-circle" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

        <Button
          title={loading ? 'Creating Group...' : 'Save Group'}
          size="lg"
          variant="primary"
          loading={loading}
          onPress={handleCreate}
          style={styles.saveButton}
        />
      </ScrollView>

      {/* Calendar Picker Modal */}
      <CalendarPickerModal
        visible={calendarTarget !== null}
        title={calendarTarget === 'START' ? 'Select Trip Start Date' : 'Select Trip End Date'}
        initialDate={calendarTarget === 'START' ? startDateStr : endDateStr || startDateStr}
        minDate={calendarTarget === 'END' ? startDateStr : undefined}
        onSelectDate={(picked) => {
          if (calendarTarget === 'START') {
            setStartDateStr(picked);
            if (endDateStr && endDateStr < picked) {
              setEndDateStr('');
            }
          } else {
            setEndDateStr(picked);
          }
        }}
        onClose={() => setCalendarTarget(null)}
      />
    </KeyboardAvoidingView>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h3,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: 60,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorText: {
    ...Typography.caption,
    flex: 1,
  },
  sectionLabel: {
    ...Typography.caption,
    fontWeight: '700',
    marginBottom: Spacing.xs + 2,
    marginTop: Spacing.xs,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  typeCard: {
    width: '30%',
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  typeLabel: {
    ...Typography.caption,
  },
  customTypeSection: {
    marginBottom: Spacing.sm,
  },
  tripDatesSection: {
    marginBottom: Spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dateCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    position: 'relative',
  },
  dateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dateCardLabel: {
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  dateCardValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  dateClearBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  saveButton: {
    marginTop: Spacing.md,
  },
});
