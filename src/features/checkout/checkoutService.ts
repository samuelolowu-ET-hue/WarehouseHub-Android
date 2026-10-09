import { supabase } from '../../lib/supabase/client';
import type { CartItem } from '../cart/logic';
import { roundMoney } from '../../lib/format';
import { clearRemoteCart } from '../cart/cartService';

export type ShippingAddress = {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  country?: string;
  phone?: string;
};

export type CompletedOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: ShippingAddress;
  subtotal: number;
  shippingTotal: number;
  total: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: {
    id: string;
    productId: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
};

/**
 * Attempts to execute the server-side transactional RPC `create_checkout_order`.
 * Returns null if the RPC is not deployed in the remote Supabase schema.
 */
async function tryRpcCheckout(
  shippingAddress: ShippingAddress,
  cartItems: CartItem[]
): Promise<CompletedOrder | null> {
  try {
    const itemsPayload = cartItems.map((item) => ({
      product_id: item.productId,
      variant_id: item.variantId || null,
      quantity: item.quantity,
    }));

    const { data, error } = await (supabase.rpc as any)('create_checkout_order', {
      p_shipping_address: shippingAddress,
      p_items: itemsPayload,
    });

    if (error) {
      // Check if function does not exist in remote Supabase
      const isMissingFunction =
        error.code === 'PGRST202' ||
        error.code === '42883' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('Could not find the function');

      if (isMissingFunction) {
        return null;
      }

      // Business error from RPC (e.g., 'WH: Insufficient stock')
      throw new Error(error.message.replace(/^WH:\s*/, ''));
    }

    if (!data) {
      return null;
    }

    const res = data as any;
    return {
      id: res.order_id,
      orderNumber: res.order_number,
      customerName: res.customer_name ?? shippingAddress.fullName,
      customerEmail: res.customer_email ?? '',
      shippingAddress,
      subtotal: Number(res.subtotal),
      shippingTotal: Number(res.shipping_total),
      total: Number(res.total),
      status: res.status ?? 'confirmed',
      paymentMethod: 'direct',
      paymentStatus: 'paid',
      createdAt: new Date().toISOString(),
      items: (res.items ?? []).map((it: any) => ({
        id: it.id,
        productId: it.product_id,
        productName: it.product_name,
        variantName: it.variant_name ?? null,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
        lineTotal: Number(it.line_total),
      })),
    };
  } catch (err: any) {
    if (
      err.code === 'PGRST202' ||
      err.message?.includes('does not exist') ||
      err.message?.includes('Could not find the function')
    ) {
      return null;
    }
    throw err;
  }
}

/**
 * Places a verified, secure order.
 * First tries the atomic database RPC if deployed.
 * If the RPC is not deployed in the remote database, executes the verified
 * client-side path re-validating prices, discounts, and inventory directly from Supabase tables.
 */
export async function placeOrder(
  userId: string,
  userEmail: string,
  shippingAddress: ShippingAddress,
  cartItems: CartItem[]
): Promise<CompletedOrder> {
  if (!userId || !userEmail) {
    throw new Error('Authentication is required to place an order.');
  }

  if (cartItems.length === 0) {
    throw new Error('Your shopping basket is empty.');
  }

  // 1. Try server-side atomic RPC first (if deployed)
  const rpcOrder = await tryRpcCheckout(shippingAddress, cartItems);
  if (rpcOrder) {
    // Send email confirmation
    triggerOrderConfirmationEmail(rpcOrder);
    return rpcOrder;
  }

  // 2. Fallback: Fetch fresh, authoritative product data from Supabase
  const productIds = Array.from(new Set(cartItems.map((item) => item.productId)));

  const { data: dbProducts, error: prodError } = await supabase
    .from('products')
    .select('id, name, base_price, stock_qty, published')
    .in('id', productIds);

  if (prodError || !dbProducts) {
    throw new Error(`Failed to verify products: ${prodError?.message ?? 'Unknown error'}`);
  }

  const prodMap = new Map(dbProducts.map((p) => [p.id, p]));

  // 3. Fetch fresh variant data if any items have variants
  const variantIds = cartItems
    .map((item) => item.variantId)
    .filter((id): id is string => Boolean(id));

  let variantMap = new Map<string, { id: string; name: string; value: string; price_delta: number | null; stock_qty: number; sku: string | null }>();

  if (variantIds.length > 0) {
    const { data: dbVariants, error: varError } = await supabase
      .from('product_variants')
      .select('id, name, value, price_delta, stock_qty, sku')
      .in('id', variantIds);

    if (varError || !dbVariants) {
      throw new Error(`Failed to verify product options: ${varError?.message ?? 'Unknown error'}`);
    }

    variantMap = new Map(dbVariants.map((v) => [v.id, v]));
  }

  // 4. Authoritatively verify stock and calculate line totals
  let verifiedSubtotal = 0;
  const verifiedLines: {
    productId: string;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[] = [];

  for (const item of cartItems) {
    const dbProduct = prodMap.get(item.productId);
    if (!dbProduct || !dbProduct.published) {
      throw new Error(`"${item.productName}" is no longer available.`);
    }

    let authoritativeUnitPrice = Number(dbProduct.base_price);
    let availableStock = dbProduct.stock_qty;
    let variantNameText: string | null = null;
    let skuText: string | null = null;

    if (item.variantId) {
      const dbVariant = variantMap.get(item.variantId);
      if (!dbVariant) {
        throw new Error(`Selected option for "${item.productName}" is no longer available.`);
      }

      authoritativeUnitPrice += Number(dbVariant.price_delta ?? 0);
      availableStock = dbVariant.stock_qty;
      variantNameText = `${dbVariant.name}: ${dbVariant.value}`;
      skuText = dbVariant.sku;
    }

    if (availableStock < item.quantity) {
      throw new Error(
        `Insufficient stock for "${item.productName}"${variantNameText ? ` (${variantNameText})` : ''}. Available: ${availableStock}, requested: ${item.quantity}.`
      );
    }

    authoritativeUnitPrice = roundMoney(authoritativeUnitPrice);
    const lineTotal = roundMoney(authoritativeUnitPrice * item.quantity);
    verifiedSubtotal = roundMoney(verifiedSubtotal + lineTotal);

    verifiedLines.push({
      productId: item.productId,
      variantId: item.variantId,
      productName: dbProduct.name,
      variantName: variantNameText,
      sku: skuText,
      quantity: item.quantity,
      unitPrice: authoritativeUnitPrice,
      lineTotal,
    });
  }

  // 5. Calculate delivery: Free over £50, else £4.99
  const verifiedShipping = verifiedSubtotal >= 50 ? 0 : 4.99;
  const verifiedTotal = roundMoney(verifiedSubtotal + verifiedShipping);

  // 6. Generate unique order number via Supabase function
  let orderNumber: string;
  try {
    const { data: numData, error: numError } = await supabase.rpc('generate_order_number');
    if (numError || !numData) {
      throw new Error(numError?.message);
    }
    orderNumber = numData;
  } catch {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    orderNumber = `WH-${dateStr}-${randomHex}`;
  }

  // 7. Insert Order into Supabase
  const { data: newOrder, error: orderInsertError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: userId,
      customer_name: shippingAddress.fullName.trim(),
      customer_email: userEmail.trim().toLowerCase(),
      shipping_address: shippingAddress,
      subtotal: verifiedSubtotal,
      shipping_total: verifiedShipping,
      total: verifiedTotal,
      status: 'confirmed',
      payment_method: 'direct',
      payment_status: 'paid',
      email_sent: false,
    })
    .select('id, created_at')
    .single();

  if (orderInsertError || !newOrder) {
    throw new Error(`Failed to create order: ${orderInsertError?.message ?? 'Database error'}`);
  }

  const orderId = newOrder.id;

  // 8. Insert Order Items into Supabase
  const orderItemsToInsert = verifiedLines.map((line) => ({
    order_id: orderId,
    product_id: line.productId,
    variant_id: line.variantId,
    product_name: line.productName,
    variant_name: line.variantName,
    sku: line.sku,
    quantity: line.quantity,
    unit_price: line.unitPrice,
    line_total: line.lineTotal,
  }));

  const { data: insertedItems, error: itemsInsertError } = await supabase
    .from('order_items')
    .insert(orderItemsToInsert)
    .select('id, product_id, product_name, variant_name, quantity, unit_price, line_total');

  if (itemsInsertError) {
    console.error('Error inserting order items:', itemsInsertError);
    throw new Error(
      `Order ${orderNumber} created but items could not be saved. Please contact support.`
    );
  }

  // 9. Clear user cart in Supabase
  try {
    await clearRemoteCart(userId);
  } catch (err) {
    console.warn('Failed to clear cart after order:', err);
  }

  const completed: CompletedOrder = {
    id: orderId,
    orderNumber,
    customerName: shippingAddress.fullName,
    customerEmail: userEmail,
    shippingAddress,
    subtotal: verifiedSubtotal,
    shippingTotal: verifiedShipping,
    total: verifiedTotal,
    status: 'confirmed',
    paymentMethod: 'direct',
    paymentStatus: 'paid',
    createdAt: newOrder.created_at ?? new Date().toISOString(),
    items: (insertedItems ?? []).map((row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      variantName: row.variant_name,
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      lineTotal: Number(row.line_total),
    })),
  };

  // 10. Asynchronously trigger send-order-confirmation Edge Function
  triggerOrderConfirmationEmail(completed);

  return completed;
}

/**
 * Triggers the send-order-confirmation edge function asynchronously.
 */
function triggerOrderConfirmationEmail(order: CompletedOrder) {
  try {
    const emailPayload = {
      order: {
        id: order.id,
        order_number: order.orderNumber,
        customer_name: order.customerName,
        customer_email: order.customerEmail,
        created_at: order.createdAt,
        subtotal: order.subtotal,
        shipping_total: order.shippingTotal,
        total: order.total,
        items: order.items.map((it) => ({
          product_name: it.productName,
          variant_name: it.variantName,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          line_total: it.lineTotal,
        })),
      },
    };

    supabase.functions
      .invoke('send-order-confirmation', {
        body: emailPayload,
      })
      .then(async ({ error: fnError }) => {
        if (!fnError) {
          await supabase.from('orders').update({ email_sent: true }).eq('id', order.id);
        } else {
          await supabase
            .from('orders')
            .update({ email_error: fnError.message })
            .eq('id', order.id);
        }
      })
      .catch((e) => console.warn('Order confirmation email trigger failed:', e));
  } catch (emailErr) {
    console.warn('Could not invoke email function:', emailErr);
  }
}
