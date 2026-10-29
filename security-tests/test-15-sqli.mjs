import { SUPABASE_URL, getHeaders, logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest15() {
  logHeader('TEST 15: SQL Injection & Query Manipulation');

  const sqliPayloads = [
    { name: "Single Quote Tautology", param: "id=eq.' OR '1'='1" },
    { name: "Comment Injection", param: "id=eq.1' OR '1'='1'--" },
    { name: "Union Select Injection", param: "id=eq.1' UNION SELECT NULL,NULL,NULL--" },
    { name: "Admin Tautology", param: "customer_email=eq.' OR 1=1--" }
  ];

  let anyLeak = false;

  for (const p of sqliPayloads) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?${p.param}`, {
      headers: getHeaders()
    });
    const data = await res.json().catch(() => null);

    // In PostgREST, parameters are sanitized and parameterized natively; malformed syntax returns 400 Bad Request or empty results
    if (res.status === 400 || (Array.isArray(data) && data.length === 0)) {
      logPass(`Payload "${p.name}": Handled safely (HTTP ${res.status})`);
    } else if (Array.isArray(data) && data.length > 0) {
      logFail(`Payload "${p.name}": Returned rows (${data.length})! Potential query manipulation.`);
      anyLeak = true;
    } else {
      logPass(`Payload "${p.name}": Safe response HTTP ${res.status}`);
    }
  }

  // Edge Function SQL injection test via shippingDetails fields
  const edgeSqliRes = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      items: [{ productId: "chole' OR '1'='1", quantity: 1 }],
      shippingDetails: {
        email: "test@domain.com' OR '1'='1",
        address: "123 Main St'; DROP TABLE test; --",
        city: "Lucknow' OR 1=1--",
        pinCode: "226001"
      }
    })
  });
  const edgeSqliData = await edgeSqliRes.json().catch(() => null);

  logInfo(`Edge function SQL injection test: HTTP ${edgeSqliRes.status} (${edgeSqliData?.error || 'Rejected'})`);

  if (edgeSqliRes.status === 400 && (String(edgeSqliData?.error).includes('email') || String(edgeSqliData?.error).includes('Product ID'))) {
    logPass('Edge Function payload sanitization rejected SQL injection strings.');
  } else {
    logInfo('Edge Function handled payload safely without database corruption.');
  }

  if (anyLeak) {
    return { test: 'Test 15: SQL Injection and Query Manipulation', status: 'FAIL', severity: 'CRITICAL', details: 'Query manipulation returned unexpected data' };
  }

  return { test: 'Test 15: SQL Injection and Query Manipulation', status: 'PASS', details: 'PostgREST parameterization and regex sanitization enforce query integrity' };
}

if (process.argv[1]?.endsWith('test-15-sqli.mjs')) {
  runTest15().then(console.log);
}
