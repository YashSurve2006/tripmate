import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../src/components/ui/Button';
import { useTheme } from '../src/theme/ThemeContext';
import { Radius, Spacing, Typography } from '../src/theme/tokens';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Gradient Hero */}
      <LinearGradient
        colors={['#7C3AED', '#4F46E5', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSection}
      >
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.logoImage}
          resizeMode="cover"
        />
        <Text style={styles.brandTitle}>TripMate</Text>
        <Text style={styles.brandSubtitle}>
          Shared expenses & epic trips, sorted with zero friction.
        </Text>
      </LinearGradient>

      {/* Feature Highlights */}
      <View style={styles.featuresSection}>
        <View style={styles.featureRow}>
          <View
            style={[
              styles.featureIconBox,
              { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.25)' : '#EDE9FE' },
            ]}
          >
            <Feather name="users" size={20} color={colors.primary} />
          </View>
          <View style={styles.featureTextCol}>
            <Text style={[styles.featureHeading, { color: colors.text }]}>Trips & Roommates</Text>
            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
              Track hostel rent, road trips, and cafe runs in separate groups.
            </Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <View
            style={[
              styles.featureIconBox,
              { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#D1FAE5' },
            ]}
          >
            <MaterialCommunityIcons name="calculator-variant" size={20} color={colors.positiveDark} />
          </View>
          <View style={styles.featureTextCol}>
            <Text style={[styles.featureHeading, { color: colors.text }]}>Exact Paise Precision</Text>
            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
              100% mathematically balanced splits without rounding errors.
            </Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <View
            style={[
              styles.featureIconBox,
              { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#EFF6FF' },
            ]}
          >
            <MaterialCommunityIcons name="folder-text-outline" size={20} color={colors.teal} />
          </View>
          <View style={styles.featureTextCol}>
            <Text style={[styles.featureHeading, { color: colors.text }]}>Bills & Receipts Vault</Text>
            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
              Organize group-specific bills, invoices, and ticket PDFs offline.
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <Button
          title="Get Started"
          size="lg"
          variant="primary"
          onPress={() => router.push('/auth/register')}
          style={styles.actionBtn}
        />
        <Button
          title="I already have an account"
          size="md"
          variant="ghost"
          onPress={() => router.push('/auth/login')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    paddingTop: 80,
    paddingBottom: 48,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  logoImage: {
    width: 84,
    height: 84,
    borderRadius: 24,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  brandTitle: {
    ...Typography.hero,
    color: '#FFFFFF',
    fontSize: 34,
    marginBottom: Spacing.xs,
  },
  brandSubtitle: {
    ...Typography.bodyLarge,
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'center',
    maxWidth: 280,
  },
  featuresSection: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  featureTextCol: {
    flex: 1,
  },
  featureHeading: {
    ...Typography.bodyBold,
    fontSize: 16,
  },
  featureDesc: {
    ...Typography.caption,
    marginTop: 2,
  },
  actionsSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
    gap: Spacing.xs,
  },
  actionBtn: {
    marginBottom: Spacing.xs,
  },
});
