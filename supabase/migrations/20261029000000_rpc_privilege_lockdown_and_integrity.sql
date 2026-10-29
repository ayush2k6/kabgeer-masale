-- Migration: 20261029000000_rpc_privilege_lockdown_and_integrity.sql
-- Description: Revoke sensitive RPC execution from public/anon/authenticated roles; enforce service_role exclusivity; harden profile role defense; safe shipment deduplication

-- 1. Revoke public, anonymous, and authenticated execution on atomic payment claim RPC
REVOKE ALL ON FUNCTION public.claim_and_process_order_payment(UUID, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_and_process_order_payment(UUID, TEXT, TEXT, NUMERIC, TEXT) TO service_role;

-- 2. Revoke public, anonymous, and authenticated execution on inventory RPCs
REVOKE ALL ON FUNCTION public.reserve_stock(TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_stock(TEXT, INT) TO service_role;

REVOKE ALL ON FUNCTION public.release_stock(TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_stock(TEXT, INT) TO service_role;

-- 3. Upgrade profile role trigger with search_path protection, session_user verification, and INSERT defense
-- Note: Does NOT use current_user, preventing SECURITY DEFINER owner authorization bypass
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- 1. Direct superuser session (migrations / psql CLI where session_user is postgres)
    IF session_user = 'postgres' THEN
        v_is_authorized := TRUE;
    -- 2. Verified Supabase service-role execution (gateway-verified service role JWT)
    ELSIF auth.role() = 'service_role' THEN
        v_is_authorized := TRUE;
    -- 3. Verified administrator account
    ELSIF public.is_admin() THEN
        v_is_authorized := TRUE;
    END IF;

    -- If caller has verified authority, allow role assignment/modification
    IF v_is_authorized THEN
        RETURN NEW;
    END IF;

    -- For all unprivileged callers (anonymous, standard customer, untrusted user):
    -- Reject privilege escalation on account creation
    IF TG_OP = 'INSERT' THEN
        IF NEW.role IS NULL THEN
            NEW.role := 'customer';
        ELSIF NEW.role != 'customer' THEN
            RAISE EXCEPTION 'Access Denied: Self-registered accounts must have customer role.';
        END IF;
    -- Reject privilege escalation / role modification on existing accounts
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            RAISE EXCEPTION 'Access Denied: Modifying account role requires administrative authority.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_role();

-- 4. Safe shipment deduplication constraint with non-destructive preflight check
DO $$
DECLARE
    v_dup_count INT;
BEGIN
    -- Preflight verification: count orders with multiple shipment records
    SELECT COUNT(*) INTO v_dup_count
    FROM (
        SELECT order_id FROM public.shipments GROUP BY order_id HAVING COUNT(*) > 1
    ) sub;

    IF v_dup_count > 0 THEN
        RAISE WARNING 'Preflight check: % duplicate order_ids detected in public.shipments. Unique constraint was deferred to avoid data deletion. Run administrative resolution.', v_dup_count;
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'public.shipments'::regclass 
              AND conname = 'uq_shipments_order_id'
        ) THEN
            ALTER TABLE public.shipments ADD CONSTRAINT uq_shipments_order_id UNIQUE (order_id);
        END IF;
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        NULL;
END $$;
