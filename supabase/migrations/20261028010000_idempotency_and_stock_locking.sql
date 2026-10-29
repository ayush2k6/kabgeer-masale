-- Migration: 20261028010000_idempotency_and_stock_locking.sql
-- Description: Database-level unique idempotency constraint and atomic inventory row-locking

-- 1. Add unique idempotency_key column to public.orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'orders' 
          AND column_name = 'idempotency_key'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN idempotency_key TEXT UNIQUE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON public.orders(idempotency_key);

-- 2. Atomic Row-Locked Stock Reservation Function (SELECT FOR UPDATE)
CREATE OR REPLACE FUNCTION public.reserve_stock(target_product_id TEXT, qty INT)
RETURNS BOOLEAN AS $$
DECLARE
    current_stock INT;
BEGIN
    -- Atomic row-lock on specific inventory record
    SELECT stock_quantity INTO current_stock
    FROM public.inventory
    WHERE product_id = target_product_id
    FOR UPDATE;

    IF current_stock IS NULL OR current_stock < qty THEN
        RETURN FALSE;
    END IF;

    UPDATE public.inventory
    SET stock_quantity = stock_quantity - qty,
        updated_at = NOW()
    WHERE product_id = target_product_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atomic Stock Release Function (For order cancellations / expiration)
CREATE OR REPLACE FUNCTION public.release_stock(target_product_id TEXT, qty INT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.inventory
    SET stock_quantity = stock_quantity + qty,
        updated_at = NOW()
    WHERE product_id = target_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Secure permissions
REVOKE ALL ON FUNCTION public.reserve_stock(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_stock(TEXT, INT) TO service_role, authenticated;

REVOKE ALL ON FUNCTION public.release_stock(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_stock(TEXT, INT) TO service_role, authenticated;
