import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { SetInput, WorkoutDetail } from '@gym/shared'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { invalidateLists, workoutKeys } from '../api'
import { AddExerciseSheet } from '../components/AddExerciseSheet'
import { NameField } from './WorkoutPage'

/**
 * Draft: nothing is saved until the first exercise is picked, so leaving it leaves no empty workout.
 * Laid out like an empty planned workout, so the page doesn't jump once it is saved.
 */
export function NewWorkoutPage() {
  const [name, setName] = useState('Тренування')
  const qc = useQueryClient()
  const navigate = useNavigate()

  const create = async (exerciseId: number, sets: SetInput[]) => {
    let w: WorkoutDetail | undefined
    try {
      w = await api<WorkoutDetail>('/workouts', { method: 'POST', body: { name: name.trim() || undefined } })
      const detail = await api<WorkoutDetail>(`/workouts/${w.id}/exercises`, { method: 'POST', body: { exerciseId, sets } })
      qc.setQueryData(workoutKeys.detail(w.id), detail)
      void invalidateLists(qc)
      navigate(`/workouts/${w.id}`, { replace: true })
    } catch (e) {
      if (w) void api(`/workouts/${w.id}`, { method: 'DELETE' }).catch(() => {})
      toast.error((e as Error).message)
      throw e
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="sticky top-14 z-[5] -mx-4 flex flex-col gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <NameField value={name} onChange={(e) => setName(e.target.value)} placeholder="Назва" />
        <Button asChild variant="outline" className="h-12 text-base">
          <Link to="/workouts">Скасувати</Link>
        </Button>
      </header>
      <AddExerciseSheet onPick={create} />
    </section>
  )
}
