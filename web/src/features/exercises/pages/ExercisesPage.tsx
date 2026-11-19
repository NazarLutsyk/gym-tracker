import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { DumbbellIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { cn } from 'cn'
import {
  categorySchema,
  EQUIPMENT_LABELS,
  equipmentSchema,
  MUSCLE_LABELS,
  muscleSchema,
  type ExerciseSummary,
} from '@gym/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { assetUrl } from '@/lib/api'
import { CATEGORY_OPTIONS, options, useCreateExercise, useExercises } from '../api'
import { ExerciseForm, NativeSelect } from '../ExerciseForm'

export function ExercisesPage() {
  const [params, setParams] = useSearchParams()
  const filters = {
    q: params.get('q') || undefined,
    muscle: muscleSchema.safeParse(params.get('muscle')).data,
    equipment: equipmentSchema.safeParse(params.get('equipment')).data,
    category: categorySchema.safeParse(params.get('category')).data,
  }
  const setParam = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )

  // Search text is local for instant typing; it reaches the URL (and the query) after a pause.
  const [search, setSearch] = useState(filters.q ?? '')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const onSearch = (value: string) => {
    setSearch(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setParam('q', value.trim()), 300)
  }

  const list = useExercises(filters)
  const items = list.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Вправи</h1>
        <CreateExerciseDialog name={search.trim()}>
          <Button variant="outline" className="h-11">
            <PlusIcon /> Нова вправа
          </Button>
        </CreateExerciseDialog>
      </div>

      <InputGroup className="h-11">
        <InputGroupInput
          className="h-full"
          type="search"
          placeholder="Пошук вправи"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Пошук вправ"
        />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>

      {/* Selects size to their text, so labels are never cut; on very narrow screens the row scrolls sideways. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        <NativeSelect aria-label="М’язи" className={filterClass(filters.muscle)} value={filters.muscle ?? ''} onChange={(e) => setParam('muscle', e.target.value)}>
          <option value="">М’язи</option>
          {options(MUSCLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="Обладнання" className={filterClass(filters.equipment)} value={filters.equipment ?? ''} onChange={(e) => setParam('equipment', e.target.value)}>
          <option value="">Обладнання</option>
          {options(EQUIPMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="Категорія" className={filterClass(filters.category)} value={filters.category ?? ''} onChange={(e) => setParam('category', e.target.value)}>
          <option value="">Категорія</option>
          {CATEGORY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </NativeSelect>
      </div>

      {list.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : list.isError ? (
        <p className="text-destructive">{list.error.message}</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
          <p>Нічого не знайдено</p>
          {search.trim() ? (
            <CreateExerciseDialog name={search.trim()}>
              <Button className="h-11 max-w-full">
                <PlusIcon /> <span className="truncate">Створити «{search.trim()}»</span>
              </Button>
            </CreateExerciseDialog>
          ) : (
            <Button variant="outline" className="h-11" onClick={() => setParams({}, { replace: true })}>
              Скинути фільтри
            </Button>
          )}
        </div>
      ) : (
        <ul className={cn('-mx-2 flex flex-col transition-opacity', list.isPlaceholderData && 'opacity-60')}>
          {items.map((ex) => <ExerciseRow key={ex.id} exercise={ex} />)}
        </ul>
      )}

      {list.hasNextPage && (
        <Button variant="outline" className="h-11" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
          {list.isFetchingNextPage ? 'Завантажуємо…' : 'Показати ще'}
        </Button>
      )}
    </section>
  )
}

function ExerciseRow({ exercise: ex }: { exercise: ExerciseSummary }) {
  const details = [ex.equipment && EQUIPMENT_LABELS[ex.equipment], ex.primaryMuscles[0] && MUSCLE_LABELS[ex.primaryMuscles[0]]]
    .filter(Boolean)
    .join(' · ')
  return (
    <li>
      <Link to={`/exercises/${ex.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
        <Thumb src={ex.images[0]} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span className="line-clamp-2 font-medium break-words">{ex.nameUk ?? ex.name}</span>
            {ex.isCustom && <Badge variant="secondary" className="mt-0.5">Моя</Badge>}
          </div>
          {ex.nameUk && <div className="truncate text-xs text-muted-foreground">{ex.name}</div>}
          {details && <div className="truncate text-xs text-muted-foreground">{details}</div>}
        </div>
      </Link>
    </li>
  )
}

function Thumb({ src }: { src?: string }) {
  if (!src)
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <DumbbellIcon className="size-6" />
      </div>
    )
  return <img src={assetUrl(src)} alt="" loading="lazy" width={56} height={56} className="size-14 shrink-0 rounded-md bg-muted object-cover" />
}

const filterClass = (value?: string) => cn('w-auto shrink-0 [field-sizing:content]', value && 'border-primary bg-muted font-medium')

function CreateExerciseDialog({ name, children }: { name: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const create = useCreateExercise()
  const navigate = useNavigate()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Нова вправа</DialogTitle>
        </DialogHeader>
        <ExerciseForm
          defaultValues={{ name }}
          submitLabel="Створити"
          onSubmit={async (values) => {
            const ex = await create.mutateAsync(values)
            setOpen(false)
            navigate(`/exercises/${ex.id}`)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
