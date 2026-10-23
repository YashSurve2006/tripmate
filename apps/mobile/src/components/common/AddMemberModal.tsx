import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { Button } from '../ui/Button';

const AVATAR_COLORS = [
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Red
  '#7C3AED', // Purple
  '#0284C7', // Sky
  '#DB2777', // Pink
  '#0D9488', // Teal
];

interface AddMemberModalProps {
  visible: boolean;
  groupId: string;
  groupName: string;
  onClose: () => void;
  onMemberAdded: (newMember: any, addAnother: boolean) => Promise<void>;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  visible,
  groupId,
  groupName,
  onClose,
  onMemberAdded,
}) => {
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setNickname('');
    setEmail('');
    setPhone('');
    setRole('MEMBER');
    setSelectedColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getInitials = (text: string) => {
    const parts = text.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.[0] || 'M').toUpperCase();
  };

  const handleSave = async (addAnother: boolean) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Full Name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await onMemberAdded(
        {
          groupId,
          name: trimmedName,
          nickname: nickname.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          avatarColor: selectedColor,
        },
        addAnother
      );

      if (addAnother) {
        resetForm();
      } else {
        handleClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to add member to group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Add Group Member</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Adding to {groupName} • No invites or signup needed
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {error && (
              <View style={[styles.errorBox, { backgroundColor: colors.negativeMuted, borderColor: colors.negative }]}>
                <Feather name="alert-circle" size={16} color={colors.negative} />
                <Text style={[styles.errorText, { color: colors.negative }]}>{error}</Text>
              </View>
            )}

            {/* Avatar Preview & Color Selection */}
            <View style={styles.avatarPreviewSection}>
              <View style={[styles.previewAvatar, { backgroundColor: selectedColor }]}>
                <Text style={styles.previewAvatarText}>
                  {getInitials(name || 'New Member')}
                </Text>
              </View>
              <View style={styles.colorPalette}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Avatar Color</Text>
                <View style={styles.colorsRow}>
                  {AVATAR_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setSelectedColor(c)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c },
                        selectedColor === c && styles.selectedColorCircle,
                      ]}
                    >
                      {selectedColor === c && <Feather name="check" size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Full Name <Text style={{ color: colors.negative }}>*</Text>
              </Text>
              <TextInput
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (error) setError(null);
                }}
                placeholder="e.g. Rahul Sharma, Aman Gupta"
                placeholderTextColor={colors.textSubtle}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceAlt,
                    color: colors.text,
                    borderColor: error && !name.trim() ? colors.negative : colors.borderLight,
                  },
                ]}
              />
            </View>

            {/* Nickname */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Nickname or Short Name <Text style={[styles.optional, { color: colors.textMuted }]}>— optional</Text>
              </Text>
              <TextInput
                value={nickname}
                onChangeText={setNickname}
                placeholder="e.g. Rahul, Aman, Roomie"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.borderLight }]}
              />
            </View>

            {/* Role Toggle */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Group Membership Role</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  onPress={() => setRole('MEMBER')}
                  style={[
                    styles.roleChip,
                    {
                      backgroundColor: role === 'MEMBER' ? colors.primary : colors.surfaceAlt,
                      borderColor: role === 'MEMBER' ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <Feather name="user" size={14} color={role === 'MEMBER' ? '#FFFFFF' : colors.text} />
                  <Text style={[styles.roleChipText, { color: role === 'MEMBER' ? '#FFFFFF' : colors.text }]}>
                    Regular Member
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRole('ADMIN')}
                  style={[
                    styles.roleChip,
                    {
                      backgroundColor: role === 'ADMIN' ? colors.primary : colors.surfaceAlt,
                      borderColor: role === 'ADMIN' ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <Feather name="shield" size={14} color={role === 'ADMIN' ? '#FFFFFF' : colors.text} />
                  <Text style={[styles.roleChipText, { color: role === 'ADMIN' ? '#FFFFFF' : colors.text }]}>
                    Group Admin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Phone Number <Text style={[styles.optional, { color: colors.textMuted }]}>— optional</Text>
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. +91 98765 43210"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.borderLight }]}
              />
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Email Address <Text style={[styles.optional, { color: colors.textMuted }]}>— optional</Text>
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. rahul@example.com (optional)"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.borderLight }]}
              />
            </View>

            <View style={[styles.infoBanner, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoBannerText, { color: colors.textMuted }]}>
                This member is saved directly to your local device. They will immediately appear in expense splits, payer choices, and reports.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons: Add & Add Another, and Add & Done */}
          <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
            <Button
              title="Add & Add Another"
              variant="outline"
              size="md"
              leftIcon={<Feather name="user-plus" size={16} color={colors.primary} />}
              onPress={() => handleSave(true)}
              loading={saving}
              style={{ flex: 1, marginRight: Spacing.sm }}
            />
            <Button
              title="Add Member"
              variant="primary"
              size="md"
              leftIcon={<Feather name="check" size={16} color="#FFFFFF" />}
              onPress={() => handleSave(false)}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: Typography.xs,
    marginTop: 2,
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
  avatarPreviewSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  previewAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  previewAvatarText: {
    color: '#FFFFFF',
    fontSize: Typography.lg,
    fontWeight: '700',
  },
  colorPalette: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: Typography.xs,
    marginBottom: 6,
    fontWeight: '600',
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedColorCircle: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  optional: {
    fontWeight: '400',
    fontSize: Typography.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: Typography.base,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
  },
  roleChipText: {
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  infoBannerText: {
    fontSize: Typography.xs,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
});
