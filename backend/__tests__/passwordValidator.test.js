import { validatePasswordStrength, getPasswordStrength, getPasswordStrengthLabel } from '../src/utils/passwordValidator.js';

describe('passwordValidator', () => {
  describe('validatePasswordStrength', () => {
    it('should reject empty password', () => {
      const result = validatePasswordStrength('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Pass1!');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('at least 8 characters'))).toBe(true);
    });

    it('should reject password without uppercase', () => {
      const result = validatePasswordStrength('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
    });

    it('should reject password without lowercase', () => {
      const result = validatePasswordStrength('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('Password!');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('number'))).toBe(true);
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('special character'))).toBe(true);
    });

    it('should accept valid password', () => {
      const result = validatePasswordStrength('ValidPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept password with all special characters', () => {
      const result = validatePasswordStrength('Test123@#$%');
      expect(result.isValid).toBe(true);
    });
  });

  describe('getPasswordStrength', () => {
    it('should return 0 for empty password', () => {
      expect(getPasswordStrength('')).toBe(0);
    });

    it('should return 1 for password with only length', () => {
      expect(getPasswordStrength('12345678')).toBe(1);
    });

    it('should return 5 for valid password', () => {
      expect(getPasswordStrength('ValidPass123!')).toBe(5);
    });

    it('should return 4 for password missing special char', () => {
      expect(getPasswordStrength('ValidPass123')).toBe(4);
    });
  });

  describe('getPasswordStrengthLabel', () => {
    it('should return correct labels', () => {
      expect(getPasswordStrengthLabel(0)).toBe('Very Weak');
      expect(getPasswordStrengthLabel(1)).toBe('Weak');
      expect(getPasswordStrengthLabel(2)).toBe('Fair');
      expect(getPasswordStrengthLabel(3)).toBe('Good');
      expect(getPasswordStrengthLabel(4)).toBe('Strong');
      expect(getPasswordStrengthLabel(5)).toBe('Very Strong');
    });
  });
});
