# 🚀 PHASE 1: CRITICAL FIXES (4 HOURS)

## Tasks (in order):

### 1. Remove database from git (5 min)
- [ ] Add `mailora.sqlite` to .gitignore
- [ ] Remove from git history: `git rm --cached mailora.sqlite`
- [ ] Commit

### 2. Remove credential logging (2 min)
- [ ] Find all console.log with passwords/tokens
- [ ] Replace with redacted logs
- [ ] Commit

### 3. Remove PII logging (5 min)
- [ ] Find console.log with email/user data
- [ ] Replace with user ID only
- [ ] Commit

### 4. Create logger utility (30 min)
- [ ] Create `backend/src/services/logger.js` (proper structured logging)
- [ ] Add levels: info, warn, error, debug
- [ ] Add context: timestamp, requestId, userId

### 5. Add structured logging (60 min)
- [ ] Replace console.log in: auth.js, email sending, errors
- [ ] Use new logger utility
- [ ] Commit

### 6. Add email retry logic (30 min)
- [ ] Add retry counter to Email model
- [ ] Implement exponential backoff
- [ ] Commit

### 7. Other Phase 1 fixes (60 min)
- [ ] Add GDPR unsubscribe links
- [ ] Fix remaining console.logs
- [ ] Add error tracking
- [ ] Commit

## Timeline: ~4 hours total
## Deploy: After all Phase 1 complete
