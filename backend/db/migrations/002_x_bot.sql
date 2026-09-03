-- Migration 002: X Bot Auth, Cursors & Pending Settlements

CREATE TABLE IF NOT EXISTS x_bot_tokens (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS x_bot_cursors (
    stream VARCHAR(64) PRIMARY KEY,
    last_seen_id VARCHAR(128) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pending_settlements (
    id BIGSERIAL PRIMARY KEY,
    source_ref VARCHAR(128) UNIQUE,
    author_x_id VARCHAR(64),
    author_x_handle VARCHAR(64),
    recipient_handle VARCHAR(64) NOT NULL,
    recipient_wallet VARCHAR(64) NOT NULL,
    input_token VARCHAR(32) NOT NULL DEFAULT 'USDC',
    input_amount NUMERIC(36, 18) NOT NULL,
    portfolio_summary JSONB DEFAULT '{}'::jsonb,
    tweet_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_settlements_source_ref ON pending_settlements(source_ref);
CREATE INDEX IF NOT EXISTS idx_pending_settlements_recipient_handle ON pending_settlements(recipient_handle);
