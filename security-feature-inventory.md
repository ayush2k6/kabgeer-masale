# Kabgeer Masale — Feature Inventory & Implementation Status

**Date**: 2026-10-28  
**Scope**: Codebase Reconnaissance, Architecture Mapping & Feature Verification  
**Target Codebase**: Kabgeer Masale (`kabgeer-ji`)  
**Auditor**: Senior Application Security Engineer & Backend Architect  

---

## 1. Executive Summary

This inventory maps every ecommerce, database, authentication, payment, and integration feature discovered in the repository against actual implementation evidence. Features are strictly classified as:
- **Implemented & Used**: Fully connected in frontend and backend workflows.
- **Backend Only**: Implemented in database or Edge Functions, but not exposed to storefront customers.
- **Not Connected / Dead Code**: Code exists in components or pages, but is disabled or bypassed in routing.
- **Simulated / Mocked**: Operates using stubbed data, mock modals, or synthetic IDs without live external API execution.
- **Planned / Documented Only**: Mentioned in documentation or specifications, but no executable code exists.
- **Absent**: Completely nonexistent in the codebase.
- **Uncertain**: Evidence cannot be verified without unavailable remote credentials or access.

---

## 2. Feature-by-Feature Inventory Matrix

| Feature Module | Specific Feature / Capability | Implementation Status | Concrete File / Schema Evidence | Reachable Endpoints & Objects | Verification Limitations |
|---|---|:---:|---|---|---|
| **Storefront & Navigation** | Single Page Application Routing | **Implemented & Used** | `src/App.jsx` (lines 46–70), `vercel.json` rewrite rule | Routes: `/`, `/products`, `/product/:id`, `/bundle`, `/bulk`, `/recipes`, `/about`, `/contact`, `/terms`, `/privacy`, `/shipping`, `/returns`, `/faqs` | None. Verified via Vite build and runtime bundle. |
| **Storefront & Navigation** | Customer Login, Signup, Profile | **Not Connected / Dead Code** | `src/App.jsx` (lines 48–50 redirects `/login`, `/signup`, `/profile` to `/products`). Component files `src/pages/LoginPage.jsx`, `SignupPage.jsx`, `ProfilePage.jsx` exist but are unreachable. | None. Inactive routes. | Bypassed by design for frictionless guest checkout. |
| **Catalog & Products** | Product Catalog & Inventory Listing | **Implemented & Used** | `src/data/products.js` (25 items), `public.products` (Supabase table), `public.inventory` (Supabase table) | PostgREST: `GET /rest/v1/products`, `GET /rest/v1/inventory` | Read-only public queries permitted via RLS. |
| **Cart & Promotions** | Local Cart Management | **Implemented & Used** | `src/context/CartContext.jsx`, `src/components/CartDrawer.jsx` | React context & `localStorage` (`kabgeer_cart`) | Client-side only. |
| **Cart & Promotions** | Bundle Discount (10% OFF 4+ items) | **Implemented & Used** | `src/context/CartContext.jsx` (lines 117–135), `supabase/functions/create-razorpay-order/index.ts` (lines 230–232) | Evaluated client-side for UI display; authoritatively enforced in `create-razorpay-order`. | Verified in Edge Function. |
| **Cart & Promotions** | Promotional Coupon Engine & Usage Limits | **Absent** | `src/context/CartContext.jsx` (lines 7, 94–109): `const VALID_COUPONS = {};` | Only hardcoded developer test code `TESTPAY1` exists. **No `coupons` table in database**, no per-user usage limits, no expiry dates. | Concurrency/exhaustion cannot be tested because feature does not exist. |
| **Order Processing** | Guest Checkout (Frictionless) | **Implemented & Used** | `src/pages/CheckoutPage.jsx`, `supabase/functions/create-razorpay-order/index.ts` | Edge Function: `POST /functions/v1/create-razorpay-order` | Customers check out with name, email, phone, and delivery address without passwords. |
| **Order Processing** | Order Idempotency Deduplication | **Implemented & Used** | `supabase/migrations/20261028010000_idempotency_and_stock_locking.sql`, `supabase/functions/create-razorpay-order/index.ts` (lines 66–99, 382–414) | Column: `orders.idempotency_key TEXT UNIQUE` | Dedupes by `Idempotency-Key` HTTP header and body key. |
| **Order Processing** | Server-Side Authoritative Pricing | **Implemented & Used** | `supabase/functions/create-razorpay-order/index.ts` (lines 145–241) | Edge Function: `create-razorpay-order` | Server re-fetches product prices from `public.products`, applies ₹50 shipping, and ignores client pricing overrides. |
| **Order Processing** | Display Order ID Generation | **Implemented & Used** | `supabase/functions/create-razorpay-order/index.ts` (lines 244–247) | Format: `KAB-YYYYMMDD-XXXX` (4-digit random number) | 4-digit random numbers present collision risk under high volume. |
| **Payments** | Razorpay Live Gateway Integration | **Implemented & Used** | `src/pages/CheckoutPage.jsx` (`window.Razorpay`), `supabase/functions/create-razorpay-order/index.ts` | Razorpay API: `POST https://api.razorpay.com/v1/orders` | Requires live keys in Supabase Vault; falls back to simulation if unconfigured. |
| **Payments** | Payment Signature Verification | **Implemented & Used** | `supabase/functions/verify-razorpay-payment/index.ts` (lines 112–134) | Edge Function: `POST /functions/v1/verify-razorpay-payment` | Uses Deno Web Crypto API (`HMAC-SHA256`). Rejects invalid signatures with HTTP 400. |
| **Payments** | Razorpay Webhook Processing | **Implemented & Used** | `supabase/functions/razorpay-webhook/index.ts` | Webhook URL: `POST /functions/v1/razorpay-webhook` | Verifies `X-Razorpay-Signature` against raw request body. |
| **Payments** | Automated Refund API | **Absent** | No refund endpoints in `supabase/functions/` or `src/`. Only informational mention in cancellation email template. | None. | Refunds must be handled manually via Razorpay dashboard. |
| **Inventory Management** | Stock Availability Check at Order Creation | **Implemented & Used** | `supabase/functions/create-razorpay-order/index.ts` (lines 157–201) | Query: `select stock_quantity from inventory` | Unlocked read. Does NOT hold stock during checkout. |
| **Inventory Management** | Atomic Stock Reservation (Row Locking) | **Backend Only** | `supabase/migrations/20261028010000_idempotency_and_stock_locking.sql`, `supabase/functions/verify-razorpay-payment/index.ts` (lines 175–197) | Function: `public.reserve_stock(TEXT, INT)` via `SELECT FOR UPDATE` | Executed only upon payment confirmation. `verify-razorpay-payment` does not check boolean return value (`reserved === false`). |
| **Order Tracking & Shipping** | Trackon Courier Adapter | **Simulated / Mocked** | `supabase/functions/create-shipment/index.ts`, `PROJECT_STATUS.md` line 48 | Edge Function: `POST /functions/v1/create-shipment`, Table: `public.shipments` | Operates in simulation mode (generates mock AWB `TRK-LKO-XXXXXX`). Pending real API credentials. |
| **Transactional Email** | Order Confirmation, Status & Review Emails | **Implemented & Used** | `supabase/functions/send-order-email/index.ts` | Resend API (`https://api.resend.com/emails`) | Verified live dispatches with real Resend API IDs. Customer values in HTML templates lack escaping. |
| **Order Reporting** | Google Sheets Order Sync | **Implemented & Used** | `supabase/functions/sync-google-sheets/index.ts`, Google Apps Script `Code.gs` | Webhook POST to Google Apps Script Web App | Appends order rows in real-time to spreadsheet. |
| **Administration** | Admin Authentication & Dashboard | **Implemented & Used** | `src/pages/AdminLoginPage.jsx`, `AdminDashboardPage.jsx`, `AdminRoute.jsx` | Routes: `/admin/login`, `/admin`. PostgREST: RPC `get_all_orders_admin` | Authenticates via Supabase Auth. Enforces `role = 'admin'` in `public.profiles`. |
| **Administration** | Admin Order Management API | **Implemented & Used** | `supabase/functions/admin-manage-orders/index.ts` | Edge Function: `POST /functions/v1/admin-manage-orders` | Enforces Bearer JWT verification. Supports order status updates and tracking info. |
| **Administration** | Deliverable 4x6 Thermal Bills & Tax Invoices | **Implemented & Used** | `src/components/PrintableThermalBill.jsx`, `AdminDashboardPage.jsx` | Client-side SVG Code 39 barcode and print styles for 4x6 thermal roll and A4 sheets | Purely client-side rendering for warehouse dispatch. |
| **Security & Privacy** | Row Level Security (RLS) | **Implemented & Used** | `supabase/migrations/20261028000000_security_audit_rls_hardening.sql` | 8 tables: `orders`, `order_items`, `payments`, `inventory`, `products`, `profiles`, `shipments`, `wishlists` | Blocks anonymous public reads on `orders` (`customer_id IS NULL`). Mutations strictly admin/service_role. |
| **Security & Privacy** | Rate Limiting & Request Throttling | **Absent** | No rate limiting middleware in Edge Functions or application code. | None. | Infrastructure relies only on upstream platform defaults. |
| **Security & Privacy** | Cross-Origin Resource Sharing (CORS) | **Implemented (Permissive)** | `supabase/functions/_shared/cors.ts` | Headers: `Access-Control-Allow-Origin: *` | Wildcard CORS active across all 7 Edge Functions. |
| **Security & Privacy** | Cross-Site Request Forgery (CSRF) Defenses | **Implemented & Used (Architectural)** | Authorization Bearer tokens in headers | All sensitive API requests | Immune to classic ambient cookie CSRF. |
| **Security & Privacy** | Input Sanitization & Boundary Validation | **Implemented & Used** | `create-razorpay-order/index.ts` (lines 109–139) | Regex: Email `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, PIN `/^[1-9][0-9]{5}$/`, string lengths <=500 address, <=100 city | Enforced with HTTP 400 Bad Request. |

---

## 3. Summary of Feature Availability

- **Core Ecommerce & Checkout**: FULLY IMPLEMENTED (Catalog, Cart, Guest Checkout, Authoritative Server Pricing, Razorpay Integration).
- **Automations**: FULLY IMPLEMENTED (Resend Email Dispatch, Google Sheets Sync).
- **Shipping**: SIMULATED (Trackon Courier adapter architecture complete, but runs in simulation mode awaiting live carrier API keys).
- **Admin Control**: FULLY IMPLEMENTED (Supabase JWT Admin Dashboard, Thermal 4x6 Labels, Order Status Transitions).
- **Promotions & Coupons**: PARTIALLY IMPLEMENTED (10% Bundle Discount active; **Dynamic/Limited Coupon Engine is ABSENT**).
- **Refunds**: ABSENT (No automated refund pipeline).
- **Rate Limiting**: ABSENT in application code.
