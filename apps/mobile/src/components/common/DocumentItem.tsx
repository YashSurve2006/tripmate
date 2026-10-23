import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GroupDocumentRow } from '../../services/database';
import { useTheme } from '../../theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../theme/tokens';

interface DocumentItemProps {
  document: GroupDocumentRow;
  onPress: () => void;
  onDelete?: () => void;
}

export const DocumentItem: React.FC<DocumentItemProps> = ({
  document,
  onPress,
}) => {
  const { colors } = useTheme();

  const isImage =
    document.mime_type.startsWith('image/') ||
    document.storage_path.endsWith('.jpg') ||
    document.storage_path.endsWith('.png') ||
    document.storage_path.includes('unsplash');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'FOOD':
        return '#F59E0B'; // Amber
      case 'HOTEL':
        return '#8B5CF6'; // Purple
      case 'TRANSPORT':
        return '#0D9488'; // Teal
      case 'TICKETS':
        return '#EC4899'; // Pink
      case 'SHOPPING':
        return '#3B82F6'; // Blue
      case 'UTILITIES':
        return '#10B981'; // Green
      default:
        return '#64748B'; // Slate
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'FOOD':
        return 'restaurant-outline';
      case 'HOTEL':
        return 'bed-outline';
      case 'TRANSPORT':
        return 'car-outline';
      case 'TICKETS':
        return 'ticket-outline';
      case 'SHOPPING':
        return 'cart-outline';
      case 'UTILITIES':
        return 'flash-outline';
      default:
        return 'document-text-outline';
    }
  };

  const catColor = getCategoryColor(document.category);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
        },
      ]}
    >
      {/* Thumbnail or File Icon */}
      <View style={styles.thumbnailContainer}>
        {isImage ? (
          <Image
            source={{ uri: document.storage_path }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.pdfThumbnail, { backgroundColor: colors.surfaceAlt }]}>
            <MaterialCommunityIcons name="file-pdf-box" size={32} color="#EF4444" />
          </View>
        )}
        <View style={[styles.categoryPill, { backgroundColor: catColor }]}>
          <Ionicons name={getCategoryIcon(document.category) as any} size={11} color="#FFFFFF" />
          <Text style={styles.categoryText}>{document.category}</Text>
        </View>
      </View>

      {/* Info Details */}
      <View style={styles.details}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {document.title}
        </Text>

        <Text style={[styles.filename, { color: colors.textMuted }]} numberOfLines={1}>
          {document.original_filename}
        </Text>

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {formatFileSize(document.file_size_bytes)}
          </Text>
          <Text style={[styles.dot, { color: colors.border }]}>•</Text>
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {new Date(document.uploaded_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </View>

        {/* Linked Expense Badge */}
        {document.expense_id && (
          <View style={[styles.linkedBadge, { backgroundColor: colors.primaryMuted }]}>
            <Feather name="link-2" size={11} color={colors.primary} />
            <Text style={[styles.linkedText, { color: colors.primary }]} numberOfLines={1}>
              {document.expense_title || 'Linked to Expense'}
            </Text>
          </View>
        )}
      </View>

      <Feather name="chevron-right" size={18} color={colors.textSubtle} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm + 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  thumbnailContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
  },
  pdfThumbnail: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPill: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 1,
    borderRadius: 4,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  details: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  title: {
    ...Typography.bodyBold,
    fontSize: 14,
    marginBottom: 2,
  },
  filename: {
    ...Typography.caption,
    fontSize: 11,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.tiny,
    fontSize: 10,
  },
  dot: {
    fontSize: 10,
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    alignSelf: 'flex-start',
  },
  linkedText: {
    ...Typography.tiny,
    fontSize: 10,
    fontWeight: '600',
  },
});
