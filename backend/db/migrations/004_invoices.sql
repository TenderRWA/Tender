-- Migration: 004_invoices.sql
-- Create invoices table for persistent pay-links and settlement records

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(64) PRIMARY KEY,
  recipient_handle VARCHAR(32) NOT NULL,
  recipient_wallet VARCHAR(64) NOT NULL,
  amount NUMERIC NOT NULL,
  token_mint VARCHAR(64) NOT NULL DEFAULT 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  token_symbol VARCHAR(16) NOT NULL DEFAULT 'USDC',
  memo TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  signature VARCHAR(128),
  payer_wallet VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invoices_recipient_handle ON invoices(recipient_handle);
CREATE INDEX IF NOT EXISTS idx_invoices_recipient_wallet ON invoices(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_expires_at ON invoices(expires_at);
