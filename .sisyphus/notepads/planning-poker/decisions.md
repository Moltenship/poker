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
