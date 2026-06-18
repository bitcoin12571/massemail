# API Documentation (Swagger/OpenAPI) - Detailed Implementation Plan

## Overview
Add swagger-ui-express and swagger-jsdoc to auto-generate API documentation from JSDoc comments in route handlers.

## Files to Create/Modify

### 1. backend/package.json (MODIFY)
Add dependencies:
`
"swagger-ui-express": "^5.0.0",
"swagger-jsdoc": "^6.2.8"
`

### 2. backend/src/config/swagger.js (CREATE)
- Define OpenAPI 3.0.0 info (title, version, description)
- Configure servers (API_URL)
- Define security schemes (bearerAuth for JWT)
- Define reusable schemas (Error, User, Campaign, etc.)
- Point to route files for JSDoc parsing

### 3. backend/src/index.js (MODIFY)
- Import swagger-ui-express
- Import specs from swagger.js
- Mount UI: app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))

### 4. All route files (MODIFY - ADD JSDoc)
For each endpoint, add JSDoc comment with:
- @get/@post/@put/@delete/@patch /path/to/endpoint
- @summary (one line description)
- @tags (Category: Auth, Contacts, Campaigns, etc.)
- @requestBody (if POST/PUT with body)
- @responses (200, 400, 401, 404, 500)
- @security bearerAuth (if authenticated)

Example pattern:
`
/**
 * @get /api/auth/login
 * @summary User login endpoint
 * @tags Auth
 * @requestBody
 * @responses
 */
`

### 5. SWAGGER_SETUP.md (CREATE)
- Instructions for adding JSDoc to new endpoints
- Swagger format reference
- How to test /api-docs in browser
- How to import into Postman/Insomnia

## Route Files to Document

1. backend/src/routes/auth.js - Login, Register, Token validation
2. backend/src/routes/contacts.js - CRUD operations
3. backend/src/routes/campaigns.js - Campaign management
4. backend/src/routes/settings.js - User/system settings
5. backend/src/routes/ai.js - AI features
6. backend/src/routes/queue.js - Job queue management
7. backend/src/routes/parser.js - Email parser
8. backend/src/routes/bulkSender.js - Bulk email operations
9. backend/src/routes/webhooks.js - Webhook endpoints

## Implementation Steps

1. Install: npm install swagger-ui-express swagger-jsdoc
2. Create swagger.js config with OpenAPI definitions
3. Mount Swagger UI in index.js at /api-docs
4. Add JSDoc comments to auth.js (5-10 endpoints)
5. Add JSDoc to contacts.js (10-15 endpoints)
6. Add JSDoc to campaigns.js (8-12 endpoints)
7. Add JSDoc to remaining route files
8. Start server and verify http://localhost:5000/api-docs works
9. Test "Try it out" for 2-3 endpoints
10. Create SWAGGER_SETUP.md guide

## JSDoc Field Format

- @get/@post/@put/@delete/@patch - HTTP method and path
- @summary - Single line description
- @tags - Logical grouping (Auth, Contacts, etc.)
- @requestBody - Request schema if POST/PUT
- @responses - HTTP status + description pairs
- @security - Auth requirement (bearerAuth)
- @parameters - Path/query parameters

## Testing & Verification

Start server: npm run dev:backend
Visit: http://localhost:5000/api-docs
Check:
- All endpoints visible
- Request/response schemas correct
- Auth routes don't require bearer token
- Protected routes marked with security
- Try it out button functional
- No parse errors in browser console

## Effort & Completion Criteria

Effort: 2-3 hours (systematic JSDoc addition)
Completion:
- All 9 route files have JSDoc comments
- /api-docs page loads without errors
- All endpoints listed in UI
- Request/response examples correct
- Importable into Postman/Insomnia
