-- Migration 006: Add creator, payer, and tx confirmation fields to v2_invoices

ALTER TABLE v2_invoices
    ADD COLUMN IF NOT EXISTS creator_wallet VARCHAR(42),
    ADD COLUMN IF NOT EXISTS creator_handle VARCHAR(64),
    ADD COLUMN IF NOT EXISTS payer_wallet VARCHAR(42),
    ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66),
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_v2_invoices_creator_wallet ON v2_invoices(LOWER(creator_wallet));
CREATE INDEX IF NOT EXISTS idx_v2_invoices_payer_wallet ON v2_invoices(LOWER(payer_wallet));
