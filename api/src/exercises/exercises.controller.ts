import {
  createCustomExerciseSchema,
  exerciseHistorySchema,
  exerciseListQuerySchema,
  exerciseListSchema,
  exerciseSchema,
  idSchema,
  paginationQuerySchema,
  updateCustomExerciseSchema,
  type ExerciseListQuery,
  type UpdateCustomExerciseInput,
} from '@gym/shared';
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { ExercisesService } from './exercises.service.js';

const id = { schema: idSchema };

@ApiTags('exercises')
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  @ApiOkResponse({ standardSchema: exerciseListSchema })
  list(@CurrentUser() user: AuthUser, @Query({ schema: exerciseListQuerySchema }) query: ExerciseListQuery) {
    return this.exercises.list(user.id, query);
  }

  @Get(':id')
  @ApiOkResponse({ standardSchema: exerciseSchema })
  detail(@CurrentUser() user: AuthUser, @Param('id', id) eid: number) {
    return this.exercises.detail(user.id, eid);
  }

  @Post()
  @ApiCreatedResponse({ standardSchema: exerciseSchema })
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: createCustomExerciseSchema }) body: z.output<typeof createCustomExerciseSchema>,
  ) {
    return this.exercises.create(user.id, body);
  }

  @Patch(':id')
  @ApiOkResponse({ standardSchema: exerciseSchema })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', id) eid: number,
    @Body({ schema: updateCustomExerciseSchema }) body: UpdateCustomExerciseInput,
  ) {
    return this.exercises.update(user.id, eid, body);
  }

  @Get(':id/history')
  @ApiOkResponse({ standardSchema: exerciseHistorySchema })
  history(
    @CurrentUser() user: AuthUser,
    @Param('id', id) eid: number,
    @Query({ schema: paginationQuerySchema }) query: z.output<typeof paginationQuerySchema>,
  ) {
    return this.exercises.history(user.id, eid, query);
  }
}
