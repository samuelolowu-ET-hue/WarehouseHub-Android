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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleResetPassword() {
    setErrorMessage('');
    setSuccessMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage('Please enter your account email address.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);

      if (error) {
        setErrorMessage(displayError(error, 'Could not send reset link. Please check the email.'));
        return;
      }

      setSuccessMessage(
        'Password reset link sent! Check your inbox for instructions to reset your password.'
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
        <Text style={styles.headerTitle}>Reset Password</Text>
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
          <Ionicons name="key-outline" size={20} color={colors.accent} />
        </View>

        <Text style={styles.title}>Forgot password?</Text>
        <Text style={styles.subtitle}>
          Enter your registered email address and we will send you a secure link to reset your account password.
        </Text>

        {errorMessage ? (
          <InlineMessage tone="error" message={errorMessage} />
        ) : null}

        {successMessage ? (
          <InlineMessage tone="success" message={successMessage} />
        ) : null}

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

        <Button
          label="Send Reset Link"
          onPress={handleResetPassword}
          loading={loading}
          variant="primary"
          style={styles.submitButton}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to sign in"
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backToLogin}
          disabled={loading}
        >
          <Text style={styles.backToLoginText}>
            Remember your password? <Text style={styles.backToLoginBold}>Sign in</Text>
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
  backToLogin: {
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  backToLoginText: {
    fontSize: font.body,
    color: colors.inkSoft,
  },
  backToLoginBold: {
    fontWeight: '700',
    color: colors.ink,
    textDecorationLine: 'underline',
  },
});
