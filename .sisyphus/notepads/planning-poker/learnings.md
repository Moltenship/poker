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
