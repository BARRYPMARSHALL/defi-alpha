# DeFi Alpha

> Real-time risk-adjusted DeFi yield optimizer across 100+ chains — powered by DeFiLlama data, with the **Alpha Brain** AI advisor.

**Self-hosted.** No Replit, no vendor lock-in. Runs anywhere Node 22 runs (bare metal, VPS, Docker).

---

## What It Does

DeFi Alpha scans **15,000+ liquidity pools** across every major blockchain in real time, calculates a risk-adjusted score for each one, and surfaces the best yield opportunities — so you don't have to spend hours hunting across protocols.

**Scoring formula:** `APY × (TVL / $10M) × (1 − IL risk factor)` — with auto-compound boosts (Beefy/Yearn/Gamma get +10–15%) and sustainability flags (declining APY, low-liquidity rewards, anomalous APYs).

---

## What's New in This Repo

This is a from-scratch fork of the original *DefiAlphaAgent* with a real engineering pass:

| Improvement | What changed |
|---|---|
| **Alpha Brain chat** | The AI advisor tables finally have a backend. `POST /api/chat` answers with live pool data. **LLM mode** (OpenAI) when `OPENAI_API_KEY` is set, otherwise a **local rule-based advisor** that still answers with real data — the feature never dead-ends. |
| **Modular server** | The 1,334-line `routes.ts` is split into route groups (`pools`, `recommend`, `stablecoins`, `twitter`, `chat`, `watchlist`, `health`) + pure lib modules (`scoring`, `filters`, `recommend`, `defillama`, `alphaBrain`). |
| **62 passing tests** | Vitest + supertest: scoring math, filter/sort, recommendation engine, and full API integration with mocked DeFiLlama. `npm test`. |
| **Server-side watchlist** | Watchlist persists across devices via an anonymous token (localStorage-first, server-synced). |
| **Scheduled Twitter** | Daily auto-posts gated behind `TWITTER_AUTO_POST=true` with a `/api/twitter/status` endpoint. |
| **Self-hosting** | Dockerfile, systemd unit (`deploy/defi-alpha.service`), `.env.example`, Replit plugins removed from the build. |
| **Fixes** | `react-icons` brand-icon purge (`SiLinkedin` removed upstream) fixed on the Learn page; health endpoint reports cache state. |

---

## Features

### Dashboard
- **15,000+ pools** fetched live from DeFiLlama, cached 2 min (5-min client refresh)
- **Risk-adjusted scoring** — APY weighted by TVL and impermanent-loss risk
- **Top Recommendations** — curated best opportunities ranked by score
- **Alpha Brain panel** — ask for stablecoin yields, chain picks, auto-compound vaults in plain English
- **Earnings Calculator** — daily/weekly/monthly/yearly projections
- **Sparkline trend charts** — Rising / Stable / Falling momentum
- **Sustainability flags** — declining APY, low reward liquidity, extreme APY warnings
- **Auto-compound detection** — Beefy, Yearn, Gamma, Arrakis, Convex get score boost + badge
- **IL Risk scoring** — real il7d/il14d when available, symbol classification fallback
- **Educational tooltips** — every metric explained inline

### Quick Goal Filters
| Preset | What it does |
|---|---|
| All Pools | Reset to defaults |
| Stable Yield | Stablecoin/lending pools, low IL, $1M+ TVL |
| High APY | 20%+ APY, $500k+ TVL |
| Safe & Sustainable | $10M+ TVL, low IL only |
| Auto-Compound | Beefy/Yearn/auto-compounding pools only |
| Watchlist | Your starred pools |

### Portfolio Builder (`/portfolio`)
- Input investment amount + risk tolerance (Conservative / Balanced / Aggressive)
- Diversifies across chains and protocols (max 2 per chain/project)
- Weights by risk-adjusted score, shows blended APY, gas-adjusted Net APY, projections

---

## Quick Start

```bash
npm install
npm run dev          # dev server with Vite HMR on :5000
npm run check        # typecheck
npm test             # run the 62-test suite
npm run build        # production bundle -> dist/
npm start            # serve production build
```

### Alpha Brain
- **Without a key:** works immediately in *local advisor* mode (deterministic answers over live data).
- **With a key:** `export OPENAI_API_KEY=sk-...` (optionally `OPENAI_MODEL`) → LLM mode with the live dataset injected into the system prompt.

### Twitter auto-posting
```bash
export TWITTER_AUTO_POST=true
export TWITTER_API_KEY=... TWITTER_API_SECRET=...
export TWITTER_ACCESS_TOKEN=... TWITTER_ACCESS_SECRET=...
```
Manual post + preview: `POST /api/twitter/post`, `GET /api/twitter/preview`, `GET /api/twitter/status`.

### Docker
```bash
docker build -t defi-alpha .
docker run -p 5000:5000 --env-file .env defi-alpha
```

### systemd (bare metal)
```bash
sudo cp deploy/defi-alpha.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now defi-alpha
```
Point `EnvironmentFile` at your `.env`.

### Database (optional)
The app is fully functional with in-memory storage (sessions, watchlist, chat persist per-process). Set `DATABASE_URL` (PostgreSQL) and run `npm run db:push` to persist across restarts.

---

## API

| Endpoint | Description |
|---|---|
| `GET /health` | Liveness + cache state |
| `GET /api/pools` | Filtered/sorted scored pools (`minTvl`, `chains`, `minApy`, `lowIlOnly`, `searchQuery`, `sortField`, `sortDirection`, `projectTypes`) |
| `POST /api/refresh` | Force pool cache refresh |
| `GET /api/chains` | Chain list with pool counts + aliases |
| `GET /api/stablecoins` | Stablecoin supply by chain |
| `GET /api/recommend` | Smart picks (`chains`, `minApy`, `riskTolerance`, `userQuery`) |
| `POST /webhook` | Same engine, POST body |
| `POST /api/chat` | Alpha Brain (`message`, `conversationId?`) |
| `GET /api/chat/conversations` · `GET /api/chat/conversations/:id/messages` | Chat history |
| `GET/POST/DELETE /api/watchlist` | Watchlist (header `x-watchlist-token`) |
| `GET /api/twitter/preview` · `POST /api/twitter/post` · `GET /api/twitter/status` | Twitter bot |

---

## Architecture

```
server/
  index.ts            entry (createApp factory + boot)
  routes.ts           mounts route groups, warms cache, starts scheduler
  lib/
    defillama.ts      DeFiLlama fetch + cache (pools, stablecoins)
    scoring.ts        pure: IL risk, risk score, auto-compound detection
    filters.ts        pure: filter/sort, chain aliases, response formatting
    recommend.ts      pure: /api/recommend + /webhook engine
    alphaBrain.ts     chat: OpenAI LLM mode + local advisor fallback
    twitterBot.ts     tweet composition + posting + daily schedule
  routes/             pools · recommend · stablecoins · twitter · chat · watchlist · health
  tests/              62 vitest + supertest cases
shared/schema.ts      drizzle schema + shared types
client/src/           React + shadcn + TanStack Query + wouter
```

---

## Disclaimer

Educational tool, not financial advice. APYs move; verify sustainability and check TVL liquidity before depositing. Always DYOR.
