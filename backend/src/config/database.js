import { Sequelize } from 'sequelize';
import sqlite3 from 'sqlite3';
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
const usePostgres = process.env.DATABASE_URL?.startsWith('postgres');
const sqliteStorage = process.env.SQLITE_PATH
  || (process.env.VERCEL ? '/tmp/mailora.sqlite' : path.join(rootDir, 'mailora.sqlite'));

const sequelize = usePostgres
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
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
