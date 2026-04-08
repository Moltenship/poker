# Migrate to TanStack Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the app from React Router to TanStack Router with file-based routing and integrated devtools.

**Architecture:** TanStack Router uses file-based routing where routes are defined by the file structure in `src/routes/`. The root layout becomes `__root.tsx`, and nested/dynamic routes follow the naming convention (e.g., `room.$roomCode.tsx` for `/room/:roomCode`). We'll set up the router in `src/router.ts`, initialize it in `main.tsx`, and integrate the devtools package.

**Tech Stack:** @tanstack/react-router, @tanstack/react-router-devtools, Vite (already in place), TypeScript

---

## File Structure Changes

**Create:**
- `src/routes/__root.tsx` - Root layout replacing `src/components/Layout.tsx` usage
- `src/routes/index.tsx` - Home page route
- `src/routes/room.$roomCode.tsx` - Dynamic room route with catch-all
- `src/router.ts` - Router initialization
- `src/routeTree.gen.ts` - Auto-generated (by TanStack router VitePlugin)

**Modify:**
- `src/main.tsx` - Switch from react-router-dom to TanStack Router
- `package.json` - Remove react-router-dom, add @tanstack/react-router and devtools
- `vite.config.ts` - Add TanStack Router VitePlugin for file-based routing

**Delete:**
- `src/router.tsx` - No longer needed

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install TanStack Router packages**

Run:
```bash
npm install @tanstack/react-router @tanstack/react-router-devtools
```

- [ ] **Step 2: Uninstall react-router-dom**

Run:
```bash
npm uninstall react-router-dom
```

- [ ] **Step 3: Verify package.json changes**

Run:
```bash
npm list | grep -E "@tanstack/react-router|react-router-dom"
```

Expected: Should show @tanstack/react-router and @tanstack/react-router-devtools, but NOT react-router-dom.

- [ ] **Step 4: Commit dependencies**

```bash
git add package.json package-lock.json
git commit -m "chore: replace react-router-dom with @tanstack/react-router"
```

---

### Task 2: Update Vite Configuration

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Add TanStack Router VitePlugin**

Update `vite.config.ts` to:

```typescript
import path from "path";
import { fileURLToPath } from "url";

import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@convex": path.resolve(__dirname, "./convex"),
    },
  },
});
```

- [ ] **Step 2: Verify Vite config syntax**

Run:
```bash
npm run typecheck
```

Expected: No errors related to vite.config.ts.

- [ ] **Step 3: Commit Vite changes**

```bash
git add vite.config.ts
git commit -m "chore: add TanStackRouterVite plugin"
```

---

### Task 3: Create Root Route Layout

**Files:**
- Create: `src/routes/__root.tsx`

- [ ] **Step 1: Create routes directory structure**

Run:
```bash
mkdir -p src/routes
```

- [ ] **Step 2: Create root layout component**

Create `src/routes/__root.tsx`:

```typescript
import { Outlet } from "@tanstack/react-router";
import Layout from "@/components/Layout";

export function RootRoute() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
```

- [ ] **Step 3: Verify file exists**

Run:
```bash
ls -la src/routes/__root.tsx
```

Expected: File exists at `src/routes/__root.tsx`.

- [ ] **Step 4: Commit root route**

```bash
git add src/routes/__root.tsx
git commit -m "feat: create root route layout"
```

---

### Task 4: Create Home Route

**Files:**
- Create: `src/routes/index.tsx`

- [ ] **Step 1: Create home route file**

Create `src/routes/index.tsx`:

```typescript
import Home from "@/pages/Home";

export function IndexRoute() {
  return <Home />;
}
```

- [ ] **Step 2: Verify file exists**

Run:
```bash
ls -la src/routes/index.tsx
```

Expected: File exists at `src/routes/index.tsx`.

- [ ] **Step 3: Commit home route**

```bash
git add src/routes/index.tsx
git commit -m "feat: create home route"
```

---

### Task 5: Create Room Dynamic Route

**Files:**
- Create: `src/routes/room.$roomCode.tsx`

- [ ] **Step 1: Create room route file with dynamic segment**

Create `src/routes/room.$roomCode.tsx`:

```typescript
import { useParams } from "@tanstack/react-router";
import Room from "@/pages/Room";

export function RoomRoute() {
  const { roomCode } = useParams({ from: "/room/$roomCode" });

  return <Room roomCode={roomCode} />;
}
```

Note: The `$` prefix in the filename indicates a dynamic route parameter. TanStack Router converts `room.$roomCode.tsx` to the route `/room/:roomCode`.

- [ ] **Step 2: Verify file exists**

Run:
```bash
ls -la src/routes/room.$roomCode.tsx
```

Expected: File exists at `src/routes/room.$roomCode.tsx`.

- [ ] **Step 3: Commit room route**

```bash
git add src/routes/room.$roomCode.tsx
git commit -m "feat: create dynamic room route"
```

---

### Task 6: Create Not Found Route

**Files:**
- Create: `src/routes/__404.tsx`

- [ ] **Step 1: Create catch-all 404 route**

Create `src/routes/__404.tsx`:

```typescript
import NotFound from "@/pages/NotFound";

export function NotFoundRoute() {
  return <NotFound />;
}
```

- [ ] **Step 2: Verify file exists**

Run:
```bash
ls -la src/routes/__404.tsx
```

Expected: File exists at `src/routes/__404.tsx`.

- [ ] **Step 3: Commit 404 route**

```bash
git add src/routes/__404.tsx
git commit -m "feat: create 404 not found route"
```

---

### Task 7: Generate Route Tree and Create Router

**Files:**
- Create: `src/router.ts`
- Create: `src/routeTree.gen.ts` (auto-generated)

- [ ] **Step 1: Build to generate routeTree**

Run:
```bash
npm run build
```

Expected: Build succeeds and generates `src/routeTree.gen.ts`.

- [ ] **Step 2: Create router instance file**

Create `src/router.ts`:

```typescript
import { RootRoute } from "@/routes/__root";
import { IndexRoute } from "@/routes/index";
import { RoomRoute } from "@/routes/room.$roomCode";
import { NotFoundRoute } from "@/routes/__404";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default router;
```

- [ ] **Step 3: Verify router file and routeTree generation**

Run:
```bash
ls -la src/router.ts src/routeTree.gen.ts
```

Expected: Both files exist.

- [ ] **Step 4: Commit router and routeTree**

```bash
git add src/router.ts src/routeTree.gen.ts
git commit -m "feat: create TanStack router instance and auto-generated routeTree"
```

---

### Task 8: Update Main Entry Point

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Update main.tsx to use TanStack Router**

Replace the contents of `src/main.tsx` with:

```typescript
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";
import ReactDOM from "react-dom/client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/providers/SessionProvider";
import router from "@/router";

import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});
convexQueryClient.connect(queryClient);

const App = () => (
  <ConvexProvider client={convex}>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
          <TanStackRouterDevtools router={router} />
          <Toaster />
        </TooltipProvider>
      </SessionProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </ConvexProvider>
);

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
```

Key changes:
- Import `RouterProvider` from `@tanstack/react-router` instead of react-router-dom
- Import `TanStackRouterDevtools` for devtools integration
- Import router from `@/router`
- Add `<TanStackRouterDevtools router={router} />` component in the tree

- [ ] **Step 2: Run typecheck**

Run:
```bash
npm run typecheck
```

Expected: No errors (types should resolve correctly with TanStack Router).

- [ ] **Step 3: Commit main.tsx changes**

```bash
git add src/main.tsx
git commit -m "feat: update main.tsx to use TanStack Router"
```

---

### Task 9: Delete Old Router Configuration

**Files:**
- Delete: `src/router.tsx`

- [ ] **Step 1: Remove old router file**

Run:
```bash
rm src/router.tsx
```

- [ ] **Step 2: Verify deletion**

Run:
```bash
ls src/router.tsx 2>&1
```

Expected: `No such file or directory` error.

- [ ] **Step 3: Commit deletion**

```bash
git add -A
git commit -m "chore: remove old react-router configuration"
```

---

### Task 10: Run Linting and Format Checks

**Files:**
- No file changes, validation only

- [ ] **Step 1: Run linting**

Run:
```bash
npm run lint
```

Expected: All linting passes with no errors.

- [ ] **Step 2: Run format check**

Run:
```bash
npm run format:check
```

Expected: All formatting checks pass.

- [ ] **Step 3: Run typecheck**

Run:
```bash
npm run typecheck:tsgo
```

Expected: All type checks pass.

- [ ] **Step 4: Create validation commit**

If any issues were fixed:
```bash
git add -A
git commit -m "chore: fix linting and formatting issues"
```

If no changes were made:
```bash
git log --oneline -1
```

---

### Task 11: Test the Application

**Files:**
- No file changes, testing only

- [ ] **Step 1: Run test suite**

Run:
```bash
npm run test
```

Expected: All tests pass without errors related to routing.

- [ ] **Step 2: Test dev server locally**

Run:
```bash
npm run dev
```

Expected: Dev server starts without errors. Open http://localhost:5173 and verify:
- Home page loads at `/`
- Can navigate to a room (e.g., `/room/test123`)
- 404 page shows for invalid routes
- TanStack Router Devtools appears (usually in bottom right corner)

- [ ] **Step 3: Verify devtools work**

In the browser dev tools, open the TanStack Router Devtools panel and verify:
- Route tree is visible
- Can see current active route
- Route parameters are displayed correctly

---

### Task 12: Final Verification and Cleanup

**Files:**
- No file changes, verification only

- [ ] **Step 1: Verify all imports are clean**

Run:
```bash
grep -r "react-router" src/ --include="*.tsx" --include="*.ts" 2>/dev/null || echo "✓ No react-router imports found"
```

Expected: No matches (no remaining react-router imports).

- [ ] **Step 2: Run full build**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors or warnings.

- [ ] **Step 3: Preview production build**

Run:
```bash
npm run preview
```

Expected: Preview starts and app functions correctly.

- [ ] **Step 4: Final commit (if needed)**

If any cleanup changes were made:
```bash
git add -A
git commit -m "chore: final verification and cleanup post-migration"
```

Verify clean git status:
```bash
git status
```

Expected: Working directory clean.

---

## Spec Coverage Checklist

- ✅ Install devtools: TanStackRouterDevtools integrated in main.tsx
- ✅ Use file-based routing: Routes defined in `src/routes/` directory structure
- ✅ Migrate from react-router: All react-router-dom imports replaced with @tanstack/react-router
- ✅ Docs integrated: Docs available in @tanstack/react-router package (via IDE/npm)
- ✅ All validation passes: npm run format:check, lint, and typecheck:tsgo required before completion

---

## Post-Migration Notes

After this migration is complete:

1. **Route Type Safety**: TanStack Router provides better type safety for route parameters. Use `useParams()` with the `from` parameter to get fully typed params.

2. **Devtools**: The TanStack Router Devtools can be toggled with a keyboard shortcut (usually Ctrl+Alt+R) and shows the route tree and current route state.

3. **File-Based Routing Conventions**:
   - `index.tsx` = root of that directory
   - `$paramName.tsx` = dynamic segment (`:paramName` in old router)
   - `__root.tsx` = root layout wrapper
   - `__404.tsx` = catch-all not found route
   - Nested routes go in subdirectories with their own index.tsx

4. **No More Catch-All Splats**: The `/*` wildcard is no longer needed; use `__404.tsx` for catch-all.

---
