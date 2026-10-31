/**
 * Universal Job Applier Engine for RizAgent
 * Candidate: Rizwan Ullah (rizwangul535@gmail.com | +92 325 5984244)
 * 
 * Capabilities:
 * 1. Takes any job lead from WhatsApp, LinkedIn, Facebook, Instagram, or Web feeds.
 * 2. Crafts personalized pitches based on role (Full-Stack / MERN / Python / React / Data Entry).
 * 3. Dispatches official application email with Resume.pdf attached via Gmail SMTP.
 * 4. Dispatches direct WhatsApp pitch with CV if recruiter phone is found.
 * 5. Logs application in MongoDB Atlas & sends confirmation alert to candidate's WhatsApp (+92 325 5984244).
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CANDIDATE = {
  name: 'Rizwan Ullah',
  email: process.env.SMTP_USER || 'rizwangul535@gmail.com',
  phone: process.env.CANDIDATE_PHONE || '+92 325 5984244',
  cleanPhone: '03255984244',
  whatsappJid: '923255984244@c.us',
  portfolio: process.env.CANDIDATE_PORTFOLIO || 'https://full-stack-portfolio-coral.vercel.app',
  linkedin: process.env.CANDIDATE_LINKEDIN || 'https://www.linkedin.com/in/rizwanmerndev',
  github: process.env.CANDIDATE_GITHUB || 'https://github.com/rizwangul-hub',
  calendly: process.env.CANDIDATE_CALENDLY || 'https://calendly.com/rizwangul-dev'
};

function getCVPath() {
  const primary = path.join(__dirname, '../uploads/Resume.pdf');
  if (fs.existsSync(primary)) return primary;
  const secondary = path.join(__dirname, '../uploads/cvs/Resume.pdf');
  if (fs.existsSync(secondary)) return secondary;
  return null;
}

// Nodemailer Transporter
let transporter = null;
function getTransporter() {
  if (!transporter && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

// Generate tailored pitch & subject line
function craftApplicationPitch(title, company, description = '') {
  const combined = (title + ' ' + description).toLowerCase();

  if (
    combined.includes('data entry') ||
    combined.includes('computer operator') ||
    combined.includes('office assistant') ||
    combined.includes('typing')
  ) {
    return {
      subject: `Application for ${title} — ${CANDIDATE.name}`,
      body: `Respected Hiring Team at ${company || 'Hiring Organization'},

I am writing to express my strong interest in the ${title} position.

I possess extensive computer proficiency, fast typing speed, and proven accuracy in data entry, document formatting, database administration, and record management using Microsoft Office, Google Workspace, and cloud tools. I am dedicated to delivering flawless accuracy, quick turnaround times, and professional consistency.

Candidate Overview:
- 👤 Name: ${CANDIDATE.name}
- 🌐 Online Portfolio: ${CANDIDATE.portfolio}
- 💼 LinkedIn Profile: ${CANDIDATE.linkedin}
- 💻 GitHub Profile: ${CANDIDATE.github}
- 📅 Schedule a Quick Intro: ${CANDIDATE.calendly}
- 📞 Direct Contact / WhatsApp: ${CANDIDATE.phone}

My complete resume is attached to this email. I am available immediately for an interview and look forward to hearing from you.

Warm regards,
${CANDIDATE.name}
Email: ${CANDIDATE.email}
Phone: ${CANDIDATE.phone}`
    };
  } else if (
    combined.includes('python') ||
    combined.includes('ai') ||
    combined.includes('machine learning') ||
    combined.includes('backend') ||
    combined.includes('django') ||
    combined.includes('fastapi')
  ) {
    return {
      subject: `Software Engineering Application: ${title} — ${CANDIDATE.name}`,
      body: `Dear Hiring Team at ${company || 'Engineering Team'},

I am excited to submit my application for the ${title} opportunity.

With extensive experience building resilient backend architectures, RESTful APIs, data automation pipelines, and scalable web solutions, I specialize in clean code, algorithmic efficiency, and seamless database integration. I adapt quickly to new tech stacks and collaborate smoothly in agile environments.

Candidate Overview & Demos:
- 👤 Full Name: ${CANDIDATE.name}
- 🌐 Live Portfolio & Demos: ${CANDIDATE.portfolio}
- 💻 GitHub Repositories: ${CANDIDATE.github}
- 💼 LinkedIn: ${CANDIDATE.linkedin}
- 📅 Schedule a 15-Minute Intro: ${CANDIDATE.calendly}
- 📞 Contact / WhatsApp: ${CANDIDATE.phone}

Please find my CV attached for your review. I would welcome the opportunity to discuss how my technical expertise can support your current projects.

Best regards,
${CANDIDATE.name}
Software & Full-Stack Developer
Email: ${CANDIDATE.email}
Phone: ${CANDIDATE.phone}`
    };
  } else {
    // Default: Full Stack Developer / MERN / React / Frontend / Web Developer
    return {
      subject: `Application for ${title} — ${CANDIDATE.name} (Full-Stack & MERN Developer)`,
      body: `Dear Hiring Team at ${company || 'Hiring Team'},

I am writing to express my strong enthusiasm for the ${title} role.

As a dedicated Full-Stack Software Developer, I specialize in designing and shipping scalable web applications using the MERN stack (MongoDB, Express.js, React.js, Node.js), Next.js, TypeScript, and modern state management. I have hands-on experience developing intuitive user experiences, robust REST/GraphQL APIs, secure authentication, and cloud-deployed microservices.

Core Technical Strengths:
- Frontend: React.js, Next.js, Redux Toolkit, Tailwind CSS, HTML5/CSS3, JavaScript (ES6+), TypeScript
- Backend: Node.js, Express.js, REST APIs, Microservices, Webhooks
- Databases & Cloud: MongoDB, PostgreSQL, Firebase, AWS, Docker, Vercel, Railway

Portfolio & Work Highlights:
- 🌐 Live Portfolio & Projects: ${CANDIDATE.portfolio}
- 💻 GitHub Repositories: ${CANDIDATE.github}
- 💼 LinkedIn Profile: ${CANDIDATE.linkedin}
- 📅 Book a 15-Minute Intro Call: ${CANDIDATE.calendly}

My resume is attached for your detailed evaluation. I am available to start immediately and would love to connect for a brief introductory interview.

Warm regards,
${CANDIDATE.name}
Full-Stack Software Engineer
Email: ${CANDIDATE.email}
Phone: ${CANDIDATE.phone}`
    };
  }
}

// Dispatches application email to recruiter
async function sendApplicationEmail({ toEmail, title, company, description, sourceUrl }) {
  const mailer = getTransporter();
  if (!mailer) {
    console.log(`⚠️ SMTP Transporter not configured. Skipping email dispatch to ${toEmail}`);
    return false;
  }

  const pitch = craftApplicationPitch(title, company, description);
  const cvFile = getCVPath();

  const attachments = [];
  if (cvFile && fs.existsSync(cvFile)) {
    attachments.push({
      filename: `Resume_${CANDIDATE.name.replace(/\s+/g, '_')}.pdf`,
      path: cvFile,
      contentType: 'application/pdf'
    });
  }

  try {
    const info = await mailer.sendMail({
      from: `"${CANDIDATE.name}" <${CANDIDATE.email}>`,
      to: toEmail,
      subject: pitch.subject,
      text: pitch.body,
      attachments: attachments
    });

    console.log(`✅ [EMAIL DISPATCHED] Successfully sent CV to ${toEmail} for "${title}" (${info.messageId})`);
    return true;
  } catch (err) {
    console.error(`❌ [EMAIL ERROR] Failed sending to ${toEmail}: ${err.message}`);
    return false;
  }
}

// Dispatches application WhatsApp message & document (if whatsapp client is provided)
async function sendApplicationWhatsApp(whatsappClient, { toPhone, title, company, description }) {
  if (!whatsappClient) return false;

  try {
    const cleanNumber = toPhone.replace(/\D/g, '');
    let targetJid = cleanNumber;
    if (cleanNumber.startsWith('03')) {
      targetJid = '92' + cleanNumber.substring(1) + '@c.us';
    } else if (cleanNumber.startsWith('92')) {
      targetJid = cleanNumber + '@c.us';
    } else {
      targetJid = cleanNumber + '@c.us';
    }

    const pitch = craftApplicationPitch(title, company, description);
    const shortPitch = `Assalam-o-Alaikum / Hello Hiring Team,\n\nI am writing to apply for the *${title}* opening${company ? ` at *${company}*` : ''}.\n\nI am a Full-Stack Developer experienced in React, Node.js, Next.js, and modern software development.\n\n🌐 *Portfolio:* ${CANDIDATE.portfolio}\n💼 *LinkedIn:* ${CANDIDATE.linkedin}\n💻 *GitHub:* ${CANDIDATE.github}\n📅 *Book a Call:* ${CANDIDATE.calendly}\n\nI have also attached my CV for your review. Looking forward to discussing this opportunity!\n\nBest regards,\n*${CANDIDATE.name}*\n${CANDIDATE.phone} | ${CANDIDATE.email}`;

    // Send text pitch
    await whatsappClient.sendMessage(targetJid, shortPitch);
    console.log(`✅ [WHATSAPP DISPATCHED] Sent intro pitch to recruiter at ${targetJid}`);

    // Send CV Document if possible
    const cvFile = getCVPath();
    if (cvFile && fs.existsSync(cvFile)) {
      try {
        const { MessageMedia } = require('whatsapp-web.js');
        const media = MessageMedia.fromFilePath(cvFile);
        await whatsappClient.sendMessage(targetJid, media, { caption: `CV - ${CANDIDATE.name}` });
        console.log(`📎 [WHATSAPP CV] Sent Resume.pdf to recruiter at ${targetJid}`);
      } catch (docErr) {
        console.log(`ℹ️ Document dispatch notice: ${docErr.message}`);
      }
    }

    return true;
  } catch (err) {
    console.error(`❌ [WHATSAPP ERROR] Could not send to recruiter ${toPhone}: ${err.message}`);
    return false;
  }
}

// Notify candidate Rizwan Ullah on WhatsApp
async function notifyCandidateOnWhatsApp(whatsappClient, { title, company, channel, contactMethod }) {
  const alertText = `🎉 *AUTO-APPLICATION DISPATCHED!*\n\n💼 *Position:* ${title}\n🏢 *Company:* ${company || 'Tech Recruiter'}\n📡 *Channel:* ${channel.toUpperCase()}\n✉️ *Method:* ${contactMethod}\n🕒 *Time:* ${new Date().toLocaleTimeString()}\n\n_RizAgent is continuing to hunt 24/7 across WhatsApp, LinkedIn, Facebook & Instagram!_`;

  if (whatsappClient) {
    try {
      await whatsappClient.sendMessage(CANDIDATE.whatsappJid, alertText);
    } catch (e) {}
  }

  // Also push to API webhook
  try {
    const webhookUrl = process.env.API_WEBHOOK_URL || 'https://backend-rose-two-72.vercel.app/api/webhooks/jobs';
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: `AUTO-APPLY: Dispatched application for ${title} at ${company || 'Tech Company'} via ${channel}. Method: ${contactMethod}`,
        text: `Applied to ${title} (${channel})`,
        channel: channel,
        groupName: `Auto-Apply: ${channel}`
      })
    }).catch(() => null);
  } catch (e) {}
}

// Universal apply coordinator
async function executeUniversalApply({
  title,
  company = 'Tech Company',
  description = '',
  recruiterEmail = null,
  recruiterPhone = null,
  applyUrl = null,
  channel = 'web',
  whatsappClient = null
}) {
  console.log(`\n======================================================`);
  console.log(`🎯 EXECUTING UNIVERSAL AUTO-APPLY`);
  console.log(`   Job: "${title}" at "${company}"`);
  console.log(`   Source Channel: [${channel.toUpperCase()}]`);
  console.log(`   Recruiter Email: ${recruiterEmail || 'None'}`);
  console.log(`   Recruiter Phone: ${recruiterPhone || 'None'}`);
  console.log(`======================================================`);

  let appliedEmail = false;
  let appliedWhatsApp = false;

  // 1. Apply via Email if recruiter email discovered
  if (recruiterEmail && recruiterEmail.includes('@') && !recruiterEmail.includes('example.com')) {
    appliedEmail = await sendApplicationEmail({
      toEmail: recruiterEmail,
      title,
      company,
      description,
      sourceUrl: applyUrl
    });
  }

  // 2. Apply via WhatsApp if recruiter phone discovered
  if (recruiterPhone && whatsappClient) {
    appliedWhatsApp = await sendApplicationWhatsApp(whatsappClient, {
      toPhone: recruiterPhone,
      title,
      company,
      description
    });
  }

  // 3. If applied via any direct channel, notify Rizwan
  if (appliedEmail || appliedWhatsApp) {
    const methods = [];
    if (appliedEmail) methods.push(`Email (${recruiterEmail})`);
    if (appliedWhatsApp) methods.push(`WhatsApp (${recruiterPhone})`);

    console.log(`🚀 [APPLICATION COMPLETE] Applied for ${title} via ${methods.join(' & ')}`);
    await notifyCandidateOnWhatsApp(whatsappClient, {
      title,
      company,
      channel,
      contactMethod: methods.join(' & ')
    });
    return true;
  } else {
    console.log(`ℹ️ No direct email or WhatsApp found for "${title}". Logged to dashboard for review.`);
    return false;
  }
}

module.exports = {
  CANDIDATE,
  craftApplicationPitch,
  sendApplicationEmail,
  sendApplicationWhatsApp,
  notifyCandidateOnWhatsApp,
  executeUniversalApply
};
