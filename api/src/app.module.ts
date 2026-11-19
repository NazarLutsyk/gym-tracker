import { Controller, Get, Module } from '@nestjs/common';
import { DrizzleModule, InjectDrizzle } from '@nestjs/drizzle';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Database } from './db/database.js';
import { relations } from './db/relations.js';
import { AuthModule } from './auth/auth.module.js';
import { Public } from './auth/auth.decorators.js';
import { ExercisesModule } from './exercises/exercises.module.js';
import { WorkoutsModule } from './workouts/workouts.module.js';

@Public()
@Controller('health')
class HealthController {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  @Get()
  async get() {
    await this.db.execute(sql`select 1`);
    return { ok: true };
  }
}

@Module({
  imports: [
    DrizzleModule.forRoot({
      drizzle,
      connection: {
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT ?? 5432),
        user: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
      },
      relations,
    }),
    AuthModule,
    ExercisesModule,
    WorkoutsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
