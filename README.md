# Market Intelligence Dashboard

A Next.js dashboard for U.S. market intelligence with a command-center style UI. It aggregates Fed policy, Treasury rates, macro indicators, liquidity, market prices and breadth (via Yahoo Finance), and optional AI briefings. Missing data sources degrade gracefully with labeled placeholders.

**Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts.

---

## Prerequisites

- **Node.js 18.18+** (or any version compatible with Next.js 14)
- **npm** (or use `pnpm` / `yarn` if you prefer — lockfile is not committed here)

---

## Quick start

```bash
cd market-intelligence-dashboard
npm install
cp .env.example .env.local
```

Edit `.env.local` with at least **`FRED_API_KEY`** (see below), then:

```bash
npm run dev
```

Open [http://localhost:4040](http://localhost:4040).

---

## API keys and data access

Secrets belong in **`.env.local`** only. That file is gitignored. Next.js loads it automatically in development and production builds on your machine; **never** put API keys in `NEXT_PUBLIC_*` variables (those are exposed to the browser). This app keeps FRED and Anthropic usage on the **server** (API routes).

### Summary

| Variable | Required? | Purpose |
|----------|-----------|---------|
| `FRED_API_KEY` | **Strongly recommended** | Fed, Treasury, liquidity, macro modules (official series from FRED) |
| `ANTHROPIC_API_KEY` | Optional | Executive briefing (`/api/ai/summary`) and module explanations (`/api/ai/explain`) |
| `YAHOO_FINANCE_ENABLED` | Optional toggle | Default `true`. Set to `false` to turn off Yahoo-based market data (no key needed) |

**Practical setups**

- **Minimum useful:** `FRED_API_KEY` only → macro/rates/Fed data live; Yahoo market data on by default; AI sections show placeholders.
- **Full:** `FRED_API_KEY` + `ANTHROPIC_API_KEY` → adds Claude-powered summaries and explanations.

### 1. FRED API key (free)

Used by the dashboard for Fed policy, Treasury curve, liquidity, and macro release modules.

1. Create a free account: [FRED account login](https://fredaccount.stlouisfed.org/login/secure/)
2. Go to **My Account → API Keys → Request API Key**
3. Documentation: [FRED API key help](https://fred.stlouisfed.org/docs/api/api_key.html)

In `.env.local`:

```bash
FRED_API_KEY=your_fred_key_here
```

Without this key, those modules use explicit placeholder data; the UI shows a data-quality banner.

### 2. Anthropic API key (optional, paid usage)

Used only if you want AI-generated briefings and explanations.

1. Sign up at [Anthropic Console](https://console.anthropic.com)
2. **API Keys → Create Key**
3. Add to `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Billing is usage-based. If the key is missing, AI routes return a clear error JSON and the UI stays usable.

### 3. Yahoo Finance (no API key)

Market prices, breadth, flows, and watchlist use an unofficial Yahoo Finance path on the **server**. There is no key. To disable this layer:

```bash
YAHOO_FINANCE_ENABLED=false
```

### 4. Variables in `.env.example` not wired in code yet

`BLS_API_KEY` and `POLYGON_API_KEY` are placeholders for possible future direct integrations. **The current codebase does not read them.** Labor and CPI-style series are pulled via **FRED** today. Options-style modules still show placeholders until a provider is integrated.

---

## Data sources (by module)

| Area | Source | API key |
|------|--------|---------|
| Fed policy, Treasury, liquidity, macro | [FRED](https://fred.stlouisfed.org) | `FRED_API_KEY` |
| Market prices, breadth, flows, watchlist | Yahoo Finance (unofficial, server-side) | None |
| AI summary / explain | [Anthropic](https://www.anthropic.com) | `ANTHROPIC_API_KEY` |
| Options, retail flow, some internals | Placeholders / inferred | Premium feeds not bundled |

Caching uses fixed TTLs in `src/lib/cache/server.ts` (in-process; no Redis in this repo).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port **4040** |
| `npm run build` | Production build |
| `npm run start` | Production server on port **4040** |
| `npm run lint` | ESLint |
| `npm run type-check` | `tsc --noEmit` |

---

## Project layout (high level)

- `src/app/` — App Router pages and API routes (`/api/dashboard`, `/api/ai/*`, etc.)
- `src/lib/features/` — Module builders (Fed, Treasury, macro, liquidity, market)
- `src/lib/sources/` — FRED client and related types
- `src/components/` — Dashboard UI

---

## Disclaimer

Signals marked inferred or unavailable are low confidence or not connected to live premium feeds. This project is for information and analysis only, not investment advice.
