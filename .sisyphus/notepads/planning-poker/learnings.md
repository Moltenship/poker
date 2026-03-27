# Planning Poker — Learnings


## Scaffold Completion (Task 1)

### Key Decisions
- Used `createBrowserRouter` + `RouterProvider` pattern instead of `<BrowserRouter>` wrapper
- Configured path alias `@/` in both `vite.config.ts` and `tsconfig.json`
- Added `concurrently` for parallel dev/backend execution

### Tech Stack Notes
- Node v24.13.1, npm 11.8.0
- React 19.2.4 (latest) with TypeScript 6.0.2
- Vite 8.0.3 with @vitejs/plugin-react
- React Router 7.13.2 (latest v7)

### Config Gotchas
- TypeScript 6.0+ deprecated `baseUrl`, requires `ignoreDeprecations: "6.0"` in tsconfig
- Vite uses ESM, so `vite.config.ts` needs `fileURLToPath` + `import.meta.url` for `__dirname`
- Need `@types/react`, `@types/react-dom`, `@types/node` for strict TS checking
- Add `vite-env.d.ts` with `/// <reference types="vite/client" />` for CSS import type support

### File Structure
```
src/
  main.tsx          # App entry with RouterProvider
  router.tsx        # createBrowserRouter config
  index.css         # Base styles
  components/
    Layout.tsx      # Header + Outlet shell
  pages/
    Home.tsx
    Room.tsx
    History.tsx
    NotFound.tsx
```

### Scripts Configured
- `npm run dev` → concurrently runs frontend + backend
- `npm run dev:frontend` → vite dev server
- `npm run dev:backend` → convex dev (placeholder)
- `npm run build` → tsc + vite build (exit 0 ✓)
- `npm run test` → vitest run

### Build Verification
- TypeScript check: ✓ no errors
- Build output: ✓ dist/ generated (283KB uncompressed, 90KB gzip)
- All routes working: / → Home, /room/:roomCode → Room, /history → History, * → 404

## Tailwind + shadcn/ui Setup (Task 2)

### Key Installation Steps
- Installed `tailwindcss@^3` (NOT v4 — shadcn incompatible with v4)
- Added peer dependencies: `class-variance-authority`, `clsx`, `tailwind-merge`
- shadcn/ui init auto-configured with `--defaults` flag
  - Used Radix component library + Nova preset (Lucide icons + Geist font)
  - Created `components.json` with proper Tailwind + import alias config

### Configuration Files Created
- `postcss.config.js` — tailwindcss + autoprefixer
- `tailwind.config.ts` — typed config with content paths to `./index.html` and `./src/**/*.{ts,tsx}`
- Updated `src/index.css`:
  - `@import "tw-animate-css"` (shadcn animations)
  - `@import "shadcn/tailwind.css"` (shadcn theme)
  - `@import "@fontsource-variable/geist"` (Geist font)
  - `@tailwind` directives
  - CSS custom properties for theme tokens (oklch color space for light/dark modes)

### Component Installation
- shadcn/ui auto-installed `button` during init
- Manually added: `input`, `card`, `dialog`, `select`, `badge`, `separator`, `scroll-area`
- All components in `src/components/ui/` using proper shadcn structure

### Build Verification
- `npm run build` ✓ exit code 0
- Dist output: 30KB gzipped CSS, 90KB gzipped JS
- MinifyCSS warnings about `@theme`, `@utility` directives (from tw-animate-css) are harmless — not build errors

### Theme System
- CSS variables use oklch color space (perceptually uniform)
- Light mode: white background, dark text
- Dark mode (`.dark` class): dark background, light text
- Additional variables: primary, secondary, chart colors, sidebar theme
- Destructive state red defined via oklch

### Integration Notes
- `@fontsource-variable/geist` auto-installed for Geist font
- Import alias `@/` already configured, shadcn honored it in components.json
- PostCSS runs before Tailwind to process imports
- No custom styling needed — shadcn defaults perfectly styled

## [2026-03-27 18:46] Task: T3

### Convex Anonymous Agent Mode
- `npx convex dev --once` requires interactive terminal input for the login prompt by default
- Solution: Use `CONVEX_AGENT_MODE=anonymous` environment variable to skip the login prompt and use local deployment
- This creates a local Convex backend running on http://127.0.0.1:3212 (or similar)
- Perfect for development/testing without cloud deployment

### Schema Index Patterns
- Convex automatically generates database indexes efficiently
- Multiple indexes on same table are cumulative (additive)
- Index naming should be descriptive: `by_<field>` or `by_<field1>_<field2>` patterns work well
- The schema validates field presence and auto-adds timestamps (_creationTime, etc.)

### TypeScript with Convex
- Convex generates types in `convex/_generated/` automatically
- tsconfig.json in convex/ directory can extend the root tsconfig
- The generated types include all table schemas and ID references
- `npx tsc --noEmit` passes cleanly once Convex deployment is set up

## 2025-03-27 Task: T5

### Shared Utilities Implementation (TDD)
- **Files created**: `src/lib/cards.ts`, `src/lib/adf.ts`, `src/lib/average.ts` + comprehensive tests
- **Tests**: 25 tests across 3 test files, all passing
- **Pattern**: Pure utility functions with no external dependencies (except parsing helpers)

### Key Learnings
1. **CardSet type**: Exported type with name and values array. FIBONACCI presets (7 values) and FIBONACCI_EXTENDED (13 values with ?, ☕)
2. **parseCardValue**: Special case for '½' → 0.5 (half-point estimation). Non-numeric cards (?, ☕, empty string) return null
3. **adfToPlainText**: Recursive traversal of ADF nodes (Jira's Document Format). Block nodes get newlines. Returns "(no description)" for null/empty content
4. **calculateAverage**: Returns object with average, numericCount, totalCount. Filters non-numeric votes, handles edge cases (empty, all non-numeric)
5. **findNearestCard**: Finds closest numeric card value. Returns null if card set has no numeric values

### Vitest Config Update
- Updated `vitest.config.ts` to include `src/lib/**/*.test.ts` pattern
- Set environment to "node" for lib tests (required for non-browser utilities)
- Pattern: `environmentMatchGlobs` for environment-specific test directories

### TDD Discipline
- Tests written FIRST (RED phase)
- All implementations follow test specs exactly
- No external libraries used (no @atlaskit/adf-utils)
- Pure functions with no side effects


## [2026-03-27 18:52] Task: T4 — Test Infrastructure

### Vitest + React Testing Library Setup
- **Config**: `vitest.config.ts` with jsdom environment for React tests, node environment for Convex/lib tests
- **Key plugins**: `@vitejs/plugin-react` needed for proper import.meta.glob support and JSX transformation
- **Setup file**: `src/test/setup.ts` imports `@testing-library/jest-dom` for DOM matchers
- **Test utils**: `src/test/utils.tsx` provides `renderWithProviders()` wrapper (currently no providers, but ready for Context/Redux)
- **Path aliases**: Mirrored Vite's `@/src` alias in vitest config for consistent imports

### React Smoke Test
- Simple component render test: `src/test/smoke.test.tsx`
- Verifies React Testing Library integration works end-to-end
- Uses custom `renderWithProviders` + `screen.getByText` + `toBeInTheDocument()`

### Convex-test Integration Challenge & Solution
**Problem**: `convex-test` uses `import.meta.glob()` internally, which is Vite-specific and not available in Node
- Error: "TypeError: (intermediate value).glob is not a function"
- Root cause: convex-test calls `import.meta.glob("../../../convex/**/*.*s")` in moduleCache function

**Solution**: Pass modules object explicitly to `convexTest(schema, modules)`
- Import `convex/_generated/api.js` (generated by Convex codegen)
- Pass as: `{ "../_generated/api": () => Promise.resolve({ default: api }) }`
- This bypasses the glob() call and provides modules directly

**Test structure**: `convex/smoke.test.ts` uses `t.run(async ctx => { })` to access `ctx.db`
- Raw `ctx.db.insert()` and `ctx.db.get()` operations (no mutation functions needed)
- Validates round-trip: insert rooms document, verify fields on retrieval

### Dependencies Installed
- **Testing**: `vitest@^4.1.2` (already present), `@testing-library/react@^16.3.2`, `@testing-library/jest-dom@^6.9.1`
- **User interaction**: `@testing-library/user-event@^latest` (for future interaction tests)
- **Browser environment**: `jsdom` (browser DOM implementation for tests)
- **Convex testing**: `convex-test@0.0.44` (community mock backend)
- **Module globbing**: `glob@latest` (installed but not used in final solution)

### Test Configuration
- **Include pattern**: `src/test/**/*.test.{ts,tsx}`, `convex/**/*.test.ts`, `src/lib/**/*.test.ts`
- **Environment matching**: jsdom for React/UI tests, node for Convex/lib utilities
- **Globals**: true (test, expect, describe available without imports)
- **Setup file**: applies jest-dom matchers globally

### Test Results
- **Total tests**: 27 passing (5 test files)
  - 15 tests: `src/lib/__tests__/` (cards, adf, average utilities)
  - 1 test: Convex smoke test
  - 1 test: React smoke test
  - 10 pre-existing tests (already in codebase)
- **Command**: `npm test` → `vitest run` → exit code 0
- **Evidence saved**: `.sisyphus/evidence/task-4-smoke-tests.txt`

### Next Steps for Future Tests
- Use `renderWithProviders()` for tests that need Context providers (ConvexClientProvider, etc.)
- Add test utilities: `@testing-library/user-event` for interaction testing
- Create helpers for Convex mutation/query testing (currently smoke test uses raw db ops)
- Consider snapshot testing for UI components when stabilized
