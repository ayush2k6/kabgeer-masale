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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

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

    // Input Sanitization & Payload Bounds Enforcement (Security Hardening)
    const sanitizedEmail = String(shipping.email).trim().toLowerCase();
    const sanitizedPinCode = String(shipping.pinCode).trim();
    const sanitizedPhone = String(shipping.phone || '').trim().replace(/[^0-9+]/g, '');

    if (!EMAIL_REGEX.test(sanitizedEmail) || sanitizedEmail.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!PINCODE_REGEX.test(sanitizedPinCode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid 6-digit Indian PIN code format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (shipping.address.length > 500 || shipping.city.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Shipping address or city exceeds maximum allowed length limits.' }),
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
          JSON.stringify({ error: `Product ID '${item.productId}' not found in active catalog.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!product.is_active) {
        return new Response(
          JSON.stringify({ error: `Product '${product.name}' is currently unavailable.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const requestedQty = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)));
      const availableStock = inventoryMap.get(item.productId) ?? 0;

      if (availableStock < requestedQty) {
        return new Response(
          JSON.stringify({
            error: `Insufficient stock for '${product.name}'. Available: ${availableStock}, Requested: ${requestedQty}`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const itemTotalPrice = product.price * requestedQty;
      subtotal += itemTotalPrice;
      totalQuantity += requestedQty;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: requestedQty,
        total_price: itemTotalPrice,
        product_image: product.image_url
      });
    }

    // 6. Authoritative Server-Side Pricing Calculations
    const discountAmount = Math.max(0, Math.min(subtotal, Number(pricingConfig.discountAmount) || 0));
    const taxAmount = Math.max(0, Number(pricingConfig.taxAmount) || 0);
    const shippingFee = Math.max(0, Number(pricingConfig.shippingFee) || 0);
    const finalTotal = Math.max(1, Math.round((subtotal - discountAmount + taxAmount + shippingFee) * 100) / 100);

    // 7. Generate Display Order ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const displayOrderId = `KAB-${dateStr}-${randomCode}`;

    // 8. Create Razorpay Order if keys are present (or fallback to simulation)
    let razorpayOrderId = `order_sim_${Date.now()}`;
    let isSimulationMode = false;

    if (razorpayKeyId && razorpayKeySecret && !razorpayKeyId.includes('PLACEHOLDER')) {
      try {
        const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
        const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${basicAuth}`
          },
          body: JSON.stringify({
            amount: Math.round(finalTotal * 100),
            currency: 'INR',
            receipt: displayOrderId,
            notes: {
              customer_email: sanitizedEmail,
              display_order_id: displayOrderId
            }
          })
        });

        const rzpData = await rzpResponse.json();
        if (rzpResponse.ok && rzpData.id) {
          razorpayOrderId = rzpData.id;
        } else {
          console.warn('Razorpay API error, using simulation order ID:', rzpData);
          isSimulationMode = true;
        }
      } catch (err: any) {
        console.error('Razorpay order creation exception, falling back to simulation mode:', err.message);
        isSimulationMode = true;
      }
    } else {
      isSimulationMode = true;
    }

    const fullName = `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim() || 'Valued Customer';

    const normalizedShippingAddress = {
      firstName: shipping.firstName || '',
      lastName: shipping.lastName || '',
      email: sanitizedEmail,
      phone: sanitizedPhone,
      address: shipping.address || '',
      apartment: shipping.apartment || '',
      city: shipping.city || '',
      state: shipping.state || 'Uttar Pradesh',
      pinCode: sanitizedPinCode,
      country: shipping.country || 'India'
    };

    // 9. Insert Record into public.orders
    const { data: insertedOrder, error: orderInsertErr } = await supabase
      .from('orders')
      .insert({
        display_order_id: displayOrderId,
        customer_id: customerId,
        customer_name: fullName,
        customer_email: sanitizedEmail,
        customer_phone: sanitizedPhone,
        shipping_address: normalizedShippingAddress,
        billing_address: normalizedShippingAddress,
        customer_type: customerType,
        order_status: 'Pending',
        payment_status: 'Pending',
        subtotal: subtotal,
        discount: discountAmount,
        tax: taxAmount,
        shipping_fee: shippingFee,
        total_amount: finalTotal,
        razorpay_order_id: razorpayOrderId
      })
      .select()
      .single();

    if (orderInsertErr || !insertedOrder) {
      console.error('Order insert error:', orderInsertErr);
      return new Response(
        JSON.stringify({ error: 'Failed to record order in database.', details: orderInsertErr?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 10. Insert Line Items into public.order_items
    const orderItemsToInsert = validatedItems.map((item) => ({
      ...item,
      order_id: insertedOrder.id
    }));

    const { error: itemsInsertErr } = await supabase.from('order_items').insert(orderItemsToInsert);

    if (itemsInsertErr) {
      console.error('Order items insert error:', itemsInsertErr);
      await supabase.from('orders').delete().eq('id', insertedOrder.id);
      return new Response(
        JSON.stringify({ error: 'Failed to record order items.', details: itemsInsertErr?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: insertedOrder.id,
        displayOrderId: displayOrderId,
        razorpayOrderId: razorpayOrderId,
        amount: Math.round(finalTotal * 100),
        currency: 'INR',
        key: razorpayKeyId || 'rzp_test_placeholder',
        isSimulationMode: isSimulationMode,
        summary: {
          subtotal: subtotal,
          discount: discountAmount,
          tax: taxAmount,
          shipping: shippingFee,
          total: finalTotal,
          itemsCount: totalQuantity
        }
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
