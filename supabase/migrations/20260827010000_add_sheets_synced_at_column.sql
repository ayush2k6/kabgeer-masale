-- Migration: Add sheets_synced_at timestamp column to public.orders for Google Sheets sync idempotency
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS sheets_synced_at TIMESTAMPTZ;

-- Comment for documentation
COMMENT ON COLUMN public.orders.sheets_synced_at IS 'Timestamp when order row was successfully appended to owner Google Sheet.';
