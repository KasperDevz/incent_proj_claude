# Test Fixtures

Mock data used in place of AWS API Gateway calls during local development and CI testing.

## How it works

`lib/api-client/` checks `process.env.NODE_ENV === 'test'` and reads from these JSON files instead of making HTTP requests to API Gateway. No network calls are made during tests.

## Files

| File | Records | Notes |
|------|---------|-------|
| `users.json` | 4 | 1 admin + 3 agents |
| `agents.json` | 3 | Linked to agent users |
| `customers.json` | 8 | 6 assigned + 2 unassigned |
| `sales.json` | 11 | Mix of approved/cancelled, spread across months |
| `goal_configs.json` | 3 | One per agent for year 2025 |
| `goal_steps.json` | 12 | Agent 1: 5 steps, Agent 2: 4 steps, Agent 3: 3 steps |
| `otp_requests.json` | 4 | Valid OTP, used OTP, expired OTP, locked-out OTP |
| `sync_logs.json` | 3 | 2 success + 1 failed |

## Test Accounts

| Email | Role | Agent ID |
|-------|------|----------|
| admin@incent.dev | admin | — |
| agent1@incent.dev | agent | 10000000-...-0001 |
| agent2@incent.dev | agent | 10000000-...-0002 |
| agent3@incent.dev | agent | 10000000-...-0003 |

## OTP Test Fixtures

| ID suffix | State | OTP code | Use for testing |
|-----------|-------|----------|-----------------|
| `...0001` | Valid (expires 2099) | `482916` | agent1 — happy path login |
| `...0002` | Valid (expires 2099) | `193847` | agent2 — happy path login |
| `...0003` | **Expired** | `657291` | agent3 — test expiry error |
| `...0004` | **Locked** (attempt_count=5, is_active=false) | `999999` | agent1 — test lockout error |

## Edge Cases Covered

- Customers with `agent_id: null` (unassigned, post-sync)
- Sale with `status: "cancelled"` (should not count toward goal progress)
- Agent with fewer goal steps than others (agent3 has 3 steps only)
- Sync log with `status: "failed"` and error message
- OTP expired (`expires_at` in the past)
- OTP locked out (`attempt_count >= 5`, `is_active = false`)

## Amounts (in satang, ÷ 100 = THB)

- `8000000` satang = 80,000 THB
- `50000000` satang = 500,000 THB
- `500000000` satang = 5,000,000 THB

## Rules

- Never use real names, emails, or phone numbers in fixtures
- All emails use `.invalid` TLD (RFC 2606 reserved — guaranteed non-real)
- IDs use predictable UUID patterns for easy debugging
