import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, getCorsHeaders } from '../_shared/cors.ts';

const ADMIN_WHITELIST = [
  'admin@kabgeermasala.com',
  'tanmayyadavbca@gmail.com',
  'admin@kabgeerji.com',
  'ayush@kabgeerji.com'
];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';

    // Allow setup_admin_user ONLY with pre-shared administrative setup passkey configured in environment
    const setupPasskey = req.headers.get('X-Admin-Setup-Key') || body.setupSecret;
    const requiredSetupKey = Deno.env.get('ADMIN_SETUP_SECRET');

    if (action === 'setup_admin_user') {
      if (!requiredSetupKey || !setupPasskey || setupPasskey !== requiredSetupKey) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Administrative setup key is unconfigured or invalid.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const email = (body.email || 'admin@kabgeermasala.com').trim().toLowerCase();
      const password = body.password;
      if (!password || typeof password !== 'string' || password.length < 8) {
        return new Response(
          JSON.stringify({ error: 'Bad Request: A password of at least 8 characters is required.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Check if user already exists in auth
      const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
      const existingUser = usersData?.users?.find((u: any) => u.email?.toLowerCase() === email);

      let userId = existingUser?.id;

      if (existingUser) {
        const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
          password: password,
          email_confirm: true,
          user_metadata: { full_name: 'Kabgeer Admin', role: 'admin' }
        });
        if (updateErr) {
          console.error('Error updating user password:', updateErr);
          return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } else {
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: { full_name: 'Kabgeer Admin', role: 'admin' }
        });
        if (createErr) {
          console.error('Error creating user:', createErr);
          return new Response(JSON.stringify({ error: createErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        userId = created.user?.id;
      }

      // 2. Update and Upsert profile with role = 'admin'
      await supabase.from('profiles').update({ role: 'admin' }).eq('email', email);
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: userId,
        email: email,
        full_name: 'Kabgeer Admin',
        role: 'admin',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      if (profErr) {
        console.error('Error upserting profile:', profErr);
        await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Admin user '${email}' configured with role 'admin' and active access.`,
          userId: userId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For all other administrative operations, enforce strict JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired session token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerEmail = (user.email || '').toLowerCase().trim();

    // Verify admin role in database profiles or authorized administrator list
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAuthorized =
      profile?.role === 'admin' ||
      ADMIN_WHITELIST.includes(callerEmail);

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Administrator privileges required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // 4. Action: Delete single order by ID
    if (action === 'delete_order') {
      const { orderId } = body;
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Missing required orderId.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      let query = supabase.from('orders').select('id, display_order_id');
      const { data: targetOrder, error: findErr } = isUuid 
        ? await query.eq('id', orderId).maybeSingle()
        : await query.eq('display_order_id', orderId).maybeSingle();

      if (findErr || !targetOrder) {
        return new Response(
          JSON.stringify({ error: 'Order not found for deletion.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete child rows first (order_items, payments, shipments) to satisfy constraints
      await supabase.from('order_items').delete().eq('order_id', targetOrder.id);
      await supabase.from('payments').delete().eq('order_id', targetOrder.id);
      await supabase.from('shipments').delete().eq('order_id', targetOrder.id);

      const { error: deleteErr } = await supabase.from('orders').delete().eq('id', targetOrder.id);
      if (deleteErr) {
        console.error('Error deleting order:', deleteErr);
        return new Response(
          JSON.stringify({ error: deleteErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Order #${targetOrder.display_order_id} deleted successfully.`,
          deletedId: targetOrder.id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Action: Guard against legacy destructive purge requests
    if (action === 'clear_all_orders' || action === 'reset_all_data') {
      return new Response(
        JSON.stringify({
          error: 'Destructive data purge operations have been permanently disabled and removed from production.',
          code: 'OPERATION_PERMANENTLY_DISABLED'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
