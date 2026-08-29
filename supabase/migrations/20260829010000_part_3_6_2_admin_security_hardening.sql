-- Migration: 20260829010000_part_3_6_2_admin_security_hardening.sql
-- Description: Part 3.6.2 Admin Security Hardening: Database-Backed Authorization & RPC Access Controls

-- 1. Ensure profiles.role column exists with valid check constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. Authoritative is_admin() Helper Function (CREATE OR REPLACE preserves dependent RLS policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Hardened Superuser RPC for Admin Orders Fetch
DROP FUNCTION IF EXISTS public.get_all_orders_admin();
CREATE OR REPLACE FUNCTION public.get_all_orders_admin()
RETURNS SETOF public.orders AS $$
BEGIN
    -- Strict Database Authorization Guard
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Administrator privileges required.';
    END IF;

    RETURN QUERY 
    SELECT * FROM public.orders 
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Hardened Superuser RPC for Admin Order Status Updates
DROP FUNCTION IF EXISTS public.admin_update_order_status(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.admin_update_order_status(target_order_id UUID, new_status TEXT)
RETURNS public.orders AS $$
DECLARE
    updated_record public.orders;
BEGIN
    -- Strict Database Authorization Guard
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Administrator privileges required.';
    END IF;

    -- Strict Fulfillment Status Whitelist Validation
    IF new_status NOT IN ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled') THEN
        RAISE EXCEPTION 'Invalid order fulfillment status: %', new_status;
    END IF;

    -- Update ONLY fulfillment status and timestamp (Payment and Financial values remain untouched)
    UPDATE public.orders 
    SET 
        order_status = new_status, 
        updated_at = NOW() 
    WHERE id = target_order_id
    RETURNING * INTO updated_record;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found: %', target_order_id;
    END IF;

    RETURN updated_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Prevent Non-Admin Role Self-Elevation on Profiles
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        IF NOT public.is_admin() THEN
            RAISE EXCEPTION 'Access Denied: Modifying account role requires administrator privileges.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- 6. Ensure RLS is active on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 7. Explicit RLS Policies for Orders & Order Items
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT 
    USING (
        (auth.uid() = customer_id) 
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Admin can update orders" ON public.orders;
CREATE POLICY "Admin can update orders" ON public.orders FOR UPDATE 
    USING (public.is_admin());

DROP POLICY IF EXISTS "Customers can view own order items" ON public.order_items;
CREATE POLICY "Customers can view own order items" ON public.order_items FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE public.orders.id = public.order_items.order_id 
              AND public.orders.customer_id = auth.uid()
        )
        OR public.is_admin()
    );

-- 8. Execution Security: Revoke anon execution on admin functions
REVOKE EXECUTE ON FUNCTION public.get_all_orders_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_orders_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID, TEXT) TO authenticated;
