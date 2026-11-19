import { defineRelations } from 'drizzle-orm';
import * as schema from './schema.js';

export const relations = defineRelations(schema, (r) => ({
  users: {
    workouts: r.many.workouts(),
    exercises: r.many.exercises(),
  },
  exercises: {
    user: r.one.users({ from: r.exercises.userId, to: r.users.id }),
  },
  workouts: {
    user: r.one.users({ from: r.workouts.userId, to: r.users.id, optional: false }),
    exercises: r.many.workoutExercises(),
  },
  workoutExercises: {
    workout: r.one.workouts({ from: r.workoutExercises.workoutId, to: r.workouts.id, optional: false }),
    exercise: r.one.exercises({ from: r.workoutExercises.exerciseId, to: r.exercises.id, optional: false }),
    sets: r.many.workoutSets(),
  },
  workoutSets: {
    workoutExercise: r.one.workoutExercises({
      from: r.workoutSets.workoutExerciseId,
      to: r.workoutExercises.id,
      optional: false,
    }),
  },
}));
