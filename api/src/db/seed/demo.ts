// Demo account. Recreated on every `pnpm db:seed`.
export const DEMO_USER = { email: 'demo@gym.test', password: 'demo1234', name: 'Демо' };

/** [planned weight, planned reps, fact weight, fact reps]; fact reps null = skipped. Weight null = bodyweight. */
type Set = [number | null, number, number | null, number | null];
type DemoExercise = { ex: string; sets: Set[]; /** sets in the plan at start; default all, 0 = added during the workout */ planned?: number };
type DemoWorkout = { name: string; daysAgo: number; /** duration; undefined = still planned */ minutes?: number; exercises: DemoExercise[] };

const same = (n: number, weight: number | null, reps: number): Set[] => Array.from({ length: n }, () => [weight, reps, weight, reps]);

const BENCH = 'Barbell_Bench_Press_-_Medium_Grip';

// Push / pull / legs over the last three weeks with gradual progression.
// Covers every history case: deviations up and down, a skipped set, a set beyond the plan, an exercise not in the plan.
export const demoWorkouts: DemoWorkout[] = [
  {
    name: 'Ноги',
    daysAgo: 19,
    minutes: 55,
    exercises: [
      { ex: 'Barbell_Squat', sets: same(3, 60, 8) },
      { ex: 'Leg_Press', sets: same(3, 120, 10) },
      { ex: 'Lying_Leg_Curls', sets: same(3, 35, 12) },
    ],
  },
  {
    name: 'Груди й трицепс',
    daysAgo: 17,
    minutes: 62,
    exercises: [
      { ex: BENCH, sets: [[60, 8, 60, 8], [60, 8, 60, 8], [60, 8, 60, 6]] },
      { ex: 'Incline_Dumbbell_Press', sets: same(3, 22, 10) },
      { ex: 'Triceps_Pushdown', sets: same(3, 25, 12) },
    ],
  },
  {
    name: 'Спина й біцепс',
    daysAgo: 15,
    minutes: 58,
    exercises: [
      { ex: 'Pullups', sets: same(3, null, 8) },
      { ex: 'Bent_Over_Barbell_Row', sets: same(3, 50, 10) },
      { ex: 'Dumbbell_Bicep_Curl', sets: same(3, 12, 12) },
    ],
  },
  {
    name: 'Ноги',
    daysAgo: 12,
    minutes: 50,
    exercises: [
      { ex: 'Barbell_Squat', sets: same(3, 62.5, 8) },
      { ex: 'Leg_Press', sets: same(3, 130, 10) },
      { ex: 'Lying_Leg_Curls', sets: [[35, 12, 35, 12], [35, 12, 35, 12], [35, 12, null, null]] },
    ],
  },
  {
    name: 'Груди й трицепс',
    daysAgo: 10,
    minutes: 68,
    exercises: [
      { ex: BENCH, sets: same(3, 60, 8) },
      { ex: 'Incline_Dumbbell_Press', sets: [...same(3, 22, 10), [22, 10, 22, 8]], planned: 3 },
      { ex: 'Triceps_Pushdown', sets: same(3, 25, 12) },
      { ex: 'Side_Lateral_Raise', sets: same(3, 8, 15), planned: 0 },
    ],
  },
  {
    name: 'Спина й біцепс',
    daysAgo: 8,
    minutes: 60,
    exercises: [
      { ex: 'Pullups', sets: [[null, 8, null, 9], [null, 8, null, 8], [null, 8, null, 7]] },
      { ex: 'Bent_Over_Barbell_Row', sets: same(3, 52.5, 10) },
      { ex: 'Wide-Grip_Lat_Pulldown', sets: same(3, 45, 12) },
      { ex: 'Dumbbell_Bicep_Curl', sets: same(3, 12, 12) },
    ],
  },
  {
    name: 'Ноги',
    daysAgo: 5,
    minutes: 57,
    exercises: [
      { ex: 'Barbell_Squat', sets: [[65, 8, 65, 8], [65, 8, 65, 8], [65, 8, 67.5, 8]] },
      { ex: 'Leg_Press', sets: [[130, 10, 130, 12], [130, 10, 130, 12], [130, 10, 130, 10]] },
      { ex: 'Lying_Leg_Curls', sets: same(3, 37.5, 12) },
    ],
  },
  {
    name: 'Груди й трицепс',
    daysAgo: 3,
    minutes: 64,
    exercises: [
      { ex: BENCH, sets: same(3, 62.5, 8) },
      { ex: 'Incline_Dumbbell_Press', sets: same(3, 24, 10) },
      { ex: 'Triceps_Pushdown', sets: same(3, 27.5, 12) },
      { ex: 'Side_Lateral_Raise', sets: same(3, 8, 15) },
    ],
  },
  {
    name: 'Спина й біцепс',
    daysAgo: 1,
    exercises: [
      { ex: 'Pullups', sets: same(3, null, 9) },
      { ex: 'Bent_Over_Barbell_Row', sets: same(3, 55, 10) },
      { ex: 'Wide-Grip_Lat_Pulldown', sets: same(3, 47.5, 12) },
      { ex: 'Dumbbell_Bicep_Curl', sets: same(3, 14, 10) },
    ],
  },
];
