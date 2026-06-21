# Incent — Database Diagram

## Architecture Note

All INSERT / UPDATE operations reach PostgreSQL **exclusively through AWS API Gateway** (API key required). The Next.js app never connects to the database directly in production. In local/test mode, API Gateway calls are intercepted by mock handlers in `__tests__/fixtures/`.

```
Next.js App
    │
    ▼
lib/api-client/          ← abstraction layer
    │                      (real: calls API Gateway)
    │                      (test: uses __tests__/fixtures/)
    ▼
AWS API Gateway (+ API Key)
    │
    ▼
AWS Lambda
    │
    ▼
AWS RDS — PostgreSQL
```

---

## ERD

```
┌─────────────────────────────────┐
│             users               │
├─────────────────────────────────┤
│ id              UUID  PK        │
│ email           VARCHAR(255) UQ │
│ password_hash   VARCHAR(255)    │
│ role            VARCHAR(20)     │◄── 'admin' | 'agent'
│ is_active       BOOLEAN         │
│ created_by      VARCHAR(255)    │
│ created_at      TIMESTAMPTZ     │
│ updated_by      VARCHAR(255)    │
│ updated_at      TIMESTAMPTZ     │
└──────────────┬──────────────────┘
               │ 1
               │
               │ 1
┌──────────────▼──────────────────┐
│             agents              │
├─────────────────────────────────┤
│ id              UUID  PK        │
│ user_id         UUID  FK→users  │
│ first_name      VARCHAR(100)    │
│ last_name       VARCHAR(100)    │
│ employee_code   VARCHAR(50) UQ  │
│ phone           VARCHAR(20)     │
│ is_active       BOOLEAN         │
│ created_by      VARCHAR(255)    │
│ created_at      TIMESTAMPTZ     │
│ updated_by      VARCHAR(255)    │
│ updated_at      TIMESTAMPTZ     │
└──────┬────────────────┬─────────┘
       │ 1              │ 1
       │                │
       │ N              │ 1
┌──────▼──────────┐  ┌──▼──────────────────────────────┐
│   customers     │  │         goal_configs             │
├─────────────────┤  ├──────────────────────────────────┤
│ id       UUID PK│  │ id           UUID  PK            │
│ ext_id   VARCHAR│  │ agent_id     UUID  FK→agents     │
│ full_name VARCHAR│  │ year         SMALLINT            │◄── UNIQUE(agent_id, year)
│ company  VARCHAR│  │ is_active    BOOLEAN             │
│ email    VARCHAR│  │ created_by   VARCHAR(255)        │
│ phone    VARCHAR│  │ created_at   TIMESTAMPTZ         │
│ agent_id UUID FK│◄─┘ updated_by   VARCHAR(255)        │
│ is_active BOOLEAN  │ updated_at   TIMESTAMPTZ         │
│ created_by VARCHAR  └──────────┬───────────────────────┘
│ created_at TIMESTAMPTZ         │ 1
│ updated_by VARCHAR             │
│ updated_at TIMESTAMPTZ         │ N (4–5 steps)
└──────┬──────────┘  ┌───────────▼───────────────────────┐
       │ 1           │          goal_steps                │
       │             ├────────────────────────────────────┤
       │ N           │ id                UUID  PK         │
┌──────▼──────────────┤ goal_config_id   UUID FK→goal_configs│
│       sales         │ step_number      SMALLINT         │◄── 1–5, UNIQUE(config, step)
├─────────────────────┤ target_amount_satang BIGINT       │
│ id         UUID PK  │ label            VARCHAR(100)     │◄── e.g. "Bronze", "Silver"
│ ext_id     VARCHAR  │ reward_desc      TEXT             │
│ customer_id UUID FK │ is_active        BOOLEAN          │
│ amount_satang BIGINT│ created_by       VARCHAR(255)     │
│ sale_date  DATE     │ created_at       TIMESTAMPTZ      │
│ product_name VARCHAR│ updated_by       VARCHAR(255)     │
│ status     VARCHAR  │◄── 'pending'|'approved'|'cancelled'
│ is_active  BOOLEAN  │ updated_at       TIMESTAMPTZ      │
│ created_by VARCHAR  └────────────────────────────────────┘
│ created_at TIMESTAMPTZ
│ updated_by VARCHAR
│ updated_at TIMESTAMPTZ
└─────────────────────┘

┌──────────────────────────────────────┐
│           otp_requests               │
├──────────────────────────────────────┤
│ id             UUID  PK              │
│ user_id        UUID  FK→users        │◄── agent only
│ otp_code       VARCHAR(6)            │◄── bcrypt hash in prod, plain in dev
│ expires_at     TIMESTAMPTZ           │◄── now + 10 min
│ used_at        TIMESTAMPTZ           │◄── NULL = not yet used
│ attempt_count  SMALLINT DEFAULT 0    │◄── lock at >= 5
│ ip_address     VARCHAR(45)           │
│ is_active      BOOLEAN               │◄── FALSE = locked out
│ created_by     VARCHAR(255)          │
│ created_at     TIMESTAMPTZ           │
│ updated_by     VARCHAR(255)          │
│ updated_at     TIMESTAMPTZ           │
└──────────────────────────────────────┘

┌──────────────────────────────────┐
│           sync_logs              │
├──────────────────────────────────┤
│ id                UUID  PK       │
│ triggered_by      VARCHAR(255)   │◄── admin user email
│ started_at        TIMESTAMPTZ    │
│ completed_at      TIMESTAMPTZ    │
│ status            VARCHAR(20)    │◄── 'running'|'success'|'failed'
│ records_fetched   INTEGER        │
│ records_upserted  INTEGER        │
│ error_message     TEXT           │
│ is_active         BOOLEAN        │
│ created_by        VARCHAR(255)   │
│ created_at        TIMESTAMPTZ    │
│ updated_by        VARCHAR(255)   │
│ updated_at        TIMESTAMPTZ    │
└──────────────────────────────────┘
```

---

## Full Table Definitions

### `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Login email |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hash |
| `role` | VARCHAR(20) | NOT NULL, CHECK IN ('admin','agent') | User role |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft delete flag |
| `created_by` | VARCHAR(255) | NOT NULL | Email of creator |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_by` | VARCHAR(255) | | Email of last updater |
| `updated_at` | TIMESTAMPTZ | | Last update timestamp |

---

### `agents`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| `user_id` | UUID | FK → users.id, UNIQUE, NOT NULL | Linked auth account |
| `first_name` | VARCHAR(100) | NOT NULL | First name |
| `last_name` | VARCHAR(100) | NOT NULL | Last name |
| `employee_code` | VARCHAR(50) | UNIQUE | Internal employee ID |
| `phone` | VARCHAR(20) | | Contact number |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft delete flag |
| `created_by` | VARCHAR(255) | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_by` | VARCHAR(255) | | |
| `updated_at` | TIMESTAMPTZ | | |

**Indexes:** `idx_agents_user_id`, `idx_agents_employee_code`

---

### `customers`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| `ext_id` | VARCHAR(100) | UNIQUE | ID from external API |
| `full_name` | VARCHAR(255) | NOT NULL | Customer full name |
| `company_name` | VARCHAR(255) | | Company (if B2B) |
| `email` | VARCHAR(255) | | Customer email |
| `phone` | VARCHAR(20) | | Customer phone |
| `agent_id` | UUID | FK → agents.id, NULLABLE | NULL = unassigned |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft delete flag |
| `created_by` | VARCHAR(255) | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_by` | VARCHAR(255) | | |
| `updated_at` | TIMESTAMPTZ | | |

**Indexes:** `idx_customers_agent_id`, `idx_customers_ext_id`

---

### `sales`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| `ext_id` | VARCHAR(100) | UNIQUE | ID from external API |
| `customer_id` | UUID | FK → customers.id, NOT NULL | Related customer |
| `amount_satang` | BIGINT | NOT NULL, CHECK > 0 | Amount in satang (THB × 100) |
| `sale_date` | DATE | NOT NULL | Date of sale |
| `product_name` | VARCHAR(255) | | Product or service name |
| `status` | VARCHAR(20) | NOT NULL, CHECK IN ('pending','approved','cancelled') | Sale status |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft delete flag |
| `created_by` | VARCHAR(255) | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_by` | VARCHAR(255) | | |
| `updated_at` | TIMESTAMPTZ | | |

**Indexes:** `idx_sales_customer_id`, `idx_sales_sale_date`, `idx_sales_status`

> All monetary values stored as `BIGINT` in **satang** (1 THB = 100 satang). Never use FLOAT or NUMERIC for money calculations in application code.

---

### `goal_configs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| `agent_id` | UUID | FK → agents.id, NOT NULL | The agent this config belongs to |
| `year` | SMALLINT | NOT NULL | Calendar year (e.g. 2025) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft delete flag |
| `created_by` | VARCHAR(255) | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_by` | VARCHAR(255) | | |
| `updated_at` | TIMESTAMPTZ | | |

**Constraints:** `UNIQUE(agent_id, year)` — one config per agent per year
**Indexes:** `idx_goal_configs_agent_id`

---

### `goal_steps`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| `goal_config_id` | UUID | FK → goal_configs.id, NOT NULL | Parent config |
| `step_number` | SMALLINT | NOT NULL, CHECK BETWEEN 1 AND 5 | Step order (1 = lowest) |
| `target_amount_satang` | BIGINT | NOT NULL, CHECK > 0 | Threshold in satang |
| `label` | VARCHAR(100) | NOT NULL | Display label (e.g. "Bronze") |
| `reward_desc` | TEXT | | Optional reward description |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft delete flag |
| `created_by` | VARCHAR(255) | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_by` | VARCHAR(255) | | |
| `updated_at` | TIMESTAMPTZ | | |

**Constraints:** `UNIQUE(goal_config_id, step_number)`
**Indexes:** `idx_goal_steps_goal_config_id`

---

### `sync_logs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| `triggered_by` | VARCHAR(255) | NOT NULL | Admin email who triggered sync |
| `started_at` | TIMESTAMPTZ | NOT NULL | When sync started |
| `completed_at` | TIMESTAMPTZ | | When sync finished |
| `status` | VARCHAR(20) | NOT NULL, CHECK IN ('running','success','failed') | Sync result |
| `records_fetched` | INTEGER | NOT NULL, DEFAULT 0 | Total records from external API |
| `records_upserted` | INTEGER | NOT NULL, DEFAULT 0 | Records written to DB |
| `error_message` | TEXT | | Error detail if status = 'failed' |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft delete flag |
| `created_by` | VARCHAR(255) | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_by` | VARCHAR(255) | | |
| `updated_at` | TIMESTAMPTZ | | |

**Indexes:** `idx_sync_logs_started_at`, `idx_sync_logs_status`

---

### `otp_requests`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| `user_id` | UUID | FK → users.id, NOT NULL | Agent who requested OTP |
| `otp_code` | VARCHAR(6) | NOT NULL | Plain in dev, bcrypt hash in prod |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Created_at + 10 minutes |
| `used_at` | TIMESTAMPTZ | NULLABLE | Set when OTP verified successfully |
| `attempt_count` | SMALLINT | NOT NULL, DEFAULT 0 | Incremented on each wrong attempt |
| `ip_address` | VARCHAR(45) | NULLABLE | Requester IP (IPv4 or IPv6) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | FALSE = locked after 5 failed attempts |
| `created_by` | VARCHAR(255) | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_by` | VARCHAR(255) | | |
| `updated_at` | TIMESTAMPTZ | | |

**Indexes:** `idx_otp_requests_user_id`, `idx_otp_requests_expires_at`

**Valid OTP query:**
```sql
SELECT * FROM otp_requests
WHERE user_id = $1
  AND used_at IS NULL
  AND expires_at > NOW()
  AND is_active = TRUE
ORDER BY created_at DESC
LIMIT 1;
```

---

## Common Query Patterns

```sql
-- Agent YTD total (used for goal progress)
SELECT COALESCE(SUM(s.amount_satang), 0) AS ytd_total_satang
FROM sales s
JOIN customers c ON c.id = s.customer_id
WHERE c.agent_id = $1
  AND EXTRACT(YEAR FROM s.sale_date) = $2
  AND s.status = 'approved'
  AND s.is_active = TRUE
  AND c.is_active = TRUE;

-- Monthly breakdown for current year
SELECT
  EXTRACT(MONTH FROM s.sale_date) AS month,
  COALESCE(SUM(s.amount_satang), 0) AS total_satang
FROM sales s
JOIN customers c ON c.id = s.customer_id
WHERE c.agent_id = $1
  AND EXTRACT(YEAR FROM s.sale_date) = $2
  AND s.status = 'approved'
  AND s.is_active = TRUE
GROUP BY month
ORDER BY month;

-- Unassigned customers (post-sync)
SELECT * FROM customers
WHERE agent_id IS NULL AND is_active = TRUE;
```

---

## Naming Conventions

| Pattern | Convention | Example |
|---------|-----------|---------|
| Table names | `snake_case`, plural | `goal_configs`, `sync_logs` |
| Column names | `snake_case` | `amount_satang`, `employee_code` |
| Primary keys | always `id` UUID | `id UUID PK` |
| Foreign keys | `<table_singular>_id` | `agent_id`, `customer_id` |
| External IDs | `ext_id` | consistent across all synced tables |
| Timestamps | `TIMESTAMPTZ` | always with timezone |
| Money | `BIGINT` + `_satang` suffix | `amount_satang`, `target_amount_satang` |
| Indexes | `idx_<table>_<column>` | `idx_sales_customer_id` |
| Audit columns | `created_by/at`, `updated_by/at` | on every table |
