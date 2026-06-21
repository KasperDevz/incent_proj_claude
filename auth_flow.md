# Incent — Authentication Flow

## Overview

ระบบมี 2 roles และ auth method ที่ต่างกัน:

| Role | Method | Test mode | Production |
|------|--------|-----------|------------|
| **Admin** | Email + Password หรือ Azure AD | Basic auth (mode เลือกได้) | ตั้งค่าผ่าน `ADMIN_AUTH_MODE` |
| **Agent** | OTP 6 หลักส่งไปที่ email | แสดง OTP บนหน้า login | ส่งผ่าน email service จริง |

---

## Flow Diagram

### Admin — Basic Auth (mode: `basic`)

```
User เปิด /login
    │
    ▼
กรอก Email + Password
    │
    ▼
POST /api/auth/signin (NextAuth Credentials)
    │
    ├── [fail] wrong email/pass → แสดง error
    │
    └── [ok] สร้าง session (role: admin)
              │
              ▼
         redirect → /admin/dashboard
```

### Admin — Azure AD (mode: `azure`)

```
User เปิด /login
    │
    ▼
กดปุ่ม "Login with Microsoft"
    │
    ▼
NextAuth redirect → Microsoft OAuth consent
    │
    ├── [cancel/fail] → redirect กลับ /login?error=...
    │
    └── [ok] Microsoft callback → NextAuth verify email domain
              │
              ├── [email ไม่อยู่ใน users table] → error "ไม่มีสิทธิ์เข้าใช้"
              │
              └── [ok] สร้าง session (role: admin)
                        │
                        ▼
                   redirect → /admin/dashboard
```

### Agent — OTP

```
User เปิด /login
    │
    ▼
กรอก Email (step 1)
    │
    ▼
POST /api/auth/otp/request
    │
    ├── [email ไม่มีในระบบ] → error "ไม่พบบัญชีนี้"
    ├── [email เป็น admin] → redirect ให้ใช้ admin login
    │
    └── [ok — agent email]
          │
          ├── สร้าง OTP 6 หลัก (crypto random)
          ├── บันทึกใน otp_requests (expires_at = now + 10 นาที)
          │
          ├── [NODE_ENV = production] → ส่ง OTP ผ่าน email service
          └── [NODE_ENV ≠ production] → แสดง OTP บนหน้า login โดยตรง
                    │
                    ▼
              กรอก OTP 6 หลัก (step 2)
                    │
                    ▼
              POST /api/auth/otp/verify
                    │
                    ├── [OTP หมดอายุ] → error "OTP หมดอายุ กรุณาขอใหม่"
                    ├── [OTP ไม่ถูก] → error + นับจำนวนครั้งผิด
                    ├── [เกิน 5 ครั้งผิด] → ล็อก OTP ทันที
                    │
                    └── [ok] mark otp_requests.used_at = now
                              │
                              ▼
                         สร้าง NextAuth session (role: agent)
                              │
                              ▼
                         redirect → /agent/dashboard
```

---

## Login Page UI Logic

```
/login
  │
  └── ถ้า ADMIN_AUTH_MODE = "azure"
  │       └── แสดงทั้ง:
  │             ① Form email/pass  (สำหรับ admin basic fallback)
  │             ② ปุ่ม "Login with Microsoft"  (Azure AD)
  │
  └── ถ้า ADMIN_AUTH_MODE = "basic"
  │       └── แสดง Form email/pass เท่านั้น
  │
  └── เมื่อกรอก email แล้ว
          └── ถ้า email ตรงกับ agent → เปลี่ยน step เป็น OTP input
          └── ถ้า email ตรงกับ admin → ใช้ form password ปกติ
```

**Test mode OTP banner** (แสดงเฉพาะ `NODE_ENV !== 'production'`):
```
┌─────────────────────────────────────────────┐
│  🧪 TEST MODE — OTP: 4 8 2 9 1 6           │
│  (OTP นี้จะไม่แสดงใน production)           │
└─────────────────────────────────────────────┘
```

---

## Implementation Details

### Environment Variables

```bash
# Admin auth mode: "basic" | "azure"
ADMIN_AUTH_MODE="basic"

# Azure AD (required only when ADMIN_AUTH_MODE=azure)
AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID=""

# OTP settings
OTP_EXPIRY_MINUTES=10         # OTP หมดอายุใน 10 นาที
OTP_MAX_ATTEMPTS=5            # ผิดเกิน 5 ครั้ง ล็อกทันที

# Email service (Phase 2 — ว่างไว้ = ไม่ส่งเมล์, แสดง OTP บน UI แทน)
EMAIL_SERVICE_URL=""
EMAIL_SERVICE_KEY=""
```

### NextAuth Config (`lib/auth.ts`)

```typescript
providers: [
  // Admin: Basic
  CredentialsProvider({ name: "credentials", ... }),

  // Admin: Azure AD (loaded only when ADMIN_AUTH_MODE=azure)
  ...(process.env.ADMIN_AUTH_MODE === "azure"
    ? [AzureADProvider({ ... })]
    : []),
]
```

### OTP API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/otp/request` | POST | รับ email → สร้าง OTP → (ส่งเมล์ หรือ return ใน dev) |
| `/api/auth/otp/verify` | POST | รับ email + otp_code → verify → สร้าง session |

### OTP Generation (ใช้ `crypto`)

```typescript
import { randomInt } from "crypto"
const otp = String(randomInt(100000, 999999)) // 6 หลัก เสมอ
```

---

## Database: `otp_requests` Table

```sql
CREATE TABLE otp_requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id),
  otp_code      VARCHAR(6)  NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,              -- NULL = ยังไม่ใช้
  attempt_count SMALLINT    NOT NULL DEFAULT 0,
  ip_address    VARCHAR(45),              -- IPv4 หรือ IPv6
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by    VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    VARCHAR(255),
  updated_at    TIMESTAMPTZ
);
```

**Security rules:**
- `otp_code` ไม่เก็บเป็น plain text ใน production — ใช้ `bcrypt` hash
- Query เสมอ: `WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW() AND is_active = TRUE`
- ทุกครั้งที่ verify ผิด → `attempt_count + 1`
- `attempt_count >= 5` → `is_active = FALSE` ทันที (ต้องขอ OTP ใหม่)
- Cleanup job ลบ records ที่ `expires_at < NOW() - interval '1 day'` (ทำใน Lambda)

---

## Security Checklist

- [x] OTP expires in 10 minutes
- [x] Max 5 wrong attempts before lockout
- [x] OTP invalidated after successful use (`used_at` set)
- [x] OTP is never shown in production (`NODE_ENV` check server-side)
- [x] Session role checked at middleware — not UI only
- [x] Azure AD verifies email exists in `users` table before creating session
- [x] Rate limit `/api/auth/otp/request` at API Gateway (max 3 req/min per IP)
