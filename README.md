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

Open [http://localhost:3001](http://localhost:3001).

**Port note:** `npm run dev` / `npm start` set **`PORT=3001`** before Next starts (see `scripts/next-with-default-port.mjs`). Plain **`npx next dev`** does not use that script and defaults to **3000** unless you run **`PORT=3001 npx next dev`** (or pass **`-p 3001`**).

---

## API keys and data access

Secrets belong in **`.env.local`** only. That file is gitignored. Next.js loads it automatically in development and production builds on your machine; **never** put API keys in `NEXT_PUBLIC_*` variables (those are exposed to the browser). This app keeps FRED and Anthropic usage on the **server** (API routes).

### Summary

| Variable | Required? | Purpose |
|----------|-----------|---------|
| `FRED_API_KEY` | **Strongly recommended** | Fed, Treasury, liquidity, macro modules (official series from FRED) |
| `FRED_MAX_CONCURRENT` / `FRED_BATCH_GAP_MS` | Optional | Cap concurrent FRED requests per module batch (default **6** / **40** ms) to reduce **502** from their gateway |
| `FRED_FETCH_ATTEMPTS` / `FRED_RETRY_BASE_MS` | Optional | Retries on transient **502/503/504/429** (defaults **3** / **400** ms) |
| `ANTHROPIC_API_KEY` | Optional | Executive briefing (`/api/ai/summary`) and module explanations (`/api/ai/explain`) |
| `YAHOO_FINANCE_ENABLED` | Optional toggle | Default `true`. Set to `false` to turn off Yahoo-based market data (no key needed) |
| `YAHOO_OPTIONS_SYMBOL` | Optional | Override Yahoo options underlying (e.g. `^GSPC` if `^SPX` returns 401) |
| `YAHOO_OPTIONS_AFTER_MARKET_MS` | Optional | Pause before options after chart batch (default **0**; try **2500–4000** if options **429**) |
| `YAHOO_OPTIONS_MAX_EXPIRATIONS` | Optional | Expiration pages merged (default **1**; raise only if Yahoo allows) |
| `YAHOO_OPTIONS_REQUEST_GAP_MS` | Optional | Pause between option `?date=` calls (default **200** ms) |
| `YAHOO_OPTIONS_HOST` | Optional | `query1` or `query2` only — **half** the requests per page vs both |
| `YAHOO_OPTIONS_429_FALLBACK_GAP_MS` | Optional | Extra wait before trying `^GSPC` after `^SPX` **429** (default **12000**) |
| `YAHOO_MAX_CONCURRENT` | Optional | Max **parallel** Yahoo **chart** (v8) requests per batch (default **10**) |
| `YAHOO_CHART_GAP_MS` | Optional | Pause between chart batches for quotes + sparklines (default **50** ms) |
| `POLYGON_API_KEY` | Optional | Polygon **I:SPX** option snapshot when `OPTIONS_CHAIN_SOURCE` is `polygon` or `auto` and this key is set |
| `OPTIONS_CHAIN_SOURCE` | Optional | `yahoo` / `yfinance` / `yfin` (default) \| `polygon` \| `auto`. Chooses SPX options backend; see below |

**Practical setups**

- **Minimum useful:** `FRED_API_KEY` only → macro/rates/Fed data live; Yahoo market data on by default; AI sections show placeholders.
- **Full:** `FRED_API_KEY` + `ANTHROPIC_API_KEY` → adds Claude-powered summaries and explanations.
- **Options structure:** **Default is Yahoo** **`^SPX`** (unset `OPTIONS_CHAIN_SOURCE` or set `yahoo` / `yfinance` / `yfin`) so a non-entitled `POLYGON_API_KEY` does not block options. Use **`OPTIONS_CHAIN_SOURCE=auto`** to try Polygon first when a key is set, then fall back to Yahoo on errors (e.g. 403). Use **`polygon`** for Polygon only.

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

Market prices, breadth, flows, and watchlist use an unofficial Yahoo Finance path on the **server**. There is no key. The **options module** uses Yahoo’s v7 options API (browser-like headers; **query2** then **query1** unless **`YAHOO_OPTIONS_HOST`** is set). By default it does **not** wait after the chart batch (fast load); if you see options **429**, set **`YAHOO_OPTIONS_AFTER_MARKET_MS`** (e.g. `3000`). It **retries 429** with backoff, defaults to **one** expiration page, and **serves the last successful chain from cache** when a refresh fails. It tries **`^SPX`** then **`^GSPC`** with a longer gap only if the first call returned **429**.

**Why options still 429:** Yahoo limits **all** traffic from your IP. If it persists, add **`YAHOO_OPTIONS_AFTER_MARKET_MS`**, **`YAHOO_OPTIONS_HOST=query1`**, or **`YAHOO_OPTIONS_SYMBOL=^GSPC`**.

**Why options sometimes showed 429 first:** the **options** request runs **after** dozens of **chart** requests on the same load; the limiter often trips on that next call. Chart batching uses **`YAHOO_MAX_CONCURRENT`** / **`YAHOO_CHART_GAP_MS`**.

To disable Yahoo entirely:

```bash
YAHOO_FINANCE_ENABLED=false
```

### 4. SPX options chain: `OPTIONS_CHAIN_SOURCE` + Polygon (optional)

The dashboard derives put/call walls and heuristic gamma fields from a **cached** chain (~5 minutes, see `TTL.OPTIONS_STRUCTURE`). Pick the backend with **`OPTIONS_CHAIN_SOURCE`**:

| Value | Behavior |
|-------|----------|
| **`yahoo`** / **`yfinance`** / **`yfin`** (**default** if unset) | Always Yahoo **`^SPX`** — Polygon key is ignored for this module |
| `auto` | If `POLYGON_API_KEY` is set, try Polygon **I:SPX** first; on failure, use Yahoo **`^SPX`**. If no key, Yahoo only |
| `polygon` | Polygon **I:SPX** only (requires entitled `POLYGON_API_KEY`; no Yahoo fallback) |

```bash
# Explicit Yahoo / yfinance (optional — same as leaving OPTIONS_CHAIN_SOURCE unset)
OPTIONS_CHAIN_SOURCE=yfinance

# Try Polygon first, fall back to Yahoo if Polygon errors
OPTIONS_CHAIN_SOURCE=auto
```

**Polygon:** sign up at [Polygon.io](https://polygon.io), enable **options** access for your plan, then:

```bash
POLYGON_API_KEY=your_polygon_key_here
```

This is **not** a full dealer GEX engine; the options card shows source caveats for whichever provider is active.

### 5. BLS API (not read by code yet)

**`BLS_API_KEY`** is reserved for a possible future direct BLS integration. Labor and CPI-style series are pulled via **FRED** today.

---

## Data sources (by module)

| Area | Source | API key |
|------|--------|---------|
| Fed policy, Treasury, liquidity, macro | [FRED](https://fred.stlouisfed.org) | `FRED_API_KEY` |
| Market prices, breadth, flows, watchlist | Yahoo Finance (unofficial, server-side) | None |
| AI summary / explain | [Anthropic](https://www.anthropic.com) | `ANTHROPIC_API_KEY` |
| SPX options structure (walls, heuristic gamma) | [Polygon.io](https://polygon.io) **I:SPX** **or** Yahoo **`^SPX`** (see `OPTIONS_CHAIN_SOURCE`) | `POLYGON_API_KEY` optional; Yahoo needs no key |
| Retail flow, some internals | Placeholders / inferred | Premium feeds not bundled |

Caching uses fixed TTLs in `src/lib/cache/server.ts` (in-process; no Redis in this repo).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port **3001** |
| `npm run build` | Production build |
| `npm run start` | Production server on port **3001** |
| `npm run lint` | ESLint |
| `npm run type-check` | `tsc --noEmit` |

---

## Project layout (high level)

- `src/app/` — App Router pages and API routes (`/api/dashboard`, `/api/ai/*`, etc.)
- `src/lib/features/` — Module builders (Fed, Treasury, macro, liquidity, market)
- `src/lib/sources/` — FRED, Yahoo, Polygon options snapshot, and related types
- `src/components/` — Dashboard UI

---

## Disclaimer

Signals marked inferred or unavailable are low confidence or not connected to live premium feeds. This project is for information and analysis only, not investment advice.
