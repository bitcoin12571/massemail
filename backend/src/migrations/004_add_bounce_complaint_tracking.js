/**
 * Add bounce and complaint tracking to Emails and Contacts
 * For comprehensive delivery quality monitoring
 *
 * Version: 1.3.0
 * Created: 2026-07-06
 */

export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // Add bounce tracking columns to Emails table
    const emailsTable = await queryInterface.describeTable('Emails', { transaction });

    if (!emailsTable.bounceType) {
      await queryInterface.addColumn(
        'Emails',
        'bounceType',
        {
          type: Sequelize.ENUM('soft', 'hard', 'unknown'),
          allowNull: true,
          comment: 'Type of bounce: soft (temporary), hard (permanent), or unknown'
        },
        { transaction }
      );
    }

    if (!emailsTable.bouncedAt) {
      await queryInterface.addColumn(
        'Emails',
        'bouncedAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp when bounce was received'
        },
        { transaction }
      );
    }

    if (!emailsTable.complaintType) {
      await queryInterface.addColumn(
        'Emails',
        'complaintType',
        {
          type: Sequelize.ENUM('spam', 'unsolicited', 'other'),
          allowNull: true,
          comment: 'Type of complaint: spam, unsolicited, or other'
        },
        { transaction }
      );
    }

    if (!emailsTable.complainedAt) {
      await queryInterface.addColumn(
        'Emails',
        'complainedAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp when complaint was received'
        },
        { transaction }
      );
    }

    // Add recipient health tracking columns to Contacts table
    const contactsTable = await queryInterface.describeTable('Contacts', { transaction });

    if (!contactsTable.bounceCount) {
      await queryInterface.addColumn(
        'Contacts',
        'bounceCount',
        {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Number of bounces from this contact'
        },
        { transaction }
      );
    }

    if (!contactsTable.lastBounceAt) {
      await queryInterface.addColumn(
        'Contacts',
        'lastBounceAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp of last bounce'
        },
        { transaction }
      );
    }

    if (!contactsTable.complaintCount) {
      await queryInterface.addColumn(
        'Contacts',
        'complaintCount',
        {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Number of complaints from this contact'
        },
        { transaction }
      );
    }

    if (!contactsTable.lastComplaintAt) {
      await queryInterface.addColumn(
        'Contacts',
        'lastComplaintAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp of last complaint'
        },
        { transaction }
      );
    }

    if (!contactsTable.sendCount) {
      await queryInterface.addColumn(
        'Contacts',
        'sendCount',
        {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Total emails sent to this contact'
        },
        { transaction }
      );
    }

    if (!contactsTable.lastSentAt) {
      await queryInterface.addColumn(
        'Contacts',
        'lastSentAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp of last email sent'
        },
        { transaction }
      );
    }

    // Add indexes for bounce/complaint queries
    try {
      await queryInterface.addIndex(
        'Emails',
        ['bounceType', 'bouncedAt'],
        { transaction }
      );
    } catch (err) {
      // Index might already exist
    }

    try {
      await queryInterface.addIndex(
        'Emails',
        ['complaintType', 'complainedAt'],
        { transaction }
      );
    } catch (err) {
      // Index might already exist
    }

    try {
      await queryInterface.addIndex(
        'Contacts',
        ['bounceCount', 'lastBounceAt'],
        { transaction }
      );
    } catch (err) {
      // Index might already exist
    }

    try {
      await queryInterface.addIndex(
        'Contacts',
        ['complaintCount', 'lastComplaintAt'],
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
    // Remove indexes
    try {
      await queryInterface.removeIndex('Contacts', ['complaintCount', 'lastComplaintAt'], { transaction });
    } catch (err) {
      // Index might not exist
    }

    try {
      await queryInterface.removeIndex('Contacts', ['bounceCount', 'lastBounceAt'], { transaction });
    } catch (err) {
      // Index might not exist
    }

    try {
      await queryInterface.removeIndex('Emails', ['complaintType', 'complainedAt'], { transaction });
    } catch (err) {
      // Index might not exist
    }

    try {
      await queryInterface.removeIndex('Emails', ['bounceType', 'bouncedAt'], { transaction });
    } catch (err) {
      // Index might not exist
    }

    // Remove columns from Contacts
    const contactsTable = await queryInterface.describeTable('Contacts', { transaction });
    if (contactsTable.lastSentAt) {
      await queryInterface.removeColumn('Contacts', 'lastSentAt', { transaction });
    }
    if (contactsTable.sendCount) {
      await queryInterface.removeColumn('Contacts', 'sendCount', { transaction });
    }
    if (contactsTable.lastComplaintAt) {
      await queryInterface.removeColumn('Contacts', 'lastComplaintAt', { transaction });
    }
    if (contactsTable.complaintCount) {
      await queryInterface.removeColumn('Contacts', 'complaintCount', { transaction });
    }
    if (contactsTable.lastBounceAt) {
      await queryInterface.removeColumn('Contacts', 'lastBounceAt', { transaction });
    }
    if (contactsTable.bounceCount) {
      await queryInterface.removeColumn('Contacts', 'bounceCount', { transaction });
    }

    // Remove columns from Emails
    const emailsTable = await queryInterface.describeTable('Emails', { transaction });
    if (emailsTable.complainedAt) {
      await queryInterface.removeColumn('Emails', 'complainedAt', { transaction });
    }
    if (emailsTable.complaintType) {
      await queryInterface.removeColumn('Emails', 'complaintType', { transaction });
    }
    if (emailsTable.bouncedAt) {
      await queryInterface.removeColumn('Emails', 'bouncedAt', { transaction });
    }
    if (emailsTable.bounceType) {
      await queryInterface.removeColumn('Emails', 'bounceType', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
