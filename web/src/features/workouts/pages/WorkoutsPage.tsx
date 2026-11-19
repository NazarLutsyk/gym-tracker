import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRightIcon, EllipsisVerticalIcon, PlayIcon, PlusIcon, TimerIcon, Trash2Icon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { WorkoutDetail, WorkoutListItem } from '@gym/shared'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { plural } from '../plural'
import { invalidateLists, useActiveWorkout, usePlannedWorkouts, workoutKeys } from '../api'

const dateFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' })

export function WorkoutsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const activeQuery = useActiveWorkout()
  const planned = usePlannedWorkouts()
  const [toDelete, setToDelete] = useState<WorkoutListItem | null>(null)
  const active = activeQuery.data

  const startEmpty = useMutation({
    mutationFn: async () => {
      const w = await api<WorkoutDetail>('/workouts', { method: 'POST', body: {} })
      try {
        return await api<WorkoutDetail>(`/workouts/${w.id}/start`, { method: 'POST' })
      } catch (e) {
        // e.g. 409 from a stale screen: don't leave an empty planned workout behind.
        void api(`/workouts/${w.id}`, { method: 'DELETE' }).catch(() => {})
        throw e
      }
    },
    onSuccess: (w) => {
      qc.setQueryData(workoutKeys.detail(w.id), w)
      void invalidateLists(qc)
      navigate(`/workouts/${w.id}`)
    },
    onError: (e) => {
      toast.error(e.message)
      void invalidateLists(qc)
    },
  })

  const start = useMutation({
    mutationFn: (id: number) => api<WorkoutDetail>(`/workouts/${id}/start`, { method: 'POST' }),
    onSuccess: (w) => {
      qc.setQueryData(workoutKeys.detail(w.id), w)
      void invalidateLists(qc)
      navigate(`/workouts/${w.id}`)
    },
    onError: (e) => {
      toast.error(e.message)
      void invalidateLists(qc)
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api(`/workouts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void invalidateLists(qc)
      toast.success('Тренування видалено')
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Тренування</h1>

      {active && (
        <Link
          to={`/workouts/${active.id}`}
          className="flex min-h-16 items-center gap-3 rounded-xl bg-primary p-4 text-primary-foreground"
        >
          <TimerIcon className="size-6 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Тренування триває</span>
            <span className="block truncate text-sm opacity-80">{active.name}</span>
          </span>
          <ChevronRightIcon className="size-5" />
        </Link>
      )}

      <div className="flex flex-col gap-2">
        <Button asChild variant="outline" className="h-12 text-base">
          <Link to="/workouts/new">
            <PlusIcon /> Нове тренування
          </Link>
        </Button>
        {!active && (
          <Button className="h-12 text-base" disabled={startEmpty.isPending || activeQuery.isPending} onClick={() => startEmpty.mutate()}>
            <PlayIcon /> Почати без плану
          </Button>
        )}
      </div>

      {planned.data?.items.length !== 0 && <h2 className="mt-2 font-medium text-muted-foreground">Заплановані</h2>}
      {planned.isPending && [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
      {planned.isError && <p className="text-destructive">{planned.error.message}</p>}
      {planned.data?.items.length === 0 && (
        <p className="py-6 text-center text-muted-foreground">Запланованих тренувань немає</p>
      )}
      <ul className="flex flex-col gap-2">
        {planned.data?.items.map((w) => (
          <li key={w.id} className="flex items-center gap-1 rounded-xl border bg-card">
            <Link to={`/workouts/${w.id}`} className="min-h-16 min-w-0 flex-1 px-4 py-3">
              <span className="line-clamp-2 font-medium leading-snug break-words">{w.name}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {w.exerciseCount} {plural(w.exerciseCount, ['вправа', 'вправи', 'вправ'])} · {dateFmt.format(new Date(w.createdAt))}
              </span>
            </Link>
            {!active && !activeQuery.isPending && (
              <Button className="h-11 px-3" disabled={start.isPending} onClick={() => start.mutate(w.id)}>
                <PlayIcon /> Почати
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2 size-11" aria-label="Дії з тренуванням">
                  <EllipsisVerticalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem className="h-11" variant="destructive" onSelect={() => setToDelete(w)}>
                  <Trash2Icon /> Видалити
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити тренування?</AlertDialogTitle>
            <AlertDialogDescription>«{toDelete?.name}» буде видалено назавжди.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Скасувати</AlertDialogCancel>
            <AlertDialogAction
              className="h-11"
              variant="destructive"
              onClick={() => toDelete && remove.mutate(toDelete.id)}
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
