import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { version } from '../package.json';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('BACKEND_PORT') ?? 5000;
  const domain = config.get<string>('DOMAIN') ?? 'localhost';
  const frontendPort = config.get<number>('FRONTEND_PORT') ?? 3000;

  app.use(cookieParser());

  const origin =
    config.get<string>('PUBLIC_ORIGIN') || `http://${domain}:${frontendPort}`;
  const publicApiBase = `${origin}/api`;

  app.enableCors({
    origin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('MIMOSA API')
    .setDescription('MIMOSA backend API documentation')
    .setVersion(version)
    .addOAuth2({
      type: 'oauth2',
      flows: {
        password: {
          tokenUrl: '/api/auth/login',
          scopes: {},
        },
      },
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      oauth2RedirectUrl: `${publicApiBase}/docs/oauth2-redirect.html`,
      initOAuth: {
        scopes: [],
        useBasicAuthenticationWithAccessCodeGrant: false,
      },
    },
  });

  await app.listen(port, '0.0.0.0');
  console.log(`mimosa-backend server running at ${domain}:${port}`);
}

bootstrap();
