import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import SystemSetting from '../models/SystemSetting.js';

const defaults = {
  provider: process.env.EMAIL_PROVIDER || 'preview',
  senderName: process.env.SENDER_NAME || 'Company Mail Center',
  senderEmail: process.env.EMAIL_FROM || 'info29730@gmail.com',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: process.env.SMTP_USER || 'info29730@gmail.com',
  smtpPassword: process.env.SMTP_PASS || '',
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  resendApiKey: process.env.RESEND_API_KEY || ''
};

let transporter;
let resendClient;
let settings = { ...defaults };

function createTransport(config) {
  if (config.provider === 'resend' && config.resendApiKey) {
    resendClient = new Resend(config.resendApiKey);
    // Return a dummy transporter for compatibility
    return {
      verify: async () => true,
      sendMail: async (mailOptions) => {
        // This will be overridden in sendEmail function
        return { messageId: 'resend-dummy' };
      }
    };
  }

  if (config.provider === 'gmail' && config.smtpUser) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: config.smtpUser, pass: config.smtpPassword }
    });
  }

  if (config.provider === 'outlook' && config.smtpUser) {
    return nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: { user: config.smtpUser, pass: config.smtpPassword }
    });
  }

  if (config.provider === 'sendgrid' && config.sendgridApiKey) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: { user: 'apikey', pass: config.sendgridApiKey }
    });
  }

  if (config.provider === 'smtp' && config.smtpHost) {
    return nodemailer.createTransport({
      host: config.smtpHost,
      port: Number(config.smtpPort || 587),
      secure: Boolean(config.smtpSecure),
      auth: config.smtpUser
        ? { user: config.smtpUser, pass: config.smtpPassword }
        : undefined
    });
  }

  return nodemailer.createTransport({ jsonTransport: true });
}

export async function initializeEmailService() {
  const stored = await SystemSetting.findByPk('email');

  // PRIORITIZE .env FIRST, then database
  const envProvider = process.env.EMAIL_PROVIDER;
  const provider = envProvider || stored?.value?.provider || 'preview';

  console.log(`[EMAIL SERVICE] Loading configuration...`);
  console.log(`[EMAIL SERVICE] .env EMAIL_PROVIDER: ${envProvider}`);
  console.log(`[EMAIL SERVICE] Stored provider: ${stored?.value?.provider}`);
  console.log(`[EMAIL SERVICE] Final provider: ${provider}`);

  settings = {
    ...defaults,
    provider,
    senderName: process.env.SENDER_NAME || stored?.value?.senderName || defaults.senderName,
    senderEmail: process.env.EMAIL_FROM || stored?.value?.senderEmail || process.env.SENDGRID_FROM_EMAIL || defaults.senderEmail,
    smtpHost: process.env.SMTP_HOST || stored?.value?.smtpHost || '',
    smtpPort: Number(process.env.SMTP_PORT || stored?.value?.smtpPort || 587),
    smtpSecure: process.env.SMTP_SECURE === 'true' || stored?.value?.smtpSecure || false,
    smtpUser: process.env.SMTP_USER || stored?.value?.smtpUser || '',
    smtpPassword: process.env.SMTP_PASS || stored?.value?.smtpPassword || '',
    sendgridApiKey: process.env.SENDGRID_API_KEY || stored?.value?.sendgridApiKey || '',
    resendApiKey: process.env.RESEND_API_KEY || stored?.value?.resendApiKey || ''
  };

  console.log(`[EMAIL SERVICE] ================================================`);
  console.log(`[EMAIL SERVICE] Configuration loaded:`);
  console.log(`[EMAIL SERVICE]   Provider: ${settings.provider}`);
  console.log(`[EMAIL SERVICE]   User: ${settings.smtpUser}`);
  console.log(`[EMAIL SERVICE]   From: ${settings.senderEmail}`);
  console.log(`[EMAIL SERVICE]   Has Password: ${!!settings.smtpPassword}`);
  console.log(`[EMAIL SERVICE] ================================================`);

  transporter = createTransport(settings);
  console.log(`Email service initialized (${settings.provider} mode)`);
}

export async function getEmailSettings() {
  if (!transporter) await initializeEmailService();
  return {
    ...settings,
    smtpPassword: settings.smtpPassword ? '********' : '',
    sendgridApiKey: settings.sendgridApiKey ? '********' : ''
  };
}

export function isRealEmailDeliveryConfigured() {
  if (settings.provider === 'gmail' || settings.provider === 'outlook') {
    return Boolean(settings.smtpUser && settings.smtpPassword);
  }
  if (settings.provider === 'smtp') {
    return Boolean(settings.smtpHost);
  }
  if (settings.provider === 'sendgrid') {
    return Boolean(settings.sendgridApiKey);
  }
  return false;
}

export async function updateEmailSettings(input) {
  const next = {
    ...settings,
    provider: ['preview', 'gmail', 'outlook', 'smtp', 'sendgrid'].includes(input.provider) ? input.provider : 'preview',
    senderName: input.senderName?.trim() || defaults.senderName,
    senderEmail: input.senderEmail?.trim() || defaults.senderEmail,
    smtpHost: input.smtpHost?.trim() || '',
    smtpPort: Number(input.smtpPort || 587),
    smtpSecure: Boolean(input.smtpSecure),
    smtpUser: input.smtpUser?.trim() || '',
    smtpPassword: input.smtpPassword && input.smtpPassword !== '********'
      ? input.smtpPassword
      : settings.smtpPassword,
    sendgridApiKey: input.sendgridApiKey && input.sendgridApiKey !== '********'
      ? input.sendgridApiKey
      : settings.sendgridApiKey
  };

  await SystemSetting.upsert({ key: 'email', value: next });
  settings = next;
  transporter = createTransport(settings);
  return getEmailSettings();
}

export async function verifyEmailConnection() {
  if (!transporter) await initializeEmailService();
  if (settings.provider === 'preview') {
    return { success: true, message: 'Preview mode is ready. No real emails will be sent.' };
  }
  await transporter.verify();
  return { success: true, message: `${settings.provider.toUpperCase()} connection verified successfully.` };
}

export async function sendEmail(emailData) {
  if (!transporter) await initializeEmailService();

  console.log(`\n[EMAIL SERVICE] ================================`);
  console.log(`[EMAIL SERVICE] 📧 Sending email via ${settings.provider}`);
  console.log(`[EMAIL SERVICE] To: ${emailData.to}`);
  console.log(`[EMAIL SERVICE] Subject: ${emailData.subject}`);
  console.log(`[EMAIL SERVICE] From: "${settings.senderName}" <${settings.senderEmail}>`);
  console.log(`[EMAIL SERVICE] ================================\n`);

  // Use Resend if provider is resend
  if (settings.provider === 'resend' && resendClient) {
    try {
      console.log('[EMAIL SERVICE] Using Resend provider');
      const result = await resendClient.emails.send({
        from: settings.senderEmail,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.personalizedHtml || emailData.html,
        text: emailData.personalizedText || emailData.text,
      });

      if (result.error) {
        throw result.error;
      }

      console.log(`[EMAIL SERVICE] ✅ Resend sent successfully: ${result.data.id}`);
      return {
        success: true,
        messageId: result.data.id,
        response: result.data
      };
    } catch (error) {
      console.error('[EMAIL SERVICE] ❌ Resend error:', error.message || error);
      throw error;
    }
  }

  // Fall back to Nodemailer for other providers (Gmail, Outlook, SendGrid, SMTP, etc.)
  try {
    console.log(`[EMAIL SERVICE] Using Nodemailer (${settings.provider}) to send email`);
    console.log(`[EMAIL SERVICE] Transporter config: ${JSON.stringify({
      provider: settings.provider,
      user: settings.smtpUser,
      hasPassword: !!settings.smtpPassword
    }, null, 2)}`);

    // Process attachments: images as inline, files as attachments
    const inlineImages = [];
    const fileAttachments = [];

    if (emailData.attachments) {
      emailData.attachments.forEach((att, idx) => {
        const isImage = att.contentType && att.contentType.startsWith('image/');
        if (isImage) {
          inlineImages.push({
            filename: att.filename,
            content: Buffer.from(att.content, 'base64'),
            contentType: att.contentType,
            cid: `image_${idx}@campaign`
          });
        } else {
          fileAttachments.push({
            filename: att.filename,
            content: Buffer.from(att.content, 'base64'),
            contentType: att.contentType
          });
        }
      });
    }

    // Replace image references in HTML with inline CIDs
    let htmlContent = emailData.personalizedHtml || emailData.html;
    inlineImages.forEach((img, idx) => {
      const imgTag = `<img src="cid:image_${idx}@campaign" style="max-width: 100%; height: auto;" />`;
      htmlContent = htmlContent.replace(/\[image\]|\{image\}/gi, imgTag);
    });

    const result = await transporter.sendMail({
      from: `"${settings.senderName}" <${settings.senderEmail}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: htmlContent,
      text: emailData.personalizedText || emailData.text,
      attachments: [...inlineImages, ...fileAttachments]
    });

    console.log(`[EMAIL SERVICE] ✅ Nodemailer sent successfully via ${settings.provider}`);
    console.log(`[EMAIL SERVICE] Message ID: ${result.messageId || result.id}`);
    return {
      success: true,
      messageId: result.messageId || result.id,
      response: result.response
    };
  } catch (error) {
    console.error(`[EMAIL SERVICE] ❌ Nodemailer error sending via ${settings.provider}:`);
    console.error(`[EMAIL SERVICE] Error message: ${error.message}`);
    console.error(`[EMAIL SERVICE] Full error:`, error);
    throw error;
  }
}
