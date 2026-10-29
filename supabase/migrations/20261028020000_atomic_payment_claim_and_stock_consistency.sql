-- Migration: 20261028020000_atomic_payment_claim_and_stock_consistency.sql
-- Description: Transaction-safe atomic payment transition, inventory locking, and idempotency RPC

-- 1. Atomic Order Payment Processing Function
-- Enforces single-claim transition between browser verification callback and Razorpay webhook.
-- Performs row-level locking (SELECT FOR UPDATE) on the target order and inventory items.
CREATE OR REPLACE FUNCTION public.claim_and_process_order_payment(
    p_order_id UUID,
    p_razorpay_payment_id TEXT,
    p_razorpay_order_id TEXT,
    p_amount NUMERIC,
    p_source TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_stock_ok BOOLEAN := TRUE;
    v_insufficient_items TEXT[] := ARRAY[]::TEXT[];
    v_current_stock INT;
    v_payment_exists BOOLEAN := FALSE;
BEGIN
    -- 1. Atomically lock the order record FOR UPDATE
    SELECT id, display_order_id, payment_status, order_status, total_amount, razorpay_order_id
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Order not found',
            'code', 'ORDER_NOT_FOUND'
        );
    END IF;

    -- 2. Verify Razorpay Order ID alignment
    IF v_order.razorpay_order_id IS NOT NULL AND v_order.razorpay_order_id != p_razorpay_order_id THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Razorpay order ID mismatch',
            'code', 'ORDER_ID_MISMATCH'
        );
    END IF;

    -- 3. Idempotency Check: If order is already Paid, another process already claimed the transition
    IF v_order.payment_status = 'Paid' THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'already_processed', TRUE,
            'claimed', FALSE,
            'order_id', v_order.id,
            'display_order_id', v_order.display_order_id,
            'message', 'Payment already processed and recorded'
        );
    END IF;

    -- Only orders in 'Pending' or 'Unpaid' can be transitioned to Paid
    IF v_order.payment_status NOT IN ('Pending', 'Unpaid') THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Order is in an invalid payment status for capture: ' || v_order.payment_status,
            'code', 'INVALID_STATUS'
        );
    END IF;

    -- 4. Duplicate Payment Processing Check:
    -- Verify this payment ID is not credited to a different order in public.payments
    SELECT EXISTS(
        SELECT 1 FROM public.payments 
        WHERE razorpay_payment_id = p_razorpay_payment_id AND order_id != p_order_id
    ) INTO v_payment_exists;

    IF v_payment_exists THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Duplicate payment ID: already assigned to another order',
            'code', 'DUPLICATE_PAYMENT_ID'
        );
    END IF;

    -- 5. Atomic Stock Verification for all items in order
    -- Lock all relevant inventory rows in product_id order to prevent concurrency deadlocks
    FOR v_item IN 
        SELECT oi.product_id, oi.quantity
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id
        ORDER BY oi.product_id
    LOOP
        SELECT stock_quantity INTO v_current_stock
        FROM public.inventory
        WHERE product_id = v_item.product_id
        FOR UPDATE;

        IF v_current_stock IS NULL OR v_current_stock < v_item.quantity THEN
            v_stock_ok := FALSE;
            v_insufficient_items := array_append(v_insufficient_items, v_item.product_id);
        END IF;
    END LOOP;

    -- If all items have sufficient inventory, deduct stock atomically
    IF v_stock_ok THEN
        FOR v_item IN 
            SELECT product_id, quantity
            FROM public.order_items
            WHERE order_id = p_order_id
        LOOP
            UPDATE public.inventory
            SET stock_quantity = stock_quantity - v_item.quantity,
                updated_at = NOW()
            WHERE product_id = v_item.product_id;
        END LOOP;
    END IF;

    -- 6. Insert payment audit record into public.payments (if not already recorded)
    INSERT INTO public.payments (
        order_id,
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        amount,
        currency,
        status,
        raw_payload
    ) VALUES (
        p_order_id,
        p_razorpay_payment_id,
        p_razorpay_order_id,
        p_source,
        p_amount,
        'INR',
        'captured',
        jsonb_build_object(
            'source', p_source,
            'stock_allocated', v_stock_ok,
            'claimed_at', NOW()
        )
    )
    ON CONFLICT (razorpay_payment_id) DO NOTHING;

    -- 7. Update public.orders state machine atomically
    -- Captured payment is authoritatively recorded as Paid regardless of stock status
    -- But shipment_status and fulfillment notes record the exact recovery state
    IF v_stock_ok THEN
        UPDATE public.orders
        SET payment_status = 'Paid',
            order_status = 'Confirmed',
            shipment_status = 'Pending',
            updated_at = NOW()
        WHERE id = p_order_id;
    ELSE
        UPDATE public.orders
        SET payment_status = 'Paid',
            order_status = 'Confirmed',
            shipment_status = 'Failed',
            updated_at = NOW()
        WHERE id = p_order_id;
    END IF;

    -- 8. Return structured transition result
    RETURN jsonb_build_object(
        'success', TRUE,
        'claimed', TRUE,
        'already_processed', FALSE,
        'stock_allocated', v_stock_ok,
        'failed_items', to_jsonb(v_insufficient_items),
        'order_id', v_order.id,
        'display_order_id', v_order.display_order_id,
        'message', CASE 
            WHEN v_stock_ok THEN 'Payment claimed and stock reserved successfully'
            ELSE 'Payment claimed but inventory exhausted. Flagged for administrator recovery.'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Secure Permissions
REVOKE ALL ON FUNCTION public.claim_and_process_order_payment(UUID, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_and_process_order_payment(UUID, TEXT, TEXT, NUMERIC, TEXT) TO service_role, authenticated;

COMMENT ON FUNCTION public.claim_and_process_order_payment IS 'Atomic payment claim, inventory reservation, and idempotent state transition handler.';
