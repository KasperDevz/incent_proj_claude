export type UserRole = "admin" | "agent"

export interface MockUser {
  id: string
  email: string
  name: string
  role: UserRole
  password?: string // admin only
}

export const MOCK_USERS: MockUser[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "admin@mail.com",
    name: "Admin User",
    role: "admin",
    password: "password",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    email: "agent1@mail.com",
    name: "Somchai Jaidee",
    role: "agent",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    email: "agent2@mail.com",
    name: "Nattaya Suksombat",
    role: "agent",
  },
]

export function findUserByEmail(email: string): MockUser | undefined {
  return MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())
}
