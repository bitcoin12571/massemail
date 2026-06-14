import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const BulkCampaignSend = sequelize.define('BulkCampaignSend', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  campaignId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'bulk_campaigns',
      key: 'id'
    }
  },
  emailId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'parsed_emails',
      key: 'id'
    }
  },
  recipientEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed', 'opened', 'clicked', 'bounced'),
    defaultValue: 'pending'
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  openedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  clickedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  bouncedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  trackingToken: {
    type: DataTypes.STRING,
    unique: true,
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
  tableName: 'bulk_campaign_sends',
  timestamps: true,
  indexes: [
    { fields: ['campaignId'] },
    { fields: ['status'] },
    { fields: ['trackingToken'] }
  ]
});

export default BulkCampaignSend;
