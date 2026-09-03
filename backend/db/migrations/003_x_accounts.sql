-- Migration 003: X Account Identity Binding & Handle Association

CREATE TABLE IF NOT EXISTS x_accounts (
    wallet_address VARCHAR(64) PRIMARY KEY,
    x_user_id VARCHAR(64) NOT NULL,
    x_username VARCHAR(64) NOT NULL,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_x_accounts_username ON x_accounts(LOWER(x_username));
CREATE INDEX IF NOT EXISTS idx_x_accounts_user_id ON x_accounts(x_user_id);

-- Add nullable columns to existing handles table for backwards compatibility
ALTER TABLE handles ADD COLUMN IF NOT EXISTS x_username VARCHAR(64);
ALTER TABLE handles ADD COLUMN IF NOT EXISTS x_user_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_handles_x_username ON handles(LOWER(x_username));
