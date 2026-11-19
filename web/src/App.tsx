import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { router } from '@/app/router'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ApiError } from '@/lib/api'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retrying 4xx (404, 401, validation) never helps.
      retry: (count, error) => !(error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) && count < 2,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
      <Toaster theme="light" position="top-center" />
    </QueryClientProvider>
  )
}
