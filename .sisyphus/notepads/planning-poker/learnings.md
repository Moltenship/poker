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

## [2026-03-27 19:02] Task: T6

### Session Management with convex-helpers
- `convex-helpers` installs cleanly in this repo only with `--legacy-peer-deps` because the package declares an optional `typescript@^5.5` peer while the project is already on TypeScript 6.0.2.
- The real `customMutation` / `customQuery` API in `convex-helpers/server/customFunctions` matches the middleware pattern from the task: wrapper args are merged into validation, `input()` can strip `sessionId` from handler args, and returned `ctx` fields are added to the Convex handler context.
- `convex-test` can exercise a wrapped custom mutation directly with `t.mutation(customMutationRef, args)` as long as the modules map includes `"../_generated/api"`.
- Convex React hooks use tuple-style rest args, so local wrapper hooks need to build `OptionalRestArgs` / `OptionalRestArgsOrSkip` tuples explicitly for type-safe session injection.
- Installing `convex-helpers` changed the dependency tree enough that `@testing-library/dom` had to be restored explicitly for existing React Testing Library tests to keep passing.
- Adding `"types": ["vitest/globals"]` to the root `tsconfig.json` is required here so test files included in the build graph still pass `tsc -b` and `npm run build`.

## [2026-03-27] Task: T9

- **convex-test module discovery**: The `modules` arg to `convexTest()` must include ALL convex function files, not just `_generated/api`. The correct pattern for tests inside `convex/__tests__/` is `import.meta.glob("../**/*.ts")` — this captures all `*.ts` files in the `convex/` directory including `_generated/`. Passing only `{ "../_generated/api": ... }` causes "Could not find module" errors for any function module (rooms, tasks, etc.) because convex-test resolves the root from `_generated` then looks up function paths like `tasks` in the full map.
- **Named vs namespace import for api**: When using `import.meta.glob` modules, import `{ api }` from `"../_generated/api"` (named export). When using manual modules map, the old code used `import * as api from` which produces `api.api.xxx` double prefix. With named `{ api }` import, refs are simply `api.tasks.addTask`.
- **importTasks as plain mutation**: `importTasks` is a plain `mutation` (not `sessionMutation`) because it will be called from a Convex action in T11 (Jira import). Actions run server-side without a browser session, so wrapping with sessionMutation would require a dummy sessionId.
- **Upsert by jiraKey**: The `by_room_jira_key` index on `["roomId", "jiraKey"]` enables O(1) lookup for upsert. Since `jiraKey` is optional in the schema, the index only applies to documents where jiraKey is defined — which is all imported tasks. Query with `.withIndex("by_room_jira_key", q => q.eq("roomId", id).eq("jiraKey", key)).unique()` returns null for missing docs.
- **deleteTask guards**: Throwing `"Cannot delete imported tasks"` when `!task.isManual` provides a clean contract. Manual tasks (created via `addTask`) have `isManual: true`; imported tasks have `isManual: false`.
- **Pre-existing test failures**: `rooms.test.ts` and `participants.test.ts` were already broken before T9 (wrong modules map pattern + `api.api.xxx` double-prefix for participants). These are 13 pre-existing failures, not regressions from T9.

## [2026-03-27] Task: T7

- **convex-test moduleCache path bug**: The `moduleCache` in convex-test uses regex `/\.[^.]+$/` to strip extensions. Paths starting with `../` (e.g. `"../_generated/api"`, `"../rooms"`) both get mangled to `"."` because the regex matches from the second dot in `".."`, consuming `"/_generated/api"` as a "non-dot sequence after dot". The fix: use `"./`-prefixed paths with `.js` extension — e.g. `"./_generated/api.js"` and `"./rooms.js"`. These strip correctly to `"./_generated/api"` and `"./rooms"`, prefix is computed as `"./"`, and lookup `"./rooms"` succeeds.
- **Correct modules map pattern for __tests__/ subdirectory**:
  ```typescript
  const modules = {
    "./_generated/api.js": () => Promise.resolve({ default: api }),
    "./rooms.js": () => Promise.resolve(rooms),
  };
  ```
  The keys use `./`-relative paths with `.js` extension — NOT `../`-relative paths without extension.
- **sessionMutation/sessionQuery arg injection**: Handler receives `ctx.sessionId` (stripped from args by wrapper). The test must pass `sessionId` as a top-level arg: `t.mutation(api.api.rooms.createRoom, { sessionId: "...", name: "...", ... })`.
- **api.api.rooms.xxx double-prefix**: When importing `import * as api from "../_generated/api"`, the named `api` export (= `anyApi`) lives at `api.api`. Function refs must use `api.api.rooms.createRoom`, not `api.rooms.createRoom`.
- **nanoid(8)** generates 8-char URL-safe strings matching `/^[A-Za-z0-9_-]{8}$/`.

## [2026-03-27] Task: T8 — Participant Service

- **convex-test direct function import pattern**: When tests live in `convex/__tests__/`, the `api.api.xxx` double-prefix pattern breaks at runtime for `sessionMutation`/`sessionQuery` wrappers. The working pattern is to import functions directly and pass them to `t.mutation()`/`t.query()`:
  ```typescript
  import { joinRoom, leaveRoom, getParticipants } from "../participants";
  await t.mutation(joinRoom, { sessionId: "...", roomId, displayName: "Alice" });
  ```
- **sessionMutation test arg injection**: `sessionMutation` strips `sessionId` from the handler args and places it on `ctx.sessionId`. Tests must pass `sessionId` as a top-level arg alongside the declared mutation args.
- **by_room_session index for deduplication**: `joinRoom` uses `.withIndex("by_room_session", q => q.eq("roomId", ...).eq("sessionId", ...)).unique()` to find an existing participant before inserting. This guarantees idempotent joins — same session rejoining gets the same document id.
- **takeoverSession pattern**: Validates the participant exists (`db.get(participantId)`) then patches `sessionId` to the caller's `ctx.sessionId`. The old session effectively loses ownership. No separate claim-token needed since `ctx.sessionId` is injected by the session middleware and cannot be spoofed.
- **Presence via isConnected flag**: Participants are never deleted. `leaveRoom` sets `isConnected: false`; `joinRoom` and `heartbeat` set it back to `true`. `listRoomParticipants` exposes all (for facilitators); `getParticipants` can filter to connected-only.
- **stderr "Convex functions should not directly call other Convex functions"**: These are expected warnings from convex-test when using direct function references. They do not cause test failures and are a known limitation of the test harness — not a production concern.

## [2026-03-27 19:26] Task: T11
Jira Cloud imports fit the existing Convex architecture best as a public mutation that only flips room import state and schedules an internal action; the internal action can then do field discovery, cursor pagination, and call an internal task-upsert mutation without exposing third-party fetches to clients. In this repo, `convex-test` can cover the scheduled Jira flow reliably with mocked `fetch` plus `finishAllScheduledFunctions`, while direct function refs in tests still need explicit module wiring instead of depending on fresh generated API entries.

## [2026-03-27 19:25:15 +04] Task: T10

- **Voting lifecycle shape**: The core Convex flow for planning poker can stay small and explicit: `startVoting` gates lobby → voting, `castVote` upserts by `by_task_participant`, `revealVotes` flips room status, `resetVoting` clears only the current task’s votes, and `advanceToNextTask` increments `currentTaskIndex` then returns the room to `voting`.
- **Vote status contract**: `getVoteStatus` should derive from room participants, not just votes, so reset states still return everyone with `hasVoted: false` instead of an empty list.
- **Convex test harness in this repo**: New tests under `convex/__tests__/` work reliably with `const modules = import.meta.glob("../**/*.ts")` plus direct function imports passed to `t.mutation()` / `t.query()`.
- **Convex serialization gotcha**: Optional fields with value `undefined` are omitted from Convex query results, so tests should assert missing properties rather than expecting `{ field: undefined }` in returned objects.
