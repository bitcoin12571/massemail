import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const backendEnvPath = path.join(rootDir, 'backend', '.env');

// Load .env from backend directory
dotenv.config({ path: backendEnvPath });
console.log(`[DATABASE] Loading .env from: ${backendEnvPath}`);
const usePostgres = process.env.DATABASE_URL?.startsWith('postgres');

const sequelize = usePostgres
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.SQLITE_PATH || path.join(rootDir, 'mailora.sqlite'),
      logging: false
    });

export { sequelize };
