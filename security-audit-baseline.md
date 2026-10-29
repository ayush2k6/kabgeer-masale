# Kabgeer Masale — Pre-Remediation Security Audit Baseline Report

**Date**: 2026-10-28  
**Audit Target**: Kabgeer Masale Ecommerce Platform (`kabgeer-ji`)  
**Scope**: 20-Part Adversarial, Concurrency, Database Integrity, and Payment Security Audit  
**Author**: Senior Application Security Engineer & Backend Architect  
**Project Ref**: `cfvopnzcqbtqcupdomto.supabase.co`  

---

## 1. Executive Summary

A comprehensive 20-part adversarial security and database integrity audit was conducted against the Kabgeer Masale ecommerce application. The audit interrogated real backend microservices, Supabase PostgreSQL RLS policies, Deno Edge Functions, checkout pricing calculations, Razorpay payment verification, and client-side authorization controls.

### Baseline Summary Metrics:
- **Total Tests Executed**: 20
- **Passed**: 11 (55%)
- **Failed / Vulnerable**: 9 (45%)
- **Critical Severity Vulnerabilities**: 2
- **High Severity Vulnerabilities**: 4
- **Medium Severity Vulnerabilities**: 3

---

## 2. Baseline 20-Test Results Matrix

| ID | Test Category & Name | Baseline Status | Severity | Primary Root Cause & Exposure |
|---|---|---|---|---|
| **Test 1** | Duplicate Order Creation & Idempotency | **FAIL** | MEDIUM | `create-razorpay-order` lacks idempotency key deduplication; 5 concurrent identical requests created 5 separate order records. |
| **Test 2** | Concurrent Inventory Checkout | **FAIL** | HIGH | Stock availability check in `create-razorpay-order` lacks atomic pre-allocation row locking (`SELECT FOR UPDATE`), permitting inventory over-commitment under concurrency. |
| **Test 3** | Coupon Exhaustion Race | **FAIL** | HIGH | Coupons and promo codes are purely validated on client-side React state. No server-side coupon table, usage counters, or single-use validation exist. |
| **Test 4** | Duplicate Payment Processing | **PASS** | INFO | Direct payment insertion is blocked by RLS; signature verification transitions order to Failed state cleanly. |
| **Test 5** | Client-Side Price Tampering | **FAIL** | CRITICAL | Server accepts unverified `discountAmount` and `shippingFee` from `pricingConfig` payload. An attacker can set shipping to ₹0 and inject discounts to pay ₹1 for any cart. |
| **Test 6** | Database Access Control & RLS | **FAIL** | HIGH | Guest order records (`customer_id IS NULL`) are exposed to anonymous public API callers via PostgREST `SELECT` on `public.orders`. |
| **Test 7** | Payment Signature Forgery | **PASS** | INFO | Cryptographic HMAC-SHA256 signature verification rejects forged and malformed signatures with HTTP 400. |
| **Test 8** | Webhook Forgery & Replay | **PASS** | INFO | Razorpay webhook signature validation validates the raw body HMAC signature and rejects forged payloads with HTTP 401. |
| **Test 9** | Unauthorized Admin Operations | **FAIL** | CRITICAL | `admin-manage-orders` Edge Function fails to verify caller JWT tokens, allowing anonymous callers or body-spoofed `adminEmail` to list orders and update fulfillment status. |
| **Test 10** | Type Confusion & Numeric Edge Cases | **FAIL** | MEDIUM | Quantities are clamped, but specific product ID lookups in inventory validation bypass stock ceiling checks. |
| **Test 11** | Oversized Request & Resource Limits | **PASS** | INFO | Address (>500 chars) and city (>100 chars) payload bounds strictly reject oversized strings with HTTP 400. |
| **Test 12** | External Service Failure Isolation | **PASS** | INFO | Downstream email, Google Sheets, and shipment booking are isolated with `Promise.allSettled` and fallback timeout race. |
| **Test 13** | Broken Object-Level Authorization (IDOR) | **FAIL** | HIGH | Direct UUID query on `public.orders` returns full order and customer PII without authentication for guest orders. |
| **Test 14** | Authentication & Session Security | **FAIL** | MEDIUM | Supabase Auth correctly rejects invalid/forged JWTs with HTTP 403, but test runner assertion required refinement to recognize 403 as authorization denial. |
| **Test 15** | SQL Injection & Query Manipulation | **PASS** | INFO | PostgREST parameterized queries and input regex sanitization prevent SQL injection. |
| **Test 16** | Cross-Site Scripting (XSS) | **PASS** | INFO | React JSX contextual string encoding active; 0 unescaped DOM sinks (`dangerouslySetInnerHTML`, `innerHTML`, `eval`) across frontend codebase. |
| **Test 17** | CSRF & Cross-Origin Protection | **PASS** | INFO | Platform relies on Authorization Bearer tokens in headers rather than ambient cookies, preventing CSRF attacks. |
| **Test 18** | Rate Limiting & Abuse Resistance | **PASS** | INFO | High-speed burst of 15 concurrent queries handled in 488ms without service degradation or 5xx crashes. |
| **Test 19** | Database Transaction Integrity | **PASS** | INFO | Direct client updates to `payment_status = Paid` are blocked by RLS; PostgreSQL CHECK constraints guard order status. |
| **Test 20** | Secrets, Configuration & Safety | **PASS** | INFO | 0 private secrets in frontend source (`src/`), `.gitignore` protects `.env`, production `dist/` bundle verified clean. |

---

## 3. Detailed Vulnerability Descriptions (Prior to Fixes)

### 3.1 Vulnerability 1 (CRITICAL) — Client-Side Discount & Shipping Fee Tampering (Test 5)
- **File**: `supabase/functions/create-razorpay-order/index.ts` (lines 180-186)
- **Vulnerability**: While unit prices were queried from `public.products`, `pricingConfig.discountAmount` and `pricingConfig.shippingFee` were directly read from client JSON without validating coupons, bundle criteria, or shipping rules.
- **Reproduction**: Submit `{ pricingConfig: { shippingFee: 0, discountAmount: 68 } }` on a ₹69 order.
- **Impact**: Attacker purchases products for ₹1.00 (100 paise) regardless of cart contents.

### 3.2 Vulnerability 2 (CRITICAL) — Unauthenticated Admin Access & Email Spoofing (Test 9)
- **File**: `supabase/functions/admin-manage-orders/index.ts` (lines 35-38, 101-111)
- **Vulnerability**: The function evaluated authorization using:
  ```ts
  if (!isAuthorized && callerEmail) { return 403; }
  ```
  If `callerEmail` was not provided, `!isAuthorized && callerEmail` evaluated to `false`, allowing unauthenticated requests to pass through to `action: 'list'`. Furthermore, `body.adminEmail` was trusted if supplied, enabling trivial impersonation without credentials.
- **Reproduction**: Call `POST /functions/v1/admin-manage-orders` with `{ action: 'list' }` and no auth token.
- **Impact**: Full exposure of all customer orders, PII, addresses, phone numbers, and unauthorized ability to alter order statuses.

### 3.3 Vulnerability 3 (HIGH) — Guest Orders PII Exposure via PostgREST (Tests 6 & 13)
- **File**: Database RLS policy on `public.orders`
- **Vulnerability**: RLS policies allowed anonymous SELECT on orders where `customer_id IS NULL`, causing guest orders to be accessible to anyone with the public Supabase anon key.
- **Reproduction**: Send `GET /rest/v1/orders?select=*` with anon key.
- **Impact**: Leaks names, email addresses, phone numbers, delivery addresses, and payment IDs of guest purchasers.

### 3.4 Vulnerability 4 (HIGH) — Absence of Server-Side Coupon Validation (Test 3)
- **File**: `create-razorpay-order/index.ts`
- **Vulnerability**: Discounts were never verified on the server against valid promo codes or active promotional campaigns.
- **Impact**: Unlimited usage of discounts, fake promotional codes, and unauthorized revenue loss.

### 3.5 Vulnerability 5 (MEDIUM) — Missing Idempotency Key Deduplication (Test 1)
- **File**: `create-razorpay-order/index.ts`
- **Vulnerability**: Concurrent identical checkout requests created multiple duplicate pending order rows in `public.orders`.
- **Impact**: Order clutter, ghost orders, duplicate Razorpay orders.

---

## 4. Remediation Plan

1. **Hardened Admin Authorization (`admin-manage-orders`)**:
   - Require valid Supabase Auth Bearer token (`auth.getUser()`).
   - Query `public.profiles` for `role = 'admin'` using the authenticated user's ID.
   - Reject any request lacking a verified admin JWT with HTTP 401/403.
   - Remove body-based `adminEmail` trust.

2. **Server-Side Authoritative Pricing & Coupon Validation (`create-razorpay-order`)**:
   - Determine standard shipping fee strictly on server (₹50 standard; free shipping only if verified condition met).
   - Reject arbitrary client `pricingConfig.discountAmount` and `shippingFee`.
   - Implement authoritative server-side discount calculation:
     - Bundle discount: 10% off bundle items strictly when 4 or more bundle items are in cart.
     - Coupon verification: Validate code (e.g., `TESTPAY1` only in non-production/test or specific rules; calculate discount authoritatively).

3. **PostgreSQL RLS Hardening for Guest Orders (`public.orders`)**:
   - Update RLS SELECT policy on `public.orders`: Only allow customers to view orders where `customer_id = auth.uid()` OR `public.is_admin() = true`.
   - Completely block anonymous/unauthenticated SELECT on `orders` and `order_items`. Guest orders can only be fetched via secured edge functions with verification.

4. **Order Creation Idempotency (`create-razorpay-order`)**:
   - Support `Idempotency-Key` or `X-Idempotency-Key` header.
   - Cache or query existing pending orders created within the last 5 minutes for the same idempotency key and return the existing order.

5. **Test Runner Refinement (`test-14-session-auth.mjs`)**:
   - Accept HTTP 401 or 403 as valid auth rejection.
