import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar } from '../src/components/ui/Avatar';
import { Badge } from '../src/components/ui/Badge';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { useAuth } from '../src/context/AuthContext';
import { api, GroupDocumentRow } from '../src/services/api';
import { useTheme } from '../src/theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../src/theme/tokens';
import {
  capturePhotoFromCamera,
  pickDocumentFile,
  pickImageFromGallery,
  PickedFile,
} from '../src/utils/documentPicker';
import {
  calculateEqualSplit,
  formatCurrency,
  parseAmountToPaise,
  validateCustomSplit,
} from '../src/utils/finance';


const CATEGORIES = [
  { key: 'FOOD_AND_DRINK', label: 'Food', icon: 'silverware-fork-knife', color: '#EA580C' },
  { key: 'TRANSPORT', label: 'Transport', icon: 'car-multiple', color: '#2563EB' },
  { key: 'ACCOMMODATION', label: 'Stay', icon: 'bed', color: '#7C3AED' },
  { key: 'ENTERTAINMENT', label: 'Fun', icon: 'movie-open', color: '#DB2777' },
  { key: 'SHOPPING', label: 'Shopping', icon: 'shopping', color: '#059669' },
  { key: 'GROCERIES', label: 'Groceries', icon: 'cart-outline', color: '#16A34A' },
  { key: 'FLIGHTS', label: 'Flights', icon: 'airplane', color: '#0284C7' },
  { key: 'UTILITIES', label: 'Bills', icon: 'lightning-bolt', color: '#D97706' },
  { key: 'OTHER', label: 'Other', icon: 'tag-outline', color: '#64748B' },
] as const;

function mapExpenseCategoryToDocCategory(
  cat: string
): 'FOOD' | 'HOTEL' | 'TRANSPORT' | 'TICKETS' | 'SHOPPING' | 'UTILITIES' | 'OTHER' {
  switch (cat) {
    case 'FOOD_AND_DRINK':
    case 'GROCERIES':
      return 'FOOD';
    case 'ACCOMMODATION':
      return 'HOTEL';
    case 'TRANSPORT':
    case 'FLIGHTS':
      return 'TRANSPORT';
    case 'ENTERTAINMENT':
      return 'TICKETS';
    case 'SHOPPING':
      return 'SHOPPING';
    case 'UTILITIES':
      return 'UTILITIES';
    default:
      return 'OTHER';
  }
}

export default function AddExpenseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { defaultGroupId } = useLocalSearchParams<{ defaultGroupId?: string }>();

  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<string>('FOOD_AND_DRINK');
  const [payerId, setPayerId] = useState<string>('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Split Method: EQUAL or CUSTOM
  const [splitMethod, setSplitMethod] = useState<'EQUAL' | 'CUSTOM'>('EQUAL');
  const [customShares, setCustomShares] = useState<Record<string, string>>({});


  // Group documents state & attached receipt
  const [groupDocs, setGroupDocs] = useState<GroupDocumentRow[]>([]);
  const [attachedDoc, setAttachedDoc] = useState<GroupDocumentRow | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PickedFile | null>(null);
  const [showDocPicker, setShowDocPicker] = useState(false);

  useEffect(() => {
    async function init() {
      const gList = await api.getGroups();
      setGroups(gList);
      const initialGroup = defaultGroupId
        ? gList.find((g: any) => g.id === defaultGroupId) || gList[0]
        : gList[0];

      if (initialGroup) {
        setSelectedGroupId(initialGroup.id);
        const activeMembers = (initialGroup.members || []).filter((m: any) => m.isActive !== false);
        const memberIds = activeMembers.map((m: any) => m.userId || m.id);
        setParticipantIds(memberIds);
        setPayerId(user?.id || memberIds[0]);
        loadGroupDocs(initialGroup.id);
      }
    }
    init();
  }, [defaultGroupId, user]);

  const loadGroupDocs = async (groupId: string) => {
    try {
      const docs = await api.getDocuments(groupId);
      setGroupDocs(docs);
    } catch {
      // ignore
    }
  };

  const activeGroup = groups.find((g) => g.id === selectedGroupId);
  const groupMembers = (activeGroup?.members || []).filter((m: any) => m.isActive !== false);

  const handleGroupChange = (grpId: string) => {
    setSelectedGroupId(grpId);
    setAttachedDoc(null);
    setPendingUpload(null);
    loadGroupDocs(grpId);
    const grp = groups.find((g) => g.id === grpId);
    if (grp) {
      const activeMembers = (grp.members || []).filter((m: any) => m.isActive !== false);
      const memberIds = activeMembers.map((m: any) => m.userId || m.id);
      setParticipantIds(memberIds);
      setPayerId(user?.id || memberIds[0]);
    }
  };

  const toggleParticipant = (memberId: string) => {
    if (participantIds.includes(memberId)) {
      if (participantIds.length === 1) {
        setError('At least one participant is required');
        return;
      }
      setParticipantIds(participantIds.filter((id) => id !== memberId));
    } else {
      setParticipantIds([...participantIds, memberId]);
    }
    setError(null);
  };

  // Document attachment helpers
  const handlePickGallery = async () => {
    const file = await pickImageFromGallery();
    if (file) {
      setPendingUpload(file);
      setAttachedDoc(null);
      setShowDocPicker(false);
    }
  };

  const handleCaptureCamera = async () => {
    const file = await capturePhotoFromCamera();
    if (file) {
      setPendingUpload(file);
      setAttachedDoc(null);
      setShowDocPicker(false);
    }
  };

  const handlePickPdf = async () => {
    const file = await pickDocumentFile();
    if (file) {
      setPendingUpload(file);
      setAttachedDoc(null);
      setShowDocPicker(false);
    }
  };

  const handleSelectExistingDoc = (doc: GroupDocumentRow) => {
    setAttachedDoc(doc);
    setPendingUpload(null);
    setShowDocPicker(false);
  };

  const removeAttachedReceipt = () => {
    setAttachedDoc(null);
    setPendingUpload(null);
  };

  // Live minor units calculation & equal split preview
  const amountPaise = parseAmountToPaise(amountStr);
  const equalSplits = calculateEqualSplit(amountPaise, participantIds);

  // Custom split shares calculation & validation
  const customSplitShares: { userId: string; amountPaise: number }[] = groupMembers.map((m: any) => {
    const mId = m.userId || m.id;
    const inputVal = customShares[mId] !== undefined ? customShares[mId] : '';
    const paise = parseAmountToPaise(inputVal);
    return { userId: mId, amountPaise: paise };
  });

  const customValidation = validateCustomSplit(amountPaise, customSplitShares);

  const handleSplitMethodChange = (method: 'EQUAL' | 'CUSTOM') => {
    setSplitMethod(method);
    setError(null);
    if (method === 'CUSTOM') {
      const currentPaise = parseAmountToPaise(amountStr);
      if (currentPaise > 0) {
        const membersToSplit = participantIds.length > 0 ? participantIds : groupMembers.map((m: any) => m.userId || m.id);
        const eq = calculateEqualSplit(currentPaise, membersToSplit);
        const initial: Record<string, string> = {};
        for (const s of eq) {
          initial[s.userId] = (s.amountPaise / 100).toFixed(2);
        }
        setCustomShares(initial);
      }
    }
  };

  const handleCustomShareChange = (memberId: string, val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    setCustomShares((prev) => ({
      ...prev,
      [memberId]: sanitized,
    }));
    setError(null);
  };

  const splitRemainingEvenly = () => {
    const currentPaise = parseAmountToPaise(amountStr);
    if (currentPaise <= 0 || groupMembers.length === 0) return;
    const allMemberIds = groupMembers.map((m: any) => m.userId || m.id);
    const eq = calculateEqualSplit(currentPaise, allMemberIds);
    const updated: Record<string, string> = {};
    for (const s of eq) {
      updated[s.userId] = (s.amountPaise / 100).toFixed(2);
    }
    setCustomShares(updated);
  };

  const resetAllCustomSharesToZero = () => {
    const updated: Record<string, string> = {};
    for (const m of groupMembers) {
      const mId = m.userId || m.id;
      updated[mId] = '0.00';
    }
    setCustomShares(updated);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter an expense description');
      return;
    }
    if (amountPaise <= 0) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }
    if (!selectedGroupId) {
      setError('Please select a group');
      return;
    }
    if (splitMethod === 'EQUAL' && participantIds.length === 0) {
      setError('Please select at least one participant');
      return;
    }

    if (splitMethod === 'CUSTOM') {
      if (!customValidation.isValid) {
        setError(customValidation.error || 'Total allocated amount must equal the expense total.');
        return;
      }
    }

    setError(null);
    setLoading(true);
    try {
      const payerObj = groupMembers.find(
        (m: any) => (m.userId || m.id) === payerId
      );

      let docIdToLink = attachedDoc?.id;

      // If pending upload, create document first in SQLite
      if (pendingUpload) {
        const createdDoc = await api.createDocument({
          groupId: selectedGroupId,
          title: title.trim() || pendingUpload.name,
          originalFilename: pendingUpload.name,
          storagePath: pendingUpload.uri,
          mimeType: pendingUpload.mimeType,
          fileSizeBytes: pendingUpload.size,
          category: mapExpenseCategoryToDocCategory(category),
          notes: notes.trim() || undefined,
        });
        docIdToLink = createdDoc.id;
      }

      const effectiveParticipants =
        splitMethod === 'CUSTOM'
          ? customSplitShares.filter((s) => s.amountPaise > 0).map((s) => s.userId)
          : participantIds;

      await api.createExpense({
        groupId: selectedGroupId,
        title: title.trim(),
        amountPaise,
        currency: activeGroup?.currency || 'INR',
        category,
        date: new Date().toISOString(),
        payerId,
        payerName: payerObj?.name || 'You',
        participants: effectiveParticipants.length > 0 ? effectiveParticipants : participantIds,
        splitType: splitMethod,
        customSplits: splitMethod === 'CUSTOM' ? customSplitShares : undefined,
        notes: notes.trim() || undefined,
        attachedDocId: docIdToLink,
      });

      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to save expense');
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
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel="Close form">
          <Feather name="x" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Expense</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
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

        {/* Group Selector Chips */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Select Group</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.groupChips}
        >
          {groups.map((g) => {
            const isSelected = g.id === selectedGroupId;
            return (
              <TouchableOpacity
                key={g.id}
                activeOpacity={0.7}
                onPress={() => handleGroupChange(g.id)}
                accessibilityLabel={`Group ${g.name}`}
                style={[
                  styles.groupChip,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(124, 58, 237, 0.25)'
                        : colors.primaryMuted
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.groupChipText,
                    {
                      color: isSelected
                        ? isDark
                          ? colors.primaryLight
                          : colors.primaryDark
                        : colors.textSecondary,
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {g.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Amount Input — Unified Currency Container */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Amount *</Text>
        <View
          style={[
            styles.amountBox,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
              borderColor: error && !amountStr ? colors.negative : (isDark ? colors.border : colors.borderLight),
            },
          ]}
        >
          <Text style={[styles.currencySymbol, { color: colors.primary }]}>₹</Text>
          <View style={[styles.amountDivider, { backgroundColor: isDark ? colors.border : colors.borderLight }]} />
          <TextInput
            placeholder="0.00"
            placeholderTextColor={colors.placeholder}
            value={amountStr}
            onChangeText={(t) => {
              setAmountStr(t);
              setError(null);
            }}
            keyboardType="decimal-pad"
            style={[styles.amountInput, { color: colors.text }]}
            selectionColor={colors.primary}
            accessibilityLabel="Expense amount in Rupees"
          />
        </View>

        {/* Title / Description */}
        <Input
          label="Expense Description *"
          placeholder="e.g. Dinner at Fisherman's Wharf, Uber, Groceries"
          placeholderTextColor={colors.placeholder}
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            setError(null);
          }}
          leftIcon={<Feather name="edit-3" size={18} color={colors.textTertiary} />}
        />

        {/* Category Picker */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                activeOpacity={0.7}
                onPress={() => setCategory(cat.key)}
                style={[
                  styles.catItem,
                  isSelected && {
                    backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : '#F5F3FF',
                  },
                ]}
              >
                <View
                  style={[
                    styles.catIconCircle,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark
                        ? colors.surfaceElevated
                        : '#F1F5F9',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={cat.icon as any}
                    size={20}
                    color={isSelected ? '#FFFFFF' : cat.color}
                  />
                </View>
                <Text
                  style={[
                    styles.catLabel,
                    {
                      color: isSelected ? colors.primary : colors.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Payer Selection */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Paid By</Text>
        <View style={styles.payerRow}>
          {groupMembers.map((m: any) => {
            const mId = m.userId || m.id;
            const isSelected = payerId === mId;
            return (
              <TouchableOpacity
                key={mId}
                activeOpacity={0.8}
                onPress={() => setPayerId(mId)}
                style={[
                  styles.memberSelectChip,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(124, 58, 237, 0.25)'
                        : colors.primaryMuted
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Avatar name={m.name} size="xs" />
                <Text
                  style={[
                    styles.memberSelectText,
                    {
                      color: isSelected
                        ? isDark
                          ? colors.primaryLight
                          : colors.primaryDark
                        : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {m.name} {mId === user?.id ? '(You)' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Split Method Segmented Selector */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Split Method
        </Text>
        <View style={[styles.splitMethodTabs, { backgroundColor: colors.surfaceAlt }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSplitMethodChange('EQUAL')}
            style={[
              styles.splitMethodTab,
              splitMethod === 'EQUAL' && [
                styles.splitMethodTabActive,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
              ],
            ]}
          >
            <MaterialCommunityIcons
              name="equal"
              size={18}
              color={splitMethod === 'EQUAL' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.splitMethodTabText,
                {
                  color: splitMethod === 'EQUAL' ? colors.primary : colors.textMuted,
                  fontWeight: splitMethod === 'EQUAL' ? '700' : '500',
                },
              ]}
            >
              Equal Split
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSplitMethodChange('CUSTOM')}
            style={[
              styles.splitMethodTab,
              splitMethod === 'CUSTOM' && [
                styles.splitMethodTabActive,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
              ],
            ]}
          >
            <MaterialCommunityIcons
              name="calculator"
              size={18}
              color={splitMethod === 'CUSTOM' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.splitMethodTabText,
                {
                  color: splitMethod === 'CUSTOM' ? colors.primary : colors.textMuted,
                  fontWeight: splitMethod === 'CUSTOM' ? '700' : '500',
                },
              ]}
            >
              Custom Amount
            </Text>
          </TouchableOpacity>
        </View>

        {/* EQUAL SPLIT: PARTICIPANTS CHECKBOXES */}
        {splitMethod === 'EQUAL' ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.sm }]}>
              Split With ({participantIds.length} members)
            </Text>
            <View style={styles.participantsGrid}>
              {groupMembers.map((m: any) => {
                const mId = m.userId || m.id;
                const isSelected = participantIds.includes(mId);
                return (
                  <TouchableOpacity
                    key={mId}
                    activeOpacity={0.7}
                    onPress={() => toggleParticipant(mId)}
                    style={[
                      styles.participantBox,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(124, 58, 237, 0.18)'
                            : '#F5F3FF'
                          : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={isSelected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                      size={18}
                      color={isSelected ? colors.primary : colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.participantName,
                        {
                          color: isSelected
                            ? isDark
                              ? colors.primaryLight
                              : colors.primaryDark
                            : colors.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {m.name} {mId === user?.id ? '(You)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          /* CUSTOM AMOUNT SPLIT INTERFACE */
          <View
            style={[
              styles.customSplitContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            {/* Header: Total, Allocated, Remaining */}
            <View style={[styles.customSplitSummary, { backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.customSplitCol}>
                <Text style={[styles.customSplitLabel, { color: colors.textMuted }]}>Total Bill</Text>
                <Text style={[styles.customSplitVal, { color: colors.text }]}>
                  {formatCurrency(amountPaise, activeGroup?.currency || 'INR')}
                </Text>
              </View>
              <View style={[styles.customSplitDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.customSplitCol}>
                <Text style={[styles.customSplitLabel, { color: colors.textMuted }]}>Allocated</Text>
                <Text style={[styles.customSplitVal, { color: colors.text }]}>
                  {formatCurrency(customValidation.allocatedPaise, activeGroup?.currency || 'INR')}
                </Text>
              </View>
              <View style={[styles.customSplitDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.customSplitCol}>
                <Text style={[styles.customSplitLabel, { color: colors.textMuted }]}>Remaining</Text>
                <Text
                  style={[
                    styles.customSplitVal,
                    {
                      color:
                        customValidation.status === 'BALANCED'
                          ? colors.positive
                          : customValidation.status === 'OVER_ALLOCATED'
                          ? colors.negative
                          : colors.warning,
                    },
                  ]}
                >
                  {formatCurrency(customValidation.remainingPaise, activeGroup?.currency || 'INR')}
                </Text>
              </View>
            </View>

            {/* Status Badge & Quick Tools */}
            <View style={styles.customSplitStatusBar}>
              <Badge
                label={
                  customValidation.status === 'BALANCED'
                    ? '✓ Balanced'
                    : customValidation.status === 'OVER_ALLOCATED'
                    ? `Over-allocated by ${formatCurrency(Math.abs(customValidation.remainingPaise), 'INR')}`
                    : `Remaining: ${formatCurrency(customValidation.remainingPaise, 'INR')}`
                }
                variant={
                  customValidation.status === 'BALANCED'
                    ? 'positive'
                    : customValidation.status === 'OVER_ALLOCATED'
                    ? 'negative'
                    : 'warning'
                }
              />

              <View style={styles.customToolsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={splitRemainingEvenly}
                  style={[styles.customToolBtn, { backgroundColor: colors.surfaceAlt }]}
                >
                  <Text style={[styles.customToolBtnText, { color: colors.primary }]}>Split Evenly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={resetAllCustomSharesToZero}
                  style={[styles.customToolBtn, { backgroundColor: colors.surfaceAlt }]}
                >
                  <Text style={[styles.customToolBtnText, { color: colors.textMuted }]}>Reset to ₹0</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Member Input Rows */}
            <View style={styles.customMembersList}>
              {groupMembers.map((m: any, mIdx: number) => {
                const mId = m.userId || m.id;
                const currentVal = customShares[mId] !== undefined ? customShares[mId] : '';
                return (
                  <View
                    key={mId}
                    style={[
                      styles.customMemberRow,
                      mIdx < groupMembers.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.borderLight,
                      },
                    ]}
                  >
                    <Avatar name={m.name} size="sm" />
                    <View style={styles.customMemberInfo}>
                      <Text style={[styles.customMemberName, { color: colors.text }]} numberOfLines={1}>
                        {m.name} {mId === user?.id ? '(You)' : ''}
                      </Text>
                    </View>

                    {/* Quick ₹0 button */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleCustomShareChange(mId, '0.00')}
                      style={[styles.quickZeroBtn, { backgroundColor: colors.surfaceAlt }]}
                    >
                      <Text style={[styles.quickZeroText, { color: colors.textMuted }]}>₹0</Text>
                    </TouchableOpacity>

                    {/* Amount Input */}
                    <View
                      style={[
                        styles.customInputWrap,
                        {
                          backgroundColor: colors.surfaceAlt,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.customCurrencyPrefix, { color: colors.textMuted }]}>₹</Text>
                      <TextInput
                        style={[styles.customShareInput, { color: colors.text }]}
                        value={currentVal}
                        onChangeText={(txt) => handleCustomShareChange(mId, txt)}
                        placeholder="0.00"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}


        {/* Notes (Optional) */}
        <Input
          label="Notes / Location (Optional)"
          placeholder="e.g. Table 4, invoice #1042, split on cash"
          placeholderTextColor={colors.placeholder}
          value={notes}
          onChangeText={setNotes}
          leftIcon={<Feather name="file-text" size={18} color={colors.textTertiary} />}
        />

        {/* Attach Receipt / Bill Section */}
        <View style={styles.receiptSectionHeader}>
          <Text style={[styles.sectionLabel, { marginBottom: 0, marginTop: 0, color: colors.textSecondary }]}>
            Receipt / Bill (Optional)
          </Text>
          {(attachedDoc || pendingUpload) && (
            <TouchableOpacity onPress={removeAttachedReceipt} style={styles.detachBtn}>
              <Feather name="trash-2" size={14} color={colors.negative} />
              <Text style={[styles.detachBtnText, { color: colors.negative }]}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Current Attached Receipt Display */}
        {pendingUpload ? (
          <View
            style={[
              styles.attachedReceiptCard,
              {
                backgroundColor: isDark ? colors.surfaceElevated : '#F8FAFC',
                borderColor: colors.borderLight,
              },
            ]}
          >
            {pendingUpload.mimeType.startsWith('image/') ? (
              <Image source={{ uri: pendingUpload.uri }} style={styles.attachedThumbnail} />
            ) : (
              <View
                style={[
                  styles.pdfThumbnail,
                  { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' },
                ]}
              >
                <Feather name="file-text" size={24} color="#EF4444" />
              </View>
            )}
            <View style={styles.attachedMeta}>
              <Text style={[styles.attachedTitle, { color: colors.text }]} numberOfLines={1}>
                {pendingUpload.name}
              </Text>
              <Text style={[styles.attachedSub, { color: colors.textTertiary }]}>
                Ready to upload on save • {(pendingUpload.size / 1024).toFixed(0)} KB
              </Text>
            </View>
          </View>
        ) : attachedDoc ? (
          <View
            style={[
              styles.attachedReceiptCard,
              {
                backgroundColor: isDark ? colors.surfaceElevated : '#F8FAFC',
                borderColor: colors.borderLight,
              },
            ]}
          >
            {attachedDoc.mime_type.startsWith('image/') ? (
              <Image source={{ uri: attachedDoc.storage_path }} style={styles.attachedThumbnail} />
            ) : (
              <View
                style={[
                  styles.pdfThumbnail,
                  { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' },
                ]}
              >
                <Feather name="file-text" size={24} color="#EF4444" />
              </View>
            )}
            <View style={styles.attachedMeta}>
              <Text style={[styles.attachedTitle, { color: colors.text }]} numberOfLines={1}>
                {attachedDoc.title}
              </Text>
              <Text style={[styles.attachedSub, { color: colors.textTertiary }]}>
                Existing Group Doc • {attachedDoc.category}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.docActionsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePickGallery}
              style={[
                styles.docActionBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name="image" size={16} color={colors.primary} />
              <Text style={[styles.docActionText, { color: colors.text }]}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCaptureCamera}
              style={[
                styles.docActionBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name="camera" size={16} color={colors.primary} />
              <Text style={[styles.docActionText, { color: colors.text }]}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePickPdf}
              style={[
                styles.docActionBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name="file" size={16} color={colors.primary} />
              <Text style={[styles.docActionText, { color: colors.text }]}>PDF</Text>
            </TouchableOpacity>

            {groupDocs.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowDocPicker(!showDocPicker)}
                style={[
                  styles.docActionBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Feather name="folder" size={16} color={colors.teal} />
                <Text style={[styles.docActionText, { color: colors.text }]}>Group Docs</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Existing Group Documents Drawer */}
        {showDocPicker && !attachedDoc && !pendingUpload && (
          <View
            style={[
              styles.existingDocsBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Text style={[styles.existingDocsHeader, { color: colors.textSecondary }]}>
              Select from Group Documents ({groupDocs.length}):
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.sm }}
            >
              {groupDocs.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectExistingDoc(doc)}
                  style={[
                    styles.existingDocCard,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : '#F1F5F9',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Feather
                    name={doc.mime_type.startsWith('image/') ? 'image' : 'file-text'}
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.existingDocTitle, { color: colors.text }]} numberOfLines={1}>
                    {doc.title}
                  </Text>
                  <Text style={[styles.existingDocCat, { color: colors.textTertiary }]}>
                    {doc.category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Split Preview with Exact Paise Calculation */}
        {amountPaise > 0 && (
          <View
            style={[
              styles.splitPreviewCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <View
              style={[
                styles.splitPreviewHeader,
                { borderBottomColor: colors.borderLight },
              ]}
            >
              <Text style={[styles.splitPreviewTitle, { color: colors.textSecondary }]}>
                {splitMethod === 'EQUAL' ? 'Equal Split Breakdown' : 'Custom Split Allocation'}
              </Text>
              <Text style={[styles.splitPreviewTotal, { color: colors.primary }]}>
                Total: {formatCurrency(amountPaise, 'INR')}
              </Text>
            </View>

            {splitMethod === 'EQUAL' ? (
              equalSplits.map((s) => {
                const memberObj = groupMembers.find(
                  (m: any) => (m.userId || m.id) === s.userId
                );
                return (
                  <View key={s.userId} style={styles.splitPreviewRow}>
                    <Text style={[styles.splitMemberName, { color: colors.text }]}>
                      {memberObj?.name || s.userId}
                    </Text>
                    <Text style={[styles.splitMemberShare, { color: colors.text }]}>
                      {formatCurrency(s.amountPaise, 'INR')}
                    </Text>
                  </View>
                );
              })
            ) : (
              customSplitShares.map((s) => {
                const memberObj = groupMembers.find(
                  (m: any) => (m.userId || m.id) === s.userId
                );
                return (
                  <View key={s.userId} style={styles.splitPreviewRow}>
                    <Text style={[styles.splitMemberName, { color: colors.text }]}>
                      {memberObj?.name || s.userId}
                    </Text>
                    <Text
                      style={[
                        styles.splitMemberShare,
                        { color: s.amountPaise > 0 ? colors.text : colors.textMuted },
                      ]}
                    >
                      {formatCurrency(s.amountPaise, 'INR')}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}


        <View style={styles.saveBtnWrapper}>
          <Button
            title={loading ? 'Saving Expense...' : 'Save Expense'}
            size="lg"
            variant="primary"
            loading={loading}
            onPress={handleSave}
            style={styles.saveBtn}
          />
        </View>
      </ScrollView>
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
  closeBtn: {
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
    padding: Spacing.lg,
    paddingBottom: 100,
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
    marginTop: Spacing.sm,
  },
  groupChips: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  groupChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  groupChipText: {
    ...Typography.caption,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    minHeight: 56,
    paddingHorizontal: Spacing.md,
  },
  currencySymbol: {
    fontSize: 26,
    fontWeight: '700',
    marginRight: Spacing.sm,
    letterSpacing: -0.5,
  },
  amountDivider: {
    width: 1,
    height: 28,
    marginRight: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '700',
    paddingVertical: 10,
    letterSpacing: -0.5,
  },
  categoryScroll: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  catItem: {
    alignItems: 'center',
    padding: 6,
    borderRadius: Radius.md,
  },
  catIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  catLabel: {
    ...Typography.tiny,
  },
  payerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  memberSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  memberSelectText: {
    ...Typography.caption,
  },
  participantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  participantBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
  },
  participantName: {
    ...Typography.caption,
  },
  receiptSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs + 2,
  },
  detachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detachBtnText: {
    ...Typography.tiny,
    fontWeight: '600',
  },
  docActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  docActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  docActionText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  attachedReceiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  attachedThumbnail: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
  },
  pdfThumbnail: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedMeta: {
    flex: 1,
  },
  attachedTitle: {
    ...Typography.caption,
    fontWeight: '700',
  },
  attachedSub: {
    ...Typography.tiny,
    marginTop: 2,
  },
  existingDocsBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  existingDocsHeader: {
    ...Typography.tiny,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  existingDocCard: {
    width: 100,
    padding: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  existingDocTitle: {
    ...Typography.tiny,
    fontWeight: '600',
    textAlign: 'center',
  },
  existingDocCat: {
    fontSize: 9,
  },
  splitPreviewCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  splitPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  splitPreviewTitle: {
    ...Typography.tiny,
    fontWeight: '700',
  },
  splitPreviewTotal: {
    ...Typography.tiny,
    fontWeight: '700',
  },
  splitPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  splitMemberName: {
    ...Typography.caption,
  },
  splitMemberShare: {
    ...Typography.caption,
    fontWeight: '600',
  },
  saveBtnWrapper: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  saveBtn: {},
  splitMethodTabs: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.md,
  },
  splitMethodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: Radius.sm,
    gap: 6,
  },
  splitMethodTabActive: {
    borderWidth: 1,
    ...Shadows.sm,
  },
  splitMethodTabText: {
    fontSize: 13,
  },
  customSplitContainer: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  customSplitSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  customSplitCol: {
    flex: 1,
    alignItems: 'center',
  },
  customSplitDivider: {
    width: 1,
    height: 24,
  },
  customSplitLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  customSplitVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  customSplitStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  customToolsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  customToolBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  customToolBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  customMembersList: {
    paddingHorizontal: Spacing.md,
  },
  customMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  customMemberInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
    marginRight: Spacing.xs,
  },
  customMemberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickZeroBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    marginRight: 6,
  },
  quickZeroText: {
    fontSize: 11,
    fontWeight: '700',
  },
  customInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    width: 110,
    height: 38,
  },
  customCurrencyPrefix: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  customShareInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 0,
  },
});

