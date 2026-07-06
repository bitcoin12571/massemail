/**
 * Initial database schema migration
 * Creates all core tables for the email dashboard
 *
 * Version: 1.0.0
 * Created: 2026-07-06
 */

export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // Users table
    await queryInterface.createTable(
      'Users',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true
        },
        password: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        role: {
          type: Sequelize.ENUM('user', 'admin'),
          defaultValue: 'user'
        },
        active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        failedLoginAttempts: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        lockedUntil: {
          type: Sequelize.DATE,
          allowNull: true
        },
        lastLoginAt: {
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

    // Contacts table
    await queryInterface.createTable(
      'Contacts',
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
        email: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        firstName: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        lastName: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('active', 'inactive', 'unsubscribed', 'bounced'),
          defaultValue: 'active'
        },
        customData: {
          type: Sequelize.JSON,
          allowNull: true
        },
        unsubscribedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        bouncedAt: {
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

    // Campaigns table
    await queryInterface.createTable(
      'Campaigns',
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
          type: Sequelize.ENUM('draft', 'scheduled', 'sending', 'sent', 'paused', 'archived'),
          defaultValue: 'draft'
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

    // Emails table
    await queryInterface.createTable(
      'Emails',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        campaignId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Campaigns',
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
          type: Sequelize.ENUM('pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced', 'unsubscribed'),
          defaultValue: 'pending'
        },
        sendgridMessageId: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        sentAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        deliveredAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        openedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        clickedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        failureReason: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        retryCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        lastRetryAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        nextRetryAt: {
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

    // SystemSettings table
    await queryInterface.createTable(
      'SystemSettings',
      {
        key: {
          type: Sequelize.STRING(255),
          primaryKey: true
        },
        value: {
          type: Sequelize.JSON,
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

    // JobQueue table
    await queryInterface.createTable(
      'JobQueues',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        emailId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Emails',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        campaignId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Campaigns',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        status: {
          type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
          defaultValue: 'pending'
        },
        payload: {
          type: Sequelize.JSON,
          allowNull: true
        },
        error: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        attempts: {
          type: Sequelize.INTEGER,
          defaultValue: 0
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

    // ParsedEmails table
    await queryInterface.createTable(
      'ParsedEmails',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        subject: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        body: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        fromEmail: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        metadata: {
          type: Sequelize.JSON,
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

    // Sessions table (legacy, kept for backward compatibility)
    await queryInterface.createTable(
      'Sessions',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        sessionId: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        lastActivity: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        ipAddress: {
          type: Sequelize.STRING(45),
          allowNull: true
        },
        userAgent: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        }
      },
      { transaction }
    );

    // AuditLogs table
    await queryInterface.createTable(
      'AuditLogs',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        action: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        resource: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        resourceId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        details: {
          type: Sequelize.JSON,
          allowNull: true
        },
        ipAddress: {
          type: Sequelize.STRING(45),
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        }
      },
      { transaction }
    );

    // Create indexes for performance
    await queryInterface.addIndex('Users', ['email'], { transaction });
    await queryInterface.addIndex('Users', ['role'], { transaction });

    await queryInterface.addIndex('Contacts', ['createdBy'], { transaction });
    await queryInterface.addIndex('Contacts', ['email'], { transaction });
    await queryInterface.addIndex('Contacts', ['status'], { transaction });

    await queryInterface.addIndex('Campaigns', ['createdBy'], { transaction });
    await queryInterface.addIndex('Campaigns', ['status'], { transaction });

    await queryInterface.addIndex('Emails', ['campaignId'], { transaction });
    await queryInterface.addIndex('Emails', ['contactId'], { transaction });
    await queryInterface.addIndex('Emails', ['status'], { transaction });
    await queryInterface.addIndex('Emails', ['nextRetryAt'], { transaction });
    await queryInterface.addIndex('Emails', ['sentAt'], { transaction });

    await queryInterface.addIndex('JobQueues', ['status'], { transaction });
    await queryInterface.addIndex('JobQueues', ['emailId'], { transaction });
    await queryInterface.addIndex('JobQueues', ['campaignId'], { transaction });

    await queryInterface.addIndex('AuditLogs', ['userId'], { transaction });
    await queryInterface.addIndex('AuditLogs', ['action'], { transaction });
    await queryInterface.addIndex('AuditLogs', ['createdAt'], { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down(queryInterface) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // Drop all tables in reverse order of creation
    await queryInterface.dropTable('AuditLogs', { transaction });
    await queryInterface.dropTable('Sessions', { transaction });
    await queryInterface.dropTable('ParsedEmails', { transaction });
    await queryInterface.dropTable('JobQueues', { transaction });
    await queryInterface.dropTable('SystemSettings', { transaction });
    await queryInterface.dropTable('Emails', { transaction });
    await queryInterface.dropTable('Campaigns', { transaction });
    await queryInterface.dropTable('Contacts', { transaction });
    await queryInterface.dropTable('Users', { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
