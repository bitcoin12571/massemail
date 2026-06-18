# Password Strength Validation - Detailed Implementation Plan

## Overview
Enforce strong password requirements (8+ chars, uppercase, lowercase, number, special char) at registration and password change.

## Requirements
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*)

## Files to Create/Modify

### 1. backend/src/schemas/passwordSchema.js (CREATE)
`javascript
import { z } from 'zod';

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/\d/, 'Password must contain number')
  .regex(/[!@#$%^&*]/, 'Password must contain special character');

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  name: z.string().optional()
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});
`

### 2. backend/src/models/User.js (MODIFY)
- Add beforeCreate hook to validate password complexity
- Add beforeUpdate hook for password changes
- Throw validation error if password doesn't meet requirements
- Error message should list all failed requirements

### 3. backend/src/routes/auth.js (MODIFY)
- Use registerSchema in POST /register with validateRequest middleware
- Extract validation errors and return to client
- Test with weak passwords to verify rejection

### 4. backend/__tests__/passwordValidation.test.js (CREATE)
Test cases:
- Reject passwords < 8 chars
- Reject passwords without uppercase
- Reject passwords without lowercase
- Reject passwords without number
- Reject passwords without special character
- Accept strong passwords (8+ chars with all requirements)
- All validation errors returned together
- Test on both /register and password update endpoints

## Password Validation Rules

### Special Characters Allowed
!@#$%^&*()-_=+[]{};':",.<>?/

### Examples
- ✓ MyP@ssw0rd (meets all)
- ✗ password (no uppercase, number, special)
- ✗ PASSWORD123 (no lowercase, special)
- ✗ Pass@1 (too short)

## Implementation Steps

1. Create passwordSchema.js with Zod validation rules
2. Add hooks to User model for validation
3. Modify auth routes to use schema validation
4. Create comprehensive unit tests
5. Test with manual client (show error messages)
6. Verify no regression on existing auth functionality

## Frontend Considerations (informational)

- Show password strength indicator as user types
- Display list of requirements with checkmarks
- Only enable submit when all requirements met
- Real-time feedback prevents UX frustration

## Testing Checklist
- [ ] 8-char minimum enforced
- [ ] Uppercase requirement enforced
- [ ] Lowercase requirement enforced
- [ ] Number requirement enforced
- [ ] Special char requirement enforced
- [ ] All violations reported together
- [ ] Strong passwords accepted
- [ ] Works on register endpoint
- [ ] Works on password update endpoint
- [ ] No regression on existing tests
