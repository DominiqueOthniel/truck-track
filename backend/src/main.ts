import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS pour le frontend React
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  });

  // Préfixe global de l'API
  app.setGlobalPrefix('api');

  // Validation des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚚 Truck Track API: http://localhost:${port}/api`);
}

bootstrap();
