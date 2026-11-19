import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { Exercise, ExerciseList, SetInput } from '@gym/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { api } from '@/lib/api'
import { Thumb } from './ExerciseCard'

function useDebounced<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

type Props = {
  onPick: (exerciseId: number, sets: SetInput[]) => Promise<unknown>
}

export function AddExerciseSheet({ onPick }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const query = useDebounced(q.trim())
  const qc = useQueryClient()
  const pick = useMutation({
    mutationFn: (exerciseId: number) =>
      onPick(exerciseId, [{}]),
    onSuccess: () => {
      setOpen(false)
      setQ('')
    },
  })

  const results = useQuery({
    queryKey: ['exercises', 'search', query],
    queryFn: () => api<ExerciseList>(`/exercises?limit=20&q=${encodeURIComponent(query)}`),
    placeholderData: keepPreviousData,
    enabled: open,
  })

  const create = useMutation({
    mutationFn: (name: string) => api<Exercise>('/exercises', { method: 'POST', body: { name } }),
    onSuccess: (exercise) => {
      void qc.invalidateQueries({ queryKey: ['exercises'] })
      pick.mutate(exercise.id)
    },
    onError: (e) => toast.error(e.message),
  })

  const items = results.data?.items ?? []
  const lower = query.toLowerCase()
  const exact = items.some((e) => e.name.toLowerCase() === lower || e.nameUk?.toLowerCase() === lower)
  const busy = pick.isPending || create.isPending

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-12 w-full text-base">
          <PlusIcon /> Додати вправу
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85svh] gap-0 rounded-t-2xl data-[side=bottom]:h-[85svh]">
        <SheetHeader>
          <SheetTitle>Додати вправу</SheetTitle>
        </SheetHeader>
        <div className="relative mx-4 mb-2">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Пошук вправи"
            className="h-11 pl-9"
            enterKeyHint="search"
            autoFocus
          />
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-[env(safe-area-inset-bottom)]" aria-busy={results.isFetching}>
          {query && !exact && !results.isFetching && (
            <li>
              <button
                type="button"
                disabled={busy}
                onClick={() => create.mutate(query)}
                className="flex min-h-14 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-muted disabled:opacity-50"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <PlusIcon className="size-5" />
                </span>
                <span>Створити «{query}»</span>
              </button>
            </li>
          )}
          {items.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => pick.mutate(e.id)}
                className="flex min-h-14 w-full items-center gap-3 rounded-lg px-2 py-1 text-left hover:bg-muted disabled:opacity-50"
              >
                <Thumb exercise={e} />
                <span className="min-w-0">
                  <span className="block leading-tight">{e.nameUk ?? e.name}</span>
                  {e.nameUk && <span className="block truncate text-xs text-muted-foreground">{e.name}</span>}
                </span>
              </button>
            </li>
          ))}
          {results.isPending && <li className="p-4 text-center text-sm text-muted-foreground">Шукаємо…</li>}
          {results.isError && <li className="p-4 text-center text-sm text-destructive">{results.error.message}</li>}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
