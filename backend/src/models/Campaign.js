import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Campaign = sequelize.define('Campaign', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  htmlContent: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  textContent: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('draft', 'scheduled', 'sending', 'sent', 'paused'),
    defaultValue: 'draft'
  },
  scheduledAt: {
    type: DataTypes.DATE
  },
  sentAt: {
    type: DataTypes.DATE
  },
  attachments: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  // For scheduled campaigns
  dailyLimit: {
    type: DataTypes.INTEGER,
    defaultValue: 200
  },
  totalToSend: {
    type: DataTypes.INTEGER
  },
  sentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastSentAt: {
    type: DataTypes.DATE
  },
  nextSendAt: {
    type: DataTypes.DATE
  },
  scheduleStartedAt: {
    type: DataTypes.DATE
  }
}, {
  timestamps: true
});

export default Campaign;
