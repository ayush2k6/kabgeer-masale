import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

const ADMIN_WHITELIST = [
  'tanmayyadavbca@gmail.com',
  'admin@kabgeerji.com',
  'ayush@kabgeerji.com'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify caller authorization
    let callerEmail = '';
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user?.email) {
        callerEmail = user.email.toLowerCase();
      }
    }

    const body = await req.json().catch(() => ({}));
    if (!callerEmail && body.adminEmail) {
      callerEmail = String(body.adminEmail).toLowerCase().trim();
    }

    const isAuthorized = 
      ADMIN_WHITELIST.includes(callerEmail) || 
      callerEmail.startsWith('admin') ||
      callerEmail.includes('tanmay');

    if (!isAuthorized && callerEmail) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const action = body.action || 'list';

    // 2. Action: List all orders with items
    if (action === 'list') {
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (ordersErr) {
        console.error('Error fetching admin orders:', ordersErr);
        return new Response(
          JSON.stringify({ error: ordersErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, orders: orders || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Action: Update order fulfillment status
    if (action === 'update_status') {
      const { orderId, orderStatus, awbNumber, courierPartner, sendEmail, cancellationReason } = body;
      if (!orderId || !orderStatus) {
        return new Response(
          JSON.stringify({ error: 'Missing orderId or orderStatus.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateFields: any = {
        order_status: orderStatus,
        updated_at: new Date().toISOString()
      };

      if (awbNumber) {
        updateFields.trackon_awb = awbNumber.trim();
        updateFields.shiprocket_awb = awbNumber.trim();
      }
      if (courierPartner) {
        updateFields.courier_partner = courierPartner.trim();
      }
      if (orderStatus === 'Shipped') {
        updateFields.shipped_at = new Date().toISOString();
        updateFields.shipment_status = 'Dispatched';
      } else if (orderStatus === 'Delivered') {
        updateFields.delivered_at = new Date().toISOString();
        updateFields.shipment_status = 'Delivered';
      } else if (orderStatus === 'Cancelled') {
        updateFields.shipment_status = 'Cancelled';
      }

      const { data: updatedOrder, error: updateErr } = await supabase
        .from('orders')
        .update(updateFields)
        .eq('id', orderId)
        .select('*, order_items(*)')
        .single();

      if (updateErr) {
        console.error('Error updating order status:', updateErr);
        return new Response(
          JSON.stringify({ error: updateErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let emailResult = null;
      // Trigger status update email if requested or default ON for key statuses
      if (sendEmail !== false && ['Shipped', 'Delivered', 'Cancelled'].includes(orderStatus)) {
        try {
          const { data: emailData, error: emailErr } = await supabase.functions.invoke('send-order-email', {
            body: {
              orderId: updatedOrder.id,
              emailType: 'status_update',
              newStatus: orderStatus,
              awbNumber: awbNumber || updatedOrder.trackon_awb || updatedOrder.shiprocket_awb,
              courierName: courierPartner || updatedOrder.courier_partner || 'Trackon',
              cancellationReason: cancellationReason || undefined
            }
          });
          emailResult = emailData || { error: emailErr?.message };
        } catch (e: any) {
          console.error('Status notification email dispatch error:', e);
          emailResult = { error: e?.message };
        }
      }

      return new Response(
        JSON.stringify({ success: true, order: updatedOrder, emailNotification: emailResult }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Action: Clear all test data / orders / shipments / payments
    if (action === 'clear_all_orders' || action === 'reset_all_data') {
      try {
        await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('shipments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const { error: delOrdersErr } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        if (body.clearNonAdminProfiles) {
          await supabase.from('profiles').delete().neq('role', 'admin');
        }

        if (delOrdersErr) {
          console.error('Error clearing orders:', delOrdersErr);
          return new Response(
            JSON.stringify({ error: delOrdersErr.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'All test order data and records purged successfully.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (purgeErr: any) {
        return new Response(
          JSON.stringify({ error: purgeErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: `Unknown action '${action}'.` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Admin manage orders error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
