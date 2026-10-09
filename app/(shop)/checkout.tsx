import { useEffect, useState } from 'react';
import {
  Alert,
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

import { useAuth } from '../../src/providers/AuthProvider';
import { useCart } from '../../src/providers/CartProvider';
import { supabase } from '../../src/lib/supabase/client';
import {
  placeOrder,
  type ShippingAddress,
} from '../../src/features/checkout/checkoutService';
import { formatPrice } from '../../src/lib/format';
import { displayError } from '../../src/lib/errors';
import {
  Button,
  InlineMessage,
  LoadingState,
  TextField,
} from '../../src/components/ui';
import { colors, font, radius, shadow, spacing } from '../../src/theme';

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, loading: authLoading } = useAuth();
  const { items, subtotal, totalCount, clearCart } = useCart();
  const user = session?.user;

  // Shipping form fields
  const [fullName, setFullName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [phone, setPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Delivery calculation
  const freeDeliveryThreshold = 50.0;
  const deliveryCharge = subtotal >= freeDeliveryThreshold ? 0 : 4.99;
  const orderTotal = subtotal + deliveryCharge;

  // Pre-fill user's full name from profile
  useEffect(() => {
    async function loadUserName() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (data?.full_name) {
          setFullName(data.full_name);
        } else if (user.user_metadata?.full_name) {
          setFullName(user.user_metadata.full_name as string);
        }
      } catch (err) {
        console.warn('Could not prefill user profile name:', err);
      }
    }

    loadUserName();
  }, [user]);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/(auth)/login');
    }
  }, [authLoading, session, router]);

  // Empty cart guard
  useEffect(() => {
    if (!authLoading && session && items.length === 0) {
      router.replace('/(shop)/cart');
    }
  }, [authLoading, session, items.length, router]);

  async function handlePlaceOrder() {
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter the recipient full name.');
      return;
    }
    if (!addressLine1.trim()) {
      setErrorMessage('Please enter the street address.');
      return;
    }
    if (!city.trim()) {
      setErrorMessage('Please enter the city or town.');
      return;
    }
    if (!postcode.trim()) {
      setErrorMessage('Please enter the postal code.');
      return;
    }

    const shippingAddress: ShippingAddress = {
      fullName: fullName.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || undefined,
      city: city.trim(),
      postcode: postcode.trim().toUpperCase(),
      country: 'United Kingdom',
      phone: phone.trim() || undefined,
    };

    setSubmitting(true);

    try {
      const completed = await placeOrder(
        user!.id,
        user!.email!,
        shippingAddress,
        items
      );

      // Clear the local cart state
      await clearCart();

      Alert.alert(
        'Order Confirmed! 🎉',
        `Your order ${completed.orderNumber} has been received and is queued for warehouse dispatch.`,
        [
          {
            text: 'View Order Details',
            onPress: () => router.replace(`/(shop)/orders/${completed.id}`),
          },
        ]
      );
    } catch (err) {
      setErrorMessage(
        displayError(err, 'Unable to place order. Please review your basket and try again.')
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || items.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <LoadingState message="Preparing secure checkout…" />
      </View>
    );
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
          accessibilityLabel="Back to shopping basket"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {errorMessage ? (
          <InlineMessage tone="error" message={errorMessage} />
        ) : null}

        {/* Section 1: Delivery Address */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.cardTitle}>Delivery Address</Text>
          </View>

          <TextField
            label="Full name"
            placeholder="Recipient full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <TextField
            label="Address line 1"
            placeholder="House number and street"
            value={addressLine1}
            onChangeText={setAddressLine1}
            autoCapitalize="words"
          />

          <TextField
            label="Address line 2 (Optional)"
            placeholder="Apartment, unit, suite"
            value={addressLine2}
            onChangeText={setAddressLine2}
            autoCapitalize="words"
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <TextField
                label="City / Town"
                placeholder="City"
                value={city}
                onChangeText={setCity}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.col}>
              <TextField
                label="Postal code"
                placeholder="Postcode"
                value={postcode}
                onChangeText={setPostcode}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <TextField
            label="Phone number (Optional)"
            placeholder="For courier delivery updates"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Section 2: Payment Method */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.cardTitle}>Payment Method</Text>
          </View>

          <View style={styles.paymentMethodOption}>
            <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodTitle}>Warehouse Direct Account</Text>
              <Text style={styles.paymentMethodDescription}>
                Direct order invoice with 30-day warehouse terms. Confirmed on order placement.
              </Text>
            </View>
          </View>
        </View>

        {/* Section 3: Order Review */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <Text style={styles.cardTitle}>Order Summary ({totalCount} items)</Text>
          </View>

          <View style={styles.itemList}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  {item.variantValue ? (
                    <Text style={styles.itemVariant}>
                      {item.variantName ? `${item.variantName}: ` : ''}
                      {item.variantValue}
                    </Text>
                  ) : null}
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemTotal}>
                  {formatPrice(item.unitPrice * item.quantity)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Subtotal</Text>
            <Text style={styles.costValue}>{formatPrice(subtotal)}</Text>
          </View>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>
              Delivery {deliveryCharge === 0 ? '(Free over £50)' : ''}
            </Text>
            <Text
              style={[
                styles.costValue,
                deliveryCharge === 0 && styles.freeDelivery,
              ]}
            >
              {deliveryCharge === 0 ? 'FREE' : formatPrice(deliveryCharge)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Due</Text>
            <Text style={styles.totalValue}>{formatPrice(orderTotal)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Checkout Action */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <View style={styles.bottomBarTotal}>
          <Text style={styles.bottomBarLabel}>Total to Pay</Text>
          <Text style={styles.bottomBarAmount}>{formatPrice(orderTotal)}</Text>
        </View>
        <View style={styles.bottomBarAction}>
          <Button
            label="Place Order"
            onPress={handlePlaceOrder}
            loading={submitting}
            variant="accent"
            icon={<Ionicons name="bag-check" size={20} color={colors.white} />}
          />
        </View>
      </View>
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
    padding: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.stone,
    padding: spacing.xl,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: font.title,
    fontWeight: '700',
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  col: {
    flex: 1,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
  },
  paymentMethodDescription: {
    fontSize: font.small,
    color: colors.inkSoft,
    lineHeight: 18,
  },
  itemList: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMeta: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    fontSize: font.body,
    fontWeight: '600',
    color: colors.ink,
  },
  itemVariant: {
    fontSize: font.caption,
    color: colors.muted,
  },
  itemQty: {
    fontSize: font.caption,
    color: colors.steel,
  },
  itemTotal: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: colors.stoneSoft,
    marginVertical: spacing.md,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  costLabel: {
    fontSize: font.body,
    color: colors.muted,
  },
  costValue: {
    fontSize: font.body,
    fontWeight: '600',
    color: colors.ink,
  },
  freeDelivery: {
    color: colors.success,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  totalLabel: {
    fontSize: font.title,
    fontWeight: '700',
    color: colors.ink,
  },
  totalValue: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.ink,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.stone,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.card,
  },
  bottomBarTotal: {
    flex: 1,
  },
  bottomBarLabel: {
    fontSize: font.caption,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomBarAmount: {
    fontSize: font.title,
    fontWeight: '800',
    color: colors.ink,
  },
  bottomBarAction: {
    flex: 1.5,
  },
});
