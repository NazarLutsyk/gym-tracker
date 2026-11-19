import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WorkoutDetail, WorkoutList } from '@gym/shared'
import { api, ApiError } from '@/lib/api'

const PAGE = 20

export function useHistory() {
  return useInfiniteQuery({
    queryKey: ['workouts', 'history'],
    queryFn: ({ pageParam }) => api<WorkoutList>(`/workouts?status=finished&limit=${PAGE}&offset=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.items.length, 0)
      return loaded < last.total ? loaded : undefined
    },
  })
}

// A malformed id in the URL (/history/abc) is "not found", not an API validation error.
export const useWorkout = (id: number) =>
  useQuery({
    queryKey: ['workout', id],
    queryFn: () =>
      id > 0 && Number.isInteger(id)
        ? api<WorkoutDetail>(`/workouts/${id}`)
        : Promise.reject(new ApiError({ statusCode: 404, message: 'Тренування не знайдено' })),
  })

export function useRepeatWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<WorkoutDetail>(`/workouts/${id}/repeat`, { method: 'POST' }),
    onSuccess: (w) => {
      qc.setQueryData(['workout', w.id], w)
      return qc.invalidateQueries({ queryKey: ['workouts'] })
    },
  })
}

export function useDeleteWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/workouts/${id}`, { method: 'DELETE' }),
    // The deleted workout's own query is left to expire: removing it while its page is still open refetches it (404).
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}
