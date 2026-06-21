# Incent — Sales Commission Tracking App

## Project Overview

Incent tracks sales commissions and incentive goals for sales agents. The system has two roles:

- **Admin** — syncs sales data from an external source API, assigns customers to agents, and configures per-agent annual goal steps
- **Agent (user)** — views only their own data: total sales, monthly breakdown, and progress through their assigned goal steps

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js (role-based: `admin` | `agent`)
- **State**: React Query (server state) + Zustand (client state)
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint + Prettier

## Project Structure

```
incent/
├── app/
│   ├── (auth)/                  # Login page
│   ├── (admin)/                 # Admin-only routes (middleware protected)
│   │   ├── sync/                # Trigger external API data sync
│   │   ├── agents/              # Manage agents, assign customers, set goals
│   │   └── customers/           # View all customers and assignments
│   ├── (agent)/                 # Agent-only routes (middleware protected)
│   │   ├── dashboard/           # Summary: total sales, monthly chart, goal progress
│   │   └── customers/           # Agent's assigned customers and their sales
│   └── api/
│       ├── sync/                # POST: trigger external API sync (admin only)
│       ├── agents/              # CRUD agents and their goal configs
│       ├── customers/           # Customer assignment endpoints
│       └── sales/               # Sales data queries
├── components/
│   ├── ui/                      # shadcn/ui generated components (do not edit manually)
│   └── features/
│       ├── admin/               # Admin-specific UI (agent management, sync controls)
│       └── agent/               # Agent dashboard UI (goal stepper, sales charts)
├── lib/
│   ├── db.ts                    # Prisma client singleton
│   ├── auth.ts                  # NextAuth config with role checking
│   ├── sync/                    # External API sync logic
│   └── goals/                   # Goal step calculation and progress logic
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── types/
```

## Key Domain Concepts

### Roles
| Role | Access |
|------|--------|
| `admin` | All data, sync controls, agent management, goal configuration |
| `agent` | Own customers only, own sales totals, own goal progress |

### Domain Models

- **Agent**: A sales person with a login account. Has many assigned customers and one GoalConfig per year.
- **Customer**: A customer record pulled from the external API. Belongs to one agent (assigned by admin).
- **Sale**: A sales transaction from the external API, linked to a customer. Has amount, date, and status.
- **GoalConfig**: An admin-defined set of 4–5 goal steps for a specific agent. Each step has a target amount (THB) and a label/reward. Goals are per-agent — not shared or ranked.
- **GoalStep**: One threshold within a GoalConfig, e.g. `{ step: 1, targetAmount: 500000, label: "Bronze" }`.

### Goal Step Logic

- Goals are annual and per-agent (each agent has different targets)
- Steps are sequential: agent must hit step 1 before step 2 unlocks
- Progress = sum of all sales for the agent's assigned customers in the current year
- Admin can configure 4–5 steps per agent; agents see their progress against all steps

### Data Sync

- Admin triggers a sync from the external source API (POST `/api/sync`)
- Sync pulls all sales records and upserts them into the local DB
- After sync, admin reviews and assigns any new unassigned customers to agents
- Sync history (timestamp, records updated) is logged

## Common Commands

```bash
npm run dev                       # Start dev server (localhost:3000)
npm run build                     # Production build
npm run test                      # Run test suite (Vitest)
npm run test:watch                # Watch mode tests
npm run lint                      # ESLint check
npm run typecheck                 # tsc --noEmit
npm run db:migrate                # Run Prisma migrations
npm run db:studio                 # Open Prisma Studio
npm run db:seed                   # Seed development data
npx shadcn@latest add <component> # Add a shadcn/ui component
```

## Code Conventions

- Use server components by default; add `"use client"` only when needed (event handlers, hooks, browser APIs)
- Role-based access is enforced at the middleware level — never rely solely on UI hiding
- API routes check session role before any data access: `if (session.user.role !== 'admin') return 403`
- Agent data queries always filter by `agentId` from the session — never trust client-supplied agent IDs
- All monetary values are stored as integers (satang / cents) to avoid floating-point errors
- Use `zod` for all input validation at API boundaries
- Use shadcn/ui components as the base for all UI — install via `npx shadcn@latest add <component>`
- Extend shadcn/ui components through `className` with Tailwind — do not modify files under `components/ui/`
- Use `cn()` from `lib/utils.ts` to merge Tailwind class names

## Environment Variables

```
DATABASE_URL=             # PostgreSQL connection string
NEXTAUTH_SECRET=          # NextAuth session secret
NEXTAUTH_URL=             # App base URL
EXTERNAL_API_URL=         # Source API base URL for sales data sync
EXTERNAL_API_KEY=         # API key for the external sales data source
```

## Security Rules

- Admin routes under `(admin)/` are protected by middleware — redirect non-admins to `/dashboard`
- Agent routes under `(agent)/` filter all DB queries by `session.user.agentId`
- The sync endpoint is admin-only and rate-limited
- Never expose other agents' data in any agent-facing API response

## Testing

- Unit test the goal progress calculation in `lib/goals/` — pure functions, must be fully covered
- Unit test the sync data transformer in `lib/sync/` — maps external API shape to internal DB shape
- Integration tests for API routes use a test database — do not mock the DB
- Test both admin and agent role access for every protected route
