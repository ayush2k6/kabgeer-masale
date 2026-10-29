import { SUPABASE_URL, getHeaders, logHeader, logPass, logFail, logInfo } from './config.mjs';

/**
 * CONCURRENCY & LOAD STRESS TEST SUITE
 * Simulates concurrent traffic bursts against Supabase PostgREST & Edge Functions.
 * Measures latency distribution (p50, p95), connection pooling stability, and error rates.
 */
export async function runLoadAndConcurrencyTests() {
  logHeader('CONCURRENCY & LOAD RESILIENCE TEST SUITE');

  // Test 1: 50 Concurrent Product Catalog Queries
  logInfo('Test 1: Firing 50 concurrent requests to Product Catalog API...');
  const startCatalog = performance.now();
  const CONCURRENT_USERS = 50;

  const catalogPromises = Array.from({ length: CONCURRENT_USERS }, async (_, i) => {
    const t0 = performance.now();
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,price,is_active&is_active=eq.true&limit=10`, {
        headers: getHeaders()
      });
      const t1 = performance.now();
      return {
        id: i,
        status: res.status,
        duration: t1 - t0,
        ok: res.ok
      };
    } catch (err) {
      return {
        id: i,
        status: 0,
        duration: performance.now() - t0,
        ok: false,
        error: err.message
      };
    }
  });

  const catalogResults = await Promise.all(catalogPromises);
  const totalCatalogDuration = performance.now() - startCatalog;

  const successfulCatalog = catalogResults.filter(r => r.ok);
  const failedCatalog = catalogResults.filter(r => !r.ok);
  const catalogLatencies = catalogResults.map(r => r.duration).sort((a, b) => a - b);
  const p50 = catalogLatencies[Math.floor(catalogLatencies.length * 0.5)] || 0;
  const p95 = catalogLatencies[Math.floor(catalogLatencies.length * 0.95)] || 0;
  const max = catalogLatencies[catalogLatencies.length - 1] || 0;

  logInfo(`Catalog Concurrency: ${successfulCatalog.length}/${CONCURRENT_USERS} succeeded in ${totalCatalogDuration.toFixed(0)}ms (p50: ${p50.toFixed(0)}ms, p95: ${p95.toFixed(0)}ms, max: ${max.toFixed(0)}ms)`);

  if (successfulCatalog.length === CONCURRENT_USERS && p95 < 2000) {
    logPass(`Catalog Concurrency: 100% success rate across ${CONCURRENT_USERS} concurrent requests (p95: ${p95.toFixed(0)}ms)`);
  } else {
    logFail(`Catalog Concurrency: ${failedCatalog.length} requests failed or latency exceeded threshold`);
  }

  // Test 2: 25 Concurrent Inventory Queries
  logInfo('Test 2: Firing 25 concurrent requests to Inventory API...');
  const startInventory = performance.now();
  const INVENTORY_USERS = 25;

  const inventoryPromises = Array.from({ length: INVENTORY_USERS }, async (_, i) => {
    const t0 = performance.now();
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/inventory?select=product_id,stock_quantity&limit=10`, {
        headers: getHeaders()
      });
      const t1 = performance.now();
      return { status: res.status, duration: t1 - t0, ok: res.ok };
    } catch (err) {
      return { status: 0, duration: performance.now() - t0, ok: false, error: err.message };
    }
  });

  const inventoryResults = await Promise.all(inventoryPromises);
  const totalInventoryDuration = performance.now() - startInventory;
  const successfulInventory = inventoryResults.filter(r => r.ok);
  const invLatencies = inventoryResults.map(r => r.duration).sort((a, b) => a - b);
  const invP95 = invLatencies[Math.floor(invLatencies.length * 0.95)] || 0;

  logInfo(`Inventory Concurrency: ${successfulInventory.length}/${INVENTORY_USERS} succeeded in ${totalInventoryDuration.toFixed(0)}ms (p95: ${invP95.toFixed(0)}ms)`);

  if (successfulInventory.length === INVENTORY_USERS) {
    logPass(`Inventory Concurrency: Connection pool sustained ${INVENTORY_USERS} parallel queries with 0 connection drops`);
  } else {
    logFail(`Inventory Concurrency: ${INVENTORY_USERS - successfulInventory.length} requests dropped`);
  }

  // Test 3: Burst Error Handling Resilience on Edge Functions
  logInfo('Test 3: Firing 10 burst malformed requests to create-razorpay-order...');
  const edgePromises = Array.from({ length: 10 }, async (_, i) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ burst_probe: true, index: i })
      });
      return { status: res.status, ok: res.status === 400 };
    } catch (err) {
      return { status: 0, ok: false, error: err.message };
    }
  });

  const edgeResults = await Promise.all(edgePromises);
  const edgeCleanResponses = edgeResults.filter(r => r.status === 400);

  if (edgeCleanResponses.length === 10) {
    logPass('Edge Function Burst: 10/10 malformed burst requests cleanly rejected with HTTP 400 (0 unhandled 5xx crashes)');
  } else {
    logFail(`Edge Function Burst: Encountered unexpected status codes: ${edgeResults.map(r => r.status).join(', ')}`);
  }

  logInfo('Concurrency & Load Resilience Suite complete.\n');
  return {
    catalogSuccess: successfulCatalog.length,
    inventorySuccess: successfulInventory.length,
    edgeClean: edgeCleanResponses.length
  };
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('test-load-and-concurrency.mjs')) {
  runLoadAndConcurrencyTests()
    .then(summary => {
      console.log('Load & Concurrency Summary:', JSON.stringify(summary, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal load test error:', err);
      process.exit(1);
    });
}
