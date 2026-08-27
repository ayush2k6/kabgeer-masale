# PART 3 — SUPABASE BACKEND & RAZORPAY PAYMENT ARCHITECTURE PLAN

**Project**: Kabgeer Masale  
**Current Phase**: Part 3.1 — Supabase Audit & Architecture Design  
**Author**: Antigravity  
**Status**: 🟢 PENDING TANMAY'S APPROVAL  

---

## Executive Summary & Strategic Shift

As confirmed by Tanmay:
- There are **ZERO** real production users and **ZERO** production orders in Firebase.
- There is **NO valuable production data** that needs to be migrated from Firebase.
- Firebase will be completely replaced by a fresh **Supabase** instance (PostgreSQL database, Supabase Auth, Row Level Security, and Supabase Edge Functions).
- All obsolete Firebase data structures and lazy migration patterns will be eliminated rather than preserved.

---

## 1. Firebase Dependency Audit & Map

### Existing Firebase Code Locations

| File Path | Imports / Usage | Purpose / Functionality |
|---|---|---|
| [src/firebase.js](file:///C:/Users/Acer/Documents/kabgeer-ji/src/firebase.js) | `initializeApp`, `getAuth`, `GoogleAuthProvider`, `getFirestore` | Firebase App & Service Initialization |
| [src/context/AuthContext.jsx](file:///C:/Users/Acer/Documents/kabgeer-ji/src/context/AuthContext.jsx) | `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, `onAuthStateChanged` | User Authentication |
| [src/context/AuthContext.jsx](file:///C:/Users/Acer/Documents/kabgeer-ji/src/context/AuthContext.jsx) | `doc`, `setDoc`, `updateDoc`, `arrayUnion`, `arrayRemove`, `onSnapshot`, `collection`, `query`, `where`, `serverTimestamp` | User Profile & Top-Level `/orders` CRUD & Listeners |
| [package.json](file:///C:/Users/Acer/Documents/kabgeer-ji/package.json) | `"firebase": "^12.14.0"` | Client-side Firebase npm package |

### Component Consumers of `AuthContext`

| Component / Page | Methods Consumed | Current Firebase Action |
|---|---|---|
| [Header.jsx](file:///C:/Users/Acer/Documents/kabgeer-ji/src/components/Header.jsx) | `user` | Reads logged-in user state |
| [LoginPage.jsx](file:///C:/Users/Acer/Documents/kabgeer-ji/src/pages/LoginPage.jsx) | `login` | Calls `signInWithEmailAndPassword` |
| [SignupPage.jsx](file:///C:/Users/Acer/Documents/kabgeer-ji/src/pages/SignupPage.jsx) | `register` | Calls `createUserWithEmailAndPassword` & creates `users/{uid}` doc |
| [ProfilePage.jsx](file:///C:/Users/Acer/Documents/kabgeer-ji/src/pages/ProfilePage.jsx) | `user`, `orders`, `logout`, `updateProfileDetails`, `toggleWishlist` | Profile editing, wishlist toggling, logout, and order history view |
| [ProductPage.jsx](file:///C:/Users/Acer/Documents/kabgeer-ji/src/pages/ProductPage.jsx) | `user`, `toggleWishlist` | Adds/removes item from `users.wishlist` array |
| [CheckoutPage.jsx](file:///C:/Users/Acer/Documents/kabgeer-ji/src/pages/CheckoutPage.jsx) | `user`, `addOrder` | Prefills user shipping details and calls `setDoc(doc(db, 'orders', orderId), ...)` |

---

## 2. Firebase → Supabase Replacement Map

| Firebase Element | Supabase Replacement | Architecture Notes |
|---|---|---|
| `firebase/auth` | `@supabase/supabase-js` Auth | Standard Supabase Auth (`signUp`, `signInWithPassword`, `signOut`, `onAuthStateChange`). |
| Firestore `users/{uid}` Document | `public.profiles` PostgreSQL Table | Automatically created via a PostgreSQL trigger (`on_auth_user_created`) when a new user signs up in `auth.users`. |
| Firestore `orders` Collection | `public.orders` & `public.order_items` Tables | Relational schema connecting orders to customers and items to products. |
| Firestore `users.wishlist` Array | `public.wishlists` Table | Junction table referencing `customer_id` (UUID) and `product_id` (TEXT). |
| Client-side `addOrder` in Firestore | Supabase Edge Function (`create-razorpay-order` & `verify-razorpay-payment`) | Server-side order creation and signature verification. Client never writes final order total or status directly. |

---

## 3. Proposed PostgreSQL Schema Design

### Entity Relationship Overview

```
[auth.users] (Supabase Auth)
     │ 1:1 (Trigger)
     ▼
[profiles] ─── (1:N) ───► [wishlists] ◄─── (N:1) ───┐
     │                                              │
     │ 1:N                                          │
     ▼                                              │
  [orders] ─── (1:N) ───► [order_items] ── (N:1) ──[products]
     │                                              ▲
     │ 1:N                                          │
     ▼                                              │
 [payments]                                   [inventory] (1:1)
```

---

### DDL Definitions (Proposed SQL Migration)

```sql
-- 1. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    apartment TEXT,
    city TEXT,
    state TEXT DEFAULT 'Uttar Pradesh',
    pin_code TEXT,
    country TEXT DEFAULT 'India',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. PRODUCTS TABLE (Static 25 products seeded)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY, -- e.g. 'kabgeer-mutton-masale-100g'
    ean TEXT,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    net_weight TEXT,
    weight_in_grams INT NOT NULL,
    mrp NUMERIC(10, 2) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    hsn_code TEXT,
    pack_type TEXT,
    veg_nonveg TEXT CHECK (veg_nonveg IN ('Veg', 'Non-Veg')),
    cuisine TEXT,
    shelf_life TEXT,
    manufacturer TEXT,
    marketer TEXT,
    description TEXT,
    ingredients TEXT[],
    usage_instructions TEXT[],
    storage_instructions TEXT,
    image_url TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
    stock_quantity INT DEFAULT 100,
    reorder_level INT DEFAULT 10,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_order_id TEXT UNIQUE NOT NULL, -- e.g. 'ORD-919981'
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_type TEXT NOT NULL CHECK (customer_type IN ('registered', 'guest')),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    tax NUMERIC(10, 2) DEFAULT 0.00,
    shipping_fee NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    order_status TEXT NOT NULL DEFAULT 'Pending' CHECK (order_status IN ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Pending', 'Paid', 'Failed', 'Refunded')),
    razorpay_order_id TEXT UNIQUE,
    shiprocket_order_id TEXT,
    shiprocket_shipment_id TEXT,
    shiprocket_awb TEXT,
    courier_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(10, 2) NOT NULL,
    product_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    razorpay_order_id TEXT NOT NULL,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT NOT NULL CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded')),
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. WISHLISTS TABLE
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, product_id)
);
```

---

## 4. Authentication Architecture

```
[User Interface] ── (Email / Password) ──► [Supabase Auth]
       │                                         │
       │ (Session Event)                         │ (creates auth.users row)
       ▼                                         ▼
[AuthContext.jsx] ◄── (onAuthStateChange) ── [PostgreSQL Trigger]
       │                                         │
       ▼                                         ▼
   Sets state                               Creates public.profiles
```

1. **Sign Up**: `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`. Trigger automatically creates `profiles` record.
2. **Sign In**: `supabase.auth.signInWithPassword({ email, password })`.
3. **Session Persistence**: Managed automatically by `@supabase/supabase-js` via LocalStorage.
4. **Profile Hydration**: `AuthContext` listens to `onAuthStateChange` and fetches profile details from `public.profiles`.

---

## 5. Order Architecture

- **Guest Orders**: Customer info (name, email, phone, address) saved directly in `orders` table with `customer_id = NULL` and `customer_type = 'guest'`.
- **Registered Customer Orders**: Linked via `customer_id = auth.uid()` with `customer_type = 'registered'`.
- **Order Creation Safety**: Orders are generated via Supabase Edge Function or trusted backend calls during payment initiation. The client cannot forge payment totals or order statuses.

---

## 6. Payment Architecture (Razorpay + Supabase Edge Functions)

```
[React Frontend]
       │
       │ 1. POST /functions/v1/create-razorpay-order (cart, shipping)
       ▼
[Supabase Edge Function: create-razorpay-order]
       │
       │ 2. Calculates authoritative subtotal from `products` table
       │ 3. Creates Razorpay Order via Razorpay REST API (Secret Key)
       │ 4. Inserts 'Pending' / 'Unpaid' row into `orders` and `order_items`
       ▼
[Razorpay Payment Modal in Frontend]
       │
       │ 5. Customer completes payment
       ▼
[Supabase Edge Function: verify-razorpay-payment]
       │
       │ 6. Validates HMAC SHA-256 Signature (razorpay_order_id + payment_id)
       │ 7. Updates order to 'Confirmed' & payment_status to 'Paid'
       │ 8. Inserts audit record into `payments` table
       ▼
[Success Page / confirmation]
```

* **Secret Protection**: `RAZORPAY_KEY_SECRET` resides strictly in Supabase Edge Function Environment Secrets. It is NEVER exposed to the frontend.

---

## 7. Row Level Security (RLS) Policy Design

| Table | Policy Name | Permitted Operations | Role / Condition |
|---|---|---|---|
| `public.profiles` | Users can view own profile | `SELECT` | `auth.uid() = id` |
| `public.profiles` | Users can update own profile | `UPDATE` | `auth.uid() = id` |
| `public.products` | Public product catalog access | `SELECT` | `true` (Anon + Auth) |
| `public.orders` | Users can view own orders | `SELECT` | `auth.uid() = customer_id` |
| `public.orders` | Service role order mutations | `INSERT`, `UPDATE` | `service_role` (Edge Functions) |
| `public.order_items` | Users can view own order items | `SELECT` | `EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid())` |
| `public.wishlists` | Users can view own wishlist | `SELECT`, `INSERT`, `DELETE` | `auth.uid() = customer_id` |

---

## 8. Product Architecture & Dataset Stability

- **Static Catalogue Sync**: All 25 products from `src/data/products.js` will be seeded into PostgreSQL `products` table.
- **Contract Guarantee**: Existing product string IDs (e.g. `kabgeer-mutton-masale-100g`) and image asset paths (`/assets/products/...`) remain unchanged.

---

## 9. Firebase Removal Plan

1. **Step A**: Install `@supabase/supabase-js` package.
2. **Step B**: Create `src/lib/supabaseClient.js` initialized with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. **Step C**: Execute SQL migrations to create Supabase tables, triggers, and seed product data.
4. **Step D**: Replace Firebase Auth in `AuthContext.jsx` with Supabase Auth.
5. **Step E**: Update `LoginPage`, `SignupPage`, `ProfilePage`, `ProductPage`, `CheckoutPage` to consume Supabase methods.
6. **Step F**: Verify full authentication, profile update, wishlist, and order flow functionality.
7. **Step G**: Uninstall `firebase` dependency and delete `src/firebase.js`.

---

## 10. Small Implementation Sequence for Part 3

```
Part 3.1 — Supabase Audit & Architecture Plan (CURRENT TASK — STOP FOR APPROVAL)
   │
   ▼
Part 3.2 — Supabase Database Foundation & SQL Migrations (Tables, RLS, Product Seed Data)
   │
   ▼
Part 3.3 — Supabase Auth Integration & Context Wireup (Replace Firebase Auth, update Login/Signup/Profile)
   │
   ▼
Part 3.4 — Complete Firebase Dependency Cleanup (Uninstall Firebase, remove obsolete code)
   │
   ▼
Part 3.5 — Order & Cart Database Integration (Wire up guest & registered order schema)
   │
   ▼
Part 3.6 — Razorpay Edge Functions Setup (`create-razorpay-order` & signature verification)
   │
   ▼
Part 3.7 — Razorpay Frontend Checkout Integration (Payment modal, error handling, success flows)
   │
   ▼
Part 3.8 — Comprehensive End-to-End Testing & Verification (Auth, DB, Orders, Payments, Security)
```

---

## 🛑 STOP & WAIT FOR TANMAY'S APPROVAL

Before proceeding to **Part 3.2 (Supabase Database Foundation)**, Tanmay must review and approve this proposed architecture and database schema.
