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
  github: process.env.CANDIDATE_GITHUB || 'https://github.com/rizwangul-hub'
};

// =====================================================================
// PERSISTENT DEDUPLICATION REGISTRY (Prevents sending multiple times to the same recruiter)
// =====================================================================
const REGISTRY_FILE = path.join(__dirname, '../.sent_recruiter_registry.json');
let sentRegistry = { emails: {}, phones: {} };

// STRICT NON-TECH EXCLUSIONS: Prevents RizAgent from ever applying to non-dev jobs
const NON_TECH_EXCLUSIONS = [
  'procurement', 'distribution', 'supply chain', 'logistics', 'warehouse',
  'store keeper', 'inventory', 'driver', 'rider', 'delivery', 'security guard',
  'guard', 'cook', 'chef', 'waiter', 'waitress', 'nurse', 'doctor', 'pharmacist',
  'medical', 'pharmacy', 'patient', 'clinic', 'sales executive', 'sales representative',
  'sales agent', 'sales manager', 'telesales', 'telemarketing', 'call center',
  'bpo agent', 'receptionist', 'front desk', 'cashier', 'accountant', 'accounts officer',
  'audit officer', 'finance officer', 'bookkeeper', 'tax consultant', 'legal',
  'lawyer', 'attorney', 'civil engineer', 'mechanical engineer', 'electrical technician',
  'electrician', 'plumber', 'mechanic', 'teacher', 'tutor', 'principal', 'professor',
  'lecturer', 'faculty', 'maid', 'cleaner', 'housekeeping', 'janitor', 'tailor',
  'beautician', 'salon', 'barber', 'general opportunity', 'urgent requirement',
  'people operations', 'hr coordinator', 'talent acquisition', 'recruiter', 'product manager',
  'operations coordinator', 'operations manager', 'administrative assistant', 'office assistant'
];

// MANDATORY TECH KEYWORDS: At least one must be matched
const TECH_KEYWORDS = [
  'developer', 'engineer', 'programmer', 'software', 'full stack', 'fullstack',
  'full-stack', 'mern', 'mean', 'react', 'reactjs', 'node', 'nodejs', 'frontend',
  'front-end', 'backend', 'back-end', 'web develop', 'web design', 'website',
  'web app', 'next.js', 'nextjs', 'vue', 'angular', 'javascript', 'typescript',
  'python', 'django', 'flask', 'fastapi', 'c++', 'cpp', 'mobile app', 'react native',
  'flutter', 'ai', 'machine learning', 'rest api', 'api', 'database', 'sql', 'mongodb',
  'devops', 'cloud', 'wordpress', 'shopify', 'landing page', 'coding', 'html', 'css'
];

function detectProjectIntent(combinedText = '') {
  const lower = combinedText.toLowerCase();
  const hasProjectTrigger = 
    lower.includes('project') || 
    lower.includes('freelance') || 
    lower.includes('client') || 
    lower.includes('gig') || 
    lower.includes('contract') || 
    lower.includes('need website') || 
    lower.includes('need a website') || 
    lower.includes('build website') || 
    lower.includes('create website') || 
    lower.includes('make website') || 
    lower.includes('need app') || 
    lower.includes('build app') || 
    lower.includes('need developer') || 
    lower.includes('custom website') || 
    lower.includes('landing page') ||
    lower.includes('ecommerce') ||
    lower.includes('shopify') ||
    lower.includes('wordpress');

  const hasTechDeliverable = 
    lower.includes('website') || 
    lower.includes('web') || 
    lower.includes('app') || 
    lower.includes('software') || 
    lower.includes('full stack') || 
    lower.includes('mern') || 
    lower.includes('react') || 
    lower.includes('node');

  const isFormalJobOnly = 
    lower.includes('salary:') || 
    lower.includes('stipend:') || 
    lower.includes('working hours:') || 
    lower.includes('employmenttype') || 
    lower.includes('schema.org');

  return (hasProjectTrigger && hasTechDeliverable) && !isFormalJobOnly;
}

function isRelevantTechJobOrProject(title = '', text = '', location = '') {
  const combined = (title + ' ' + text).toLowerCase();
  const lowerTitle = (title || '').toLowerCase().trim();

  // 1. Exclude if title contains explicit non-tech role
  for (const exclusion of NON_TECH_EXCLUSIONS) {
    if (lowerTitle.includes(exclusion)) {
      return { relevant: false, reason: `Excluded non-tech title keyword: "${exclusion}"` };
    }
  }

  // 2. Reject vague non-descriptive titles
  if (/^(general opportunity|urgent requirement|opportunity|vacancy|job opening|staff needed|hiring|walk in interview)$/i.test(lowerTitle)) {
    return { relevant: false, reason: `Vague non-tech title: "${title}"` };
  }

  // 3. Must match at least one verified tech keyword in title OR be an explicit freelance/client project
  const isFreelanceProject = detectProjectIntent(combined);
  const titleHasTech = TECH_KEYWORDS.some(kw => lowerTitle.includes(kw));
  if (!titleHasTech && !isFreelanceProject) {
    return { relevant: false, reason: `Title "${title}" is not a developer, engineering, or software role.` };
  }

  const hasTechMatch = TECH_KEYWORDS.some(kw => combined.includes(kw));
  if (!hasTechMatch && !isFreelanceProject) {
    return { relevant: false, reason: 'No software, web, or tech skills mentioned.' };
  }

  // 4. Location Check per User Rule:
  // "for the out of county see the remote work and for pakistan they apply for both remote or onsite"
  const isPakistan = 
    /pakistan|\bpk\b|karachi|lahore|islamabad|rawalpindi|peshawar|faisalabad|multan|sialkot|gujranwala|quetta|hyderabad|\+92|03\d{2}/i.test(combined) ||
    /pakistan|lahore|karachi|islamabad|rawalpindi/i.test(location);

  const hasOnsiteOnlyTrigger = /no remote|not remote|onsite only|on-site only|in-office only|must be located in|relocation required/i.test(combined);
  const isRemote = (!hasOnsiteOnlyTrigger) && (
    /remote|work from home|wfh|anywhere|worldwide|distributed|virtual/i.test(combined) || 
    /remote/i.test(location)
  );

  // If outside Pakistan and NOT remote -> Skip onsite overseas jobs
  const isExplicitInternational = /united states|usa|uk|united kingdom|london|new york|california|dubai|uae|canada|germany|berlin|australia|india/i.test(combined) || /london|new york|california|dubai|uae|uk|usa|canada/i.test(location);
  if (!isPakistan && isExplicitInternational && !isRemote) {
    return { relevant: false, reason: 'International job requires onsite presence (remote required for international).' };
  }

  return { 
    relevant: true, 
    isProject: detectProjectIntent(combined), 
    isPakistan, 
    isRemote 
  };
}

function loadRegistry() {
  if (fs.existsSync(REGISTRY_FILE)) {
    try {
      sentRegistry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
      if (!sentRegistry.emails) sentRegistry.emails = {};
      if (!sentRegistry.phones) sentRegistry.phones = {};
    } catch (e) {
      sentRegistry = { emails: {}, phones: {} };
    }
  }
}
loadRegistry();

function saveRegistry() {
  try {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(sentRegistry, null, 2));
  } catch (e) {}
}

function normalizeEmail(email) {
  if (!email) return '';
  return email.toLowerCase().replace(/^[<"'\s]+|[>"'\s.,;:]+$/g, '').trim();
}

function normalizePhone(phone) {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('03') && clean.length === 11) {
    clean = '92' + clean.substring(1);
  }
  return clean;
}

function isEmailAlreadyContacted(email) {
  const clean = normalizeEmail(email);
  if (!clean) return false;
  loadRegistry();
  return Boolean(sentRegistry.emails[clean]);
}

function isPhoneAlreadyContacted(phone) {
  const clean = normalizePhone(phone);
  if (!clean) return false;
  loadRegistry();
  return Boolean(sentRegistry.phones[clean]);
}

function recordEmailContacted(email, meta = {}) {
  const clean = normalizeEmail(email);
  if (!clean) return;
  loadRegistry();
  sentRegistry.emails[clean] = {
    contactedAt: new Date().toISOString(),
    ...meta
  };
  saveRegistry();
}

function recordPhoneContacted(phone, meta = {}) {
  const clean = normalizePhone(phone);
  if (!clean) return;
  loadRegistry();
  sentRegistry.phones[clean] = {
    contactedAt: new Date().toISOString(),
    ...meta
  };
  saveRegistry();
}

// ATOMIC RESERVATION: Checks and marks in one synchronous operation to prevent race conditions
function reserveEmailContact(email, meta = {}) {
  const clean = normalizeEmail(email);
  if (!clean) return false;
  loadRegistry();
  if (sentRegistry.emails[clean]) {
    return false; // Already contacted!
  }
  sentRegistry.emails[clean] = {
    contactedAt: new Date().toISOString(),
    ...meta
  };
  saveRegistry();
  return true;
}

function reservePhoneContact(phone, meta = {}) {
  const clean = normalizePhone(phone);
  if (!clean) return false;
  loadRegistry();
  if (sentRegistry.phones[clean]) {
    return false; // Already contacted!
  }
  sentRegistry.phones[clean] = {
    contactedAt: new Date().toISOString(),
    ...meta
  };
  saveRegistry();
  return true;
}

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

  const hasProjectIntent = 
    combined.includes('project') || 
    combined.includes('freelance') || 
    combined.includes('client') || 
    combined.includes('gig') || 
    combined.includes('contract') || 
    combined.includes('build') || 
    combined.includes('need') || 
    combined.includes('looking for someone') || 
    combined.includes('budget') ||
    combined.includes('custom website') ||
    combined.includes('landing page');

  const hasTechDeliverable = 
    combined.includes('website') || 
    combined.includes('web') || 
    combined.includes('app') || 
    combined.includes('software') || 
    combined.includes('full stack') || 
    combined.includes('mern') || 
    combined.includes('react') || 
    combined.includes('node');

  const isFormalJobOnly = 
    combined.includes('salary:') || 
    combined.includes('stipend:') || 
    combined.includes('working hours:') || 
    combined.includes('employmenttype') || 
    combined.includes('schema.org');

  const isProject = (hasProjectIntent && hasTechDeliverable) && !isFormalJobOnly;

  if (isProject) {
    return {
      subject: `Full-Stack Web & App Development Proposal — ${CANDIDATE.name}`,
      body: `Assalam-o-Alaikum / Hello,

I saw your requirement regarding your project / website development needs.

I am Rizwan Ullah, an experienced Full-Stack MERN & Software Developer. I can take complete ownership of your project and build a high-performance, beautifully designed, and fully responsive website or mobile application from concept to full launch.

Why Work With Me on Your Project:
✅ Pixel-perfect, responsive UI/UX (React.js, Next.js, Tailwind CSS)
✅ Robust, scalable backend & REST APIs (Node.js, Express, MongoDB, PostgreSQL)
✅ Full-stack integration, secure authentication & fast loading speed
✅ Fast delivery, clean code, and 100% committed post-delivery revisions

Portfolio & Live Production Work:
- 🌐 Online Portfolio: ${CANDIDATE.portfolio}
- 💼 LinkedIn Profile: ${CANDIDATE.linkedin}
- 💻 GitHub Repositories: ${CANDIDATE.github}
- 📞 Direct WhatsApp / Phone: ${CANDIDATE.phone}

My CV and technical profile are attached for your evaluation. I am available to start immediately — let’s connect on WhatsApp (+92 325 5984244) or reply to discuss your project requirements!

Best regards,
${CANDIDATE.name}
Full-Stack Web & Software Developer
Email: ${CANDIDATE.email}
Phone / WhatsApp: ${CANDIDATE.phone}`
    };
  } else if (
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
- 📞 Direct Phone / WhatsApp: ${CANDIDATE.phone}

My resume is attached for your detailed evaluation. I am available to start immediately and would love to connect for an introductory interview.

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
  if (!toEmail) return false;

  // RELEVANCE SHIELD: Ensure role matches candidate tech profile
  const relevance = isRelevantTechJobOrProject(title, description);
  if (!relevance.relevant) {
    console.log(`🚫 [RELEVANCE SHIELD]: Skipping non-tech / ineligible application for "${title}". Reason: ${relevance.reason}`);
    return false;
  }

  const cleanEmail = toEmail.toLowerCase().trim();

  // Guard against dummy, test, and placeholder domains
  if (
    cleanEmail.includes('fintechmobile.io') ||
    cleanEmail.includes('innovatex.io') ||
    cleanEmail.includes('innovate.pk') ||
    cleanEmail.includes('cloudgridsys.com') ||
    cleanEmail.includes('example.com') ||
    cleanEmail.includes('test.com') ||
    cleanEmail.includes('domain.com') ||
    cleanEmail.includes('sample.com')
  ) {
    console.log(`🛡️ [DUMMY DOMAIN SHIELD]: Skipping real email send to mock/dummy address: ${cleanEmail}`);
    return false;
  }

  // DEDUPLICATION CHECK: Never send multiple times to the same recruiter
  if (!reserveEmailContact(cleanEmail, { title, company, sourceUrl, channel: 'universal-applier' })) {
    console.log(`🛡️ [DEDUPLICATION SHIELD]: Recruiter email "${cleanEmail}" has ALREADY received an application before. Skipping to avoid duplicate email!`);
    return false;
  }

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
  if (!toPhone) return false;

  // RELEVANCE SHIELD: Ensure role matches candidate tech profile
  const relevance = isRelevantTechJobOrProject(title, description);
  if (!relevance.relevant) {
    console.log(`🚫 [RELEVANCE SHIELD]: Skipping non-tech / ineligible WhatsApp outreach for "${title}". Reason: ${relevance.reason}`);
    return false;
  }

  // DEDUPLICATION CHECK: Never send multiple times to the same recruiter phone
  if (!reservePhoneContact(toPhone, { title, company, channel: 'universal-applier-whatsapp' })) {
    console.log(`🛡️ [DEDUPLICATION SHIELD]: Recruiter phone "${toPhone}" has ALREADY received an application before. Skipping to avoid duplicate pitch!`);
    return false;
  }

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

    const isProj = (title + ' ' + description).toLowerCase().includes('project') ||
                   (title + ' ' + description).toLowerCase().includes('need website') ||
                   (title + ' ' + description).toLowerCase().includes('build') ||
                   (title + ' ' + description).toLowerCase().includes('freelance') ||
                   (title + ' ' + description).toLowerCase().includes('client');

    const shortPitch = isProj
      ? `Assalam-o-Alaikum! I saw your requirement regarding the *${title}* project.\n\nI am *${CANDIDATE.name}*, a Full-Stack MERN & Web Developer. I will build and deliver your website or application end-to-end with high quality and fast turnaround!\n\n🌐 *Portfolio:* ${CANDIDATE.portfolio}\n💻 *GitHub:* ${CANDIDATE.github}\n💼 *LinkedIn:* ${CANDIDATE.linkedin}\n📞 *WhatsApp:* ${CANDIDATE.phone}\n\nAttached is my CV & profile. I am ready to start immediately — let's discuss your project!`
      : `Assalam-o-Alaikum / Hello Hiring Team,\n\nI am writing to apply for the *${title}* opening${company ? ` at *${company}*` : ''}.\n\nI am a Full-Stack Developer experienced in React, Node.js, Next.js, and modern software development.\n\n🌐 *Portfolio:* ${CANDIDATE.portfolio}\n💼 *LinkedIn:* ${CANDIDATE.linkedin}\n💻 *GitHub:* ${CANDIDATE.github}\n📞 *WhatsApp:* ${CANDIDATE.phone}\n\nI have also attached my CV for your review. Looking forward to discussing this opportunity!\n\nBest regards,\n*${CANDIDATE.name}*\n${CANDIDATE.phone} | ${CANDIDATE.email}`;

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

    recordPhoneContacted(toPhone, { title, company });
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
  executeUniversalApply,
  isEmailAlreadyContacted,
  recordEmailContacted,
  reserveEmailContact,
  isPhoneAlreadyContacted,
  recordPhoneContacted,
  reservePhoneContact,
  normalizeEmail,
  normalizePhone,
  isRelevantTechJobOrProject,
  detectProjectIntent,
  NON_TECH_EXCLUSIONS,
  TECH_KEYWORDS
};
