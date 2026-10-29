import { SUPABASE_URL, getHeaders, logHeader, logPass, logFail, logInfo } from './config.mjs';
import { execSync } from 'child_process';

export async function runCompleteLifecycleTest() {
  logHeader('TEST-MODE END-TO-END CHECKOUT & ATOMIC LIFECYCLE TEST');

  // Step 1: Create a test-mode order
  logInfo('1. Creating test-mode order via create-razorpay-order...');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      items: [{ productId: 'chole', quantity: 1 }],
      shippingDetails: {
        firstName: 'Lifecycle',
        lastName: 'Tester',
        email: 'lifecycle-test@kabgeer.local',
        phone: '9999999999',
        address: '101 Safe Lane',
        city: 'Lucknow',
        pinCode: '226001'
      }
    })
  });

  const orderData = await res.json();
  if (res.status !== 200 || !orderData.orderId) {
    logFail(`Order creation failed: ${JSON.stringify(orderData)}`);
    return { status: 'FAIL', reason: 'Order creation failed' };
  }

  const { orderId, displayOrderId, razorpayOrderId } = orderData;
  logPass(`Order created: ${displayOrderId} (${orderId}), Razorpay Order: ${razorpayOrderId}`);

  // Step 2: Run atomic claim and idempotency replay via SQL query
  logInfo('2. Executing atomic payment claim, stock deduction, and idempotency replay...');

  const sql = `
  DO $$
  DECLARE
    v_stock_before INT;
    v_stock_first INT;
    v_stock_second INT;
    v_res_first JSONB;
    v_res_second JSONB;
    v_pay_status TEXT;
  BEGIN
    SELECT stock_quantity INTO v_stock_before FROM public.inventory WHERE product_id = 'chole';

    -- Call 1: Primary Payment Claim
    v_res_first := public.claim_and_process_order_payment(
      '${orderId}'::uuid,
      'pay_test_lifecycle_001',
      '${razorpayOrderId}',
      119.00,
      'test_lifecycle_primary'
    );

    SELECT stock_quantity INTO v_stock_first FROM public.inventory WHERE product_id = 'chole';
    SELECT payment_status INTO v_pay_status FROM public.orders WHERE id = '${orderId}'::uuid;

    -- Call 2: Webhook Replay / Concurrent Callback
    v_res_second := public.claim_and_process_order_payment(
      '${orderId}'::uuid,
      'pay_test_lifecycle_001',
      '${razorpayOrderId}',
      119.00,
      'test_lifecycle_replay'
    );

    SELECT stock_quantity INTO v_stock_second FROM public.inventory WHERE product_id = 'chole';

    -- Assertions
    IF (v_res_first->>'claimed')::boolean != TRUE OR (v_res_first->>'stock_allocated')::boolean != TRUE THEN
      RAISE EXCEPTION 'Primary claim failed: %', v_res_first;
    END IF;

    IF v_stock_before - v_stock_first != 1 THEN
      RAISE EXCEPTION 'Stock was not decremented by 1! Before: %, After: %', v_stock_before, v_stock_first;
    END IF;

    IF v_pay_status != 'Paid' THEN
      RAISE EXCEPTION 'Payment status not updated to Paid! Got: %', v_pay_status;
    END IF;

    IF (v_res_second->>'already_processed')::boolean != TRUE OR (v_res_second->>'claimed')::boolean = TRUE THEN
      RAISE EXCEPTION 'Idempotency replay failed! Got: %', v_res_second;
    END IF;

    IF v_stock_first != v_stock_second THEN
      RAISE EXCEPTION 'Stock was decremented twice! First: %, Second: %', v_stock_first, v_stock_second;
    END IF;

    -- Cleanup
    DELETE FROM public.order_items WHERE order_id = '${orderId}'::uuid;
    DELETE FROM public.payments WHERE order_id = '${orderId}'::uuid;
    DELETE FROM public.orders WHERE id = '${orderId}'::uuid;
    UPDATE public.inventory SET stock_quantity = v_stock_before WHERE product_id = 'chole';
  END $$;
  `;

  try {
    const fs = await import('fs');
    fs.writeFileSync('security-tests/run-lifecycle-exec.sql', sql, 'utf8');

    const out = execSync('npx supabase db query --linked -f security-tests/run-lifecycle-exec.sql', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    logPass('Atomic payment claim succeeded: Order marked Paid, stock decremented by 1.');
    logPass('Idempotency replay succeeded: Second claim returned already_processed=true, stock was NOT decremented again.');
    logPass('Cleanup complete: Test order deleted, inventory restored.');

    fs.unlinkSync('security-tests/run-lifecycle-exec.sql');
    return { status: 'PASS' };
  } catch (err) {
    logFail(`Lifecycle execution error: ${err.message}`);
    return { status: 'FAIL', error: err.message };
  }
}

if (process.argv[1]?.endsWith('test-complete-lifecycle.mjs')) {
  runCompleteLifecycleTest().then(console.log);
}
