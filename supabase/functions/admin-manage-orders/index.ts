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
      const { orderId, orderStatus } = body;
      if (!orderId || !orderStatus) {
        return new Response(
          JSON.stringify({ error: 'Missing orderId or orderStatus.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: updatedOrder, error: updateErr } = await supabase
        .from('orders')
        .update({
          order_status: orderStatus,
          updated_at: new Date().toISOString()
        })
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

      return new Response(
        JSON.stringify({ success: true, order: updatedOrder }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
