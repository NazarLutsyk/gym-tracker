import type { WorkoutSet } from '@gym/shared'
import { plural } from '@/features/workouts/plural'

const dateFmt = new Intl.DateTimeFormat('uk', { weekday: 'short', day: 'numeric', month: 'short' })
const dateYearFmt = new Intl.DateTimeFormat('uk', { day: 'numeric', month: 'short', year: 'numeric' })
const numFmt = new Intl.NumberFormat('uk', { maximumFractionDigits: 1 })

/** "пн, 16 лист."; older years: "16 лист. 2025 р." */
export function formatDate(iso: string) {
  const d = new Date(iso)
  return (d.getFullYear() === new Date().getFullYear() ? dateFmt : dateYearFmt).format(d)
}

/** "1 год 05 хв", "45 хв", "<1 хв"; null when the workout was never started/finished. */
export function formatDuration(startedAt: string | null, finishedAt: string | null) {
  if (!startedAt || !finishedAt) return null
  const min = Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 60_000)
  if (min < 1) return '<1 хв'
  const h = Math.floor(min / 60)
  return h ? `${h} год ${String(min % 60).padStart(2, '0')} хв` : `${min} хв`
}

export const formatTonnage = (kg: number) => (kg ? `тоннаж ${numFmt.format(kg)} кг` : null)

/** "62.5×10", "12 повт.", "60 кг"; null when both values are empty. Dot decimals: same as the set inputs. */
export function formatSet(weight: number | null, reps: number | null) {
  if (weight === null && reps === null) return null
  if (weight === null) return `${reps} повт.`
  if (reps === null) return `${weight} кг`
  return `${weight}×${reps}`
}

export const countExercises = (n: number) => `${n} ${plural(n, ['вправа', 'вправи', 'вправ'])}`

/**
 * Fact vs plan: compare weight first (bodyweight = 0), then reps.
 * Volume (weight × reps) would make every bodyweight set "equal", so it is not used.
 * Returns 1 (better), -1 (worse), 0 (equal, no plan, or not completed).
 */
export function compareSet(s: WorkoutSet): -1 | 0 | 1 {
  if (!s.completedAt || s.unplanned || s.plannedReps === null) return 0
  const diff = (s.weight ?? 0) - (s.plannedWeight ?? 0) || (s.reps ?? 0) - s.plannedReps
  return diff > 0 ? 1 : diff < 0 ? -1 : 0
}
