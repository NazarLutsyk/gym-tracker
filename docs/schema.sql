-- Gym Tracker: PostgreSQL schema. Generated from api/src/db/schema.ts by pnpm db:schema, do not edit.
CREATE TYPE "workout_status" AS ENUM('planned', 'active', 'finished');
CREATE TABLE "exercises" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exercises_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"external_id" text UNIQUE,
	"user_id" integer,
	"name" text NOT NULL,
	"name_uk" text,
	"category" text NOT NULL,
	"equipment" text,
	"primary_muscles" text[] DEFAULT '{}'::text[] NOT NULL,
	"secondary_muscles" text[] DEFAULT '{}'::text[] NOT NULL,
	"level" text,
	"force" text,
	"mechanic" text,
	"instructions" text[] DEFAULT '{}'::text[] NOT NULL,
	"images" text[] DEFAULT '{}'::text[] NOT NULL,
	"popularity" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_popularity_check" CHECK ("popularity" between 1 and 10)
);

CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "workout_exercises" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workout_exercises_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workout_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"order" integer NOT NULL,
	"planned_sets" integer
);

CREATE TABLE "workout_sets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workout_sets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workout_exercise_id" integer NOT NULL,
	"order" integer NOT NULL,
	"planned_weight" numeric(6,2),
	"planned_reps" integer,
	"weight" numeric(6,2),
	"reps" integer,
	"completed_at" timestamp with time zone,
	CONSTRAINT "workout_sets_planned_weight_check" CHECK ("planned_weight" between 0 and 1000),
	CONSTRAINT "workout_sets_weight_check" CHECK ("weight" between 0 and 1000),
	CONSTRAINT "workout_sets_planned_reps_check" CHECK ("planned_reps" between 0 and 1000),
	CONSTRAINT "workout_sets_reps_check" CHECK ("reps" between 0 and 1000)
);

CREATE TABLE "workouts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workouts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"status" "workout_status" DEFAULT 'planned'::"workout_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);

CREATE INDEX "exercises_user_id_idx" ON "exercises" ("user_id");
CREATE INDEX "workout_exercises_workout_id_idx" ON "workout_exercises" ("workout_id");
CREATE INDEX "workout_exercises_exercise_id_idx" ON "workout_exercises" ("exercise_id");
CREATE INDEX "workout_sets_workout_exercise_id_idx" ON "workout_sets" ("workout_exercise_id");
CREATE INDEX "workouts_user_id_status_idx" ON "workouts" ("user_id","status");
CREATE UNIQUE INDEX "workouts_one_active_per_user_idx" ON "workouts" ("user_id") WHERE "status" = 'active';
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_id_workouts_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE CASCADE;
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_id_exercises_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE;
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_exercise_id_workout_exercises_id_fkey" FOREIGN KEY ("workout_exercise_id") REFERENCES "workout_exercises"("id") ON DELETE CASCADE;
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
