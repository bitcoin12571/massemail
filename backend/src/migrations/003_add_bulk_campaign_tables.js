/**
 * Add bulk campaign support tables
 * For handling large-scale email campaigns
 *
 * Version: 1.2.0
 * Created: 2026-07-06
 */

export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // BulkCampaigns table
    await queryInterface.createTable(
      'BulkCampaigns',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        subject: {
          type: Sequelize.STRING(500),
          allowNull: false
        },
        htmlContent: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        textContent: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('draft', 'scheduled', 'sending', 'paused', 'completed', 'failed'),
          defaultValue: 'draft'
        },
        totalRecipients: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        sentCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        failedCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        startedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        completedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        }
      },
      { transaction }
    );

    // BulkCampaignSends table
    await queryInterface.createTable(
      'BulkCampaignSends',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        bulkCampaignId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'BulkCampaigns',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        contactId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Contacts',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        recipientEmail: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('pending', 'sent', 'failed', 'bounced'),
          defaultValue: 'pending'
        },
        messageId: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        error: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        sentAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        }
      },
      { transaction }
    );

    // Add indexes for bulk campaign queries
    await queryInterface.addIndex('BulkCampaigns', ['createdBy'], { transaction });
    await queryInterface.addIndex('BulkCampaigns', ['status'], { transaction });

    await queryInterface.addIndex('BulkCampaignSends', ['bulkCampaignId'], { transaction });
    await queryInterface.addIndex('BulkCampaignSends', ['contactId'], { transaction });
    await queryInterface.addIndex('BulkCampaignSends', ['status'], { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down(queryInterface) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.dropTable('BulkCampaignSends', { transaction });
    await queryInterface.dropTable('BulkCampaigns', { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
