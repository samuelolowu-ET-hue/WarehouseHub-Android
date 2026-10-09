import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuth } from '../../../src/providers/AuthProvider';
import { supabase } from '../../../src/lib/supabase/client';
import { formatDate, formatPrice } from '../../../src/lib/format';
import {
  Badge,
  Button,
  EmptyState,
  LoadingState,
} from '../../../src/components/ui';
import { colors, font, radius, shadow, spacing } from '../../../src/theme';

type OrderDetails = {
  id: string;
  order_number: string;
  created_at: string | null;
  customer_name: string;
  customer_email: string;
  shipping_address: {
    fullName?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postcode?: string;
    phone?: string;
  } | null;
  subtotal: number;
  shipping_total: number;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  items: {
    id: string;
    product_name: string;
    variant_name: string | null;
    sku: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session } = useAuth();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      if (!orderId || !session?.user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch order record
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .eq('user_id', session.user.id)
          .single();

        if (orderErr || !orderData) {
          if (active) {
            setErrorMessage(orderErr?.message ?? 'Order not found.');
          }
          return;
        }

        // Fetch order items
        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select('id, product_name, variant_name, sku, quantity, unit_price, line_total')
          .eq('order_id', orderId);

        if (active) {
          setOrder({
            id: orderData.id,
            order_number: orderData.order_number,
            created_at: orderData.created_at,
            customer_name: orderData.customer_name,
            customer_email: orderData.customer_email,
            shipping_address: orderData.shipping_address as OrderDetails['shipping_address'],
            subtotal: Number(orderData.subtotal),
            shipping_total: Number(orderData.shipping_total),
            total: Number(orderData.total),
            status: orderData.status,
            payment_method: orderData.payment_method,
            payment_status: orderData.payment_status,
            items: (itemsData ?? []).map((it) => ({
              id: it.id,
              product_name: it.product_name,
              variant_name: it.variant_name,
              sku: it.sku,
              quantity: it.quantity,
              unit_price: Number(it.unit_price),
              line_total: Number(it.line_total),
            })),
          });
        }
      } catch (err) {
        if (active) {
          setErrorMessage(err instanceof Error ? err.message : 'Error loading order');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [orderId, session]);

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <LoadingState message="Loading order details…" />
      </View>
    );
  }

  if (!order || errorMessage) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.navHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to orders"
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Order not found"
          message={errorMessage || 'This order does not exist or you do not have permission to view it.'}
          actionLabel="View All Orders"
          onAction={() => router.replace('/(shop)/orders')}
        />
      </View>
    );
  }

  const addr = order.shipping_address;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.navHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to orders"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {order.order_number}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Callout Banner */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeaderRow}>
            <View>
              <Text style={styles.statusTitle}>
                Order {order.status.toUpperCase()}
              </Text>
              <Text style={styles.statusDate}>
                Placed on {formatDate(order.created_at)}
              </Text>
            </View>
            <Badge
              label={order.status.toUpperCase()}
              tone={order.status === 'delivered' ? 'success' : 'accent'}
            />
          </View>

          {/* Simple 3-step visual tracker */}
          <View style={styles.trackerRow}>
            <View style={styles.trackerStep}>
              <View style={[styles.trackerDot, styles.trackerDotActive]} />
              <Text style={[styles.trackerText, styles.trackerTextActive]}>Confirmed</Text>
            </View>
            <View style={[styles.trackerLine, order.status !== 'pending' && styles.trackerLineActive]} />
            <View style={styles.trackerStep}>
              <View style={[styles.trackerDot, (order.status === 'shipped' || order.status === 'delivered') && styles.trackerDotActive]} />
              <Text style={[styles.trackerText, (order.status === 'shipped' || order.status === 'delivered') && styles.trackerTextActive]}>Shipped</Text>
            </View>
            <View style={[styles.trackerLine, order.status === 'delivered' && styles.trackerLineActive]} />
            <View style={styles.trackerStep}>
              <View style={[styles.trackerDot, order.status === 'delivered' && styles.trackerDotActive]} />
              <Text style={[styles.trackerText, order.status === 'delivered' && styles.trackerTextActive]}>Delivered</Text>
            </View>
          </View>
        </View>

        {/* Delivery Address Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="location-outline" size={20} color={colors.ink} />
            <Text style={styles.cardTitle}>Delivery Address</Text>
          </View>
          {addr ? (
            <View style={styles.addressBlock}>
              <Text style={styles.addressName}>{addr.fullName || order.customer_name}</Text>
              <Text style={styles.addressLine}>{addr.addressLine1}</Text>
              {addr.addressLine2 ? (
                <Text style={styles.addressLine}>{addr.addressLine2}</Text>
              ) : null}
              <Text style={styles.addressLine}>
                {addr.city} {addr.postcode}
              </Text>
              {addr.phone ? (
                <Text style={styles.addressPhone}>Phone: {addr.phone}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.addressLine}>Standard warehouse delivery</Text>
          )}
        </View>

        {/* Ordered Items Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="cube-outline" size={20} color={colors.ink} />
            <Text style={styles.cardTitle}>Items Ordered ({order.items.length})</Text>
          </View>

          <View style={styles.itemsList}>
            {order.items.map((it) => (
              <View key={it.id} style={styles.itemRow}>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemName}>{it.product_name}</Text>
                  {it.variant_name ? (
                    <Text style={styles.itemVariant}>{it.variant_name}</Text>
                  ) : null}
                  {it.sku ? (
                    <Text style={styles.itemSku}>SKU: {it.sku}</Text>
                  ) : null}
                  <Text style={styles.itemQtyPricing}>
                    {it.quantity} x {formatPrice(it.unit_price)}
                  </Text>
                </View>
                <Text style={styles.itemLineTotal}>
                  {formatPrice(it.line_total)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cost & Invoice Summary */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="receipt-outline" size={20} color={colors.ink} />
            <Text style={styles.cardTitle}>Payment & Invoice</Text>
          </View>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Subtotal</Text>
            <Text style={styles.costValue}>{formatPrice(order.subtotal)}</Text>
          </View>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Delivery</Text>
            <Text style={styles.costValue}>
              {order.shipping_total === 0 ? 'FREE' : formatPrice(order.shipping_total)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
          </View>

          <View style={styles.paymentMethodNotice}>
            <Ionicons name="checkmark-done" size={16} color={colors.success} />
            <Text style={styles.paymentMethodNoticeText}>
              Direct Warehouse Account ({order.payment_status.toUpperCase()})
            </Text>
          </View>
        </View>

        {/* Back to Home Button */}
        <View style={styles.actionWrap}>
          <Button
            label="Continue Shopping"
            onPress={() => router.replace('/(shop)/home')}
            variant="secondary"
          />
        </View>
      </ScrollView>
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
    fontWeight: '800',
    color: colors.ink,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.stone,
    padding: spacing.xl,
    ...shadow.card,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  statusTitle: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.ink,
  },
  statusDate: {
    fontSize: font.small,
    color: colors.muted,
    marginTop: 2,
  },
  trackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackerStep: {
    alignItems: 'center',
  },
  trackerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.stone,
    marginBottom: 4,
  },
  trackerDotActive: {
    backgroundColor: colors.accent,
  },
  trackerText: {
    fontSize: font.caption,
    color: colors.steel,
    fontWeight: '500',
  },
  trackerTextActive: {
    color: colors.ink,
    fontWeight: '700',
  },
  trackerLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.stone,
    marginBottom: 16,
    marginHorizontal: 8,
  },
  trackerLineActive: {
    backgroundColor: colors.accent,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.stone,
    padding: spacing.xl,
    ...shadow.card,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: font.title,
    fontWeight: '700',
    color: colors.ink,
  },
  addressBlock: {
    gap: 2,
  },
  addressName: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
  },
  addressLine: {
    fontSize: font.body,
    color: colors.inkSoft,
  },
  addressPhone: {
    fontSize: font.small,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  itemsList: {
    gap: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneSoft,
    paddingBottom: spacing.sm,
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
    marginTop: 2,
  },
  itemSku: {
    fontSize: font.caption,
    color: colors.steel,
    marginTop: 1,
  },
  itemQtyPricing: {
    fontSize: font.small,
    color: colors.inkSoft,
    marginTop: 4,
  },
  itemLineTotal: {
    fontSize: font.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
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
  divider: {
    height: 1,
    backgroundColor: colors.stoneSoft,
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
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
  paymentMethodNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successSoft,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  paymentMethodNoticeText: {
    fontSize: font.caption,
    color: colors.success,
    fontWeight: '700',
  },
  actionWrap: {
    marginTop: spacing.sm,
  },
});
