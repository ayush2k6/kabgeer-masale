import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

interface OrderItemPayload {
  productId: string;
  quantity: number;
}

interface ShippingPayload {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  address: string;
  apartment?: string;
  city: string;
  state?: string;
  pinCode: string;
  country?: string;
}

interface PricingConfigPayload {
  discountAmount?: number;
  taxAmount?: number;
  shippingFee?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') || '';
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Authenticate Customer identity from Bearer token (DO NOT trust client customer_id)
    let customerId: string | null = null;
    let customerType: 'guest' | 'registered' = 'guest';

    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (!authErr && user) {
        customerId = user.id;
        customerType = 'registered';
      }
    }

    // 2. Parse request body
    const body = await req.json();
    const items: OrderItemPayload[] = body.items || [];
    const shipping: ShippingPayload = body.shippingDetails || {};
    const pricingConfig: PricingConfigPayload = body.pricingConfig || {};

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Cart items array cannot be empty.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!shipping.email || !shipping.address || !shipping.city || !shipping.pinCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required shipping address fields (email, address, city, pinCode).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Retrieve authoritative product data from public.products
    const productIds = items.map((i) => i.productId);
    const { data: dbProducts, error: prodErr } = await supabase
      .from('products')
      .select('id, name, sku, price, mrp, is_active, image_url')
      .in('id', productIds);

    if (prodErr || !dbProducts || dbProducts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch products from database.', details: prodErr?.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Retrieve inventory for validation
    const { data: dbInventory, error: invErr } = await supabase
      .from('inventory')
      .select('product_id, stock_quantity')
      .in('product_id', productIds);

    if (invErr) {
      console.warn('Inventory fetch warning:', invErr.message);
    }

    const inventoryMap = new Map((dbInventory || []).map((i) => [i.product_id, i.stock_quantity]));
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // 5. Validate every requested item and calculate authoritative subtotal
    let subtotal = 0;
    let totalQuantity = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return new Response(
          JSON.stringify({ error: `Product ID '${item.productId}' does not exist in database.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!product.is_active) {
        return new Response(
          JSON.stringify({ error: `Product '${product.name}' is currently inactive.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!item.quantity || item.quantity < 1 || !Number.isInteger(item.quantity)) {
        return new Response(
          JSON.stringify({ error: `Invalid quantity '${item.quantity}' for product '${product.name}'.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const availableStock = inventoryMap.get(item.productId) ?? 999;
      if (availableStock < item.quantity && availableStock !== 0) {
        return new Response(
          JSON.stringify({ error: `Insufficient stock for '${product.name}'. Requested: ${item.quantity}, Available: ${availableStock}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const unitPrice = Number(product.price);
      const lineSubtotal = unitPrice * item.quantity;
      subtotal += lineSubtotal;
      totalQuantity += item.quantity;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: unitPrice,
        quantity: item.quantity,
        subtotal: lineSubtotal,
        product_image: product.image_url
      });
    }

    // 6. Pricing Calculations (Exact scalar columns matching public.orders schema)
    const discount = Number((pricingConfig.discountAmount || 0).toFixed(2));
    const taxFee = Number((pricingConfig.taxAmount || 0).toFixed(2));
    const shippingFee = Number((pricingConfig.shippingFee || 0).toFixed(2));

    const totalAmount = Number((subtotal - discount + taxFee + shippingFee).toFixed(2));
    const amountInPaise = Math.round(totalAmount * 100);

    const displayOrderId = `KAB-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 7. Create Pending Order Record in Supabase (100% aligned with public.orders table schema)
    const newOrderRecord = {
      display_order_id: displayOrderId,
      customer_id: customerId,
      customer_type: customerType,
      customer_name: `${shipping.firstName} ${shipping.lastName || ''}`.trim(),
      customer_email: shipping.email,
      customer_phone: shipping.phone || '',
      shipping_address: {
        address: shipping.address,
        apartment: shipping.apartment || '',
        city: shipping.city,
        state: shipping.state || 'Uttar Pradesh',
        pinCode: shipping.pinCode,
        country: shipping.country || 'India'
      },
      billing_address: body.billingAddress === 'same' || !body.billingAddress ? {
        address: shipping.address,
        apartment: shipping.apartment || '',
        city: shipping.city,
        state: shipping.state || 'Uttar Pradesh',
        pinCode: shipping.pinCode,
        country: shipping.country || 'India'
      } : body.billingAddress,
      subtotal: Number(subtotal.toFixed(2)),
      discount: discount,
      tax: taxFee,
      shipping_fee: shippingFee,
      total_amount: totalAmount,
      order_status: 'Pending',
      payment_status: 'Pending'
    };

    const { data: dbOrder, error: dbOrderErr } = await supabase
      .from('orders')
      .insert(newOrderRecord)
      .select('id, display_order_id')
      .single();

    if (dbOrderErr || !dbOrder) {
      console.error('Error inserting pending order:', dbOrderErr?.message);
      return new Response(
        JSON.stringify({ error: 'Failed to create pending order record.', details: dbOrderErr?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Insert Order Items Records (Correct column name: total_price matching public.order_items DDL)
    const orderItemsToInsert = validatedItems.map((item) => ({
      order_id: dbOrder.id,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      total_price: item.subtotal,
      product_image: item.product_image
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsToInsert);
    if (itemsErr) {
      console.error('Error inserting order items:', itemsErr.message);
    }

    // 9. Call Razorpay API to create Razorpay Order (Server-Side Secret Key)
    let razorpayOrderId = null;
    let isTestModeMode = false;

    if (razorpayKeyId && razorpayKeySecret && !razorpayKeyId.includes('PLACEHOLDER')) {
      const authCredentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authCredentials}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: displayOrderId,
          notes: {
            supabase_order_id: dbOrder.id,
            display_order_id: displayOrderId
          }
        })
      });

      if (!rzpResponse.ok) {
        const rzpErrText = await rzpResponse.text();
        console.error('Razorpay API error:', rzpErrText);
        // Rollback pending order to avoid database pollution
        await supabase.from('orders').update({ order_status: 'Cancelled' }).eq('id', dbOrder.id);
        return new Response(
          JSON.stringify({ error: 'Failed to generate Razorpay payment order.', details: rzpErrText }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const rzpData = await rzpResponse.json();
      razorpayOrderId = rzpData.id;

      // Update DB order with razorpay_order_id
      await supabase
        .from('orders')
        .update({ razorpay_order_id: razorpayOrderId })
        .eq('id', dbOrder.id);
    } else {
      isTestModeMode = true;
      razorpayOrderId = `order_simulated_${Date.now()}`;
      await supabase
        .from('orders')
        .update({ razorpay_order_id: razorpayOrderId })
        .eq('id', dbOrder.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: dbOrder.id,
        displayOrderId: dbOrder.display_order_id,
        razorpayOrderId: razorpayOrderId,
        amountInPaise: amountInPaise,
        totalAmount: totalAmount,
        currency: 'INR',
        keyId: razorpayKeyId || 'RAZORPAY_KEY_ID_PENDING_CONFIG',
        isTestMode: isTestModeMode
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unhandled create-razorpay-order error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
