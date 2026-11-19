import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';
import { AppModule } from './app.module.js';
import { ApiExceptionFilter, validationException } from './common/api-exception.filter.js';
import './common/zod-uk.js';

const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.enableCors();
app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: validationException }));
app.useGlobalFilters(new ApiExceptionFilter());
app.useStaticAssets(join(import.meta.dirname, '..', 'static'), { prefix: '/static' });

// Zod 4 schemas expose `~standard.jsonSchema`, so Swagger converts them natively.
const config = new DocumentBuilder()
  .setTitle('Gym Tracker API')
  .addBearerAuth()
  .addSecurityRequirements('bearer')
  .build();
SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, config));

await app.listen(process.env.API_PORT ?? 3000);
