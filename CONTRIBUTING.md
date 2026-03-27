# Contributing

Thanks for helping improve this project.

## Development setup

1. Fork and clone the repository.
2. `npm install`
3. `cp .env.example .env.local` and add at least **`FRED_API_KEY`** for full macro data (optional for UI-only smoke tests).
4. `npm run dev` — open the URL printed in the terminal (default port **3001**).

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

## Commit messages

Conventional style is appreciated: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Participating means you agree to uphold it.
