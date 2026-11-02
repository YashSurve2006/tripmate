import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../theme/tokens';
import { formatCurrency, parseCurrencyToMinorUnits } from '../../utils/finance';

export type SettlementMode = 'INSTANT' | 'REQUEST_CONFIRMATION';

interface PartialSettlementModalProps {
  visible: boolean;
  payerName: string;
  payeeName: string;
  maxAmountPaise: number;
  currency: string;
  onClose: () => void;
  onSubmit: (amountPaise: number, mode: SettlementMode, note?: string) => Promise<void>;
}

export const PartialSettlementModal: React.FC<PartialSettlementModalProps> = ({
  visible,
  payerName,
  payeeName,
  maxAmountPaise,
  currency,
  onClose,
  onSubmit,
}) => {
  const { colors, isDark } = useTheme();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<SettlementMode>('REQUEST_CONFIRMATION');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setAmount((maxAmountPaise / 100).toFixed(2));
      setNote('');
      setMode('REQUEST_CONFIRMATION');
      setError('');
      setSubmitting(false);
    }
  }, [visible, maxAmountPaise]);

  const amountPaise = useMemo(() => {
    try {
      return amount.trim() ? parseCurrencyToMinorUnits(amount) : 0;
    } catch {
      return 0;
    }
  }, [amount]);

  const remainingPaise = maxAmountPaise - amountPaise;
  const valid = Number.isSafeInteger(amountPaise) && amountPaise > 0 && amountPaise <= maxAmountPaise;

  const setQuickAmount = (ratio: number) => {
    const value = Math.floor((maxAmountPaise * ratio) / 100);
    setAmount((value / 100).toFixed(2));
    setError('');
  };

  const submit = async () => {
    if (!valid) {
      setError(amountPaise <= 0 ? 'Enter an amount greater than zero.' : 'Amount cannot exceed the outstanding balance.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(amountPaise, mode, note.trim() || undefined);
    } catch (e: any) {
      setError(e?.message || 'Unable to record this settlement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.handleWrap}><View style={[styles.handle, { backgroundColor: colors.border }]} /></View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>Record a payment</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>A partial payment is saved separately. Original expenses remain unchanged.</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12} style={[styles.close, { backgroundColor: colors.surfaceAlt }]}>
                <Feather name="x" size={19} color={colors.text} />
              </Pressable>
            </View>

            <View style={[styles.routeCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
              <View style={styles.person}>
                <Text style={[styles.label, { color: colors.textMuted }]}>FROM</Text>
                <Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>{payerName}</Text>
              </View>
              <Feather name="arrow-right" size={18} color={colors.textMuted} />
              <View style={[styles.person, { alignItems: 'flex-end' }]}>
                <Text style={[styles.label, { color: colors.textMuted }]}>TO</Text>
                <Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>{payeeName}</Text>
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textMuted, marginTop: Spacing.lg }]}>OUTSTANDING BALANCE</Text>
            <Text style={[styles.outstanding, { color: colors.text }]}>{formatCurrency(maxAmountPaise, currency)}</Text>

            <Text style={[styles.label, { color: colors.textMuted, marginTop: Spacing.lg }]}>PAYMENT AMOUNT</Text>
            <View style={[styles.amountBox, { borderColor: error ? colors.negative : colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>{currency === 'INR' ? '₹' : currency}</Text>
              <TextInput
                value={amount}
                onChangeText={(value) => { setAmount(value.replace(/[^0-9.]/g, '').replace(/(\\..*)\\./g, '$1')); setError(''); }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                style={[styles.amountInput, { color: colors.text }]}
                accessibilityLabel="Settlement amount"
                maxLength={14}
              />
            </View>
            <View style={styles.quickAmounts}>
              {[25, 50, 75, 100].map((ratio) => (
                <Pressable
                  key={ratio}
                  onPress={() => setQuickAmount(ratio)}
                  style={[
                    styles.quickButton,
                    { borderColor: colors.border, backgroundColor: amountPaise === Math.floor(maxAmountPaise * ratio / 100) ? colors.primaryMuted : colors.surface },
                  ]}
                >
                  <Text style={[styles.quickText, { color: colors.text }]}>{ratio === 100 ? 'Full' : `${ratio}%`}</Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.remainingRow, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.remainingLabel, { color: colors.textMuted }]}>Remaining after this payment</Text>
              <Text style={[styles.remainingValue, { color: remainingPaise < 0 ? colors.negative : colors.text }]}>
                {formatCurrency(Math.max(0, remainingPaise), currency)}
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.textMuted, marginTop: Spacing.lg }]}>CONFIRMATION METHOD</Text>
            <View style={styles.modeList}>
              <Pressable
                onPress={() => setMode('INSTANT')}
                style={[styles.modeCard, { borderColor: mode === 'INSTANT' ? colors.primary : colors.border, backgroundColor: mode === 'INSTANT' ? colors.primaryMuted : colors.surface }]}
              >
                <View style={styles.modeTop}>
                  <Feather name="check-circle" size={18} color={mode === 'INSTANT' ? colors.primary : colors.textMuted} />
                  <Text style={[styles.modeTitle, { color: colors.text }]}>Record as paid</Text>
                  <View style={[styles.radio, { borderColor: mode === 'INSTANT' ? colors.primary : colors.border }]}>
                    {mode === 'INSTANT' && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                  </View>
                </View>
                <Text style={[styles.modeDescription, { color: colors.textMuted }]}>Update balances immediately. Use when payment has already been received.</Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('REQUEST_CONFIRMATION')}
                style={[styles.modeCard, { borderColor: mode === 'REQUEST_CONFIRMATION' ? colors.primary : colors.border, backgroundColor: mode === 'REQUEST_CONFIRMATION' ? colors.primaryMuted : colors.surface }]}
              >
                <View style={styles.modeTop}>
                  <Feather name="shield-check" size={18} color={mode === 'REQUEST_CONFIRMATION' ? colors.primary : colors.textMuted} />
                  <Text style={[styles.modeTitle, { color: colors.text }]}>Request confirmation</Text>
                  <View style={[styles.radio, { borderColor: mode === 'REQUEST_CONFIRMATION' ? colors.primary : colors.border }]}>
                    {mode === 'REQUEST_CONFIRMATION' && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                  </View>
                </View>
                <Text style={[styles.modeDescription, { color: colors.textMuted }]}>Keep the payment pending. The recipient must confirm receipt before balances change.</Text>
              </Pressable>
            </View>

            <Text style={[styles.label, { color: colors.textMuted, marginTop: Spacing.lg }]}>NOTE (OPTIONAL)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Paid via UPI"
              placeholderTextColor={colors.textTertiary}
              style={[styles.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              maxLength={180}
            />

            {!!error && <Text style={[styles.error, { color: colors.negative }]}>{error}</Text>}

            <Pressable
              disabled={!valid || submitting}
              onPress={submit}
              style={[styles.submit, { backgroundColor: valid ? colors.primary : colors.border, opacity: submitting ? 0.7 : 1 }]}
            >
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : (
                <Text style={styles.submitText}>
                  {mode === 'INSTANT' ? 'Record payment' : 'Send for confirmation'} · {formatCurrency(Math.max(0, amountPaise), currency)}
                </Text>
              )}
            </Pressable>
            <Pressable onPress={onClose} disabled={submitting} style={styles.cancel}>
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  sheet: { maxHeight: '94%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, ...Shadows.lg },
  handleWrap: { alignItems: 'center', paddingVertical: Spacing.sm },
  handle: { width: 42, height: 4, borderRadius: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.lg },
  title: { fontSize: Typography.h2, fontWeight: '800' },
  subtitle: { fontSize: Typography.caption, lineHeight: 18, marginTop: 4 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  routeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md },
  person: { flex: 1, gap: 4 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
  personName: { fontSize: Typography.body, fontWeight: '700' },
  outstanding: { fontSize: 26, fontWeight: '800', marginTop: 3 },
  amountBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, marginTop: Spacing.xs },
  currencySymbol: { fontSize: 23, fontWeight: '700' },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '800', paddingVertical: Spacing.md, paddingLeft: Spacing.sm },
  quickAmounts: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  quickButton: { flex: 1, borderWidth: 1, borderRadius: Radius.md, alignItems: 'center', paddingVertical: Spacing.sm },
  quickText: { fontSize: Typography.caption, fontWeight: '700' },
  remainingRow: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  remainingLabel: { fontSize: Typography.caption, flex: 1 },
  remainingValue: { fontSize: Typography.body, fontWeight: '800' },
  modeList: { gap: Spacing.sm, marginTop: Spacing.xs },
  modeCard: { borderWidth: 1.5, borderRadius: Radius.lg, padding: Spacing.md },
  modeTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  modeTitle: { fontSize: Typography.body, fontWeight: '700', flex: 1 },
  modeDescription: { fontSize: Typography.caption, lineHeight: 18, marginTop: 7, marginLeft: 26 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 9, height: 9, borderRadius: 5 },
  noteInput: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginTop: Spacing.xs, fontSize: Typography.body },
  error: { fontSize: Typography.caption, marginTop: Spacing.sm },
  submit: { minHeight: 50, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md, marginTop: Spacing.lg },
  submitText: { color: '#FFFFFF', fontSize: Typography.body, fontWeight: '800' },
  cancel: { alignItems: 'center', paddingVertical: Spacing.md },
  cancelText: { fontSize: Typography.body, fontWeight: '600' },
});
