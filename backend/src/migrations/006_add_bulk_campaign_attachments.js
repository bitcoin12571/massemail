/**
 * Add attachments column to BulkCampaign table
 * Stores attachments in JSON format (base64 encoded)
 *
 * Version: 1.0.0
 * Created: 2026-07-07
 */

export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    const table = 'bulk_campaigns';
    const bulkCampaignsTable = await queryInterface.describeTable(table, { transaction });

    // Add attachments column if it doesn't exist
    if (!bulkCampaignsTable.attachments) {
      await queryInterface.addColumn(
        table,
        'attachments',
        {
          type: Sequelize.JSON,
          defaultValue: [],
          allowNull: true,
          comment: 'Array of attachments in base64 format'
        },
        { transaction }
      );
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
    const table = 'bulk_campaigns';
    const bulkCampaignsTable = await queryInterface.describeTable(table, { transaction });

    if (bulkCampaignsTable.attachments) {
      await queryInterface.removeColumn(table, 'attachments', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
