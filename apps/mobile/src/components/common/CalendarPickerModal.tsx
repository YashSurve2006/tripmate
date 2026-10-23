import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../theme/tokens';
import { Button } from '../ui/Button';

interface CalendarPickerModalProps {
  visible: boolean;
  title: string;
  initialDate?: string; // YYYY-MM-DD
  minDate?: string;     // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export const CalendarPickerModal: React.FC<CalendarPickerModalProps> = ({
  visible,
  title,
  initialDate,
  minDate,
  onSelectDate,
  onClose,
}) => {
  const { colors, isDark } = useTheme();

  // Parse initial selected date or default to today
  const parsedInitial = useMemo(() => {
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
      const [y, m, d] = initialDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [initialDate]);

  const [currentYear, setCurrentYear] = useState(parsedInitial.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(parsedInitial.getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
      ? initialDate
      : `${parsedInitial.getFullYear()}-${String(parsedInitial.getMonth() + 1).padStart(2, '0')}-${String(parsedInitial.getDate()).padStart(2, '0')}`
  );

  // Helper to format date object to YYYY-MM-DD
  const formatDateToISO = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (visible) {
      const d = initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
        ? parsedInitial
        : minDate && /^\d{4}-\d{2}-\d{2}$/.test(minDate)
        ? new Date(Number(minDate.split('-')[0]), Number(minDate.split('-')[1]) - 1, Number(minDate.split('-')[2]))
        : new Date();
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      const iso = initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
        ? initialDate
        : minDate && /^\d{4}-\d{2}-\d{2}$/.test(minDate)
        ? minDate
        : formatDateToISO(d);
      setSelectedDateStr(iso);
    }
  }, [visible, initialDate, minDate, parsedInitial]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Build grid days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    // Sunday is 0, convert to Monday = 0
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days: Array<{ day: number; dateStr: string; isCurrentMonth: boolean; isDisabled: boolean }> = [];

    // Empty lead cells
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: 0, dateStr: '', isCurrentMonth: false, isDisabled: true });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isDisabled = !!minDate && dateStr < minDate;
      days.push({ day, dateStr, isCurrentMonth: true, isDisabled });
    }

    return days;
  }, [currentYear, currentMonth, minDate]);

  const handleSelectDay = (dateStr: string, isDisabled: boolean) => {
    if (isDisabled || !dateStr) return;
    setSelectedDateStr(dateStr);
  };

  const handleQuickPick = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    const iso = formatDateToISO(target);
    if (!minDate || iso >= minDate) {
      setSelectedDateStr(iso);
      setCurrentYear(target.getFullYear());
      setCurrentMonth(target.getMonth());
    }
  };

  const handleConfirm = () => {
    if (selectedDateStr) {
      onSelectDate(selectedDateStr);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.borderLight }]}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {selectedDateStr ? new Date(selectedDateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Tap a date to pick'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Month & Year Navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity onPress={handlePrevMonth} style={[styles.navBtn, { backgroundColor: colors.surfaceAlt }]}>
              <Feather name="chevron-left" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.monthYearText, { color: colors.text }]}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={[styles.navBtn, { backgroundColor: colors.surfaceAlt }]}>
              <Feather name="chevron-right" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekdaysRow}>
            {WEEKDAY_NAMES.map((w) => (
              <Text key={w} style={[styles.weekdayLabel, { color: colors.textTertiary }]}>
                {w}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {calendarDays.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return <View key={idx} style={styles.emptyDayCell} />;
              }
              const isSelected = selectedDateStr === cell.dateStr;
              return (
                <TouchableOpacity
                  key={idx}
                  disabled={cell.isDisabled}
                  onPress={() => handleSelectDay(cell.dateStr, cell.isDisabled)}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: colors.primary },
                    cell.isDisabled && { opacity: 0.25 },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#FFFFFF' : colors.text },
                      isSelected && { fontWeight: '700' },
                    ]}
                  >
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quick Shortcuts */}
          <View style={styles.quickShortcutsRow}>
            <TouchableOpacity onPress={() => handleQuickPick(0)} style={[styles.quickChip, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.quickChipText, { color: colors.primary }]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleQuickPick(1)} style={[styles.quickChip, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.quickChipText, { color: colors.primary }]}>Tomorrow</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleQuickPick(7)} style={[styles.quickChip, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.quickChipText, { color: colors.primary }]}>+1 Week</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleQuickPick(14)} style={[styles.quickChip, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.quickChipText, { color: colors.primary }]}>+2 Weeks</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Actions */}
          <View style={[styles.footerRow, { borderTopColor: colors.borderLight }]}>
            <Button
              title="Cancel"
              variant="outline"
              size="sm"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title="Select Date"
              variant="primary"
              size="sm"
              leftIcon={<Feather name="check" size={14} color="#FFFFFF" />}
              onPress={handleConfirm}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.base,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: Typography.xs,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearText: {
    fontSize: Typography.base,
    fontWeight: '700',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xs,
  },
  weekdayLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emptyDayCell: {
    width: '14.28%',
    height: 38,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  dayText: {
    fontSize: Typography.sm,
  },
  quickShortcutsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: Spacing.sm,
    justifyContent: 'center',
  },
  quickChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  quickChipText: {
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
});
