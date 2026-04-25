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
    u: username,
  } = args;

  const missing: string[] = [];
  if (!password) missing.push('--p <password>');
  if (!firstName) missing.push('--fname <First>');
  if (!lastName) missing.push('--lname <Last>');
  if (!email && !username) missing.push('--m <email> or --u <username> (at least one required)');

  if (missing.length > 0) {
    console.error('Missing required arguments:');
    for (const arg of missing) {
      console.error(`  ${arg}`);
    }
    console.error('\nUsage:');
    console.error(
      '  mimosa create-automation-user --p <password> --fname <First> --lname <Last> [--m <email>] [--u <username>]',
    );
    console.error('\nAt least one of --m (email) or --u (username) must be provided.');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const usersService = app.get(UsersService);

  if (email) {
    const existingByEmail = await usersService.findByEmail(email);
    if (existingByEmail) {
      console.error(`User with email ${email} already exists.`);
      await app.close();
      process.exit(1);
    }
  }

  if (username) {
    const existingByUsername = await usersService.findByUsername(username);
    if (existingByUsername) {
      console.error(`User with username ${username} already exists.`);
      await app.close();
      process.exit(1);
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await usersService.create({
      firstName,
      lastName,
      email: email ?? undefined,
      username: username ?? undefined,
      role: 'automation',
      passwordHash,
    });
  } catch (err: any) {
    console.error(err?.message ?? err);
    await app.close();
    process.exit(1);
  }

  const identity = email ?? username;
  console.log(`Automation user "${identity}" created successfully.`);
  await app.close();
  process.exit(0);
}

bootstrap();

