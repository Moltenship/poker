# Planning Poker App

## TL;DR

> **Quick Summary**: Build a real-time planning poker app that imports tasks from Jira Cloud backlog, lets teams vote on estimates with configurable Fibonacci cards, and stores everything in Convex with zero-auth session-based identity.
> 
> **Deliverables**:
> - Full-stack SPA: React + Vite + React Router + Tailwind + shadcn/ui
> - Convex backend: real-time rooms, voting, participant management
> - Jira Cloud integration: readonly import via Convex action proxy
> - Session-based identity with cross-device takeover
> - Configurable card sets, vote averaging, optional hours annotation
> - Vercel deployment
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves + final verification
> **Critical Path**: Scaffold → Convex Schema → Session Mgmt → Voting Engine → Voting UI → Integration → Deploy

---

## Context

### Original Request
Build a planning poker app with Jira backlog import (readonly). No auth — just ask for username. Store client data in localStorage. If user joins from different PC, let them claim an existing identity (old PC gets kicked). Use Convex for DB. Poker cards should be configurable (amount and value). Include optional hours estimation. Show average estimate. Any participant can reveal results — not all votes required. React + React Router frontend (no SSR). Real-time with reconnection handling.

### Interview Summary
**Key Discussions**:
- **Jira**: Cloud instance, API token as Convex server-side env var, Convex action as CORS proxy
- **Cards**: Default Fibonacci (1,2,3,5,8,13,21), configurable per room. Card values are strings (supports "?", "☕")
- **Hours**: Optional annotation per task — separate numeric field alongside card vote
- **Voting**: Full flexibility — change before reveal, reset and re-vote after reveal
- **Reveal**: Any participant can trigger. Not all votes required.
- **Average**: Arithmetic mean of numeric votes. Non-numeric excluded. "N/A" if all non-numeric.
- **Rooms**: Persistent, manual advance between tasks, per-room card config + Jira project config
- **Identity**: localStorage sessionId, display name entry. Returning user can claim existing participant — old session kicked.
- **Stack**: React + Vite + React Router + Tailwind + shadcn/ui + Convex + Vitest
- **Deploy**: Vercel

**Research Findings**:
- **Convex**: `useQuery` auto-subscribes via WebSocket, auto-reconnect built-in, `useConvexConnectionState()` for offline banner, `convex-helpers` for session patterns, `internalAction` for external API calls, `convex-test` for backend testing
- **Jira API**: `POST /rest/api/3/search/jql` (new endpoint, old `/search` being deprecated), cursor-based pagination with `nextPageToken`, Basic Auth header, story points field ID varies per workspace (discover via `GET /rest/api/3/field`), description returns ADF (need simple recursive text extractor), rate limits generous (65k pts/hour)
- **CORS**: Jira blocks browser Basic Auth calls — must proxy via Convex action

### Metis Review
**Identified Gaps** (addressed):
- **Manual task creation**: Added — rooms without Jira config need a way to add tasks
- **Room code format**: Using `nanoid` for short readable codes (8 chars) — shared via link
- **Display name uniqueness**: No enforcement, but show warning if duplicate name in room
- **Session takeover mechanism**: Show participant list → user picks name → confirm → old session kicked with notification
- **Story points field discovery**: `GET /rest/api/3/field` at import time, never hardcode
- **ADF → plain text**: Simple recursive function (~20 lines), no external ADF libraries
- **Votes table separation**: Separate from participants to avoid OCC conflicts
- **Jira action pattern**: `internalAction` (not `action`) — mutation → `ctx.scheduler.runAfter(0, ...)` → internalAction → `ctx.runMutation(internal....)`
- **Deprecated API**: Use `POST /rest/api/3/search/jql`, NOT `/rest/api/3/search`

---

## Work Objectives

### Core Objective
Build a real-time, multi-user planning poker application where teams can import Jira backlog tasks, vote on estimates using configurable card sets, and collaboratively arrive at story point + hours estimates — all with zero authentication friction.

### Concrete Deliverables
- Deployable SPA on Vercel with Convex backend
- Room creation with configurable card sets
- Jira backlog import via Convex action
- Manual task creation (no Jira required)
- Real-time voting with card selection
- Vote reveal with average + distribution
- Optional hours annotation per task
- Cross-device identity with session takeover
- Connection status banner for unreliable networks
- Room history page with past estimates

### Definition of Done
- [ ] `npm run dev` starts both Vite and Convex dev servers
- [ ] `npm test` runs Vitest with all tests passing
- [ ] App deploys to Vercel with `VITE_CONVEX_URL` configured
- [ ] Two browsers on same room: vote in one, see update in other within 1s
- [ ] Jira import fetches tasks from configured project
- [ ] Card set configurable per room
- [ ] Any participant can reveal results
- [ ] Average calculated correctly (numeric only, "N/A" if all non-numeric)

### Must Have
- Real-time vote synchronization across all participants
- Configurable card sets per room (default: Fibonacci)
- Jira backlog import with pagination
- Manual task creation without Jira
- Vote reveal by any participant (not all votes required)
- Average + distribution display on reveal
- Optional hours annotation
- Cross-device session takeover
- Connection status banner
- Persistent rooms with history
- TDD with Vitest + convex-test

### Must NOT Have (Guardrails)
- **No Jira write-back** — import is strictly read-only snapshot
- **No real authentication** — no Clerk, Auth0, OAuth, passwords. Session ID + display name only
- **No custom WebSocket/reconnect logic** — Convex handles all of this natively
- **No SSR/RSC** — pure Vite SPA with React Router client-side routing
- **No timer/countdown** on voting
- **No spectator mode** — all participants are voters
- **No chat/comments** in rooms
- **No export functionality** (CSV, PDF, Slack)
- **No notification sounds**
- **No dark mode toggle** — single theme
- **No drag-and-drop** task reordering
- **No keyboard shortcuts**
- **No emoji reactions / confetti animations** on reveal
- **No user avatars** — display name initials only
- **No permission system** — flat access, any participant can reveal/advance/reset
- **No sprint selection dropdown** — JQL text input is sufficient
- **No task editing after import** — imported tasks are read-only snapshots (manual tasks can be edited)
- **No `"use node"` directive** in Convex functions unless absolutely required
- **No hardcoded `customfield_10016`** — story points field discovered at runtime

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: NO (greenfield project)
- **Automated tests**: YES (TDD — RED → GREEN → REFACTOR)
- **Framework**: Vitest for unit/integration + convex-test for Convex functions + React Testing Library for components
- **TDD Flow**: Every task writes failing tests first, then implements to make them pass

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **Backend/Convex**: Use Bash (vitest + convex-test) — Run tests, assert pass/fail
- **API/Jira**: Use mocked fetch in convex-test — Assert request/response shapes
- **Real-time**: Two test clients — mutate on one, assert on other

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — all independent, start immediately):
├── Task 1: Vite + React + TypeScript + React Router project scaffold [quick]
├── Task 2: Tailwind CSS + shadcn/ui setup + theme tokens [quick]
├── Task 3: Convex project init + full schema definition [quick]
├── Task 4: Vitest + convex-test + React Testing Library infrastructure [quick]
└── Task 5: Shared utilities: card sets, ADF parser, vote average calc [quick]

Wave 2 (Backend Services — after Wave 1, MAX PARALLEL):
├── Task 6: Session management with convex-helpers (depends: 3, 4) [deep]
├── Task 7: Room service: create, get, list (depends: 3, 4, 6) [unspecified-high]
├── Task 8: Participant service: join, leave, presence, takeover (depends: 3, 4, 6) [unspecified-high]
├── Task 9: Task service: CRUD, ordering, hours annotation (depends: 3, 4, 6) [unspecified-high]
├── Task 10: Voting engine: cast, change, reveal, reset, advance (depends: 3, 4, 6, 9) [deep]
└── Task 11: Jira integration: import action, field discovery, pagination (depends: 3, 4, 5, 6, 9) [deep]

Wave 3 (Frontend Pages — after Wave 2, MAX PARALLEL):
├── Task 12: Home page: create room + join room (depends: 1, 2, 7) [visual-engineering]
├── Task 13: Room view layout: sidebar + voting area + participants (depends: 1, 2, 7, 8, 10) [visual-engineering]
├── Task 14: Voting interface: card deck, selection, indicators (depends: 1, 2, 10) [visual-engineering]
├── Task 15: Results panel: reveal, average, distribution, hours (depends: 1, 2, 10) [visual-engineering]
├── Task 16: Jira import modal: project input, JQL, progress, errors (depends: 1, 2, 11) [visual-engineering]
└── Task 17: Room history page: past rooms, estimates (depends: 1, 2, 7) [visual-engineering]

Wave 4 (Integration & Polish — after Wave 3):
├── Task 18: Identity flow: name entry, returning user, session takeover UX (depends: 8, 13) [deep]
├── Task 19: Connection banner + offline/reconnect handling (depends: 13) [quick]
├── Task 20: Manual task creation UI + task list management (depends: 9, 13) [visual-engineering]
└── Task 21: Vercel deployment: config, env vars, build (depends: all) [quick]

Wave FINAL (After ALL tasks — 4 parallel autonomous reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
→ Present consolidated results to user (informational — not a gate)

Critical Path: T1 → T3 → T6 → T10 → T14 → T18 → T21 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 6 (Waves 2 & 3)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 12-17, 18-20 | 1 |
| 2 | — | 12-17, 18-20 | 1 |
| 3 | — | 6-11 | 1 |
| 4 | — | 6-11 | 1 |
| 5 | — | 11 | 1 |
| 6 | 3, 4 | 7-11 | 2 |
| 7 | 3, 4, 6 | 12, 13, 17 | 2 |
| 8 | 3, 4, 6 | 13, 18 | 2 |
| 9 | 3, 4, 6 | 10, 20 | 2 |
| 10 | 3, 4, 6, 9 | 14, 15 | 2 |
| 11 | 3, 4, 5, 6, 9 | 16 | 2 |
| 12 | 1, 2, 7 | — | 3 |
| 13 | 1, 2, 7, 8, 10 | 18, 19, 20 | 3 |
| 14 | 1, 2, 10 | — | 3 |
| 15 | 1, 2, 10 | — | 3 |
| 16 | 1, 2, 11 | — | 3 |
| 17 | 1, 2, 7 | — | 3 |
| 18 | 8, 13 | — | 4 |
| 19 | 13 | — | 4 |
| 20 | 9, 13 | — | 4 |
| 21 | all | F1-F4 | 4 |

### Agent Dispatch Summary

- **Wave 1**: **5** — T1-T5 → `quick`
- **Wave 2**: **6** — T6 → `deep`, T7-T9 → `unspecified-high`, T10-T11 → `deep`
- **Wave 3**: **6** — T12-T17 → `visual-engineering`
- **Wave 4**: **4** — T18 → `deep`, T19 → `quick`, T20 → `visual-engineering`, T21 → `quick`
- **FINAL**: **4** — F1 → `subagent_type: oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Vite + React + TypeScript + React Router Project Scaffold

  **What to do**:
  - Initialize project with `npm create vite@latest . -- --template react-ts`
  - Install React Router: `npm install react-router-dom`
  - Install `concurrently` as a dev dependency: `npm install -D concurrently`
  - Configure TypeScript with strict mode
  - Set up Vite config with path aliases (`@/` → `src/`)
  - Create route structure: `/` (home), `/room/:roomCode` (room), `/history` (room history)
  - Create layout shell component with header + main content area
  - Create placeholder page components for each route
  - Configure combined dev server script in `package.json`:
    - `"dev:frontend": "vite"`
    - `"dev:backend": "convex dev"`
    - `"dev": "concurrently \"npm:dev:frontend\" \"npm:dev:backend\""`
  - Note: `dev:backend` will only work after Task 3 installs Convex. For Task 1 QA, just verify `dev:frontend` (Vite) starts.
  - Verify `npm run dev:frontend` starts and routes work

  **Must NOT do**:
  - No SSR, no loader/action functions from React Router
  - No data fetching in this task — just routing shell
  - No styling (that's Task 2)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard project scaffolding, well-documented, no complex logic
  - **Skills**: []
    - No specialized skills needed for scaffolding

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Tasks 12-20 (all frontend)
  - **Blocked By**: None (can start immediately)

  **References**:

  **External References**:
  - Vite React TS template: `npm create vite@latest` with `--template react-ts`
  - React Router v6 docs: `createBrowserRouter` + `RouterProvider` pattern
  - Vite path alias: `resolve.alias` in `vite.config.ts` + `tsconfig.json` paths

  **WHY Each Reference Matters**:
  - Use `createBrowserRouter` (not `BrowserRouter`) — it's the modern React Router pattern
  - Path aliases (`@/`) prevent `../../../` import hell as project grows

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: Dev server starts and renders home page
    Tool: Bash
    Preconditions: npm install completed
    Steps:
      1. Run `npm run dev:frontend` in background (timeout 10s for startup)
      2. curl http://localhost:5173/ — should return HTML with root div
      3. Run `npm run build` — should succeed with exit code 0
    Expected Result: Dev server starts, build succeeds, no TypeScript errors
    Failure Indicators: Build fails, TS errors, missing routes
    Evidence: .sisyphus/evidence/task-1-dev-server.txt

  Scenario: Combined dev script configured correctly
    Tool: Bash
    Preconditions: npm install completed
    Steps:
      1. Read package.json — verify "dev", "dev:frontend", "dev:backend" scripts exist
      2. Verify "dev" script uses concurrently with both sub-scripts
      3. Run `npm run dev:frontend` — verify Vite starts on port 5173
    Expected Result: Scripts present, Vite starts. Combined "dev" script will work after Task 3 installs Convex.
    Failure Indicators: Missing scripts, concurrently not installed, Vite fails to start
    Evidence: .sisyphus/evidence/task-1-dev-scripts.txt

  Scenario: Routes resolve correctly
    Tool: Playwright
    Preconditions: Dev server running on localhost:5173
    Steps:
      1. Navigate to http://localhost:5173/ — verify page renders (any content)
      2. Navigate to http://localhost:5173/room/test123 — verify page renders
      3. Navigate to http://localhost:5173/history — verify page renders
      4. Navigate to http://localhost:5173/nonexistent — verify 404 or redirect
    Expected Result: All 3 routes render their placeholder content. Invalid route handled.
    Failure Indicators: Blank page, JS errors in console, 404 on valid routes
    Evidence: .sisyphus/evidence/task-1-routes.png
  ```

  **Commit**: YES
  - Message: `infra: scaffold Vite + React + TypeScript + React Router`
  - Files: `package.json, vite.config.ts, tsconfig.json, src/main.tsx, src/App.tsx, src/routes/`
  - Pre-commit: `npm run build`

- [x] 2. Tailwind CSS + shadcn/ui Setup + Theme Tokens

  **What to do**:
  - Install and configure Tailwind CSS v4 (or v3 if shadcn requires it)
  - Install and initialize shadcn/ui: `npx shadcn@latest init`
  - Configure `components.json` for the project
  - Add base shadcn components: Button, Input, Card, Dialog, Select, Badge, Separator
  - Set up CSS custom properties for theme tokens (colors, spacing, radius)
  - Create `src/index.css` with Tailwind directives and custom properties
  - Verify all components render correctly

  **Must NOT do**:
  - No dark mode toggle or theme switcher
  - No custom component library — use shadcn/ui as-is
  - No page layouts (that's other tasks)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard library setup following shadcn docs
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Ensures proper theme token choices and design system setup

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Tasks 12-20 (all frontend)
  - **Blocked By**: None (can start immediately)

  **References**:

  **External References**:
  - shadcn/ui installation: `https://ui.shadcn.com/docs/installation/vite`
  - Tailwind CSS: `https://tailwindcss.com/docs/installation/using-vite`

  **WHY Each Reference Matters**:
  - shadcn/ui has specific Vite installation steps — follow exactly to avoid config issues
  - Theme tokens set the visual foundation for all UI tasks

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: shadcn Button component renders with Tailwind styles
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Create a test page that imports and renders a shadcn Button
      2. Navigate to the page
      3. Assert Button element exists with Tailwind utility classes applied
      4. Screenshot the rendered button
    Expected Result: Button renders with proper styling (not unstyled HTML)
    Failure Indicators: Button renders without styles, Tailwind classes missing, CSS not loading
    Evidence: .sisyphus/evidence/task-2-shadcn-button.png

  Scenario: Build succeeds with Tailwind + shadcn
    Tool: Bash
    Preconditions: All dependencies installed
    Steps:
      1. Run `npm run build`
      2. Check output for CSS bundle (should include Tailwind utilities)
    Expected Result: Build succeeds, CSS is generated with utilities
    Failure Indicators: PostCSS errors, missing Tailwind directives, build failure
    Evidence: .sisyphus/evidence/task-2-build.txt
  ```

  **Commit**: YES
  - Message: `infra: add Tailwind CSS + shadcn/ui + theme tokens`
  - Files: `tailwind.config.ts, postcss.config.js, src/index.css, components.json, src/components/ui/`
  - Pre-commit: `npm run build`

- [x] 3. Convex Project Init + Full Schema Definition

  **What to do**:
  - Install Convex: `npm install convex`
  - Initialize Convex project: `npx convex dev --once` (creates `convex/` directory)
  - Define complete schema in `convex/schema.ts` with ALL tables:
    - **rooms**: name (string), roomCode (string, indexed), cardSet (array of strings), jiraProjectKey (optional string), jiraBaseUrl (optional string), status (union: "lobby" | "voting" | "revealed"), currentTaskIndex (number), createdBy (string = sessionId), createdAt (number). Indexes: `by_code` on roomCode.
    - **participants**: roomId (id→rooms), sessionId (string), displayName (string), isConnected (boolean), joinedAt (number). Indexes: `by_room` on roomId, `by_room_session` on [roomId, sessionId], `by_session` on sessionId.
    - **tasks**: roomId (id→rooms), jiraKey (optional string), title (string), description (optional string), jiraUrl (optional string), order (number), finalEstimate (optional string), hoursEstimate (optional number), isManual (boolean). Indexes: `by_room` on roomId, `by_room_jira_key` on [roomId, jiraKey].
    - **votes**: roomId (id→rooms), taskId (id→tasks), participantId (id→participants), value (optional string), submittedAt (number). Indexes: `by_task` on taskId, `by_task_participant` on [taskId, participantId].
  - Add `VITE_CONVEX_URL` to `.env.local`
  - Verify schema deploys: `npx convex dev --once`

  **Must NOT do**:
  - No Convex functions yet (queries/mutations) — just schema
  - No `"use node"` directive
  - No auth configuration (no Clerk/Auth0)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Schema definition is declarative, following Convex patterns from research
  - **Skills**: []
    - No specialized skills — Convex schema is straightforward

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Tasks 6-11 (all backend services)
  - **Blocked By**: None (can start immediately)

  **References**:

  **External References**:
  - Convex schema docs: `defineSchema`, `defineTable`, `v` validators
  - Convex index docs: `.index("name", ["field1", "field2"])` for compound indexes
  - Convex ID type: `v.id("tableName")` for typed foreign keys

  **WHY Each Reference Matters**:
  - Schema is the foundation — all backend tasks depend on it being correct
  - Index design determines query performance: compound indexes support prefix queries
  - `v.id("rooms")` provides compile-time type safety for foreign keys

  **Acceptance Criteria**:

  ```
  Scenario: Schema deploys to Convex successfully
    Tool: Bash
    Preconditions: Convex CLI installed, project initialized
    Steps:
      1. Run `npx convex dev --once`
      2. Verify output shows "Schema validation complete" or similar success
      3. Verify `convex/_generated/api.ts` and `convex/_generated/dataModel.ts` exist
    Expected Result: Schema deploys without errors, generated types match table definitions
    Failure Indicators: Validation errors, missing tables, index conflicts
    Evidence: .sisyphus/evidence/task-3-schema-deploy.txt

  Scenario: TypeScript types are generated correctly
    Tool: Bash
    Preconditions: Schema deployed
    Steps:
      1. Run `npx tsc --noEmit` to check type correctness
      2. Verify `Doc<"rooms">`, `Doc<"participants">`, `Doc<"tasks">`, `Doc<"votes">` types exist in generated files
    Expected Result: No TS errors, all table types available
    Failure Indicators: Type errors, missing generated types
    Evidence: .sisyphus/evidence/task-3-types.txt
  ```

  **Commit**: YES
  - Message: `infra: initialize Convex project + define full schema`
  - Files: `convex/schema.ts, convex/tsconfig.json, .env.local`
  - Pre-commit: `npx convex dev --once`

- [x] 4. Vitest + convex-test + React Testing Library Infrastructure

  **What to do**:
  - Install test dependencies: `npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom convex-test`
  - Create `vitest.config.ts` with jsdom environment, path aliases matching vite.config
  - Create `src/test/setup.ts` with `@testing-library/jest-dom` matchers
  - Create `src/test/utils.ts` with custom render function (wraps with providers)
  - Create `convex/test.setup.ts` for convex-test configuration
  - Write one smoke test for each environment:
    - `src/test/smoke.test.tsx`: Renders a React component, asserts DOM
    - `convex/smoke.test.ts`: Creates a `convex-test` context with the schema, inserts a document into the "rooms" table using `t.run(async (ctx) => { ... })`, reads it back, and asserts fields match. Does NOT call any query/mutation function (none exist yet) — uses raw `ctx.db.insert()` and `ctx.db.get()` to validate schema + convex-test wiring.
  - Add `"test"` script to package.json: `vitest run`
  - Verify `npm test` passes with both smoke tests

  **Must NOT do**:
  - No feature tests — just infrastructure + smoke tests
  - No E2E test setup (Playwright is used ad-hoc in QA scenarios)
  - No coverage reports configuration

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard test infrastructure setup following Vitest + convex-test docs
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: Tasks 6-11 (all backend services need test infra)
  - **Blocked By**: None (can start immediately)

  **References**:

  **External References**:
  - Vitest config: `https://vitest.dev/config/` — environment, globals, setupFiles
  - convex-test: `https://docs.convex.dev/testing` — `ConvexTestingHelper`, test schema, mock functions
  - React Testing Library: `https://testing-library.com/docs/react-testing-library/setup`

  **WHY Each Reference Matters**:
  - Vitest config must mirror Vite config (path aliases, environment) for tests to resolve imports
  - convex-test provides in-memory Convex for testing mutations/queries without a running backend
  - RTL setup file registers jest-dom matchers globally

  **Acceptance Criteria**:

  ```
  Scenario: All smoke tests pass
    Tool: Bash
    Preconditions: Dependencies installed
    Steps:
      1. Run `npx vitest run`
      2. Verify output shows 2 tests passing (React smoke + Convex smoke)
      3. Verify exit code 0
    Expected Result: "2 passed" in output, exit code 0
    Failure Indicators: Test failures, import errors, missing dependencies
    Evidence: .sisyphus/evidence/task-4-smoke-tests.txt

  Scenario: convex-test can interact with schema
    Tool: Bash
    Preconditions: Schema from Task 3 exists (convex/schema.ts)
    Steps:
      1. The smoke test creates a convex-test context with the project schema
      2. Uses `ctx.db.insert("rooms", {...})` to insert a document (raw DB access, no query function needed)
      3. Uses `ctx.db.get(id)` to read it back and asserts fields match
      4. Run `npx vitest run convex/smoke.test.ts`
    Expected Result: Test passes — document round-trips correctly via raw DB ops
    Failure Indicators: Schema not found, type mismatch, test failure
    Evidence: .sisyphus/evidence/task-4-convex-test.txt
  ```

  **Commit**: YES
  - Message: `infra: set up Vitest + convex-test + React Testing Library`
  - Files: `vitest.config.ts, src/test/setup.ts, src/test/utils.ts, convex/test.setup.ts, src/test/smoke.test.tsx, convex/smoke.test.ts`
  - Pre-commit: `npx vitest run`

- [x] 5. Shared Utilities: Card Sets, ADF Parser, Vote Average Calculator

  **What to do**:
  - **Card Sets** (`src/lib/cards.ts`):
    - Define `CardSet` type: `{ name: string; values: string[] }`
    - Define default presets: `FIBONACCI` = `["1", "2", "3", "5", "8", "13", "21"]`, `FIBONACCI_EXTENDED` = `["0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?"]`
    - Export `isNumericCard(value: string): boolean` — returns true if parseable as number
    - Export `parseCardValue(value: string): number | null` — returns numeric value or null

  - **ADF Parser** (`src/lib/adf.ts`):
    - Implement `adfToPlainText(adf: unknown): string` — recursive function that extracts text from Atlassian Document Format
    - Handle: paragraph, text, heading, bulletList, orderedList, listItem, codeBlock, blockquote, hardBreak
    - Return "(no description)" for empty/invalid ADF
    - ~20 lines, no external dependencies

  - **Vote Average** (`src/lib/average.ts`):
    - Export `calculateAverage(votes: string[]): { average: number | null; numericCount: number; totalCount: number }`
    - Filter to numeric votes only (using `parseCardValue`)
    - Return `null` average if no numeric votes
    - Export `findNearestCard(average: number, cardSet: string[]): string | null` — finds nearest numeric card value

  - **TDD**: Write tests FIRST for each utility:
    - `src/lib/__tests__/cards.test.ts`: numeric detection, parsing edge cases ("½" → 0.5, "?" → null, "☕" → null)
    - `src/lib/__tests__/adf.test.ts`: empty doc, simple text, nested lists, media-only (returns "(no description)"), headings, code blocks
    - `src/lib/__tests__/average.test.ts`: all numeric, mixed with "?", all non-numeric → null, single voter, zero voters → null, nearest card rounding

  **Must NOT do**:
  - No external ADF libraries (no @atlaskit/adf-utils)
  - No React components — pure utility functions
  - No Convex-specific code — these are shared between client and server

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure functions with clear specs, well-defined inputs/outputs
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: Task 11 (Jira import uses ADF parser)
  - **Blocked By**: None (can start immediately)

  **References**:

  **External References**:
  - Atlassian ADF spec: JSON structure with `type: "doc"`, `content: [{ type: "paragraph", content: [{ type: "text", text: "..." }] }]`
  - Fibonacci planning poker: standard values 1, 2, 3, 5, 8, 13, 21

  **WHY Each Reference Matters**:
  - ADF structure determines the recursive parser logic — must handle all node types
  - Card parsing must handle edge cases like "½" (half) which is a valid Fibonacci extended value

  **Acceptance Criteria**:

  - [ ] Tests written FIRST (RED phase), then implemented (GREEN phase)
  - [ ] `npx vitest run src/lib/__tests__/` → all pass

  ```
  Scenario: Vote average calculation correctness
    Tool: Bash
    Preconditions: Tests and implementation exist
    Steps:
      1. Run `npx vitest run src/lib/__tests__/average.test.ts`
      2. Verify tests cover: [3,5,8] → avg 5.33, [3,"?",8] → avg 5.5, ["?","☕"] → null, [] → null, [5] → avg 5
    Expected Result: All test cases pass
    Failure Indicators: Wrong average, "?" not excluded, null not returned for empty
    Evidence: .sisyphus/evidence/task-5-average.txt

  Scenario: ADF parser handles edge cases
    Tool: Bash
    Preconditions: Tests and implementation exist
    Steps:
      1. Run `npx vitest run src/lib/__tests__/adf.test.ts`
      2. Verify: empty doc → "(no description)", nested list → bullet text extracted, media-only → "(no description)"
    Expected Result: All ADF edge cases handled correctly
    Failure Indicators: Crash on unexpected ADF structure, missing text extraction
    Evidence: .sisyphus/evidence/task-5-adf.txt
  ```

  **Commit**: YES
  - Message: `feat(utils): add card sets, ADF parser, vote average calculator`
  - Files: `src/lib/cards.ts, src/lib/adf.ts, src/lib/average.ts, src/lib/__tests__/cards.test.ts, src/lib/__tests__/adf.test.ts, src/lib/__tests__/average.test.ts`
  - Pre-commit: `npx vitest run`

- [x] 6. Session Management with convex-helpers

  **What to do**:
  - Install `convex-helpers`: `npm install convex-helpers`
  - Create `convex/lib/sessions.ts`:
    - Set up session-aware mutation/query wrappers using `customMutation`/`customQuery` from convex-helpers with `SessionIdArg`
    - Export `sessionMutation` and `sessionQuery` that automatically validate and pass sessionId
  - Create `src/hooks/useSession.ts`:
    - Generate `sessionId` via `crypto.randomUUID()` if not in localStorage
    - Store in localStorage under key `poker_session_id`
    - Export `useSessionId(): string` hook
    - Export `getSessionId(): string` for non-React contexts
    - Export `useSessionMutation(mutationRef)` — wrapper around `useMutation` that auto-injects `sessionId` into every call. Usage: `const joinRoom = useSessionMutation(api.participants.joinRoom); joinRoom({ roomId, displayName })` (sessionId is added automatically)
    - Export `useSessionQuery(queryRef, args)` — wrapper around `useQuery` that auto-injects `sessionId` into args. Usage: `const rooms = useSessionQuery(api.rooms.listMyRooms, {})` (sessionId is added automatically)
  - Create `src/providers/SessionProvider.tsx`:
    - Wrap children with session context
    - Provide sessionId to all descendant components
  - **TDD**: Write tests for session ID generation, persistence, and retrieval:
    - `src/hooks/__tests__/useSession.test.ts`: generates ID on first call, returns same ID on subsequent calls, persists across "page reloads" (clear module cache)
    - `convex/lib/__tests__/sessions.test.ts`: sessionMutation receives sessionId arg, rejects when sessionId missing

  **Must NOT do**:
  - No Clerk, Auth0, or any auth library
  - No JWT tokens
  - No server-side session storage (session ID is purely client-generated, passed as arg)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Session management involves wiring convex-helpers custom wrappers — requires understanding the middleware pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 2 start, but independent within Wave 2 — runs first as dependency)
  - **Parallel Group**: Wave 2 (prerequisite for Tasks 7-11)
  - **Blocks**: Tasks 7, 8, 9, 10, 11
  - **Blocked By**: Tasks 3, 4

  **References**:

  **External References**:
  - convex-helpers session pattern: `customMutation` + `SessionIdArg` pattern
  - `crypto.randomUUID()`: Browser API for UUID v4 generation
  - localStorage API: `getItem`, `setItem`

  **WHY Each Reference Matters**:
  - convex-helpers provides the official pattern for session-based anonymous auth — follow it exactly
  - `crypto.randomUUID()` is supported in all modern browsers and provides sufficient entropy
  - Session ID is the user's identity credential — must be deterministically stored and retrieved

  **Acceptance Criteria**:

  - [ ] Tests written FIRST, then implemented
  - [ ] `npx vitest run` passes all session tests

  ```
  Scenario: Session ID persists across page reloads
    Tool: Playwright
    Preconditions: App running, fresh browser profile
    Steps:
      1. Navigate to app
      2. Execute in console: `localStorage.getItem('poker_session_id')` — capture value
      3. Reload page
      4. Execute in console: `localStorage.getItem('poker_session_id')` — capture value
      5. Assert both values are identical UUID strings
    Expected Result: Same UUID before and after reload
    Failure Indicators: Different UUIDs, null value, non-UUID format
    Evidence: .sisyphus/evidence/task-6-session-persist.txt

  Scenario: Session mutation rejects without sessionId
    Tool: Bash
    Preconditions: convex-test setup
    Steps:
      1. Run convex-test that calls a sessionMutation without sessionId arg
      2. Assert it throws a validation error
    Expected Result: Mutation rejects with clear error about missing sessionId
    Failure Indicators: Mutation succeeds without sessionId, generic error
    Evidence: .sisyphus/evidence/task-6-session-reject.txt
  ```

  **Commit**: YES
  - Message: `feat(auth): add session management with convex-helpers`
  - Files: `convex/lib/sessions.ts, src/hooks/useSession.ts, src/providers/SessionProvider.tsx, tests`
  - Pre-commit: `npx vitest run`

- [x] 7. Room Service: Create, Get, List

  **What to do**:
  - Create `convex/rooms.ts` with session-wrapped functions:
    - `createRoom` (sessionMutation): args = { name, cardSet, jiraProjectKey?, jiraBaseUrl? }. Generates room code via `nanoid(8)`. Sets status = "lobby", currentTaskIndex = 0. Returns { roomId, roomCode }.
    - `getRoom` (query): args = { roomCode }. Returns room + participants + current task. Uses `by_code` index.
    - `listMyRooms` (sessionQuery): args = { sessionId }. Returns rooms where user is a participant, ordered by createdAt desc. Joins with participants table via `by_session` index.
    - `getRoomById` (query): args = { roomId }. Returns room document.
  - Install `nanoid`: `npm install nanoid`
  - **TDD**:
    - `convex/__tests__/rooms.test.ts`:
      - Create room → verify roomCode is 8 chars, status is "lobby"
      - Get room by code → returns correct room
      - Get non-existent room → returns null
      - List rooms for session → returns only rooms where session is participant
      - Room code uniqueness → create 100 rooms, all codes different

  **Must NOT do**:
  - No room deletion or archival (out of scope for v1)
  - No permission checks — any session can create rooms
  - No Jira import logic (that's Task 11)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: CRUD with Convex indexes and session wrappers — moderate complexity
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 6)
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 11 — after Task 6 completes)
  - **Blocks**: Tasks 12, 13, 17
  - **Blocked By**: Tasks 3, 4, 6

  **References**:

  **Pattern References**:
  - Schema from Task 3: `convex/schema.ts` — rooms table definition, indexes
  - Session wrappers from Task 6: `convex/lib/sessions.ts` — `sessionMutation`, `sessionQuery`

  **External References**:
  - nanoid: `import { nanoid } from 'nanoid'` — generates URL-friendly unique strings
  - Convex `.withIndex()`: Query pattern for indexed lookups

  **WHY Each Reference Matters**:
  - Schema defines the exact fields and indexes — room service must match
  - Session wrappers provide the `sessionId` automatically — use them for all user-scoped functions
  - nanoid generates short, URL-safe codes (vs UUID which is too long for sharing)

  **Acceptance Criteria**:

  - [ ] Tests written FIRST, then implemented
  - [ ] `npx vitest run convex/__tests__/rooms.test.ts` → all pass

  ```
  Scenario: Room creation and retrieval round-trip
    Tool: Bash
    Preconditions: convex-test setup with schema
    Steps:
      1. Run test: create room with name "Sprint 42", cardSet ["1","2","3","5","8","13","21"]
      2. Retrieve room by roomCode
      3. Assert: name matches, cardSet matches, status is "lobby", roomCode is 8 alphanumeric chars
    Expected Result: Room creates and retrieves correctly
    Failure Indicators: Missing fields, wrong status, roomCode format wrong
    Evidence: .sisyphus/evidence/task-7-room-crud.txt

  Scenario: Non-existent room returns null
    Tool: Bash
    Preconditions: convex-test setup
    Steps:
      1. Query room with code "NONEXIST"
      2. Assert result is null
    Expected Result: null returned, no error thrown
    Failure Indicators: Error thrown, undefined returned
    Evidence: .sisyphus/evidence/task-7-room-null.txt
  ```

  **Commit**: YES
  - Message: `feat(rooms): add room CRUD service`
  - Files: `convex/rooms.ts, convex/__tests__/rooms.test.ts`
  - Pre-commit: `npx vitest run`

- [x] 8. Participant Service: Join, Leave, Presence, Session Takeover

  **What to do**:
  - Create `convex/participants.ts` with session-wrapped functions:
    - `joinRoom` (sessionMutation): args = { roomId, displayName }. Find-or-update participant by [roomId, sessionId] index. If exists, update isConnected=true + displayName. If not, insert new. Returns participantId.
    - `leaveRoom` (sessionMutation): args = { roomId }. Set isConnected=false for this session's participant.
    - `getParticipants` (query): args = { roomId }. Return all participants for room.
    - `listRoomParticipants` (query): args = { roomId }. Return participant display names and connection status (for "returning user" dropdown).
    - `takeoverSession` (sessionMutation): args = { roomId, targetParticipantId }. Update the target participant's sessionId to the current session. Mark old session as disconnected. This is how "claim existing user from different PC" works.
    - `heartbeat` (sessionMutation): args = { roomId }. Update participant's isConnected to true (called periodically to maintain presence).
  - **TDD**:
    - `convex/__tests__/participants.test.ts`:
      - Join room → creates participant with isConnected=true
      - Rejoin same room same session → updates existing, doesn't duplicate
      - Leave room → isConnected=false
      - Session takeover → old session's participant gets isConnected=false, target participant gets new sessionId
      - List participants → returns all including disconnected
      - Takeover with invalid participantId → error

  **Must NOT do**:
  - No display name uniqueness enforcement (just UI warning in frontend)
  - No participant deletion (they persist for history)
  - No "kick" mutation beyond session takeover

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Session takeover logic requires careful state management and index queries
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 6)
  - **Parallel Group**: Wave 2 (with Tasks 7, 9, 10, 11)
  - **Blocks**: Tasks 13, 18
  - **Blocked By**: Tasks 3, 4, 6

  **References**:

  **Pattern References**:
  - Schema: `convex/schema.ts` — participants table, `by_room_session` index for find-or-create
  - Session wrappers: `convex/lib/sessions.ts` — `sessionMutation` for automatic sessionId

  **WHY Each Reference Matters**:
  - `by_room_session` compound index enables the find-or-create pattern efficiently
  - Session takeover requires updating sessionId on a participant doc — must also handle disconnecting the old session

  **Acceptance Criteria**:

  - [ ] Tests written FIRST, then implemented
  - [ ] `npx vitest run convex/__tests__/participants.test.ts` → all pass

  ```
  Scenario: Session takeover transfers identity
    Tool: Bash
    Preconditions: convex-test with room + participant "Tim" (sessionA)
    Steps:
      1. Create room, join as "Tim" with sessionA
      2. Call takeoverSession from sessionB targeting Tim's participantId
      3. Query participants — assert Tim's sessionId is now sessionB
      4. Assert Tim's isConnected is true (new session is connected)
    Expected Result: SessionId updated, identity transferred
    Failure Indicators: Old sessionId remains, participant duplicated, error thrown
    Evidence: .sisyphus/evidence/task-8-takeover.txt

  Scenario: Duplicate join returns same participant
    Tool: Bash
    Preconditions: convex-test with room
    Steps:
      1. Join room with sessionA as "Tim" — capture participantId
      2. Join room again with sessionA as "Tim" — capture participantId
      3. Assert both participantIds are identical
      4. Assert only 1 participant in room
    Expected Result: Same participant returned, no duplication
    Failure Indicators: Two participants created, different IDs returned
    Evidence: .sisyphus/evidence/task-8-rejoin.txt
  ```

  **Commit**: YES
  - Message: `feat(participants): add participant management service`
  - Files: `convex/participants.ts, convex/__tests__/participants.test.ts`
  - Pre-commit: `npx vitest run`

- [x] 9. Task Service: CRUD, Ordering, Hours Annotation

  **What to do**:
  - Create `convex/tasks.ts`:
    - `addTask` (sessionMutation): args = { roomId, title, description? }. Sets isManual=true, order = max(existing orders) + 1. Returns taskId.
    - `importTasks` (mutation): args = { roomId, tasks: Array<{ jiraKey, title, description, jiraUrl }> }. Bulk upsert tasks by [roomId, jiraKey]. Sets isManual=false. Assigns sequential order values.
    - `getTasksForRoom` (query): args = { roomId }. Return all tasks ordered by `order` field.
    - `getCurrentTask` (query): args = { roomId }. Gets room's currentTaskIndex, returns the task at that index.
    - `setHoursEstimate` (sessionMutation): args = { taskId, hours: number }. Updates hoursEstimate on task.
    - `setFinalEstimate` (sessionMutation): args = { taskId, estimate: string }. Updates finalEstimate (consensus value after discussion).
    - `reorderTask` (sessionMutation): args = { taskId, newOrder: number }. Updates order field. (Simple numeric reorder, no DnD needed.)
    - `setCurrentTask` (sessionMutation): args = { roomId, taskIndex: number }. Sets room's `currentTaskIndex` to the given index. Validates index is within range of tasks. Resets room status to "voting" (entering a new task context).
    - `deleteTask` (sessionMutation): args = { taskId }. Only for manual tasks (isManual=true). Errors if isManual=false.
  - **TDD**:
    - `convex/__tests__/tasks.test.ts`:
      - Add manual task → order auto-increments
      - Import tasks from Jira data → upsert by jiraKey (no duplicates on re-import)
      - Get tasks for room → ordered correctly
      - Get current task → matches room's currentTaskIndex
      - Set hours estimate → persists
      - Set final estimate → persists
      - Set current task → updates room's currentTaskIndex, resets status to "voting"
      - Set current task out of range → error
      - Delete manual task → removed
      - Delete imported task → error

  **Must NOT do**:
  - No Jira API calls — this is just the data layer (Jira calls are in Task 11)
  - No drag-and-drop ordering — just numeric order field
  - No task editing beyond hours/estimate (imported tasks are read-only snapshots)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: CRUD with bulk upsert and ordering logic — moderate complexity
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 6)
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 10, 11)
  - **Blocks**: Tasks 10, 20
  - **Blocked By**: Tasks 3, 4, 6

  **References**:

  **Pattern References**:
  - Schema: `convex/schema.ts` — tasks table, `by_room` and `by_room_jira_key` indexes

  **WHY Each Reference Matters**:
  - `by_room_jira_key` index enables upsert: query by [roomId, jiraKey], update if exists, insert if not
  - `by_room` index for efficient task listing per room

  **Acceptance Criteria**:

  - [ ] Tests written FIRST, then implemented
  - [ ] `npx vitest run convex/__tests__/tasks.test.ts` → all pass

  ```
  Scenario: Jira import upserts without duplicates
    Tool: Bash
    Preconditions: convex-test with room
    Steps:
      1. Import 3 tasks: PROJ-1, PROJ-2, PROJ-3
      2. Query tasks for room — assert 3 tasks
      3. Import again with PROJ-2 updated title + PROJ-4 new
      4. Query tasks — assert 4 tasks, PROJ-2 has updated title
    Expected Result: Upsert works — no duplicates, updates apply, new tasks added
    Failure Indicators: Duplicate PROJ-2, missing PROJ-4, old title retained
    Evidence: .sisyphus/evidence/task-9-upsert.txt

  Scenario: Delete only works on manual tasks
    Tool: Bash
    Preconditions: convex-test with room, one manual task, one imported task
    Steps:
      1. Delete manual task — assert success
      2. Delete imported task — assert error thrown
    Expected Result: Manual deleted, imported protected
    Failure Indicators: Both deleted, no error for imported
    Evidence: .sisyphus/evidence/task-9-delete.txt
  ```

  **Commit**: YES
  - Message: `feat(tasks): add task CRUD + ordering + hours annotation`
  - Files: `convex/tasks.ts, convex/__tests__/tasks.test.ts`
  - Pre-commit: `npx vitest run`

- [x] 10. Voting Engine: Cast, Change, Reveal, Reset, Advance

  **What to do**:
  - Create `convex/voting.ts`:
    - `castVote` (sessionMutation): args = { taskId, participantId, value: string }. Upsert vote by [taskId, participantId] index. Sets submittedAt = Date.now(). Must verify room status is "voting" (reject if "lobby" or "revealed").
    - `getVoteStatus` (query): args = { taskId }. Return list of { participantId, hasVoted: boolean } — does NOT reveal values before reveal.
    - `getVoteResults` (query): args = { taskId, roomId }. If room status === "revealed": return full votes with values + calculated average (using `calculateAverage` from shared utils). If not revealed: return null.
    - `revealVotes` (sessionMutation): args = { roomId }. Set room status to "revealed". Can be called by ANY participant. Does NOT require all votes.
    - `resetVoting` (sessionMutation): args = { roomId }. Delete all votes for current task. Set room status back to "voting".
    - `advanceToNextTask` (sessionMutation): args = { roomId }. Increment room's currentTaskIndex. Reset status to "voting". Delete votes for previous task (or keep for history?). **Decision: Keep votes for history** — they're associated with taskId, not room state.
    - `startVoting` (sessionMutation): args = { roomId }. Set room status from "lobby" to "voting". Only valid from "lobby" status.
  - **TDD**:
    - `convex/__tests__/voting.test.ts`:
      - Cast vote → stored with correct value and participantId
      - Change vote → upsert, not duplicate
      - Vote status → shows who voted without revealing values
      - Reveal → changes room status, results now visible
      - Reveal with 0 votes → works (shows empty results)
      - Reset → deletes votes for current task, status back to "voting"
      - Advance → moves to next task, keeps old votes, new task has no votes
      - Cast vote when not "voting" → rejected
      - Average calculation: [3,5,8] → 5.33, ["?",5] → 5.0, all "?" → null

  **Must NOT do**:
  - No timer/countdown for voting
  - No "all must vote" requirement
  - No permission checks — any participant can reveal/reset/advance
  - No vote history beyond keeping vote documents (no versioning)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core business logic with multiple state transitions and edge cases — needs careful TDD
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 6 + Task 9)
  - **Parallel Group**: Wave 2 (starts after Task 9 since it needs tasks to exist)
  - **Blocks**: Tasks 14, 15
  - **Blocked By**: Tasks 3, 4, 6, 9

  **References**:

  **Pattern References**:
  - Schema: `convex/schema.ts` — votes table, `by_task_participant` index for upsert
  - Shared utils from Task 5: `src/lib/average.ts` — `calculateAverage`, `findNearestCard`
  - Session wrappers: `convex/lib/sessions.ts` — all mutations use session auth

  **WHY Each Reference Matters**:
  - `by_task_participant` index enables vote upsert (one vote per participant per task)
  - Average calculator is shared between backend (for query results) and frontend (for display)
  - Room status transitions (lobby → voting → revealed → voting) must be enforced server-side

  **Acceptance Criteria**:

  - [ ] Tests written FIRST, then implemented
  - [ ] `npx vitest run convex/__tests__/voting.test.ts` → all pass

  ```
  Scenario: Full voting lifecycle
    Tool: Bash
    Preconditions: convex-test with room (status "voting"), 2 participants, 1 task
    Steps:
      1. Participant A votes "5", Participant B votes "8"
      2. Query voteStatus — assert A and B both hasVoted=true
      3. Reveal votes — room status changes to "revealed"
      4. Query voteResults — assert values visible: A=5, B=8, average=6.5
      5. Reset — votes deleted, status back to "voting"
      6. Query voteStatus — both hasVoted=false
    Expected Result: Complete lifecycle works: vote → reveal → reset
    Failure Indicators: Votes visible before reveal, reset doesn't clear, average wrong
    Evidence: .sisyphus/evidence/task-10-lifecycle.txt

  Scenario: Vote rejected when room not in "voting" status
    Tool: Bash
    Preconditions: convex-test with room in "lobby" status
    Steps:
      1. Attempt to cast vote
      2. Assert mutation throws error with message about room status
    Expected Result: Vote rejected, error message mentions room status
    Failure Indicators: Vote accepted in lobby state, generic error
    Evidence: .sisyphus/evidence/task-10-status-guard.txt
  ```

  **Commit**: YES
  - Message: `feat(voting): add voting engine with state transitions`
  - Files: `convex/voting.ts, convex/__tests__/voting.test.ts`
  - Pre-commit: `npx vitest run`

- [x] 11. Jira Integration: Import Action, Field Discovery, Pagination

  **What to do**:
  - Create `convex/jira.ts`:
    - `triggerJiraImport` (sessionMutation): args = { roomId, projectKey, jqlFilter? }. Validates args. Calls `ctx.scheduler.runAfter(0, internal.jira.executeJiraImport, { roomId, projectKey, jqlFilter })`. Returns immediately (async import).
    - `executeJiraImport` (internalAction): 
      1. Read env vars: `JIRA_API_TOKEN`, `JIRA_EMAIL`, `JIRA_BASE_URL`
      2. Call `GET /rest/api/3/field` to discover story points field ID (search for "Story Points" or "Story point estimate")
      3. Build JQL: `project = "${projectKey}" AND statusCategory != Done${jqlFilter ? " AND " + jqlFilter : ""} ORDER BY rank ASC`
      4. Paginate through `POST /rest/api/3/search/jql` using `nextPageToken`
      5. For each issue: extract key, summary, ADF description → plain text (using `adfToPlainText`), story points, URL
      6. Call `ctx.runMutation(internal.jira.storeImportedTasks, { roomId, tasks })` to persist
    - `storeImportedTasks` (internalMutation): Bulk upsert tasks into tasks table (delegates to importTasks from Task 9)
    - `getImportStatus` (query): args = { roomId }. Return import status: "idle" | "importing" | "success" | "error" + error message. (Store status on room or a separate importJobs table — use room fields: `importStatus`, `importError`)
  - **Schema update**: Add to rooms table: `importStatus` (optional string: "importing" | "success" | "error"), `importError` (optional string)
  - **TDD**:
    - `convex/__tests__/jira.test.ts`:
      - Mock fetch: successful import with 3 issues → tasks stored correctly
      - Mock fetch: paginated response (2 pages) → all tasks fetched
      - Mock fetch: Jira returns 401 → importStatus = "error", importError = "Invalid credentials"
      - Mock fetch: field discovery finds "customfield_10016" → used for story points
      - ADF description → plain text conversion in imported tasks
      - Re-import same project → upsert, no duplicates

  **Must NOT do**:
  - No Jira write-back — strictly read-only
  - No `action` (public) — use `internalAction` only (client triggers via mutation + scheduler)
  - No hardcoded `customfield_10016` — always discover via field endpoint
  - No caching of Jira field IDs (discover fresh each import)
  - No sprint selection dropdown — JQL text input only

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: External API integration with pagination, field discovery, error handling, and async pattern — complex
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 6)
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9, 10)
  - **Blocks**: Task 16
  - **Blocked By**: Tasks 3, 4, 5, 6, 9

  **References**:

  **Pattern References**:
  - Schema: `convex/schema.ts` — tasks table for storage
  - Task service from Task 9: `convex/tasks.ts` — `importTasks` mutation for bulk upsert (CRITICAL dependency — Task 11 delegates to this)
  - ADF parser from Task 5: `src/lib/adf.ts` — `adfToPlainText` function

  **External References**:
  - Jira API: `POST /rest/api/3/search/jql` — cursor pagination with `nextPageToken`
  - Jira field discovery: `GET /rest/api/3/field` — returns all fields, search for "Story Points"
  - Basic Auth header: `Authorization: Basic ${btoa(email + ":" + apiToken)}`
  - Convex scheduler: `ctx.scheduler.runAfter(0, internal.jira.executeJiraImport, args)`

  **WHY Each Reference Matters**:
  - **Must use new `/search/jql` endpoint** — old `/search` is being deprecated
  - Cursor pagination (`nextPageToken`) is different from offset-based — don't use `startAt`
  - Field discovery is essential — story points field ID varies per Jira workspace
  - Scheduler pattern: mutation triggers → action runs async → internal mutation stores results. This keeps the client responsive.

  **Acceptance Criteria**:

  - [ ] Tests written FIRST with mocked fetch, then implemented
  - [ ] `npx vitest run convex/__tests__/jira.test.ts` → all pass

  ```
  Scenario: Successful Jira import with pagination
    Tool: Bash
    Preconditions: convex-test with mocked fetch (2 pages of results)
    Steps:
      1. Mock Jira field API → return customfield_10016 for story points
      2. Mock search API → page 1: 50 issues + nextPageToken, page 2: 10 issues + isLast=true
      3. Run executeJiraImport action
      4. Assert 60 tasks stored in DB with correct titles, keys, descriptions
    Expected Result: All 60 tasks imported across 2 pages
    Failure Indicators: Only 50 tasks (pagination broken), missing fields, wrong field used
    Evidence: .sisyphus/evidence/task-11-pagination.txt

  Scenario: Jira API error handled gracefully
    Tool: Bash
    Preconditions: convex-test with mocked fetch returning 401
    Steps:
      1. Mock Jira API → return 401 Unauthorized
      2. Run triggerJiraImport → executeJiraImport
      3. Query room importStatus → should be "error"
      4. Query room importError → should contain "401" or "Unauthorized"
    Expected Result: Error captured, import status reflects failure
    Failure Indicators: Unhandled error, import stuck in "importing" state, no error message
    Evidence: .sisyphus/evidence/task-11-error.txt
  ```

  **Commit**: YES
  - Message: `feat(jira): add Jira import action with field discovery + pagination`
  - Files: `convex/jira.ts, convex/__tests__/jira.test.ts`
  - Pre-commit: `npx vitest run`

- [x] 12. Home Page: Create Room + Join Room

  **What to do**:
  - Create `src/pages/Home.tsx`:
    - **Create Room section**: Form with fields: Room Name (required), Card Set selector (dropdown with presets: Fibonacci, Fibonacci Extended, Custom), Custom card values input (comma-separated, shown when "Custom" selected), Jira Project Key (optional), Jira Base URL (optional, defaults to env var or shows configured URL). Submit calls `createRoom` mutation → navigates to `/room/:roomCode`.
    - **Join Room section**: Input for room code + "Join" button. Validates code format (8 chars). Navigates to `/room/:roomCode`.
    - **Recent Rooms**: Show list of recently visited rooms from localStorage (room codes + names). Quick-join buttons.
  - Use shadcn/ui components: Card, Input, Button, Select, Badge, Separator
  - Responsive layout: single column on mobile, two-column on desktop
  - **TDD**:
    - `src/pages/__tests__/Home.test.tsx`:
      - Renders create room form with all fields
      - Card set selector shows 3 options (Fibonacci, Extended, Custom)
      - Custom input appears only when "Custom" selected
      - Join room input validates code format
      - Submit with empty name shows validation error

  **Must NOT do**:
  - No Jira import on home page — that's inside the room (Task 16)
  - No dark mode toggle
  - No user profile section

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI page with form interactions, responsive layout, shadcn components
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Ensures polished, non-generic UI design for the landing page

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 13, 14, 15, 16, 17)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2, 7

  **References**:

  **Pattern References**:
  - Room service from Task 7: `convex/rooms.ts` — `createRoom` mutation signature and return type
  - shadcn components from Task 2: `src/components/ui/` — Button, Input, Card, Select
  - Routes from Task 1: `src/routes/` — navigation to `/room/:roomCode`

  **External References**:
  - React Router `useNavigate`: For programmatic navigation after room creation
  - Convex `useMutation`: For calling `createRoom`

  **WHY Each Reference Matters**:
  - `createRoom` returns `{ roomId, roomCode }` — use roomCode for navigation
  - shadcn components ensure consistent styling without custom CSS

  **Acceptance Criteria**:

  - [ ] Tests written FIRST, then implemented
  - [ ] `npx vitest run src/pages/__tests__/Home.test.tsx` → all pass

  ```
  Scenario: Create room and navigate to it
    Tool: Playwright
    Preconditions: App running, Convex connected
    Steps:
      1. Navigate to http://localhost:5173/
      2. Fill room name input with "Sprint 42 Planning"
      3. Select "Fibonacci" from card set dropdown
      4. Click "Create Room" button
      5. Wait for navigation — URL should match /room/[a-zA-Z0-9]{8}/
      6. Verify room page loads (any content)
    Expected Result: Room created, navigated to /room/:code
    Failure Indicators: No navigation, error message, invalid URL format
    Evidence: .sisyphus/evidence/task-12-create-room.png

  Scenario: Join room by code
    Tool: Playwright
    Preconditions: App running, room "ABC12345" exists
    Steps:
      1. Navigate to http://localhost:5173/
      2. Find join room input, enter "ABC12345"
      3. Click "Join" button
      4. Wait for navigation to /room/ABC12345
    Expected Result: Navigated to room page
    Failure Indicators: No navigation, validation error on valid code
    Evidence: .sisyphus/evidence/task-12-join-room.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add home page with room creation + join`
  - Files: `src/pages/Home.tsx, src/components/CreateRoomForm.tsx, src/components/JoinRoomForm.tsx, src/pages/__tests__/Home.test.tsx`
  - Pre-commit: `npx vitest run`

- [x] 13. Room View Layout: Sidebar + Voting Area + Participants

  **What to do**:
  - Create `src/pages/Room.tsx` — main room page with 3-panel layout:
    - **Left sidebar**: Task list (TaskSidebar component). Shows all tasks, highlights current task, shows completion status (estimated / not estimated).
    - **Center area**: Voting/Results area. Depends on room status:
      - **"lobby"**: Show current task title + description + a prominent **"Start Voting" button** that calls `startVoting` mutation (from Task 10). Button is only enabled when there is at least 1 task and 1 participant.
      - **"voting"**: Show voting cards (Task 14 wires this in).
      - **"revealed"**: Show results panel (Task 15 wires this in).
    - **Right sidebar/top bar**: Participant list. Shows all participants with connection status (green dot = online, gray = offline), voting status (✓ = voted, ⏳ = waiting).
  - Create `src/components/TaskSidebar.tsx`: Scrollable task list with current task highlighted. Each task shows: Jira key (if exists), title, final estimate (if exists), hours (if exists).
  - Create `src/components/ParticipantList.tsx`: List of participants with status indicators. Shows total count and voted count.
  - Wire up Convex queries: `useQuery(api.rooms.getRoom, { roomCode })`, `useQuery(api.tasks.getTasksForRoom, { roomId })`, `useQuery(api.participants.getParticipants, { roomId })`
  - Wire up `useMutation(api.voting.startVoting)` for the "Start Voting" button in lobby state
  - Handle room not found: show error page
  - Handle loading state: show skeleton/spinner
  - **Temporary identity mechanism** (replaced by Task 18's full flow):
    - If no `participantId` in React state for this room, show a simple inline "Enter your name" input + "Join" button
    - On submit: call `joinRoom` mutation (from Task 8) with the entered name. Use `useSessionMutation(api.participants.joinRoom)` from Task 6's `src/hooks/useSession.ts` — this auto-injects the session ID.
    - Store returned `participantId` in React state (NOT localStorage yet — Task 18 adds that)
    - Pass `participantId` down to child components (CardDeck in Task 14, ResultsPanel in Task 15) via props or React context
    - This ensures Tasks 14/15 can function independently without Task 18
  - Responsive: sidebar collapses to bottom sheet on mobile

  **Must NOT do**:
  - No voting interaction (Task 14)
  - No results display (Task 15)
  - No Jira import (Task 16)
  - No returning-user detection, localStorage persistence, or session takeover (Task 18) — only a simple inline name prompt for temporary identity

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex layout with 3 panels, responsive design, real-time data display
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Polished layout that doesn't look like a generic dashboard

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12, 14, 15, 16, 17)
  - **Blocks**: Tasks 18, 19, 20
  - **Blocked By**: Tasks 1, 2, 7, 8, 10

  **References**:

  **Pattern References**:
  - Room service: `convex/rooms.ts` — `getRoom` query returns room + participants + current task
  - Task service: `convex/tasks.ts` — `getTasksForRoom` query
  - Participant service: `convex/participants.ts` — `getParticipants` query
  - Voting engine: `convex/voting.ts` — `startVoting` mutation (called from "Start Voting" button in lobby)
  - shadcn components: Card, Badge, ScrollArea, Separator, Button

  **WHY Each Reference Matters**:
  - Query return shapes determine component props — must match exactly
  - Room status ("lobby" | "voting" | "revealed") determines which center panel to show
  - Participant connection status drives the green/gray indicators

  **Acceptance Criteria**:

  - [ ] Tests written FIRST for layout structure, then implemented
  - [ ] `npx vitest run src/pages/__tests__/Room.test.tsx` → all pass

  ```
  Scenario: Room loads and displays 3-panel layout
    Tool: Playwright
    Preconditions: App running, room exists with 2 tasks and 3 participants
    Steps:
      1. Navigate to /room/:roomCode
      2. Assert task sidebar exists with 2 task items
      3. Assert participant list shows 3 names
      4. Assert center area shows current task title
      5. Screenshot full room layout
    Expected Result: 3-panel layout renders with correct data
    Failure Indicators: Missing panels, wrong task count, loading spinner stuck
    Evidence: .sisyphus/evidence/task-13-room-layout.png

  Scenario: Non-existent room shows error
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Navigate to /room/NOTAROOM
      2. Assert error message visible: "Room not found" (or similar)
    Expected Result: Clear error message, not blank page or spinner
    Failure Indicators: Blank page, infinite spinner, JS error in console
    Evidence: .sisyphus/evidence/task-13-room-not-found.png

  Scenario: Start Voting button transitions room from lobby to voting
    Tool: Playwright
    Preconditions: App running, room in "lobby" status with at least 1 task and 1 participant joined
    Steps:
      1. Navigate to /room/:roomCode
      2. Enter a name in the inline identity prompt, click "Join"
      3. Assert center area shows "Start Voting" button (enabled)
      4. Click "Start Voting" button
      5. Wait for room status to change to "voting" (button disappears)
      6. Assert "Start Voting" button is no longer visible (room is now in voting state)
      7. Assert center area content has changed (no longer shows lobby view)
    Expected Result: Room transitions from lobby to voting, Start Voting button disappears
    Failure Indicators: Button disabled when it shouldn't be, no transition, button still visible after click, error on click
    Evidence: .sisyphus/evidence/task-13-start-voting.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add room view layout with sidebar + participants`
  - Files: `src/pages/Room.tsx, src/components/TaskSidebar.tsx, src/components/ParticipantList.tsx, src/pages/__tests__/Room.test.tsx`
  - Pre-commit: `npx vitest run`

- [x] 14. Voting Interface: Card Deck, Selection, Indicators

  **What to do**:
  - Create `src/components/CardDeck.tsx`:
    - Render cards from room's `cardSet` array as clickable card components
    - Selected card has highlighted border/background
    - Clicking a card calls `castVote` mutation with card value
    - Clicking the already-selected card deselects (removes vote? or keeps — decision: keeps, user must pick another)
    - Cards are disabled when room status is not "voting" (disabled in "lobby" and "revealed")
    - Show current user's selected card with checkmark
  - Create `src/components/VoteCard.tsx`:
    - Individual card component: shows value, handles click
    - Visual states: default, selected, disabled, hover
    - Card size responsive (smaller on mobile)
  - Create `src/components/VoteIndicator.tsx`:
    - Shows per-participant: "✓ Voted" or "⏳ Waiting"
    - Does NOT show vote value before reveal
  - Wire up: `useMutation(api.voting.castVote)` with `.withOptimisticUpdate()` for instant feedback
  - **Receives `participantId` as a prop** from Room.tsx (Task 13 provides this via its temporary identity mechanism or Task 18's full flow)
  - **TDD**:
    - `src/components/__tests__/CardDeck.test.tsx`:
      - Renders correct number of cards from cardSet
      - Clicking card calls castVote with correct value
      - Selected card has highlighted state
      - Cards disabled when room not in "voting" status

  **Must NOT do**:
  - No timer display
  - No animation/confetti
  - No keyboard shortcuts for card selection

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Interactive card UI with visual states, optimistic updates, responsive design
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Card design that feels tactile and fun — this is the core UX

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12, 13, 15, 16, 17)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2, 10

  **References**:

  **Pattern References**:
  - Voting engine: `convex/voting.ts` — `castVote` mutation signature, `getVoteStatus` query
  - Card sets from Task 5: `src/lib/cards.ts` — `CardSet` type, `isNumericCard`
  - Room data: `convex/rooms.ts` — `getRoom` returns `cardSet` array and room `status`

  **External References**:
  - Convex `useMutation().withOptimisticUpdate()`: For instant card selection feedback

  **WHY Each Reference Matters**:
  - `castVote` args: `{ taskId, participantId, value }` — must match exactly
  - `participantId` comes as a prop from Room.tsx (Task 13) — do NOT create own identity mechanism
  - Optimistic update: immediately show card as selected before server confirms
  - Room status determines if cards are interactive — must read from `getRoom` query

  **Acceptance Criteria**:

  - [ ] Tests written FIRST, then implemented
  - [ ] `npx vitest run src/components/__tests__/CardDeck.test.tsx` → all pass

  ```
  Scenario: Vote with card and see instant selection
    Tool: Playwright
    Preconditions: App running, room in "voting" status, user joined
    Steps:
      1. Navigate to room
      2. Assert 7 cards visible (Fibonacci: 1,2,3,5,8,13,21)
      3. Click card with value "5"
      4. Assert card "5" has selected styling (highlighted border)
      5. Assert participant list shows current user as "voted"
    Expected Result: Card selected instantly, vote indicator updates
    Failure Indicators: No visual change on click, vote indicator stays "waiting"
    Evidence: .sisyphus/evidence/task-14-vote-card.png

  Scenario: Cards disabled in lobby/revealed state
    Tool: Playwright
    Preconditions: App running, room in "lobby" status
    Steps:
      1. Navigate to room
      2. Assert cards are visible but have disabled styling
      3. Click a card — assert no mutation fires (card stays unselected)
    Expected Result: Cards non-interactive in non-voting states
    Failure Indicators: Card becomes selected in lobby state
    Evidence: .sisyphus/evidence/task-14-cards-disabled.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add voting interface with card deck`
  - Files: `src/components/CardDeck.tsx, src/components/VoteCard.tsx, src/components/VoteIndicator.tsx, src/components/__tests__/CardDeck.test.tsx`
  - Pre-commit: `npx vitest run`

- [x] 15. Results Panel: Reveal, Average, Distribution, Hours Input

  **What to do**:
  - Create `src/components/ResultsPanel.tsx`:
    - **Pre-reveal state** (room status = "voting"): Show "Reveal" button. Show vote count ("3/5 voted"). Any participant can click Reveal.
    - **Post-reveal state** (room status = "revealed"): Show all vote values next to participant names. Show calculated average (from `getVoteResults` query). Show nearest Fibonacci card to the average. Show vote distribution chart (how many voted for each value). Show "Reset & Re-vote" button and "Next Task" button.
  - Create `src/components/VoteDistribution.tsx`:
    - Simple bar chart showing vote distribution (e.g., "5: ███ 3 votes", "8: ██ 2 votes")
    - Use colored bars proportional to vote count
    - Highlight the majority vote
  - Create `src/components/HoursInput.tsx`:
    - Numeric input for hours estimate (optional)
    - Shown after reveal alongside results
    - Calls `setHoursEstimate` mutation on change (debounced)
    - Shows current hours value if already set
  - Create `src/components/FinalEstimateSelector.tsx`:
    - After discussion, let someone set the "final estimate" (consensus card value)
    - Dropdown showing card set values + "Custom" option
    - Calls `setFinalEstimate` mutation
  - Wire up: `useQuery(api.voting.getVoteResults, { taskId, roomId })`, `useMutation(api.voting.revealVotes)`, `useMutation(api.voting.resetVoting)`, `useMutation(api.voting.advanceToNextTask)`
  - **TDD**:
    - `src/components/__tests__/ResultsPanel.test.tsx`:
      - Pre-reveal: shows "Reveal" button and vote count
      - Post-reveal: shows all vote values, average, distribution
      - Average shows "N/A" when all non-numeric
      - Hours input persists value on blur/enter
      - Reset button calls resetVoting mutation
      - Next Task button calls advanceToNextTask mutation

  **Must NOT do**:
  - No confetti or fancy reveal animations (simple CSS transition is fine)
  - No timer
  - No export of results

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Data visualization (distribution chart), interactive results display, multiple interactive states
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Polished results display that's easy to read at a glance

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12, 13, 14, 16, 17)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2, 10

  **References**:

  **Pattern References**:
  - Voting engine: `convex/voting.ts` — `getVoteResults`, `revealVotes`, `resetVoting`, `advanceToNextTask` signatures
  - Task service: `convex/tasks.ts` — `setHoursEstimate`, `setFinalEstimate` signatures
  - Average calc from Task 5: `src/lib/average.ts` — `calculateAverage`, `findNearestCard`

  **WHY Each Reference Matters**:
  - `getVoteResults` returns null if room not revealed — must handle both states
  - `findNearestCard` shows the suggested estimate based on average
  - Hours input uses debounced mutation — don't fire on every keystroke

  **Acceptance Criteria**:

  - [ ] Tests written FIRST, then implemented
  - [ ] `npx vitest run src/components/__tests__/ResultsPanel.test.tsx` → all pass

  ```
  Scenario: Reveal votes and see results
    Tool: Playwright
    Preconditions: Room in "voting" status, 3 participants voted (5, 8, 5)
    Steps:
      1. Click "Reveal" button
      2. Wait for room status to change to "revealed"
      3. Assert individual votes visible: participant names + values
      4. Assert average displayed: "6.0" (or (5+8+5)/3 = 6.0)
      5. Assert distribution shows: "5: 2 votes, 8: 1 vote"
      6. Assert "nearest card" shows "5"
      7. Screenshot results
    Expected Result: All votes visible, average correct, distribution shown
    Failure Indicators: Average wrong, votes hidden, distribution missing
    Evidence: .sisyphus/evidence/task-15-reveal.png

  Scenario: Hours annotation persists
    Tool: Playwright
    Preconditions: Room in "revealed" status, current task visible
    Steps:
      1. Find hours input field
      2. Enter "4.5"
      3. Click outside (blur) or press Enter
      4. Reload page
      5. Assert hours input shows "4.5"
    Expected Result: Hours value persists across page reloads
    Failure Indicators: Value lost on reload, input not found
    Evidence: .sisyphus/evidence/task-15-hours.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add results panel with average + distribution + hours`
  - Files: `src/components/ResultsPanel.tsx, src/components/VoteDistribution.tsx, src/components/HoursInput.tsx, src/components/FinalEstimateSelector.tsx, tests`
  - Pre-commit: `npx vitest run`

- [x] 16. Jira Import Modal: Project Input, JQL, Progress, Errors

  **What to do**:
  - Create `src/components/JiraImportModal.tsx`:
    - Modal (shadcn Dialog) with:
      - Project Key input (required, e.g., "PROJ")
      - JQL Filter input (optional, textarea, placeholder: `sprint is EMPTY AND statusCategory != Done`)
      - "Import" button that calls `triggerJiraImport` mutation
    - **Loading state**: Show spinner + "Importing tasks from Jira..." while import runs (poll `getImportStatus` query)
    - **Success state**: Show "Imported X tasks" message + "Close" button
    - **Error state**: Show error message from Jira (e.g., "401: Invalid credentials", "Project not found") + "Try Again" button
    - **Re-import**: If tasks already exist, show "Re-import will update existing tasks" warning
  - Wire up: `useMutation(api.jira.triggerJiraImport)`, `useQuery(api.jira.getImportStatus, { roomId })`
  - Button to open modal appears in the room view (e.g., in task sidebar header)
  - **TDD**:
    - `src/components/__tests__/JiraImportModal.test.tsx`:
      - Renders form with project key + JQL inputs
      - Import button calls triggerJiraImport
      - Loading state shows spinner
      - Error state shows message + retry button
      - Success state shows task count

  **Must NOT do**:
  - No sprint selection dropdown — JQL text input only
  - No Jira board browser
  - No cached Jira credentials in UI (server-side env var only)
  - No progress bar for individual tasks (just "importing..." or "done")

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Modal UI with multiple states (loading/success/error), form validation
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Clean modal design with clear state transitions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12, 13, 14, 15, 17)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2, 11

  **References**:

  **Pattern References**:
  - Jira integration: `convex/jira.ts` — `triggerJiraImport` mutation args, `getImportStatus` query return shape
  - shadcn Dialog: `src/components/ui/dialog.tsx`

  **WHY Each Reference Matters**:
  - `triggerJiraImport` args: `{ roomId, projectKey, jqlFilter? }` — form must provide these
  - Import status query drives the loading/success/error UI states
  - Dialog component provides accessible modal behavior

  **Acceptance Criteria**:

  - [ ] Tests written FIRST, then implemented
  - [ ] `npx vitest run src/components/__tests__/JiraImportModal.test.tsx` → all pass

  ```
  Scenario: Modal renders with correct form elements and shows loading state
    Tool: Playwright
    Preconditions: App running, room exists, user joined
    Steps:
      1. Open room page
      2. Click "Import from Jira" button (in task sidebar header)
      3. Assert modal opens with: Project Key input, JQL Filter textarea, "Import" button
      4. Enter project key "PROJ" in modal
      5. Leave JQL filter empty
      6. Click "Import" button
      7. Assert loading state appears (spinner + "Importing tasks from Jira..." text)
      8. Assert "Import" button is disabled during loading
    Expected Result: Modal form renders correctly, loading state is displayed on submit
    Failure Indicators: Missing form fields, no loading indicator, button not disabled during import
    Evidence: .sisyphus/evidence/task-16-jira-form.png

  Scenario: Error state renders correctly via unit test mocking
    Tool: Bash (vitest)
    Preconditions: Unit tests from TDD phase
    Steps:
      1. Run `npx vitest run src/components/__tests__/JiraImportModal.test.tsx`
      2. Tests include a case that mocks `getImportStatus` query returning `{ status: "error", error: "401: Invalid API token" }`
      3. Assert test passes: error message visible, "Try Again" button visible
    Expected Result: Unit tests verify error state rendering without live Jira
    Failure Indicators: Test failures, missing error state test case
    Evidence: .sisyphus/evidence/task-16-error-unit-test.txt

  Scenario: Re-import shows warning when tasks exist
    Tool: Playwright
    Preconditions: App running, room exists with existing tasks (created manually via Add Task form or seeded by a prior Playwright step)
    Steps:
      1. Open room page that already has tasks in the sidebar
      2. Open Jira import modal
      3. Assert warning text visible: "Re-import will update existing tasks" (or similar)
    Expected Result: Warning about re-import shown when tasks already exist
    Failure Indicators: No warning visible, confusing UX about overwrite behavior
    Evidence: .sisyphus/evidence/task-16-jira-reimport-warning.png
  ```

  > **Note on Jira integration testing**: Full end-to-end Jira import testing (live API calls) is deferred to the **Final Verification Wave (F3)** where real Jira credentials can be configured. Task 16 QA focuses on UI states (form, loading, error, success) which are verified through: (1) Playwright for form interaction and loading state, (2) Vitest unit tests with mocked Convex queries for error/success states. No manual dashboard intervention required.

  **Commit**: YES
  - Message: `feat(ui): add Jira import modal with progress + error handling`
  - Files: `src/components/JiraImportModal.tsx, src/components/__tests__/JiraImportModal.test.tsx`
  - Pre-commit: `npx vitest run`

- [x] 17. Room History Page: Past Rooms, Estimates

  **What to do**:
  - Create `src/pages/History.tsx`:
    - Query rooms where current session is a participant: `useQuery(api.rooms.listMyRooms, { sessionId })`
    - Display as card grid: each card shows room name, creation date, task count, completion status (X/Y tasks estimated)
    - Click a room card → navigates to `/room/:roomCode` (room is still interactive — persistent rooms)
    - Empty state: "No rooms yet. Create one to get started!" with link to home
  - Create `src/components/RoomCard.tsx`:
    - Card component showing room summary: name, date, task count, card set used, participant count
    - Visual indicator for completion (progress bar or fraction)
  - Add navigation link in app header: "History" → `/history`
  - **TDD**:
    - `src/pages/__tests__/History.test.tsx`:
      - Renders list of rooms from query
      - Each room card shows name, date, task count
      - Empty state message when no rooms
      - Click card navigates to room

  **Must NOT do**:
  - No room deletion
  - No room archival
  - No filtering/search of rooms
  - No export of historical data

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: List page with card grid layout, empty states, navigation
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Attractive card grid that shows useful info at a glance

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12, 13, 14, 15, 16)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2, 7

  **References**:

  **Pattern References**:
  - Room service: `convex/rooms.ts` — `listMyRooms` query signature and return shape
  - Session hook: `src/hooks/useSession.ts` — provides sessionId for the query
  - Routes from Task 1: navigation to `/room/:roomCode`

  **WHY Each Reference Matters**:
  - `listMyRooms` returns rooms scoped to current session — must pass sessionId
  - Room cards need enough info to be useful without clicking in

  **Acceptance Criteria**:

  - [ ] Tests written FIRST, then implemented
  - [ ] `npx vitest run src/pages/__tests__/History.test.tsx` → all pass

  ```
  Scenario: History shows past rooms
    Tool: Playwright
    Preconditions: App running, user has participated in 3 rooms
    Steps:
      1. Navigate to /history
      2. Assert 3 room cards visible
      3. Each card shows: room name, date, task count
      4. Click first card — navigates to /room/:roomCode
    Expected Result: All 3 rooms displayed with correct info
    Failure Indicators: Missing rooms, wrong counts, navigation fails
    Evidence: .sisyphus/evidence/task-17-history.png

  Scenario: Empty history shows helpful message
    Tool: Playwright
    Preconditions: App running, fresh session (no rooms)
    Steps:
      1. Navigate to /history
      2. Assert empty state message visible
      3. Assert link/button to create a room exists
    Expected Result: Friendly empty state, not blank page
    Failure Indicators: Blank page, error, missing CTA
    Evidence: .sisyphus/evidence/task-17-empty-history.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add room history page`
  - Files: `src/pages/History.tsx, src/components/RoomCard.tsx, src/pages/__tests__/History.test.tsx`
  - Pre-commit: `npx vitest run`

- [x] 18. Identity Flow: Name Entry, Returning User Detection, Session Takeover UX

  **What to do**:
  - **REPLACES Task 13's temporary inline identity prompt** with a full-featured modal flow:
  - Create `src/components/IdentityFlow.tsx` — modal/overlay shown when entering a room without an identity:
    - **Step 1**: "What's your name?" input + "Have you joined this room before?" checkbox
    - **If new user**: Enter display name → calls `joinRoom` mutation → dismisses modal
    - **If returning user**: Show dropdown of existing participants in the room (from `listRoomParticipants` query) → user picks their name → confirmation dialog: "Are you sure? This will disconnect your other session." → calls `takeoverSession` mutation → dismisses modal
    - Store current participantId AND displayName in localStorage per room: `poker_room_{roomCode}` → `{ participantId, displayName }`
    - On room entry: check if localStorage has data for this room → if yes, auto-rejoin (call `joinRoom` with stored displayName, session hook provides sessionId) → skip modal
  - Create `src/components/SessionKickedBanner.tsx`:
    - Shown when another device takes over the session
    - "Your session was taken over on another device. You've been disconnected."
    - "Reclaim" button (triggers another takeover) or "OK" (navigates to home)
    - Detection: query participant → if sessionId doesn't match current session, show banner
  - **TDD**:
    - `src/components/__tests__/IdentityFlow.test.tsx`:
      - New user: shows name input, hides returning user dropdown
      - Returning user: shows participant dropdown when checkbox checked
      - Takeover: confirmation dialog appears before execution
      - Auto-rejoin: modal skipped when localStorage has valid participantId

  **Must NOT do**:
  - No password or verification — trust-based identity
  - No avatar upload
  - No "ban user" functionality

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex multi-step flow with localStorage persistence, session detection, real-time state monitoring for kicks
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Clean, non-intimidating identity flow UX

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 19, 20, 21)
  - **Blocks**: None
  - **Blocked By**: Tasks 8, 13

  **References**:

  **Pattern References**:
  - Participant service: `convex/participants.ts` — `joinRoom`, `takeoverSession`, `listRoomParticipants` signatures
  - Session hook: `src/hooks/useSession.ts` — `useSessionId()` for current session
  - Room view: `src/pages/Room.tsx` — IdentityFlow renders as overlay/modal on room page

  **WHY Each Reference Matters**:
  - `joinRoom` is find-or-create — calling it on auto-rejoin is safe (won't duplicate)
  - `takeoverSession` updates the target participant's sessionId — triggers re-render for old session
  - `listRoomParticipants` provides the dropdown list for returning users

  **Acceptance Criteria**:

  - [ ] Tests written FIRST, then implemented
  - [ ] `npx vitest run src/components/__tests__/IdentityFlow.test.tsx` → all pass

  ```
  Scenario: New user enters name and joins
    Tool: Playwright
    Preconditions: App running, room exists, fresh browser (no localStorage for this room)
    Steps:
      1. Navigate to /room/:roomCode
      2. Assert identity modal is shown
      3. Enter name "Alice" in input
      4. Click "Join" button
      5. Assert modal dismisses
      6. Assert "Alice" appears in participant list
      7. Assert localStorage has participantId for this room
    Expected Result: User joins room, participant visible, identity persisted
    Failure Indicators: Modal doesn't dismiss, name not in participants, no localStorage
    Evidence: .sisyphus/evidence/task-18-new-user.png

  Scenario: Returning user claims existing identity
    Tool: Playwright
    Preconditions: App running, room exists with participant "Bob" (from different session)
    Steps:
      1. Navigate to /room/:roomCode in new browser/incognito
      2. Assert identity modal shown
      3. Check "I've joined this room before" checkbox
      4. Assert dropdown appears with participant names including "Bob"
      5. Select "Bob" from dropdown
      6. Assert confirmation dialog: "This will disconnect your other session"
      7. Click "Confirm"
      8. Assert modal dismisses, "Bob" shown as current user in participant list
    Expected Result: Session takeover successful, user is now "Bob"
    Failure Indicators: No dropdown, no confirmation, takeover fails
    Evidence: .sisyphus/evidence/task-18-takeover.png
  ```

  **Commit**: YES
  - Message: `feat(identity): add name entry + returning user + session takeover UX`
  - Files: `src/components/IdentityFlow.tsx, src/components/SessionKickedBanner.tsx, src/hooks/useIdentity.ts, tests`
  - Pre-commit: `npx vitest run`

- [ ] 19. Connection Status Banner + Offline/Reconnect Handling

  **What to do**:
  - Create `src/components/ConnectionBanner.tsx`:
    - Use `useConvex()` to access `client` and subscribe to connection state
    - States:
      - **Connected**: No banner (hidden)
      - **Disconnected**: Yellow banner: "Connection lost. Reconnecting..." with pulsing animation
      - **Reconnected**: Green banner: "Back online!" that auto-hides after 3 seconds
    - Position: fixed at top of viewport, above all content
    - Z-index above modals
  - Add `ConnectionBanner` to root layout (renders on all pages)
  - Handle edge case: if disconnected for >30 seconds, add "Your data will sync when connection restores" message
  - **TDD**:
    - `src/components/__tests__/ConnectionBanner.test.tsx`:
      - Hidden when connected
      - Shows "Reconnecting" when disconnected
      - Shows "Back online" briefly when reconnected
      - Auto-hides after 3 seconds

  **Must NOT do**:
  - No custom WebSocket reconnection logic — Convex handles it
  - No manual "reconnect" button — Convex auto-reconnects
  - No offline data caching beyond what Convex provides

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single component with simple state machine (connected/disconnected/reconnected)
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 18, 20, 21)
  - **Blocks**: None
  - **Blocked By**: Task 13

  **References**:

  **External References**:
  - Convex connection state: `useConvex()` client instance, subscribe via `client.connectionState()` or React hook

  **WHY Each Reference Matters**:
  - Convex provides the connection state — we just need to display it
  - Don't implement reconnection logic — it's built into the Convex client

  **Acceptance Criteria**:

  - [ ] Tests written FIRST, then implemented
  - [ ] `npx vitest run src/components/__tests__/ConnectionBanner.test.tsx` → all pass

  ```
  Scenario: Banner appears on connection loss
    Tool: Playwright
    Preconditions: App running, connected to Convex
    Steps:
      1. Navigate to any page
      2. Assert no connection banner visible
      3. Simulate offline: page.context().setOffline(true)
      4. Wait 2 seconds
      5. Assert yellow banner visible with "Reconnecting" text
      6. Simulate online: page.context().setOffline(false)
      7. Wait for green "Back online" banner
      8. Wait 4 seconds — assert banner auto-hides
    Expected Result: Banner shows on disconnect, hides on reconnect
    Failure Indicators: Banner doesn't appear, doesn't auto-hide, wrong color/text
    Evidence: .sisyphus/evidence/task-19-connection-banner.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add connection status banner`
  - Files: `src/components/ConnectionBanner.tsx, src/components/__tests__/ConnectionBanner.test.tsx`
  - Pre-commit: `npx vitest run`

- [ ] 20. Manual Task Creation UI + Task List Management

  **What to do**:
  - Create `src/components/AddTaskForm.tsx`:
    - Inline form in task sidebar: title input (required) + description textarea (optional)
    - "Add Task" button calls `addTask` mutation
    - Clears form on success
    - Show validation: title required, max 200 chars
  - Create `src/components/TaskListManager.tsx`:
    - Enhanced task sidebar with management features:
      - "Add Task" button that reveals AddTaskForm
      - "Import from Jira" button that opens JiraImportModal (from Task 16)
      - Each task shows: number, title, Jira key (if imported), estimate (if set), hours (if set)
      - Current task highlighted with different background
      - Manual tasks have a delete button (× icon)
      - Click task to jump to it (calls `setCurrentTask` mutation from Task 9 to set room's currentTaskIndex)
    - Empty state: "No tasks yet. Add manually or import from Jira."
  - Integrate into Room.tsx: Replace simple TaskSidebar from Task 13 with TaskListManager
  - **TDD**:
    - `src/components/__tests__/AddTaskForm.test.tsx`:
      - Renders title input + add button
      - Submit calls addTask mutation
      - Clears form after success
      - Validation: empty title shows error
    - `src/components/__tests__/TaskListManager.test.tsx`:
      - Renders tasks with correct info
      - Manual tasks have delete button, imported don't
      - Empty state shown when no tasks

  **Must NOT do**:
  - No drag-and-drop reordering
  - No bulk operations
  - No task editing for imported tasks (read-only snapshots)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Interactive list with inline form, delete actions, empty states
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Clean task list that's easy to scan

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 18, 19, 21)
  - **Blocks**: None
  - **Blocked By**: Tasks 9, 13

  **References**:

  **Pattern References**:
  - Task service: `convex/tasks.ts` — `addTask`, `deleteTask`, `setCurrentTask`, `getTasksForRoom` signatures
  - Jira import modal: `src/components/JiraImportModal.tsx` — integrated as "Import from Jira" button
  - Task sidebar from Task 13: `src/components/TaskSidebar.tsx` — being replaced/enhanced

  **WHY Each Reference Matters**:
  - `addTask` mutation: `{ roomId, title, description? }` — form fields must match
  - `deleteTask` only works for manual tasks — UI must hide delete button for imported tasks
  - `setCurrentTask` mutation: `{ roomId, taskIndex }` — called when clicking a task to jump to it
  - This task enhances Task 13's sidebar — coordinate to avoid conflicts

  **Acceptance Criteria**:

  - [ ] Tests written FIRST, then implemented
  - [ ] `npx vitest run src/components/__tests__/AddTaskForm.test.tsx` → all pass
  - [ ] `npx vitest run src/components/__tests__/TaskListManager.test.tsx` → all pass

  ```
  Scenario: Add manual task and see it in list
    Tool: Playwright
    Preconditions: App running, room exists, user joined
    Steps:
      1. Navigate to room
      2. Click "Add Task" button in sidebar
      3. Enter title "Discuss API design"
      4. Click "Add" (or press Enter)
      5. Assert task appears in sidebar with title "Discuss API design"
      6. Assert task has delete button (manual task)
    Expected Result: Task added and visible immediately (real-time)
    Failure Indicators: Task not appearing, form not clearing, no delete button
    Evidence: .sisyphus/evidence/task-20-add-task.png

  Scenario: Delete manual task
    Tool: Playwright
    Preconditions: Room with 1 manual task + 1 imported task
    Steps:
      1. Assert manual task has × delete button
      2. Assert imported task does NOT have delete button
      3. Click delete on manual task
      4. Assert task removed from list
      5. Assert imported task still present
    Expected Result: Only manual tasks deletable, imported protected
    Failure Indicators: Both have delete buttons, imported deleted, manual not removed
    Evidence: .sisyphus/evidence/task-20-delete-task.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add manual task creation + task list management`
  - Files: `src/components/AddTaskForm.tsx, src/components/TaskListManager.tsx, tests`
  - Pre-commit: `npx vitest run`

- [ ] 21. Vercel Deployment: Config, Env Vars, Build

  **What to do**:
  - Create `vercel.json` with:
    - Framework: Vite
    - Build command: `npm run build`
    - Output directory: `dist`
    - Rewrites: `[{ "source": "/(.*)", "destination": "/index.html" }]` for SPA routing
  - Create `.env.example` documenting all required env vars:
    - `VITE_CONVEX_URL` — Convex deployment URL
    - (Jira vars are Convex env vars, not Vercel — document this distinction)
  - Update `package.json` scripts:
    - `"build"`: `vite build`
    - `"preview"`: `vite preview`
  - Verify `npm run build` produces valid `dist/` output
  - Document Convex env vars needed: `JIRA_API_TOKEN`, `JIRA_EMAIL`, `JIRA_BASE_URL` (set via `npx convex env set`)
  - **TDD**: No unit tests for deployment config. QA scenarios verify build and serve.

  **Must NOT do**:
  - No CI/CD pipeline setup
  - No custom domain configuration
  - No CDN or caching config
  - No server-side anything — pure static SPA deployment

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard Vercel deployment config for Vite SPA
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on all previous tasks)
  - **Parallel Group**: Wave 4 (last task)
  - **Blocks**: F1-F4
  - **Blocked By**: All previous tasks

  **References**:

  **External References**:
  - Vercel Vite deployment: `https://vercel.com/docs/frameworks/vite`
  - Convex + Vercel: `https://docs.convex.dev/production/hosting/vercel`

  **WHY Each Reference Matters**:
  - Vercel auto-detects Vite, but SPA rewrites need explicit config
  - Convex deployment URL must be production Convex URL (not dev)

  **Acceptance Criteria**:

  ```
  Scenario: Production build succeeds
    Tool: Bash
    Preconditions: All code committed, dependencies installed
    Steps:
      1. Run `npm run build`
      2. Assert exit code 0
      3. Assert `dist/index.html` exists
      4. Assert `dist/assets/` contains JS and CSS bundles
      5. Run `npx vite preview` — verify serves correctly
    Expected Result: Build produces valid static output
    Failure Indicators: Build fails, missing assets, TS errors
    Evidence: .sisyphus/evidence/task-21-build.txt

  Scenario: SPA routing works in production build
    Tool: Playwright
    Preconditions: `npx vite preview` running
    Steps:
      1. Navigate to http://localhost:4173/
      2. Navigate to http://localhost:4173/room/test123
      3. Navigate to http://localhost:4173/history
      4. Hard refresh on /room/test123 — should NOT get 404
    Expected Result: All routes work including hard refresh (SPA rewrite)
    Failure Indicators: 404 on direct navigation, blank page
    Evidence: .sisyphus/evidence/task-21-spa-routing.png
  ```

  **Commit**: YES
  - Message: `infra: add Vercel deployment config`
  - Files: `vercel.json, .env.example`
  - Pre-commit: `npm run build`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE.
>
> **Note on user approval**: "Zero human intervention" applies to individual task QA criteria.
> The final verification wave is a project-level delivery checkpoint. Agents execute all verifications autonomously.
> Results are presented to the user as an informational summary. If any agent REJECTS, the issues are fixed
> and the wave re-runs automatically until all pass. User is informed of the outcome but not gated on approval.

- [ ] F1. **Plan Compliance Audit** — `oracle`

  **What to do**:
  - Read `.sisyphus/plans/planning-poker.md` end-to-end
  - For each "Must Have": verify implementation exists via file reads, command execution, and code inspection
  - For each "Must NOT Have": search codebase for forbidden patterns
  - Check `.sisyphus/evidence/` directory for evidence files from all tasks
  - Compare deliverables list against actual file tree

  **Recommended Agent Profile**:
  - **Dispatch**: Use `subagent_type: "oracle"` (not a category — oracle is a direct agent type)
  - **Skills**: []

  **Acceptance Criteria**:

  ```
  Scenario: All "Must Have" items present
    Tool: Bash + Read
    Preconditions: All 21 tasks completed
    Steps:
      1. Read plan file, extract all "Must Have" items
      2. For "Real-time vote synchronization": run `npx vitest run` and verify voting tests pass
      3. For "Configurable card sets per room": read convex/rooms.ts, verify cardSet field in createRoom
      4. For "Jira backlog import": read convex/jira.ts, verify executeJiraImport exists
      5. For "Manual task creation": read convex/tasks.ts, verify addTask mutation
      6. For "Vote reveal by any participant": read convex/voting.ts, verify no permission check in revealVotes
      7. For "Average + distribution": read src/components/ResultsPanel.tsx, verify average calculation
      8. For "Optional hours annotation": read src/components/HoursInput.tsx exists
      9. For "Cross-device session takeover": read convex/participants.ts, verify takeoverSession
      10. For "Connection status banner": read src/components/ConnectionBanner.tsx exists
      11. For "Persistent rooms with history": read src/pages/History.tsx exists
      12. For "TDD with Vitest": run `npx vitest run`, verify tests exist and pass
    Expected Result: All Must Have items verified with evidence
    Failure Indicators: Missing file, test failure, function not found
    Evidence: .sisyphus/evidence/f1-compliance-audit.txt

  Scenario: All "Must NOT Have" items absent
    Tool: Grep + Bash
    Preconditions: All code committed
    Steps:
      1. grep -r "clerk" src/ convex/ --include="*.ts" --include="*.tsx" — expect 0 results
      2. grep -r "auth0" src/ convex/ --include="*.ts" --include="*.tsx" — expect 0 results
      3. grep -r "WebSocket" src/ convex/ --include="*.ts" --include="*.tsx" — expect 0 results (Convex handles this)
      4. grep -r "PUT\|POST.*jira" convex/ --include="*.ts" — verify no write-back endpoints
      5. grep -r "dark-mode\|darkMode\|theme-toggle" src/ --include="*.tsx" — expect 0 results
      6. grep -r "confetti\|timer\|countdown" src/ --include="*.tsx" — expect 0 results
      7. grep -r "spectator\|observer" src/ convex/ --include="*.ts" --include="*.tsx" — expect 0 results
    Expected Result: Zero matches for all forbidden patterns
    Failure Indicators: Any match found
    Evidence: .sisyphus/evidence/f1-forbidden-patterns.txt
  ```

  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`

  **What to do**:
  - Run TypeScript compiler, linter, and test suite
  - Review all source files for code quality issues
  - Check for AI-generated slop patterns

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Acceptance Criteria**:

  ```
  Scenario: Build and tests pass
    Tool: Bash
    Preconditions: All code committed
    Steps:
      1. Run `npx tsc --noEmit` — expect exit code 0
      2. Run `npx vitest run` — expect all tests pass
      3. Run `npm run build` — expect exit code 0
      4. Capture output of each command
    Expected Result: Zero TS errors, all tests pass, build succeeds
    Failure Indicators: Any TS error, test failure, build failure
    Evidence: .sisyphus/evidence/f2-build.txt

  Scenario: No code quality violations
    Tool: Grep + Read
    Preconditions: All source files present
    Steps:
      1. grep -r "as any" src/ convex/ --include="*.ts" --include="*.tsx" — count occurrences
      2. grep -r "@ts-ignore\|@ts-expect-error" src/ convex/ — expect 0
      3. grep -r "console\.log" src/ --include="*.tsx" --include="*.ts" — expect 0 in production code (tests OK)
      4. grep -r "TODO\|FIXME\|HACK" src/ convex/ — list all, should be 0
      5. Read 5 random component files — check for: excessive comments, over-abstraction, generic variable names (data, result, item, temp)
    Expected Result: Zero ts-ignore, zero console.log in prod, zero TODO/FIXME
    Failure Indicators: Any critical violation found
    Evidence: .sisyphus/evidence/f2-quality.txt
  ```

  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Quality [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)

  **What to do**:
  - Start from clean state
  - Execute the full user journey end-to-end
  - Test cross-feature integration
  - Test edge cases

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]

  **Acceptance Criteria**:

  ```
  Scenario: Full user journey — create room, add tasks, vote, reveal
    Tool: Playwright
    Preconditions: App running at localhost:5173, Convex dev running
    Steps:
      1. Navigate to http://localhost:5173/
      2. Create room: name "E2E Test Room", Fibonacci cards
      3. Copy room code from URL
      4. Enter name "Alice" in identity modal, click Join
      5. Click "Add Task" — enter "Design login page"
      6. Click "Add Task" — enter "Build API endpoint"
      7. Assert 2 tasks visible in sidebar
      8. Click "Start Voting" button
      9. Click card "5" — assert selected
      10. Click "Reveal" — assert results shown with "5" vote
      11. Assert average shows "5.0"
      12. Enter "4" in hours input — assert persists
      13. Click "Next Task" — assert task 2 is now current
      14. Navigate to /history — assert room appears in list
      15. Screenshot final state
    Expected Result: Complete journey works end-to-end
    Failure Indicators: Any step fails, navigation breaks, data not persisting
    Evidence: .sisyphus/evidence/f3-full-journey.png

  Scenario: Multi-user real-time — two browsers voting simultaneously
    Tool: Playwright (two browser contexts)
    Preconditions: App running, room with tasks exists
    Steps:
      1. Open Browser A, join room as "Alice"
      2. Open Browser B, join room as "Bob"
      3. Assert both see 2 participants
      4. Alice votes "5" — assert Bob sees "Alice voted" indicator (no value)
      5. Bob votes "8" — assert Alice sees "Bob voted" indicator
      6. Bob clicks "Reveal"
      7. Assert BOTH browsers show: Alice=5, Bob=8, average=6.5
      8. Alice clicks "Reset"
      9. Assert BOTH browsers show voting state (no votes)
    Expected Result: Real-time sync works between two browsers within 2 seconds
    Failure Indicators: State not syncing, votes visible before reveal, stale data
    Evidence: .sisyphus/evidence/f3-multi-user.png

  Scenario: Edge cases — empty states, all non-numeric votes
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Create room, join, but don't add tasks — assert empty state message
      2. Add 1 task, start voting
      3. Vote "?" (if in card set, or test with custom cards)
      4. Reveal — assert average shows "N/A"
      5. Navigate to /room/NONEXIST — assert "Room not found" error
      6. Navigate to /history with fresh session — assert empty state
    Expected Result: All edge cases handled gracefully
    Failure Indicators: Blank pages, JS errors, crashes on edge cases
    Evidence: .sisyphus/evidence/f3-edge-cases.png
  ```

  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`

  **What to do**:
  - Compare every task's "What to do" against actual implementation
  - Verify nothing was added beyond spec
  - Check for cross-task contamination

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Acceptance Criteria**:

  ```
  Scenario: Every task implemented per spec — no missing, no extra
    Tool: Bash + Read
    Preconditions: All tasks completed, git history available
    Steps:
      1. For each task 1-21: read the plan's "What to do", then read the actual files created
      2. Verify each bullet point was implemented (no missing requirements)
      3. Verify no extra functionality was added beyond the spec
      4. Check "Must NOT do" per task — verify none were violated
    Expected Result: 1:1 correspondence between spec and implementation for all 21 tasks
    Failure Indicators: Missing functionality, scope creep, cross-task contamination
    Evidence: .sisyphus/evidence/f4-fidelity.txt

  Scenario: No forbidden features present
    Tool: Grep + Read
    Preconditions: All code committed
    Steps:
      1. Search for timer/countdown implementations
      2. Search for dark mode / theme toggle
      3. Search for chat / comments features
      4. Search for export (CSV/PDF) functionality
      5. Search for drag-and-drop libraries (react-beautiful-dnd, @dnd-kit, etc.)
      6. Search for notification sounds (Audio, Notification API)
      7. Search for keyboard shortcut libraries (hotkeys, mousetrap)
      8. List all npm dependencies from package.json — verify none are unexpected
    Expected Result: Zero forbidden features found
    Failure Indicators: Any forbidden feature or library detected
    Evidence: .sisyphus/evidence/f4-forbidden.txt
  ```

  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Group | Message | Files | Pre-commit |
|-------|---------|-------|------------|
| T1 | `infra: scaffold Vite + React + TypeScript + React Router + concurrently` | package.json, vite.config.ts, tsconfig.json, src/main.tsx, src/App.tsx, src/routes/ | `npm run build` |
| T2 | `infra: add Tailwind CSS + shadcn/ui + theme tokens` | tailwind.config.ts, postcss.config.js, src/index.css, components.json, src/components/ui/ | `npm run build` |
| T3 | `infra: initialize Convex project + define schema` | convex/schema.ts, convex/tsconfig.json, .env.local | `npx convex dev --once` |
| T4 | `infra: set up Vitest + convex-test + RTL` | vitest.config.ts, src/test/setup.ts, src/test/utils.ts | `npx vitest run` |
| T5 | `feat(utils): add card sets, ADF parser, vote average calculator` | src/lib/cards.ts, src/lib/adf.ts, src/lib/average.ts, tests | `npx vitest run` |
| T6 | `feat(auth): add session management with convex-helpers` | convex/lib/sessions.ts, convex/lib/withSession.ts, src/hooks/useSession.ts | `npx vitest run` |
| T7 | `feat(rooms): add room CRUD service` | convex/rooms.ts, convex/rooms.test.ts | `npx vitest run` |
| T8 | `feat(participants): add participant management service` | convex/participants.ts, convex/participants.test.ts | `npx vitest run` |
| T9 | `feat(tasks): add task CRUD + ordering + hours` | convex/tasks.ts, convex/tasks.test.ts | `npx vitest run` |
| T10 | `feat(voting): add voting engine` | convex/voting.ts, convex/voting.test.ts | `npx vitest run` |
| T11 | `feat(jira): add Jira import action with field discovery` | convex/jira.ts, convex/jira.test.ts | `npx vitest run` |
| T12 | `feat(ui): add home page with room creation + join` | src/pages/Home.tsx, src/components/CreateRoom.tsx, src/components/JoinRoom.tsx | `npx vitest run` |
| T13 | `feat(ui): add room view layout` | src/pages/Room.tsx, src/components/TaskSidebar.tsx, src/components/ParticipantList.tsx | `npx vitest run` |
| T14 | `feat(ui): add voting interface with card deck` | src/components/CardDeck.tsx, src/components/VoteIndicator.tsx | `npx vitest run` |
| T15 | `feat(ui): add results panel with average + distribution` | src/components/ResultsPanel.tsx, src/components/VoteDistribution.tsx, src/components/HoursInput.tsx | `npx vitest run` |
| T16 | `feat(ui): add Jira import modal` | src/components/JiraImportModal.tsx | `npx vitest run` |
| T17 | `feat(ui): add room history page` | src/pages/History.tsx, src/components/RoomCard.tsx | `npx vitest run` |
| T18 | `feat(identity): add name entry + returning user + session takeover` | src/components/IdentityFlow.tsx, src/hooks/useIdentity.ts | `npx vitest run` |
| T19 | `feat(ui): add connection status banner` | src/components/ConnectionBanner.tsx | `npx vitest run` |
| T20 | `feat(ui): add manual task creation` | src/components/AddTaskForm.tsx, src/components/TaskListManager.tsx | `npx vitest run` |
| T21 | `infra: add Vercel deployment config` | vercel.json, .env.example | `npm run build` |

---

## Success Criteria

### Verification Commands
```bash
npm run build          # Expected: Build succeeds, no TS errors
npx vitest run         # Expected: All tests pass
npx convex dev --once  # Expected: Schema validates, functions deploy
npm run dev            # Expected: Both Vite + Convex dev servers start (via concurrently)
```

### Final Checklist
- [ ] All "Must Have" items present and working
- [ ] All "Must NOT Have" items absent (no timer, no auth lib, no Jira write-back, etc.)
- [ ] All tests pass (Vitest + convex-test)
- [ ] Real-time sync works between two browsers
- [ ] Jira import fetches and displays backlog tasks
- [ ] Manual task creation works without Jira
- [ ] Vote reveal shows average + distribution
- [ ] Session takeover kicks old device
- [ ] Connection banner shows on network loss
- [ ] Deployed to Vercel and accessible
