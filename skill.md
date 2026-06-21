# Incent — Project Skills

Custom skill prompts for accelerating development on this project.

---

## `/git`
**Git workflow — branch strategy, versioning, and release**

### Branch Strategy

```
main        ← production-ready only, protected
  └── dev   ← integration branch, all features merge here first
        └── feature/<name>   ← new features
        └── fix/<name>       ← bug fixes
        └── hotfix/<name>    ← critical fixes that go directly to main
```

**Rules:**
- Never commit directly to `main` or `dev`
- `main` receives merges only from `dev` (release) or `hotfix/*` (emergency)
- Every merge to `main` must be tagged with a version

---

### Versioning — Semantic Versioning (SemVer)

Format: `vMAJOR.MINOR.PATCH`

| Change type | Bump | Example |
|---|---|---|
| Breaking change / major feature | MAJOR | `v1.0.0 → v2.0.0` |
| New feature, backward compatible | MINOR | `v1.0.0 → v1.1.0` |
| Bug fix, small patch | PATCH | `v1.0.0 → v1.0.1` |

---

### How to Use

#### 1. Start a new feature
```bash
git checkout dev
git pull origin dev
git checkout -b feature/<feature-name>
# e.g. feature/agent-dashboard, feature/goal-config, feature/sync-api
```

#### 2. Commit during development
Use conventional commit messages:
```bash
git add <files>
git commit -m "feat: add goal step progress calculation"
git commit -m "fix: correct sales filter by agentId"
git commit -m "chore: update dependencies"
git commit -m "refactor: extract sync transformer to lib/sync"
git commit -m "test: add unit tests for goal progress edge cases"
```

Prefixes: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`, `perf`

#### 3. Merge feature → dev
```bash
git checkout dev
git pull origin dev
git merge --no-ff feature/<feature-name> -m "merge: feature/<feature-name> into dev"
git push origin dev
git branch -d feature/<feature-name>
```

#### 4. Release — merge dev → main + tag
```bash
# 1. Make sure dev is up to date and passing tests
git checkout dev && git pull origin dev

# 2. Merge into main
git checkout main
git pull origin main
git merge --no-ff dev -m "release: v1.2.0"

# 3. Tag the release
git tag -a v1.2.0 -m "Release v1.2.0 — add agent dashboard and goal config"
git push origin main
git push origin v1.2.0
```

#### 5. Hotfix — fix critical bug on main
```bash
git checkout main
git pull origin main
git checkout -b hotfix/<description>

# fix the bug, commit
git commit -m "fix: <description>"

# merge back to main AND dev
git checkout main
git merge --no-ff hotfix/<description> -m "hotfix: <description>"
git tag -a v1.2.1 -m "Hotfix v1.2.1 — <description>"
git push origin main
git push origin v1.2.1

git checkout dev
git merge --no-ff hotfix/<description>
git push origin dev

git branch -d hotfix/<description>
```

#### 6. View tags and history
```bash
git tag                        # list all tags
git tag -l "v1.*"              # filter tags
git show v1.2.0                # show tag details
git log --oneline --graph --all  # visual branch history
git log main..dev --oneline    # commits in dev not yet in main
```

#### 7. Delete a wrong tag (before push)
```bash
git tag -d v1.2.0              # delete local tag
git push origin :refs/tags/v1.2.0  # delete remote tag (use with caution)
```

---

### Quick Reference

| Task | Command |
|---|---|
| New feature branch | `git checkout -b feature/<name> dev` |
| New fix branch | `git checkout -b fix/<name> dev` |
| Merge feature to dev | `git checkout dev && git merge --no-ff feature/<name>` |
| Release to main | `git checkout main && git merge --no-ff dev` |
| Tag a release | `git tag -a vX.Y.Z -m "Release vX.Y.Z"` |
| Push tag | `git push origin vX.Y.Z` |
| Hotfix | branch from `main`, merge back to `main` + `dev`, bump PATCH |

---

## `/new-ui-component`
**Scaffold a new feature UI component using shadcn/ui + Tailwind**

When building a new UI component in `components/features/`:
1. Check if needed shadcn/ui primitives are installed — if not, run `npx shadcn@latest add <component>`
2. Compose from shadcn/ui primitives — never raw HTML for interactive elements
3. Use `cn()` from `lib/utils.ts` for conditional Tailwind classes
4. Keep server component unless interactivity needed (`"use client"` only then)
5. No inline styles — Tailwind utilities only

Commonly used shadcn/ui components: `Button`, `Table`, `Dialog`, `Form`, `Input`, `Select`, `Badge`, `Card`, `Tabs`, `Sheet`, `Progress`.

Ask me: component name, what it displays, any interactive behavior needed.

---

## `/sync-flow`
**Explain or extend the external API sync flow**

The sync flow lives in `lib/sync/`. Steps:
1. Admin triggers POST `/api/sync`
2. Fetches all sales records from `EXTERNAL_API_URL` using `EXTERNAL_API_KEY`
3. Transforms external shape → internal `Sale` + `Customer` schema
4. Upserts records into DB (update if exists, insert if new)
5. Logs sync result (timestamp, counts) to `SyncLog` table
6. Returns summary to admin UI

Rules:
- Sync is admin-only and idempotent — running it twice must not create duplicates
- New customers from the sync start unassigned (`agentId: null`) — admin assigns them separately
- The transformer in `lib/sync/transformer.ts` is a pure function — unit test it against real API response fixtures

Ask me: what part of the sync to change (fetch, transform, upsert, or logging).

---

## `/assign-customers`
**Add or modify customer-to-agent assignment logic**

Assignment flow:
1. Admin sees all customers with `agentId: null` (unassigned) after a sync
2. Admin selects customers and assigns to an agent via the UI
3. PUT `/api/customers/:id/assign` updates `Customer.agentId`
4. From that point, the agent sees the customer in their dashboard

Rules:
- A customer belongs to exactly one agent at a time
- Reassigning a customer (moving from one agent to another) keeps all historical sales intact
- The agent dashboard always queries customers by `session.user.agentId` — never by client input

When modifying: update the API route, the Prisma query, and the admin assignment UI component.

---

## `/configure-goals`
**Set up or modify per-agent goal steps**

Goal config lives in `lib/goals/`. Structure:
- Each agent has one `GoalConfig` per calendar year
- A `GoalConfig` has 4–5 `GoalStep` records: `{ step, targetAmount, label }`
- Steps are sequential — agent progresses through them as cumulative annual sales grow

To add/edit a goal config:
1. Admin opens agent detail page and sets 4–5 steps with target amounts and labels
2. POST/PUT `/api/agents/:id/goals` saves the config
3. Agent dashboard reads their current year's `GoalConfig` and calculates progress

Goal progress calculation (in `lib/goals/progress.ts`):
```
totalSales = sum of all Sale.amount for agent's customers in current year
currentStep = highest GoalStep where totalSales >= targetAmount
```

This is a pure function — unit test it with edge cases (zero sales, exactly at boundary, above all steps).

Ask me: how many steps, whether to change the progress calculation, or how to display progress in the UI.

---

## `/agent-dashboard`
**Build or modify the agent dashboard view**

The agent dashboard (`app/(agent)/dashboard/`) shows:
1. **Total sales** — sum of all assigned customer sales (all time or YTD)
2. **Monthly breakdown** — bar chart by month for current year
3. **Goal progress** — step-by-step progress indicator (e.g. shadcn Progress or custom stepper)

Data source: all from session-scoped queries — `agentId` always comes from `session.user.agentId`.

UI components to use:
- `Card` for summary numbers
- `recharts` (or similar) for the monthly chart
- Custom `GoalStepper` component built on shadcn `Progress` + `Badge`

Rules:
- Never show data from other agents — all queries filter by session agentId
- Goal steps should show: completed (filled), current (in-progress), locked (future)

Ask me: which part to build or change (totals card, chart, or goal stepper).

---

## `/new-api-route`
**Scaffold a typed Next.js API route**

Create a new route under `app/api/`. The route must:
1. Check session and role before any logic: `if (!session || session.user.role !== 'admin') return 403`
2. Validate request body/params with a `zod` schema
3. Return a typed response using an `ApiResponse<T>` wrapper
4. Use Prisma client from `lib/db.ts`
5. For agent routes: always filter queries by `session.user.agentId`

Ask me: resource name, HTTP methods, which role can access it (admin/agent/both).

---

## `/seed-data`
**Add or update development seed data**

Seed file: `prisma/seed.ts`

Seed must include:
1. One admin user account
2. 3–5 agent user accounts
3. 10–20 customers, mix of assigned and unassigned
4. Sales records covering the current year with monthly spread
5. GoalConfigs for each agent with 4–5 steps at realistic THB amounts
6. Edge cases: agent with no sales, customer with sales but unassigned, agent who has passed all goal steps

Run `npm run db:seed` to verify it loads cleanly.
