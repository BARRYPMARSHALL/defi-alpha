# DeFi Alpha Agent

> Real-time risk-adjusted DeFi yield optimizer across 100+ chains — powered by DeFiLlama data.

![DeFi Alpha Agent](attached_assets/33_1775959909661.png)

**Live App:** [defialphaagent.replit.app](https://defialphaagent.replit.app)  
**Twitter:** [@DefiAlphaAgent](https://twitter.com/DefiAlphaAgent)

---

## What It Does

DeFi Alpha Agent scans **18,000+ liquidity pools** across every major blockchain in real time, calculates a risk-adjusted score for each one, and surfaces the best yield opportunities — so you don't have to spend hours hunting across protocols.

No wallet connection required. No subscriptions. Just alpha.

---

## Features

### Dashboard
- **18,000+ pools** fetched live from DeFiLlama, refreshed every 5 minutes
- **Risk-adjusted scoring** — `APY × (TVL / $10M) × (1 − IL risk factor)`
- **Top Recommendations** — curated best opportunities ranked by score
- **Earnings Calculator** — input your investment amount, see daily/weekly/monthly/yearly projections
- **Sparkline trend charts** — Rising / Stable / Falling momentum per pool
- **Sustainability flags** — warns when APY is declining >20% in 7 days or reward liquidity is low
- **Auto-compound detection** — Beefy, Yearn, Gamma, Arrakis, Convex and more get a 10% score boost + badge
- **IL Risk scoring** — uses actual il7d/il14d data from DeFiLlama when available, falls back to symbol classification
- **Educational tooltips** — every metric explained inline for DeFi newcomers

### Quick Goal Filters
One-click presets that map user intent to filter combinations:

| Preset | What it does |
|---|---|
| All Pools | Reset to defaults |
| Stable Yield | Stablecoin/lending pools, low IL, $1M+ TVL |
| High APY | 20%+ APY, $500k+ TVL |
| Safe & Sustainable | $10M+ TVL, low IL only |
| Auto-Compound | Beefy/Yearn/auto-compounding pools only |
| Watchlist | Your starred pools |

### Watchlist
- Star any pool to save it — persists in browser storage, no account needed
- Watchlist chip shows count badge
- Empty state guides you to start starring pools

### Portfolio Builder (`/portfolio`)
- Input your investment amount and risk tolerance (Conservative / Balanced / Aggressive)
- Algorithm selects and diversifies across chains and protocols (max 2 per chain, max 2 per project)
- Weights allocations by risk-adjusted score
- Shows blended APY, Net APY (after gas), and daily/monthly/yearly projections

| Profile | Min TVL | APY Range | Stablecoin Mix |
|---|---|---|---|
| Conservative | $50M | 3–25% | ~70% |
| Balanced | $10M | 5–60% | ~40% |
| Aggressive | $1M | 15–500% | ~15% |

### Stablecoin Yield Leaderboard (`/stablecoins`)
- Top 50 stablecoin pools ranked by APY
- Filters: APY < 1000% and TVL ≥ $100k (removes outliers)
- Chain filter chips, full-text search by project/symbol/chain
- Summary stats: pool count, average APY, top APY, total stable TVL

### Analytics (`/analytics`)
Full market-wide dashboard with:
- APY Distribution histogram
- TVL by Chain (top 10)
- Risk Distribution pie chart
- Top Protocols by TVL
- Top 5 Gainers / Losers (7D APY change)
- Stablecoin vs Volatile pool comparison
- Auto-Compound vs Manual comparison
- Average APY by Chain
- Stablecoins by Chain (supply concentration from DeFiLlama stablecoins API)
- Market-Wide APY Trend (1D / 7D / 30D averages)

### Learn DeFi (`/learn`)
Structured beginner-to-advanced course covering:
- What is DeFi, liquidity pools, APY vs APR
- Impermanent loss, risk management
- How to read the dashboard and act on recommendations

### Mobile-First
Pools render as tap-friendly cards on mobile instead of a horizontal-scroll table — full feature parity with desktop.

### Gas Cost Awareness
Per-chain gas estimates baked into Net APY:

| Chain | Est. Gas/tx |
|---|---|
| Ethereum | ~$25 (high) |
| Arbitrum / Base / Optimism | ~$0.30–0.50 |
| Polygon / BSC | ~$0.05–0.10 |
| Solana / Fantom | ~$0.01 |

Manual pools assume 12 tx/year (claim + reinvest). Auto-compound assumes 2 tx/year.

### Twitter Bot (`@DefiAlphaAgent`)
Automated daily post of "Top 3 Alpha Finds" with risk-adjusted scores, TVL, and auto-compound status.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Routing | Wouter |
| State / Data | TanStack React Query |
| Styling | Tailwind CSS + shadcn/ui + Radix UI |
| Charts | Recharts |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL via Drizzle ORM |
| Data Source | DeFiLlama Yields API (free, no key required) |
| Analytics | Google Analytics (G-CD6MTB739E) |
| Twitter | twitter-api-v2 (OAuth 1.0a) |

---

## Project Structure

```
├── client/
│   └── src/
│       ├── components/
│       │   ├── Header.tsx               # Navigation + dark mode toggle
│       │   ├── PoolsTable.tsx           # Desktop pools table with sorting
│       │   ├── PoolsMobileCards.tsx     # Mobile card view
│       │   ├── QuickGoalFilters.tsx     # Preset filter chips
│       │   ├── FiltersBar.tsx           # Chain/APY/TVL/IL filter controls
│       │   ├── Recommendations.tsx      # Top scored pools section
│       │   └── EarningsCalculator.tsx   # Investment return estimator
│       ├── pages/
│       │   ├── dashboard.tsx            # Main yield dashboard
│       │   ├── portfolio.tsx            # Portfolio builder
│       │   ├── stablecoins.tsx          # Stablecoin leaderboard
│       │   ├── analytics.tsx            # Market analytics charts
│       │   ├── learn.tsx                # DeFi education course
│       │   └── faq.tsx                  # FAQ page
│       ├── hooks/
│       │   └── use-watchlist.ts         # localStorage watchlist hook
│       └── lib/
│           ├── gas-costs.ts             # Per-chain gas estimates
│           └── theme-context.tsx        # Dark/light mode context
├── server/
│   ├── index.ts                         # Express server entry
│   ├── routes.ts                        # API endpoints + Twitter bot
│   └── storage.ts                       # DB interface (Drizzle ORM)
└── shared/
    └── schema.ts                        # Drizzle schema + Zod types
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/pools` | Pools with filters, sort, risk scores |
| GET | `/api/stablecoins` | Stablecoin supply by chain (10-min cache) |
| GET | `/api/twitter/preview` | Preview next scheduled tweet |
| POST | `/api/twitter/post` | Manually trigger a tweet |

### `/api/pools` Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `chain` | string | `all` | Filter by chain name |
| `minApy` | number | `0` | Minimum APY (%) |
| `maxApy` | number | `1000` | Maximum APY (%) |
| `minTvl` | number | `0` | Minimum TVL (USD) |
| `ilRisk` | string | `all` | `low`, `medium`, `high`, or `all` |
| `stablecoin` | boolean | `false` | Stablecoin pools only |
| `sortBy` | string | `score` | `apy`, `tvl`, `score` |
| `sortDir` | string | `desc` | `asc` or `desc` |

---

## Risk Scoring Algorithm

```
score = APY × (TVL / 10,000,000) × (1 − ilRiskFactor)
```

**IL Risk Factors:**
- `low` (stable pairs, lending): 0.1
- `medium` (mixed pairs): 0.3
- `high` (volatile pairs): 0.6

**Bonuses:**
- Auto-compound pools: +10% score boost
- Enhanced IL data from DeFiLlama (`il7d` / `il14d`) used when available

**Sustainability Flags:**
- `apyDeclining` — APY dropped >20% in the last 7 days
- `lowLiquidityRewards` — high reward ratio with low TVL/volume

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database

### Environment Variables

```env
DATABASE_URL=postgresql://...
SESSION_SECRET=your-session-secret

# Optional: Twitter Bot
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...
```

### Install & Run

```bash
npm install
npm run db:push      # Apply database schema
npm run dev          # Start dev server (port 5000)
```

### Production Build

```bash
npm run build        # Vite build + esbuild server bundle
npm start            # Run production server
```

---

## Twitter Bot Setup

1. Create a project at [developer.twitter.com](https://developer.twitter.com)
2. Enable **Read and Write** permissions
3. Generate all 4 credentials under OAuth 1.0a
4. Add them as environment secrets
5. Uncomment `startDailySchedule()` in `server/routes.ts`

The bot posts daily at a fixed interval with the top 3 risk-adjusted pools, filtering out any APY > 1000% and TVL < $1M.

---

## Caching Strategy

| Data | Cache TTL |
|---|---|
| Pool data (DeFiLlama) | 2 minutes (server in-memory) |
| Stablecoin data | 10 minutes (server in-memory) |
| Filter/sort preferences | Permanent (localStorage) |
| Watchlist | Permanent (localStorage) |
| Earnings calculator state | Permanent (localStorage) |

---

## Monetization

This app is free to use. Revenue model:
- **Affiliate banners** — links to protocols featured in recommendations
- **Sponsored pools** — protocol partnerships for featured placement
- **Donations** — direct support link

No subscriptions. No paywalls. No wallet required.

---

## Roadmap

- [ ] Email digest (weekly top picks)
- [ ] Telegram bot alerts
- [ ] Push notifications for APY changes
- [ ] Read-only wallet portfolio preview
- [ ] Public REST API with rate limiting
- [ ] Protocol safety/audit scoring integration

---

## Data Source

All yield data is sourced from **[DeFiLlama](https://defillama.com)** — the largest open DeFi data aggregator. No API key required.

- Yields API: `https://yields.llama.fi/pools`
- Stablecoins API: `https://stablecoins.llama.fi/stablecoins`

DeFi Alpha Agent does not store or redistribute raw DeFiLlama data. All data is fetched live and processed server-side.

---

## Disclaimer

This tool is for **informational purposes only**. Nothing on this site constitutes financial advice. DeFi carries significant risk including smart contract exploits, impermanent loss, and total loss of funds. Always do your own research.

---

## License

MIT
