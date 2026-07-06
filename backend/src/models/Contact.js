import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Contact = sequelize.define('Contact', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'bounced', 'unsubscribed'),
    defaultValue: 'active'
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verificationTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  customData: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  bounceCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of bounces from this contact'
  },
  lastBounceAt: {
    type: DataTypes.DATE,
    comment: 'Timestamp of last bounce'
  },
  complaintCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of complaints from this contact'
  },
  lastComplaintAt: {
    type: DataTypes.DATE,
    comment: 'Timestamp of last complaint'
  },
  sendCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total number of emails sent to this contact'
  },
  lastSentAt: {
    type: DataTypes.DATE,
    comment: 'Timestamp of last email sent'
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['status'] },
    { fields: ['createdBy'] },
    { fields: ['lastBounceAt'] },
    { fields: ['lastComplaintAt'] }
  ]
});

export default Contact;
