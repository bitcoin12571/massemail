# Hash Admin Password - Detailed Implementation Plan

## Overview
Replace plain-text ADMIN_PASSWORD environment variable with hashed password comparison, eliminating credentials stored in plain text.

## Current Issue
- backend/src/routes/auth.js line 99-104 uses plain-text comparison
- ADMIN_PASSWORD stored in .env in clear text
- No way to rotate password without downtime
- Violates principle of defense in depth

## Files to Create/Modify

### 1. backend/src/scripts/hashAdminPassword.js (CREATE)
`javascript
import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter plain-text admin password: ', async (password) => {
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);
  
  console.log('\nAdd this to .env as ADMIN_PASSWORD_HASH:');
  console.log('ADMIN_PASSWORD_HASH=' + hashed);
  console.log('\nThen remove old ADMIN_PASSWORD from .env');
  
  rl.close();
});
`

Run once: 
ode backend/src/scripts/hashAdminPassword.js

### 2. backend/src/routes/auth.js (MODIFY)
Before (lines 98-119):
`javascript
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

if (adminEmail && adminPassword) {
  const normalizedEmail = email?.trim().toLowerCase() || '';
  const valid = secureEqual(normalizedEmail, adminEmail)
    && secureEqual(password || '', adminPassword);
  // ...
}
`

After:
`javascript
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

if (adminEmail && adminPasswordHash) {
  const normalizedEmail = email?.trim().toLowerCase() || '';
  if (secureEqual(normalizedEmail, adminEmail)) {
    const isPasswordValid = await bcrypt.compare(password || '', adminPasswordHash);
    if (!isPasswordValid) {
      attempt.count += 1;
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Login success
  } else {
    attempt.count += 1;
    return res.status(401).json({ error: 'Invalid credentials' });
  }
}
`

### 3. backend/.env.example (MODIFY)
Old:
`
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=MySecurePassword123!
`

New:
`
# Admin credentials (use hashed password)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=$... # Run scripts/hashAdminPassword.js to generate
`

### 4. backend/.env (MODIFY - PRODUCTION ONLY)
Remove: ADMIN_PASSWORD=...
Add: ADMIN_PASSWORD_HASH=$... (from script output)

## Implementation Steps

1. Create hashAdminPassword.js script
2. Run script to generate hashed password: 
ode backend/src/scripts/hashAdminPassword.js
3. Copy output hash
4. Update .env with ADMIN_PASSWORD_HASH
5. Modify auth.js to use bcrypt.compare with hash
6. Remove ADMIN_PASSWORD from .env
7. Update .env.example
8. Test admin login with new hashed password
9. Verify no regression on existing admin login tests

## Transition Steps (Backwards Compatibility Optional)

Support both old and new methods during transition (not recommended):
`javascript
// Try hashed password first
if (adminPasswordHash) {
  isValid = await bcrypt.compare(password, adminPasswordHash);
} else if (adminPassword) {
  // Fallback to plain-text (deprecated, log warning)
  console.warn('Using plain-text admin password - migrate to hash!');
  isValid = secureEqual(password, adminPassword);
}
`

## Security Considerations

- Use bcrypt with salt 10+ (computational difficulty)
- Never log actual passwords
- Use timing-safe comparison for email (already done with secureEqual)
- Hash is one-way: cannot recover original password from hash
- To change password: re-run script, update .env, restart app

## Testing Checklist
- [ ] hashAdminPassword.js script works
- [ ] Generated hash format is valid bcrypt
- [ ] Admin login with hashed password succeeds
- [ ] Admin login with wrong password fails (returns 401)
- [ ] Timing-safe email comparison still works
- [ ] Login attempt counting still works
- [ ] No regression on rate limiting
- [ ] ADMIN_PASSWORD removed from .env after migration
- [ ] .env.example documents the new format
- [ ] Works with both SQLite and PostgreSQL

## Post-Implementation Tasks

- [ ] Document migration in SETUP.md
- [ ] Add note in CHANGELOG
- [ ] Remove any docs referencing plain-text password
- [ ] Set reminder to audit for other hardcoded secrets
