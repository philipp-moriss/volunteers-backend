import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, ClassSerializerInterceptor, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './shared/filters/http-exception.filter';
import { DataSource } from 'typeorm';

const logger = new Logger('Bootstrap');

async function checkPostGIS(dataSource: DataSource): Promise<void> {
  try {
    const result = await dataSource.query(
      "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis') as postgis_exists"
    );
    
    if (!result[0]?.postgis_exists) {
      logger.warn('⚠️  PostGIS extension is not installed. Attempting to install...');
      
      try {
        // Пытаемся установить PostGIS автоматически
        await dataSource.query("CREATE EXTENSION IF NOT EXISTS postgis;");
        logger.log('✅ PostGIS extension installed successfully');
      } catch (installError) {
        logger.error('❌ Failed to install PostGIS extension automatically');
        logger.error('Error:', installError instanceof Error ? installError.message : 'Unknown error');
        logger.error('');
        logger.error('Please install PostGIS manually:');
        logger.error('  psql <DATABASE_URL> -c "CREATE EXTENSION IF NOT EXISTS postgis;"');
        logger.error('');
        logger.error('Or see POSTGIS_RAILWAY_SETUP.md for more details.');
        logger.warn('Application will continue, but geometry fields will not work correctly.');
      }
    } else {
      logger.log('✅ PostGIS extension is installed');
    }
  } catch (error) {
    logger.warn('⚠️  Could not check PostGIS extension:', error instanceof Error ? error.message : 'Unknown error');
    logger.warn('Application will continue, but geometry fields may not work correctly.');
  }
}

async function bootstrap() {
  process.env.TZ = 'UTC';
  const app = await NestFactory.create(AppModule);
  
  // Проверка PostGIS после создания приложения
  try {
    const dataSource = app.get(DataSource);
    await checkPostGIS(dataSource);
  } catch (error) {
    logger.warn('Could not check PostGIS:', error instanceof Error ? error.message : 'Unknown error');
  }
  app.enableCors({
    origin: true, // Разрешаем все источники
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true, // Разрешаем credentials для работы с cookies и авторизацией
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  const config = new DocumentBuilder()
    .setTitle('Backend')
    .setDescription('The mussor app API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT',
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  // Глобальный Exception Filter для единообразной обработки ошибок
  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          const constraints = Object.values(error.constraints || {});
          return `${error.property}: ${constraints.join(', ')}`;
        });

        return new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Validation failed',
            errors: messages,
          },
          HttpStatus.BAD_REQUEST,
        );
      },
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend server is running on http://0.0.0.0:${port}`);
  console.log(`📚 Swagger API documentation: http://localhost:${port}/api`);
}
bootstrap();
