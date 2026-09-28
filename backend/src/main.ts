import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingVars.length > 0) {
      console.error(`FATAL: Faltando variáveis de ambiente obrigatórias para produção: ${missingVars.join(', ')}`);
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule);
  
  // Security
  app.use(helmet());
  app.enableCors({
    origin: '*', // Em produção, restringir isso
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });
  
  // Validação Global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));

  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();

