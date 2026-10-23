import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar } from '../../src/components/ui/Avatar';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { ConfirmationDialog } from '../../src/components/ui/ConfirmationDialog';
import { useAuth } from '../../src/context/AuthContext';
import { ThemeMode, useTheme } from '../../src/theme/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../../src/theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors, themeMode, setThemeMode, isDark } = useTheme();

  const [currencyPref, setCurrencyPref] = useState('INR');
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    await logout();
    router.replace('/welcome');
  };

  const themeOptions: Array<{ id: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { id: 'light', label: 'Light', icon: 'sunny-outline' },
    { id: 'dark', label: 'Dark', icon: 'moon-outline' },
    { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.title, { color: colors.text }]}>Account & Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Avatar name={user?.name || 'User'} size="lg" />
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'TripMate Explorer'}</Text>
            <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email || 'user@tripmate.app'}</Text>
            {user?.upiId && (
              <View style={[styles.upiBadge, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                <MaterialCommunityIcons name="bank-transfer" size={14} color={colors.positive} />
                <Text style={[styles.upiText, { color: colors.positive }]}>UPI: {user.upiId}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Theme Settings Selector */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>Appearance & Theme</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.themeHeaderRow}>
            <View style={styles.prefLeft}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={20}
                color={colors.primary}
              />
              <View style={{ marginLeft: Spacing.sm }}>
                <Text style={[styles.prefLabel, { color: colors.text }]}>Theme Mode</Text>
                <Text style={[styles.prefSub, { color: colors.textMuted }]}>
                  {themeMode === 'system'
                    ? `Following Device System (${isDark ? 'Dark' : 'Light'})`
                    : themeMode === 'dark'
                    ? 'Permanent Dark Mode'
                    : 'Permanent Light Mode'}
                </Text>
              </View>
            </View>
          </View>

          {/* 3 Theme Segmented Buttons */}
          <View style={[styles.themeSegmentContainer, { backgroundColor: colors.surfaceAlt }]}>
            {themeOptions.map((opt) => {
              const active = themeMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.8}
                  onPress={() => setThemeMode(opt.id)}
                  style={[
                    styles.themeSegmentBtn,
                    active && {
                      backgroundColor: colors.surface,
                      ...Shadows.sm,
                    },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={16}
                    color={active ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.themeSegmentText,
                      {
                        color: active ? colors.primary : colors.textMuted,
                        fontWeight: active ? '700' : '600',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Offline Engine Status */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>Local Persistence & Storage</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={[styles.statusIndicator, { backgroundColor: colors.positive }]} />
              <View>
                <Text style={[styles.cardLabel, { color: colors.text }]}>SQLite Device Database</Text>
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                  Active & Persistent on device • Zero server dependency
                </Text>
              </View>
            </View>
            <Badge label="100% Offline" variant="positive" size="sm" />
          </View>
        </View>

        {/* Currency Preferences */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>Currency Preferences</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <Feather name="globe" size={18} color={colors.primary} />
              <Text style={[styles.prefLabel, { color: colors.text }]}>Base Currency</Text>
            </View>
            <View style={[styles.currencyToggle, { backgroundColor: colors.surfaceAlt }]}>
              {['INR', 'USD', 'EUR'].map((curr) => (
                <TouchableOpacity
                  key={curr}
                  onPress={() => setCurrencyPref(curr)}
                  style={[
                    styles.currBtn,
                    currencyPref === curr && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.currBtnText,
                      {
                        color: currencyPref === curr ? '#FFFFFF' : colors.textMuted,
                        fontWeight: currencyPref === curr ? '700' : '600',
                      },
                    ]}
                  >
                    {curr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* About App */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>About TripMate</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.infoKey, { color: colors.textMuted }]}>Version</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>1.1.0 (Student Edition)</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.infoKey, { color: colors.textMuted }]}>Bill & Document Manager</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>Group-Isolated Repository</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.infoKey, { color: colors.textMuted }]}>Financial Arithmetic</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>Integer Minor Units (Paise)</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          size="lg"
          variant="danger"
          leftIcon={<Feather name="log-out" size={18} color="#FFFFFF" />}
          onPress={() => setLogoutModalVisible(true)}
          style={styles.logoutBtn}
        />
      </ScrollView>

      {/* Logout Confirmation */}
      <ConfirmationDialog
        visible={logoutModalVisible}
        title="Sign Out"
        message="Are you sure you want to sign out of TripMate on this device?"
        confirmText="Sign Out"
        isDestructive
        onConfirm={handleLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 54,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    ...Typography.h1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 110,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    ...Shadows.md,
  },
  profileInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  userName: {
    ...Typography.h2,
  },
  userEmail: {
    ...Typography.body,
    marginTop: 2,
  },
  upiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  upiText: {
    ...Typography.tiny,
    fontWeight: '600',
  },
  sectionHeader: {
    ...Typography.caption,
    fontWeight: '700',
    marginBottom: Spacing.xs + 2,
    marginTop: Spacing.sm,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    ...Shadows.sm,
  },
  themeHeaderRow: {
    marginBottom: Spacing.md,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefLabel: {
    ...Typography.bodyBold,
  },
  prefSub: {
    ...Typography.caption,
    marginTop: 1,
  },
  themeSegmentContainer: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 3,
  },
  themeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  themeSegmentText: {
    ...Typography.caption,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardLabel: {
    ...Typography.bodyBold,
  },
  cardSub: {
    ...Typography.caption,
    marginTop: 1,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  currencyToggle: {
    flexDirection: 'row',
    borderRadius: Radius.sm,
    padding: 2,
  },
  currBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.xs,
  },
  currBtnText: {
    ...Typography.tiny,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  infoKey: {
    ...Typography.body,
  },
  infoValue: {
    ...Typography.bodyBold,
  },
  logoutBtn: {
    marginTop: Spacing.md,
  },
});
