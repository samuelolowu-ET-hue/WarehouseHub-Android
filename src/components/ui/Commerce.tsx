import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { formatPrice } from '../../lib/format';
import { colors, font, radius, spacing } from '../../theme';

type BadgeTone = 'accent' | 'dark' | 'neutral' | 'success' | 'warning' | 'danger';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const palette = BADGE_TONES[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const BADGE_TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  accent: { bg: colors.accent, fg: colors.white },
  dark: { bg: colors.ink, fg: colors.white },
  neutral: { bg: colors.stoneSoft, fg: colors.inkSoft },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

export function PriceTag({
  price,
  comparePrice,
  size = 'md',
}: {
  price: number;
  comparePrice?: number | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const showCompare = comparePrice !== null && comparePrice !== undefined && comparePrice > price;
  const priceSize = size === 'lg' ? font.display : size === 'sm' ? font.body : font.title;
  const label = showCompare
    ? `Price ${formatPrice(price)}, was ${formatPrice(comparePrice)}`
    : `Price ${formatPrice(price)}`;

  return (
    <View style={styles.priceRow} accessible accessibilityLabel={label}>
      <Text style={[styles.price, { fontSize: priceSize }, showCompare && styles.salePrice]}>
        {formatPrice(price)}
      </Text>
      {showCompare ? <Text style={styles.compare}>{formatPrice(comparePrice)}</Text> : null}
    </View>
  );
}

export function StockLabel({ qty }: { qty: number }) {
  if (qty <= 0) {
    return <Badge label="Out of stock" tone="danger" />;
  }

  if (qty <= 5) {
    return <Badge label={`Only ${qty} left`} tone="warning" />;
  }

  return <Badge label="In stock" tone="success" />;
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && value < max;

  return (
    <View style={styles.stepper} accessibilityLabel={`Quantity ${value}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        accessibilityState={{ disabled: !canDecrease }}
        disabled={!canDecrease}
        onPress={() => onChange(value - 1)}
        style={[styles.stepButton, !canDecrease && styles.stepDisabled]}
        hitSlop={4}
      >
        <Ionicons name="remove" size={18} color={colors.ink} />
      </Pressable>
      <Text style={styles.stepValue} accessibilityLiveRegion="polite">
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        accessibilityState={{ disabled: !canIncrease }}
        disabled={!canIncrease}
        onPress={() => onChange(value + 1)}
        style={[styles.stepButton, !canIncrease && styles.stepDisabled]}
        hitSlop={4}
      >
        <Ionicons name="add" size={18} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  price: {
    fontWeight: '800',
    color: colors.ink,
  },
  salePrice: {
    color: colors.accent,
  },
  compare: {
    fontSize: font.small,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.stone,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  stepButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: {
    opacity: 0.3,
  },
  stepValue: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: font.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
});
