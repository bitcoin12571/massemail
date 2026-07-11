import { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  // Add new columns to Campaign table for scheduled sending
  await queryInterface.addColumn('Campaigns', 'dailyLimit', {
    type: DataTypes.INTEGER,
    defaultValue: 200
  });

  await queryInterface.addColumn('Campaigns', 'totalToSend', {
    type: DataTypes.INTEGER
  });

  await queryInterface.addColumn('Campaigns', 'sentCount', {
    type: DataTypes.INTEGER,
    defaultValue: 0
  });

  await queryInterface.addColumn('Campaigns', 'lastSentAt', {
    type: DataTypes.DATE
  });

  await queryInterface.addColumn('Campaigns', 'nextSendAt', {
    type: DataTypes.DATE
  });

  await queryInterface.addColumn('Campaigns', 'scheduleStartedAt', {
    type: DataTypes.DATE
  });
}

export async function down(queryInterface) {
  // Remove the columns if rolling back
  await queryInterface.removeColumn('Campaigns', 'dailyLimit');
  await queryInterface.removeColumn('Campaigns', 'totalToSend');
  await queryInterface.removeColumn('Campaigns', 'sentCount');
  await queryInterface.removeColumn('Campaigns', 'lastSentAt');
  await queryInterface.removeColumn('Campaigns', 'nextSendAt');
  await queryInterface.removeColumn('Campaigns', 'scheduleStartedAt');
}
