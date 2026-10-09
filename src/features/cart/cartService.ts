import * as SecureStore from 'expo-secure-store';

import { supabase } from '../../lib/supabase/client';
import type { CartItem } from './logic';
import type { Product, ProductVariant } from '../catalogue/catalogue';
import { getSelectionStock, getUnitPrice } from '../catalogue/logic';

const GUEST_CART_STORAGE_KEY = 'warehousehub_guest_cart_v1';

/**
 * Loads guest cart items stored in SecureStore on the device.
 */
export async function loadGuestCart(): Promise<CartItem[]> {
  try {
    const raw = await SecureStore.getItemAsync(GUEST_CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read local guest cart:', error);
    return [];
  }
}

/**
 * Saves guest cart items to SecureStore.
 */
export async function saveGuestCart(items: CartItem[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to write local guest cart:', error);
  }
}

/**
 * Clears the local guest cart storage.
 */
export async function clearGuestCart(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(GUEST_CART_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear guest cart:', error);
  }
}

/**
 * Loads authenticated cart items from the remote Supabase database.
 */
export async function fetchRemoteCart(userId: string): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      product_id,
      variant_id,
      quantity,
      products (
        id,
        name,
        slug,
        base_price,
        stock_qty,
        published,
        product_images (
          url,
          sort_order
        )
      ),
      product_variants (
        id,
        name,
        value,
        price_delta,
        stock_qty
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load cart from server: ${error.message}`);
  }

  const items: CartItem[] = [];

  for (const row of data ?? []) {
    const productRaw = Array.isArray(row.products) ? row.products[0] : row.products;
    if (!productRaw || !productRaw.published) {
      continue;
    }

    const variantRaw = Array.isArray(row.product_variants)
      ? row.product_variants[0]
      : row.product_variants;

    const basePrice = Number(productRaw.base_price);
    const priceDelta = variantRaw ? Number(variantRaw.price_delta ?? 0) : 0;
    const unitPrice = Math.round((basePrice + priceDelta) * 100) / 100;

    const stock = variantRaw
      ? Math.max(0, variantRaw.stock_qty)
      : Math.max(0, productRaw.stock_qty);

    const sortedImages = [...(productRaw.product_images ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );

    items.push({
      id: row.id,
      productId: row.product_id,
      productName: productRaw.name,
      productSlug: productRaw.slug,
      imageUrl: sortedImages[0]?.url ?? null,
      variantId: row.variant_id,
      variantName: variantRaw?.name ?? null,
      variantValue: variantRaw?.value ?? null,
      unitPrice,
      quantity: row.quantity,
      maxStock: stock,
    });
  }

  return items;
}

/**
 * Adds an item to the remote user cart on Supabase.
 * Respects unique index (user_id, product_id, variant_id).
 */
export async function addRemoteCartItem(
  userId: string,
  product: Product,
  variant: ProductVariant | null,
  quantity: number
): Promise<string> {
  const variantId = variant?.id ?? null;

  // Check if this item is already in user's cart
  let query = supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', product.id);

  if (variantId) {
    query = query.eq('variant_id', variantId);
  } else {
    query = query.is('variant_id', null);
  }

  const { data: existing, error: checkError } = await query.maybeSingle();

  if (checkError) {
    console.error('Error checking existing cart item:', checkError);
  }

  const stock = getSelectionStock(product, variant);

  if (existing) {
    const nextQty = Math.min(existing.quantity + quantity, stock > 0 ? stock : 99);
    const { error: updateError } = await supabase
      .from('cart_items')
      .update({ quantity: nextQty })
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(`Failed to update cart item: ${updateError.message}`);
    }
    return existing.id;
  }

  const newQty = Math.min(quantity, stock > 0 ? stock : 99);
  const { data: inserted, error: insertError } = await supabase
    .from('cart_items')
    .insert({
      user_id: userId,
      product_id: product.id,
      variant_id: variantId,
      quantity: newQty,
    })
    .select('id')
    .single();

  if (insertError) {
    throw new Error(`Failed to add item to cart: ${insertError.message}`);
  }

  return inserted.id;
}

/**
 * Updates a line quantity on Supabase.
 */
export async function updateRemoteCartQuantity(
  itemId: string,
  quantity: number
): Promise<void> {
  const { error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', itemId);

  if (error) {
    throw new Error(`Failed to update cart quantity: ${error.message}`);
  }
}

/**
 * Deletes a line from Supabase cart.
 */
export async function deleteRemoteCartItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId);

  if (error) {
    throw new Error(`Failed to remove item from cart: ${error.message}`);
  }
}

/**
 * Clears all items from user cart in Supabase.
 */
export async function clearRemoteCart(userId: string): Promise<void> {
  const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to clear cart: ${error.message}`);
  }
}

/**
 * Syncs/merges guest cart items into user's remote Supabase cart upon sign in.
 */
export async function mergeGuestCartIntoRemote(
  userId: string,
  guestItems: CartItem[]
): Promise<void> {
  if (guestItems.length === 0) {
    return;
  }

  for (const item of guestItems) {
    try {
      // Check existing in remote
      let query = supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('product_id', item.productId);

      if (item.variantId) {
        query = query.eq('variant_id', item.variantId);
      } else {
        query = query.is('variant_id', null);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const nextQty = Math.min(existing.quantity + item.quantity, item.maxStock || 99);
        await supabase.from('cart_items').update({ quantity: nextQty }).eq('id', existing.id);
      } else {
        await supabase.from('cart_items').insert({
          user_id: userId,
          product_id: item.productId,
          variant_id: item.variantId,
          quantity: item.quantity,
        });
      }
    } catch (err) {
      console.warn('Failed to merge guest cart item into remote:', err);
    }
  }

  await clearGuestCart();
}
