import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { ArrowDownIcon, ArrowLeftIcon, ArrowUpIcon, RepeatIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import type { WorkoutSet } from '@gym/shared'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDeleteWorkout, useRepeatWorkout, useWorkout } from '../api'
import { compareSet, formatDate, formatDuration, formatSet, formatTonnage } from '../format'

export function HistoryDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const location = useLocation()
  const { data: w, error, isPending } = useWorkout(id)
  const repeat = useRepeatWorkout()
  const remove = useDeleteWorkout()

  // Back to wherever the user came from (history list or an exercise page); the list when opened directly.
  const back = (
    <Button
      variant="ghost"
      className="-ml-2 h-11 self-start"
      onClick={() => (location.key === 'default' ? navigate('/history') : navigate(-1))}
    >
      <ArrowLeftIcon /> Назад
    </Button>
  )

  if (isPending) return <Skeleton className="h-64 rounded-xl" />
  if (error)
    return (
      <section className="flex flex-col gap-4">
        {back}
        <p className="text-muted-foreground">{error.message}</p>
      </section>
    )
  if (w.status !== 'finished') return <Navigate to={`/workouts/${w.id}`} replace />

  const onRepeat = () =>
    repeat.mutate(w.id, {
      onSuccess: (next) => {
        toast.success('Тренування скопійовано в заплановані')
        navigate(`/workouts/${next.id}`)
      },
      onError: (e) => toast.error(e.message),
    })
  const onDelete = () =>
    remove.mutate(w.id, {
      onSuccess: () => {
        toast.success('Тренування видалено')
        navigate('/history', { replace: true })
      },
      onError: (e) => toast.error(e.message),
    })

  return (
    <section className="flex flex-col gap-4">
      {back}
      <header>
        <div className="text-sm text-muted-foreground">{w.finishedAt && formatDate(w.finishedAt)}</div>
        <h1 className="text-2xl font-semibold break-words">{w.name}</h1>
        <div className="text-sm text-muted-foreground">
          {[formatDuration(w.startedAt, w.finishedAt), formatTonnage(w.tonnage)].filter(Boolean).join(' · ')}
        </div>
      </header>

      <div className="flex gap-2">
        <Button className="h-11 flex-1" onClick={onRepeat} disabled={repeat.isPending}>
          <RepeatIcon /> {repeat.isPending ? 'Створюємо…' : 'Повторити'}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="h-11" disabled={remove.isPending}>
              <Trash2Icon /> Видалити
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Видалити тренування «{w.name}»?</AlertDialogTitle>
              <AlertDialogDescription>Відновити його не вийде.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Скасувати</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onDelete}>
                Видалити
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <ul className="flex flex-col gap-3">
        {w.exercises.map((we) => (
          <li key={we.id} className="rounded-xl border bg-card p-3">
            <Link to={`/exercises/${we.exercise.id}`} className="font-medium underline-offset-4 hover:underline">
              {we.exercise.nameUk ?? we.exercise.name}
            </Link>
            <div className="mt-2 grid grid-cols-[1.5rem_1fr_1fr] gap-x-2 gap-y-1 text-sm tabular-nums">
              <span />
              <span className="text-xs text-muted-foreground">План</span>
              <span className="text-xs text-muted-foreground">Факт</span>
              {we.sets.map((s, i) => (
                <SetRow key={s.id} n={i + 1} set={s} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SetRow({ n, set }: { n: number; set: WorkoutSet }) {
  const plan = formatSet(set.plannedWeight, set.plannedReps)
  const fact = set.completedAt ? formatSet(set.weight, set.reps) : null
  const cmp = compareSet(set)

  return (
    <>
      <span className="text-muted-foreground">{n}</span>
      <span className="text-muted-foreground">{set.unplanned ? <span className="text-xs">поза планом</span> : (plan ?? '–')}</span>
      <span
        className={cn(
          'flex items-center gap-1 font-medium',
          cmp > 0 && 'text-green-700 dark:text-green-500',
          cmp < 0 && 'text-red-600 dark:text-red-500',
        )}
      >
        {fact ?? <span className="font-normal text-muted-foreground">пропущено</span>}
        {cmp > 0 && <ArrowUpIcon className="size-4 stroke-3" aria-label="більше за план" />}
        {cmp < 0 && <ArrowDownIcon className="size-4 stroke-3" aria-label="менше за план" />}
      </span>
    </>
  )
}
