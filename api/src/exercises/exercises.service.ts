import {
  HIDDEN_CATEGORIES,
  type createCustomExerciseSchema,
  type Exercise,
  type ExerciseHistory,
  type ExerciseList,
  type ExerciseListQuery,
  type paginationQuerySchema,
  type UpdateCustomExerciseInput,
} from '@gym/shared';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, arrayContains, asc, desc, eq, exists, ilike, inArray, isNotNull, isNull, notInArray, or, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type { Database } from '../db/database.js';
import { exercises, workoutExercises, workouts, workoutSets, type ExerciseRow } from '../db/schema.js';

type CreateCustomExercise = z.output<typeof createCustomExerciseSchema>;
type Pagination = z.output<typeof paginationQuerySchema>;

const NOT_FOUND = 'Вправу не знайдено';

const visibleTo = (userId: number) => or(isNull(exercises.userId), eq(exercises.userId, userId));

const toExercise = (e: ExerciseRow, userId: number): Exercise => ({
  id: e.id,
  name: e.name,
  nameUk: e.nameUk,
  category: e.category,
  equipment: e.equipment,
  primaryMuscles: e.primaryMuscles,
  secondaryMuscles: e.secondaryMuscles,
  level: e.level,
  force: e.force,
  mechanic: e.mechanic,
  instructions: e.instructions,
  images: e.images,
  popularity: e.popularity,
  isCustom: e.userId === userId,
});

@Injectable()
export class ExercisesService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async list(userId: number, { q, muscle, equipment, category, limit, offset }: ExerciseListQuery): Promise<ExerciseList> {
    const pattern = q && `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    const where = and(
      visibleTo(userId),
      category ? eq(exercises.category, category) : notInArray(exercises.category, HIDDEN_CATEGORIES),
      equipment && eq(exercises.equipment, equipment),
      muscle && or(arrayContains(exercises.primaryMuscles, [muscle]), arrayContains(exercises.secondaryMuscles, [muscle])),
      pattern ? or(ilike(exercises.name, pattern), ilike(exercises.nameUk, pattern)) : undefined,
    );
    const rows = await this.db
      .select({
        id: exercises.id,
        name: exercises.name,
        nameUk: exercises.nameUk,
        equipment: exercises.equipment,
        primaryMuscles: exercises.primaryMuscles,
        images: exercises.images,
        userId: exercises.userId,
      })
      .from(exercises)
      .where(where)
      .orderBy(sql`${exercises.popularity} asc nulls last`, asc(exercises.name), asc(exercises.id))
      .limit(limit)
      .offset(offset);
    const total = await this.db.$count(exercises, where);
    return { items: rows.map(({ userId: owner, ...r }) => ({ ...r, isCustom: owner === userId })), total };
  }

  async detail(userId: number, id: number): Promise<Exercise> {
    return toExercise(await this.visible(userId, id), userId);
  }

  async create(userId: number, input: CreateCustomExercise): Promise<Exercise> {
    const [row] = await this.db.insert(exercises).values({ ...input, userId }).returning();
    return toExercise(row!, userId);
  }

  /** Only the author's custom exercise: system → 403, someone else's → 404 (not visible). */
  async update(userId: number, id: number, input: UpdateCustomExerciseInput): Promise<Exercise> {
    const e = await this.visible(userId, id);
    if (e.userId === null) throw new ForbiddenException('Змінювати можна лише власні вправи');
    const values = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
    if (!Object.keys(values).length) return toExercise(e, userId);
    const [row] = await this.db.update(exercises).set(values).where(eq(exercises.id, id)).returning();
    return toExercise(row!, userId);
  }

  async history(userId: number, id: number, { limit, offset }: Pagination): Promise<ExerciseHistory> {
    await this.visible(userId, id);
    const where = and(
      eq(workouts.userId, userId),
      eq(workouts.status, 'finished'),
      exists(
        this.db
          .select({ one: sql`1` })
          .from(workoutExercises)
          .innerJoin(workoutSets, eq(workoutSets.workoutExerciseId, workoutExercises.id))
          // Qualified by hand: Drizzle renders the outer column unqualified (see workouts.service).
          .where(
            and(
              sql`${workoutExercises.workoutId} = "workouts"."id"`,
              eq(workoutExercises.exerciseId, id),
              isNotNull(workoutSets.completedAt),
            ),
          ),
      ),
    );
    const ws = await this.db
      .select({ id: workouts.id, name: workouts.name, finishedAt: workouts.finishedAt })
      .from(workouts)
      .where(where)
      .orderBy(desc(workouts.finishedAt), desc(workouts.id))
      .limit(limit)
      .offset(offset);
    const total = await this.db.$count(workouts, where);
    const sets = ws.length
      ? await this.db
          .select({ workoutId: workoutExercises.workoutId, weight: workoutSets.weight, reps: workoutSets.reps })
          .from(workoutSets)
          .innerJoin(workoutExercises, eq(workoutExercises.id, workoutSets.workoutExerciseId))
          .where(
            and(
              inArray(workoutExercises.workoutId, ws.map((w) => w.id)),
              eq(workoutExercises.exerciseId, id),
              isNotNull(workoutSets.completedAt),
            ),
          )
          .orderBy(asc(workoutExercises.order), asc(workoutExercises.id), asc(workoutSets.order), asc(workoutSets.id))
      : [];
    return {
      items: ws.map((w) => ({
        workoutId: w.id,
        workoutName: w.name,
        finishedAt: w.finishedAt!.toISOString(),
        sets: sets.filter((s) => s.workoutId === w.id).map(({ weight, reps }) => ({ weight, reps })),
      })),
      total,
    };
  }

  private async visible(userId: number, id: number): Promise<ExerciseRow> {
    const [e] = await this.db.select().from(exercises).where(and(eq(exercises.id, id), visibleTo(userId)));
    if (!e) throw new NotFoundException(NOT_FOUND);
    return e;
  }
}
