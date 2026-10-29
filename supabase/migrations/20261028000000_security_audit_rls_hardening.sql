-- Migration: 20261028000000_security_audit_rls_hardening.sql
-- Description: Comprehensive RLS Policy Hardening against Data Leakage and Privilege Escalation

-- 1. Ensure RLS is enabled on all tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- 2. ORDERS POLICIES HARDENING (Block unauthenticated anonymous SELECT on guest orders)
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Public read orders" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
DROP POLICY IF EXISTS "Allow public read" ON public.orders;
DROP POLICY IF EXISTS "Admin can update orders" ON public.orders;

-- Strict SELECT policy: Only authenticated user matching customer_id OR verified admin
CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT 
    USING (
        (auth.uid() IS NOT NULL AND auth.uid() = customer_id) 
        OR public.is_admin()
    );

CREATE POLICY "Admin can update orders" ON public.orders FOR UPDATE 
    USING (public.is_admin());

-- 3. ORDER ITEMS POLICIES HARDENING
DROP POLICY IF EXISTS "Customers can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Public read order items" ON public.order_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.order_items;

CREATE POLICY "Customers can view own order items" ON public.order_items FOR SELECT 
    USING (
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.orders 
            WHERE public.orders.id = public.order_items.order_id 
              AND public.orders.customer_id = auth.uid()
        ))
        OR public.is_admin()
    );

-- 4. INVENTORY POLICIES HARDENING (Public read-only, mutations strictly admin or service role)
DROP POLICY IF EXISTS "Public read inventory" ON public.inventory;
CREATE POLICY "Public read inventory" ON public.inventory FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Admin can update inventory" ON public.inventory;
CREATE POLICY "Admin can update inventory" ON public.inventory FOR UPDATE 
    USING (public.is_admin());

-- 5. PRODUCTS POLICIES HARDENING (Public read active products, mutations strictly admin)
DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Public read active products" ON public.products FOR SELECT 
    USING (is_active = true);

DROP POLICY IF EXISTS "Admin can update products" ON public.products;
CREATE POLICY "Admin can update products" ON public.products FOR UPDATE 
    USING (public.is_admin());

-- 6. Execution permissions
REVOKE ALL ON FUNCTION public.get_all_orders_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_orders_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_order_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID, TEXT) TO authenticated;
