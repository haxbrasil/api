import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import { AppModule } from '../../src/modules/app.module';
import { clearE2ERuntime, getE2ERuntime, setE2ERuntime } from './runtime';

function getBaseUrl(app: INestApplication): string {
  const server = app.getHttpServer() as Server;
  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve E2E app listen address');
  }

  return `http://127.0.0.1:${address.port}`;
}

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.init();
  await app.listen(0, '127.0.0.1');

  setE2ERuntime({
    app,
    baseUrl: getBaseUrl(app),
  });
});

afterAll(async () => {
  const { app } = getE2ERuntime();
  await app.close();
  clearE2ERuntime();
});

afterEach(() => {
  jest.restoreAllMocks();
});
