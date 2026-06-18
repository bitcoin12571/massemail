# Database Migrations (Sequelize CLI) - Detailed Implementation Plan

## Overview
Replace sequelize.sync() with proper migrations for version-controlled schema changes using Sequelize CLI.

## Current State
- Uses sequelize.sync() in index.js
- No migration files or rollback capability
- Schema changes require code restart
- No schema version history

## Files to Create/Modify

### 1. backend/.sequelizerc (CREATE)
Configuration file for Sequelize CLI:
- Point to migrations folder
- Point to seeders folder
- Point to models folder
- Point to sequelize-config.js

### 2. backend/src/config/sequelize-config.js (CREATE)
Export config object with development and production settings:
- Development: SQLite with mailora.sqlite
- Production: PostgreSQL with DATABASE_URL
- Include SSL options for production
- Set logging to false

### 3. backend/migrations/ folder (CREATE)
Generate 10 migration files for:
1. create-users-table
2. create-campaigns-table
3. create-contacts-table
4. create-emails-table
5. create-jobqueues-table
6. create-parsedemails-table
7. create-bulkcampaigns-table
8. create-bulkcampaignsends-table
9. create-systemsettings-table
10. create-accountlockouts-table

Each migration has up() and down() functions

### 4. backend/seeders/ folder (CREATE)
Optional seed files for test data:
- demo-users.js
- demo-campaigns.js

### 5. backend/src/index.js (MODIFY)
Replace: sequelize.sync({ force: false, alter: false })
With: Migration runner using Umzug library

### 6. backend/package.json (MODIFY)
Add scripts:
- migrate: sequelize-cli db:migrate
- migrate:undo: sequelize-cli db:migrate:undo
- migrate:undo:all: sequelize-cli db:migrate:undo:all
- seed: sequelize-cli db:seed:all

Add dependencies:
- sequelize-cli: ^6.6.2
- umzug: ^3.0.0

### 7. MIGRATIONS_GUIDE.md (CREATE)
Documentation:
- How to create new migration files
- Migration naming conventions
- How to run migrations
- How to rollback migrations
- Best practices (one feature per migration)
- Testing migrations locally

## Migration File Template

`
export async function up(queryInterface, Sequelize) {
  // Create table or alter schema
  await queryInterface.createTable('TableName', { ... });
}

export async function down(queryInterface, Sequelize) {
  // Reverse the up() operation
  await queryInterface.dropTable('TableName');
}
`

## Implementation Steps

1. Install: npm install sequelize-cli umzug
2. Create .sequelizerc config
3. Create sequelize-config.js with dev/prod settings
4. Generate 10 migration files for existing models
5. Translate each model definition into migration schema
6. Update index.js to run migrations instead of sync
7. Test forward migration: npm run migrate
8. Test rollback: npm run migrate:undo:all
9. Verify database state with sqlite3 or psql
10. Create MIGRATIONS_GUIDE.md

## Database State Verification

After migrations:
`
sqlite3 mailora.sqlite ".tables"
sqlite3 mailora.sqlite ".schema Users"
`

Or PostgreSQL:
`
psql  -c "\\dt"
`

Should see all tables created in migration order

## Completion Criteria

- [ ] 10 migration files created
- [ ] npm run migrate runs without errors
- [ ] npm run migrate:undo:all succeeds
- [ ] Database schema matches Sequelize models
- [ ] Works with SQLite (development)
- [ ] Works with PostgreSQL (production)
- [ ] SequelizeMeta table populated
- [ ] Migrations idempotent (safe to run multiple times)
- [ ] MIGRATIONS_GUIDE.md created and documented

## Effort: 3-4 hours

Includes creation of 10 migration files and testing both SQLite and PostgreSQL databases
