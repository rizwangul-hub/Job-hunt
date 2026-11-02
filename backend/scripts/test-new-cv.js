const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verify() {
  const cvPath = path.join(__dirname, '../uploads/Resume.pdf');
  console.log(`Checking CV: ${cvPath}`);
  console.log(`Exists: ${fs.existsSync(cvPath)}`);
  const size = fs.statSync(cvPath).size;
  console.log(`Size: ${size} bytes (New updated CV is ~29KB)`);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  console.log(`Sending verification email to: ${process.env.SMTP_USER}...`);
  const info = await transporter.sendMail({
    from: `"Rizwan Ullah" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,
    subject: `Updated CV Verified & Attached — Rizwan Ullah`,
    text: `Assalam-o-Alaikum Rizwan,\n\nYour new updated CV has been verified and permanently placed in backend/uploads/Resume.pdf (${size} bytes).\n\nEvery future application will now attach this exact new CV!\n\nDeduplication Shield is now active to prevent duplicate emails to recruiters.`,
    attachments: [
      {
        filename: 'Resume_Rizwan_Ullah.pdf',
        path: cvPath,
        contentType: 'application/pdf'
      }
    ]
  });

  console.log(`✅ [VERIFIED] Email delivered with new CV attachment! MessageId: ${info.messageId}`);
}

verify().catch(e => console.error(e));
