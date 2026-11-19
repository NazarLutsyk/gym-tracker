import { z } from 'zod';
import { dateSchema, idSchema, paginated, paginationQuerySchema } from './common.js';
import { exerciseSummarySchema } from './exercises.js';

export const workoutStatusSchema = z.enum(['planned', 'active', 'finished']);

/** kg; null = bodyweight (for weighted exercises: not filled yet). */
const weight = z.number().min(0).max(1000).nullable();
const reps = z.number().int().min(0).max(1000).nullable();

export const workoutSetSchema = z.object({
  id: z.number().int(),
  order: z.number().int(),
  plannedWeight: weight,
  plannedReps: reps,
  weight,
  reps,
  completedAt: dateSchema.nullable(),
  /** Added during the active workout, not part of the plan. */
  unplanned: z.boolean(),
});

export const workoutExerciseSchema = z.object({
  id: z.number().int(),
  order: z.number().int(),
  exercise: exerciseSummarySchema,
  sets: z.array(workoutSetSchema),
});

const workoutBase = z.object({
  id: z.number().int(),
  name: z.string(),
  status: workoutStatusSchema,
  createdAt: dateSchema,
  startedAt: dateSchema.nullable(),
  finishedAt: dateSchema.nullable(),
  /** Σ weight × reps over completed sets, kg. */
  tonnage: z.number(),
});

export const workoutDetailSchema = workoutBase.extend({
  exercises: z.array(workoutExerciseSchema),
});

export const workoutListItemSchema = workoutBase.extend({
  exerciseCount: z.number().int(),
});

export const workoutListQuerySchema = paginationQuerySchema.extend({
  status: workoutStatusSchema.optional(),
});

export const workoutListSchema = paginated(workoutListItemSchema);

export const createWorkoutSchema = z.object({
  name: z.string().trim().min(1).max(100).default('Тренування'),
});

export const updateWorkoutSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const setInputSchema = z.object({
  plannedWeight: weight.optional(),
  plannedReps: reps.optional(),
  weight: weight.optional(),
  reps: reps.optional(),
});

export const addWorkoutExerciseSchema = z.object({
  exerciseId: idSchema,
  /** Sets to create with the exercise; one empty set by default. */
  sets: z.array(setInputSchema).min(1).max(20).default([{}]),
});

export const reorderWorkoutExercisesSchema = z.object({
  ids: z.array(idSchema).min(1),
});

export const createSetSchema = setInputSchema;

export const updateSetSchema = setInputSchema.extend({
  /**
   * true → completedAt = now; missing fact values are copied from the plan.
   * false → completedAt = null.
   */
  completed: z.boolean().optional(),
});

export type WorkoutStatus = z.infer<typeof workoutStatusSchema>;
export type WorkoutSet = z.infer<typeof workoutSetSchema>;
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;
export type WorkoutDetail = z.infer<typeof workoutDetailSchema>;
export type WorkoutListItem = z.infer<typeof workoutListItemSchema>;
export type WorkoutListQuery = z.infer<typeof workoutListQuerySchema>;
export type WorkoutList = z.infer<typeof workoutListSchema>;
export type CreateWorkoutInput = z.input<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type SetInput = z.infer<typeof setInputSchema>;
export type AddWorkoutExerciseInput = z.input<typeof addWorkoutExerciseSchema>;
export type ReorderWorkoutExercisesInput = z.infer<typeof reorderWorkoutExercisesSchema>;
export type CreateSetInput = z.infer<typeof createSetSchema>;
export type UpdateSetInput = z.infer<typeof updateSetSchema>;
