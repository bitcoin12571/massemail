import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const emailUser = process.env.SMTP_USER || 'info29730@gmail.com';
const emailPass = process.env.SMTP_PASS || '';

console.log('\n🔍 TESTING GMAIL SMTP DIRECTLY');
console.log('================================');
console.log('User:', emailUser);
console.log('Pass length:', emailPass.length);
console.log('Provider:', process.env.EMAIL_PROVIDER);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

(async () => {
  try {
    console.log('\n📧 Verifying connection...');
    await transporter.verify();
    console.log('✅ Connection verified!');

    console.log('\n📤 Sending test email...');
    const result = await transporter.sendMail({
      from: `"Test" <${emailUser}>`,
      to: 'maximplacinta589@gmail.com',
      subject: 'Direct Test - ' + new Date().toISOString(),
      html: '<p><strong>This is a DIRECT TEST EMAIL!</strong></p><p>If you see this, the SMTP is working!</p>',
      text: 'This is a direct test email!'
    });

    console.log('✅ EMAIL SENT!');
    console.log('Message ID:', result.messageId);
    console.log('\n✨ Check your inbox at maximplacinta589@gmail.com');
  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error('Name:', error.name);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Command:', error.command);
    console.error('Response:', error.response);
    console.error('\nFull error:', error);
  }
})();
