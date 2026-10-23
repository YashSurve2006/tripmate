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

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { colors, isDark } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, upiId.trim() || undefined);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            <MaterialCommunityIcons name="account-plus" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Create Your Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join TripMate to start tracking shared trips and splitting bills seamlessly.
          </Text>
        </View>

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

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="e.g. Yash Sharma"
            placeholderTextColor={colors.placeholder}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
            }}
            leftIcon={<Feather name="user" size={18} color={colors.textTertiary} />}
          />

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
            placeholder="At least 6 characters"
            placeholderTextColor={colors.placeholder}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError(null);
            }}
            secureTextEntry
            leftIcon={<Feather name="lock" size={18} color={colors.textTertiary} />}
          />

          <Input
            label="UPI ID (Optional for fast settlements)"
            placeholder="e.g. yash@okhdfcbank"
            placeholderTextColor={colors.placeholder}
            value={upiId}
            onChangeText={setUpiId}
            autoCapitalize="none"
            hint="Friends can use this to pay you directly via GPay, PhonePe, or Paytm"
            leftIcon={<MaterialCommunityIcons name="bank-transfer" size={18} color={colors.textTertiary} />}
          />

          <Button
            title="Create Account"
            size="lg"
            variant="primary"
            loading={loading}
            onPress={handleRegister}
            style={styles.submitBtn}
          />

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
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
  submitBtn: {
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
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
