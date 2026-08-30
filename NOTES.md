# TENDER Engineering Notes

## Production Infrastructure & Endpoints

### Backend API
- **Live Endpoint**: `https://tender-api-jpw2.onrender.com`
- **Health Check**: `https://tender-api-jpw2.onrender.com/health`
- **Hosting Environment**: Render (Paid Tier)
- **Availability**: Always-on, persistent (no cold starts / sleep mode disabled)

### Network & Settlement
- **Solana Cluster**: `mainnet-beta`
- **Jupiter Aggregator API**: `https://quote-api.jup.ag/v6`
- **Frontend Target**: Vercel
- **Database**: PostgreSQL (Migrations tracked in `backend/db/migrations/`)
