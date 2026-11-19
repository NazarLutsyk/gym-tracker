import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ArrowLeftIcon, PencilIcon } from 'lucide-react'
import {
  CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  MECHANIC_LABELS,
  MUSCLE_LABELS,
  type Exercise,
  type Muscle,
} from '@gym/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatSet } from '@/features/history/format'
import { ApiError, assetUrl } from '@/lib/api'
import { useExercise, useExerciseHistory, useUpdateExercise } from '../api'
import { ExerciseForm } from '../ExerciseForm'

const NOT_SET = 'Не вказано'

export function ExercisePage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const location = useLocation()
  const { data: ex, error, isPending } = useExercise(id)

  return (
    <section className="flex flex-col gap-5">
      {/* Back keeps the catalog search/filters, or returns to a workout in history; the catalog when opened directly. */}
      <Button
        variant="ghost"
        className="-ml-2 h-11 self-start"
        onClick={() => (location.key === 'default' ? navigate('/exercises') : navigate(-1))}
      >
        <ArrowLeftIcon /> Назад
      </Button>

      {isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="aspect-[2/1]" />
        </div>
      ) : error ? (
        <p className="text-muted-foreground">
          {error instanceof ApiError && error.statusCode === 404 ? 'Вправу не знайдено' : error.message}
        </p>
      ) : (
        <Details exercise={ex} />
      )}
    </section>
  )
}

function Details({ exercise: ex }: { exercise: Exercise }) {
  const facts = [
    ['Обладнання', ex.equipment ? EQUIPMENT_LABELS[ex.equipment] : ex.isCustom ? NOT_SET : null],
    ['Категорія', CATEGORY_LABELS[ex.category]],
    ['Тип вправи', ex.mechanic && MECHANIC_LABELS[ex.mechanic]],
    ['Рівень', ex.level && LEVEL_LABELS[ex.level]],
  ].filter((f): f is [string, string] => !!f[1])

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold break-words">{ex.nameUk ?? ex.name}</h1>
          {ex.nameUk && <p className="text-muted-foreground">{ex.name}</p>}
        </div>
        {ex.isCustom && <EditExerciseDialog exercise={ex} />}
      </div>

      {ex.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {ex.images.map((src) => (
            <img key={src} src={assetUrl(src)} alt="" className="aspect-[4/3] w-full rounded-lg bg-muted object-cover" />
          ))}
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <Muscles title="Основні м’язи" muscles={ex.primaryMuscles} empty={ex.isCustom ? NOT_SET : undefined} />
      <Muscles title="Допоміжні м’язи" muscles={ex.secondaryMuscles} />

      <History id={ex.id} />

      {ex.instructions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Техніка</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm" lang="en">
            {ex.instructions.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </div>
      )}
    </>
  )
}

function Muscles({ title, muscles, empty }: { title: string; muscles: Muscle[]; empty?: string }) {
  if (muscles.length === 0 && !empty) return null
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm text-muted-foreground">{title}</h2>
      {muscles.length === 0 ? (
        <p className="text-sm font-medium">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {muscles.map((m) => <Badge key={m} variant="secondary">{MUSCLE_LABELS[m]}</Badge>)}
        </div>
      )}
    </div>
  )
}

function History({ id }: { id: number }) {
  const history = useExerciseHistory(id)
  const items = history.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Історія</h2>
      {history.isPending ? (
        <Skeleton className="h-16" />
      ) : history.isError ? (
        <p className="text-sm text-destructive">{history.error.message}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Поки порожньо</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {items.map((item) => (
            <li key={item.workoutId}>
              <Link to={`/history/${item.workoutId}`} className="flex min-h-11 flex-col rounded-lg p-2 hover:bg-muted">
                <span className="text-sm font-medium tabular-nums">
                  {item.sets.map((s) => formatSet(s.weight, s.reps)).filter(Boolean).join(', ')}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {formatDate(item.finishedAt)} · {item.workoutName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {history.hasNextPage && (
        <Button variant="outline" className="h-11" onClick={() => history.fetchNextPage()} disabled={history.isFetchingNextPage}>
          {history.isFetchingNextPage ? 'Завантажуємо…' : 'Показати ще'}
        </Button>
      )}
    </div>
  )
}

function EditExerciseDialog({ exercise: ex }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false)
  const update = useUpdateExercise(ex.id)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11">
          <PencilIcon /> Змінити
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Змінити вправу</DialogTitle>
        </DialogHeader>
        <ExerciseForm
          defaultValues={ex}
          submitLabel="Зберегти"
          onSubmit={async (values) => {
            await update.mutateAsync(values)
            setOpen(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
