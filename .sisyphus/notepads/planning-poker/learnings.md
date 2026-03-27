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
