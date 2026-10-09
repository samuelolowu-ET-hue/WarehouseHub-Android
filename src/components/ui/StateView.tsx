import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, font, spacing } from '../../theme';
import { Button } from './Button';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={colors.ink} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

type StateProps = {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon = 'cube-outline', title, message, actionLabel, onAction }: StateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={30} color={colors.inkSoft} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, styles.errorCircle]}>
        <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {message ? (
        <Text style={styles.message} accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}
      {onRetry ? (
        <View style={styles.action}>
          <Button label="Try again" onPress={onRetry} variant="secondary" fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

export function InlineMessage({ tone, message }: { tone: 'error' | 'success' | 'info'; message: string }) {
  const palette =
    tone === 'error'
      ? { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle-outline' as IconName }
      : tone === 'success'
        ? { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle-outline' as IconName }
        : { bg: colors.stoneSoft, fg: colors.inkSoft, icon: 'information-circle-outline' as IconName };

  return (
    <View
      style={[styles.inline, { backgroundColor: palette.bg }]}
      accessibilityLiveRegion="polite"
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
    >
      <Ionicons name={palette.icon} size={18} color={palette.fg} />
      <Text style={[styles.inlineText, { color: palette.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    minHeight: 280,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.stoneSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  errorCircle: {
    backgroundColor: colors.dangerSoft,
  },
  title: {
    fontSize: font.title,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.sm,
    fontSize: font.body,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
  action: {
    marginTop: spacing.xl,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.lg,
  },
  inlineText: {
    flex: 1,
    fontSize: font.small + 1,
    lineHeight: 20,
  },
});
