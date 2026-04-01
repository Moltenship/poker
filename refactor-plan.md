# Refactor: Remove All `any` Types & Improve Code Quality

## Context

The codebase has **~75 instances of `any`** across frontend and backend code, undermining TypeScript's type safety. The single biggest source (~30 instances) is `(api as any).module.function` on the frontend, caused by a too-narrow generic constraint in `useSessionMutation`/`useSessionQuery`. This plan eliminates every `any`, applies Convex best practices (return validators, indexes over filters), and applies React performance patterns.

---

## Phase 1: Fix Session Hook Types (Root Cause)

**File**: `src/hooks/useSession.ts`

The `SessionFunction` type uses `{ sessionId: string } & Record<string, unknown>` which is too narrow for specific arg types. Replace with a flexible generic that accepts any `FunctionReference` whose args include `sessionId`:

```typescript
export function useSessionMutation<
  Ref extends FunctionReference<"mutation", "public">
>(
  mutationRef: FunctionArgs<Ref> extends { sessionId: string } ? Ref : never,
) {
  const mutate = useMutation(mutationRef);
  const sessionId = useSessionId();
  return (args: Omit<FunctionArgs<Ref>, "sessionId">) =>
    mutate({ ...args, sessionId } as FunctionArgs<Ref>);
}
```

Same pattern for `useSessionQuery`. Delete `SessionFunction` and `WithoutSessionId` types.

---

## Phase 2: Remove All `(api as any)` on Frontend

With Phase 1 done, replace every `(api as any).x.y` with `api.x.y`. This also fixes all downstream casts (`(room as any).jiraEnabled`, `(currentTask as any).jiraKey`, `(t: any)`, `(v: any)`, `(p: any)`, etc.) since queries will return proper types.

| File | Instances | Changes |
|------|-----------|---------|
| `src/pages/Room.tsx` | 19 | Remove all `(api as any)`, `(room as any)`, `(currentTask as any)`, `(t: any)`, `(v: any)`, `(p: any)`, `(entry: any)`. Remove orphaned eslint-disable on line 23. |
| `src/pages/Home.tsx` | 2 | Remove `(api as any)`. Fix `(val: any)` to proper union cast. |
| `src/components/CardDeck.tsx` | 2 | Remove `(api as any)` on castVote/removeVote. |
| `src/components/IdentityFlow.tsx` | 4 | Remove `(api as any)` and `as RoomParticipantOption[]` cast. |
| `src/components/SessionKickedBanner.tsx` | 2 | Remove `(api as any)` and `as RoomParticipant[]` cast. |
| `src/components/ResultsPanel.tsx` | 5 | Remove all `(currentTask as any)` casts. |

---

## Phase 3: Fix Backend `any` Types

### `convex/voting.ts`
Replace hand-rolled types in `getSortedTasksForRoom`:
```typescript
// Before: ctx: { db: { query: Function } }, roomId: string
// After:
async function getSortedTasksForRoom(ctx: MutationCtx, roomId: Id<"rooms">) { ... }
```

### `convex/jira.ts` (7 instances)
1. Change `Promise<any>` in fetch type to `Promise<unknown>`
2. Define `JiraIssueFields` and `JiraSearchResponse` interfaces to replace `Record<string, any>`
3. Remove `(s: any)` in sprint callbacks (now inferred from typed `customfield_10020`)
4. Change `err: any` to `err: unknown` with `instanceof Error` narrowing

### `src/components/TaskListManager.tsx` & `JiraImportModal.tsx`
Change `err: any` catch blocks to `err: unknown` with proper narrowing.

---

## Phase 4: Fix Test `any` Types

### `convex/__tests__/voting.test.ts` (~40 instances)
- Fix module map to use explicit imports (matching pattern from `participants.test.ts`)
- Type helper functions with `TestConvex<typeof schema>`
- Remove all `: any` annotations from `ctx`, `room`, callback params

### `convex/__tests__/jira.test.ts` (~4 instances)
- Delete or rewrite stale tests referencing removed functions (`importFromJira`, `_importFromJiraInternal`)
- Tests reference `jiraBaseUrl` field not in schema -- dead code

---

## Phase 5: Code Quality Improvements

1. **Remove duplicate query**: `listRoomParticipants` is identical to `getParticipants` in `convex/participants.ts`. Remove it, update `IdentityFlow.tsx` to use `getParticipants`.
2. **Fix duplicate Separator**: `TaskListManager.tsx:308-309` renders two consecutive `<Separator />`.
3. **Replace `filter()` with index**: `markStaleOffline` in `participants.ts` -- add `by_connected_heartbeat` index to schema, use `withIndex`.
4. **Add `returns` validators**: Add to all Convex functions per best practices. Priority: `getParticipants`, `getRoom`, `getTasksForRoom`, `getVoteStatus`, `getMyVote`, `getVoteResults`.
5. **Extract inline IIFE**: `TaskListManager.tsx:335-356` has `{(() => {...})()}` -- extract to named component.

---

## Phase Dependencies

```
Phase 1 (session hooks)
   |
   v
Phase 2 (frontend casts) --> Phase 3 (backend any) --> Phase 5 (quality)
                                  |
                                  v
                             Phase 4 (test any)
```

---

## Verification

After each phase:
1. `npx tsc --noEmit` -- zero errors
2. `npx vitest run` -- all tests pass
3. `grep -rn "as any\|: any" src/ convex/ --include="*.ts" --include="*.tsx" | grep -v _generated | grep -v node_modules` -- count decreasing to zero
4. Dev server: room creation, joining, voting, revealing, Jira sync all work

---

## Critical Files

- `src/hooks/useSession.ts` -- root cause fix
- `src/pages/Room.tsx` -- 19 `any` instances (heaviest)
- `convex/jira.ts` -- 7 backend `any` instances
- `convex/voting.ts` -- hand-rolled types
- `convex/__tests__/voting.test.ts` -- ~40 test `any` instances
- `convex/participants.ts` -- duplicate query, filter instead of index
- `convex/schema.ts` -- new index for Phase 5
