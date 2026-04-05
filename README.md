# Planning Poker

A real-time planning poker app for agile teams. Estimate tasks together using configurable card sets, with optional Jira Cloud integration for importing backlog items.

## Features

- **Real-time voting** — see who has voted and reveal results together
- **Configurable card sets** — Fibonacci, extended Fibonacci, or custom values
- **Jira integration** — import tasks from Jira Cloud with sprint and issue type filtering
- **Hours estimation** — optional hours field per task, independent from card votes
- **Session-based identity** — no sign-up required, just enter your name
- **Cross-device takeover** — rejoin from another browser or device
- **Dark/light theme** — toggle between themes
- **Room history** — view and revisit past rooms

## Tech Stack

| Layer      | Technology                                                               |
| ---------- | ------------------------------------------------------------------------ |
| Frontend   | React 19, React Router, TypeScript                                       |
| Styling    | Tailwind CSS 4, shadcn/ui                                                |
| Backend    | [Convex](https://convex.dev) (real-time database + serverless functions) |
| Build      | Vite                                                                     |
| Testing    | Vitest, React Testing Library                                            |
| Linting    | OxLint, OxFmt                                                            |
| Deployment | Vercel                                                                   |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd poker
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Convex**

   ```bash
   npx convex dev
   ```

   On first run this will create a new Convex project and generate a `.env.local` file with your `VITE_CONVEX_URL`.
   If you already have a Convex deployment, copy `.env.example` to `.env.local` and set `VITE_CONVEX_URL` manually instead.

4. **Start development**

   ```bash
   npm run dev
   ```

   This runs the Vite dev server and Convex backend concurrently. Open [http://localhost:5173](http://localhost:5173).

### Jira Integration (optional)

Set server-side environment variables on your Convex deployment:

```bash
npx convex env set JIRA_BASE_URL "https://your-org.atlassian.net"
npx convex env set JIRA_EMAIL "you@example.com"
npx convex env set JIRA_API_TOKEN "your-api-token"
```

Generate an API token at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).

## Scripts

| Command                | Description                                  |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Start frontend + backend in development mode |
| `npm run dev:frontend` | Start Vite dev server only                   |
| `npm run dev:backend`  | Start Convex dev server only                 |
| `npm run dashboard`    | Open the Convex dashboard                    |
| `npm run build`        | Type-check and build for production          |
| `npm run preview`      | Preview production build locally             |
| `npm test`             | Run tests                                    |
| `npm run typecheck`    | Type-check with TypeScript                   |
| `npm run typecheck:tsgo` | Type-check with TSGo                       |
| `npm run lint`         | Lint with OxLint                             |
| `npm run lint:fix`     | Lint and auto-fix                            |
| `npm run format`       | Format with OxFmt                            |
| `npm run format:check` | Check formatting                             |
| `npm run check`        | Lint + format check                          |

## Project Structure

```
src/
  components/     # React components
    ui/           # shadcn/ui primitives
  pages/          # Route-level pages (Home, Room, History)
  hooks/          # Custom hooks (useSession, useIdentity, useTheme)
  lib/            # Utilities (card sets, vote averaging, ADF parsing)
  providers/      # React context providers
convex/
  schema.ts       # Database schema (rooms, participants, tasks, votes)
  rooms.ts        # Room CRUD
  participants.ts # Join/leave/heartbeat
  voting.ts       # Vote casting, reveal, results
  tasks.ts        # Task management
  jira.ts         # Jira Cloud integration
  crons.ts        # Scheduled jobs (stale participant cleanup)
  lib/            # Backend utilities (session wrappers)
```

## Deployment

The app is configured for deployment on **Vercel**:

```bash
npx convex deploy --cmd 'npm run build'
```

Set `VITE_CONVEX_URL` in your Vercel environment variables pointing to your production Convex deployment, and set the Jira env vars on the Convex dashboard if needed.

## License

ISC
