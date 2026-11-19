import type { Category, Equipment, Force, Level, Mechanic, Muscle } from '@gym/shared';
import { eq, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const id = () => integer('id').primaryKey().generatedAlwaysAsIdentity();
const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const createdAt = () => tstz('created_at').notNull().defaultNow();
/** kg, null = bodyweight. */
const weight = (name: string) => numeric(name, { precision: 6, scale: 2, mode: 'number' });

export const users = pgTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: createdAt(),
});

export const exercises = pgTable(
  'exercises',
  {
    id: id(),
    /** free-exercise-db id; null for custom exercises. */
    externalId: text('external_id').unique(),
    /** null = system exercise, otherwise the author of a custom one. */
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    nameUk: text('name_uk'),
    category: text('category').$type<Category>().notNull(),
    equipment: text('equipment').$type<Equipment>(),
    primaryMuscles: text('primary_muscles').$type<Muscle>().array().notNull().default([]),
    secondaryMuscles: text('secondary_muscles').$type<Muscle>().array().notNull().default([]),
    level: text('level').$type<Level>(),
    force: text('force').$type<Force>(),
    mechanic: text('mechanic').$type<Mechanic>(),
    instructions: text('instructions').array().notNull().default([]),
    images: text('images').array().notNull().default([]),
    popularity: smallint('popularity'),
    createdAt: createdAt(),
  },
  (t) => [
    index('exercises_user_id_idx').on(t.userId),
    check('exercises_popularity_check', sql`${t.popularity} between 1 and 10`),
  ],
);

export const workoutStatus = pgEnum('workout_status', ['planned', 'active', 'finished']);

export const workouts = pgTable(
  'workouts',
  {
    id: id(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    status: workoutStatus('status').notNull().default('planned'),
    createdAt: createdAt(),
    startedAt: tstz('started_at'),
    finishedAt: tstz('finished_at'),
  },
  (t) => [
    index('workouts_user_id_status_idx').on(t.userId, t.status),
    // Only one active workout per user.
    uniqueIndex('workouts_one_active_per_user_idx').on(t.userId).where(eq(t.status, 'active')),
  ],
);

export const workoutExercises = pgTable(
  'workout_exercises',
  {
    id: id(),
    workoutId: integer('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    // Cascade: deleting a user removes their custom exercises together with workout rows using them
    // (with NO ACTION the cascade order made user deletion fail). There is no "delete exercise" endpoint.
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
    /**
     * How many sets the plan had when the workout started (0 = added during the workout, null = not started).
     * Sets beyond this count are "unplanned"; counting instead of flagging lets a deleted planned set be re-added.
     */
    plannedSets: integer('planned_sets'),
  },
  (t) => [
    index('workout_exercises_workout_id_idx').on(t.workoutId),
    // Exercise history and the cascade from exercises look rows up by exercise.
    index('workout_exercises_exercise_id_idx').on(t.exerciseId),
  ],
);

export const workoutSets = pgTable(
  'workout_sets',
  {
    id: id(),
    workoutExerciseId: integer('workout_exercise_id')
      .notNull()
      .references(() => workoutExercises.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
    plannedWeight: weight('planned_weight'),
    plannedReps: integer('planned_reps'),
    weight: weight('weight'),
    reps: integer('reps'),
    completedAt: tstz('completed_at'),
  },
  (t) => [
    index('workout_sets_workout_exercise_id_idx').on(t.workoutExerciseId),
    // Same limits as the zod schemas in shared/, enforced by the DB too (null passes: bodyweight / not entered).
    check('workout_sets_planned_weight_check', sql`${t.plannedWeight} between 0 and 1000`),
    check('workout_sets_weight_check', sql`${t.weight} between 0 and 1000`),
    check('workout_sets_planned_reps_check', sql`${t.plannedReps} between 0 and 1000`),
    check('workout_sets_reps_check', sql`${t.reps} between 0 and 1000`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ExerciseRow = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type WorkoutRow = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;
export type WorkoutExerciseRow = typeof workoutExercises.$inferSelect;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;
export type WorkoutSetRow = typeof workoutSets.$inferSelect;
export type NewWorkoutSet = typeof workoutSets.$inferInsert;
