# Account Lockout - Detailed Implementation Plan

## Overview
Lock user accounts after N failed login attempts per email address (not IP). Unlock after time window or admin action.

## Database Model

### AccountLockout Table
`
id (UUID primary key)
userId (UUID foreign key, nullable - can lock non-existent user)
email (string, indexed for fast lookup)
failedAttempts (integer, default 0)
lockedUntil (timestamp, nullable - when can retry)
lastAttemptAt (timestamp)
reason (string: 'max_attempts' or 'admin_lock')
createdAt (timestamp)
updatedAt (timestamp)
`

## Files to Create/Modify

### 1. backend/src/models/AccountLockout.js (CREATE)
`javascript
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const AccountLockout = sequelize.define('AccountLockout', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  email: { type: DataTypes.STRING, unique: true, allowNull: false, index: true },
  failedAttempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  lockedUntil: { type: DataTypes.DATE, allowNull: true },
  reason: { type: DataTypes.ENUM('max_attempts', 'admin_lock'), defaultValue: 'max_attempts' },
  lastAttemptAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { timestamps: true });

export default AccountLockout;
`

### 2. backend/src/middleware/accountLockout.js (CREATE)
`javascript
import AccountLockout from '../models/AccountLockout.js';

const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function checkAccountLockout(req, res, next) {
  const email = req.body?.email?.toLowerCase();
  if (!email) return next();
  
  const lockout = await AccountLockout.findOne({ where: { email } });
  
  if (lockout && lockout.lockedUntil > new Date()) {
    const remainingTime = Math.ceil((lockout.lockedUntil - new Date()) / 1000);
    return res.status(429).json({
      error: 'Account locked',
      lockedUntil: lockout.lockedUntil,
      remainingSeconds: remainingTime
    });
  }
  
  // Clear expired lockout
  if (lockout && lockout.lockedUntil <= new Date()) {
    await lockout.update({ failedAttempts: 0, lockedUntil: null });
  }
  
  next();
}

export async function recordLoginFailure(email) {
  email = email?.toLowerCase();
  let lockout = await AccountLockout.findOne({ where: { email } });
  
  if (!lockout) {
    lockout = await AccountLockout.create({ email, failedAttempts: 1 });
  } else {
    lockout.failedAttempts += 1;
    lockout.lastAttemptAt = new Date();
    
    if (lockout.failedAttempts >= MAX_ATTEMPTS) {
      lockout.lockedUntil = new Date(Date.now() + LOCKOUT_WINDOW_MS);
      lockout.reason = 'max_attempts';
    }
    
    await lockout.save();
  }
  
  return lockout.failedAttempts >= MAX_ATTEMPTS;
}

export async function clearLoginAttempts(email) {
  email = email?.toLowerCase();
  const lockout = await AccountLockout.findOne({ where: { email } });
  if (lockout) {
    await lockout.update({ failedAttempts: 0, lockedUntil: null });
  }
}
`

### 3. backend/src/routes/auth.js (MODIFY)
- Import checkAccountLockout middleware
- Import recordLoginFailure and clearLoginAttempts
- Add checkAccountLockout to POST /login
- Call recordLoginFailure on failed login
- Call clearLoginAttempts on successful login
- Return lockout status in error responses

### 4. backend/src/index.js (MODIFY)
- Import AccountLockout model (for sequelize.sync)
- Add admin unlock endpoint: POST /api/auth/unlock-account (admin-only)

### 5. backend/__tests__/accountLockout.test.js (CREATE)
Test cases:
- Login attempt tracking per email
- Account locks after 5 failed attempts
- Lockout message includes remaining time
- Successful login clears attempts
- Expired lockout can be retried
- Admin can unlock account via endpoint
- Different emails tracked separately
- Case-insensitive email matching

## Implementation Steps

1. Create AccountLockout model following User.js pattern
2. Create accountLockout.js middleware with check/record/clear functions
3. Integrate into auth.js login route
4. Add admin unlock endpoint
5. Create tests with 5+ login attempts
6. Verify lockout message and time remaining
7. Test time-based unlock (advance clock in tests)

## Admin Unlock Endpoint

`
POST /api/auth/unlock-account
Headers: Authorization: Bearer <token>
Body: { email: "user@example.com" }
Response: { success: true, message: "Account unlocked" }
`

Require: admin role or system secret

## Testing Checklist
- [ ] Lockout after 5 failed attempts
- [ ] Email lookup case-insensitive
- [ ] Remaining time shown in response
- [ ] Successful login clears attempts
- [ ] Expired lockout (15 min) allows retry
- [ ] Admin can unlock locked account
- [ ] Different emails don't interfere
- [ ] Works with both SQLite and PostgreSQL
- [ ] No regression on existing auth tests
