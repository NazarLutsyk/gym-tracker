import { apiErrorSchema, type ApiError as ApiErrorBody } from '@gym/shared'

const API_URL: string = import.meta.env.VITE_API_URL

const TOKEN_KEY = 'token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  statusCode: number
  issues: ApiErrorBody['issues']

  constructor({ statusCode, message, issues }: ApiErrorBody) {
    super(message)
    this.statusCode = statusCode
    this.issues = issues
  }
}

type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown }

export async function api<T>(path: string, { method = 'GET', body }: Options = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError({ statusCode: 0, message: 'Немає зв’язку з сервером' })
  }

  const text = await res.text()
  const data: unknown = text ? JSON.parse(text) : undefined
  if (res.ok) return data as T

  // A 401 with a token means the session expired. Without a token (login form) it is just a wrong password.
  if (res.status === 401 && token) {
    clearToken()
    window.location.assign('/login')
  }
  const parsed = apiErrorSchema.safeParse(data)
  throw new ApiError(parsed.success ? parsed.data : { statusCode: res.status, message: 'Помилка сервера. Спробуйте пізніше' })
}

/** `/static/exercises/x/0.jpg` → `http://localhost:3000/static/exercises/x/0.jpg`. */
export const assetUrl = (path: string) => new URL(path, API_URL).href
