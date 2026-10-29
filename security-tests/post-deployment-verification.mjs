// security-tests/post-deployment-verification.mjs
// Non-destructive live verification of deployed Supabase Edge Functions & RPC
import https from 'https';
import fs from 'fs';

const PROJECT_URL = 'https://cfvopnzcqbtqcupdomto.supabase.co';

function makeRequest(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          json: json
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('====================================================');
  console.log('   POST-DEPLOYMENT LIVE PRODUCTION VERIFICATION     ');
  console.log('   Target: cfvopnzcqbtqcupdomto                     ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. CORS Allowlist & Wildcard Prevention
  console.log('--- CHECK 1: CORS Allowlist & Zero-Wildcard Verification ---');
  {
    const resLegit = await makeRequest(`${PROJECT_URL}/functions/v1/create-razorpay-order`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://kabgeermasala.com',
        'Access-Control-Request-Method': 'POST'
      }
    });
    assert(
      resLegit.headers['access-control-allow-origin'] === 'https://kabgeermasala.com',
      `Legitimate origin echoed: ${resLegit.headers['access-control-allow-origin']}`
    );
    assert(
      resLegit.headers['access-control-allow-origin'] !== '*',
      'Origin header is not wildcard (*)'
    );

    const resUntrusted = await makeRequest(`${PROJECT_URL}/functions/v1/create-razorpay-order`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://evil-attacker.example.com',
        'Access-Control-Request-Method': 'POST'
      }
    });
    assert(
      resUntrusted.headers['access-control-allow-origin'] === 'https://kabgeermasala.com',
      `Untrusted origin not reflected; fallback default applied: ${resUntrusted.headers['access-control-allow-origin']}`
    );
    assert(
      resUntrusted.headers['access-control-allow-origin'] !== 'https://evil-attacker.example.com',
      'Untrusted origin is strictly NOT reflected'
    );
  }

  // 2. Admin Authentication & Setup Secret Protection
  console.log('\n--- CHECK 2: Admin Auth & Fail-Closed Setup Protection ---');
  {
    const resUnauth = await makeRequest(`${PROJECT_URL}/functions/v1/admin-manage-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ action: 'list' }));
    assert(
      resUnauth.status === 401,
      `Unauthenticated admin access rejected with HTTP 401 (got ${resUnauth.status})`
    );

    // Test removed hardcoded credential
    const resOldHardcoded = await makeRequest(`${PROJECT_URL}/functions/v1/admin-manage-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Setup-Key': 'kabgeer-secret-setup-2026'
      }
    }, JSON.stringify({
      action: 'setup_admin_user',
      setupSecret: 'kabgeer-secret-setup-2026',
      email: 'admin@kabgeermasala.com',
      password: 'testPassword123!'
    }));
    assert(
      resOldHardcoded.status === 403,
      `Removed hardcoded setup passkey fails closed with HTTP 403 (got ${resOldHardcoded.status})`
    );
    assert(
      resOldHardcoded.json?.error?.includes('Forbidden'),
      `Fails closed with message: ${resOldHardcoded.json?.error}`
    );
  }

  // 3. Payment Verification Endpoint Protection
  console.log('\n--- CHECK 3: Payment Verification Endpoint Protection ---');
  {
    // Test missing required fields
    const resMissing = await makeRequest(`${PROJECT_URL}/functions/v1/verify-razorpay-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      orderId: ''
    }));
    assert(
      resMissing.status === 400,
      `Missing parameter rejected with HTTP 400 (got ${resMissing.status})`
    );
    assert(
      resMissing.json?.error === 'Missing required payment verification parameters.',
      `Correct validation error: ${resMissing.json?.error}`
    );

    // Test non-existent order verification
    const resNonExistent = await makeRequest(`${PROJECT_URL}/functions/v1/verify-razorpay-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      orderId: '00000000-0000-0000-0000-000000000000',
      razorpay_order_id: 'order_dummy_nonexistent',
      razorpay_payment_id: 'pay_dummy_nonexistent',
      razorpay_signature: 'fake_sig'
    }));
    assert(
      resNonExistent.status === 404,
      `Non-existent order query safely rejected with HTTP 404 (got ${resNonExistent.status})`
    );
    assert(
      resNonExistent.json?.error === 'Order not found in database.',
      `Correct order lookup failure message: ${resNonExistent.json?.error}`
    );
  }

  // 4. Razorpay Webhook Signature Validation
  console.log('\n--- CHECK 4: Razorpay Webhook Signature Verification ---');
  {
    const webhookPayload = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_fake_wh', order_id: 'order_fake_wh', amount: 50000 } } }
    });
    const resInvalidWh = await makeRequest(`${PROJECT_URL}/functions/v1/razorpay-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': '0000000000000000000000000000000000000000000000000000000000000000'
      }
    }, webhookPayload);
    assert(
      resInvalidWh.status === 401,
      `Invalid webhook signature rejected with HTTP 401 (got ${resInvalidWh.status})`
    );
    assert(
      resInvalidWh.json?.error === 'Invalid webhook signature',
      `Webhook error message correctly identifies signature failure: ${resInvalidWh.json?.error}`
    );
  }

  // 5. Database RPC Reachability & Function Security
  console.log('\n--- CHECK 5: Database RPC Reachability & Function Security ---');
  {
    let envContent = '';
    try { envContent = fs.readFileSync('.env.local', 'utf8'); } catch (_) {}
    const anonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=([^\s]+)/)?.[1]?.trim();

    if (anonKey) {
      const resRpcDirect = await makeRequest(`${PROJECT_URL}/rest/v1/rpc/claim_and_process_order_payment`, {
        method: 'POST',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        }
      }, JSON.stringify({
        p_order_id: '00000000-0000-0000-0000-000000000000',
        p_razorpay_payment_id: 'pay_test',
        p_razorpay_order_id: 'order_test',
        p_amount: 100,
        p_source: 'test'
      }));

      assert(
        resRpcDirect.status === 401 && resRpcDirect.json?.code === '42501',
        `RPC claim_and_process_order_payment is strictly protected (Postgres 42501 permission denied for anon)`
      );
    }
  }

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
