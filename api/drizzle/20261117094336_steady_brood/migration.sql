CREATE INDEX "workout_exercises_exercise_id_idx" ON "workout_exercises" ("exercise_id");--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_popularity_check" CHECK ("popularity" between 1 and 10);--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_planned_weight_check" CHECK ("planned_weight" between 0 and 1000);--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_weight_check" CHECK ("weight" between 0 and 1000);--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_planned_reps_check" CHECK ("planned_reps" between 0 and 1000);--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_reps_check" CHECK ("reps" between 0 and 1000);