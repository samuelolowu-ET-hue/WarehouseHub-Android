-- Migration: 20261009000000_create_checkout_order_rpc.sql
-- Description: Server-side transactional checkout RPC with atomic stock verification,
--              authoritative price calculation, and order generation.

CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_shipping_address JSONB,
  p_items JSONB -- Array of { "product_id": uuid, "variant_id": uuid|null, "quantity": int }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_profile RECORD;
  v_item JSONB;
  v_product RECORD;
  v_variant RECORD;
  v_order_id UUID := gen_random_uuid();
  v_order_number TEXT;
  v_subtotal NUMERIC := 0;
  v_shipping_total NUMERIC := 0;
  v_order_total NUMERIC := 0;
  v_unit_price NUMERIC;
  v_line_total NUMERIC;
  v_item_stock INT;
  v_qty INT;
  v_order_items_payload JSONB := '[]'::JSONB;
BEGIN
  -- 1. Ensure caller is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'WH: Authentication required to place an order.';
  END IF;

  -- 2. Fetch user profile
  SELECT id, email, full_name INTO v_user_profile
  FROM public.user_profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WH: User profile not found.';
  END IF;

  -- 3. Validate items payload
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'WH: Basket is empty.';
  END IF;

  -- 4. Process each item: lock row, calculate authoritative price, verify stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::INT;
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'WH: Invalid quantity for product %', v_item->>'product_id';
    END IF;

    -- Lock and fetch published product
    SELECT id, name, base_price, stock_qty, published
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;

    IF NOT FOUND OR NOT v_product.published THEN
      RAISE EXCEPTION 'WH: Product is unavailable or does not exist.';
    END IF;

    v_unit_price := v_product.base_price;

    -- If variant is specified, lock and fetch variant
    IF (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') <> '' THEN
      SELECT id, name, value, price_delta, stock_qty, sku
      INTO v_variant
      FROM public.product_variants
      WHERE id = (v_item->>'variant_id')::UUID AND product_id = v_product.id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'WH: Selected variant is unavailable.';
      END IF;

      v_unit_price := ROUND(v_unit_price + COALESCE(v_variant.price_delta, 0), 2);
      v_item_stock := v_variant.stock_qty;

      -- Check stock
      IF v_item_stock < v_qty THEN
        RAISE EXCEPTION 'WH: Insufficient stock for % (%). Available: %', v_product.name, v_variant.value, v_item_stock;
      END IF;

      -- Decrement variant stock
      UPDATE public.product_variants
      SET stock_qty = stock_qty - v_qty
      WHERE id = v_variant.id;
    ELSE
      v_item_stock := v_product.stock_qty;
      IF v_item_stock < v_qty THEN
        RAISE EXCEPTION 'WH: Insufficient stock for %. Available: %', v_product.name, v_item_stock;
      END IF;

      -- Decrement product stock
      UPDATE public.products
      SET stock_qty = stock_qty - v_qty
      WHERE id = v_product.id;
    END IF;

    v_line_total := ROUND(v_unit_price * v_qty, 2);
    v_subtotal := v_subtotal + v_line_total;

    -- Accumulate order item
    v_order_items_payload := v_order_items_payload || jsonb_build_object(
      'id', gen_random_uuid(),
      'order_id', v_order_id,
      'product_id', v_product.id,
      'variant_id', CASE WHEN (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') <> '' THEN (v_item->>'variant_id')::UUID ELSE NULL END,
      'product_name', v_product.name,
      'variant_name', CASE WHEN v_variant.name IS NOT NULL THEN (v_variant.name || ': ' || v_variant.value) ELSE NULL END,
      'sku', COALESCE(v_variant.sku, NULL),
      'quantity', v_qty,
      'unit_price', v_unit_price,
      'line_total', v_line_total
    );
  END LOOP;

  -- 5. Calculate delivery charge: Free over £50, else £4.99
  IF v_subtotal >= 50.00 THEN
    v_shipping_total := 0;
  ELSE
    v_shipping_total := 4.99;
  END IF;

  v_order_total := v_subtotal + v_shipping_total;
  v_order_number := public.generate_order_number();

  -- 6. Insert order record
  INSERT INTO public.orders (
    id,
    order_number,
    user_id,
    customer_name,
    customer_email,
    shipping_address,
    subtotal,
    shipping_total,
    total,
    status,
    payment_method,
    payment_status,
    email_sent
  ) VALUES (
    v_order_id,
    v_order_number,
    v_user_id,
    COALESCE(v_user_profile.full_name, 'Customer'),
    v_user_profile.email,
    p_shipping_address,
    v_subtotal,
    v_shipping_total,
    v_order_total,
    'confirmed',
    'direct',
    'paid',
    false
  );

  -- 7. Insert all order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order_items_payload)
  LOOP
    INSERT INTO public.order_items (
      id,
      order_id,
      product_id,
      variant_id,
      product_name,
      variant_name,
      sku,
      quantity,
      unit_price,
      line_total
    ) VALUES (
      (v_item->>'id')::UUID,
      (v_item->>'order_id')::UUID,
      (v_item->>'product_id')::UUID,
      CASE WHEN (v_item->>'variant_id') IS NOT NULL THEN (v_item->>'variant_id')::UUID ELSE NULL END,
      v_item->>'product_name',
      v_item->>'variant_name',
      v_item->>'sku',
      (v_item->>'quantity')::INT,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'line_total')::NUMERIC
    );
  END LOOP;

  -- 8. Clear user cart items in Supabase
  DELETE FROM public.cart_items WHERE user_id = v_user_id;

  -- 9. Return completed order object
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'shipping_total', v_shipping_total,
    'total', v_order_total,
    'status', 'confirmed',
    'customer_name', COALESCE(v_user_profile.full_name, 'Customer'),
    'customer_email', v_user_profile.email,
    'items', v_order_items_payload
  );
END;
$$;
