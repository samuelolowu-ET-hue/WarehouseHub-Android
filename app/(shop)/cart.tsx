import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useCart } from '../../src/providers/CartProvider';
import { useAuth } from '../../src/providers/AuthProvider';
import type { CartItem } from '../../src/features/cart/logic';
import {
  Button,
  EmptyState,
  LoadingState,
  ProductImage,
  QuantityStepper,
} from '../../src/components/ui';
import { formatPrice } from '../../src/lib/format';
import { colors, font, MIN_TOUCH, radius, shadow, spacing } from '../../src/theme';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    items,
    totalCount,
    subtotal,
    loading,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart,
  } = useCart();
  const { session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Refresh cart when the cart screen receives focus
  useFocusEffect(
    useCallback(() => {
      refreshCart();
    }, [refreshCart])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshCart();
    } finally {
      setRefreshing(false);
    }
  }, [refreshCart]);

  // Free delivery threshold: £50
  const freeDeliveryThreshold = 50.0;
  const deliveryCharge = subtotal >= freeDeliveryThreshold || subtotal === 0 ? 0 : 4.99;
  const orderTotal = subtotal + deliveryCharge;

  const handleCheckoutPress = () => {
    if (items.length === 0) {
      return;
    }

    if (!session) {
      Alert.alert(
        'Sign in to Checkout',
        'You need an account to complete your order and receive delivery confirmation.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign in / Register',
            onPress: () => router.push('/(auth)/login'),
          },
        ]
      );
      return;
    }

    router.push('/(shop)/checkout');
  };

  const handleConfirmClear = () => {
    Alert.alert(
      'Clear Basket',
      'Are you sure you want to remove all items from your shopping basket?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear all', style: 'destructive', onPress: clearCart },
      ]
    );
  };

  if (loading && items.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <LoadingState message="Loading your basket…" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header bar */}
      <View style={styles.navHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to shopping"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>
          Shopping Basket {totalCount > 0 ? `(${totalCount})` : ''}
        </Text>
        {items.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all items"
            onPress={handleConfirmClear}
            style={styles.clearButton}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {items.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          <EmptyState
            icon="cart-outline"
            title="Your basket is empty"
            message="Explore practical storage, shelving, and organization essentials with warehouse pricing."
            actionLabel="Browse Catalogue"
            onAction={() => router.replace('/(shop)/home')}
          />
        </ScrollView>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 120 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
              />
            }
            renderItem={({ item }) => (
              <CartItemRow
                item={item}
                onUpdateQuantity={(qty) => updateQuantity(item.id, qty)}
                onRemove={() => removeItem(item.id)}
                onPressProduct={() => router.push(`/(shop)/product/${item.productId}`)}
              />
            )}
            ListFooterComponent={
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Order Summary</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal ({totalCount} items)</Text>
                  <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Delivery {deliveryCharge === 0 ? '(Free over £50)' : ''}
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      deliveryCharge === 0 && styles.freeDeliveryText,
                    ]}
                  >
                    {deliveryCharge === 0 ? 'FREE' : formatPrice(deliveryCharge)}
                  </Text>
                </View>

                {subtotal < freeDeliveryThreshold ? (
                  <View style={styles.freeDeliveryBanner}>
                    <Ionicons name="sparkles" size={14} color={colors.accent} />
                    <Text style={styles.freeDeliveryBannerText}>
                      Add {formatPrice(freeDeliveryThreshold - subtotal)} more for FREE
                      delivery!
                    </Text>
                  </View>
                ) : null}

                <View style={styles.summaryDivider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTotalLabel}>Estimated Total</Text>
                  <Text style={styles.summaryTotalValue}>{formatPrice(orderTotal)}</Text>
                </View>
              </View>
            }
          />

          {/* Sticky Bottom Checkout Footer */}
          <View
            style={[
              styles.bottomBar,
              { paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}
          >
            <View style={styles.bottomBarTotal}>
              <Text style={styles.bottomBarLabel}>Total</Text>
              <Text style={styles.bottomBarAmount}>{formatPrice(orderTotal)}</Text>
            </View>
            <View style={styles.bottomBarAction}>
              <Button
                label={session ? 'Proceed to Checkout' : 'Sign in to Checkout'}
                onPress={handleCheckoutPress}
                variant="primary"
                icon={<Ionicons name="lock-closed" size={18} color={colors.white} />}
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  onPressProduct,
}: {
  item: CartItem;
  onUpdateQuantity: (qty: number) => void;
  onRemove: () => void;
  onPressProduct: () => void;
}) {
  const lineTotal = item.unitPrice * item.quantity;
  const isMaxStockReached = item.maxStock > 0 && item.quantity >= item.maxStock;

  return (
    <View style={styles.itemCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${item.productName}`}
        onPress={onPressProduct}
        style={styles.itemImageContainer}
      >
        <ProductImage
          uri={item.imageUrl}
          accessibilityLabel={item.productName}
          style={styles.itemImage}
          iconSize={32}
        />
      </Pressable>

      <View style={styles.itemDetails}>
        <View style={styles.itemHeader}>
          <Pressable onPress={onPressProduct} style={{ flex: 1 }}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.productName}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.productName} from basket`}
            onPress={onRemove}
            hitSlop={8}
            style={styles.removeButton}
          >
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {item.variantValue ? (
          <View style={styles.variantBadge}>
            <Text style={styles.variantBadgeText}>
              {item.variantName ? `${item.variantName}: ` : ''}
              {item.variantValue}
            </Text>
          </View>
        ) : null}

        <View style={styles.itemPriceRow}>
          <Text style={styles.itemUnitPrice}>{formatPrice(item.unitPrice)} each</Text>
          <Text style={styles.itemLineTotal}>{formatPrice(lineTotal)}</Text>
        </View>

        <View style={styles.itemFooter}>
          <QuantityStepper
            value={item.quantity}
            min={1}
            max={item.maxStock > 0 ? item.maxStock : 99}
            onChange={onUpdateQuantity}
          />
          {isMaxStockReached ? (
            <Text style={styles.maxStockText}>Max available</Text>
          ) : null}
        </View>
      </View>
    </View>
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
    fontWeight: '700',
    color: colors.ink,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.stone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.stone,
    padding: spacing.md,
    ...shadow.card,
  },
  itemImageContainer: {
    width: 84,
    height: 84,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.stoneSoft,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'space-between',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 20,
  },
  removeButton: {
    paddingLeft: spacing.sm,
  },
  variantBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.stoneSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  variantBadgeText: {
    fontSize: 11,
    color: colors.inkSoft,
    fontWeight: '600',
  },
  itemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  itemUnitPrice: {
    fontSize: font.caption,
    color: colors.muted,
  },
  itemLineTotal: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.ink,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  maxStockText: {
    fontSize: font.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.stone,
    padding: spacing.xl,
    marginTop: spacing.lg,
    ...shadow.card,
  },
  summaryTitle: {
    fontSize: font.title,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: font.body,
    color: colors.muted,
  },
  summaryValue: {
    fontSize: font.body,
    fontWeight: '600',
    color: colors.ink,
  },
  freeDeliveryText: {
    color: colors.success,
    fontWeight: '700',
  },
  freeDeliveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginVertical: spacing.xs,
  },
  freeDeliveryBannerText: {
    fontSize: font.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.stoneSoft,
    marginVertical: spacing.md,
  },
  summaryTotalLabel: {
    fontSize: font.title,
    fontWeight: '700',
    color: colors.ink,
  },
  summaryTotalValue: {
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
    flex: 1.6,
  },
});
