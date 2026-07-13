const sgMail = require('@sendgrid/mail');
const Newsletter = require('../models/Newsletter');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
        <h1 style="color: #1a73e8; text-align: center; margin-bottom: 30px;">
          📬 ${newsletter.subject}
        </h1>

        ${articlesHTML}

        <div style="margin-top: 30px; padding: 20px; background-color: #f0f0f0; border-radius: 8px; text-align: center;">
          <p style="color: #666; font-size: 12px;">
            © ${new Date().getFullYear()} Newsletter. All rights reserved.
          </p>
          <a href="[unsubscribe]" style="color: #999; font-size: 11px; text-decoration: none;">Unsubscribe</a>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendNewsletter(newsletter, recipients) {
  try {
    console.log(`📧 Sending newsletter to ${recipients.length} subscribers...`);

    const emailHTML = generateEmailHTML(newsletter);
    const successCount = { count: 0 };
    const failedEmails = [];

    // Send in batches of 50 to avoid rate limits
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const promises = batch.map(recipient =>
        sgMail.send({
          to: recipient.email,
          from: process.env.FROM_EMAIL || 'noreply@newsletter.com',
          subject: newsletter.subject,
          html: emailHTML,
          trackingSettings: {
            clickTracking: { enable: true },
            openTracking: { enable: true }
          },
          customArgs: {
            newsletterId: newsletter._id.toString(),
            recipientEmail: recipient.email
          }
        }).then(() => {
          successCount.count++;
        }).catch(error => {
          console.error(`Failed to send to ${recipient.email}:`, error.message);
          failedEmails.push(recipient.email);
        })
      );

      await Promise.all(promises);
      console.log(`   ✅ Batch ${Math.ceil((i + batchSize) / batchSize)} sent (${Math.min(i + batchSize, recipients.length)}/${recipients.length})`);
    }

    newsletter.status = 'sent';
    newsletter.sentAt = new Date();
    newsletter.recipientCount = successCount.count;
    await newsletter.save();

    console.log(`✅ Newsletter sent successfully to ${successCount.count} subscribers`);
    if (failedEmails.length > 0) {
      console.warn(`⚠️  Failed to send to ${failedEmails.length} emails:`, failedEmails);
    }

    return { success: true, sent: successCount.count, failed: failedEmails.length };
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    newsletter.status = 'failed';
    newsletter.failureReason = error.message;
    await newsletter.save();
    throw error;
  }
}

async function testEmail(recipient) {
  try {
    const msg = {
      to: recipient,
      from: process.env.FROM_EMAIL || 'noreply@newsletter.com',
      subject: '🧪 Newsletter System - Test Email',
      html: `
        <h1>Test Email</h1>
        <p>Your newsletter system is working correctly!</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `
    };

    await sgMail.send(msg);
    console.log(`✅ Test email sent to ${recipient}`);
    return true;
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    throw error;
  }
}

module.exports = {
  sendNewsletter,
  testEmail,
  generateEmailHTML
};
