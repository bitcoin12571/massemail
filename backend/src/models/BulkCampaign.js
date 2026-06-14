import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const BulkCampaign = sequelize.define('BulkCampaign', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  htmlTemplate: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  region: {
    type: DataTypes.STRING,
    allowNull: true,
    index: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'scheduled', 'sending', 'completed', 'failed'),
    defaultValue: 'draft'
  },
  totalRecipients: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  sentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  failedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  openedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  clickedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  bounceCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: true
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
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
  tableName: 'bulk_campaigns',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['region'] },
    { fields: ['createdAt'] }
  ]
});

export default BulkCampaign;
