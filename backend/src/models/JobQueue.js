import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const JobQueue = sequelize.define('JobQueue', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  emailId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Emails',
      key: 'id'
    }
  },
  campaignId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Campaigns',
      key: 'id'
    }
  },
  contactId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Contacts',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('waiting', 'active', 'completed', 'failed'),
    defaultValue: 'waiting',
    allowNull: false
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'job_queues',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['emailId'] },
    { fields: ['campaignId'] },
    { fields: ['createdAt'] }
  ]
});

export default JobQueue;
