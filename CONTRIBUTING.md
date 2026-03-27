# Contributing

Thanks for helping improve this project.

## Development setup

1. Fork and clone the repository.
2. `npm install`
3. `cp .env.example .env.local` and add at least **`FRED_API_KEY`** for full macro data (optional for UI-only smoke tests).
4. `npm run dev` — open the URL printed in the terminal (default port **3001**).

## Before starting a large change

Open a GitHub issue first to discuss the approach. This avoids duplicated effort
and ensures the change aligns with the project direction before you invest time in it.
Small fixes (typos, test additions, isolated bug fixes) can go straight to a PR.

## Before opening a pull request

- `npm test` — all tests should pass.
- `npx tsc --noEmit` — no TypeScript errors.
- `npm run lint` — fix new lint issues in files you touch.

Keep PRs **focused** (one concern per PR). Update docs or comments when behavior changes.

## Areas that welcome contributions

- Alert rules — `src/lib/alerts/`
- Formatting utilities — `src/lib/format/`
- Threshold tuning — `src/lib/config/thresholds.ts`
- UI components — `src/components/ui/`
- Data source adapters — `src/lib/sources/`

See **README.md** → Roadmap for larger ideas.

## Running a single test file

```bash
npx vitest run src/lib/features/macro.test.ts
```

## Commit messages

Conventional style is appreciated: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Participating means you agree to uphold it.
