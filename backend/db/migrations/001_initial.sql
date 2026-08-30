-- Initial Schema for TENDER: Non-custodial Receive-side RWA Settlement Rail

CREATE TABLE IF NOT EXISTS handles (
    handle VARCHAR(64) PRIMARY KEY,
    owner_wallet VARCHAR(64) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS handle_elections (
    id BIGSERIAL PRIMARY KEY,
    handle VARCHAR(64) NOT NULL REFERENCES handles(handle) ON DELETE CASCADE,
    asset_symbol VARCHAR(32) NOT NULL,
    asset_mint VARCHAR(64) NOT NULL,
    basis_points INTEGER NOT NULL CHECK (basis_points > 0 AND basis_points <= 10000),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handle_elections_handle ON handle_elections(handle);

CREATE TABLE IF NOT EXISTS settlements (
    id BIGSERIAL PRIMARY KEY,
    signature VARCHAR(128) UNIQUE NOT NULL,
    sender_wallet VARCHAR(64) NOT NULL,
    recipient_handle VARCHAR(64) REFERENCES handles(handle),
    recipient_wallet VARCHAR(64) NOT NULL,
    input_mint VARCHAR(64) NOT NULL,
    input_amount NUMERIC(36, 18) NOT NULL,
    output_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlements_recipient_handle ON settlements(recipient_handle);
CREATE INDEX IF NOT EXISTS idx_settlements_recipient_wallet ON settlements(recipient_wallet);

CREATE TABLE IF NOT EXISTS payroll_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name VARCHAR(128) NOT NULL,
    funder_wallet VARCHAR(64) NOT NULL,
    schedule_cron VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_members (
    id BIGSERIAL PRIMARY KEY,
    roster_id UUID NOT NULL REFERENCES payroll_rosters(id) ON DELETE CASCADE,
    handle VARCHAR(64) NOT NULL,
    wallet_address VARCHAR(64) NOT NULL,
    payment_amount NUMERIC(36, 18) NOT NULL,
    payment_token_mint VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
