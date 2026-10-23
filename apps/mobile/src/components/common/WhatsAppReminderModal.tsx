import React, { useEffect, useState } from 'react';
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
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { useTheme } from '../../theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../theme/tokens';
import {
  isValidWhatsAppNumber,
  normalizeWhatsAppNumber,
  openWhatsAppChat,
} from '../../utils/whatsapp';

interface WhatsAppReminderModalProps {
  visible: boolean;
  title?: string;
  recipientName: string;
  initialPhoneNumber?: string | null;
  defaultMessage: string;
  onClose: () => void;
  onSavePhoneNumber?: (phone: string) => Promise<void>;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  visible,
  title = 'WhatsApp Reminder',
  recipientName,
  initialPhoneNumber = '',
  defaultMessage,
  onClose,
  onSavePhoneNumber,
}) => {
  const { colors, isDark } = useTheme();
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || '');
  const [message, setMessage] = useState(defaultMessage);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPhoneNumber(initialPhoneNumber || '');
      setMessage(defaultMessage);
      setValidationError(null);
    }
  }, [visible, initialPhoneNumber, defaultMessage]);

  const normalized = normalizeWhatsAppNumber(phoneNumber);
  const isValid = isValidWhatsAppNumber(phoneNumber);

  const handleSend = async () => {
    if (!phoneNumber.trim()) {
      setValidationError('Please enter a WhatsApp phone number');
      return;
    }

    if (!isValid) {
      setValidationError('Please enter a valid phone number with at least 10 digits (e.g. +91 88507 06982)');
      return;
    }

    setValidationError(null);
    setLoading(true);

    try {
      // Save phone number to member profile if callback provided and changed
      if (onSavePhoneNumber && phoneNumber.trim() !== (initialPhoneNumber || '').trim()) {
        try {
          await onSavePhoneNumber(phoneNumber.trim());
        } catch (saveErr) {
          console.warn('Failed to persist member phone number:', saveErr);
        }
      }

      const res = await openWhatsAppChat(phoneNumber, message);
      if (!res.success) {
        Alert.alert('WhatsApp Error', res.error || 'Could not open WhatsApp.');
      } else {
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to open WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              {/* Header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
                <View style={styles.titleRow}>
                  <View style={styles.whatsappIconCircle}>
                    <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                      Recipient: {recipientName || 'Member'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Feather name="x" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollBody}
                keyboardShouldPersistTaps="handled"
              >
                {validationError && (
                  <View
                    style={[
                      styles.errorBanner,
                      { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' },
                    ]}
                  >
                    <Feather name="alert-circle" size={16} color={colors.negative} />
                    <Text style={[styles.errorText, { color: colors.negative }]}>
                      {validationError}
                    </Text>
                  </View>
                )}

                {/* Phone Input */}
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Recipient WhatsApp Number
                </Text>
                <View
                  style={[
                    styles.phoneInputContainer,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: validationError ? colors.negative : colors.border,
                    },
                  ]}
                >
                  <Feather name="phone" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.phoneTextInput, { color: colors.text }]}
                    placeholder="+91 88507 06982"
                    placeholderTextColor={colors.placeholder}
                    value={phoneNumber}
                    onChangeText={(txt) => {
                      setPhoneNumber(txt);
                      setValidationError(null);
                    }}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                  />
                  {isValid && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.positive} />
                  )}
                </View>

                {phoneNumber.trim().length > 0 && (
                  <View style={styles.normalizedRow}>
                    <Text style={[styles.normalizedLabel, { color: colors.textTertiary }]}>
                      Normalized: <Text style={{ fontWeight: '700', color: colors.textSecondary }}>wa.me/{normalized}</Text>
                    </Text>
                  </View>
                )}

                {/* Message Preview */}
                <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>
                  Message Preview
                </Text>
                <View
                  style={[
                    styles.messageContainer,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.borderLight,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.messageInput, { color: colors.text }]}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                    placeholder="Enter reminder message..."
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
                <Text style={[styles.hintText, { color: colors.textTertiary }]}>
                  You can edit the message before opening WhatsApp. Tapping below will launch WhatsApp chat with this message prefilled.
                </Text>
              </ScrollView>

              {/* Actions Footer */}
              <View style={[styles.modalFooter, { borderTopColor: colors.borderLight }]}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  size="md"
                  onPress={onClose}
                  disabled={loading}
                  style={{ flex: 1, marginRight: Spacing.sm }}
                />
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSend}
                  disabled={loading}
                  style={[
                    styles.whatsappSendBtn,
                    loading && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.whatsappSendBtnText}>
                    {loading ? 'Opening...' : 'Open in WhatsApp'}
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Shadows.lg,
    overflow: 'hidden',
  },
  modalHeader: {
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
    flex: 1,
  },
  whatsappIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  modalTitle: {
    ...Typography.h3,
    fontSize: 16,
  },
  modalSubtitle: {
    ...Typography.caption,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  scrollBody: {
    padding: Spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorText: {
    ...Typography.caption,
    flex: 1,
  },
  inputLabel: {
    ...Typography.caption,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 15,
  },
  normalizedRow: {
    marginTop: 4,
    paddingHorizontal: Spacing.xs,
  },
  normalizedLabel: {
    fontSize: 12,
  },
  messageContainer: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    minHeight: 140,
  },
  messageInput: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 120,
  },
  hintText: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  whatsappSendBtn: {
    flex: 1.5,
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    ...Shadows.sm,
  },
  whatsappSendBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
