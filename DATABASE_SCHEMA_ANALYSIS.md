# Database Schema Analysis Report

**Analysis Date:** 2026-07-06  
**Database:** Sequelize (PostgreSQL/SQLite)  
**Migration Strategy:** sequelize.sync() with manual migrations

---

## 1. MIGRATION FILES INVENTORY

| File | Date | Description | Status |
|------|------|-------------|--------|
| `backend/src/migrations/001_add_user_security_fields.js` | 2024-06-18 | Adds `failedLoginAttempts` (INT, default 0) and `lockedUntil` (DATE, nullable) to Users table | Applied |

**Summary:** Only 1 migration file exists. Application uses `sequelize.sync()` for initial table creation, not a full migration-based approach.

---

## 2. MODEL-TO-MIGRATION VERIFICATION

### ✅ Migration Matches Model Definition
- **User Model** (`backend/src/models/User.js`, lines 42-48)
  - `failedLoginAttempts: INTEGER, defaultValue: 0` ✓
  - `lockedUntil: DATE, allowNull: true` ✓
  - **Status:** Fully aligned with migration 001

---

## 3. FOREIGN KEY ANALYSIS

### Foreign Keys Defined in Models

| Model | Column | References | onDelete | Status |
|-------|--------|-----------|----------|--------|
| **Session** | `userId` | Users.id | CASCADE | ✓ Explicit |
| **AuditLog** | `userId` | Users.id | SET NULL | ✓ Explicit |
| **JobQueue** | `emailId` | Emails.id | (none) | ⚠️ Missing onDelete |
| **JobQueue** | `campaignId` | Campaigns.id | (none) | ⚠️ Missing onDelete |
| **JobQueue** | `contactId` | Contacts.id | (none) | ⚠️ Missing onDelete |
| **BulkCampaignSend** | `campaignId` | bulk_campaigns.id | (none) | ⚠️ Missing onDelete |
| **BulkCampaignSend** | `emailId` | parsed_emails.id | (none) | ⚠️ Missing onDelete |

### 🔴 CRITICAL ISSUES: Missing Foreign Key Configurations

#### Issue #1: JobQueue Missing Delete Cascade
**File:** `backend/src/models/JobQueue.js` (lines 10-32)
```javascript
// CURRENT (INCOMPLETE):
emailId: { type: DataTypes.UUID, references: { model: 'Emails', key: 'id' } }
campaignId: { type: DataTypes.UUID, references: { model: 'Campaigns', key: 'id' } }
contactId: { type: DataTypes.UUID, references: { model: 'Contacts', key: 'id' } }

// SHOULD BE:
emailId: { 
  type: DataTypes.UUID, 
  references: { model: 'Emails', key: 'id' },
  onDelete: 'CASCADE' // Orphaned queue entries if email deleted
}
```
**Impact:** Deleting an Email, Campaign, or Contact leaves orphaned JobQueue entries.

#### Issue #2: BulkCampaignSend Missing Delete Cascade
**File:** `backend/src/models/BulkCampaignSend.js` (lines 10-24)
```javascript
// CURRENT (INCOMPLETE):
campaignId: { 
  type: DataTypes.INTEGER, 
  references: { model: 'bulk_campaigns', key: 'id' } 
}
emailId: { 
  type: DataTypes.INTEGER, 
  references: { model: 'parsed_emails', key: 'id' } 
}

// SHOULD BE:
campaignId: { 
  type: DataTypes.INTEGER, 
  references: { model: 'bulk_campaigns', key: 'id' },
  onDelete: 'CASCADE' // Clean up sends when campaign deleted
}
emailId: { 
  type: DataTypes.INTEGER, 
  references: { model: 'parsed_emails', key: 'id' },
  onDelete: 'CASCADE' // Clean up sends when email deleted
}
```
**Impact:** Deleting BulkCampaign or ParsedEmail leaves orphaned BulkCampaignSend records.

---

## 4. INDEX DEFINITIONS

### Models WITH Proper Indexes ✓
- **Email** (3 indexes): campaignId, contactId, status
- **Contact** (2 indexes): email, status
- **Session** (4 indexes): userId, sessionId, expiresAt, active
- **AuditLog** (4 indexes): userId+createdAt, eventType, resource+resourceId, createdAt
- **JobQueue** (4 indexes): status, emailId, campaignId, createdAt
- **ParsedEmail** (4 indexes): email, region, isValid, source
- **BulkCampaign** (3 indexes): status, region, createdAt
- **BulkCampaignSend** (3 indexes): campaignId, status, trackingToken

### Models WITHOUT Indexes ⚠️
- **User** (lines 6-58)
  - **Missing:** email (already has `unique: true`, but no explicit index)
  - **Missing:** active (common filter in queries)
  - **Recommendation:** Add index on active for user list filters

- **Campaign** (lines 4-47)
  - **Missing:** createdBy (foreign key field)
  - **Missing:** status (common filter)
  - **Recommendation:** Add indexes for common queries on draft/scheduled/sent status

- **Contact** (line 44-47: createdBy field)
  - **Missing:** createdBy index
  - **Recommendation:** Add index for filtering contacts by creator

- **SystemSetting** (lines 4-16)
  - **No indexes defined** (but has string primary key, likely low-volume table)
  - **Status:** Acceptable for settings table

---

## 5. COLUMN CONSTRAINTS VERIFICATION

### ✅ Properly Constrained
- **User.email:** UNIQUE, NOT NULL, validated as email
- **User.password:** NOT NULL
- **Contact.email:** UNIQUE, NOT NULL, validated as email
- **Session.sessionId:** UNIQUE, NOT NULL
- **BulkCampaignSend.trackingToken:** UNIQUE

### ⚠️ WEAK CONSTRAINTS DETECTED

#### Issue #3: Contact.createdBy Missing Foreign Key
**File:** `backend/src/models/Contact.js` (line 44-47)
```javascript
createdBy: {
  type: DataTypes.UUID,
  allowNull: false  // References Users.id but NO FK constraint!
}
```
**Problem:** Field references User but has no foreign key definition. Orphaned contacts if user deleted.
**Fix:** Add foreign key with onDelete: 'CASCADE' or 'RESTRICT'

#### Issue #4: Campaign.createdBy Missing Foreign Key
**File:** `backend/src/models/Campaign.js` (line 39-42)
```javascript
createdBy: {
  type: DataTypes.UUID,
  allowNull: false  // References Users.id but NO FK constraint!
}
```
**Problem:** Matches Contact issue. No referential integrity.
**Fix:** Add foreign key constraint

#### Issue #5: Email Table Missing Foreign Keys
**File:** `backend/src/models/Email.js` (line 10-17)
```javascript
campaignId: { type: DataTypes.UUID, allowNull: false }  // NO FK
contactId: { type: DataTypes.UUID, allowNull: false }   // NO FK
```
**Problem:** Fields should have explicit foreign keys.
**Status:** Currently no cascade behavior defined.

---

## 6. SEQUELIZE ASSOCIATIONS

**Status:** ❌ NO associations defined in any model

**Current State:** Models define foreign keys inline but don't use Sequelize associations (`belongsTo`, `hasMany`, `belongsToMany`).

**Impact:**
- Cannot use eager loading: `Campaign.findAll({ include: 'User' })`
- Relationship queries require manual joins
- Harder to maintain referential logic
- ORM benefits lost

**Expected Associations (Not Implemented):**
```javascript
// In User.js:
User.hasMany(Campaign, { foreignKey: 'createdBy' })
User.hasMany(Contact, { foreignKey: 'createdBy' })
User.hasMany(Session, { foreignKey: 'userId', onDelete: 'CASCADE' })
User.hasMany(AuditLog, { foreignKey: 'userId', onDelete: 'SET NULL' })

// In Campaign.js:
Campaign.belongsTo(User, { foreignKey: 'createdBy' })
Campaign.hasMany(Email, { foreignKey: 'campaignId' })
Campaign.hasMany(JobQueue, { foreignKey: 'campaignId' })

// In Email.js:
Email.belongsTo(Campaign, { foreignKey: 'campaignId' })
Email.belongsTo(Contact, { foreignKey: 'contactId' })
Email.hasMany(JobQueue, { foreignKey: 'emailId' })

// In Contact.js:
Contact.belongsTo(User, { foreignKey: 'createdBy' })
Contact.hasMany(Email, { foreignKey: 'contactId' })
Contact.hasMany(JobQueue, { foreignKey: 'contactId' })

// In JobQueue.js:
JobQueue.belongsTo(Email, { foreignKey: 'emailId' })
JobQueue.belongsTo(Campaign, { foreignKey: 'campaignId' })
JobQueue.belongsTo(Contact, { foreignKey: 'contactId' })

// In BulkCampaignSend.js:
BulkCampaignSend.belongsTo(BulkCampaign, { foreignKey: 'campaignId' })
BulkCampaignSend.belongsTo(ParsedEmail, { foreignKey: 'emailId' })

// In Session.js:
Session.belongsTo(User, { foreignKey: 'userId' })

// In AuditLog.js:
AuditLog.belongsTo(User, { foreignKey: 'userId' })
```

---

## 7. TABLE NAMING INCONSISTENCIES

| Model | Model Name | Table Name | Match |
|-------|-----------|-----------|-------|
| User | User | Users (Sequelize default) | ✓ |
| Campaign | Campaign | Campaigns (Sequelize default) | ✓ |
| Contact | Contact | Contacts (Sequelize default) | ✓ |
| Email | Email | Emails (Sequelize default) | ✓ |
| Session | Session | Sessions (explicit) | ✓ |
| AuditLog | AuditLog | AuditLogs (explicit) | ✓ |
| JobQueue | JobQueue | job_queues (explicit) | ⚠️ Inconsistent naming |
| ParsedEmail | ParsedEmail | parsed_emails (explicit) | ⚠️ Inconsistent naming |
| BulkCampaign | BulkCampaign | bulk_campaigns (explicit) | ⚠️ Inconsistent naming |
| BulkCampaignSend | BulkCampaignSend | bulk_campaign_sends (explicit) | ⚠️ Inconsistent naming |
| SystemSetting | SystemSetting | SystemSettings (Sequelize default) | ✓ |

**Issue:** Mixed naming conventions (PascalCase defaults vs snake_case overrides) could cause confusion.

---

## 8. INCOMPLETE MIGRATIONS STATUS

**Finding:** Application uses `sequelize.sync()` instead of Umzug/migration runner.

**Current Config** (backend/src/index.js, lines 67-68):
```javascript
await sequelize.sync({ force: false, alter: false });
logger.info('DB', 'Models synced');
```

**Problems:**
1. No versioning of schema changes
2. Can't roll back changes
3. No audit trail of migrations
4. Migration file (001_add_user_security_fields.js) may not be applied if table already exists
5. Data loss risk if someone runs with `force: true`

**Recommendation:** Migrate to proper Umzug migration system with:
- Proper versioning
- Rollback capability
- Applied migrations tracking

---

## 9. SUMMARY OF ALIGNMENT ISSUES

### 🔴 Critical (Data Integrity Risk)
1. **JobQueue missing onDelete cascade** - 3 FK fields (emailId, campaignId, contactId)
2. **BulkCampaignSend missing onDelete cascade** - 2 FK fields (campaignId, emailId)
3. **Contact.createdBy missing FK constraint** - Referential integrity gap
4. **Campaign.createdBy missing FK constraint** - Referential integrity gap
5. **Email missing explicit FK definitions** - Fields present but no constraints

### 🟡 Warnings (Best Practice)
6. **No Sequelize associations defined** - Lost ORM benefits, harder to query relationships
7. **Email table has FK fields but no explicit constraints** - Works but less safe
8. **Inconsistent table naming** - PascalCase vs snake_case mix
9. **Missing indexes on**:
   - User.active (filter field)
   - Campaign.status (common filter)
   - Campaign.createdBy (FK)
   - Contact.createdBy (FK)

### ℹ️ Informational
10. **Single migration file** - Application primarily uses sequelize.sync() not migration versioning
11. **SystemSetting table** - Simple key-value store, no FK needed but low utilization

---

## 10. REMEDIATION PRIORITY

**Phase 1 (URGENT - Week 1):**
- [ ] Add `onDelete: 'CASCADE'` to JobQueue FKs (Job cleanup)
- [ ] Add `onDelete: 'CASCADE'` to BulkCampaignSend FKs (Campaign cleanup)
- [ ] Add FK constraints to Contact.createdBy (User reference)
- [ ] Add FK constraints to Campaign.createdBy (User reference)

**Phase 2 (HIGH - Week 2):**
- [ ] Implement Sequelize associations in all models
- [ ] Add missing indexes (User.active, Campaign.status, createdBy fields)
- [ ] Standardize table naming convention (choose one: PascalCase OR snake_case)

**Phase 3 (MEDIUM - Week 3-4):**
- [ ] Migrate to Umzug for proper migration versioning
- [ ] Create data migration for existing orphaned records (if any)
- [ ] Document relationship models for future developers

---

## 11. MIGRATION STRATEGY RECOMMENDATIONS

**Current:** `sequelize.sync()` with single manual migration file
**Recommended:** Hybrid approach:
1. Keep models as source of truth
2. Use Umzug for versioned migrations
3. Create migration for Phase 1 fixes (FKs, constraints)
4. Document cascade behavior clearly

**File:** `backend/src/config/database.js` should be updated to initialize Umzug migrator before sync.

