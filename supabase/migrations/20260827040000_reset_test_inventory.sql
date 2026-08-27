-- Migration: 20260827040000_reset_test_inventory.sql
-- Description: Reset stock_quantity to 100 for all 25 catalog products
UPDATE public.inventory SET stock_quantity = 100, updated_at = NOW();
