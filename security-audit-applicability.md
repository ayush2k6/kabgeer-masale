# Kabgeer Masale — Security Audit Applicability & Test Quality Review

**Date**: 2026-10-28  
**Scope**: 20-Test Mapping, Feature Alignment, and Adversarial Test-Quality Audit  
**Target Codebase**: Kabgeer Masale (`kabgeer-ji`)  
**Auditor**: Senior Application Security Engineer & Principal QA Automation Architect  

---

## 1. Executive Summary

A security test suite is only as trustworthy as the real-world features it evaluates. In the initial 20-part security audit, multiple tests were executed against features that either **do not exist** in the codebase (such as dynamic coupon exhaustion and application-level rate limiting), relied on **hardcoded non-existent identifiers** (such as IDOR lookups on imaginary UUIDs), or used **pure static source-code string matching** while claiming live runtime verification.

This document establishes the definitive **Feature-to-Test Applicability Matrix** and provides an exhaustive **Test-Quality Audit** across all 20 adversarial tests.

---

## 2. 20-Test Applicability Matrix

### Applicability Classification Definitions:
- **APPLICABLE**: The feature, data model, or attack surface genuinely exists and can be meaningfully evaluated.
- **NOT APPLICABLE**: The feature or attack surface does not exist in the codebase.
- **BLOCKED**: The feature exists, but testing requires unavailable access, live carrier accounts, or elevated authorization.
- **INCONCLUSIVE**: Insufficient implementation evidence or testing infrastructure to verify the security property conclusively.

| Test ID | Test Name | Underlying Feature Discovered | Feature Status | Applicability Status | Actual Attack Surface | Safe to Execute? | Limitations & Gaps |
|:---:|---|---|:---:|:---:|---|:---:|---|
| **1** | Duplicate Order Creation & Idempotency | `idempotency_key TEXT UNIQUE` in `public.orders`, deduplication logic in `create-razorpay-order` | Implemented & Used | **APPLICABLE** | `POST /functions/v1/create-razorpay-order` with `Idempotency-Key` header | YES | Only checks HTTP response JSON; does not verify single database row insertion directly via SQL. |
| **2** | Concurrent Inventory Checkout | Stock check in `create-razorpay-order`, `public.reserve_stock(TEXT, INT)` with `SELECT FOR UPDATE` | Implemented (Split flow) | **APPLICABLE** | Simultaneous checkout requests on low-stock items | YES (with mock or test items) | `create-razorpay-order` does not hold stock at checkout initiation; `verify-razorpay-payment` does not check boolean return of `reserve_stock`. |
| **3** | Coupon Exhaustion & Redemption Limits | Coupon usage counters, per-user limits, single-use coupons | **ABSENT** | **NOT APPLICABLE** | None. Database has no `coupons` table. Only hardcoded developer test coupon `TESTPAY1` exists. | N/A | Testing coupon exhaustion on a system with no coupon limits produces misleading false positives. |
| **4** | Duplicate Payment Processing | Payment tracking table `public.payments`, cross-order check in `verify-razorpay-payment` | Implemented & Used | **APPLICABLE** | Submitting identical `razorpay_payment_id` across multiple orders or repeated verification calls | YES | Subtest 3 had an assertion bug where `currentOrder` was undefined due to RLS, yet returned PASS. Replay race between webhook and callback not tested. |
| **5** | Client-Side Price Tampering | Authoritative server pricing in `create-razorpay-order` (re-queries DB prices, fixed ₹50 shipping) | Implemented & Used | **APPLICABLE** | Manipulating `items[].price`, `pricingConfig.shippingFee`, `pricingConfig.discountAmount` | YES | Assertion originally only checked `finalTotal === 1`; must strictly verify `subtotal === catalogPrice` and `total === catalogPrice + shipping`. |
| **6** | Database Access Control & RLS | PostgreSQL Row Level Security on 8 core tables, `get_all_orders_admin` RPC | Implemented & Used | **APPLICABLE** | Public PostgREST endpoints (`/rest/v1/orders`, `payments`, `inventory`, `products`, `profiles`) | YES | Accepted empty array `[]` as proof of protection without verifying test records existed in the database table to be hidden. |
| **7** | Payment Signature Forgery | Deno Web Crypto HMAC-SHA256 signature verification in `verify-razorpay-payment` | Implemented & Used | **APPLICABLE** | Submitting empty, malformed, or fabricated `razorpay_signature` | YES | Verified HTTP 400 rejection, but did not assert that the order row in `public.orders` transitioned to `Failed`. |
| **8** | Webhook Forgery & Replay | HMAC signature verification in `supabase/functions/razorpay-webhook/index.ts` | Implemented & Used | **APPLICABLE** | `POST /functions/v1/razorpay-webhook` with raw payload and `X-Razorpay-Signature` | YES | Tested forged signatures (HTTP 401), but did NOT test replaying a valid signed webhook event to verify deduplication. |
| **9** | Unauthorized Administrative Operations | Supabase Auth JWT Bearer verification in `admin-manage-orders`, `role = 'admin'` check | Implemented & Used | **APPLICABLE** | `POST /functions/v1/admin-manage-orders`, RPC `get_all_orders_admin`, RPC `admin_update_order_status` | YES | Did not test privilege escalation using a customer JWT. **Overlooked hardcoded setup secret `'Areej1935?@'` in Edge Function**. |
| **10** | Type Confusion & Numeric Validation | Input validation and regex sanitization in `create-razorpay-order` | Implemented & Used | **APPLICABLE** | Negative/zero quantities, excessive quantities, invalid email/PIN codes, non-existent UUIDs | YES | Report falsely claimed display order ID suffix was upgraded to a 6-digit timestamp suffix; code actually still uses 4-digit random numbers (`Math.floor(1000 + Math.random() * 9000)`). |
| **11** | Oversized Requests & Resource Limits | String length boundary checks in `create-razorpay-order` (address <=500, city <=100) | Implemented & Used | **APPLICABLE** | String overflow attacks on checkout address fields | YES | Only tests string length fields; does not test total HTTP request payload body size limits. |
| **12** | External Service Failure Isolation | `Promise.allSettled` and fallback timeout race in `verify-razorpay-payment` | Implemented & Used | **INCONCLUSIVE (STATIC ONLY)** | Network latency or failure in Resend, Google Sheets, or Trackon | YES | **Test did not execute any runtime requests**. It performed a pure static AST / string search on source code, claiming live verification without runtime proof. |
| **13** | Broken Object-Level Authorization (IDOR) | RLS ownership policies on `public.orders` and `public.profiles` | Implemented & Used | **APPLICABLE** | Querying individual order records by UUID via `GET /rest/v1/orders?id=eq.<uuid>` | YES | **Trivial Test Flaw**: Queried a hardcoded non-existent UUID (`d25f61e9-f488-4270-9571-b90f957b85d5`), passing because 0 rows matched rather than proving ownership isolation. |
| **14** | Authentication & Session Security | Supabase GoTrue Auth token verification (`/auth/v1/user`) | Implemented & Used | **APPLICABLE** | Submitting forged, expired, or malformed JWT Bearer tokens | YES | Relies on Supabase platform auth endpoints rather than testing custom session cookies (since the app uses Bearer tokens). |
| **15** | SQL Injection & Query Manipulation | PostgREST parameterized queries and input sanitization | Implemented & Used | **APPLICABLE** | SQL injection payloads in PostgREST query parameters and Edge Function JSON payloads | YES | Relies primarily on PostgREST's native parameterization; does not test dynamic SQL in custom PostgreSQL functions. |
| **16** | Cross-Site Scripting (XSS) | React JSX contextual encoding, email template generation in `send-order-email` | Implemented & Used | **APPLICABLE** | Injecting `<script>` or `<img onerror=...>` into customer names and addresses | YES | **Critical Blind Spot**: Scanned only React frontend code for DOM sinks (`dangerouslySetInnerHTML`). **Completely missed unescaped HTML interpolation in email templates** (`send-order-email/index.ts`). |
| **17** | CSRF & Cross-Origin Protection | Bearer token architecture, CORS headers in `_shared/cors.ts` | Implemented & Used | **APPLICABLE** | Cross-origin requests with untrusted `Origin` header | YES | **Test Logic Flaw**: Test observed `Access-Control-Allow-Origin: *` and returned PASS anyway. Wildcard CORS allows malicious sites to invoke Edge Functions from a victim browser. |
| **18** | Rate Limiting & Abuse Resistance | Application-level request throttling / IP rate limiting | **ABSENT** | **NOT APPLICABLE** | Burst requests against checkout, promo codes, or admin login | YES | **Misleading Assertion**: Test sent 15 requests with an invalid query parameter `req_id=${i}` to `/rest/v1/products`, which all failed with HTTP 400. The test asserted "no 5xx" and declared PASS. No rate limiting exists in application code. |
| **19** | Database Transaction Integrity & State Transitions | PostgreSQL schema CHECK constraints, RLS on state columns, compensating transactions | Implemented & Used | **APPLICABLE** | Direct client PATCH to set `payment_status = 'Paid'`, illegal order status strings | YES | Subtest 2 tested an invalid `order_status` on an anonymous PATCH, but because RLS blocked the update (0 rows affected), the CHECK constraint was never evaluated. Replay race between webhook and callback not tested. |
| **20** | Secrets, Configuration, Dependencies & Safety | Environment configuration, `.gitignore`, production build bundle | Implemented & Used | **APPLICABLE** | Exposed API keys in frontend bundles, secret leakage in Git, dependency vulnerabilities | YES | **Test Blind Spot**: Scanned only string names like `RAZORPAY_KEY_SECRET`. **Missed the hardcoded setup secret `'Areej1935?@'` in `admin-manage-orders/index.ts`**. Did not run `npm audit`. |

---

## 3. Detailed Test-Quality Audit (The 12 Critical Vulnerabilities in Testing Methodology)

### 1. Tests Targeting Nonexistent Endpoints, Tables, or Features
- **Test 3 (Coupon Exhaustion)**: Targeted a nonexistent table (`coupons`) in PostgREST. The application only implements a hardcoded developer test coupon `TESTPAY1`. Claiming a PASS for "Coupon Exhaustion Race" was completely unfounded.
- **Test 18 (Rate Limiting)**: Attempted to test rate limiting when no rate limiting middleware or Redis cache is configured in application code.

### 2. Tests Based on Invented Schemas or Hardcoded Nonexistent IDs
- **Test 13 (IDOR)**: Queried a hardcoded non-existent UUID (`d25f61e9-f488-4270-9571-b90f957b85d5`). Because the record didn't exist in the database, PostgREST returned `[]` (0 rows). The test interpreted this empty array as proof of authorization isolation, creating a false sense of security.

### 3. Tests Relying on Mocks While Claiming Live Integration Verification
- **Test 12 (Service Isolation)**: Did not trigger a single live or mocked network call to Resend, Google Sheets, or Trackon. It merely performed a static string search on `verify-razorpay-payment/index.ts` for the words `Promise.allSettled`.

### 4. Tests Checking HTTP Status Codes Without Verifying Database State
- **Test 7 (Signature Forgery)**: Validated that `verify-razorpay-payment` returned HTTP 400 on forged signatures, but failed to assert whether the order record in `public.orders` actually transitioned to `payment_status = 'Failed'`.
- **Test 1 (Idempotency)**: Verified that the HTTP response returned a single order ID, but did not query the database using privileged credentials to verify that only 1 row was stored in `public.orders` with that idempotency key.

### 5. Tests Swallowing Errors or Interpreting Failures as Security Enforcement
- **Test 2 (Concurrent Inventory)**: Invoked `rpc/reserve_stock` using the `anon` key. The database rejected the call with PostgreSQL error `42501 permission denied`. The test swallowed the error and marked PASS because `finalStock >= 0`.
- **Test 18 (Rate Limiting)**: Sent 15 requests with an invalid query parameter `req_id=${i}`, returning HTTP 400 Bad Request for all 15. The test asserted that no 5xx errors occurred and marked the test as PASS for rate limiting.

### 6. Tests Asserting Only Non-Negative Stock Without Testing Concurrent Reservations
- **Test 2 (Concurrent Inventory)**: Never created an isolated test product with stock = 1, and never submitted 20 concurrent reservation requests. It merely verified that existing catalog stock was `>= 0`.

### 7. Tests Reporting Success Because the Server Did Not Crash
- **Test 18 (Rate Limiting)**: Concluded that rate limiting was successful simply because the server responded to 15 concurrent queries without a 500 error.

### 8. Tests Failing to Verify Duplicate Side Effects or State Transitions
- **Test 4 (Duplicate Payment Processing)**: Did not test concurrent execution between `verify-razorpay-payment` and `razorpay-webhook`. Both endpoints update the order and trigger downstream email and sheets sync without checking if the order was already paid.

### 9. Tests Creating Data Without Cleanup
- **Tests 1, 4, 5, 7, 10, 11, 16, 19**: Each execution creates synthetic orders in `public.orders` with customer emails like `audit-concurrency@kabgeer-audit.local`. These records accumulate in the database.

### 10. Tests Performing Static Source Inspection While Claiming Runtime Verification
- **Test 12 (Service Failure)**: 100% static AST string inspection.
- **Test 16 (XSS)**: Scanned React code for `dangerouslySetInnerHTML`, but did not test HTML rendering in transactional email templates.

### 11. Tests Missing Dangerous Fallback Credentials
- **Test 20 (Secrets Audit)**: Scanned for standard environment variable names, but failed to detect the hardcoded default setup secret `'Areej1935?@'` in `admin-manage-orders/index.ts`.

### 12. Tests With Assertions Passing Even When Vulnerabilities Exist
- **Test 4 (Payments)**: Subtest 3 checked `if (currentOrder?.payment_status === 'Failed')`, which was never entered because `currentOrder` was undefined. The test unconditionally returned PASS.
- **Test 17 (CORS)**: Detected `Access-Control-Allow-Origin: *` and returned PASS regardless.

---

## 4. Applicability Summary

- **Total Original Tests**: 20
- **Genuinely APPLICABLE Tests**: **17 / 20** (Tests 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20)
- **NOT APPLICABLE Tests**: **2 / 20** (Test 3: Coupon Exhaustion; Test 18: Rate Limiting)
- **INCONCLUSIVE Tests**: **1 / 20** (Test 12: External Service Failure Isolation)
