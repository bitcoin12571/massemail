import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { validatePasswordStrength } from '../utils/passwordValidator.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      validateStrength(value) {
        const validation = validatePasswordStrength(value);
        if (!validation.isValid) {
          throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
        }
      }
    }
  },
  name: {
    type: DataTypes.STRING,
    defaultValue: 'User'
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    defaultValue: 'user'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  failedLoginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  }
});

User.prototype.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

export default User;
