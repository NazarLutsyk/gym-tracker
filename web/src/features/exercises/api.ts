import { toast } from 'sonner'
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CATEGORY_LABELS, HIDDEN_CATEGORIES } from '@gym/shared'
import type {
  CreateCustomExerciseInput,
  Exercise,
  ExerciseHistory,
  ExerciseList,
  ExerciseListQuery,
  UpdateCustomExerciseInput,
} from '@gym/shared'
import { api, ApiError } from '@/lib/api'

const PAGE = 30

type Filters = Pick<ExerciseListQuery, 'q' | 'muscle' | 'equipment' | 'category'>

const nextOffset = <T extends { items: unknown[]; total: number }>(last: T, pages: T[]) => {
  const loaded = pages.reduce((n, p) => n + p.items.length, 0)
  return loaded < last.total ? loaded : undefined
}

const query = (params: Record<string, string | number | undefined>) =>
  new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (v === undefined || v === '' ? [] : [[k, String(v)]])),
  ).toString()

export function useExercises(filters: Filters) {
  return useInfiniteQuery({
    queryKey: ['exercises', 'list', filters],
    queryFn: ({ pageParam }) =>
      api<ExerciseList>(`/exercises?${query({ ...filters, limit: PAGE, offset: pageParam })}`),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
    // Keep the old list on screen while a new search loads, instead of flashing skeletons on every keystroke.
    placeholderData: keepPreviousData,
  })
}

// A malformed id in the URL (/exercises/abc) is "not found", not an API validation error.
export function useExercise(id: number) {
  return useQuery({
    queryKey: ['exercises', id],
    queryFn: () =>
      id > 0 && Number.isInteger(id)
        ? api<Exercise>(`/exercises/${id}`)
        : Promise.reject(new ApiError({ statusCode: 404, message: 'Вправу не знайдено' })),
  })
}

export function useExerciseHistory(id: number) {
  return useInfiniteQuery({
    queryKey: ['exercises', id, 'history'],
    queryFn: ({ pageParam }) =>
      api<ExerciseHistory>(`/exercises/${id}/history?${query({ limit: 20, offset: pageParam })}`),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
  })
}

export function useCreateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateCustomExerciseInput) => api<Exercise>('/exercises', { method: 'POST', body }),
    onSuccess: (ex) => {
      qc.setQueryData(['exercises', ex.id], ex)
      void qc.invalidateQueries({ queryKey: ['exercises', 'list'] })
      toast.success('Вправу створено')
    },
  })
}

export function useUpdateExercise(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateCustomExerciseInput) => api<Exercise>(`/exercises/${id}`, { method: 'PATCH', body }),
    onSuccess: (ex) => {
      qc.setQueryData(['exercises', id], ex)
      void qc.invalidateQueries({ queryKey: ['exercises', 'list'] })
      toast.success('Зміни збережено')
    },
  })
}

export const options = <K extends string>(labels: Record<K, string>) => Object.entries(labels) as [K, string][]

export const CATEGORY_OPTIONS = options(CATEGORY_LABELS).filter(([c]) => !HIDDEN_CATEGORIES.includes(c))
