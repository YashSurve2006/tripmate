import React, { useEffect, useState } from 'react';
import {
  Alert,
  Clipboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../theme/tokens';
import { formatCurrency } from '../../utils/finance';
import { Button } from '../ui/Button';
import { ReportMemberSummary } from '../../services/api';

const AVATAR_COLORS = [
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Red
  '#7C3AED', // Purple
  '#0284C7', // Sky
  '#DB2777', // Pink
  '#0D9488', // Teal
  '#EA580C', // Orange
  '#475569', // Slate
];

interface EditMemberModalProps {
  visible: boolean;
  member: ReportMemberSummary | null;
  currency: string;
  onClose: () => void;
  onUpdate: (memberId: string, updates: any) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
}

export const EditMemberModal: React.FC<EditMemberModalProps> = ({
  visible,
  member,
  currency,
  onClose,
  onUpdate,
  onRemove,
}) => {
  const { colors, isDark } = useTheme();

  // All hooks called unconditionally at the top level
  const [name, setName] = useState(member?.name || '');
  const [nickname, setNickname] = useState(member?.nickname || '');
  const [email, setEmail] = useState(member?.email || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN'>(member?.role === 'ADMIN' ? 'ADMIN' : 'MEMBER');
  const [selectedColor, setSelectedColor] = useState(member?.avatarColor || AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Sync state when member changes
  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setNickname(member.nickname || '');
      setEmail(member.email || '');
      setPhone(member.phone || '');
      setRole(member.role === 'ADMIN' ? 'ADMIN' : 'MEMBER');
      if (member.avatarColor) {
        setSelectedColor(member.avatarColor);
      }
      setError(null);
      setShowDangerZone(false);
      setCopiedToast(false);
    }
  }, [member]);

  // Guard after all hooks have executed
  if (!member) return null;

  const getInitials = (text: string) => {
    const parts = text.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.[0] || 'M').toUpperCase();
  };

  const handleCall = () => {
    if (!phone.trim()) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Unable to Call', 'Dialer could not be launched on this device.');
    });
  };

  const handleWhatsApp = () => {
    if (!phone.trim()) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${cleanPhone}`).catch(() => {
      Alert.alert('Unable to Open WhatsApp', 'Please ensure WhatsApp is installed.');
    });
  };

  const handleCopySummary = () => {
    try {
      const summaryText = `Member: ${name}${nickname ? ` (${nickname})` : ''}\nPhone: ${phone || 'N/A'}\nEmail: ${email || 'N/A'}\nRole: ${role}\nNet Balance: ${formatCurrency(member.netBalancePaise, currency)}`;
      Clipboard.setString(summaryText);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch {
      Alert.alert('Details', `${name} - ${phone || email || 'No contact info'}`);
    }
  };

  const handleUpdate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Member name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onUpdate(member.userId, {
        name: trimmedName,
        nickname: nickname.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        role,
        avatarColor: selectedColor,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update member profile');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = () => {
    const hasTransactions =
      member.totalPaidPaise > 0 ||
      member.totalSharePaise > 0 ||
      member.confirmedRepaymentsMadePaise > 0 ||
      member.confirmedRepaymentsReceivedPaise > 0;

    const hasBalance = member.netBalancePaise !== 0;

    let warningText = `Are you sure you want to remove "${member.name}"?`;
    if (hasBalance) {
      const balStr = formatCurrency(Math.abs(member.netBalancePaise), currency);
      const direction = member.netBalancePaise > 0 ? 'is owed' : 'owes';
      warningText += `\n\n⚠️ Outstanding Balance Warning: This member ${direction} ${balStr}. Removing them will archive their records so group totals remain zero-sum balanced.`;
    } else if (hasTransactions) {
      warningText += '\n\nThis member has recorded expenses. They will be archived to preserve transaction history and financial integrity.';
    }

    Alert.alert('Remove Member', warningText, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove Member',
        style: 'destructive',
        onPress: async () => {
          try {
            setRemoving(true);
            await onRemove(member.userId);
            onClose();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to remove member');
          } finally {
            setRemoving(false);
          }
        },
      },
    ]);
  };

  const isNetPositive = member.netBalancePaise > 0;
  const isNetNegative = member.netBalancePaise < 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={[styles.dragHandle, { backgroundColor: colors.borderLight }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {name || member.name}
                </Text>
                <View
                  style={[
                    styles.roleBadgeHeader,
                    {
                      backgroundColor:
                        role === 'ADMIN'
                          ? isDark
                            ? 'rgba(79, 70, 229, 0.25)'
                            : '#EEF2FF'
                          : colors.surfaceAlt,
                      borderColor: role === 'ADMIN' ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <Feather
                    name={role === 'ADMIN' ? 'shield' : 'user'}
                    size={11}
                    color={role === 'ADMIN' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.roleBadgeHeaderText,
                      { color: role === 'ADMIN' ? colors.primary : colors.textMuted },
                    ]}
                  >
                    {role}
                  </Text>
                </View>
              </View>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Joined {new Date(member.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {error && (
              <View style={[styles.errorBox, { backgroundColor: colors.negativeMuted, borderColor: colors.negative }]}>
                <Feather name="alert-circle" size={16} color={colors.negative} />
                <Text style={[styles.errorText, { color: colors.negative }]}>{error}</Text>
              </View>
            )}

            {/* Quick Contact & Action Toolbar */}
            <View style={styles.quickActionsBar}>
              {phone.trim() ? (
                <>
                  <TouchableOpacity
                    onPress={handleCall}
                    style={[styles.quickActionBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}
                  >
                    <Feather name="phone-call" size={15} color={colors.primary} />
                    <Text style={[styles.quickActionText, { color: colors.text }]}>Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleWhatsApp}
                    style={[styles.quickActionBtn, { backgroundColor: '#25D36620', borderColor: '#25D36660' }]}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                    <Text style={[styles.quickActionText, { color: '#25D366', fontWeight: '700' }]}>WhatsApp</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              <TouchableOpacity
                onPress={handleCopySummary}
                style={[
                  styles.quickActionBtn,
                  {
                    backgroundColor: copiedToast ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5') : colors.surfaceAlt,
                    borderColor: copiedToast ? colors.positive : colors.borderLight,
                    flex: phone.trim() ? undefined : 1,
                  },
                ]}
              >
                <Feather
                  name={copiedToast ? 'check' : 'copy'}
                  size={15}
                  color={copiedToast ? colors.positive : colors.textMuted}
                />
                <Text
                  style={[
                    styles.quickActionText,
                    { color: copiedToast ? colors.positive : colors.text },
                  ]}
                >
                  {copiedToast ? 'Copied!' : 'Copy Info'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Financial Standing Cards */}
            <View style={styles.metricsContainer}>
              <View style={[styles.metricCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
                <View style={styles.metricCardHeader}>
                  <Feather name="arrow-up-right" size={13} color={colors.primary} />
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Total Paid</Text>
                </View>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {formatCurrency(member.totalPaidPaise, currency)}
                </Text>
                <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                  {member.paidExpenseCount} expense{member.paidExpenseCount === 1 ? '' : 's'}
                </Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
                <View style={styles.metricCardHeader}>
                  <Feather name="pie-chart" size={13} color="#0284C7" />
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Fair Share</Text>
                </View>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {formatCurrency(member.totalSharePaise, currency)}
                </Text>
                <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                  {member.participatedExpenseCount} shared
                </Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: isNetPositive
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.15)'
                        : '#ECFDF5'
                      : isNetNegative
                      ? isDark
                        ? 'rgba(239, 68, 68, 0.15)'
                        : '#FEF2F2'
                      : colors.surfaceAlt,
                    borderColor: isNetPositive
                      ? colors.positive
                      : isNetNegative
                      ? colors.negative
                      : colors.borderLight,
                  },
                ]}
              >
                <View style={styles.metricCardHeader}>
                  <Feather
                    name={isNetPositive ? 'plus-circle' : isNetNegative ? 'minus-circle' : 'check-circle'}
                    size={13}
                    color={isNetPositive ? colors.positive : isNetNegative ? colors.negative : colors.textMuted}
                  />
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Net Balance</Text>
                </View>
                <Text
                  style={[
                    styles.metricValue,
                    {
                      color: isNetPositive
                        ? colors.positive
                        : isNetNegative
                        ? colors.negative
                        : colors.text,
                    },
                  ]}
                >
                  {isNetPositive ? '+' : ''}
                  {formatCurrency(member.netBalancePaise, currency)}
                </Text>
                <Text
                  style={[
                    styles.metricSub,
                    {
                      color: isNetPositive
                        ? colors.positive
                        : isNetNegative
                        ? colors.negative
                        : colors.textMuted,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {isNetPositive
                    ? `Owed ${formatCurrency(member.amountOwedPaise, currency)}`
                    : isNetNegative
                    ? `Owes ${formatCurrency(member.amountOwingPaise, currency)}`
                    : 'Settled up'}
                </Text>
              </View>
            </View>

            {/* Avatar & Interactive Color Theme Picker */}
            <View style={[styles.avatarCustomizerCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
              <View style={[styles.avatarGlowRing, { borderColor: selectedColor }]}>
                <View style={[styles.previewAvatar, { backgroundColor: selectedColor }]}>
                  <Text style={styles.previewAvatarText}>{getInitials(name || member.name)}</Text>
                </View>
              </View>

              <View style={styles.colorPaletteSection}>
                <View style={styles.paletteHeaderRow}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Avatar Color Theme</Text>
                  <Text style={[styles.paletteHint, { color: colors.textMuted }]}>Tap to switch</Text>
                </View>
                <View style={styles.colorsRow}>
                  {AVATAR_COLORS.map((c) => {
                    const isSelected = selectedColor.toUpperCase() === c.toUpperCase();
                    return (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setSelectedColor(c)}
                        activeOpacity={0.8}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: c },
                          isSelected && styles.selectedColorCircle,
                        ]}
                      >
                        {isSelected && <Feather name="check" size={13} color="#FFFFFF" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Feather name="user" size={14} color={colors.primary} />
                <Text style={[styles.label, { color: colors.text }]}>Full Name *</Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Member name"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.borderLight }]}
              />
            </View>

            {/* Nickname / Alias */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Feather name="tag" size={14} color={colors.textMuted} />
                <Text style={[styles.label, { color: colors.text }]}>Nickname / Alias</Text>
              </View>
              <TextInput
                value={nickname}
                onChangeText={setNickname}
                placeholder="e.g. Yash, Cap, Bro"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.borderLight }]}
              />
            </View>

            {/* Role Selection Chips */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Feather name="shield" size={14} color={colors.textMuted} />
                <Text style={[styles.label, { color: colors.text }]}>Group Role & Permissions</Text>
              </View>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  onPress={() => setRole('MEMBER')}
                  activeOpacity={0.8}
                  style={[
                    styles.roleChip,
                    {
                      backgroundColor: role === 'MEMBER' ? (isDark ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF') : colors.surfaceAlt,
                      borderColor: role === 'MEMBER' ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <View style={[styles.roleRadioDot, { borderColor: role === 'MEMBER' ? colors.primary : colors.borderLight }]}>
                    {role === 'MEMBER' && <View style={[styles.roleRadioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleChipTitle, { color: role === 'MEMBER' ? colors.primary : colors.text }]}>
                      Regular Member
                    </Text>
                    <Text style={[styles.roleChipDesc, { color: colors.textMuted }]}>
                      Add expenses and view reports
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRole('ADMIN')}
                  activeOpacity={0.8}
                  style={[
                    styles.roleChip,
                    {
                      backgroundColor: role === 'ADMIN' ? (isDark ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF') : colors.surfaceAlt,
                      borderColor: role === 'ADMIN' ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <View style={[styles.roleRadioDot, { borderColor: role === 'ADMIN' ? colors.primary : colors.borderLight }]}>
                    {role === 'ADMIN' && <View style={[styles.roleRadioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleChipTitle, { color: role === 'ADMIN' ? colors.primary : colors.text }]}>
                      Group Admin
                    </Text>
                    <Text style={[styles.roleChipDesc, { color: colors.textMuted }]}>
                      Full control over members & settings
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Feather name="phone" size={14} color={colors.textMuted} />
                <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
              </View>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.borderLight }]}
              />
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Feather name="mail" size={14} color={colors.textMuted} />
                <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.borderLight }]}
              />
            </View>

            {/* Collapsible Danger & Removal Zone */}
            <View style={[styles.dangerAccordion, { borderColor: colors.borderLight, backgroundColor: colors.surfaceAlt }]}>
              <TouchableOpacity
                onPress={() => setShowDangerZone(!showDangerZone)}
                style={styles.dangerAccordionHeader}
                activeOpacity={0.7}
              >
                <View style={styles.dangerHeaderLeft}>
                  <Feather name="alert-triangle" size={16} color={colors.negative} />
                  <Text style={[styles.dangerTitle, { color: colors.text }]}>Advanced & Removal</Text>
                </View>
                <Feather
                  name={showDangerZone ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {showDangerZone && (
                <View style={styles.dangerBody}>
                  <Text style={[styles.dangerDesc, { color: colors.textMuted }]}>
                    TripMate ledger uses double-entry accounting. If this member participated in any expenses, their historical records will be archived so group totals remain perfectly balanced.
                  </Text>
                  <Button
                    title="Remove Member from Group"
                    variant="outline"
                    size="sm"
                    leftIcon={<Feather name="trash-2" size={14} color={colors.negative} />}
                    onPress={confirmRemove}
                    loading={removing}
                    style={{ borderColor: colors.negative, marginTop: Spacing.sm }}
                  />
                </View>
              )}
            </View>
          </ScrollView>

          {/* Sticky Footer */}
          <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: colors.borderLight }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>

            <Button
              title="Save Changes"
              variant="primary"
              size="md"
              leftIcon={<Feather name="check" size={16} color="#FFFFFF" />}
              onPress={handleUpdate}
              loading={saving}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '92%',
    ...Shadows.lg,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: '700',
  },
  roleBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 4,
  },
  roleBadgeHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: Typography.xs,
    marginTop: 3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.sm,
    flex: 1,
  },
  quickActionsBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
  },
  quickActionText: {
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  metricCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    marginTop: 2,
  },
  avatarCustomizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  avatarGlowRing: {
    borderWidth: 2.5,
    borderRadius: 34,
    padding: 3,
  },
  previewAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarText: {
    color: '#FFFFFF',
    fontSize: Typography.lg,
    fontWeight: '700',
  },
  colorPaletteSection: {
    flex: 1,
  },
  paletteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
  },
  paletteHint: {
    fontSize: 10,
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedColorCircle: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.18 }],
    ...Shadows.sm,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: Typography.base,
  },
  roleContainer: {
    gap: Spacing.xs,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 10,
  },
  roleRadioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleChipTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  roleChipDesc: {
    fontSize: Typography.xs,
    marginTop: 1,
  },
  dangerAccordion: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  dangerAccordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  dangerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dangerTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  dangerBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  dangerDesc: {
    fontSize: Typography.xs,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.md,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: Typography.sm,
    fontWeight: '600',
  },
});
