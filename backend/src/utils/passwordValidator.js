/**
 * Password strength validation utility
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /\d/,
  hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
};

export function validatePasswordStrength(password) {
  const errors = [];

  if (!password) {
    return {
      isValid: false,
      errors: ['Password is required']
    };
  }

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }

  if (!PASSWORD_REQUIREMENTS.hasUppercase.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!PASSWORD_REQUIREMENTS.hasLowercase.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!PASSWORD_REQUIREMENTS.hasNumber.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!PASSWORD_REQUIREMENTS.hasSpecialChar.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\'"\\|,.<>/?)')
;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get password strength score (0-5)
 */
export function getPasswordStrength(password) {
  let score = 0;

  if (!password) return score;

  if (password.length >= PASSWORD_REQUIREMENTS.minLength) score++;
  if (PASSWORD_REQUIREMENTS.hasUppercase.test(password)) score++;
  if (PASSWORD_REQUIREMENTS.hasLowercase.test(password)) score++;
  if (PASSWORD_REQUIREMENTS.hasNumber.test(password)) score++;
  if (PASSWORD_REQUIREMENTS.hasSpecialChar.test(password)) score++;

  return score;
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(score) {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  return labels[score] || 'Invalid';
}
