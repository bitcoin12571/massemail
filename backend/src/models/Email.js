import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Email = sequelize.define('Email', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  campaignId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  contactId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  recipientEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced', 'unsubscribed'),
    defaultValue: 'pending'
  },
  sendgridMessageId: {
    type: DataTypes.STRING
  },
  sentAt: {
    type: DataTypes.DATE
  },
  deliveredAt: {
    type: DataTypes.DATE
  },
  openedAt: {
    type: DataTypes.DATE
  },
  clickedAt: {
    type: DataTypes.DATE
  },
  failureReason: {
    type: DataTypes.TEXT
  },
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of retry attempts'
  },
  lastRetryAt: {
    type: DataTypes.DATE,
    comment: 'Timestamp of last retry attempt'
  },
  nextRetryAt: {
    type: DataTypes.DATE,
    comment: 'When to retry next (exponential backoff)'
  },
  bounceType: {
    type: DataTypes.STRING,
    comment: 'soft, hard, or unknown'
  },
  bouncedAt: {
    type: DataTypes.DATE,
    comment: 'When bounce occurred'
  },
  complaintType: {
    type: DataTypes.STRING,
    comment: 'spam, unsolicited, or other'
  },
  complainedAt: {
    type: DataTypes.DATE,
    comment: 'When complaint occurred'
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['campaignId'] },
    { fields: ['contactId'] },
    { fields: ['status'] },
    { fields: ['nextRetryAt'] },
    { fields: ['sentAt'] },
    { fields: ['bounceType', 'bouncedAt'] },
    { fields: ['complaintType', 'complainedAt'] }
  ]
});

export default Email;
