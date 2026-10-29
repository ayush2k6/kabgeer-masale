-- Add coupon_code column to public.orders table if not exists
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- Index for coupon reporting and analytics
CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON public.orders(coupon_code);
