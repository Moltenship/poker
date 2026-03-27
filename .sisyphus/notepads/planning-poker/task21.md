## Task 21: Vercel Deployment Config, Env Vars, Build Verification

### Completed Actions
1. **Created `vercel.json`** — SPA rewrite config for Vite output
   - `buildCommand`: "npm run build"
   - `outputDirectory`: "dist"
   - `framework`: "vite"
   - `rewrites`: Configures `/(.*) → /index.html` for client-side routing (handles deep links like `/room/abc123`)

2. **Created `.env.example`** — Environment variable template
   - Documents `VITE_CONVEX_URL` (required for Vercel)
   - Added comments explaining that Jira credentials are Convex server-side env vars, not Vercel env vars
   - Includes instructions for setting Jira credentials via `npx convex env set`

3. **Fixed TypeScript Issues**
   - Removed unused `@ts-expect-error` directives from `AddTaskForm.tsx` and `TaskListManager.tsx` (strict mode caught unused suppressions)
   - Convex-generated API types are correctly imported and typed

4. **Verified Build**
   - `npm run build` completed successfully (exit code 0)
   - `dist/index.html` exists (461 bytes)
   - Assets compiled: Geist fonts, CSS (42.11 KB), JS (518.57 KB minified)
   - Warnings about chunk size are expected for Vite SPA

5. **Created Git Commit**
   - Commit: `infra: add Vercel deployment config`
   - Files: `vercel.json`, `.env.example`

### Build Verification Results
```
✓ built in 608ms
dist/index.html (0.46 kB gzip)
dist/assets/index-*.css (42.11 kB → 8.15 kB gzip)
dist/assets/index-*.js (518.57 kB → 166.07 kB gzip)
```

### Key Decisions
- **SPA Rewrites**: The `/(.*) → /index.html` rewrite is critical for React Router deep linking on Vercel. Without it, direct navigation to `/room/abc123` would return 404.
- **Environment Variables**: Only `VITE_CONVEX_URL` is set in Vercel. Jira credentials are Convex-side server environment variables (set via `npx convex env set`), not client-side env vars.
- **No Additional Tooling**: No CI/CD setup, custom domains, or server functions added — kept to minimal viable Vercel configuration.

### Status: ✅ Complete
All acceptance criteria met. Ready for deployment to Vercel.
