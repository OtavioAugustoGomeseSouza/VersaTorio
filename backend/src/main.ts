import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const DEFAULT_DEVELOPMENT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
];

function resolveCorsOrigins(): string[] {
  const configuredOrigins =
    process.env.APP_CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('APP_CORS_ORIGINS deve ser configurado em produção');
  }

  return DEFAULT_DEVELOPMENT_CORS_ORIGINS;
}

function formatValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): string[] {
  return errors.flatMap((error) => {
    const propertyPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const constraintMessages = Object.entries(error.constraints ?? {}).map(
      ([constraint, message]) =>
        constraint === 'whitelistValidation'
          ? `Campo "${propertyPath}" não é permitido`
          : message,
    );

    return [
      ...constraintMessages,
      ...formatValidationErrors(error.children ?? [], propertyPath),
    ];
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: resolveCorsOrigins(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException(formatValidationErrors(errors)),
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
