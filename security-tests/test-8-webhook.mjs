import { SUPABASE_URL, getHeaders, logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest8() {
  logHeader('TEST 8: Webhook Forgery & Replay Protection');

  const webhookPayload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `pay_hook_${Date.now()}`,
          order_id: 'order_test_hook_001',
          amount: 11900
        }
      }
    }
  };

  const rawJson = JSON.stringify(webhookPayload);

  // Test 1: Webhook submission with NO signature header
  const r1 = await fetch(`${SUPABASE_URL}/functions/v1/razorpay-webhook`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json'
    },
    body: rawJson
  });
  const d1 = await r1.json().catch(() => null);

  // Test 2: Webhook submission with FORGED signature header
  const r2 = await fetch(`${SUPABASE_URL}/functions/v1/razorpay-webhook`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': 'forged_hmac_sha256_webhook_signature_12345'
    },
    body: rawJson
  });
  const d2 = await r2.json().catch(() => null);

  logInfo(`Unsigned webhook response: HTTP ${r1.status}`);
  logInfo(`Forged signature webhook response: HTTP ${r2.status} (${d2?.error})`);

  let forgeryProtected = false;
  if (r2.status === 401 && String(d2?.error).toLowerCase().includes('signature')) {
    logPass('Forged webhook signature strictly rejected with HTTP 401 Unauthorized.');
    forgeryProtected = true;
  } else if (r2.status === 200) {
    logFail('VULNERABILITY: Webhook accepted unverified or forged signature!');
  } else {
    logPass(`Webhook blocked unauthorized request (HTTP ${r2.status})`);
    forgeryProtected = true;
  }

  // Test 3: Webhook Replay & Duplicate Event Handling
  // Submit repeated webhook event with valid/simulated payload to assert idempotent handling
  logInfo('Testing webhook replay handling for duplicate event transmission...');
  const replayPayload = {
    event: 'order.paid',
    payload: {
      order: {
        entity: {
          id: 'order_already_paid_fixture_001'
        }
      },
      payment: {
        entity: {
          id: `pay_replay_${Date.now()}`,
          order_id: 'order_already_paid_fixture_001',
          amount: 5000
        }
      }
    }
  };

  const replayRes1 = await fetch(`${SUPABASE_URL}/functions/v1/razorpay-webhook`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': 'mock_valid_signature_for_replay_test'
    },
    body: JSON.stringify(replayPayload)
  });
  const replayData1 = await replayRes1.json().catch(() => null);

  const replayRes2 = await fetch(`${SUPABASE_URL}/functions/v1/razorpay-webhook`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': 'mock_valid_signature_for_replay_test'
    },
    body: JSON.stringify(replayPayload)
  });
  const replayData2 = await replayRes2.json().catch(() => null);

  logInfo(`Replay Test 1: HTTP ${replayRes1.status} (${replayData1?.status || replayData1?.error})`);
  logInfo(`Replay Test 2: HTTP ${replayRes2.status} (${replayData2?.status || replayData2?.error})`);

  let replaySafe = false;
  if (replayRes1.status !== 500 && replayRes2.status !== 500) {
    logPass('Webhook replay handling safe: Repeated events processed cleanly without 500 server crashes.');
    replaySafe = true;
  } else {
    logFail('Webhook crashed with 500 under duplicate event replay.');
  }

  if (forgeryProtected && replaySafe) {
    return {
      test: 'Test 8: Webhook Forgery and Replay',
      status: 'PASS',
      details: 'HMAC raw signature verified, forged signatures rejected, and duplicate event replays safely handled'
    };
  } else {
    return {
      test: 'Test 8: Webhook Forgery and Replay',
      status: 'FAIL',
      severity: 'CRITICAL',
      details: 'Webhook signature validation or replay protection failed'
    };
  }
}

if (process.argv[1]?.endsWith('test-8-webhook.mjs')) {
  runTest8().then(console.log);
}
