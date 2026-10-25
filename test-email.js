#!/usr/bin/env node
/**
 * CreativeHub Email Diagnostics & Live Test Utility
 * 
 * Usage:
 *   node test-email.js
 *   node test-email.js recipient@gmail.com
 */

const dotenv = require('dotenv');
dotenv.config();

const EmailService = require('./services/emailService');

async function main() {
  console.log('====================================================');
  console.log('   CreativeHub - Email & Gmail Verification Test    ');
  console.log('====================================================\n');

  const rawUser = (process.env.SMTP_USER || '').trim();
  const rawPass = (process.env.SMTP_PASS || '').replace(/[\s-]+/g, '');
  const service = process.env.SMTP_SERVICE || '';
  const host = process.env.SMTP_HOST || '';
  const appUrl = EmailService.getAppUrl();

  console.log('1. Configuration Check:');
  console.log(`   - SMTP_SERVICE : ${service || '(auto-detected: ' + (rawUser.includes('@gmail.com') ? 'gmail' : 'none') + ')'}`);
  console.log(`   - SMTP_HOST    : ${host || '(not set, using default for service)'}`);
  console.log(`   - SMTP_USER    : ${rawUser ? rawUser : '[NOT SET - MISSING IN .env]'}`);
  console.log(`   - SMTP_PASS    : ${rawPass ? ('*' + '*'.repeat(Math.max(4, rawPass.length - 2)) + rawPass.slice(-2) + ` (${rawPass.length} chars)`) : '[NOT SET - MISSING IN .env]'}`);
  console.log(`   - APP_URL      : ${appUrl}`);
  console.log('');

  if (!rawUser || !rawPass) {
    console.error('❌ ERROR: SMTP credentials are not configured in your .env file!');
    console.log('\nTo receive live verification emails in Gmail:');
    console.log('1. Open .env');
    console.log('2. Add your sender Gmail address:');
    console.log('   SMTP_SERVICE=gmail');
    console.log('   SMTP_USER=your_email@gmail.com');
    console.log('3. Generate a 16-character Google App Password:');
    console.log('   - Go to: https://myaccount.google.com/apppasswords');
    console.log('   - (Note: 2-Step Verification must be turned ON in your Google account)');
    console.log('   - Create an app password for "CreativeHub" (it will give you 16 characters like "abcd efgh ijkl mnop")');
    console.log('   - Paste it into .env:');
    console.log('     SMTP_PASS=abcd efgh ijkl mnop');
    console.log('\nThen run: node test-email.js your_email@gmail.com');
    process.exit(1);
  }

  console.log('2. Testing SMTP Server Connection...');
  const verifyResult = await EmailService.verifyTransporter();

  if (!verifyResult.connected) {
    console.error(`\n❌ FAILED TO CONNECT TO SMTP SERVER: ${verifyResult.error}`);
    if (verifyResult.error && verifyResult.error.includes('Username and Password not accepted')) {
      console.log('\n💡 FIX: Google rejected your password.');
      console.log('   Standard Gmail passwords do not work with SMTP.');
      console.log('   You MUST create a 16-character "App Password":');
      console.log('   👉 https://myaccount.google.com/apppasswords');
    }
    process.exit(1);
  }

  console.log('   ✅ SMTP Server connection verified successfully!\n');

  const targetEmail = process.argv[2] || rawUser;
  console.log(`3. Sending Test Verification Email to: ${targetEmail}...`);

  const fakeToken = 'test_' + Math.random().toString(36).substring(2, 15);
  const result = await EmailService.sendVerificationEmail(targetEmail, 'CreativeHub Tester', fakeToken);

  if (result.success && !result.previewOnly) {
    console.log('\n🎉 SUCCESS! Verification email has been sent successfully.');
    console.log(`   - Message ID: ${result.messageId}`);
    console.log(`   - Recipient : ${targetEmail}`);
    console.log('\n📬 Please check your Gmail inbox (and also check Spam / Junk folder)!');
  } else {
    console.error('\n❌ FAILED to send test email:', result.error || 'Unknown error');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
