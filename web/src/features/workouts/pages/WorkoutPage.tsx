import { useEffect, useState, type ComponentProps } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckIcon, FlagIcon, PencilIcon, TimerIcon } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import type { SetInput, WorkoutDetail } from '@gym/shared'
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
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { flushDeletes, invalidateLists, useWorkout, useWorkoutAction } from '../api'
import { plural } from '../plural'
import { AddExerciseSheet } from '../components/AddExerciseSheet'
import { ExerciseCard } from '../components/ExerciseCard'

export function WorkoutPage() {
  const id = Number(useParams().id)
  const { data: workout, error, isPending } = useWorkout(id)
  const addExercise = useAddExercise(id)

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>{error instanceof ApiError && error.statusCode === 404 ? 'Тренування не знайдено' : error.message}</p>
        <Button asChild variant="outline" className="h-11">
          <Link to="/workouts">До тренувань</Link>
        </Button>
      </div>
    )
  }
  if (workout.status === 'finished') return <Navigate to={`/history/${workout.id}`} replace />

  return (
    <section className="flex flex-col gap-4">
      <Header workout={workout} />
      {workout.exercises.map((item, index) => (
        <ExerciseCard key={item.id} workout={workout} item={item} index={index} />
      ))}
      <AddExerciseSheet onPick={addExercise} />
    </section>
  )
}

function useAddExercise(id: number) {
  const action = useWorkoutAction(id)
  return (exerciseId: number, sets: SetInput[]) => action.mutateAsync({ path: '/exercises', body: { exerciseId, sets } })
}

function Header({ workout }: { workout: WorkoutDetail }) {
  const action = useWorkoutAction(workout.id)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const active = workout.status === 'active'

  const rename = (input: HTMLInputElement) => {
    const name = input.value.trim()
    if (!name || name.length > 100) input.value = workout.name
    else if (name !== workout.name) action.mutate({ method: 'PATCH', body: { name } })
  }

  const finish = async () => {
    await flushDeletes(workout.id)
    action.mutate(
      { path: '/finish' },
      {
        onSuccess: () => {
          void invalidateLists(qc)
          toast.success('Тренування завершено')
          navigate(`/history/${workout.id}`, { replace: true })
        },
      },
    )
  }

  const sets = workout.exercises.flatMap((e) => e.sets)
  const left = sets.filter((s) => !s.completedAt).length
  const skipped = sets.filter((s) => !s.completedAt && !s.unplanned).length
  const nothingDone = left === sets.length

  // A workout with nothing to keep is removed instead of cluttering the list or history.
  const discard = async () => {
    try {
      await flushDeletes(workout.id)
      // Direct call, not via the cache: a "finished" workout in the cache would redirect this page to history.
      if (active) await api(`/workouts/${workout.id}/finish`, { method: 'POST' })
      await api(`/workouts/${workout.id}`, { method: 'DELETE' })
    } catch (e) {
      toast.error((e as Error).message)
      return
    }
    void invalidateLists(qc)
    navigate('/workouts', { replace: true })
  }

  const done = () => (workout.exercises.length ? navigate('/workouts') : void discard())

  return (
    <header className="sticky top-14 z-[5] -mx-4 flex flex-col gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
      <NameField
        key={workout.name}
        defaultValue={workout.name}
        onBlur={(e) => rename(e.currentTarget)}
      />

      {active ? (
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-lg tabular-nums">
            <TimerIcon className="size-5 text-muted-foreground" />
            <Elapsed since={workout.startedAt} />
          </span>
          <Button
            className="h-11 px-5 text-base"
            disabled={action.isPending}
            onClick={() => (left || nothingDone ? setConfirmOpen(true) : void finish())}
          >
            <FlagIcon /> Завершити
          </Button>
        </div>
      ) : (
        // Planning only: the workout is started from the list (/workouts) when you are at the gym.
        <Button variant="outline" className="h-12 text-base" onClick={done}>
          <CheckIcon /> Готово
        </Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          {nothingDone ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Жодного підходу не відмічено</AlertDialogTitle>
                <AlertDialogDescription>Тренування не збережеться в історії.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-11">Продовжити</AlertDialogCancel>
                <AlertDialogAction className="h-11" variant="destructive" onClick={() => void discard()}>
                  Завершити без збереження
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Завершити тренування?</AlertDialogTitle>
                <AlertDialogDescription>
                  {skipped === 1
                    ? 'Один підхід з плану не відмічено. Він збережеться як пропущений.'
                    : skipped
                      ? `Не відмічено ${skipped} ${plural(skipped, ['підхід', 'підходи', 'підходів'])} з плану. Вони збережуться як пропущені.`
                      : `Не відмічено ${left} ${plural(left, ['підхід', 'підходи', 'підходів'])}. Вони не збережуться.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-11">Скасувати</AlertDialogCancel>
                <AlertDialogAction className="h-11" onClick={() => void finish()}>
                  Завершити
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}

export function NameField(props: ComponentProps<'input'>) {
  return (
    <label className="relative flex items-center">
      <input
        aria-label="Назва тренування"
        maxLength={100}
        enterKeyHint="done"
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="peer h-11 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent pr-9 pl-1 text-xl font-semibold outline-none focus-visible:border-input"
        {...props}
      />
      <PencilIcon className="pointer-events-none absolute right-3 size-4 text-muted-foreground peer-focus-visible:hidden" />
    </label>
  )
}

function Elapsed({ since }: { since: string | null }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!since) return null
  const s = Math.max(0, Math.floor((now - Date.parse(since)) / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')
  const h = Math.floor(s / 3600)
  const m = Math.floor(s / 60) % 60
  return <>{h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`}</>
}
