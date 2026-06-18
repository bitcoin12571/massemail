import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  eventType: {
    type: DataTypes.ENUM(
      'LOGIN', 'LOGOUT', 'REGISTER', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
      'CAMPAIGN_CREATE', 'CAMPAIGN_DELETE', 'CAMPAIGN_SEND',
      'CONTACT_CREATE', 'CONTACT_DELETE', 'CONTACT_IMPORT',
      'SETTINGS_UPDATE', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED',
      'API_ERROR', 'RATE_LIMIT_HIT', 'SECURITY_EVENT'
    ),
    allowNull: false
  },
  action: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  resource: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  resourceId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('success', 'failure'),
    defaultValue: 'success'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  changes: {
    type: DataTypes.JSON,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'AuditLogs',
  timestamps: false,
  indexes: [
    { fields: ['userId', 'createdAt'] },
    { fields: ['eventType'] },
    { fields: ['resource', 'resourceId'] },
    { fields: ['createdAt'] }
  ]
});

export default AuditLog;
