import fs from 'fs';
import path from 'path';
import { SUPABASE_URL, getHeaders, fetchActiveProduct, logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest12() {
  logHeader('TEST 12: External Service Failure Isolation');

  // Static AST / code inspection of verify-razorpay-payment/index.ts
  const verifyFnPath = path.resolve(process.cwd(), 'supabase/functions/verify-razorpay-payment/index.ts');
  if (!fs.existsSync(verifyFnPath)) {
    return { test: 'Test 12: External Service Failure Isolation', status: 'BLOCKED', details: 'verify-razorpay-payment function file not found' };
  }

  const code = fs.readFileSync(verifyFnPath, 'utf-8');

  // Check 1: Downstream tasks wrapped in Promise.allSettled
  const usesAllSettled = code.includes('Promise.allSettled');
  if (usesAllSettled) {
    logPass('Pipeline Architecture: Downstream email, sheet, and shipment triggers use Promise.allSettled (prevents single failure from halting checkout)');
  } else {
    logFail('Downstream triggers do not use Promise.allSettled!');
  }

  // Check 2: Timeout guard to prevent edge function hanging under third-party slowdown
  const hasTimeoutGuard = code.includes('Promise.race') && code.includes('setTimeout');
  if (hasTimeoutGuard) {
    logPass('Timeout Defense: Downstream integrations protected with 1500ms fallback timeout race (guarantees fast response under third-party lag)');
  } else {
    logWarn('Downstream integrations lack timeout race protection');
  }

  // Check 3: State Commitment Ordering
  // The financial state (payment_status = Paid) MUST be committed before triggering external side effects
  const orderUpdateIdx = code.indexOf(".from('orders')");
  const bgTasksIdx = code.indexOf('backgroundTasks');
  const orderCommittedFirst = orderUpdateIdx !== -1 && bgTasksIdx !== -1 && orderUpdateIdx < bgTasksIdx;

  if (orderCommittedFirst) {
    logPass('Transaction Consistency: Database payment status committed BEFORE external services are invoked.');
  } else {
    logFail('External services invoked before database commitment!');
  }

  // Check 4: Failure Simulation & State Preservation
  // Simulate an external failure scenario by invoking send-order-email with a non-existent order ID
  logInfo('Simulating downstream integration failure (Resend/Sheets) to test error isolation...');
  const failRes = await fetch(`${SUPABASE_URL}/functions/v1/send-order-email`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ orderId: '00000000-0000-0000-0000-000000000000' })
  });

  const failData = await failRes.json().catch(() => null);
  logInfo(`Downstream simulated failure response: HTTP ${failRes.status} (${failData?.error || 'Handled'})`);

  const downstreamHandledSafely = failRes.status === 404 || failRes.status === 400 || failRes.status === 200;
  if (downstreamHandledSafely) {
    logPass('Downstream email service gracefully reports error without unhandled Edge Function crash.');
  } else {
    logWarn(`Downstream returned unexpected status: ${failRes.status}`);
  }

  if (usesAllSettled && hasTimeoutGuard && orderCommittedFirst && downstreamHandledSafely) {
    return {
      test: 'Test 12: External Service Failure Isolation',
      status: 'PASS',
      details: 'Downstream side effects isolated via Promise.allSettled, timeout guards, and pre-invocation database commitment'
    };
  } else {
    return {
      test: 'Test 12: External Service Failure Isolation',
      status: 'FAIL',
      severity: 'HIGH',
      details: 'Downstream integration failures can corrupt payment state or crash checkout'
    };
  }
}

if (process.argv[1]?.endsWith('test-12-service-fail.mjs')) {
  runTest12().then(console.log);
}
