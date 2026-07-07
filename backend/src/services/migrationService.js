/**
 * Schema Initialization Service
 * Ensures all required columns exist in the database
 * More reliable than tracking migrations on Vercel
 */

import { sequelize } from '../config/database.js';
import logger from './logger.js';

/**
 * Ensure all required columns exist in the Contacts table
 */
async function ensureContactsColumns() {
  try {
    const table = 'Contacts';

    const columns = [
      'bounceCount',
      'lastBounceAt',
      'complaintCount',
      'lastComplaintAt',
      'sendCount',
      'lastSentAt'
    ];

    for (const column of columns) {
      try {
        const describeTable = await sequelize.queryInterface.describeTable(table);
        if (!describeTable[column]) {
          logger.info('SCHEMA', `Adding missing column: ${table}.${column}`);

          const columnDef = {
            type: sequelize.Sequelize.INTEGER,
            defaultValue: 0,
            allowNull: true
          };

          if (column.includes('At')) {
            columnDef.type = sequelize.Sequelize.DATE;
            columnDef.defaultValue = null;
          }

          await sequelize.queryInterface.addColumn(table, column, columnDef);
          logger.info('SCHEMA', `✓ Added: ${table}.${column}`);
        }
      } catch (err) {
        logger.warn('SCHEMA', `Could not add ${table}.${column}:`, err.message);
      }
    }
  } catch (err) {
    logger.warn('SCHEMA', 'Contacts table check failed:', err.message);
  }
}

/**
 * Ensure all required columns exist in the Campaigns table
 */
async function ensureCampaignsColumns() {
  try {
    const table = 'Campaigns';

    const columns = ['scheduledAt', 'sentAt', 'attachments'];

    for (const column of columns) {
      try {
        const describeTable = await sequelize.queryInterface.describeTable(table);
        if (!describeTable[column]) {
          logger.info('SCHEMA', `Adding missing column: ${table}.${column}`);

          let columnDef = {
            type: sequelize.Sequelize.DATE,
            allowNull: true
          };

          if (column === 'attachments') {
            columnDef = {
              type: sequelize.Sequelize.JSON,
              defaultValue: [],
              allowNull: true
            };
          }

          await sequelize.queryInterface.addColumn(table, column, columnDef);
          logger.info('SCHEMA', `✓ Added: ${table}.${column}`);
        }
      } catch (err) {
        logger.warn('SCHEMA', `Could not add ${table}.${column}:`, err.message);
      }
    }
  } catch (err) {
    logger.warn('SCHEMA', 'Campaigns table check failed:', err.message);
  }
}

/**
 * Ensure all required columns exist in the BulkCampaign table
 */
async function ensureBulkCampaignColumns() {
  try {
    // Try both table names - PostgreSQL uses lowercase, SQLite uses uppercase
    let table = 'bulk_campaigns';
    try {
      await sequelize.queryInterface.describeTable(table);
    } catch (err) {
      // Try uppercase for SQLite
      table = 'BulkCampaigns';
      await sequelize.queryInterface.describeTable(table);
    }

    const columns = ['attachments'];

    for (const column of columns) {
      try {
        const describeTable = await sequelize.queryInterface.describeTable(table);
        if (!describeTable[column]) {
          logger.info('SCHEMA', `Adding missing column: ${table}.${column}`);

          await sequelize.queryInterface.addColumn(table, column, {
            type: sequelize.Sequelize.JSON,
            defaultValue: [],
            allowNull: true,
            comment: 'Array of attachments in base64 format'
          });
          logger.info('SCHEMA', `✓ Added: ${table}.${column}`);
        }
      } catch (err) {
        logger.warn('SCHEMA', `Could not add ${table}.${column}:`, err.message);
      }
    }
  } catch (err) {
    logger.warn('SCHEMA', 'BulkCampaign table check failed:', err.message);
  }
}

/**
 * Ensure all required columns exist in the Emails table
 */
async function ensureEmailsColumns() {
  try {
    const table = 'Emails';

    const columns = [
      'retryCount',
      'lastRetryAt',
      'nextRetryAt',
      'bounceType',
      'bouncedAt',
      'complaintType',
      'complainedAt'
    ];

    for (const column of columns) {
      try {
        const describeTable = await sequelize.queryInterface.describeTable(table);
        if (!describeTable[column]) {
          logger.info('SCHEMA', `Adding missing column: ${table}.${column}`);

          let columnDef = {
            type: sequelize.Sequelize.STRING,
            allowNull: true
          };

          if (column === 'retryCount') {
            columnDef = {
              type: sequelize.Sequelize.INTEGER,
              defaultValue: 0
            };
          } else if (column.includes('At')) {
            columnDef.type = sequelize.Sequelize.DATE;
          } else if (column.includes('Type')) {
            columnDef.type = sequelize.Sequelize.STRING;
          }

          await sequelize.queryInterface.addColumn(table, column, columnDef);
          logger.info('SCHEMA', `✓ Added: ${table}.${column}`);
        }
      } catch (err) {
        logger.warn('SCHEMA', `Could not add ${table}.${column}:`, err.message);
      }
    }
  } catch (err) {
    logger.warn('SCHEMA', 'Emails table check failed:', err.message);
  }
}

/**
 * Initialize schema on startup
 * Ensures all required columns exist in the database
 */
export async function runPendingMigrations() {
  try {
    logger.info('SCHEMA', 'Initializing database schema...');

    // First ensure all critical tables exist by syncing them
    try {
      const modelsToSync = [
        'User',
        'Campaign',
        'Contact',
        'Email',
        'SystemSetting',
        'JobQueue',
        'ParsedEmail',
        'BulkCampaign',
        'BulkCampaignSend',
        'Session',
        'AuditLog'
      ];

      for (const modelName of modelsToSync) {
        const model = sequelize.models[modelName];
        if (model) {
          try {
            await model.sync({ alter: false });
            logger.info('SCHEMA', `✓ ${modelName} table synced`);
          } catch (err) {
            logger.warn('SCHEMA', `Could not sync ${modelName}:`, err.message);
          }
        }
      }
    } catch (err) {
      logger.info('SCHEMA', 'Model sync error:', err.message);
    }

    // Ensure all required columns exist
    await ensureContactsColumns();
    await ensureCampaignsColumns();
    await ensureBulkCampaignColumns();
    await ensureEmailsColumns();

    logger.info('SCHEMA', 'Schema initialization completed');
  } catch (error) {
    logger.warn('SCHEMA', 'Schema initialization error (app will continue):', error.message);
    // Don't throw - allow app to start even if schema init has issues
  }
}
