# Incent — Sales Commission Tracking App

## Project Overview

Incent tracks sales commissions and incentive goals for sales agents. The system has two roles:

- **Admin** — syncs sales data from an external source API, assigns customers to agents, and configures per-agent annual goal steps
- **Agent (user)** — views only their own data: total sales, monthly breakdown, and progress through their assigned goal steps

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) + TypeScript (strict) |
| UI | Tailwind CSS + shadcn/ui |
| Auth | NextAuth.js (role-based: `admin` \| `agent`) |
| API Layer | AWS API Gateway + API Key |
| Database | PostgreSQL on AWS RDS (via Lambda behind API Gateway) |
| Container | Docker (multi-stage) |
| CI/CD | GitHub Actions → AWS ECR → AWS ECS Fargate |
| State | React Query (server state) + Zustand (client state) |
| Testing | Vitest + React Testing Library |
| Linting | ESLint + Prettier |

## Data Access Architecture

**The app never connects to PostgreSQL directly.** All reads and writes go through AWS API Gateway.

```
Next.js App (browser / server components)
    │
    ▼
lib/api-client/              ← single abstraction layer
    │
    ├── [test/local]  →  __tests__/fixtures/   (mock JSON handlers)
    └── [production]  →  AWS API Gateway (HTTPS + API Key header)
                              │
                              ▼
                         AWS Lambda
                              │
                              ▼
                         AWS RDS — PostgreSQL
```

- `lib/api-client/` exports typed functions (`getAgentDashboard()`, `upsertSale()`, etc.)
- In test mode (`NODE_ENV=test`), the client reads from `__tests__/fixtures/` — no network calls
- In production, the client sends requests to `AWS_API_GATEWAY_URL` with `x-api-key` header
- Next.js API routes call `lib/api-client/` — they do **not** use Prisma in production

## Project Structure

```
incent/
├── app/
│   ├── (auth)/                      # Login page
│   ├── (admin)/                     # Admin-only routes (middleware protected)
│   │   ├── sync/                    # Trigger external data sync, view sync logs
│   │   ├── agents/                  # Create/edit agents, set goal configs
│   │   └── customers/               # View all customers, assign to agents
│   ├── (agent)/                     # Agent-only routes (middleware protected)
│   │   ├── dashboard/               # Total sales, monthly chart, goal progress
│   │   └── customers/               # Agent's own customers + sales
│   └── api/
│       ├── auth/[...nextauth]/      # NextAuth handler
│       ├── agents/                  # Agent CRUD + goal config endpoints
│       ├── customers/               # Customer list + assignment endpoints
│       ├── sales/                   # Sales query endpoints
│       └── sync/                    # Trigger sync (admin only)
│
├── components/
│   ├── ui/                          # shadcn/ui generated (do not edit manually)
│   └── features/
│       ├── admin/                   # Admin UI: agent table, assignment modal, sync panel
│       └── agent/                   # Agent UI: goal stepper, sales chart, customer table
│
├── lib/
│   ├── api-client/                  # ← Data access abstraction
│   │   ├── index.ts                 # Re-exports all client functions
│   │   ├── agents.ts                # Agent CRUD calls
│   │   ├── customers.ts             # Customer + assignment calls
│   │   ├── sales.ts                 # Sales query calls
│   │   ├── goals.ts                 # Goal config calls
│   │   └── sync.ts                  # Sync trigger call
│   ├── auth.ts                      # NextAuth config with role checking
│   ├── goals/
│   │   └── progress.ts              # Pure function: calculate goal step progress
│   └── utils.ts                     # cn() and shared helpers
│
├── __tests__/
│   ├── fixtures/                    # ← Mock data (used instead of API Gateway in tests)
│   │   ├── users.json
│   │   ├── agents.json
│   │   ├── customers.json
│   │   ├── sales.json
│   │   ├── goal_configs.json
│   │   ├── goal_steps.json
│   │   └── sync_logs.json
│   ├── unit/                        # Pure function unit tests
│   │   └── goals/
│   │       └── progress.test.ts
│   └── integration/                 # API route integration tests (uses fixtures)
│       ├── agents.test.ts
│       ├── customers.test.ts
│       └── sales.test.ts
│
├── types/
│   ├── api.ts                       # ApiResponse<T> wrapper type
│   ├── domain.ts                    # User, Agent, Customer, Sale, GoalConfig, GoalStep
│   └── next-auth.d.ts               # Extended session types
│
├── prisma/                          # Schema only — migrations run via separate Lambda/script
│   └── schema.prisma
│
├── .github/workflows/
│   └── deploy.yml                   # CI/CD pipeline
├── Dockerfile
├── docker-compose.yml               # Local PostgreSQL (for schema reference / migrations)
└── .env.example
```

## Key Domain Concepts

### Roles
| Role | Access |
|------|--------|
| `admin` | All data, sync controls, agent management, goal configuration |
| `agent` | Own customers only, own sales totals, own goal progress |

### Domain Models
See `database_diagram.md` for full schema. Summary:

| Table | Description |
|-------|-------------|
| `users` | Auth accounts for admin and agents |
| `agents` | Agent profile linked 1:1 to a user |
| `customers` | Customers pulled from external API, assigned to one agent |
| `sales` | Sales transactions per customer (amount in satang) |
| `goal_configs` | Per-agent per-year goal configuration |
| `goal_steps` | 4–5 thresholds within a goal config |
| `otp_requests` | OTP tokens for agent email login (expires 10 min, max 5 attempts) |
| `sync_logs` | History of every data sync run |

Every table has: `is_active`, `created_by`, `created_at`, `updated_by`, `updated_at`.

### Goal Step Logic
- Goals are annual and per-agent — each agent has different targets
- Steps 1–5 are sequential; agent progresses as cumulative YTD sales grow
- Progress = `SUM(sales.amount_satang)` for agent's approved sales in current year
- Calculation lives in `lib/goals/progress.ts` — pure function, no API calls

### Data Sync
- Admin triggers POST `/api/sync` → calls API Gateway → Lambda → pulls external API → upserts into RDS
- New customers from sync start with `agent_id = NULL` (unassigned)
- Every sync is logged in `sync_logs`

## Common Commands

```bash
pnpm dev                          # Start dev server (localhost:3000)
pnpm build                        # Production build
pnpm test                         # Run test suite (Vitest)
pnpm test:watch                   # Watch mode
pnpm lint                         # ESLint check
pnpm typecheck                    # tsc --noEmit
docker compose up -d              # Start local PostgreSQL (schema reference)
npx shadcn@latest add <component> # Add a shadcn/ui component
```

## Code Conventions

- **No direct DB access from Next.js** — always go through `lib/api-client/`
- All API client functions return `ApiResponse<T>` — handle both success and error shapes
- Role-based access enforced at middleware level — never rely on UI hiding alone
- Next.js API routes check session role: `if (session.user.role !== 'admin') return 403`
- Agent routes filter by `session.user.agentId` — never trust client-supplied agent IDs
- All monetary values are `BIGINT` in satang — never use float for money
- Use `zod` for all input validation at API boundaries
- Use shadcn/ui components as base UI — install via `npx shadcn@latest add <component>`
- Never edit files under `components/ui/` — extend via `className` + Tailwind
- Use `cn()` from `lib/utils.ts` for conditional class names

## Authentication

See `auth_flow.md` for full flow diagrams and implementation details.

| Role | Method | Controlled by |
|------|--------|--------------|
| Admin | Email + Password (basic) or Azure AD SSO | `ADMIN_AUTH_MODE=basic\|azure` |
| Agent | Email OTP (6 digits, 10 min expiry, max 5 attempts) | always OTP |

**Test mode:** when `NODE_ENV !== 'production'`, the OTP is displayed directly on the login page — no email service needed. The banner is rendered server-side and will never appear in production builds.

**Azure AD:** only loaded when `ADMIN_AUTH_MODE=azure`. NextAuth verifies the Microsoft account email exists in the `users` table before creating a session.

## Environment Variables

```bash
# Auth
NEXTAUTH_SECRET=          # Random 32-char string
NEXTAUTH_URL=             # App base URL (http://localhost:3000 in dev)

# Admin auth mode: "basic" | "azure"
ADMIN_AUTH_MODE="basic"

# Azure AD (only required when ADMIN_AUTH_MODE=azure)
AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID=""

# OTP settings
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=5

# Email service for OTP (leave empty = show OTP on UI instead)
EMAIL_SERVICE_URL=""
EMAIL_SERVICE_KEY=""

# AWS API Gateway (production)
AWS_API_GATEWAY_URL=      # https://<id>.execute-api.<region>.amazonaws.com/<stage>
AWS_API_GATEWAY_KEY=      # API key for x-api-key header

# Local PostgreSQL (schema reference / migrations only)
DATABASE_URL=             # postgresql://incent:incent@localhost:5432/incent_dev
```

## Test / Mock Data

All test data lives in `__tests__/fixtures/*.json`. These files are the source of truth for local development and CI tests.

- `lib/api-client/` checks `NODE_ENV === 'test'` and reads from fixtures instead of calling API Gateway
- Fixtures must cover: all roles, assigned + unassigned customers, full year of monthly sales, agents at each goal step stage
- Never use real customer names or emails in fixture files

## Security Rules

- API Gateway URL and key are server-side only — never exposed to the browser
- Admin routes protected by Next.js middleware — redirect non-admins
- Agent routes always scope queries to `session.user.agentId`
- Sync endpoint is admin-only and should be rate-limited at API Gateway level

## Testing

- Unit tests: `lib/goals/progress.ts` — pure functions, must be fully covered
- Integration tests: Next.js API routes using fixture data (no real network calls)
- Role tests: every protected route tested with wrong role (expect 403)
- Never mock `lib/api-client/` in integration tests — let it use fixture mode naturally
