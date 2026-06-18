'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('Users', 'failedLoginAttempts', {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    allowNull: false
  });

  await queryInterface.addColumn('Users', 'lockedUntil', {
    type: Sequelize.DATE,
    allowNull: true
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn('Users', 'failedLoginAttempts');
  await queryInterface.removeColumn('Users', 'lockedUntil');
};
