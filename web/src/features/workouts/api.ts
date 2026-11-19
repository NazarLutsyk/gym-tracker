import { useCallback, useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { WorkoutDetail, WorkoutList, WorkoutSet } from '@gym/shared'
import { api, ApiError } from '@/lib/api'

// Lists live under ['workouts', ...] so one invalidate refreshes them all; a single workout is ['workout', id].
export const workoutKeys = {
  lists: ['workouts'] as const,
  planned: ['workouts', 'planned'] as const,
  active: ['workouts', 'active'] as const,
  detail: (id: number) => ['workout', id] as const,
}

export const invalidateLists = (qc: QueryClient) => qc.invalidateQueries({ queryKey: workoutKeys.lists })

export const usePlannedWorkouts = () =>
  useQuery({
    queryKey: workoutKeys.planned,
    queryFn: () => api<WorkoutList>('/workouts?status=planned&limit=100'),
  })

// The API answers "no active workout" with an empty 200 body, which `api` turns into undefined.
export const fetchActiveWorkout = async () => (await api<WorkoutDetail | null>('/workouts/active')) ?? null

export const useActiveWorkout = () => useQuery({ queryKey: workoutKeys.active, queryFn: fetchActiveWorkout })

/**
 * Deletes of sets/exercises wait a few seconds so «Повернути» can cancel them.
 * Until the request is sent, the item is only hidden from the workout on screen.
 */
const UNDO_MS = 5000
type Pending = { workoutId: number; timer: ReturnType<typeof setTimeout>; send: () => Promise<void> }
const pendingDeletes = new Map<string, Pending>() // 'set:12' / 'exercise:3'
const listeners = new Set<() => void>()
let hiddenSnapshot: ReadonlySet<string> = new Set()
const emit = () => {
  hiddenSnapshot = new Set(pendingDeletes.keys())
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}

const hidePending = (w: WorkoutDetail, hidden: ReadonlySet<string>): WorkoutDetail =>
  hidden.size === 0
    ? w
    : {
        ...w,
        exercises: w.exercises
          .filter((e) => !hidden.has(`exercise:${e.id}`))
          .map((e) => ({ ...e, sets: e.sets.filter((s) => !hidden.has(`set:${s.id}`)) })),
      }

export function useWorkout(id: number) {
  const hidden = useSyncExternalStore(subscribe, () => hiddenSnapshot)
  const select = useCallback((w: WorkoutDetail) => hidePending(w, hidden), [hidden])
  return useQuery({ queryKey: workoutKeys.detail(id), queryFn: () => api<WorkoutDetail>(`/workouts/${id}`), select })
}

export const flushDeletes = (workoutId: number) =>
  Promise.all(
    [...pendingDeletes.values()].filter((p) => p.workoutId === workoutId).map((p) => (clearTimeout(p.timer), p.send())),
  )

export function useDeferredDelete(workoutId: number) {
  const qc = useQueryClient()
  const key = workoutKeys.detail(workoutId)
  return (kind: 'set' | 'exercise', id: number, message: string) => {
    const ref = `${kind}:${id}`
    const path = kind === 'set' ? `/sets/${id}` : `/exercises/${id}`
    const send = async () => {
      try {
        const w = await api<WorkoutDetail>(`/workouts/${workoutId}${path}`, { method: 'DELETE' })
        if (qc.isMutating({ mutationKey: key }) === 0) qc.setQueryData(key, w)
        else void qc.invalidateQueries({ queryKey: key })
      } catch (e) {
        toast.error((e as Error).message)
      } finally {
        pendingDeletes.delete(ref) // stays hidden until the server answers, so nothing flickers back
        emit()
      }
    }
    pendingDeletes.set(ref, { workoutId, timer: setTimeout(send, UNDO_MS), send })
    emit()
    toast(message, {
      duration: UNDO_MS,
      action: {
        label: 'Повернути',
        onClick: () => {
          const p = pendingDeletes.get(ref)
          if (!p) return
          clearTimeout(p.timer)
          pendingDeletes.delete(ref)
          emit()
        },
      },
    })
  }
}

/**
 * Several mutations of one workout can be in flight (fast taps on a slow network).
 * Each returns the full workout, but an early response would wipe the optimistic state of later ones,
 * so only the last mutation to finish writes to the cache.
 */
function useCacheLastResult(id: number) {
  const qc = useQueryClient()
  const key = workoutKeys.detail(id)
  return {
    qc,
    key,
    // During onSuccess the mutation itself is still counted as pending.
    onSuccess: (w: WorkoutDetail) => {
      if (qc.isMutating({ mutationKey: key }) === 1) qc.setQueryData(key, w)
    },
  }
}

type Action = { path?: string; method?: 'POST' | 'PATCH' | 'DELETE'; body?: unknown }

export function useWorkoutAction(id: number) {
  const { qc, key, onSuccess } = useCacheLastResult(id)
  return useMutation({
    mutationKey: key,
    mutationFn: ({ path = '', method = 'POST', body }: Action) =>
      api<WorkoutDetail>(`/workouts/${id}${path}`, { method, body }),
    onSuccess,
    onError: (e) => {
      if (!(e instanceof ApiError && e.statusCode === 409)) toast.error(e.message)
      void qc.invalidateQueries({ queryKey: key })
    },
  })
}

type Toggle = { setId: number; completed: boolean }

/** ✓ on a set. Optimistic: the tick shows instantly, rolled back if the request fails. */
export function useToggleSet(id: number) {
  const { qc, key, onSuccess } = useCacheLastResult(id)
  return useMutation({
    mutationKey: key,
    mutationFn: ({ setId, completed }: Toggle) =>
      api<WorkoutDetail>(`/workouts/${id}/sets/${setId}`, { method: 'PATCH', body: { completed } }),
    onMutate: async ({ setId, completed }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<WorkoutDetail>(key)
      // Mirror the server: completing copies the plan into empty fact values.
      const patch = (s: WorkoutSet): WorkoutSet =>
        completed
          ? { ...s, completedAt: new Date().toISOString(), weight: s.weight ?? s.plannedWeight, reps: s.reps ?? s.plannedReps }
          : { ...s, completedAt: null }
      qc.setQueryData<WorkoutDetail>(key, (w) =>
        w && {
          ...w,
          exercises: w.exercises.map((we) => ({ ...we, sets: we.sets.map((s) => (s.id === setId ? patch(s) : s)) })),
        },
      )
      return { previous }
    },
    onSuccess,
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous)
      toast.error(`Не вдалося зберегти підхід: ${e.message}`)
      // The snapshot may predate other in-flight ticks; refetch the truth.
      void qc.invalidateQueries({ queryKey: key })
    },
  })
}
