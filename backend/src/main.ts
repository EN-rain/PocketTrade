import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as express from 'express';

function allowedOrigins(): string[] | boolean {
  const configured = [
    ...(process.env.CORS_ORIGINS?.split(',') ?? []),
    process.env.ADMIN_ORIGIN ?? '',
  ].map((origin) => origin.trim()).filter(Boolean);

  return configured.length > 0 ? configured : process.env.NODE_ENV !== 'production';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance() as express.Express;
  const configuredProxy = process.env.TRUST_PROXY?.trim();
  if (configuredProxy) {
    const numericProxy = Number(configuredProxy);
    expressApp.set('trust proxy', Number.isInteger(numericProxy) ? numericProxy : configuredProxy);
  } else if (process.env.NODE_ENV === 'production') {
    expressApp.set('trust proxy', 1);
  }

  app.use('/assets', express.static(join(process.cwd(), 'public', 'assets'), {
    dotfiles: 'deny',
    fallthrough: false,
    index: false,
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
    setHeaders: (response) => {
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'none'; sandbox");
    },
  }));
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
  });

  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('PocketTrade API')
      .setDescription('PocketTrade API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api-docs', app, SwaggerModule.createDocument(app, config));
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

void bootstrap();
