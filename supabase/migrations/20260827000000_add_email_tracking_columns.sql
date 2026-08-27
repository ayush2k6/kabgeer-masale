-- Migration: Add separate email delivery tracking timestamp columns to public.orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_email_sent_at TIMESTAMPTZ;

-- Comments for documentation
COMMENT ON COLUMN public.orders.customer_email_sent_at IS 'Timestamp when customer confirmation email was successfully sent via Resend.';
COMMENT ON COLUMN public.orders.admin_email_sent_at IS 'Timestamp when admin order alert email was successfully sent via Resend.';
