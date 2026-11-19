import type {
  addWorkoutExerciseSchema,
  CreateSetInput,
  createWorkoutSchema,
  ReorderWorkoutExercisesInput,
  UpdateSetInput,
  UpdateWorkoutInput,
  WorkoutDetail,
  WorkoutList,
  WorkoutListQuery,
} from '@gym/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import type { z } from 'zod';
import { and, desc, eq, max, notExists, sql, type AnyColumn } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import type { Database } from '../db/database.js';
import { workoutExercises, workouts, workoutSets, type WorkoutRow } from '../db/schema.js';

type CreateWorkout = z.output<typeof createWorkoutSchema>;
type AddWorkoutExercise = z.output<typeof addWorkoutExerciseSchema>;
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

const NOT_FOUND = 'Тренування не знайдено';
const iso = (d: Date | null) => d?.toISOString() ?? null;
/** numeric(6,2) × int: round away float noise. */
const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class WorkoutsService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async list(userId: number, { status, limit, offset }: WorkoutListQuery): Promise<WorkoutList> {
    const where = and(eq(workouts.userId, userId), status && eq(workouts.status, status));
    const rows = await this.db
      .select({
        id: workouts.id,
        name: workouts.name,
        status: workouts.status,
        createdAt: workouts.createdAt,
        startedAt: workouts.startedAt,
        finishedAt: workouts.finishedAt,
        // Correlated subqueries; `workouts.id` is written out because Drizzle renders it unqualified.
        exerciseCount: sql<number>`(
          select count(*)::int from ${workoutExercises} we where we.workout_id = workouts.id
        )`,
        tonnage: sql<number>`(
          select coalesce(sum(s.weight * s.reps), 0)::float8
          from ${workoutSets} s join ${workoutExercises} we on we.id = s.workout_exercise_id
          where we.workout_id = workouts.id and s.completed_at is not null
        )`,
      })
      .from(workouts)
      .where(where)
      .orderBy(desc(status === 'finished' ? workouts.finishedAt : workouts.createdAt), desc(workouts.id))
      .limit(limit)
      .offset(offset);
    const total = await this.db.$count(workouts, where);
    return {
      items: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        startedAt: iso(r.startedAt),
        finishedAt: iso(r.finishedAt),
      })),
      total,
    };
  }

  async active(userId: number): Promise<WorkoutDetail | null> {
    const row = await this.db.query.workouts.findFirst({
      where: { userId, status: 'active' },
      columns: { id: true },
    });
    return row ? this.detail(userId, row.id) : null;
  }

  async detail(userId: number, id: number): Promise<WorkoutDetail> {
    const w = await this.db.query.workouts.findFirst({
      where: { id, userId },
      with: {
        exercises: {
          orderBy: { order: 'asc', id: 'asc' },
          with: {
            exercise: {
              columns: { id: true, name: true, nameUk: true, equipment: true, primaryMuscles: true, images: true, userId: true },
            },
            sets: { orderBy: { order: 'asc', id: 'asc' } },
          },
        },
      },
    });
    if (!w) throw new NotFoundException(NOT_FOUND);
    let tonnage = 0;
    const exercises = w.exercises.map((we) => ({
      id: we.id,
      order: we.order,
      exercise: {
        id: we.exercise.id,
        name: we.exercise.name,
        nameUk: we.exercise.nameUk,
        equipment: we.exercise.equipment,
        primaryMuscles: we.exercise.primaryMuscles,
        images: we.exercise.images,
        isCustom: we.exercise.userId === userId,
      },
      sets: we.sets.map((s, i) => {
        if (s.completedAt && s.weight !== null && s.reps !== null) tonnage += s.weight * s.reps;
        return {
          id: s.id,
          order: s.order,
          plannedWeight: s.plannedWeight,
          plannedReps: s.plannedReps,
          weight: s.weight,
          reps: s.reps,
          completedAt: iso(s.completedAt),
          unplanned: we.plannedSets !== null && i >= we.plannedSets,
        };
      }),
    }));
    return {
      id: w.id,
      name: w.name,
      status: w.status,
      createdAt: w.createdAt.toISOString(),
      startedAt: iso(w.startedAt),
      finishedAt: iso(w.finishedAt),
      tonnage: round2(tonnage),
      exercises,
    };
  }

  async create(userId: number, { name }: CreateWorkout): Promise<WorkoutDetail> {
    const [w] = await this.db.insert(workouts).values({ userId, name }).returning({ id: workouts.id });
    return this.detail(userId, w!.id);
  }

  async rename(userId: number, id: number, { name }: UpdateWorkoutInput) {
    await this.editable(userId, id);
    await this.db.update(workouts).set({ name }).where(eq(workouts.id, id));
    return this.detail(userId, id);
  }

  async remove(userId: number, id: number) {
    const w = await this.owned(userId, id);
    if (w.status === 'active') throw new ConflictException('Активне тренування не можна видалити. Спершу завершіть його');
    await this.db.delete(workouts).where(eq(workouts.id, id));
  }

  async start(userId: number, id: number) {
    const w = await this.owned(userId, id);
    if (w.status !== 'planned') throw new ConflictException('Почати можна лише заплановане тренування');
    try {
      await this.db.transaction(async (tx) => {
        await tx
          .update(workouts)
          .set({ status: 'active', startedAt: new Date() })
          .where(and(eq(workouts.id, id), eq(workouts.status, 'planned')));
        // Remember the plan size per exercise (see workoutExercises.plannedSets).
        await tx
          .update(workoutExercises)
          .set({ plannedSets: sql`(select count(*)::int from ${workoutSets} where ${workoutSets.workoutExerciseId} = "workout_exercises"."id")` })
          .where(eq(workoutExercises.workoutId, id));
      });
    } catch (e) {
      // workouts_one_active_per_user_idx
      if ((e as { cause?: { code?: string } }).cause?.code === '23505') {
        throw new ConflictException('У вас уже є активне тренування');
      }
      throw e;
    }
    return this.detail(userId, id);
  }

  async finish(userId: number, id: number) {
    const w = await this.owned(userId, id);
    if (w.status !== 'active') throw new ConflictException('Завершити можна лише активне тренування');
    await this.db.transaction(async (tx) => {
      await tx.update(workouts).set({ status: 'finished', finishedAt: new Date() }).where(eq(workouts.id, id));
      // Unticked planned sets stay as "skipped" (plan vs fact); unticked sets beyond the plan are dropped.
      await tx.execute(sql`
        delete from workout_sets where id in (
          select id from (
            select s.id, s.completed_at, we.planned_sets,
                   row_number() over (partition by s.workout_exercise_id order by s."order", s.id) - 1 as idx
            from workout_sets s join workout_exercises we on we.id = s.workout_exercise_id
            where we.workout_id = ${id}
          ) x
          where x.completed_at is null and x.planned_sets is not null and x.idx >= x.planned_sets
        )`);
      await tx.delete(workoutExercises).where(
        and(
          eq(workoutExercises.workoutId, id),
          notExists(tx.select().from(workoutSets).where(eq(workoutSets.workoutExerciseId, workoutExercises.id))),
        ),
      );
    });
    return this.detail(userId, id);
  }

  /** New planned copy; the plan takes the actual values of completed sets. */
  async repeat(userId: number, id: number) {
    const src = await this.detail(userId, id);
    const newId = await this.db.transaction(async (tx) => {
      const [w] = await tx.insert(workouts).values({ userId, name: src.name }).returning({ id: workouts.id });
      for (const e of src.exercises) {
        await this.insertExercise(
          tx,
          w!.id,
          e.exercise.id,
          e.order,
          e.sets.map((s) =>
            s.completedAt
              ? { plannedWeight: s.weight, plannedReps: s.reps }
              : { plannedWeight: s.plannedWeight, plannedReps: s.plannedReps },
          ),
        );
      }
      return w!.id;
    });
    return this.detail(userId, newId);
  }

  async addExercise(userId: number, id: number, { exerciseId, sets }: AddWorkoutExercise) {
    const w = await this.editable(userId, id);
    const exercise = await this.db.query.exercises.findFirst({
      where: { id: exerciseId, OR: [{ userId: { isNull: true } }, { userId }] },
      columns: { id: true },
    });
    if (!exercise) throw new NotFoundException('Вправу не знайдено');
    await this.db.transaction(async (tx) => {
      const [{ next }] = (await tx
        .select({ next: sql<number>`coalesce(${max(workoutExercises.order)}, -1)::int + 1` })
        .from(workoutExercises)
        .where(eq(workoutExercises.workoutId, id))) as [{ next: number }];
      await this.insertExercise(tx, id, exerciseId, next, sets, w.status === 'active' ? 0 : null);
    });
    return this.detail(userId, id);
  }

  async removeExercise(userId: number, id: number, weId: number) {
    await this.editable(userId, id);
    const deleted = await this.db
      .delete(workoutExercises)
      .where(and(eq(workoutExercises.id, weId), eq(workoutExercises.workoutId, id)))
      .returning({ id: workoutExercises.id });
    if (!deleted.length) throw new NotFoundException('Вправу в тренуванні не знайдено');
    return this.detail(userId, id);
  }

  async reorder(userId: number, id: number, { ids }: ReorderWorkoutExercisesInput) {
    await this.editable(userId, id);
    const current = await this.db
      .select({ id: workoutExercises.id })
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, id));
    const known = new Set(current.map((r) => r.id));
    if (ids.length !== known.size || new Set(ids).size !== ids.length || !ids.every((i) => known.has(i))) {
      throw new BadRequestException('Неправильний порядок вправ');
    }
    await this.db.transaction(async (tx) => {
      for (const [order, weId] of ids.entries()) {
        await tx.update(workoutExercises).set({ order }).where(eq(workoutExercises.id, weId));
      }
    });
    return this.detail(userId, id);
  }

  async addSet(userId: number, id: number, weId: number, input: CreateSetInput) {
    await this.editable(userId, id);
    const we = await this.db.query.workoutExercises.findFirst({ where: { id: weId, workoutId: id }, columns: { id: true } });
    if (!we) throw new NotFoundException('Вправу в тренуванні не знайдено');
    await this.db.insert(workoutSets).values({
      ...input,
      workoutExerciseId: weId,
      order: sql`(select coalesce(max("order"), -1) + 1 from ${workoutSets} where workout_exercise_id = ${weId})`,
    });
    return this.detail(userId, id);
  }

  async updateSet(userId: number, id: number, setId: number, { completed, ...input }: UpdateSetInput) {
    await this.editable(userId, id);
    await this.findSet(id, setId);
    // Write only the given fields, computed in SQL: concurrent PATCHes (weight, then reps, then ✓)
    // must not overwrite each other with stale values.
    const values: PgUpdateSetSource<typeof workoutSets> = stripUndefined(input);
    if (completed === true) {
      const fact = (given: number | null | undefined, col: AnyColumn, plan: number | null | undefined, planCol: AnyColumn) =>
        sql`coalesce(${given !== undefined ? given : col}, ${plan !== undefined ? plan : planCol})`;
      values.completedAt = sql`coalesce(${workoutSets.completedAt}, now())`;
      values.weight = fact(input.weight, workoutSets.weight, input.plannedWeight, workoutSets.plannedWeight);
      values.reps = fact(input.reps, workoutSets.reps, input.plannedReps, workoutSets.plannedReps);
    } else if (completed === false) {
      values.completedAt = null;
    }
    if (Object.keys(values).length) {
      await this.db.update(workoutSets).set(values).where(eq(workoutSets.id, setId));
    }
    return this.detail(userId, id);
  }

  async removeSet(userId: number, id: number, setId: number) {
    await this.editable(userId, id);
    await this.findSet(id, setId);
    await this.db.delete(workoutSets).where(eq(workoutSets.id, setId));
    return this.detail(userId, id);
  }

  private async owned(userId: number, id: number): Promise<WorkoutRow> {
    const w = await this.db.query.workouts.findFirst({ where: { id, userId } });
    if (!w) throw new NotFoundException(NOT_FOUND);
    return w;
  }

  private async editable(userId: number, id: number) {
    const w = await this.owned(userId, id);
    if (w.status === 'finished') throw new ConflictException('Завершене тренування не можна змінювати');
    return w;
  }

  private async findSet(workoutId: number, setId: number) {
    const [row] = await this.db
      .select({ set: workoutSets })
      .from(workoutSets)
      .innerJoin(workoutExercises, eq(workoutExercises.id, workoutSets.workoutExerciseId))
      .where(and(eq(workoutSets.id, setId), eq(workoutExercises.workoutId, workoutId)));
    if (!row) throw new NotFoundException('Підхід не знайдено');
    return row.set;
  }

  private async insertExercise(
    tx: Tx,
    workoutId: number,
    exerciseId: number,
    order: number,
    sets: CreateSetInput[],
    plannedSets: number | null = null,
  ) {
    const [we] = await tx
      .insert(workoutExercises)
      .values({ workoutId, exerciseId, order, plannedSets })
      .returning({ id: workoutExercises.id });
    await tx.insert(workoutSets).values(sets.map((s, i) => ({ ...s, workoutExerciseId: we!.id, order: i })));
    return we!.id;
  }
}

const stripUndefined = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
