import React, { useState } from 'react';
import {
  Alert,
  Image,
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
import * as Sharing from 'expo-sharing';
import { GroupDocumentRow } from '../../services/database';
import { useTheme } from '../../theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

interface DocumentViewerModalProps {
  visible: boolean;
  document: GroupDocumentRow | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: any) => Promise<void>;
  onNavigateToExpense?: (expenseId: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  visible,
  document,
  onClose,
  onDelete,
  onUpdate,
  onNavigateToExpense,
}) => {
  const { colors, isDark } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCategory, setEditCategory] = useState<any>('OTHER');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!document) return null;

  const isImage =
    document.mime_type.startsWith('image/') ||
    document.storage_path.endsWith('.jpg') ||
    document.storage_path.endsWith('.png') ||
    document.storage_path.includes('unsplash');

  const startEditing = () => {
    setEditTitle(document.title);
    setEditNotes(document.notes || '');
    setEditCategory(document.category);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Validation Error', 'Document title cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await onUpdate(document.id, {
        title: editTitle.trim(),
        notes: editNotes.trim() || null,
        category: editCategory,
      });
      setIsEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to update document details.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Share', `Document URL: ${document.storage_path}`);
        return;
      }
      await Sharing.shareAsync(document.storage_path, {
        dialogTitle: document.title,
        mimeType: document.mime_type,
      });
    } catch {
      Alert.alert('Sharing Unavailable', `Document URL:\n${document.storage_path}`);
    }
  };

  const categories: Array<GroupDocumentRow['category']> = [
    'FOOD',
    'HOTEL',
    'TRANSPORT',
    'TICKETS',
    'SHOPPING',
    'UTILITIES',
    'OTHER',
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Feather name="x" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {isEditing ? 'Edit Document' : document.title}
          </Text>
          <View style={styles.headerRight}>
            {!isEditing && (
              <>
                <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
                  <Feather name="share-2" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={startEditing} style={styles.iconBtn}>
                  <Feather name="edit-2" size={19} color={colors.primary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Document Preview Box */}
          <View style={[styles.previewContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
            {isImage ? (
              <Image
                source={{ uri: document.storage_path }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.pdfPreview}>
                <MaterialCommunityIcons name="file-pdf-box" size={80} color="#EF4444" />
                <Text style={[styles.pdfLabel, { color: colors.text }]}>{document.original_filename}</Text>
                <Text style={[styles.pdfSub, { color: colors.textMuted }]}>PDF Document (Tap Share to open or export)</Text>
              </View>
            )}
          </View>

          {isEditing ? (
            /* Editing Form */
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="Bill title"
                placeholderTextColor={colors.textSubtle}
              />

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.md }]}>Category</Text>
              <View style={styles.categoryChips}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setEditCategory(cat)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: editCategory === cat ? colors.primary : colors.surfaceAlt,
                        borderColor: editCategory === cat ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: editCategory === cat ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.md }]}>Notes</Text>
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="Optional notes about this bill..."
                placeholderTextColor={colors.textSubtle}
              />

              <View style={styles.editActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setIsEditing(false)}
                  style={{ flex: 1, marginRight: Spacing.sm }}
                />
                <Button
                  title={saving ? 'Saving...' : 'Save Changes'}
                  onPress={handleSaveEdit}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : (
            /* Info Card */
            <>
              <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Category</Text>
                  <View style={[styles.categoryBadge, { backgroundColor: colors.primaryMuted }]}>
                    <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>{document.category}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>File Name</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={1}>
                    {document.original_filename}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>File Size</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {(document.file_size_bytes / 1024).toFixed(1)} KB
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Upload Date</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {new Date(document.uploaded_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                {document.notes && (
                  <View style={[styles.notesBox, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes:</Text>
                    <Text style={[styles.notesText, { color: colors.text }]}>{document.notes}</Text>
                  </View>
                )}

                {/* Linked Expense CTA */}
                {document.expense_id ? (
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      if (onNavigateToExpense) {
                        onNavigateToExpense(document.expense_id!);
                      }
                    }}
                    style={[styles.linkedExpenseCta, { backgroundColor: colors.primaryMuted }]}
                  >
                    <View style={styles.linkedCtaLeft}>
                      <Feather name="file-text" size={18} color={colors.primary} />
                      <View style={{ marginLeft: Spacing.sm }}>
                        <Text style={[styles.linkedCtaTitle, { color: colors.primary }]}>
                          {document.expense_title || 'View Associated Expense'}
                        </Text>
                        <Text style={[styles.linkedCtaSub, { color: colors.textMuted }]}>
                          Tap to view full split breakdown
                        </Text>
                      </View>
                    </View>
                    <Feather name="arrow-right" size={16} color={colors.primary} />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.unlinkedNotice, { backgroundColor: colors.surfaceAlt }]}>
                    <Feather name="info" size={14} color={colors.textMuted} />
                    <Text style={[styles.unlinkedText, { color: colors.textMuted }]}>
                      This document is stored in the group repository and not yet linked to an expense.
                    </Text>
                  </View>
                )}
              </View>

              {/* Delete Button */}
              <TouchableOpacity
                onPress={() => setDeleteConfirmVisible(true)}
                style={[styles.deleteBtn, { borderColor: '#FEE2E2' }]}
              >
                <Feather name="trash-2" size={18} color="#EF4444" />
                <Text style={styles.deleteBtnText}>Delete Document</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          visible={deleteConfirmVisible}
          title="Delete Document"
          message={`Are you sure you want to permanently delete "${document.title}"? This cannot be undone.`}
          confirmText="Delete"
          isDestructive
          onConfirm={async () => {
            setDeleteConfirmVisible(false);
            await onDelete(document.id);
            onClose();
          }}
          onCancel={() => setDeleteConfirmVisible(false)}
        />
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
    ...Typography.h3,
    flex: 1,
    marginHorizontal: Spacing.md,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  previewContainer: {
    width: '100%',
    height: 320,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  pdfPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  pdfLabel: {
    ...Typography.bodyBold,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  pdfSub: {
    ...Typography.caption,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  metaLabel: {
    ...Typography.body,
    fontSize: 13,
  },
  metaValue: {
    ...Typography.bodyBold,
    fontSize: 13,
    maxWidth: '65%',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  categoryBadgeText: {
    ...Typography.tiny,
    fontWeight: '700',
  },
  notesBox: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  notesLabel: {
    ...Typography.caption,
    fontWeight: '700',
    marginBottom: 2,
  },
  notesText: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  linkedExpenseCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  linkedCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  linkedCtaTitle: {
    ...Typography.bodyBold,
    fontSize: 13,
  },
  linkedCtaSub: {
    ...Typography.tiny,
    marginTop: 1,
  },
  unlinkedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm + 2,
    borderRadius: Radius.sm,
    marginTop: Spacing.md,
  },
  unlinkedText: {
    ...Typography.tiny,
    flex: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: {
    color: '#EF4444',
    ...Typography.bodyBold,
  },
  label: {
    ...Typography.caption,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Typography.body,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.tiny,
    fontWeight: '700',
  },
  editActions: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
  },
});
