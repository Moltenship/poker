# Planning Poker — Issues


## F2: Code Quality Review Findings (Fri Mar 28 2026)

### Failing Test — Real Bug
- File: `src/components/__tests__/IdentityFlow.test.tsx`
- Test: "asks for confirmation before taking over a returning user session"
- Line 122: `screen.getByRole("option", { name: "Alice" })` fails
- Root cause: shadcn `Select` component's listbox portal doesn't render `role="option"` 
  elements in JSDOM after `user.click(combobox)` — the dropdown stays `aria-expanded="false"`.
  The previous test uses `findByRole` (async), this one uses `getByRole` (sync) — timing issue.
  This is a real test bug, not a flaky failure. Needs `await screen.findByRole(...)` or
  explicit wait for the dropdown to open.

### Systematic `as any` Pattern
- 14 production occurrences of `(api as any).module.function` — ALL in the same pattern
- Root cause: `useSessionMutation` / `useSessionQuery` custom hooks are not properly generic
  over `FunctionReference<T>`, so callers must cast `api` to bypass TypeScript
- Fix: Type the custom hooks to accept `FunctionReference<any, any, any>` properly

### Loose `Function` type in convex helper
- `convex/voting.ts:28` — `ctx: { db: { query: Function } }` in `getSortedTasksForRoom`
- Minor technical debt — should use proper Convex context type

### LightningCSS Minifier Warnings
- Build emits ~50 "Unknown at rule: @theme / @utility / @custom-variant" warnings
- These are Tailwind v4 CSS at-rules that lightningcss minifier doesn't understand
- Output is functionally correct — cosmetic warnings only

## F4: Scope Fidelity Findings (Fri Mar 27 2026)

### Major task/spec mismatches
- `convex/rooms.ts:getRoom` returns only a room doc instead of the planned room + participants + current task payload.
- `convex/voting.ts:advanceToNextTask` deletes vote docs despite the plan decision to keep votes for history.
- `convex/jira.ts` does not expose the planned `triggerJiraImport`, `executeJiraImport`, `storeImportedTasks`, `getImportStatus` contract and uses `loading` instead of `importing`.
- `src/pages/Room.tsx` still contains placeholder center content: `Voting Area (Task 14)` and `Results Area (Task 15)` rather than integrating `CardDeck` and `ResultsPanel`.
- `src/components/JiraImportModal.tsx` depends on backend APIs that do not exist and suppresses the mismatch with `@ts-expect-error`.

### Integration gap affecting core app behavior
- `src/main.tsx` still contains `// ConvexProvider placeholder for future integration`, so realtime/connection features are not fully wired at the application root.

### Scope outcome
- Forbidden features were clean, routes were clean, and dependencies were broadly expected.
- Final F4 verdict is REJECT because the implementation diverges materially from the plan on core tasks rather than minor interpretation differences.

## [2026-03-27 20:45] Final Verification Wave Follow-up
- `npm run build` still emits the existing Lightning CSS warnings for Tailwind/shadcn at-rules (`@theme`, `@utility`, `@custom-variant`) plus the pre-existing Vite chunk-size warning. Build exit code is 0; these are warnings, not blockers for this integration fix.

## [2026-03-27 21:00] F4 Rerun Findings
- Re-run confirmed the six concrete rejection reasons were fixed: `ConvexProvider` is mounted in `src/main.tsx`, `Room.tsx` now renders both `CardDeck` and `ResultsPanel`, the Task 14/15 placeholders are gone, `JiraImportModal.tsx` now calls `api.jira.importFromJira` without TS suppression, and `package.json` now includes `preview`.
- T7 (`getRoom` returns a bare room doc) is acceptable because `Room.tsx` fetches room/tasks/participants/current vote status separately in parallel, which is a valid realtime Convex shape.
- T11 (export name `importFromJira` vs `triggerJiraImport`) is acceptable because the actual readonly import workflow exists and the naming difference does not change delivered functionality.
- T10 remains a real scope issue: `convex/voting.ts:216-224` deletes votes for the destination task inside `advanceToNextTask`, which contradicts the earlier decision to keep votes for history.

## [2026-03-27 20:59] F4 Run 3
- Functional scope checks passed in production code and both gates succeeded (`npm test`: 117/117, `npm run build`: exit 0).
- `convex/voting.ts:advanceToNextTask` is now correct: it advances index/status only and no longer deletes votes; `resetVoting` remains the explicit vote-clearing path.
- Remaining blocker for strict F4 approval: forbidden literal `customfield_10016` still exists in `convex/__tests__/jira.test.ts` (lines 63, 162, 174), so repo-level forbidden-pattern audit still fails even though runtime Jira field discovery is dynamic in production code.

## [2026-03-27 21:05] F4 Run 3 Correction
- Previous REJECT rationale on `customfield_10016` was a false positive. The plan explicitly requires `convex/__tests__/jira.test.ts` to mock field discovery returning `customfield_10016` and assert the discovered value is used.
- Production Jira code remains compliant: `convex/jira.ts` has no hardcoded `customfield_10016`; it discovers the field id dynamically from `/rest/api/3/field`.
