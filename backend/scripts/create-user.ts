#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import * as bcrypt from 'bcrypt';
import minimist from 'minimist';

async function bootstrap() {
  const args = minimist(process.argv.slice(2));

  const {
    p: password,
    fname: firstName,
    lname: lastName,
    m: email,
    r: role = 'user',
    county: homeCounty,
  } = args;

  if (!password || !firstName || !lastName || !email || !homeCounty) {
    console.error('Missing required fields. Usage:');
    console.error('mimosa create-user --p <password> --fname <First> --lname <Last> --m <email> --r <role> --county <HomeCounty>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const usersService = app.get(UsersService);

  const existing = await usersService.findByEmail(email);
  if (existing) {
    console.log(`User with email ${email} already exists.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await usersService.create({
    firstName,
    lastName,
    email,
    homeCounty,
    role,
    passwordHash,
  });

  console.log(`User ${email} created successfully.`);
  await app.close();
  process.exit(0);
}

bootstrap();

