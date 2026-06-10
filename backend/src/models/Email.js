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
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['campaignId'] },
    { fields: ['contactId'] },
    { fields: ['status'] }
  ]
});

export default Email;
