# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-27

### Added

- Next.js 14 (App Router) dashboard with Tailwind CSS and `react-grid-layout`.
- **Fed / policy**, **Treasury**, **macro**, **liquidity**, **breadth**, **flows**, **options** (SPX chain via Yahoo and/or Polygon), **internals** proxy module.
- Progressive loading: `/api/dashboard/core`, `/options`, `/sparklines`; optional AI briefing (`/api/ai/summary`).
- Regime engine, alerts, data-quality / trust labels on metrics.
- FRED adapter with batching and retries; Yahoo quotes/history via `yahoo-finance2`; Yahoo options on **^SPX** with ingest fixes and optional Polygon chain.
- In-process TTL cache with stale fallback; circuit breakers for Yahoo traffic.
- Vitest test suite; MIT license and community docs (this changelog, contributing, security, CoC).

<!-- After publishing: add release link, e.g. [1.0.0]: https://github.com/OWNER/REPO/releases/tag/v1.0.0 -->
