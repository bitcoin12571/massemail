import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const SystemSetting = sequelize.define('SystemSetting', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  value: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  }
}, {
  timestamps: true
});

export default SystemSetting;
