import type { KeyboardEvent } from 'react'
import { ArrowDownIcon, ArrowUpIcon, DumbbellIcon, EllipsisVerticalIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { cn } from 'cn'
import type { ExerciseSummary, WorkoutDetail, WorkoutExercise, WorkoutSet } from '@gym/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { assetUrl } from '@/lib/api'
import { compareSet, formatSet } from '@/features/history/format'
import { flushDeletes, useDeferredDelete, useToggleSet, useWorkoutAction } from '../api'

type Props = { workout: WorkoutDetail; item: WorkoutExercise; index: number }

export function ExerciseCard({ workout, item, index }: Props) {
  const action = useWorkoutAction(workout.id)
  const remove = useDeferredDelete(workout.id)
  const active = workout.status === 'active'
  const ids = workout.exercises.map((e) => e.id)
  // Mark extras only in a workout that has a plan: without one, everything is "extra".
  const planned = workout.exercises.some((e) => e.sets.some((s) => !s.unplanned))
  const extraExercise = active && planned && item.sets.length > 0 && item.sets.every((s) => s.unplanned)

  const move = (to: number) => {
    const next = [...ids]
    ;[next[index], next[to]] = [next[to], next[index]]
    action.mutate({ path: '/exercises/order', method: 'PATCH', body: { ids: next } })
  }

  const addSet = async () => {
    // Send waiting deletes first: the server counts sets against the plan, so a re-added set must see them gone.
    await flushDeletes(workout.id)
    const last = item.sets.at(-1)
    // In an active workout the last fact is the best guess for the next set.
    const body = active
      ? { plannedWeight: last?.weight ?? last?.plannedWeight, plannedReps: last?.reps ?? last?.plannedReps }
      : { plannedWeight: last?.plannedWeight, plannedReps: last?.plannedReps }
    action.mutate({ path: `/exercises/${item.id}/sets`, body })
  }

  return (
    <article className="rounded-xl border bg-card">
      <header className="flex items-center gap-3 p-3">
        <Thumb exercise={item.exercise} />
        <div className="min-w-0 flex-1">
          <h2 className="font-medium leading-tight">
            {item.exercise.nameUk ?? item.exercise.name}
            {extraExercise && (
              <Badge variant="secondary" className="ml-2 align-middle">
                Не в плані
              </Badge>
            )}
          </h2>
          {item.exercise.nameUk && <p className="truncate text-xs text-muted-foreground">{item.exercise.name}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-11" aria-label="Дії з вправою">
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="h-11" disabled={index === 0} onSelect={() => move(index - 1)}>
              <ArrowUpIcon /> Вище
            </DropdownMenuItem>
            <DropdownMenuItem className="h-11" disabled={index === ids.length - 1} onSelect={() => move(index + 1)}>
              <ArrowDownIcon /> Нижче
            </DropdownMenuItem>
            <DropdownMenuItem
              className="h-11"
              variant="destructive"
              onSelect={() => remove('exercise', item.id, 'Вправу видалено')}
            >
              <Trash2Icon /> Прибрати вправу
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div
        className={cn(
          'grid items-center gap-x-2 px-3 text-center',
          active ? 'grid-cols-[1.5rem_1fr_1fr_2.75rem_2.75rem]' : 'grid-cols-[1.5rem_1fr_1fr_2.75rem]',
        )}
      >
        <span className="text-xs text-muted-foreground">№</span>
        <span className="text-xs text-muted-foreground">вага, кг</span>
        <span className="text-xs text-muted-foreground">повтори</span>
        {active && <span className="text-xs text-muted-foreground">✓</span>}
        <span />
        {item.sets.map((set, i) => (
          <SetRow key={set.id} workout={workout} set={set} n={i + 1} showExtra={active && planned && !extraExercise} onRemove={() => remove('set', set.id, 'Підхід видалено')} />
        ))}
      </div>

      <Button variant="ghost" className="h-11 w-full rounded-t-none" onClick={() => void addSet()} disabled={action.isPending}>
        <PlusIcon /> Додати підхід
      </Button>
    </article>
  )
}

export function Thumb({ exercise }: { exercise: ExerciseSummary }) {
  const src = exercise.images[0]
  return src ? (
    <img src={assetUrl(src)} alt="" loading="lazy" className="size-12 shrink-0 rounded-md bg-muted object-cover" />
  ) : (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <DumbbellIcon className="size-5" />
    </div>
  )
}

type SetRowProps = { workout: WorkoutDetail; set: WorkoutSet; n: number; showExtra: boolean; onRemove: () => void }

function SetRow({ workout, set, n, showExtra, onRemove }: SetRowProps) {
  const action = useWorkoutAction(workout.id)
  const toggle = useToggleSet(workout.id)
  const active = workout.status === 'active'
  const done = set.completedAt !== null

  // Planned workout edits the plan; active workout edits the fact, with the plan as placeholder.
  const weight = active ? set.weight : set.plannedWeight
  const reps = active ? set.reps : set.plannedReps
  const weightHint = (active ? set.plannedWeight : null) ?? 'кг'
  const repsHint = (active ? set.plannedReps : null) ?? 'повт.'

  const save = (body: object) => action.mutate({ path: `/sets/${set.id}`, method: 'PATCH', body })

  const cmp = active && !set.unplanned ? compareSet(set) : 0
  const tone = cmp > 0 ? 'up' : cmp < 0 ? 'down' : undefined
  const note = showExtra && set.unplanned ? 'поза планом' : tone ? `план ${formatSet(set.plannedWeight, set.plannedReps)}` : null

  return (
    <>
      <span className="text-sm text-muted-foreground">{n}</span>
      <NumberInput
        value={weight}
        placeholder={String(weightHint)}
        decimal
        done={done}
        tone={tone}
        onSave={(v) => save(active ? { weight: v } : { plannedWeight: v })}
      />
      <NumberInput
        value={reps}
        placeholder={String(repsHint)}
        done={done}
        tone={tone}
        onSave={(v) => save(active ? { reps: v } : { plannedReps: v })}
      />
      {active && (
        <label className="flex h-11 cursor-pointer items-center justify-center">
          <Checkbox
            className="size-7 rounded-md [&_svg]:size-5!"
            checked={done}
            onCheckedChange={(c) => toggle.mutate({ setId: set.id, completed: c === true })}
            aria-label={`Підхід ${n} виконано`}
          />
        </label>
      )}
      <Button variant="ghost" size="icon" className="size-11 text-muted-foreground" aria-label={`Видалити підхід ${n}`} onClick={onRemove}>
        <Trash2Icon className="size-4" />
      </Button>
      {note && (
        <span className={cn('col-span-full -mt-1 mb-1 pl-8 text-left text-xs', tone === 'up' ? 'text-green-700' : tone === 'down' ? 'text-red-600' : 'text-muted-foreground')}>
          {tone === 'up' ? '↑ ' : tone === 'down' ? '↓ ' : ''}
          {note}
        </span>
      )}
    </>
  )
}

type NumberInputProps = {
  value: number | null
  placeholder: string
  decimal?: boolean
  done: boolean
  tone?: 'up' | 'down'
  onSave: (value: number | null) => void
}

/** Uncontrolled: saves on blur/Enter; remounts (via key) when the server value changes. */
function NumberInput({ value, placeholder, decimal, done, tone, onSave }: NumberInputProps) {
  const shown = value === null ? '' : String(value)

  const commit = (input: HTMLInputElement) => {
    const raw = input.value.trim().replace(',', '.')
    const next = raw === '' ? null : Number(raw)
    const valid = next === null || (Number.isFinite(next) && next >= 0 && next <= 1000 && (decimal || Number.isInteger(next)))
    if (!valid) input.value = shown
    else if (next !== value) onSave(next)
  }

  return (
    <input
      key={shown}
      defaultValue={shown}
      placeholder={placeholder}
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => commit(e.currentTarget)}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && e.currentTarget.blur()}
      className={cn(
        'my-1 h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-center text-base tabular-nums outline-none placeholder:text-sm placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        done && 'border-primary/40 bg-primary/5',
        tone === 'up' && 'font-medium text-green-700',
        tone === 'down' && 'font-medium text-red-600',
      )}
    />
  )
}
