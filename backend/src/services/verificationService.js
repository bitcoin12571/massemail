import crypto from 'crypto';
import { sendEmail } from './emailService.js';

// Generate random token
export function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Check if token is expired
export function isTokenExpired(expiryDate) {
  return new Date() > new Date(expiryDate);
}

// Send verification email
export async function sendVerificationEmail(contact, verificationUrl) {
  const subject = 'Verify Your Email Address';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Verify Your Email Address</h2>
      <p>Hi ${contact.name || 'there'},</p>
      <p>Thank you for adding your email to our system. Please click the button below to verify your email address:</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Verify Email
        </a>
      </div>

      <p style="font-size: 12px; color: #666;">Or copy this link: <br><code>${verificationUrl}</code></p>

      <p style="font-size: 12px; color: #999;">This link expires in 24 hours.</p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="font-size: 11px; color: #999;">If you didn't request this, please ignore this email.</p>
    </div>
  `;

  const text = `
Verify Your Email Address

Hi ${contact.name || 'there'},

Thank you for adding your email to our system. Please click the link below to verify your email address:

${verificationUrl}

This link expires in 24 hours.

If you didn't request this, please ignore this email.
  `;

  try {
    await sendEmail({
      to: contact.email,
      subject,
      html,
      text
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

// Send confirmation email (after verified)
export async function sendConfirmationEmail(contact) {
  const subject = 'Email Verified Successfully';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Email Verified! ✓</h2>
      <p>Hi ${contact.name || 'there'},</p>
      <p>Your email address has been successfully verified.</p>
      <p>You can now receive emails from our system.</p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="font-size: 11px; color: #999;">If you have any questions, please contact us.</p>
    </div>
  `;

  const text = `
Email Verified Successfully

Hi ${contact.name || 'there'},

Your email address has been successfully verified.
You can now receive emails from our system.

If you have any questions, please contact us.
  `;

  try {
    await sendEmail({
      to: contact.email,
      subject,
      html,
      text
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    // Don't throw here - verification is already complete
  }
}
