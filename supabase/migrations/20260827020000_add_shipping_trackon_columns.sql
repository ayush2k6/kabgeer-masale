-- Migration: Add Trackon shipping integration columns to public.orders & create public.shipments table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS courier_partner TEXT DEFAULT 'Trackon',
ADD COLUMN IF NOT EXISTS shipment_id TEXT,
ADD COLUMN IF NOT EXISTS trackon_awb TEXT,
ADD COLUMN IF NOT EXISTS shipment_status TEXT DEFAULT 'Pending' CHECK (shipment_status IN ('Pending', 'Created', 'Manifested', 'Dispatched', 'In-Transit', 'Out-For-Delivery', 'Delivered', 'Cancelled', 'Failed')),
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS shipment_synced_at TIMESTAMPTZ;

-- Comments for public.orders documentation
COMMENT ON COLUMN public.orders.courier_partner IS 'Courier partner for fulfillment (e.g. Trackon).';
COMMENT ON COLUMN public.orders.shipment_id IS 'Unique shipment reference ID generated during booking.';
COMMENT ON COLUMN public.orders.trackon_awb IS 'Air Waybill (AWB) tracking number assigned by Trackon.';
COMMENT ON COLUMN public.orders.shipment_status IS 'Fulfillment shipment lifecycle status.';
COMMENT ON COLUMN public.orders.shipment_synced_at IS 'Timestamp when shipment booking was successfully processed and synced.';

-- Create public.shipments table for shipment audit logging and event tracking
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    display_order_id TEXT NOT NULL,
    courier_partner TEXT NOT NULL DEFAULT 'Trackon',
    shipment_id TEXT UNIQUE NOT NULL,
    awb_number TEXT UNIQUE NOT NULL,
    shipment_status TEXT NOT NULL DEFAULT 'Created',
    origin_city TEXT DEFAULT 'Lucknow',
    destination_city TEXT NOT NULL,
    destination_pin TEXT NOT NULL,
    weight_grams INT DEFAULT 500,
    tracking_history JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Shipments
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_display_order_id ON public.shipments(display_order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_awb_number ON public.shipments(awb_number);

-- RLS for Shipments
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own shipments" 
    ON public.shipments FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE public.orders.id = public.shipments.order_id 
              AND public.orders.customer_id = auth.uid()
        )
    );
