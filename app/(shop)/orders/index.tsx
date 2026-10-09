import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuth } from '../../../src/providers/AuthProvider';
import { supabase } from '../../../src/lib/supabase/client';
import { formatDate, formatPrice } from '../../../src/lib/format';
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../src/components/ui';
import { colors, font, radius, shadow, spacing } from '../../../src/theme';

type OrderSummary = {
  id: string;
  order_number: string;
  created_at: string | null;
  total: number;
  status: string;
  payment_status: string;
};

export default function OrderHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, loading: authLoading } = useAuth();
  const user = session?.user;

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setErrorMessage('');
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, created_at, total, status, payment_status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setOrders(
        (data ?? []).map((row) => ({
          id: row.id,
          order_number: row.order_number,
          created_at: row.created_at,
          total: Number(row.total),
          status: row.status,
          payment_status: row.payment_status,
        }))
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to load order history.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  if (authLoading || (loading && !refreshing)) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <LoadingState message="Loading your orders…" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.navHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to account"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      {errorMessage && orders.length === 0 ? (
        <ErrorState
          title="Could not load orders"
          message={errorMessage}
          onRetry={fetchOrders}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            orders.length === 0 && styles.listContentEmpty,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.ink}
              colors={[colors.ink]}
            />
          }
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => router.push(`/(shop)/orders/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No orders yet"
              message="When you place orders for warehouse essentials, you can track their status and delivery details here."
              actionLabel="Start Shopping"
              onAction={() => router.push('/(shop)/home')}
            />
          }
        />
      )}
    </View>
  );
}

function OrderCard({
  order,
  onPress,
}: {
  order: OrderSummary;
  onPress: () => void;
}) {
  const statusTone =
    order.status === 'delivered'
      ? 'success'
      : order.status === 'shipped'
      ? 'dark'
      : order.status === 'confirmed'
      ? 'neutral'
      : 'warning';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.order_number}, total ${formatPrice(order.total)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
          <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
        </View>
        <Badge
          label={order.status.toUpperCase()}
          tone={statusTone}
        />
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.paymentStatusRow}>
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={colors.success}
          />
          <Text style={styles.paymentStatusText}>
            Payment {order.payment_status}
          </Text>
        </View>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>Total: </Text>
          <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
        </View>
      </View>
    </Pressable>
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
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.stone,
    padding: spacing.lg,
    ...shadow.card,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderNumber: {
    fontSize: font.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 0.3,
  },
  orderDate: {
    fontSize: font.small,
    color: colors.muted,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.stoneSoft,
    paddingTop: spacing.sm,
  },
  paymentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentStatusText: {
    fontSize: font.caption,
    color: colors.inkSoft,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  totalWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalLabel: {
    fontSize: font.small,
    color: colors.muted,
  },
  totalValue: {
    fontSize: font.title,
    fontWeight: '800',
    color: colors.ink,
  },
});
