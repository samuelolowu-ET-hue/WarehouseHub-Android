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
import { colors, font, MIN_TOUCH, radius, spacing } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogin() {
    setErrorMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setErrorMessage(displayError(error, 'Sign in failed. Check your details.'));
        return;
      }

      // Successful sign in, go back to previous screen or home
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(shop)/home');
      }
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
          accessibilityLabel="Back to store"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(shop)/home');
            }
          }}
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
          <Ionicons name="lock-closed" size={20} color={colors.accent} />
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in to your WarehouseHub account to view orders, save your basket, and manage your delivery details.
        </Text>

        {errorMessage ? (
          <InlineMessage tone="error" message={errorMessage} />
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

        <TextField
          label="Password"
          placeholder="Enter your password"
          secureTextEntry
          revealable
          textContentType="password"
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.forgotPasswordRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Forgot your password?"
            onPress={() => router.push('/(auth)/forgot-password')}
            hitSlop={8}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>
        </View>

        <Button
          label="Sign in"
          onPress={handleLogin}
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
          accessibilityLabel="Create an account"
          onPress={() => router.push('/(auth)/register')}
          style={styles.registerLink}
          disabled={loading}
        >
          <Text style={styles.registerLinkText}>
            Don't have an account? <Text style={styles.registerLinkBold}>Create one</Text>
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
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  forgotPasswordText: {
    fontSize: font.small,
    color: colors.inkSoft,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: spacing.sm,
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
  registerLink: {
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerLinkText: {
    fontSize: font.body,
    color: colors.inkSoft,
  },
  registerLinkBold: {
    fontWeight: '700',
    color: colors.ink,
    textDecorationLine: 'underline',
  },
});