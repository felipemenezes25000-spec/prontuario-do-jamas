import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('port', 3000);
  const appUrl = configService.get<string>('app.url', 'http://localhost:5173');

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: appUrl.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('VoxPEP API')
    .setDescription('Voice-first Electronic Health Records API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Auth', 'Authentication and authorization')
    .addTag('Tenants', 'Multi-tenant management')
    .addTag('Users', 'User management')
    .addTag('Patients', 'Patient records')
    .addTag('Encounters', 'Clinical encounters')
    .addTag('Clinical Notes', 'SOAP and clinical notes')
    .addTag('Prescriptions', 'Prescription management')
    .addTag('Vital Signs', 'Patient vital signs')
    .addTag('Nursing', 'Nursing processes (SAE)')
    .addTag('Triage', 'Patient triage')
    .addTag('Admissions', 'Hospital admissions and beds')
    .addTag('Surgical', 'Surgical procedures')
    .addTag('Exams', 'Lab and imaging results')
    .addTag('Documents', 'Document management')
    .addTag('Alerts', 'Clinical alerts')
    .addTag('Appointments', 'Scheduling')
    .addTag('Billing', 'Billing and TISS')
    .addTag('Audit', 'Audit trail')
    .addTag('Notifications', 'User notifications')
    .addTag('AI', 'AI-powered services')
    .addTag('Search', 'Full-text search')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`VoxPEP API running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
