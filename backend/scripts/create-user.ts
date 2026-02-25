#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import * as bcrypt from 'bcrypt';
import minimist from 'minimist';
import { counties, parseCounty } from '../src/users/county';

async function bootstrap() {
  const args = minimist(process.argv.slice(2));

  const {
    p: password,
    fname: firstName,
    lname: lastName,
    m: email,
    r: role,
    county,
  } = args;

  const missing: string[] = [];

  if (!password) missing.push('--p <password>');
  if (!firstName) missing.push('--fname <First>');
  if (!lastName) missing.push('--lname <Last>');
  if (!email) missing.push('--m <email>');

  if (missing.length > 0) {
    console.error('Missing required arguments:');
    for (const arg of missing) {
      console.error(`  ${arg}`);
    }
    console.error('\nUsage:');
    console.error(
      '  mimosa create-user --p <password> --fname <First> --lname <Last> --m <email> [--r <role>] [--county <HomeCounty>]',
    );
    process.exit(1);
  }

  let homeCounty: string | undefined;
  if (county !== undefined && county !== null && String(county).trim() !== '') {
    const parsed = parseCounty(county);
    if (!parsed) {
      console.error(`Invalid --county value: ${String(county)}`);
      console.error('Allowed values are:');
      (counties as string[]).forEach((c) => console.error(`  - ${c}`));
      process.exit(1);
    }
    homeCounty = parsed;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const usersService = app.get(UsersService);

  const existing = await usersService.findByEmail(email);
  if (existing) {
    console.error(`User with email ${email} already exists.`);
    await app.close();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await usersService.create({
      firstName,
      lastName,
      email,
      role,
      homeCounty,
      passwordHash,
    });
  } catch (err: any) {
    console.error(err?.message ?? err);
    await app.close();
    process.exit(1);
  }

  console.log(`User ${email} created successfully.`);
  await app.close();
  process.exit(0);
}

bootstrap();
