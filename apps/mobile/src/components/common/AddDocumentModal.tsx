import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
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
import {
  capturePhotoFromCamera,
  pickDocumentFile,
  pickImageFromGallery,
  PickedFile,
} from '../../utils/documentPicker';
import { Button } from '../ui/Button';

interface AddDocumentModalProps {
  visible: boolean;
  groupId: string;
  groupExpenses?: Array<{ id: string; title: string; amountPaise: number }>;
  onClose: () => void;
  onSave: (docData: {
    groupId: string;
    expenseId?: string | null;
    title: string;
    originalFilename: string;
    storagePath: string;
    mimeType: string;
    fileSizeBytes: number;
    category: 'FOOD' | 'HOTEL' | 'TRANSPORT' | 'TICKETS' | 'SHOPPING' | 'UTILITIES' | 'OTHER';
    notes?: string | null;
  }) => Promise<void>;
}

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  visible,
  groupId,
  groupExpenses = [],
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();

  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<
    'FOOD' | 'HOTEL' | 'TRANSPORT' | 'TICKETS' | 'SHOPPING' | 'UTILITIES' | 'OTHER'
  >('OTHER');
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePickGallery = async () => {
    const file = await pickImageFromGallery();
    if (file) {
      setPickedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
      }
    }
  };

  const handlePickCamera = async () => {
    const file = await capturePhotoFromCamera();
    if (file) {
      setPickedFile(file);
      if (!title) {
        setTitle('Receipt Photo ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    }
  };

  const handlePickPdf = async () => {
    const file = await pickDocumentFile();
    if (file) {
      setPickedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
      }
    }
  };

  const handleSave = async () => {
    if (!pickedFile) {
      Alert.alert('File Required', 'Please attach a receipt photo, camera snapshot, or PDF invoice.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please give this document a descriptive title.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        groupId,
        expenseId: selectedExpenseId,
        title: title.trim(),
        originalFilename: pickedFile.name,
        storagePath: pickedFile.uri,
        mimeType: pickedFile.mimeType,
        fileSizeBytes: pickedFile.size,
        category,
        notes: notes.trim() || null,
      });

      // Reset
      setPickedFile(null);
      setTitle('');
      setNotes('');
      setCategory('OTHER');
      setSelectedExpenseId(null);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save document. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const categories: Array<{
    id: 'FOOD' | 'HOTEL' | 'TRANSPORT' | 'TICKETS' | 'SHOPPING' | 'UTILITIES' | 'OTHER';
    label: string;
    icon: string;
  }> = [
    { id: 'FOOD', label: 'Food', icon: 'restaurant' },
    { id: 'HOTEL', label: 'Hotel', icon: 'bed' },
    { id: 'TRANSPORT', label: 'Transport', icon: 'car' },
    { id: 'TICKETS', label: 'Tickets', icon: 'ticket' },
    { id: 'SHOPPING', label: 'Shopping', icon: 'cart' },
    { id: 'UTILITIES', label: 'Utilities', icon: 'flash' },
    { id: 'OTHER', label: 'Other', icon: 'document-text' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Feather name="x" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Add Bill / Receipt</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* File Picker Buttons */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Attach Document</Text>
          {pickedFile ? (
            <View style={[styles.filePickedCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              {pickedFile.mimeType.startsWith('image/') ? (
                <Image source={{ uri: pickedFile.uri }} style={styles.pickedThumbnail} resizeMode="cover" />
              ) : (
                <View style={[styles.pdfPickedIcon, { backgroundColor: colors.surfaceAlt }]}>
                  <MaterialCommunityIcons name="file-pdf-box" size={36} color="#EF4444" />
                </View>
              )}
              <View style={styles.pickedDetails}>
                <Text style={[styles.pickedName, { color: colors.text }]} numberOfLines={1}>
                  {pickedFile.name}
                </Text>
                <Text style={[styles.pickedSize, { color: colors.textMuted }]}>
                  {(pickedFile.size / 1024).toFixed(1)} KB
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPickedFile(null)} style={styles.removeFileBtn}>
                <Feather name="trash-2" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickerRow}>
              <TouchableOpacity
                onPress={handlePickGallery}
                style={[styles.pickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
                  <Feather name="image" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.pickerBtnText, { color: colors.text }]}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePickCamera}
                style={[styles.pickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Feather name="camera" size={20} color="#059669" />
                </View>
                <Text style={[styles.pickerBtnText, { color: colors.text }]}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePickPdf}
                style={[styles.pickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
                  <Feather name="file-text" size={20} color="#DC2626" />
                </View>
                <Text style={[styles.pickerBtnText, { color: colors.text }]}>PDF / File</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Title */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
            Document Title *
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="e.g. Seaside Shack Dinner, Petrol Receipt"
            placeholderTextColor={colors.textSubtle}
          />

          {/* Category Selector */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.lg }]}>Category</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: category === c.id ? colors.primary : colors.surface,
                    borderColor: category === c.id ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={c.icon as any}
                  size={16}
                  color={category === c.id ? '#FFFFFF' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.categoryCardText,
                    { color: category === c.id ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Link to Group Expense (Optional) */}
          {groupExpenses.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
                Link to Existing Expense (Optional)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.expensePickerScroll}>
                <TouchableOpacity
                  onPress={() => setSelectedExpenseId(null)}
                  style={[
                    styles.expenseChip,
                    {
                      backgroundColor: selectedExpenseId === null ? colors.primary : colors.surface,
                      borderColor: selectedExpenseId === null ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.expenseChipText,
                      { color: selectedExpenseId === null ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    Unlinked / Group Repository
                  </Text>
                </TouchableOpacity>

                {groupExpenses.map((exp) => (
                  <TouchableOpacity
                    key={exp.id}
                    onPress={() => setSelectedExpenseId(exp.id)}
                    style={[
                      styles.expenseChip,
                      {
                        backgroundColor: selectedExpenseId === exp.id ? colors.primary : colors.surface,
                        borderColor: selectedExpenseId === exp.id ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.expenseChipText,
                        { color: selectedExpenseId === exp.id ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {exp.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Notes */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
            Notes (Optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Add invoice number, booking code, or details..."
            placeholderTextColor={colors.textSubtle}
          />

          {/* Save Button */}
          <Button
            title={saving ? 'Saving...' : 'Upload & Save Document'}
            onPress={handleSave}
            size="lg"
            leftIcon={<Feather name="check" size={18} color="#FFFFFF" />}
            style={{ marginTop: Spacing.xl }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 54,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    ...Typography.h2,
    fontSize: 18,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  sectionLabel: {
    ...Typography.caption,
    fontWeight: '700',
    marginBottom: Spacing.xs + 2,
    textTransform: 'uppercase',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pickerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    ...Shadows.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  pickerBtnText: {
    ...Typography.tiny,
    fontWeight: '700',
  },
  filePickedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    ...Shadows.sm,
  },
  pickedThumbnail: {
    width: 50,
    height: 50,
    borderRadius: Radius.sm,
  },
  pdfPickedIcon: {
    width: 50,
    height: 50,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickedDetails: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  pickedName: {
    ...Typography.bodyBold,
    fontSize: 14,
  },
  pickedSize: {
    ...Typography.tiny,
    marginTop: 2,
  },
  removeFileBtn: {
    padding: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Typography.body,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  categoryCardText: {
    ...Typography.tiny,
    fontWeight: '700',
  },
  expensePickerScroll: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  expenseChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  expenseChipText: {
    ...Typography.tiny,
    fontWeight: '600',
  },
});
