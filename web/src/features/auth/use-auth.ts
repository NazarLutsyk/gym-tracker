import { createContext, useContext } from 'react'
import type { LoginInput, RegisterInput, User } from '@gym/shared'

export type Auth = {
  token: string | null
  /** undefined while /auth/me is loading or when logged out. */
  user: User | undefined
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<Auth | null>(null)

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside AuthProvider')
  return auth
}
