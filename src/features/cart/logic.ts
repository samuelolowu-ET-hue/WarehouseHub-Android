import type { Product, ProductVariant } from '../catalogue/catalogue';
import { getSelectionStock, getUnitPrice } from '../catalogue/logic';
import { roundMoney } from '../../lib/format';

export type CartItem = {
  id: string; // Database UUID or local UUID for guest
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  variantId: string | null;
  variantName: string | null;
  variantValue: string | null;
  unitPrice: number;
  quantity: number;
  maxStock: number;
};

export function createCartItem(
  id: string,
  product: Product,
  variant: ProductVariant | null,
  quantity: number
): CartItem {
  const stock = getSelectionStock(product, variant);
  const clampedQty = Math.max(1, Math.min(quantity, stock > 0 ? stock : 1));

  return {
    id,
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    imageUrl: product.images[0]?.url ?? null,
    variantId: variant?.id ?? null,
    variantName: variant?.name ?? null,
    variantValue: variant?.value ?? null,
    unitPrice: getUnitPrice(product, variant),
    quantity: clampedQty,
    maxStock: stock,
  };
}

export function computeSubtotal(items: CartItem[]): number {
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return roundMoney(total);
}

export function computeTotalCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Adds an item or increments its quantity if a line with the identical
 * product and variant already exists. Avoids duplicates.
 */
export function addItemToList(items: CartItem[], newItem: CartItem): CartItem[] {
  const existingIndex = items.findIndex(
    (item) => item.productId === newItem.productId && item.variantId === newItem.variantId
  );

  if (existingIndex === -1) {
    return [newItem, ...items];
  }

  const existing = items[existingIndex];
  const maxAllowed = Math.max(existing.maxStock, newItem.maxStock);
  const nextQty = Math.min(existing.quantity + newItem.quantity, maxAllowed > 0 ? maxAllowed : 99);

  const updated = [...items];
  updated[existingIndex] = {
    ...existing,
    quantity: nextQty,
    maxStock: maxAllowed,
    unitPrice: newItem.unitPrice, // Keep latest price
  };

  return updated;
}

export function updateQuantityInList(
  items: CartItem[],
  itemId: string,
  newQuantity: number
): CartItem[] {
  if (newQuantity <= 0) {
    return items.filter((item) => item.id !== itemId);
  }

  return items.map((item) => {
    if (item.id !== itemId) {
      return item;
    }
    const clamped = item.maxStock > 0 ? Math.min(newQuantity, item.maxStock) : newQuantity;
    return {
      ...item,
      quantity: Math.max(1, clamped),
    };
  });
}

export function removeItemFromList(items: CartItem[], itemId: string): CartItem[] {
  return items.filter((item) => item.id !== itemId);
}

/**
 * Validates cart items against fresh product/variant data from the server.
 * Clamps quantities if stock decreased and updates latest unit prices.
 */
export function reconcileCartWithCatalog(
  items: CartItem[],
  products: Product[]
): {
  reconciled: CartItem[];
  hasChanges: boolean;
  outOfStockItems: CartItem[];
} {
  const productMap = new Map(products.map((p) => [p.id, p]));
  let hasChanges = false;
  const outOfStockItems: CartItem[] = [];

  const reconciled: CartItem[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      // Product no longer exists or unpublished
      hasChanges = true;
      outOfStockItems.push({ ...item, maxStock: 0 });
      continue;
    }

    const variant = item.variantId
      ? product.variants.find((v) => v.id === item.variantId) ?? null
      : null;

    const currentStock = getSelectionStock(product, variant);
    const freshUnitPrice = getUnitPrice(product, variant);

    if (currentStock <= 0) {
      hasChanges = true;
      outOfStockItems.push({ ...item, maxStock: 0 });
      continue;
    }

    const nextQty = Math.min(item.quantity, currentStock);
    if (nextQty !== item.quantity || freshUnitPrice !== item.unitPrice || currentStock !== item.maxStock) {
      hasChanges = true;
    }

    reconciled.push({
      ...item,
      quantity: nextQty,
      maxStock: currentStock,
      unitPrice: freshUnitPrice,
      imageUrl: product.images[0]?.url ?? item.imageUrl,
    });
  }

  return { reconciled, hasChanges, outOfStockItems };
}
