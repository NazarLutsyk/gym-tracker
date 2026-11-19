import { Link } from 'react-router'
import { ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useHistory } from '../api'
import { countExercises, formatDate, formatDuration, formatTonnage } from '../format'

export function HistoryPage() {
  const { data, error, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useHistory()
  const items = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Історія</h1>

      {isPending ? (
        Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
      ) : error ? (
        <p className="text-destructive">{error.message}</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <p>Ще немає завершених тренувань</p>
          <Button className="h-11" asChild>
            <Link to="/workouts/new">Нове тренування</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((w) => (
            <li key={w.id}>
              <Link
                to={`/history/${w.id}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-muted-foreground">{w.finishedAt && formatDate(w.finishedAt)}</div>
                  <div className="truncate font-medium">{w.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {[formatDuration(w.startedAt, w.finishedAt), countExercises(w.exerciseCount), formatTonnage(w.tonnage)]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <Button variant="outline" className="h-11" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Завантажуємо…' : 'Показати ще'}
        </Button>
      )}
    </section>
  )
}
