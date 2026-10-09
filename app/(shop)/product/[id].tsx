import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  defaultVariant,
  getSelectionStock,
  getUnitPrice,
  groupVariants,
} from '../../../src/features/catalogue/logic';
import {
  getProductById,
  type Product,
  type ProductVariant,
} from '../../../src/features/catalogue/catalogue';
import { useCatalogue } from '../../../src/providers/CatalogueProvider';
import { useCart } from '../../../src/providers/CartProvider';
import {
  Badge,
  Button,
  EmptyState,
  LoadingState,
  PriceTag,
  ProductImage,
  QuantityStepper,
  StockLabel,
} from '../../../src/components/ui';
import { formatPrice } from '../../../src/lib/format';
import { colors, font, MIN_TOUCH, radius, shadow, spacing } from '../../../src/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const productId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { getProduct } = useCatalogue();

  // Try cached product from CatalogueProvider first for instant render
  const cached = productId ? getProduct(productId) : undefined;
  const [product, setProduct] = useState<Product | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedMessage, setAddedMessage] = useState(false);

  // If not in cache (e.g. direct link or fresh reload), load from Supabase
  useEffect(() => {
    let active = true;

    if (!productId) {
      setLoading(false);
      return;
    }

    if (cached) {
      setProduct(cached);
      setSelectedVariant(defaultVariant(cached));
      setLoading(false);
      return;
    }

    async function fetchProduct() {
      try {
        setLoading(true);
        const data = await getProductById(productId);
        if (active) {
          setProduct(data);
          if (data) {
            setSelectedVariant(defaultVariant(data));
          }
        }
      } catch (err) {
        console.error('Error loading product details:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchProduct();

    return () => {
      active = false;
    };
  }, [productId, cached]);

  // Variant groups (e.g., "Colour", "Finish", "Size")
  const variantGroups = useMemo(() => {
    return product ? groupVariants(product.variants) : [];
  }, [product]);

  // Current selection stock
  const currentStock = useMemo(() => {
    return product ? getSelectionStock(product, selectedVariant) : 0;
  }, [product, selectedVariant]);

  // Reset quantity if it exceeds newly selected variant stock
  useEffect(() => {
    if (currentStock > 0 && quantity > currentStock) {
      setQuantity(currentStock);
    } else if (currentStock === 0) {
      setQuantity(1);
    }
  }, [currentStock, quantity]);

  // Unit price with variant delta
  const unitPrice = useMemo(() => {
    return product ? getUnitPrice(product, selectedVariant) : 0;
  }, [product, selectedVariant]);

  const totalPrice = unitPrice * quantity;

  const { addItem } = useCart();

  const handleAddToCart = async () => {
    if (!product || currentStock <= 0) {
      return;
    }

    try {
      await addItem(product, selectedVariant, quantity);
      Alert.alert(
        'Added to Basket',
        `${quantity}x ${product.name}${selectedVariant ? ` (${selectedVariant.value})` : ''} added to your basket.`,
        [
          { text: 'Continue shopping', style: 'cancel' },
          { text: 'View basket', onPress: () => router.push('/(shop)/cart') },
        ]
      );
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <LoadingState message="Loading product details…" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.navHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </Pressable>
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Product not found"
          message="This item might have been removed or is temporarily unavailable."
          actionLabel="Back to Catalogue"
          onAction={() => router.replace('/(shop)/home')}
        />
      </View>
    );
  }

  const images = product.images.length > 0 ? product.images : [{ id: 'placeholder', url: '', altText: null, sortOrder: 0 }];
  const currentImage = images[selectedImageIndex] ?? images[0];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header bar */}
      <View style={styles.navHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Cart"
          onPress={() => router.push('/(shop)/cart')}
          style={styles.cartButton}
          hitSlop={8}
        >
          <Ionicons name="cart-outline" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Image Showcase */}
        <View style={styles.imageGallery}>
          <ProductImage
            uri={currentImage.url}
            accessibilityLabel={currentImage.altText ?? product.name}
            style={styles.mainImage}
            iconSize={64}
          />
          {/* Badge Overlays */}
          <View style={styles.galleryBadgeOverlay}>
            {product.badge ? (
              <Badge label={product.badge} tone="accent" />
            ) : product.isNew ? (
              <Badge label="New" tone="dark" />
            ) : product.isFeatured ? (
              <Badge label="Featured" tone="neutral" />
            ) : null}
          </View>

          {/* Multiple Image Thumbnail Strip */}
          {images.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailStrip}
            >
              {images.map((img, idx) => {
                const isActive = selectedImageIndex === idx;
                return (
                  <Pressable
                    key={img.id}
                    accessibilityRole="button"
                    accessibilityLabel={`View image ${idx + 1} of ${images.length}`}
                    onPress={() => setSelectedImageIndex(idx)}
                    style={[styles.thumbnailWrap, isActive && styles.thumbnailWrapActive]}
                  >
                    <ProductImage
                      uri={img.url}
                      accessibilityLabel={img.altText ?? `Thumbnail ${idx + 1}`}
                      style={styles.thumbnail}
                      iconSize={20}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </View>

        {/* Product Information Card */}
        <View style={styles.detailsContainer}>
          {product.categoryName ? (
            <Text style={styles.categoryBadge}>{product.categoryName}</Text>
          ) : null}

          <Text style={styles.title}>{product.name}</Text>

          {/* Price & Compare Price */}
          <View style={styles.priceRow}>
            <PriceTag
              price={unitPrice}
              comparePrice={product.comparePrice}
              size="lg"
            />
            <StockLabel qty={currentStock} />
          </View>

          {/* SKU and Stock Count Info */}
          <View style={styles.metaRow}>
            {selectedVariant?.sku ? (
              <Text style={styles.metaText}>SKU: {selectedVariant.sku}</Text>
            ) : null}
            {currentStock > 0 ? (
              <Text style={styles.metaText}>{currentStock} units available</Text>
            ) : (
              <Text style={[styles.metaText, styles.metaOutOfStock]}>
                Currently out of stock
              </Text>
            )}
          </View>

          {/* Variant Selector */}
          {variantGroups.map((group) => (
            <View key={group.name} style={styles.variantGroup}>
              <Text style={styles.variantGroupTitle}>
                {group.name}:{' '}
                <Text style={styles.variantSelectedValue}>
                  {selectedVariant?.name === group.name ? selectedVariant.value : 'Choose option'}
                </Text>
              </Text>

              <View style={styles.variantOptionsRow}>
                {group.options.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  const isOutOfStock = variant.stockQty <= 0;

                  return (
                    <Pressable
                      key={variant.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected, disabled: isOutOfStock }}
                      onPress={() => setSelectedVariant(variant)}
                      style={[
                        styles.variantChip,
                        isSelected && styles.variantChipSelected,
                        isOutOfStock && styles.variantChipDisabled,
                      ]}
                    >
                      {variant.hexColor ? (
                        <View
                          style={[
                            styles.colorDot,
                            { backgroundColor: variant.hexColor },
                          ]}
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.variantChipText,
                          isSelected && styles.variantChipTextSelected,
                          isOutOfStock && styles.variantChipTextDisabled,
                        ]}
                      >
                        {variant.value}
                      </Text>
                      {variant.priceDelta !== 0 ? (
                        <Text
                          style={[
                            styles.priceDeltaText,
                            isSelected && styles.priceDeltaTextSelected,
                          ]}
                        >
                          {variant.priceDelta > 0 ? '+' : ''}
                          {formatPrice(variant.priceDelta)}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Quantity Selector */}
          {currentStock > 0 ? (
            <View style={styles.quantitySection}>
              <Text style={styles.sectionLabel}>Quantity</Text>
              <QuantityStepper
                value={quantity}
                min={1}
                max={currentStock}
                onChange={setQuantity}
              />
            </View>
          ) : null}

          {/* Product Description */}
          {product.description ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Product Description</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Fixed Sticky Action Bar at Bottom */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <View style={styles.bottomBarPrice}>
          <Text style={styles.bottomBarTotalLabel}>Total</Text>
          <Text style={styles.bottomBarTotalPrice}>{formatPrice(totalPrice)}</Text>
        </View>
        <View style={styles.bottomBarAction}>
          <Button
            label={currentStock > 0 ? 'Add to Cart' : 'Out of Stock'}
            onPress={handleAddToCart}
            disabled={currentStock <= 0}
            variant={currentStock > 0 ? 'accent' : 'secondary'}
            icon={<Ionicons name="cart" size={20} color={colors.white} />}
          />
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
    flex: 1,
    marginHorizontal: spacing.md,
    fontSize: font.title,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.stone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageGallery: {
    backgroundColor: colors.surface,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: colors.stone,
  },
  mainImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.8,
  },
  galleryBadgeOverlay: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
  },
  thumbnailStrip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  thumbnailWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.stone,
    overflow: 'hidden',
  },
  thumbnailWrapActive: {
    borderColor: colors.ink,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone,
    ...shadow.card,
  },
  categoryBadge: {
    fontSize: font.caption,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: font.heading,
    fontWeight: '800',
    color: colors.ink,
    lineHeight: 28,
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneSoft,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  metaText: {
    fontSize: font.small,
    color: colors.muted,
    fontWeight: '500',
  },
  metaOutOfStock: {
    color: colors.danger,
    fontWeight: '700',
  },
  variantGroup: {
    marginTop: spacing.lg,
  },
  variantGroupTitle: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  variantSelectedValue: {
    color: colors.muted,
    fontWeight: '600',
  },
  variantOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  variantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.stone,
    backgroundColor: colors.surface,
    minHeight: 40,
  },
  variantChipSelected: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  variantChipDisabled: {
    opacity: 0.4,
    backgroundColor: colors.stoneSoft,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  variantChipText: {
    fontSize: font.body,
    fontWeight: '600',
    color: colors.ink,
  },
  variantChipTextSelected: {
    color: colors.white,
  },
  variantChipTextDisabled: {
    textDecorationLine: 'line-through',
  },
  priceDeltaText: {
    fontSize: font.caption,
    fontWeight: '600',
    color: colors.muted,
    marginLeft: spacing.xs,
  },
  priceDeltaTextSelected: {
    color: colors.stone,
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.stoneSoft,
  },
  sectionLabel: {
    fontSize: font.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  descriptionSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.stoneSoft,
  },
  descriptionText: {
    fontSize: font.body,
    color: colors.inkSoft,
    lineHeight: 24,
    marginTop: spacing.sm,
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
  bottomBarPrice: {
    flex: 1,
  },
  bottomBarTotalLabel: {
    fontSize: font.caption,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomBarTotalPrice: {
    fontSize: font.title,
    fontWeight: '800',
    color: colors.ink,
  },
  bottomBarAction: {
    flex: 1.5,
  },
});
