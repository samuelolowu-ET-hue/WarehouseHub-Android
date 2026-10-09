import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { supabase } from '../../src/lib/supabase/client';
import { displayError } from '../../src/lib/errors';
import { Button, InlineMessage, TextField } from '../../src/components/ui';
import { colors, font, MIN_TOUCH, spacing } from '../../src/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleRegister() {
    setErrorMessage('');
    setSuccessMessage('');

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!normalizedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please choose a password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedName,
          },
        },
      });

      if (error) {
        setErrorMessage(displayError(error, 'Could not create account. Please try again.'));
        return;
      }

      // If Supabase is configured with immediate session
      if (data.session) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(shop)/home');
        }
        return;
      }

      // If email confirmation is enabled on Supabase
      setSuccessMessage(
        'Account created successfully! Please check your email inbox to confirm your email address before signing in.'
      );
    } catch (err) {
      setErrorMessage(displayError(err, 'An unexpected network error occurred.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={styles.navHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>WarehouseHub</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBadge}>
          <Ionicons name="person-add" size={20} color={colors.accent} />
        </View>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>
          Join WarehouseHub for simple ordering, delivery tracking, and access to trade pricing.
        </Text>

        {errorMessage ? (
          <InlineMessage tone="error" message={errorMessage} />
        ) : null}

        {successMessage ? (
          <InlineMessage tone="success" message={successMessage} />
        ) : null}

        <TextField
          label="Full name"
          placeholder="e.g. Alex Smith"
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="name"
          value={fullName}
          onChangeText={setFullName}
        />

        <TextField
          label="Email address"
          placeholder="e.g. alex@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />

        <TextField
          label="Password"
          placeholder="At least 6 characters"
          secureTextEntry
          revealable
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
          hint="Minimum 6 characters"
        />

        <Button
          label="Create Account"
          onPress={handleRegister}
          loading={loading}
          variant="primary"
          style={styles.submitButton}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in to existing account"
          onPress={() => router.replace('/(auth)/login')}
          style={styles.loginLink}
          disabled={loading}
        >
          <Text style={styles.loginLinkText}>
            Already have an account? <Text style={styles.loginLinkBold}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneSoft,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.stone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: font.title,
    fontWeight: '800',
    color: colors.ink,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  brandBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: font.display,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: font.body,
    color: colors.muted,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.stone,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: font.caption,
    color: colors.steel,
    textTransform: 'uppercase',
  },
  loginLink: {
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginLinkText: {
    fontSize: font.body,
    color: colors.inkSoft,
  },
  loginLinkBold: {
    fontWeight: '700',
    color: colors.ink,
    textDecorationLine: 'underline',
  },
});