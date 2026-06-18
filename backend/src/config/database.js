import logger from '../services/logger.js';
import { Sequelize } from 'sequelize';
import sqlite3 from 'sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const backendEnvPath = path.join(rootDir, 'backend', '.env');

// Load .env from backend directory (only if it exists, for development)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: backendEnvPath });
  console.log(`[DATABASE] Loading .env from: ${backendEnvPath}`);
} else {
  console.log(`[DATABASE] Production mode - using Vercel environment variables`);
}
const databaseUrlCandidates = [
  process.env.DATABASE_URL,
  process.env.NEON_DATABASE_URL,
  process.env.NEON_POSTGRES_URL,
  process.env.NEON_POSTGRES_URL_NON_POOLING,
  process.env.NEON_DATABASE_URL_UNPOOLED
].filter(Boolean);

const databaseUrl = databaseUrlCandidates.find((url) => /^(postgres|postgresql):\/\//i.test(url));
const usePostgres = /^(postgres|postgresql):\/\//i.test(databaseUrl || '');

if (process.env.VERCEL && !usePostgres) {
  throw new Error('A persistent PostgreSQL DATABASE_URL/NEON_DATABASE_URL is required on Vercel.');
}

const sqliteStorage = process.env.SQLITE_PATH
  || (process.env.VERCEL ? '/tmp/mailora.sqlite' : path.join(rootDir, 'mailora.sqlite'));

const sequelize = usePostgres
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      dialectModule: pg,
      logging: false,
      dialectOptions: process.env.DATABASE_SSL === 'false'
        ? {}
        : {
            ssl: {
              require: true,
              rejectUnauthorized: false
            }
          }
    })
  : new Sequelize({
      dialect: 'sqlite',
      dialectModule: sqlite3,
      storage: sqliteStorage,
      logging: false
    });

export { sequelize };
