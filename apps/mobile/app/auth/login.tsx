import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { Radius, Spacing, Typography } from '../../src/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors, isDark } = useTheme();

  const [email, setEmail] = useState('yash@tripmate.app');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please provide your email and password');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('yash@tripmate.app');
    setPassword('password123');
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <View
            style={[
              styles.brandIconBox,
              { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.25)' : colors.primaryMuted },
            ]}
          >
            <MaterialCommunityIcons name="wallet-travel" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to check your balances and recent group expenses.
          </Text>
        </View>

        {/* Standalone Status indicator */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: colors.positive },
            ]}
          />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Standalone Mode: Local SQLite database active (No server needed)
          </Text>
        </View>

        {/* Error message */}
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

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Email Address"
            placeholder="yash@tripmate.app"
            placeholderTextColor={colors.placeholder}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Feather name="mail" size={18} color={colors.textTertiary} />}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            placeholderTextColor={colors.placeholder}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError(null);
            }}
            secureTextEntry={!showPassword}
            leftIcon={<Feather name="lock" size={18} color={colors.textTertiary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            }
          />

          {/* Quick Demo Fill button */}
          <TouchableOpacity onPress={handleFillDemo} style={styles.demoFillBtn}>
            <Feather name="zap" size={14} color={colors.primary} />
            <Text style={[styles.demoFillText, { color: colors.primary }]}>Quick-fill Demo Credentials</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            size="lg"
            variant="primary"
            loading={loading}
            onPress={handleLogin}
            style={styles.submitBtn}
          />

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingTop: 60,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  brandIconBox: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.hero,
    fontSize: 26,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
    gap: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...Typography.tiny,
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
  form: {
    marginTop: Spacing.sm,
  },
  demoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: Spacing.lg,
    paddingVertical: 4,
  },
  demoFillText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  submitBtn: {
    marginBottom: Spacing.lg,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...Typography.body,
  },
  footerLink: {
    ...Typography.bodyBold,
  },
});
