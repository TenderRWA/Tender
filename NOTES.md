# TENDER Engineering Notes

## Production Infrastructure & Endpoints

### Backend API
- **Live Endpoint**: `https://api.tenderrwa.com`
- **Render Host Direct**: `https://tender-api-jpw2.onrender.com`
- **Health Check**: `https://api.tenderrwa.com/health`
- **Hosting Environment**: Render (Paid Tier)
- **Availability**: Always-on, persistent (zero sleep / no cold starts)

### Network & Settlement
- **Solana Cluster**: `mainnet-beta`
- **Quote Engine**: Dual Provider (Jupiter Swap API V6 + Relay.link API V2)
- **Fee Configuration**: 15 bps on converted volume (`TENDER_FEE_BPS=15`) routed to `2aCStNyta182cUEry72GNNP7R2CcyErGWA8DLQVjjw3D`
- **Frontend Target**: Vercel
- **Database**: PostgreSQL (Supabase pooler / Render migrations)
