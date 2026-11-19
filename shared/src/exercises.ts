import { z } from 'zod';
import { dateSchema, paginated, paginationQuerySchema } from './common.js';
import {
  categorySchema,
  equipmentSchema,
  forceSchema,
  levelSchema,
  mechanicSchema,
  muscleSchema,
} from './dictionaries.js';

export const exerciseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  nameUk: z.string().nullable(),
  category: categorySchema,
  equipment: equipmentSchema.nullable(),
  primaryMuscles: z.array(muscleSchema),
  secondaryMuscles: z.array(muscleSchema),
  level: levelSchema.nullable(),
  force: forceSchema.nullable(),
  mechanic: mechanicSchema.nullable(),
  instructions: z.array(z.string()),
  /** Paths relative to the API origin, e.g. `/static/exercises/Barbell_Squat/0.jpg`. */
  images: z.array(z.string()),
  popularity: z.number().int().min(1).max(10).nullable(),
  isCustom: z.boolean(),
});

export const exerciseSummarySchema = exerciseSchema.pick({
  id: true,
  name: true,
  nameUk: true,
  equipment: true,
  primaryMuscles: true,
  images: true,
  isCustom: true,
});

export const exerciseListQuerySchema = paginationQuerySchema.extend({
  /** Matches English and Ukrainian names. */
  q: z.string().trim().max(100).optional(),
  muscle: muscleSchema.optional(),
  equipment: equipmentSchema.optional(),
  category: categorySchema.optional(),
});

export const exerciseListSchema = paginated(exerciseSummarySchema);

export const createCustomExerciseSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: categorySchema.default('strength'),
  equipment: equipmentSchema.nullable().default(null),
  primaryMuscles: z.array(muscleSchema).default([]),
  secondaryMuscles: z.array(muscleSchema).default([]),
});

export const updateCustomExerciseSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  category: categorySchema.optional(),
  equipment: equipmentSchema.nullable().optional(),
  primaryMuscles: z.array(muscleSchema).optional(),
  secondaryMuscles: z.array(muscleSchema).optional(),
});

export const exerciseHistoryItemSchema = z.object({
  workoutId: z.number().int(),
  workoutName: z.string(),
  finishedAt: dateSchema,
  sets: z.array(z.object({ weight: z.number().nullable(), reps: z.number().int().nullable() })),
});

export const exerciseHistorySchema = paginated(exerciseHistoryItemSchema);

export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseSummary = z.infer<typeof exerciseSummarySchema>;
export type ExerciseListQuery = z.infer<typeof exerciseListQuerySchema>;
export type ExerciseList = z.infer<typeof exerciseListSchema>;
export type CreateCustomExerciseInput = z.input<typeof createCustomExerciseSchema>;
export type UpdateCustomExerciseInput = z.infer<typeof updateCustomExerciseSchema>;
export type ExerciseHistoryItem = z.infer<typeof exerciseHistoryItemSchema>;
export type ExerciseHistory = z.infer<typeof exerciseHistorySchema>;
