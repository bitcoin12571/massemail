/**
 * Migration Service
 * Runs pending migrations on startup to ensure schema is up-to-date
 */

import { sequelize } from '../config/database.js';
import logger from './logger.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsPath = path.resolve(__dirname, '../migrations');

/**
 * Run pending migrations on startup
 * This ensures the database schema is always up-to-date
 * Works in development (SQLite) and production (PostgreSQL)
 */
export async function runPendingMigrations() {
  try {
    logger.info('MIGRATION', 'Checking for pending migrations...');

    // Get all migration files
    const migrationFiles = await readdir(migrationsPath);
    const migrations = migrationFiles
      .filter(f => f.endsWith('.js') && !f.startsWith('.'))
      .sort();

    if (migrations.length === 0) {
      logger.info('MIGRATION', 'No migrations found');
      return;
    }

    logger.info('MIGRATION', `Found ${migrations.length} migration files`);

    // Create SequelizeMeta table if it doesn't exist
    const sequelizeMetaSQL = sequelize.options.dialect === 'sqlite'
      ? `CREATE TABLE IF NOT EXISTS SequelizeMeta (name VARCHAR(255) PRIMARY KEY)`
      : `CREATE TABLE IF NOT EXISTS "SequelizeMeta" (name VARCHAR(255) PRIMARY KEY)`;

    await sequelize.query(sequelizeMetaSQL);

    // For each migration file, check if it's been run
    for (const migrationFile of migrations) {
      const migrationPath = path.join(migrationsPath, migrationFile);
      const migrationName = migrationFile.replace('.js', '');

      try {
        // Check if already run
        const tableName = sequelize.options.dialect === 'sqlite' ? 'SequelizeMeta' : '"SequelizeMeta"';
        const selectSQL = sequelize.options.dialect === 'sqlite'
          ? `SELECT * FROM ${tableName} WHERE name = ?`
          : `SELECT * FROM ${tableName} WHERE name = $1`;

        const result = await sequelize.query(
          selectSQL,
          {
            replacements: [migrationName],
            type: 'SELECT'
          }
        );

        if (result.length > 0) {
          logger.info('MIGRATION', `✓ Already run: ${migrationName}`);
          continue;
        }

        // Run the migration
        logger.info('MIGRATION', `Running: ${migrationName}`);
        const transaction = await sequelize.transaction();

        try {
          const migration = await import(`file://${migrationPath}`);
          await migration.up(sequelize.queryInterface, sequelize.Sequelize);

          // Record that migration was run
          const insertSQL = sequelize.options.dialect === 'sqlite'
            ? `INSERT INTO SequelizeMeta (name) VALUES (?)`
            : `INSERT INTO "SequelizeMeta" (name) VALUES ($1)`;

          await sequelize.query(
            insertSQL,
            {
              replacements: [migrationName],
              transaction
            }
          );

          await transaction.commit();
          logger.info('MIGRATION', `✓ Completed: ${migrationName}`);
        } catch (error) {
          await transaction.rollback();
          logger.error('MIGRATION', `✗ Failed: ${migrationName}`, error.message);
          // Continue with next migration instead of throwing
        }
      } catch (error) {
        logger.warn('MIGRATION', `Could not process ${migrationFile}:`, error.message);
        // Continue with next migration
      }
    }

    logger.info('MIGRATION', 'Migration check completed');
  } catch (error) {
    logger.warn('MIGRATION', 'Migration service error (app will continue):', error.message);
    // Don't throw - allow app to start even if migrations have issues
  }
}
