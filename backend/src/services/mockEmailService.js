// Mock Email Service - For local development without SendGrid

const fs = require('fs');
const path = require('path');

// Create logs directory for mock emails
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function generateEmailHTML(newsletter) {
  const articlesHTML = newsletter.articles.map(article => `
    <div style="margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      ${article.imageUrl ? `<img src="${article.imageUrl}" alt="${article.title}" style="width: 100%; max-width: 500px; border-radius: 8px; margin-bottom: 15px;">` : ''}
      <h2 style="color: #333; font-size: 20px; margin: 10px 0;">${article.title}</h2>
      <p style="color: #666; font-size: 14px; line-height: 1.6;">${article.content}</p>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
        <h1 style="color: #1a73e8; text-align: center;">📬 ${newsletter.subject}</h1>
        ${articlesHTML}
        <div style="margin-top: 30px; padding: 20px; background-color: #f0f0f0; border-radius: 8px; text-align: center;">
          <p style="color: #666; font-size: 12px;">© Newsletter - This is a mock email (local development)</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendNewsletter(newsletter, recipients) {
  console.log(`📧 [MOCK] Sending newsletter to ${recipients.length} subscribers...`);

  const emailHTML = generateEmailHTML(newsletter);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(logsDir, `email-${timestamp}.html`);

  // Save email to file
  fs.writeFileSync(logFile, emailHTML);

  // Log email details
  const emailLog = {
    timestamp: new Date().toISOString(),
    subject: newsletter.subject,
    recipientCount: recipients.length,
    recipients: recipients.map(r => r.email),
    status: 'sent (mock)',
    emailFile: logFile
  };

  const logPath = path.join(logsDir, 'emails.json');
  let allLogs = [];
  if (fs.existsSync(logPath)) {
    allLogs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  }
  allLogs.push(emailLog);
  fs.writeFileSync(logPath, JSON.stringify(allLogs, null, 2));

  console.log(`   ✅ Mock email saved to: ${logFile}`);
  console.log(`   📋 Recipients: ${recipients.map(r => r.email).join(', ')}`);

  newsletter.status = 'sent';
  newsletter.sentAt = new Date();
  newsletter.recipientCount = recipients.length;
  await newsletter.save();

  return { success: true, sent: recipients.length, failed: 0 };
}

async function testEmail(recipient) {
  console.log(`📧 [MOCK] Sending test email to ${recipient}...`);

  const testHTML = `
    <html>
    <body style="font-family: Arial; padding: 20px;">
      <h1>Test Email</h1>
      <p>✅ Newsletter System is working correctly!</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p><small>This is a mock email (local development)</small></p>
    </body>
    </html>
  `;

  const logFile = path.join(logsDir, `test-email-${Date.now()}.html`);
  fs.writeFileSync(logFile, testHTML);

  console.log(`   ✅ Test email saved to: ${logFile}`);
  return true;
}

module.exports = {
  sendNewsletter,
  testEmail,
  generateEmailHTML
};
