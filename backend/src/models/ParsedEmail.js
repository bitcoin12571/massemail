import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ParsedEmail = sequelize.define('ParsedEmail', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  region: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true
  },
  locality: {
    type: DataTypes.STRING,
    allowNull: true
  },
  source: {
    type: DataTypes.ENUM('csv_upload', 'web_scrape', 'manual'),
    defaultValue: 'csv_upload'
  },
  isValid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'parsed_emails',
  timestamps: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['region'] },
    { fields: ['isValid'] },
    { fields: ['source'] }
  ]
});

export default ParsedEmail;
