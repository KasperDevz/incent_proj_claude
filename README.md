# Incent

Sales commission tracking app for sales teams. Admins sync sales data, assign customers to agents, and configure per-agent annual goal steps. Agents view their own sales totals, monthly breakdown, and goal progress.

## Roles

| Role | Capabilities |
|---|---|
| **Admin** | Sync data from external API, assign customers to agents, configure 4–5 goal steps per agent |
| **Agent** | View own sales total, monthly chart, annual goal step progress |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js (role-based) |
| Container | Docker |
| CI/CD | GitHub Actions |
| Cloud | AWS ECS (Fargate) + ECR + RDS |

## Architecture

```
Browser
  │
  ▼
Next.js App (App Router)
  ├── (auth)/          ← login
  ├── (admin)/         ← admin dashboard, sync, agent management
  └── (agent)/         ← agent dashboard, goal progress
  │
  ▼
Prisma ORM
  │
  ▼
PostgreSQL
  │
  └── External Sales API (sync on demand, admin only)
```

## Local Development (Mock Data)

### Prerequisites

- Node.js 20+
- Docker Desktop
- pnpm (`npm i -g pnpm`)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/KasperDevz/incent_proj_claude.git
cd incent_proj_claude

# 2. Install dependencies
pnpm install

# 3. Start local PostgreSQL via Docker
docker compose up -d db

# 4. Copy environment variables
cp .env.example .env.local

# 5. Run database migrations
pnpm db:migrate

# 6. Seed mock data
pnpm db:seed

# 7. Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

**Mock accounts (from seed):**
| Email | Password | Role |
|---|---|---|
| admin@incent.dev | password | admin |
| agent1@incent.dev | password | agent |
| agent2@incent.dev | password | agent |

### Local Services

```bash
docker compose up -d        # Start PostgreSQL
pnpm db:studio              # Open Prisma Studio (localhost:5555)
pnpm dev                    # Start Next.js dev server (localhost:3000)
docker compose down         # Stop all services
```

## Production Deployment

Merging to `main` triggers GitHub Actions which:
1. Runs lint + typecheck + tests
2. Builds Docker image
3. Pushes to AWS ECR
4. Deploys to AWS ECS (Fargate)

See [project_plan.md](./project_plan.md) for full deployment setup guide.

## Branch Strategy

```
main    ← production, tagged on every release
  └── dev  ← integration, all features merge here first
        └── feature/<name>
        └── fix/<name>
        └── hotfix/<name>   ← branches from main, merges to main + dev
```

See [skill.md](./skill.md) for full git workflow commands.
