# Incent — Project Plan

## Overview

Two-phase plan: Phase 1 runs fully local with mock data to validate the product. Phase 2 wires up the real external API and deploys to AWS production.

---

## Phase 1 — Local Development (Mock Data)

Goal: build and validate the full app UI and logic with seeded mock data before connecting any real data source.

### Step 1 — Project Scaffold

- [ ] `npx create-next-app@latest incent --typescript --tailwind --app --src-dir no`
- [ ] Install shadcn/ui: `npx shadcn@latest init`
- [ ] Install dependencies: `prisma`, `@prisma/client`, `next-auth`, `zod`, `@tanstack/react-query`, `zustand`
- [ ] Setup `docker-compose.yml` for local PostgreSQL
- [ ] Create `.env.example` with all required vars

### Step 2 — Database Schema

Define Prisma schema with all models:
- `User` (admin | agent, linked to NextAuth)
- `Agent` (profile linked to User)
- `Customer` (agentId nullable for unassigned)
- `Sale` (amount in satang, date, customerId)
- `GoalConfig` (agentId, year)
- `GoalStep` (step 1–5, targetAmount, label)
- `SyncLog` (timestamp, recordsUpdated, status)

Run first migration: `pnpm db:migrate`

### Step 3 — Auth

- [ ] Setup NextAuth with credentials provider (email + password)
- [ ] Add role (`admin` | `agent`) to session
- [ ] Middleware: protect `(admin)/` and `(agent)/` routes
- [ ] Login page UI with shadcn/ui `Form` + `Input` + `Button`

### Step 4 — Mock Seed Data

`prisma/seed.ts` must include:
- 1 admin account
- 3–5 agent accounts
- 15–20 customers (mix of assigned and unassigned)
- 12 months of sales data for current year per agent
- GoalConfigs with 4–5 steps at realistic THB amounts
- Edge cases: agent with zero sales, customer above all goal steps

### Step 5 — Admin Features

- [ ] Agent list page — create, edit, deactivate agents
- [ ] Customer list page — view all, filter unassigned
- [ ] Customer assignment UI — bulk assign customers to agents
- [ ] Goal config UI — set 4–5 steps (amount + label) per agent per year
- [ ] Sync page — trigger mock sync, view sync log history

### Step 6 — Agent Dashboard

- [ ] Summary card — total YTD sales (THB)
- [ ] Monthly bar chart — sales per month for current year (recharts)
- [ ] Goal stepper — 4–5 steps showing completed / current / locked
- [ ] Customer table — assigned customers with individual sales totals

### Step 7 — API Routes

All routes return typed `ApiResponse<T>` with Zod-validated inputs:

| Route | Method | Role | Description |
|---|---|---|---|
| `/api/auth/[...nextauth]` | * | public | NextAuth handler |
| `/api/agents` | GET, POST | admin | List / create agents |
| `/api/agents/:id` | GET, PUT | admin | Agent detail / update |
| `/api/agents/:id/goals` | GET, PUT | admin | Goal config for agent |
| `/api/customers` | GET | admin | All customers |
| `/api/customers/:id/assign` | PUT | admin | Assign customer to agent |
| `/api/sync` | POST | admin | Trigger data sync |
| `/api/me/dashboard` | GET | agent | Own sales + goal progress |
| `/api/me/customers` | GET | agent | Own customers + sales |

### Step 8 — Testing

- [ ] Unit tests: goal progress calculation (`lib/goals/progress.ts`)
- [ ] Unit tests: sync data transformer (`lib/sync/transformer.ts`)
- [ ] Integration tests: API routes with test DB
- [ ] Role access tests: every protected route tested with wrong role

---

## Phase 2 — Production on AWS

Goal: connect real external API, deploy to AWS via GitHub Actions.

### Infrastructure Overview

```
GitHub Actions (CI/CD)
  │
  ├── Build & push Docker image → AWS ECR
  └── Deploy → AWS ECS (Fargate)
        │
        ├── Next.js container (port 3000)
        └── AWS RDS PostgreSQL
              │
              └── External Sales API (HTTPS, API key)
```

### AWS Services Required

| Service | Purpose |
|---|---|
| **ECR** | Docker image registry |
| **ECS Fargate** | Run containerized Next.js app (serverless containers) |
| **RDS (PostgreSQL)** | Production database |
| **ALB** | Application Load Balancer (HTTPS termination) |
| **ACM** | SSL certificate for custom domain |
| **Secrets Manager** | Store DATABASE_URL, NEXTAUTH_SECRET, API keys |
| **VPC** | Private networking for ECS + RDS |

### Step 1 — Dockerfile

Multi-stage build:
1. `deps` — install node_modules
2. `builder` — `pnpm build`
3. `runner` — minimal image with only production output

### Step 2 — AWS Setup (one-time manual)

```bash
# Create ECR repository
aws ecr create-repository --repository-name incent --region ap-southeast-1

# Create ECS cluster
aws ecs create-cluster --cluster-name incent-cluster

# Create RDS PostgreSQL instance (via console or terraform)
# Store connection string in Secrets Manager
```

### Step 3 — GitHub Actions Secrets

Add these to GitHub repo → Settings → Secrets:

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `AWS_REGION` | `ap-southeast-1` |
| `ECR_REGISTRY` | `<account-id>.dkr.ecr.ap-southeast-1.amazonaws.com` |
| `ECR_REPOSITORY` | `incent` |
| `ECS_CLUSTER` | `incent-cluster` |
| `ECS_SERVICE` | `incent-service` |
| `CONTAINER_NAME` | `incent` |

### Step 4 — GitHub Actions Workflow

See `.github/workflows/deploy.yml` — triggers on push to `main`.

Pipeline steps:
1. Lint + typecheck + test
2. Build Docker image
3. Push to ECR with `git SHA` tag + `latest`
4. Update ECS task definition with new image
5. Deploy to ECS service (rolling update)
6. Wait for service to stabilize

### Step 5 — External API Integration

- Replace mock sync in `lib/sync/` with real HTTP client
- Map external API response shape to internal schema via transformer
- Add retry logic and error reporting to sync endpoint
- Test with real API credentials in staging environment first

### Step 6 — Environment Variables (Production)

All secrets stored in AWS Secrets Manager, injected into ECS task definition at runtime:

```
DATABASE_URL          ← RDS connection string
NEXTAUTH_SECRET       ← random 32-char string
NEXTAUTH_URL          ← https://yourdomain.com
EXTERNAL_API_URL      ← real external API base URL
EXTERNAL_API_KEY      ← real API key
```

---

## Version Milestones

| Version | Milestone |
|---|---|
| `v0.1.0` | Initial project setup (CLAUDE.md, skill.md) |
| `v0.2.0` | Project scaffold + DB schema + auth |
| `v0.3.0` | Admin features complete |
| `v0.4.0` | Agent dashboard complete |
| `v0.5.0` | Full local app with mock data — Phase 1 complete |
| `v1.0.0` | Production deploy on AWS — Phase 2 complete |
