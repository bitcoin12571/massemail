/**
 * Add scheduledAt column to Campaigns table
 * Required for campaign scheduling feature
 *
 * Version: 1.0.0
 * Created: 2026-07-07
 */

export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    const campaignsTable = await queryInterface.describeTable('Campaigns', { transaction });

    // Add scheduledAt column if it doesn't exist
    if (!campaignsTable.scheduledAt) {
      await queryInterface.addColumn(
        'Campaigns',
        'scheduledAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When this campaign is scheduled to send'
        },
        { transaction }
      );
    }

    // Add sentAt column if it doesn't exist
    if (!campaignsTable.sentAt) {
      await queryInterface.addColumn(
        'Campaigns',
        'sentAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When this campaign finished sending'
        },
        { transaction }
      );
    }

    // Add index on scheduledAt for efficient querying
    try {
      await queryInterface.addIndex(
        'Campaigns',
        ['status', 'scheduledAt'],
        { transaction }
      );
    } catch (err) {
      // Index might already exist
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
    // Remove index
    try {
      await queryInterface.removeIndex('Campaigns', ['status', 'scheduledAt'], { transaction });
    } catch (err) {
      // Index might not exist
    }

    const campaignsTable = await queryInterface.describeTable('Campaigns', { transaction });

    // Remove columns
    if (campaignsTable.sentAt) {
      await queryInterface.removeColumn('Campaigns', 'sentAt', { transaction });
    }

    if (campaignsTable.scheduledAt) {
      await queryInterface.removeColumn('Campaigns', 'scheduledAt', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
