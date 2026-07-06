/**
 * Add email retry tracking fields
 * Supports exponential backoff retry logic
 *
 * Version: 1.1.0
 * Created: 2026-07-06
 */

export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // Check if Emails table exists and has the fields
    const table = await queryInterface.describeTable('Emails', { transaction });

    // Add retry tracking columns if they don't exist
    if (!table.retryCount) {
      await queryInterface.addColumn(
        'Emails',
        'retryCount',
        {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Number of retry attempts'
        },
        { transaction }
      );
    }

    if (!table.lastRetryAt) {
      await queryInterface.addColumn(
        'Emails',
        'lastRetryAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp of last retry attempt'
        },
        { transaction }
      );
    }

    if (!table.nextRetryAt) {
      await queryInterface.addColumn(
        'Emails',
        'nextRetryAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When to retry next (exponential backoff)'
        },
        { transaction }
      );
    }

    // Add index on nextRetryAt for efficient retry queue queries
    try {
      await queryInterface.addIndex(
        'Emails',
        ['nextRetryAt'],
        { transaction }
      );
    } catch (err) {
      // Index might already exist, ignore
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down(queryInterface) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    const table = await queryInterface.describeTable('Emails', { transaction });

    // Remove indexes
    try {
      await queryInterface.removeIndex('Emails', ['nextRetryAt'], { transaction });
    } catch (err) {
      // Index might not exist, ignore
    }

    // Remove columns
    if (table.nextRetryAt) {
      await queryInterface.removeColumn('Emails', 'nextRetryAt', { transaction });
    }

    if (table.lastRetryAt) {
      await queryInterface.removeColumn('Emails', 'lastRetryAt', { transaction });
    }

    if (table.retryCount) {
      await queryInterface.removeColumn('Emails', 'retryCount', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
