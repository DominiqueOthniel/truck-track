import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS pour le frontend React (Netlify + dev local)
  const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:5173',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5173',
  ];
  // Ajouter l'URL Netlify depuis les variables d'environnement
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  // Autoriser tous les sous-domaines *.netlify.app (previews de deploy)
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // curl / Postman / server-to-server
      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https:\/\/.*\.netlify\.app$/.test(origin);
      callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
    },
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
