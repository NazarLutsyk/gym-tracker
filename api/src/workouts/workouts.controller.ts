import {
  addWorkoutExerciseSchema,
  createSetSchema,
  createWorkoutSchema,
  idSchema,
  reorderWorkoutExercisesSchema,
  updateSetSchema,
  updateWorkoutSchema,
  workoutDetailSchema,
  workoutListQuerySchema,
  workoutListSchema,
  type CreateSetInput,
  type ReorderWorkoutExercisesInput,
  type UpdateSetInput,
  type UpdateWorkoutInput,
  type WorkoutListQuery,
} from '@gym/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import type { Response } from 'express';
import type { z } from 'zod';
import { WorkoutsService } from './workouts.service.js';

const id = { schema: idSchema };

@ApiTags('workouts')
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  @Get()
  @ApiOkResponse({ standardSchema: workoutListSchema })
  list(@CurrentUser() user: AuthUser, @Query({ schema: workoutListQuerySchema }) query: WorkoutListQuery) {
    return this.workouts.list(user.id, query);
  }

  /** Detail of the active workout, or null. Declared before `:id`. */
  @Get('active')
  @ApiOkResponse({ standardSchema: workoutDetailSchema.nullable() })
  async active(@CurrentUser() user: AuthUser, @Res() res: Response) {
    // Nest sends an empty body for null; the contract wants a JSON `null`.
    res.json(await this.workouts.active(user.id));
  }

  @Get(':id')
  @ApiOkResponse({ standardSchema: workoutDetailSchema })
  detail(@CurrentUser() user: AuthUser, @Param('id', id) wid: number) {
    return this.workouts.detail(user.id, wid);
  }

  @Post()
  @ApiCreatedResponse({ standardSchema: workoutDetailSchema })
  create(@CurrentUser() user: AuthUser, @Body({ schema: createWorkoutSchema }) body: z.output<typeof createWorkoutSchema>) {
    return this.workouts.create(user.id, body);
  }

  @Patch(':id')
  @ApiOkResponse({ standardSchema: workoutDetailSchema })
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id', id) wid: number,
    @Body({ schema: updateWorkoutSchema }) body: UpdateWorkoutInput,
  ) {
    return this.workouts.rename(user.id, wid, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@CurrentUser() user: AuthUser, @Param('id', id) wid: number) {
    return this.workouts.remove(user.id, wid);
  }

  @Post(':id/start')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: workoutDetailSchema })
  start(@CurrentUser() user: AuthUser, @Param('id', id) wid: number) {
    return this.workouts.start(user.id, wid);
  }

  @Post(':id/finish')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: workoutDetailSchema })
  finish(@CurrentUser() user: AuthUser, @Param('id', id) wid: number) {
    return this.workouts.finish(user.id, wid);
  }

  @Post(':id/repeat')
  @ApiCreatedResponse({ standardSchema: workoutDetailSchema })
  repeat(@CurrentUser() user: AuthUser, @Param('id', id) wid: number) {
    return this.workouts.repeat(user.id, wid);
  }

  @Post(':id/exercises')
  @ApiCreatedResponse({ standardSchema: workoutDetailSchema })
  addExercise(
    @CurrentUser() user: AuthUser,
    @Param('id', id) wid: number,
    @Body({ schema: addWorkoutExerciseSchema }) body: z.output<typeof addWorkoutExerciseSchema>,
  ) {
    return this.workouts.addExercise(user.id, wid, body);
  }

  // Before `:id/exercises/:weId` routes so "order" isn't parsed as an id.
  @Patch(':id/exercises/order')
  @ApiOkResponse({ standardSchema: workoutDetailSchema })
  reorder(
    @CurrentUser() user: AuthUser,
    @Param('id', id) wid: number,
    @Body({ schema: reorderWorkoutExercisesSchema }) body: ReorderWorkoutExercisesInput,
  ) {
    return this.workouts.reorder(user.id, wid, body);
  }

  @Delete(':id/exercises/:weId')
  @ApiOkResponse({ standardSchema: workoutDetailSchema })
  removeExercise(
    @CurrentUser() user: AuthUser,
    @Param('id', id) wid: number,
    @Param('weId', id) weId: number,
  ) {
    return this.workouts.removeExercise(user.id, wid, weId);
  }

  @Post(':id/exercises/:weId/sets')
  @ApiCreatedResponse({ standardSchema: workoutDetailSchema })
  addSet(
    @CurrentUser() user: AuthUser,
    @Param('id', id) wid: number,
    @Param('weId', id) weId: number,
    @Body({ schema: createSetSchema }) body: CreateSetInput,
  ) {
    return this.workouts.addSet(user.id, wid, weId, body);
  }

  @Patch(':id/sets/:setId')
  @ApiOkResponse({ standardSchema: workoutDetailSchema })
  updateSet(
    @CurrentUser() user: AuthUser,
    @Param('id', id) wid: number,
    @Param('setId', id) setId: number,
    @Body({ schema: updateSetSchema }) body: UpdateSetInput,
  ) {
    return this.workouts.updateSet(user.id, wid, setId, body);
  }

  @Delete(':id/sets/:setId')
  @ApiOkResponse({ standardSchema: workoutDetailSchema })
  removeSet(
    @CurrentUser() user: AuthUser,
    @Param('id', id) wid: number,
    @Param('setId', id) setId: number,
  ) {
    return this.workouts.removeSet(user.id, wid, setId);
  }
}
