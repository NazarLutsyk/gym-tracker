// Idempotent: upserts every exercise by external_id, then recreates the demo user with its workouts.
// Run: `pnpm db:seed` (builds first).
import { hash } from 'argon2';
import { eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { exercises, users, workoutExercises, workouts, workoutSets, type NewExercise } from '../schema.js';
// tsc emits the JSON next to the compiled seed.js, so the import works from dist.
import data from './exercises.json' with { type: 'json' };
import { DEMO_USER, demoWorkouts } from './demo.js';

const db = drizzle({
  connection: {
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  },
});

async function seedExercises() {
  const rows = data as NewExercise[];
  const updated = Object.keys(rows[0]!).filter((k) => k !== 'externalId') as (keyof NewExercise)[];
  const set = Object.fromEntries(updated.map((k) => [k, sql.raw(`excluded.${exercises[k as 'name'].name}`)]));
  // Batches keep each statement under pg's 65535-parameter limit.
  for (let i = 0; i < rows.length; i += 200) {
    await db
      .insert(exercises)
      .values(rows.slice(i, i + 200))
      .onConflictDoUpdate({ target: exercises.externalId, set });
  }
  console.log(`Seeded ${rows.length} exercises`);
}

/** Deletes the demo user (cascade removes its workouts) and creates it again with dates relative to today. */
async function seedDemo() {
  const externalIds = [...new Set(demoWorkouts.flatMap((w) => w.exercises.map((e) => e.ex)))];
  const found = await db
    .select({ id: exercises.id, externalId: exercises.externalId })
    .from(exercises)
    .where(inArray(exercises.externalId, externalIds));
  const exerciseId = new Map(found.map((e) => [e.externalId, e.id]));
  const passwordHash = await hash(DEMO_USER.password);

  await db.transaction(async (tx) => {
    await tx.delete(users).where(eq(users.email, DEMO_USER.email));
    const [user] = await tx
      .insert(users)
      .values({ email: DEMO_USER.email, name: DEMO_USER.name, passwordHash })
      .returning({ id: users.id });

    for (const w of demoWorkouts) {
      const start = new Date();
      start.setDate(start.getDate() - w.daysAgo);
      start.setHours(18, 0, 0, 0);
      const finished = w.minutes !== undefined;
      const end = new Date(start.getTime() + (w.minutes ?? 0) * 60_000);
      const [workout] = await tx
        .insert(workouts)
        .values({
          userId: user!.id,
          name: w.name,
          status: finished ? 'finished' : 'planned',
          createdAt: new Date(start.getTime() - 24 * 3600_000),
          startedAt: finished ? start : null,
          finishedAt: finished ? end : null,
        })
        .returning({ id: workouts.id });

      // Spread set ticks evenly over the workout so the history timeline looks real.
      const total = w.exercises.reduce((n, e) => n + e.sets.length, 0);
      let tick = 0;
      for (const [order, e] of w.exercises.entries()) {
        const id = exerciseId.get(e.ex);
        if (!id) throw new Error(`Exercise ${e.ex} not found: run the exercise seed first`);
        const [we] = await tx
          .insert(workoutExercises)
          .values({
            workoutId: workout!.id,
            exerciseId: id,
            order,
            plannedSets: finished ? (e.planned ?? e.sets.length) : null,
          })
          .returning({ id: workoutExercises.id });
        await tx.insert(workoutSets).values(
          e.sets.map(([plannedWeight, plannedReps, weight, reps], i) => {
            tick++;
            const done = finished && reps !== null;
            return {
              workoutExerciseId: we!.id,
              order: i,
              plannedWeight,
              plannedReps,
              weight: finished ? weight : null,
              reps: finished ? reps : null,
              completedAt: done ? new Date(start.getTime() + ((end.getTime() - start.getTime()) * tick) / (total + 1)) : null,
            };
          }),
        );
      }
    }
  });
  console.log(`Seeded demo user ${DEMO_USER.email} with ${demoWorkouts.length} workouts`);
}

try {
  await seedExercises();
  await seedDemo();
} finally {
  await db.$client.end();
}
