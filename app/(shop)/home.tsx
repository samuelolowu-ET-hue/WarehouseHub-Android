import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  filterProducts,
  getFromPrice,
  hasPriceRange,
  SORT_OPTIONS,
  type SortOption,
} from '../../src/features/catalogue/logic';
import type { Product } from '../../src/features/catalogue/catalogue';
import { useCatalogue } from '../../src/providers/CatalogueProvider';
import { useAuth } from '../../src/providers/AuthProvider';
import { useCart } from '../../src/providers/CartProvider';
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  PriceTag,
  ProductImage,
  StockLabel,
} from '../../src/components/ui';
import { colors, font, MIN_TOUCH, radius, shadow, spacing } from '../../src/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { categories, products, loading, refreshing, error, reload, refresh } =
    useCatalogue();
  const { session } = useAuth();
  const { totalCount } = useCart();

  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const filteredProducts = useMemo(() => {
    return filterProducts(products, {
      search,
      categoryId: selectedCategoryId,
      sort,
      inStockOnly,
    });
  }, [products, search, selectedCategoryId, sort, inStockOnly]);

  const activeSortLabel = useMemo(() => {
    return SORT_OPTIONS.find((opt) => opt.value === sort)?.label ?? 'Sort';
  }, [sort]);

  const clearFilters = () => {
    setSearch('');
    setSelectedCategoryId(null);
    setSort('featured');
    setInStockOnly(false);
  };

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedCategoryId !== null ||
    sort !== 'featured' ||
    inStockOnly;

  if (loading && !refreshing) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <LoadingState message="Loading WarehouseHub catalogue…" />
      </View>
    );
  }

  if (error && products.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ErrorState
          title="Could not load catalogue"
          message={error}
          onRetry={reload}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top Brand & Actions Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>WarehouseHub</Text>
          <Text style={styles.brandTagline}>Warehouse value. Everyday essentials.</Text>
        </View>
        <View style={styles.headerIcons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={session ? 'My Account' : 'Sign in'}
            onPress={() => {
              if (session) {
                router.push('/(shop)/account');
              } else {
                router.push('/(auth)/login');
              }
            }}
            style={styles.iconButton}
            hitSlop={8}
          >
            <Ionicons
              name={session ? 'person-circle-outline' : 'person-outline'}
              size={24}
              color={colors.ink}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Shopping Basket, ${totalCount} items`}
            onPress={() => router.push('/(shop)/cart')}
            style={styles.iconButton}
            hitSlop={8}
          >
            <Ionicons name="cart-outline" size={24} color={colors.ink} />
            {totalCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {totalCount > 99 ? '99+' : totalCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.steel} style={styles.searchIcon} />
          <TextInput
            placeholder="Search shelves, containers, tools…"
            placeholderTextColor={colors.steel}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {search.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearch('')}
              hitSlop={8}
              style={styles.clearSearchButton}
            >
              <Ionicons name="close-circle" size={18} color={colors.steel} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Category Pills (Horizontal Scroll) */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategoryId === null }}
            onPress={() => setSelectedCategoryId(null)}
            style={[
              styles.categoryPill,
              selectedCategoryId === null && styles.categoryPillActive,
            ]}
          >
            <Text
              style={[
                styles.categoryPillText,
                selectedCategoryId === null && styles.categoryPillTextActive,
              ]}
            >
              All Items
            </Text>
          </Pressable>
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <Pressable
                key={cat.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter and Sort Toolbar */}
      <View style={styles.toolbar}>
        <Text style={styles.resultsCount}>
          {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
        </Text>
        <View style={styles.toolbarActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filter: in stock only, currently ${inStockOnly ? 'on' : 'off'}`}
            onPress={() => setInStockOnly((prev) => !prev)}
            style={[styles.toolChip, inStockOnly && styles.toolChipActive]}
          >
            <Ionicons
              name={inStockOnly ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={inStockOnly ? colors.white : colors.inkSoft}
            />
            <Text
              style={[
                styles.toolChipText,
                inStockOnly && styles.toolChipTextActive,
              ]}
            >
              In stock
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sort by: ${activeSortLabel}`}
            onPress={() => setSortModalVisible(true)}
            style={styles.toolChip}
          >
            <Ionicons name="swap-vertical" size={14} color={colors.inkSoft} />
            <Text style={styles.toolChipText}>{activeSortLabel}</Text>
          </Pressable>
        </View>
      </View>

      {/* Products Grid / List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.listContent,
          filteredProducts.length === 0 && styles.listContentEmpty,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.ink}
            colors={[colors.ink]}
          />
        }
        renderItem={({ item }) => <ProductCard product={item} />}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="No matching products"
            message={
              hasActiveFilters
                ? 'Try adjusting your search terms or clearing filters.'
                : 'No products are currently available.'
            }
            actionLabel={hasActiveFilters ? 'Clear all filters' : undefined}
            onAction={hasActiveFilters ? clearFilters : undefined}
          />
        }
      />

      {/* Sort Options Modal */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort by</Text>
              <Pressable
                onPress={() => setSortModalVisible(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close sort options"
              >
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            {SORT_OPTIONS.map((option) => {
              const selected = sort === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setSort(option.value);
                    setSortModalVisible(false);
                  }}
                  style={[styles.sortOptionRow, selected && styles.sortOptionRowActive]}
                >
                  <Text
                    style={[
                      styles.sortOptionLabel,
                      selected && styles.sortOptionLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={colors.accent} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const primaryImage = product.images[0]?.url;
  const fromPrice = getFromPrice(product);
  const isPriceRange = hasPriceRange(product);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, price £${fromPrice.toFixed(2)}`}
      onPress={() => router.push(`/(shop)/product/${product.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardImageContainer}>
        <ProductImage
          uri={primaryImage}
          accessibilityLabel={product.name}
          style={styles.cardImage}
          iconSize={40}
        />
        {/* Floating Badges */}
        <View style={styles.badgeOverlay}>
          {product.badge ? (
            <Badge label={product.badge} tone="accent" />
          ) : product.isNew ? (
            <Badge label="New" tone="dark" />
          ) : product.isFeatured ? (
            <Badge label="Featured" tone="neutral" />
          ) : null}
        </View>
      </View>

      <View style={styles.cardDetails}>
        {product.categoryName ? (
          <Text style={styles.cardCategory} numberOfLines={1}>
            {product.categoryName}
          </Text>
        ) : null}

        <Text style={styles.cardTitle} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.cardPriceRow}>
          {isPriceRange ? (
            <Text style={styles.pricePrefix}>from </Text>
          ) : null}
          <PriceTag
            price={fromPrice}
            comparePrice={product.comparePrice}
            size="sm"
          />
        </View>

        <View style={styles.cardFooter}>
          <StockLabel qty={product.stockQty} />
          {product.variants.length > 0 ? (
            <Text style={styles.variantCount}>
              {product.variants.length} {product.variants.length === 1 ? 'opt' : 'opts'}
            </Text>
          ) : null}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  brandContainer: {
    flex: 1,
  },
  brandTitle: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: font.caption,
    color: colors.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.stone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.stone,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: font.body,
    color: colors.ink,
    height: '100%',
  },
  clearSearchButton: {
    padding: spacing.xs,
  },
  categoriesSection: {
    paddingVertical: spacing.xs,
  },
  categoryScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.stone,
  },
  categoryPillActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  categoryPillText: {
    fontSize: font.small,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  categoryPillTextActive: {
    color: colors.white,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  resultsCount: {
    fontSize: font.caption,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.stone,
  },
  toolChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  toolChipText: {
    fontSize: font.caption,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  toolChipTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  columnWrapper: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.stone,
    overflow: 'hidden',
    ...shadow.card,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  cardImageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: colors.stoneSoft,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  badgeOverlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
  },
  cardDetails: {
    padding: spacing.md,
    flex: 1,
    justifyContent: 'space-between',
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 20,
    marginBottom: spacing.sm,
    minHeight: 40,
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  pricePrefix: {
    fontSize: font.small,
    color: colors.muted,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.stoneSoft,
    paddingTop: spacing.xs + 2,
  },
  variantCount: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: font.title,
    fontWeight: '700',
    color: colors.ink,
  },
  sortOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: MIN_TOUCH,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneSoft,
  },
  sortOptionRowActive: {
    backgroundColor: colors.stoneSoft,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  sortOptionLabel: {
    fontSize: font.bodyLarge,
    color: colors.ink,
    fontWeight: '500',
  },
  sortOptionLabelActive: {
    fontWeight: '700',
    color: colors.accent,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
});