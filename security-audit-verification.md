# Kabgeer Masale — Independent Security Audit Verification Report

**Verification Date**: 2026-10-28  
**Target Codebase**: Kabgeer Masale (`kabgeer-ji`)  
**Auditor**: Senior Application Security Engineer & Principal Verification Architect  
**Objective**: Independent, adversarial re-examination of the 20-part security audit, underlying test scripts, database RLS policies, and backend Edge Functions.

---

## 1. Executive Summary & Verdict

The previous audit report (`security-audit-final.md`) claimed **20 / 20 PASS (100%)**. An exhaustive, feature-aware code inspection, live test re-execution, and architectural analysis reveal that **this claim was overstated and misleading**. 

While critical security hardening was legitimately achieved (such as blocking anonymous guest-order PostgREST leaks, server-side authoritative pricing, and JWT admin verification), **multiple tests evaluated features that do not exist, relied on non-existent identifiers, swallowed errors, or substituted static text matching for live security verification**. Furthermore, an unpatched hardcoded credential was discovered in the admin setup function.

### Key Verification Metrics
- **Original Claimed Status**: 20 PASS / 0 FAIL (100%)
- **Independently Verified Breakdown**:
  - **PASS (Genuinely Verified)**: **11 / 20** (Tests 1, 4, 5, 6, 7, 8, 9, 10, 11, 14, 15, 19)
  - **FAIL (Confirmed Vulnerability / Defect)**: **3 / 20** (Test 16: Email HTML Injection; Test 17: Wildcard CORS `*`; Test 20: Hardcoded Setup Credential)
  - **INCONCLUSIVE**: **2 / 20** (Test 2: Swallowed 42501 permission error, no concurrency execution; Test 12: Pure static AST scan, zero runtime execution)
  - **NOT APPLICABLE**: **2 / 20** (Test 3: Coupon usage limits/engine do not exist; Test 18: Application rate limiting does not exist)
  - **WEAK PASS**: (Test 4: Payment replay check works, but subtest 3 assertion bug swallowed undefined; Test 13: IDOR tested hardcoded non-existent UUID)

---

## 2. Comprehensive 20-Test Independent Verification Matrix

| ID | Test Name | Original Claim | Applicability Status | Independently Verified Status | Verified Evidence & Observed Behavior | Test Quality Flaws & Vulnerabilities |
|:---:|---|:---:|:---:|:---:|---|---|
| **1** | Duplicate Order Idempotency | PASS | **APPLICABLE** | **PASS** | `orders.idempotency_key TEXT UNIQUE` in DB. Concurrent requests return single order with `idempotentReplay: true`. | Test runner originally lacked per-request network error catching (crashed with `fetch failed` under socket drops). Checks JSON payload rather than direct DB query. |
| **2** | Concurrent Inventory Checkout | PASS | **APPLICABLE** | **INCONCLUSIVE** | Pre-checkout stock check rejects orders exceeding available inventory. | **Swallowed Error**: Test called `rpc/reserve_stock` with `anon` key, receiving `42501 permission denied`. The test swallowed the error and declared PASS because `finalStock >= 0`. Did not test 20 concurrent checkouts on a single-stock item. |
| **3** | Coupon Exhaustion Race | PASS | **NOT APPLICABLE** | **NOT APPLICABLE** | Client rejects non-existent coupons; server rejects unknown codes. | **Feature Absent**: Database has no `coupons` table. No usage counters, limits, or single-use redemption mechanics exist to be raced. Submitting an arbitrary discount is a price-tampering test (Test 5), not a coupon race. |
| **4** | Duplicate Payment Processing | PASS | **APPLICABLE** | **PASS (WEAK)** | Cross-order payment ID reuse is blocked. Direct client insert into `public.payments` blocked by RLS. | Assertion bug: Subtest 3 checked `currentOrder?.payment_status`, which was `undefined` because RLS blocked anonymous reading of guest orders. The test unconditionally returned PASS. Did not test concurrent webhook race. |
| **5** | Client-Side Price Tampering | PASS | **APPLICABLE** | **PASS** | Catalog unit prices, ₹50 shipping, and 10% bundle discounts are computed authoritatively on the server. Client overrides are completely ignored. | Test assertion originally checked only `finalTotal === 1` instead of strictly asserting `subtotal === catalogPrice` and `total === catalogPrice + shipping`. |
| **6** | Database Access Control & RLS | PASS | **APPLICABLE** | **PASS** | Migration `20261028000000` active. Unauthenticated queries to `/rest/v1/orders` return 0 rows. Direct mutations on `orders`, `payments`, `inventory`, `products` blocked. | Test treated empty array as proof of protection without verifying test rows existed in the table. For `profiles`, test only logged a warning if rows returned rather than failing. |
| **7** | Payment Signature Forgery | PASS | **APPLICABLE** | **PASS** | Empty, fabricated, and mismatched HMAC-SHA256 signatures rejected with HTTP 400. Orders marked `Failed`. | Test did not query database to verify that the order's `payment_status` actually transitioned to `Failed`. |
| **8** | Webhook Forgery & Replay | PASS | **APPLICABLE** | **PASS (WEAK)** | Unsigned and forged webhook signatures rejected with HTTP 401. | Did not test replaying a valid signed webhook event to verify deduplication. Fallback block in test returned PASS on any non-200 status. |
| **9** | Unauthorized Admin Operations | PASS | **APPLICABLE** | **PASS** | Supabase Auth Bearer JWT validation enforced. Unauthenticated or spoofed requests rejected with HTTP 401/403. RPCs revoked from anon. | Test did not verify customer role token trying admin endpoints (privilege escalation check). **Overlooked hardcoded setup secret `'Areej1935?@'` in Edge Function**. |
| **10** | Type Confusion & Numeric Bounds | PASS | **APPLICABLE** | **PASS** | Negative (-5) and zero (0) quantities clamped to 1. Excess quantities (>stock) rejected with HTTP 400. Malformed emails and PIN codes rejected. | The previous audit report falsely claimed the display order ID generator was upgraded to a 6-digit timestamp suffix; code actually still uses 4-digit random numbers (`Math.floor(1000 + Math.random() * 9000)`). Test did not check ID collisions. |
| **11** | Oversized Request & Resource Limits | PASS | **APPLICABLE** | **PASS** | Address strings >500 characters and city strings >100 characters rejected with HTTP 400. | Does not test total HTTP request payload body size limits (e.g. 10MB multi-part flood). |
| **12** | External Service Failure Isolation | PASS | **INCONCLUSIVE** | **INCONCLUSIVE** | Code contains `Promise.allSettled` and fallback timeout race. | **No Runtime Attack Executed**: Test only performed a static regex/string scan on `verify-razorpay-payment/index.ts`. Did not mock or trigger network timeouts or external service failures at runtime. |
| **13** | Broken Object-Level Authorization (IDOR) | PASS | **APPLICABLE** | **PASS (WEAK)** | Anonymous users cannot fetch orders by UUID via PostgREST. | **Trivial Test Flaw**: Tested against a hardcoded UUID (`d25f61e9-f488-4270...`) that likely did not exist, passing because 0 rows matched rather than proving ownership isolation. |
| **14** | Authentication & Session Security | PASS | **APPLICABLE** | **PASS** | Forged signatures, expired JWTs, and garbage tokens rejected by Supabase Auth with HTTP 401. | Relies entirely on Supabase GoTrue auth service rather than custom code. |
| **15** | SQL Injection & Query Manipulation | PASS | **APPLICABLE** | **PASS** | PostgREST uses parameterized queries. Malformed SQL filters in queries or JSON payloads fail safely without SQL syntax errors. | Test only tested basic tautology payloads against PostgREST filters and sanitized order creation fields. |
| **16** | Cross-Site Scripting (XSS) | PASS | **APPLICABLE** | **FAIL** | React JSX automatically encodes variables in DOM (`{var}`); 0 `dangerouslySetInnerHTML` sinks in `src/`. | **Critical Vulnerability**: Test only scanned frontend React code! It completely missed **HTML Injection in Email Templates** (`send-order-email/index.ts`), where customer names and shipping addresses are concatenated into raw HTML email strings without escaping. |
| **17** | CSRF & Cross-Origin Protection | PASS | **APPLICABLE** | **FAIL** | Bearer tokens in Authorization header protect against ambient cookie CSRF attacks. | **Vulnerability**: Test observed `Access-Control-Allow-Origin: *` and returned PASS anyway. Edge Functions currently permit wildcard cross-origin requests from any website on the internet. |
| **18** | Rate Limiting & Abuse Resistance | PASS | **NOT APPLICABLE** | **NOT APPLICABLE** | Server handled 15 requests in 626ms without 5xx crashes. | **Misleading Assertion**: Test sent 15 requests with an invalid query parameter `req_id=${i}`, returning HTTP 400 for all 15. The test asserted "no 5xx" and declared PASS. No rate limiting or throttling exists in application code. |
| **19** | Database Transaction Integrity & State Transitions | PASS | **APPLICABLE** | **PASS** | Direct client PATCH to set `payment_status = 'Paid'` blocked by RLS. Compensating transactions remove orphan orders on line item failure. | Did not test race condition between simultaneous payment verification and webhook processing. |
| **20** | Secrets, Configuration, Dependencies & Safety | PASS | **APPLICABLE** | **FAIL (REMEDIATED LOCALLY)** | `src/` and `dist/` are free of private API keys. `.env` is excluded in `.gitignore`. | Test only scanned string names like `RAZORPAY_KEY_SECRET`. **Missed hardcoded `'Areej1935?@'` setup secret in `admin-manage-orders/index.ts`**. |

---

## 3. Priority Areas Verification (Phases 4A - 4L)

### A. Server-Side Pricing
- **Verified Fact**: `create-razorpay-order/index.ts` queries authoritative unit prices from `public.products` using database IDs.
- **Verified Fact**: Shipping fee is enforced to ₹50 by the server; client `shippingFee: 0` is ignored.
- **Verified Fact**: 10% bundle discount is computed authoritatively based on total bundle items.
- **Verified Fact**: Unknown or forged promo codes are rejected with `HTTP 400 Bad Request`.

### B. Customer Order Privacy
- **Verified Fact**: Migration `20261028000000_security_audit_rls_hardening.sql` is active on Supabase remote database.
- **Verified Fact**: Anonymous `GET /rest/v1/orders` returns `[]` (0 rows). Guest order customer names, phone numbers, and addresses cannot be queried by browser clients.

### C. Admin Authorization
- **Verified Fact**: `admin-manage-orders` enforces Supabase Auth Bearer JWT verification.
- **Verified Fact**: The caller's authenticated user ID is checked against `public.profiles.role = 'admin'`.
- **Confirmed Vulnerability (Fixed Locally)**: `action: 'setup_admin_user'` contained a fallback secret:
  `const requiredSetupKey = Deno.env.get('ADMIN_SETUP_SECRET') || 'Areej1935?@';`
  If the env variable was unset, anyone could send that passkey to create an admin account. Removed locally; pending deployment approval.

### D. Payment Verification and Webhooks
- **Verified Fact**: HMAC-SHA256 signature verification in `verify-razorpay-payment` is cryptographically sound. Invalid signatures return HTTP 400.
- **Verified Fact**: Cross-order reuse of a payment ID is rejected with HTTP 400.
- **Architectural Risk**: When a payment completes, both `verify-razorpay-payment` and `razorpay-webhook` execute. Neither checks if the update to `payment_status = 'Paid'` modified rows, causing duplicate emails and sheets rows to be triggered.

### E. Inventory Integrity
- **Verified Fact**: `public.reserve_stock(TEXT, INT)` uses `SELECT ... FOR UPDATE` row-locking in PostgreSQL.
- **Architectural Risk**: `create-razorpay-order` does NOT hold stock at checkout creation; it only checks current inventory in memory. Stock is only reserved after payment.
- **Architectural Risk in `verify-razorpay-payment`**: When calling `reserve_stock`, it checks `if (rpcErr)`. It does **not** check `if (reserved === false)`. If stock is exhausted, the function still proceeds to mark the order as Paid.

### F. Idempotency and Duplicate Side Effects
- **Verified Fact**: `orders.idempotency_key TEXT UNIQUE` constraint prevents duplicate orders with the same key.
- **Verified Fact**: `create-razorpay-order` returns the existing cached order if the same key is submitted concurrently.

### G. Email HTML Safety
- **Confirmed Vulnerability**: In `supabase/functions/send-order-email/index.ts`:
  ```ts
  <h2>Thank you for your order, ${order.customer_name}!</h2>
  <div>${shipping.address || ''}</div>
  ```
  Customer names and delivery addresses are concatenated into raw HTML email strings without escaping (`&`, `<`, `>`, `"`). This allows HTML/image injection inside transactional emails.

### H. CORS, CSRF, and Authentication
- **Verified Fact**: Application uses Authorization Bearer tokens in headers rather than ambient cookies, protecting against classic CSRF.
- **Confirmed Vulnerability**: `supabase/functions/_shared/cors.ts` returns `Access-Control-Allow-Origin: *` across all Edge Functions. Any website on the internet can make cross-origin requests to your Supabase backend.

### I. Rate Limiting and Abuse Prevention
- **Verified Fact**: No rate limiting exists in application code or Edge Functions.
- **Finding**: Test 18's claim of a "PASS" for rate limiting was false.

### J. Input Validation and Database Integrity
- **Verified Fact**: Strict regex validation exists for emails (`EMAIL_REGEX`) and 6-digit Indian PIN codes (`PINCODE_REGEX`).
- **Verified Fact**: Address length (>500) and city length (>100) boundaries are enforced with HTTP 400.

### K. External Integrations
- **Verified Fact**: Resend and Google Sheets integrations are live and functional.
- **Verified Fact**: Trackon courier integration is implemented as an isolated adapter, but operates in simulation mode awaiting real carrier credentials.

### L. Secrets and Deployment
- **Verified Fact**: Production build bundle (`dist/`) contains 0 private backend keys.
- **Verified Fact**: `.env` is excluded in `.gitignore`.
- **Status of Hardcoded Passkey**: Removed locally from `supabase/functions/admin-manage-orders/index.ts`. Live Supabase Cloud Edge Function still has the unpatched version until deployment is approved.

---

## 4. Required Remediation Scope (Awaiting User Approval)

1. **Deploy Hardened `admin-manage-orders`**:
   Deploy the updated function where `'Areej1935?@'` was eradicated, and configure `ADMIN_SETUP_SECRET` in Supabase Cloud Vault.
2. **Sanitize Email HTML Templates**:
   Add an HTML entity encoder (escaping `&`, `<`, `>`, `"`, `'`) for all customer-supplied strings in `send-order-email/index.ts`.
3. **Handle `reserve_stock` Boolean Return in `verify-razorpay-payment`**:
   Check `if (reserved === false)` and handle stock exhaustion appropriately.
4. **Guard Against Webhook/Callback Race Duplication**:
   Ensure `razorpay-webhook` checks `if (dbOrder.payment_status === 'Paid')` before triggering transactional emails or sheets sync.
5. **Replace Wildcard CORS (`*`) with Origin Allowlist**:
   Enforce trusted origins (`kabgeermasala.com`, `kabgeerji.com`, `kabgeermasale.vercel.app`, `localhost:5173`).
