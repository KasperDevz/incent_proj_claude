import { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { findUserByEmail } from "./mock-users"
import { verifyOtp } from "./otp-store"

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        authType: { label: "Auth Type", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        const user = findUserByEmail(credentials.email)
        if (!user) return null

        if (credentials.authType === "otp") {
          if (user.role !== "agent") return null
          const result = verifyOtp(credentials.email, credentials.otp ?? "")
          if (!result.success) return null
        } else {
          if (user.role !== "admin") return null
          if (credentials.password !== user.password) return null
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as typeof user & { role: string }).role
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { role: string }).role = token.role as string
      }
      return session
    },
  },
}
