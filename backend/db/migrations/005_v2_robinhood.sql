-- Migration 005: TENDER V2 Receive-Side RWA Settlement on Robinhood Chain (EVM Chain ID 4663)
-- Independent chain-specific registry for Robinhood handles, portfolio elections, settlements, and invoices.

CREATE TABLE IF NOT EXISTS v2_handles (
    handle VARCHAR(64) PRIMARY KEY,
    owner_wallet VARCHAR(42) NOT NULL,
    x_user_id VARCHAR(64),
    x_handle VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v2_handles_owner_wallet ON v2_handles(LOWER(owner_wallet));
CREATE INDEX IF NOT EXISTS idx_v2_handles_x_handle ON v2_handles(LOWER(x_handle));

CREATE TABLE IF NOT EXISTS v2_elections (
    id BIGSERIAL PRIMARY KEY,
    handle VARCHAR(64) NOT NULL REFERENCES v2_handles(handle) ON DELETE CASCADE,
    asset_symbol VARCHAR(32) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 18,
    basis_points INTEGER NOT NULL CHECK (basis_points > 0 AND basis_points <= 10000),
    percentage NUMERIC(5, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v2_elections_handle ON v2_elections(handle);

CREATE TABLE IF NOT EXISTS v2_settlements (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(128) UNIQUE,
    tx_hash VARCHAR(66),
    sender_wallet VARCHAR(42) NOT NULL,
    recipient_handle VARCHAR(64) REFERENCES v2_handles(handle) ON DELETE SET NULL,
    recipient_wallet VARCHAR(42) NOT NULL,
    input_token_symbol VARCHAR(32) NOT NULL,
    input_token_address VARCHAR(42) NOT NULL,
    input_amount TEXT NOT NULL,
    output_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    fee_collected_usd NUMERIC(12, 6) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v2_settlements_sender ON v2_settlements(LOWER(sender_wallet));
CREATE INDEX IF NOT EXISTS idx_v2_settlements_recipient ON v2_settlements(LOWER(recipient_wallet));
CREATE INDEX IF NOT EXISTS idx_v2_settlements_handle ON v2_settlements(LOWER(recipient_handle));

CREATE TABLE IF NOT EXISTS v2_invoices (
    id VARCHAR(64) PRIMARY KEY,
    recipient_handle VARCHAR(64) REFERENCES v2_handles(handle) ON DELETE SET NULL,
    recipient_wallet VARCHAR(42) NOT NULL,
    target_amount NUMERIC(18, 6) NOT NULL,
    target_token_symbol VARCHAR(32) NOT NULL DEFAULT 'USDG',
    target_token_address VARCHAR(42),
    memo TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    settlement_id BIGINT REFERENCES v2_settlements(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v2_invoices_recipient_wallet ON v2_invoices(LOWER(recipient_wallet));
CREATE INDEX IF NOT EXISTS idx_v2_invoices_handle ON v2_invoices(LOWER(recipient_handle));

-- Extend pending_settlements to record chain and network ID for bot-staged transactions
ALTER TABLE pending_settlements 
    ADD COLUMN IF NOT EXISTS chain VARCHAR(32) DEFAULT 'robinhood',
    ADD COLUMN IF NOT EXISTS network_id INTEGER DEFAULT 4663;
