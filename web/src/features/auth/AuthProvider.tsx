import { useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AuthResponse, LoginInput, RegisterInput, User } from '@gym/shared'
import { api, clearToken, getToken, setToken } from '@/lib/api'
import { AuthContext, type Auth } from './use-auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setTokenState] = useState(getToken)

  const { data: user } = useQuery({
    queryKey: ['me', token],
    queryFn: () => api<User>('/auth/me'),
    enabled: !!token,
    staleTime: Infinity,
  })

  const signIn = (res: AuthResponse) => {
    setToken(res.token)
    queryClient.setQueryData(['me', res.token], res.user)
    setTokenState(res.token)
  }

  const value: Auth = {
    token,
    user,
    login: async (input: LoginInput) =>
      signIn(await api<AuthResponse>('/auth/login', { method: 'POST', body: input })),
    register: async (input: RegisterInput) =>
      signIn(await api<AuthResponse>('/auth/register', { method: 'POST', body: input })),
    logout: () => {
      clearToken()
      queryClient.clear()
      setTokenState(null)
    },
  }

  return <AuthContext value={value}>{children}</AuthContext>
}
