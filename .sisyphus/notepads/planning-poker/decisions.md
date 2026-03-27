# Planning Poker — Decisions


## [2026-03-27 18:46] Task: T3

### Convex Deployment Strategy
- **Decision**: Use `CONVEX_AGENT_MODE=anonymous` for local development
- **Rationale**: Avoids cloud deployment and browser OAuth flow, faster iteration
- **Trade-off**: Local deployment only; cloud migration requires running `npx convex deploy` and authentication later

### Schema Field Types
- **status**: Union of 3 literals (`"lobby"`, `"voting"`, `"revealed"`) instead of enum
  - Convex values API uses literal unions for discriminated types
- **roomCode, sessionId**: Strings for client-supplied IDs (not Convex IDs)
- **_id fields**: Use `v.id("tableName")` for table references
- **Timestamps**: Numbers (milliseconds) for createdAt, joinedAt, submittedAt
- **Optional fields**: `v.optional()` wrapper for nullable fields

### Index Strategy
- Index on roomId fields for fast room-based queries (participants, tasks, votes)
- Compound indexes for multi-field lookups (by_room_session, by_task_participant)
- "by_code" index on roomCode for room lookup from user-friendly codes
- "by_jira_key" for linking Jira tickets to tasks within a room


## [2026-03-27 20:24] Task: F1
- **Decision**: Approve plan compliance for F1.
- **Rationale**: All 11 Must Have items were verified in code and/or required tests, the full suite passed at 117/117, and no runtime Must NOT Have violations were found after dismissing three trivial false positives from grep output.

## [2026-03-27 20:40] Task: F4
- **Decision**: Reject scope fidelity.
- **Rationale**: Forbidden feature review was clean, but 10 of 21 planned tasks were not delivered 1:1. The largest gaps are mismatched Jira backend contracts (`convex/jira.ts` vs planned `triggerJiraImport`/`getImportStatus` flow), incomplete Room integration (`src/pages/Room.tsx` still renders Task 14/15 placeholders), voting history drift in `convex/voting.ts`, and missing root Convex provider wiring in `src/main.tsx`.

## [2026-03-27 20:45] Final Verification Wave Integration Fixes
- **Decision**: Use the frontend alignment path for Jira import instead of adding new Convex exports.
- **Rationale**: `Room.tsx` already subscribes to the room doc, which includes `importStatus` and `importError`; passing those fields into `JiraImportModal` keeps the backend surface smaller and removes the temporary `@ts-expect-error` workaround without changing the overall architecture.
