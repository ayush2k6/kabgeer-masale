-- Migration: 20260827030000_part_4_security_rls_hardening.sql
-- Description: Comprehensive Row Level Security (RLS) Hardening for Kabgeer Masale

-- Ensure RLS is enabled on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. PRODUCTS POLICIES (Public read-only, no client mutations)
DROP POLICY IF EXISTS "Public product catalog access" ON public.products;
DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (is_active = true);

-- 3. INVENTORY POLICIES (Public read-only for stock visibility, no client mutations)
DROP POLICY IF EXISTS "Public read inventory" ON public.inventory;
CREATE POLICY "Public read inventory" ON public.inventory FOR SELECT USING (true);

-- 4. ORDERS POLICIES (Read own orders, NO direct client mutations)
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id);

-- 5. ORDER ITEMS POLICIES (Read own order items, NO direct client mutations)
DROP POLICY IF EXISTS "Customers can view own order items" ON public.order_items;
CREATE POLICY "Customers can view own order items" ON public.order_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE public.orders.id = public.order_items.order_id 
          AND public.orders.customer_id = auth.uid()
    )
);

-- 6. PAYMENTS POLICIES (Read own payments, NO direct client mutations)
DROP POLICY IF EXISTS "Customers can view own payments" ON public.payments;
CREATE POLICY "Customers can view own payments" ON public.payments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE public.orders.id = public.payments.order_id 
          AND public.orders.customer_id = auth.uid()
    )
);

-- 7. SHIPMENTS POLICIES (Read own shipments, NO direct client mutations)
DROP POLICY IF EXISTS "Customers can view own shipments" ON public.shipments;
CREATE POLICY "Customers can view own shipments" ON public.shipments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE public.orders.id = public.shipments.order_id 
          AND public.orders.customer_id = auth.uid()
    )
);

-- 8. WISHLISTS POLICIES (Full CRUD for owner authenticated user)
DROP POLICY IF EXISTS "Users can view own wishlist" ON public.wishlists;
CREATE POLICY "Users can view own wishlist" ON public.wishlists FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can insert own wishlist" ON public.wishlists;
CREATE POLICY "Users can insert own wishlist" ON public.wishlists FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can delete own wishlist" ON public.wishlists;
CREATE POLICY "Users can delete own wishlist" ON public.wishlists FOR DELETE USING (auth.uid() = customer_id);
