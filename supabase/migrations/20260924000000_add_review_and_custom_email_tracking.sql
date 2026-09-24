-- Migration: Add review and custom email delivery tracking timestamp columns to public.orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS review_email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS custom_email_sent_at TIMESTAMPTZ;

-- Comments for documentation
COMMENT ON COLUMN public.orders.review_email_sent_at IS 'Timestamp when customer post-delivery review request email was dispatched via Resend.';
COMMENT ON COLUMN public.orders.custom_email_sent_at IS 'Timestamp when a custom administrator message email was dispatched via Resend.';
