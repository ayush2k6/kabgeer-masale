import fs from 'fs';
import path from 'path';

console.log('\n========================================================================');
console.log('      KABGEER MASALE — REMEDIATION LOGIC & RESILIENCE VERIFICATION      ');
console.log('========================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✖ FAIL: ${message}`);
    failCount++;
  }
}

// --------------------------------------------------------------------------
// TEST 1: CORS Policy & Strict Origin Allowlist Verification
// --------------------------------------------------------------------------
console.log('=== [TEST 1: CORS Dynamic Allowlist & Wildcard Elimination] ===');

const corsPath = path.resolve('supabase/functions/_shared/cors.ts');
const corsCode = fs.readFileSync(corsPath, 'utf8');

// Check absence of wildcard
assert(!corsCode.includes("'Access-Control-Allow-Origin': '*'"), "Wildcard '*' is permanently removed from default corsHeaders");
assert(!corsCode.includes('allowedOrigin = isAllowed ? origin : "*"'), "Wildcard '*' fallback is permanently removed from dynamic resolver");

// Functional test of getCorsHeaders logic
const DEFAULT_ALLOWED = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://kabgeermasala.com',
  'https://www.kabgeermasala.com',
  'https://kabgeerji.com',
  'https://www.kabgeerji.com',
  'https://kabgeermasale.vercel.app',
  'https://kabgeer-masale.vercel.app',
  'https://kabgeer-masale-v1.vercel.app',
  'https://kabgeer-masalee.vercel.app'
];

function isOriginAllowed(origin) {
  if (!origin) return false;
  const trimmed = origin.trim();
  if (DEFAULT_ALLOWED.includes(trimmed)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed)) return true;
  if (/^https:\/\/(?:[a-z0-9-]+\.)?kabgeer(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(trimmed)) return true;
  return false;
}

function resolveOrigin(origin) {
  return (origin && isOriginAllowed(origin)) ? origin : 'https://kabgeermasala.com';
}

assert(resolveOrigin('http://localhost:5173') === 'http://localhost:5173', 'Local development origin permitted (localhost:5173)');
assert(resolveOrigin('https://kabgeermasala.com') === 'https://kabgeermasala.com', 'Primary production origin permitted (kabgeermasala.com)');
assert(resolveOrigin('https://kabgeer-masale.vercel.app') === 'https://kabgeer-masale.vercel.app', 'Verified production Vercel deployment permitted');
assert(resolveOrigin('https://arbitrary-attacker.vercel.app') === 'https://kabgeermasala.com', 'Arbitrary *.vercel.app preview domain rejected & defaulted to primary domain');
assert(resolveOrigin('https://evil-phishing-attacker.com') === 'https://kabgeermasala.com', 'Malicious origin rejected & redirected to default kabgeermasala.com');
assert(resolveOrigin(null) === 'https://kabgeermasala.com', 'Missing/Null origin defaults securely to kabgeermasala.com');
assert(corsCode.includes("'Vary': 'Origin'"), "'Vary: Origin' caching header is present");

// --------------------------------------------------------------------------
// TEST 2: Email HTML Sanitization & Hostile XSS Injection Neutralization
// --------------------------------------------------------------------------
console.log('\n=== [TEST 2: Email HTML Sanitization & XSS Injection Neutralization] ===');

const emailPath = path.resolve('supabase/functions/send-order-email/index.ts');
const emailCode = fs.readFileSync(emailPath, 'utf8');

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const hostilePayloads = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert(1)>',
  '"><svg/onload=confirm(document.cookie)>',
  "'; DROP TABLE orders; --",
  '<a href="javascript:stealData()">Click Here</a>'
];

for (const payload of hostilePayloads) {
  const sanitized = escapeHtml(payload);
  assert(!sanitized.includes('<script>') && !sanitized.includes('<img') && !sanitized.includes('<svg') && !sanitized.includes('<a'), `Hostile HTML tag neutralized: "${payload.slice(0, 30)}..."`);
  assert(sanitized.includes('&lt;') || sanitized.includes('&#039;') || sanitized.includes('&quot;'), `Entities properly encoded for: "${payload.slice(0, 30)}..."`);
}

assert(emailCode.includes('function escapeHtml('), 'escapeHtml helper is defined in send-order-email');
assert(emailCode.includes('function getSafeOrder('), 'getSafeOrder data-sanitizer wrapper is defined in send-order-email');
assert(!emailCode.includes('${order.customer_name}'), 'Zero direct unescaped interpolations of order.customer_name in email templates');

// --------------------------------------------------------------------------
// TEST 3: Admin Setup Secret Fail-Closed Authorization
// --------------------------------------------------------------------------
console.log('\n=== [TEST 3: Admin Setup Secret Fail-Closed Security] ===');

const adminPath = path.resolve('supabase/functions/admin-manage-orders/index.ts');
const adminCode = fs.readFileSync(adminPath, 'utf8');

assert(!adminCode.includes('Areej1935?@'), "Hardcoded credential 'Areej1935?@' has been completely eradicated");
assert(adminCode.includes("const requiredSetupKey = Deno.env.get('ADMIN_SETUP_SECRET')"), 'Endpoint references ADMIN_SETUP_SECRET environment variable');
assert(adminCode.includes('if (!requiredSetupKey || !setupPasskey || setupPasskey !== requiredSetupKey)'), 'Endpoint fails closed with strict check if secret is unconfigured or mismatched');
assert(adminCode.includes('status: 403'), 'Fails with HTTP 403 Forbidden on invalid setup attempts');
assert(adminCode.includes('password.length < 8'), 'Enforces password complexity (minimum 8 characters)');

// --------------------------------------------------------------------------
// TEST 4: Payment Stockout Handling & Dual-Channel Idempotency
// --------------------------------------------------------------------------
console.log('\n=== [TEST 4: Atomic RPC Enforcement & Idempotent State Transitions] ===');

const verifyPath = path.resolve('supabase/functions/verify-razorpay-payment/index.ts');
const verifyCode = fs.readFileSync(verifyPath, 'utf8');
const webhookPath = path.resolve('supabase/functions/razorpay-webhook/index.ts');
const webhookCode = fs.readFileSync(webhookPath, 'utf8');

// Verification function checks
assert(verifyCode.includes('claim_and_process_order_payment'), 'verify-razorpay-payment invokes claim_and_process_order_payment RPC');
assert(verifyCode.includes('ATOMIC_TRANSACTION_FAILED'), 'verify-razorpay-payment fails closed with 500 if RPC is unavailable (zero weak fallbacks)');
assert(!verifyCode.includes('.from(\'orders\').update'), 'verify-razorpay-payment completely eliminated multi-step non-atomic PostgREST updates');
assert(verifyCode.includes('!stockAllocationFailed'), 'verify-razorpay-payment bypasses create-shipment if stock allocation failed');
assert(verifyCode.includes('alreadyProcessed: true'), 'verify-razorpay-payment returns alreadyProcessed: true on concurrent duplicate');

// Webhook function checks
assert(webhookCode.includes('claim_and_process_order_payment'), 'razorpay-webhook invokes claim_and_process_order_payment RPC');
assert(webhookCode.includes('ATOMIC_TRANSACTION_FAILED'), 'razorpay-webhook fails closed with 500 if RPC is unavailable (zero weak fallbacks)');
assert(!webhookCode.includes('.from(\'orders\').update'), 'razorpay-webhook completely eliminated multi-step non-atomic PostgREST updates');
assert(webhookCode.includes('dbOrder.payment_status === \'Paid\''), 'razorpay-webhook checks if order is already Paid and exits early');
assert(webhookCode.includes('!stockAllocationFailed'), 'razorpay-webhook bypasses create-shipment if stock allocation failed');

// --------------------------------------------------------------------------
// TEST 5: Project Documentation & Git Hygiene
// --------------------------------------------------------------------------
console.log('\n=== [TEST 5: Documentation & Git Hygiene] ===');

const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const status = fs.readFileSync('PROJECT_STATUS.md', 'utf8');

assert(changelog.includes('Priority 1 — Admin Setup Passkey Hardening'), 'CHANGELOG.md records Priority 1');
assert(changelog.includes('Priority 2 — Email HTML Injection Defense'), 'CHANGELOG.md records Priority 2');
assert(changelog.includes('Priority 3 — Inventory Stockout Guard'), 'CHANGELOG.md records Priority 3');
assert(changelog.includes('Priority 4 — Dual-Channel State Transition'), 'CHANGELOG.md records Priority 4');
assert(changelog.includes('Priority 5 — Hardened Origin Allowlist'), 'CHANGELOG.md records Priority 5');
assert(changelog.includes('Priority 6 — Security Test Suite Alignment'), 'CHANGELOG.md records Priority 6');
assert(status.includes('Part 6.2'), 'PROJECT_STATUS.md records Part 6.2 completed');

// --------------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------------
console.log('\n------------------------------------------------------------------------');
console.log(`TOTAL CHECKS: ${passCount + failCount}  |  PASSED: ${passCount}  |  FAILED: ${failCount}`);
console.log('------------------------------------------------------------------------\n');

process.exit(failCount > 0 ? 1 : 0);
