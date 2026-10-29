import { runTest1 } from './test-1-idempotency.mjs';
import { runTest2 } from './test-2-inventory.mjs';
import { runTest3 } from './test-3-coupons.mjs';
import { runTest4 } from './test-4-payments.mjs';
import { runTest5 } from './test-5-price-tamper.mjs';
import { runTest6 } from './test-6-rls-access.mjs';
import { runTest7 } from './test-7-signature.mjs';
import { runTest8 } from './test-8-webhook.mjs';
import { runTest9 } from './test-9-admin-auth.mjs';
import { runTest10 } from './test-10-type-confuse.mjs';
import { runTest11 } from './test-11-resource-limits.mjs';
import { runTest12 } from './test-12-service-fail.mjs';
import { runTest13 } from './test-13-idor.mjs';
import { runTest14 } from './test-14-session-auth.mjs';
import { runTest15 } from './test-15-sqli.mjs';
import { runTest16 } from './test-16-xss.mjs';
import { runTest17 } from './test-17-csrf-cors.mjs';
import { runTest18 } from './test-18-rate-limit.mjs';
import { runTest19 } from './test-19-db-integrity.mjs';
import { runTest20 } from './test-20-secrets-audit.mjs';
import { Colors } from './config.mjs';
import fs from 'fs';
import path from 'path';

const allTestRunners = [
  { id: 1, name: 'Duplicate Order Creation & Idempotency', category: 'A: Concurrency & Race Conditions', fn: runTest1 },
  { id: 2, name: 'Concurrent Inventory Checkout', category: 'A: Concurrency & Race Conditions', fn: runTest2 },
  { id: 3, name: 'Coupon Exhaustion Race', category: 'A: Concurrency & Race Conditions', fn: runTest3 },
  { id: 4, name: 'Duplicate Payment Processing', category: 'A: Concurrency & Race Conditions', fn: runTest4 },
  { id: 5, name: 'Client-Side Price Tampering', category: 'B: Authentication & Security', fn: runTest5 },
  { id: 6, name: 'Database Access Control & RLS', category: 'B: Authentication & Security', fn: runTest6 },
  { id: 7, name: 'Payment Signature Forgery', category: 'B: Authentication & Security', fn: runTest7 },
  { id: 8, name: 'Webhook Forgery & Replay', category: 'B: Authentication & Security', fn: runTest8 },
  { id: 9, name: 'Unauthorized Admin Operations', category: 'B: Authentication & Security', fn: runTest9 },
  { id: 10, name: 'Type Confusion & Numeric Edge Cases', category: 'C: Input Validation & Resilience', fn: runTest10 },
  { id: 11, name: 'Oversized Request & Resource Limits', category: 'C: Input Validation & Resilience', fn: runTest11 },
  { id: 12, name: 'External Service Failure Isolation', category: 'C: Input Validation & Resilience', fn: runTest12 },
  { id: 13, name: 'Broken Object-Level Authorization (IDOR)', category: 'D: Adversarial Tests', fn: runTest13 },
  { id: 14, name: 'Authentication & Session Security', category: 'D: Adversarial Tests', fn: runTest14 },
  { id: 15, name: 'SQL Injection & Query Manipulation', category: 'D: Adversarial Tests', fn: runTest15 },
  { id: 16, name: 'Cross-Site Scripting (XSS)', category: 'D: Adversarial Tests', fn: runTest16 },
  { id: 17, name: 'CSRF & Cross-Origin Protection', category: 'D: Adversarial Tests', fn: runTest17 },
  { id: 18, name: 'Rate Limiting & Abuse Resistance', category: 'D: Adversarial Tests', fn: runTest18 },
  { id: 19, name: 'Database Transaction Integrity & State Transitions', category: 'D: Adversarial Tests', fn: runTest19 },
  { id: 20, name: 'Secrets, Configuration, Dependencies & Production Safety', category: 'D: Adversarial Tests', fn: runTest20 }
];

export async function runAllSecurityTests() {
  console.log(`\n${Colors.bold}${Colors.cyan}========================================================================${Colors.reset}`);
  console.log(`${Colors.bold}${Colors.cyan}        KABGEER MASALE — 20-PART ADVERSARIAL SECURITY AUDIT SUITE       ${Colors.reset}`);
  console.log(`${Colors.bold}${Colors.cyan}========================================================================${Colors.reset}\n`);

  const results = [];
  const startGlobal = Date.now();

  for (const t of allTestRunners) {
    const tStart = Date.now();
    try {
      const outcome = await t.fn();
      const elapsed = Date.now() - tStart;
      results.push({
        id: t.id,
        name: t.name,
        category: t.category,
        status: outcome.status,
        severity: outcome.severity || (outcome.status === 'PASS' ? 'INFO' : 'MEDIUM'),
        details: outcome.details,
        elapsedMs: elapsed
      });
    } catch (err) {
      const elapsed = Date.now() - tStart;
      results.push({
        id: t.id,
        name: t.name,
        category: t.category,
        status: 'FAIL',
        severity: 'HIGH',
        details: `Execution exception: ${err.message}`,
        elapsedMs: elapsed
      });
    }
  }

  const totalTime = Date.now() - startGlobal;

  console.log(`\n${Colors.bold}=========================================================================================${Colors.reset}`);
  console.log(`${Colors.bold}                              AUDIT RESULTS MATRIX SUMMARY                               ${Colors.reset}`);
  console.log(`${Colors.bold}=========================================================================================${Colors.reset}`);
  console.log(`${'ID'.padEnd(4)} | ${'Test Name'.padEnd(42)} | ${'Status'.padEnd(14)} | ${'Severity'.padEnd(10)} | Details`);
  console.log('-'.repeat(110));

  let passCount = 0;
  let failCount = 0;
  let notApplicableCount = 0;
  let inconclusiveCount = 0;

  for (const r of results) {
    if (r.status === 'PASS') passCount++;
    else if (r.status === 'NOT APPLICABLE') notApplicableCount++;
    else if (r.status === 'INCONCLUSIVE') inconclusiveCount++;
    else failCount++;

    let statusColor = Colors.reset;
    if (r.status === 'PASS') statusColor = Colors.green;
    else if (r.status === 'FAIL') statusColor = Colors.red;
    else if (r.status === 'NOT APPLICABLE') statusColor = Colors.cyan;
    else if (r.status === 'INCONCLUSIVE') statusColor = Colors.yellow;

    const sevColor = r.severity === 'CRITICAL' ? Colors.red : (r.severity === 'HIGH' ? Colors.yellow : Colors.reset);

    console.log(
      `${String(r.id).padEnd(4)} | ` +
      `${r.name.slice(0, 42).padEnd(42)} | ` +
      `${statusColor}${r.status.padEnd(14)}${Colors.reset} | ` +
      `${sevColor}${r.severity.padEnd(10)}${Colors.reset} | ` +
      `${r.details}`
    );
  }

  console.log('-'.repeat(110));
  console.log(`${Colors.bold}TOTAL TESTS: 20  |  PASSED: ${passCount}  |  NOT APPLICABLE: ${notApplicableCount}  |  INCONCLUSIVE: ${inconclusiveCount}  |  FAILED: ${failCount}  |  TIME: ${totalTime}ms${Colors.reset}\n`);

  // Save report artifact
  const outputPath = path.resolve(process.cwd(), 'security-tests/latest-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    passCount,
    failCount,
    notApplicableCount,
    inconclusiveCount,
    totalTime,
    results
  }, null, 2));

  return results;
}

if (process.argv[1]?.endsWith('run-all-tests.mjs')) {
  runAllSecurityTests().then((res) => {
    const hasFailures = res.some(r => r.status === 'FAIL');
    process.exit(hasFailures ? 1 : 0);
  });
}
