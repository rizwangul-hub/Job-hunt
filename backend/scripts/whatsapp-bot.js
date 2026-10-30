const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('======================================================');
console.log('🤖 INITIALIZING RIZAGENT WHATSAPP AUTO-HUNTER BOT');
console.log('======================================================');

// Setup Direct SMTP Transporter for instant email dispatch
let mailTransporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// Find CV file
function findCV() {
  const cvDir = path.join(__dirname, '../uploads/cvs');
  if (fs.existsSync(cvDir)) {
    const files = fs.readdirSync(cvDir).filter(f => f.endsWith('.pdf'));
    if (files.length > 0) {
      return path.join(cvDir, files[0]);
    }
  }
  const rootCv = path.join(__dirname, '../uploads/Resume.pdf');
  if (fs.existsSync(rootCv)) return rootCv;
  return null;
}

const cvPath = findCV();
if (cvPath) {
  console.log(`📄 Candidate CV Found: ${path.basename(cvPath)}`);
} else {
  console.log('⚠️ No CV file found in uploads. Will send Portfolio & Pitch.');
}

console.log('⏳ Starting Chromium browser and connecting to WhatsApp Web...');
console.log('⏳ Please wait ~5-10 seconds for the QR code to appear...\n');

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: path.join(__dirname, '../.wwebjs_auth')
  }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (puppeteer.executablePath ? puppeteer.executablePath() : undefined),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

let currentQrDataUrl = null;
let botStatus = 'Initializing WhatsApp Web...';
let isOnline = false;

client.on('loading_screen', (percent, message) => {
  botStatus = `Loading WhatsApp Web: ${percent}% - ${message}`;
  console.log(`⏳ Loading WhatsApp Web: ${percent}% - ${message}`);
});

client.on('qr', async (qr) => {
  try {
    currentQrDataUrl = await QRCode.toDataURL(qr, { scale: 8, margin: 2 });
    botStatus = 'Scan QR code with your phone';
  } catch (e) {}

  console.log('\n================================================================');
  console.log('📱 SCAN THIS QR CODE WITH YOUR WHATSAPP TO LINK AUTO-HUNTER:');
  console.log('   1. Open WhatsApp on your phone');
  console.log('   2. Tap Settings (or 3 dots) > Linked Devices');
  console.log('   3. Tap "Link a Device" and point your camera at this QR code:');
  console.log('================================================================\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  botStatus = 'Authenticated! WhatsApp session saved.';
  currentQrDataUrl = null;
  console.log('🔐 Authentication successful! WhatsApp session saved.');
});

client.on('auth_failure', (msg) => {
  console.error('❌ WhatsApp authentication failed:', msg);
});

client.on('ready', () => {
  isOnline = true;
  currentQrDataUrl = null;
  botStatus = 'Online and watching groups & channels in real time 24/7';
  console.log('\n======================================================');
  console.log('✅ RIZAGENT WHATSAPP AUTO-HUNTER IS ONLINE AND ACTIVE!');
  console.log('👀 Listening to all your WhatsApp groups & channels in real time...');
  console.log('📢 Auto-monitoring subscribed WhatsApp Channels (Newsletters)...');
  console.log('🎯 Target: Web Development | Full-Stack | Python | C++ | AI | Data Entry');
  console.log('📧 Recruiter with Email -> Auto-emails CV & Tailored Cover Letter');
  console.log('💬 Recruiter with Phone -> Auto-messages WhatsApp Pitch & CV Document');
  console.log('======================================================\n');

  // Periodic WhatsApp Active Group & Channel Catch-Up Scanner (every 45 seconds)
  async function scanActiveGroups() {
    try {
      if (!client.pupPage || client.pupPage.isClosed()) return;
      const isStoreReady = await client.pupPage.evaluate(() => {
        return Boolean(window.Store && window.Store.Chat && typeof window.Store.Chat.getModelsArray === 'function');
      }).catch(() => false);
      if (!isStoreReady) return;

      const chats = await client.getChats();
      let scannedCount = 0;
      for (const c of chats) {
        const isGrp = c.isGroup || (c.id && c.id.server === 'newsletter') || (c.id && c.id._serialized && c.id._serialized.includes('@g.us'));
        if (isGrp) {
          scannedCount++;
          try {
            const msgs = await c.fetchMessages({ limit: 12 });
            for (const rm of msgs) {
              if (rm && (rm.body || rm.caption)) {
                await processIncomingMessage(rm, c);
              }
            }
          } catch (mErr) {}
        }
      }
      if (scannedCount > 0) {
        console.log(`✅ Checked ${scannedCount} active groups & channels for jobs.`);
      }
    } catch (chErr) {
      console.log('Group catch-up notice:', chErr.message);
    }
  }

  // Scan 10 seconds after connecting to let chat store settle
  setTimeout(scanActiveGroups, 10000);
  // Re-check groups every 45s so no job in any group is ever missed
  setInterval(scanActiveGroups, 45000);

  // FEATURE 5: Automated 3-Day Polite Follow-Up Routine (Checks every 2 hours)
  setInterval(async () => {
    try {
      if (!isOnline) return;
      const apiUrl = (process.env.API_WEBHOOK_URL || 'https://backend-rose-two-72.vercel.app/api/webhooks/jobs').replace('/api/webhooks/jobs', '/api/jobs/follow-ups');
      await fetch(apiUrl, { method: 'POST' }).catch(() => null);
    } catch (fErr) {}
  }, 2 * 60 * 60 * 1000);

  // FEATURE 4: Remote Developer Web Feed Ingestion (Every 30 minutes)
  setInterval(async () => {
    try {
      if (!isOnline) return;
      const feedRes = await fetch('https://remoteok.com/api').catch(() => null);
      if (feedRes && feedRes.ok) {
        const jobs = await feedRes.json();
        const topJobs = (jobs || []).slice(1, 4);
        for (const rj of topJobs) {
          if (rj && rj.position && (rj.url || rj.apply_url)) {
            const feedPost = `HIRING: ${rj.position}\nCompany: ${rj.company || 'Remote Tech'}\nStack: ${(rj.tags || []).join(', ')}\nApply URL: ${rj.apply_url || rj.url}`;
            const apiTarget = process.env.API_WEBHOOK_URL || 'https://backend-rose-two-72.vercel.app/api/webhooks/jobs';
            await fetch(apiTarget, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                rawText: feedPost,
                text: feedPost,
                content: feedPost,
                channel: 'rss',
                groupName: 'Remote Developer Feed'
              })
            }).catch(() => null);
          }
        }
      }
    } catch (feedErr) {}
  }, 30 * 60 * 1000);

  // FEATURE 6: Autonomous LinkedIn Public Radar (Runs 2 mins after WhatsApp ready, then every 35 mins)
  setTimeout(() => {
    try {
      const { scanLinkedInPublicJobs } = require('./linkedin-radar');
      scanLinkedInPublicJobs().catch(() => null);
    } catch (rErr) {}
  }, 120000);

  setInterval(async () => {
    try {
      if (!isOnline) return;
      const { scanLinkedInPublicJobs } = require('./linkedin-radar');
      await scanLinkedInPublicJobs().catch(() => null);
    } catch (rErr) {}
  }, 35 * 60 * 1000);
});

// Start lightweight web UI for scanning QR code directly in the browser
const webPort = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  if (isOnline) {
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>RizAgent WhatsApp Bot</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { background: #0b0f19; color: #fff; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
            .card { background: #131b2e; border: 1px solid #10b981; border-radius: 16px; padding: 32px; max-width: 420px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h1 { color: #10b981; font-size: 22px; margin-bottom: 8px; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
            .badge { display: inline-block; background: rgba(16,185,129,0.15); color: #34d399; padding: 4px 12px; border-radius: 999px; font-weight: bold; font-size: 12px; border: 1px solid rgba(16,185,129,0.3); }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">🟢 24/7 CLOUD ACTIVE</span>
            <h1>RizAgent WhatsApp Auto-Hunter</h1>
            <p>Your bot is <strong>connected to WhatsApp</strong> and actively monitoring your job groups in real time!</p>
            <p style="font-size: 12px; color: #64748b;">Target: MERN Stack | React | Node.js | React Native</p>
          </div>
        </body>
      </html>
    `);
  } else if (currentQrDataUrl) {
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Scan WhatsApp QR Code</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta http-equiv="refresh" content="6">
          <style>
            body { background: #0b0f19; color: #fff; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 20px; }
            .card { background: #131b2e; border: 1px solid #334155; border-radius: 16px; padding: 28px; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h2 { font-size: 20px; margin-top: 0; color: #f8fafc; }
            p { color: #94a3b8; font-size: 13px; line-height: 1.5; }
            img { width: 260px; height: 260px; border: 8px solid #ffffff; border-radius: 12px; margin: 15px 0; }
            .step { background: #1e293b; padding: 10px; border-radius: 8px; font-size: 12px; color: #cbd5e1; text-align: left; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>📱 Link WhatsApp Auto-Hunter</h2>
            <div class="step">1. Open WhatsApp on your phone</div>
            <div class="step">2. Tap <strong>Settings</strong> &gt; <strong>Linked Devices</strong></div>
            <div class="step">3. Tap <strong>Link a Device</strong> &amp; point camera below:</div>
            <img src="${currentQrDataUrl}" alt="WhatsApp QR Code" />
            <p>⏳ This QR code updates automatically. Scan it now!</p>
          </div>
        </body>
      </html>
    `);
  } else {
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Starting WhatsApp...</title>
          <meta http-equiv="refresh" content="4">
          <style>
            body { background: #0b0f19; color: #fff; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
            h2 { color: #38bdf8; }
            p { color: #94a3b8; }
          </style>
        </head>
        <body>
          <h2>⏳ ${botStatus}</h2>
          <p>Please wait a few seconds. The page will refresh automatically...</p>
        </body>
      </html>
    `);
  }
});

server.listen(webPort, () => {
  console.log(`🌐 Web interface active on port ${webPort} for instant browser QR code scanning`);
});

// Avoid processing identical messages repeatedly
const processedMessageHashes = new Set();

async function processIncomingMessage(msg, preloadedChat = null) {
  try {
    const text = msg.body || msg.caption || '';
    if (!text || text.trim().length < 4) return;

    // Avoid reacting to bot's own outreach pitches or alerts
    const isBotPitch = 
      text.includes('Salam! I saw your post') || 
      text.includes('rizwangul-hub') || 
      text.includes('rizwanullah.dev') ||
      text.includes('[AUTONOMOUS') ||
      text.includes('[ALERT');
    if (isBotPitch) return;

    let groupName = 'Direct Chat';
    let isChannel = false;
    let chat = preloadedChat;
    if (!chat) {
      try {
        chat = await msg.getChat();
      } catch (e) {}
    }
    if (chat) {
      isChannel = (chat.id && chat.id.server === 'newsletter') || chat.isChannel || false;
      groupName = chat.name || (isChannel ? 'WhatsApp Channel' : (chat.isGroup ? 'WhatsApp Group' : 'Direct Chat'));
    }

    const fromStr = (msg.from || '') + ' ' + (msg.to || '');
    if (fromStr.includes('@g.us') && groupName === 'Direct Chat') {
      groupName = 'WhatsApp Group';
    } else if (fromStr.includes('@newsletter') && groupName === 'Direct Chat') {
      groupName = 'WhatsApp Channel';
    }

    // Print live chat activity so you can see messages being processed
    console.log(`[💬 Seen in "${groupName}"]: "${text.substring(0, 60).replace(/\n/g, ' ')}..."`);

    // Check if this is an incoming recruiter response in a direct chat
    const isGroupOrChannel = (chat && (chat.isGroup || isChannel)) || fromStr.includes('@g.us') || fromStr.includes('@newsletter');
    const isDirectChat = !isGroupOrChannel && !msg.fromMe;
    const candidateAlertPhone = (process.env.CANDIDATE_WHATSAPP || '923255984244').replace(/[^\d]/g, '');
    const calendly = process.env.CANDIDATE_CALENDLY || 'https://calendly.com/rizwangul-dev';
    const candidateName = process.env.CANDIDATE_NAME || 'Rizwan Ullah';
    const portfolio = process.env.CANDIDATE_PORTFOLIO || 'https://full-stack-portfolio-coral.vercel.app';
    const github = process.env.CANDIDATE_GITHUB || 'https://github.com/rizwangul-hub';
    const linkedin = process.env.CANDIDATE_LINKEDIN || 'https://www.linkedin.com/in/rizwanmerndev';

    // FEATURE 2: AI RECRUITER AUTO-RESPONDER
    if (isDirectChat) {
      const senderNumber = (msg.from || '').replace(/[^\d]/g, '');
      const isCandidateSelf = senderNumber.includes(candidateAlertPhone) || candidateAlertPhone.includes(senderNumber);

      // Check if message looks like a recruiter inquiry rather than a broadcast
      const lowerMsg = text.toLowerCase();
      const isRecruiterInquiry = 
        lowerMsg.includes('salary') || 
        lowerMsg.includes('expectation') || 
        lowerMsg.includes('rate') || 
        lowerMsg.includes('budget') || 
        lowerMsg.includes('interview') || 
        lowerMsg.includes('available') || 
        lowerMsg.includes('call') || 
        lowerMsg.includes('meet') || 
        lowerMsg.includes('experience') ||
        lowerMsg.includes('resume') ||
        lowerMsg.includes('portfolio') ||
        lowerMsg.includes('when can you') ||
        lowerMsg.includes('share your');

      if (!isCandidateSelf && isRecruiterInquiry && text.trim().length >= 4) {
        console.log(`\n💬 [INBOUND RECRUITER MESSAGE] From +${senderNumber}: "${text}"`);
        let autoReply = '';

        if (lowerMsg.includes('salary') || lowerMsg.includes('expectation') || lowerMsg.includes('rate') || lowerMsg.includes('budget')) {
          autoReply = `Salam! Thank you for inquiring. My compensation expectations are competitive and aligned with the role scope and market standard. I am flexible for the right opportunity.\n\nWhen would be a good time for a brief 15-minute intro chat? You can also pick a convenient time directly on my calendar:\n📅 ${calendly}\n\nBest regards,\n${candidateName}`;
        } else if (lowerMsg.includes('interview') || lowerMsg.includes('available') || lowerMsg.includes('call') || lowerMsg.includes('meet')) {
          autoReply = `Salam! Yes, I am available for an interview call. You can select any time slot that works best for you directly on my calendar:\n📅 ${calendly}\n\nOr let me know what day and time works best for your team (Google Meet / Zoom / WhatsApp). Looking forward to speaking!\n\nBest regards,\n${candidateName}`;
        } else {
          autoReply = `Salam! Thank you for reaching out regarding the position. I am very interested and available immediately to discuss how I can contribute to your team.\n\nKey Links:\n- 🌐 Portfolio: ${portfolio}\n- 💻 GitHub: ${github}\n- 💼 LinkedIn: ${linkedin}\n- 📅 Schedule Intro: ${calendly}\n\nLooking forward to speaking!\n\nBest regards,\n${candidateName}`;
        }

        try {
          await chat.sendMessage(autoReply);
          console.log(`🤖 [AI AUTO-REPLY SENT] Answered recruiter (+${senderNumber}) with interview availability & Calendly!`);

          // FEATURE 1: Send instant alert to candidate's personal phone
          if (candidateAlertPhone) {
            const recruiterAlert = `🚨 *[RECRUITER REPLIED TO YOU!]*\n\n` +
              `👤 *From Recruiter:* +${senderNumber}\n` +
              `💬 *Recruiter Said:* "${text}"\n` +
              `🤖 *Bot Auto-Replied:* Yes (Shared interview availability & Calendly link)\n\n` +
              `📱 Open WhatsApp to continue chatting with them!`;
            await client.sendMessage(`${candidateAlertPhone}@c.us`, recruiterAlert);
          }
        } catch (repErr) {
          console.log(`ℹ️ Auto-reply notice: ${repErr.message}`);
        }
        return;
      }
    }

    // Check if post looks like a job or hiring post
    const lower = text.toLowerCase();
    const isHiring = 
      lower.includes('hiring') || 
      lower.includes('job') || 
      lower.includes('developer') || 
      lower.includes('looking for') || 
      lower.includes('vacancy') || 
      lower.includes('intern') || 
      lower.includes('remote') || 
      lower.includes('mern') || 
      lower.includes('react') || 
      lower.includes('node') || 
      lower.includes('web develop') ||
      lower.includes('opportunity') ||
      lower.includes('dev') ||
      lower.includes('engineer') ||
      lower.includes('programmer') ||
      lower.includes('software') ||
      lower.includes('python') ||
      lower.includes('c++') ||
      lower.includes('cpp') ||
      lower.includes('ai') ||
      lower.includes('machine learning') ||
      lower.includes('data entry') ||
      lower.includes('computer operator') ||
      lower.includes('office') ||
      lower.includes('assistant') ||
      lower.includes('clerk') ||
      lower.includes('typing') ||
      lower.includes('bachelor') ||
      lower.includes('graduate') ||
      lower.includes('education') ||
      lower.includes('cv') ||
      lower.includes('resume') ||
      lower.includes('frontend') ||
      lower.includes('backend') ||
      lower.includes('fullstack') ||
      lower.includes('full stack') ||
      lower.includes('walk in') ||
      lower.includes('apply');

    if (!isHiring) return;

    // Simple hash to avoid spamming the same forward (allows re-testing)
    const hash = text.substring(0, 50).toLowerCase();
    const isTest = lower.includes('test');
    if (processedMessageHashes.has(hash) && !isTest) {
      console.log(`ℹ️ [Skipped Duplicate] This job was already processed recently.`);
      return;
    }
    processedMessageHashes.add(hash);
    if (processedMessageHashes.size > 2000) processedMessageHashes.clear();

    console.log(`\n======================================================`);
    console.log(`[🎯 JOB POST IDENTIFIED] In "${groupName}"`);
    console.log(`Snippet: "${text.substring(0, 140).replace(/\n/g, ' ')}..."`);

    // Ingest into RizAgent
    const apiUrl = process.env.API_WEBHOOK_URL || 'https://backend-rose-two-72.vercel.app/api/webhooks/jobs';
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: text,
        text: text,
        content: text,
        channel: 'whatsapp',
        groupName: groupName
      })
    });

    const data = await res.json();
    if (!data.success) {
      console.log(`ℹ️ [Notice] ${data.message || 'Job ignored or duplicate'}`);
      console.log(`------------------------------------------------------\n`);
      return;
    }

    const job = data.job || {};
    const score = data.matchScore || job.matchScore || 0;
    const title = job.title || 'Professional Role';
    const company = job.company || 'Team';

    console.log(`🎯 Evaluated: "${title}" at "${company}"`);
    console.log(`📊 Profile Match Score: ${score}%`);

    // Tailor pitch based on category (Web Development 1-5+ yrs, Python/C++/AI, Data Entry / General)
    let pitch = '';
    const lowerRole = (title + ' ' + text).toLowerCase();

    if (
      lowerRole.includes('data entry') ||
      lowerRole.includes('computer operator') ||
      lowerRole.includes('office') ||
      lowerRole.includes('clerk') ||
      lowerRole.includes('typing') ||
      lowerRole.includes('assistant')
    ) {
      pitch = `Salam! I saw your post regarding the ${title} position.

I am writing to express my strong interest in this opportunity. I have comprehensive computer proficiency, fast and accurate typing skills, practical experience managing data with MS Office & Excel, and a dedicated, detail-oriented work ethic.

Professional Profiles & Demos:
- 🌐 Portfolio: ${portfolio}
- 💼 LinkedIn: ${linkedin}
- 💻 GitHub: ${github}
- 📅 Schedule Intro Call: ${calendly}

I have attached my CV below for your review. I am available immediately and look forward to discussing how I can assist your team!

Best regards,
${candidateName}
Email: rizwangul535@gmail.com`;
    } else if (
      lowerRole.includes('python') ||
      lowerRole.includes('c++') ||
      lowerRole.includes('cpp') ||
      lowerRole.includes('ai') ||
      lowerRole.includes('machine learning')
    ) {
      pitch = `Salam! I saw your post regarding the ${title} position.

I am a Software & Web Developer with strong algorithmic problem-solving abilities and practical experience in software development, REST APIs, and modern engineering practices.

Professional Profiles & Demos:
- 🌐 Portfolio: ${portfolio}
- 💼 LinkedIn: ${linkedin}
- 💻 GitHub: ${github}
- 📅 Schedule Intro Call: ${calendly}

I have attached my resume below for your review. Looking forward to discussing how I can contribute immediately!

Best regards,
${candidateName}
Email: rizwangul535@gmail.com`;
    } else {
      // Web Development (1 to 5+ years, Full-Stack, MERN, React, Node, Frontend, Backend)
      pitch = `Salam! I saw your post regarding the ${title} position.

I am a Full-Stack MERN & Web Developer with hands-on production experience designing, building, and deploying responsive web and software solutions using MongoDB, Express.js, React.js, Node.js, and modern REST APIs.

Professional Profiles & Demos:
- 🌐 Portfolio: ${portfolio}
- 💼 LinkedIn: ${linkedin}
- 💻 GitHub: ${github}
- 📅 Schedule Intro Call: ${calendly}

I have attached my resume below for your review. Looking forward to discussing how I can add immediate value to your team!

Best regards,
${candidateName}
Email: rizwangul535@gmail.com`;
    }

    // 1. AUTO-EMAIL DISPATCH (Local SMTP fallback guarantees delivery with local CV)
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
    let targetEmail = data.recipientEmail || (emailMatch ? emailMatch[0] : null);
    if (targetEmail) {
      targetEmail = targetEmail.replace(/[.,;:)]+$/, '').trim().toLowerCase();
    }

    if (targetEmail && !targetEmail.includes('example.com') && !targetEmail.includes('w3.org')) {
      if (mailTransporter) {
        try {
          await mailTransporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: targetEmail,
            subject: `Application for ${title} — ${candidateName}`,
            text: pitch,
            attachments: cvPath && fs.existsSync(cvPath) 
              ? [{ filename: `${candidateName} - Full Stack Developer CV.pdf`, path: cvPath }] 
              : []
          });
          console.log(`📧 [EMAIL SENT] Application & CV PDF emailed successfully to recruiter: ${targetEmail}`);
          if (candidateAlertPhone) {
            try {
              const alertMsg = `🔔 *[AUTONOMOUS JOB APPLICATION SENT]*\n\n` +
                `🏢 *Company:* ${company}\n` +
                `💼 *Role:* ${title}\n` +
                `📊 *Match Score:* ${score}%\n` +
                `📩 *Channel:* Direct Email (${targetEmail})\n` +
                `📄 *CV:* Resume.pdf Attached\n` +
                `📅 *Interview Link:* ${calendly}\n` +
                `⏰ *Time:* ${new Date().toLocaleTimeString()}`;
              await client.sendMessage(`${candidateAlertPhone}@c.us`, alertMsg);
              console.log(`📱 [ALERT DELIVERED] Private notification sent to candidate WhatsApp (+${candidateAlertPhone})`);
            } catch (aErr) {}
          }
        } catch (mailErr) {
          console.log(`⚠️ Email dispatch notice: ${mailErr.message}`);
        }
      } else if (data.directDispatched) {
        console.log(`📧 [EMAIL SENT] CV (Resume.pdf) & cover letter emailed to: ${targetEmail}`);
      } else {
        console.log(`⚠️ Email skipped for ${targetEmail}: SMTP_USER or SMTP_PASS environment variable is missing in Railway Variables!`);
      }
    }

    // 2. AUTO-WHATSAPP OUTREACH DISPATCH
    function extractPhone(raw) {
      const patterns = [
        /(?:\+?92|0092)[\s.-]?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}/,
        /(?:\+?92|0092)[\s.-]?\d{3}[\s.-]?\d{7}/,
        /03\d{2}[\s.-]?\d{3}[\s.-]?\d{4}/,
        /03\d{9}/,
        /(?:\+?92|0092)3\d{9}/,
        /(?:whatsapp|contact|phone|call|wa\.me\/|tel:?)\s*[:=-]?\s*(\+?[\d\s.-]{10,16})/i,
        /\b(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/
      ];
      for (const p of patterns) {
        const m = raw.match(p);
        if (m) return m[1] || m[0];
      }
      return null;
    }

    const matchedPhone = extractPhone(text);
    const targetPhone = data.recipientPhone || job.contact || matchedPhone;

    if (targetPhone) {
      let cleanPhone = targetPhone.replace(/[^\d]/g, '');
      if (cleanPhone.startsWith('03') && cleanPhone.length === 11) {
        cleanPhone = '92' + cleanPhone.substring(1);
      }

      if (cleanPhone.length >= 10) {
        try {
          // Resolve number in WhatsApp store to prevent memoize id error
          let recipientId = `${cleanPhone}@c.us`;
          try {
            const contactDetails = await client.getNumberId(cleanPhone);
            if (contactDetails && contactDetails._serialized) {
              recipientId = contactDetails._serialized;
            }
          } catch (numErr) {}

          // Obtain Chat object so WhatsApp Web internal memoize store has the valid id
          let chat = null;
          try {
            chat = await client.getChatById(recipientId);
          } catch (cErr) {}

          if (chat) {
            await chat.sendMessage(pitch);
          } else {
            await client.sendMessage(recipientId, pitch);
          }
          console.log(`💬 [WHATSAPP OUTREACH] Pitch with Portfolio, GitHub & LinkedIn sent to recruiter (+${cleanPhone})!`);
          if (candidateAlertPhone) {
            try {
              const alertMsg = `🔔 *[AUTONOMOUS WHATSAPP APPLICATION SENT]*\n\n` +
                `🏢 *Company:* ${company}\n` +
                `💼 *Role:* ${title}\n` +
                `📊 *Match Score:* ${score}%\n` +
                `💬 *Channel:* WhatsApp Recruiter DM (+${cleanPhone})\n` +
                `📄 *CV:* Attached & Pitch Delivered\n` +
                `📅 *Interview Link:* ${calendly}\n` +
                `⏰ *Time:* ${new Date().toLocaleTimeString()}`;
              await client.sendMessage(`${candidateAlertPhone}@c.us`, alertMsg);
              console.log(`📱 [ALERT DELIVERED] Private notification sent to candidate WhatsApp (+${candidateAlertPhone})`);
            } catch (aErr) {}
          }

          // Send CV attachment with document flag and brief pause for chat creation
          if (cvPath && fs.existsSync(cvPath)) {
            // Give WhatsApp Web 2.5s to register newly created chat
            await new Promise(r => setTimeout(r, 2500));
            try {
              // Ensure chat is initialized in WhatsApp store
              try {
                if (client.pupPage) {
                  await client.pupPage.evaluate(async (id) => {
                    const c = await window.WWebJS.getChat(id, { getAsModel: true });
                    if (c && window.Store && window.Store.Cmd) {
                      window.Store.Cmd.openChatAt(c);
                    }
                  }, recipientId);
                }
              } catch (openErr) {}

              const media = MessageMedia.fromFilePath(cvPath);
              media.filename = `${candidateName} - Full Stack Developer CV.pdf`;
              
              if (chat) {
                await chat.sendMessage(media, { sendMediaAsDocument: true });
              } else {
                await client.sendMessage(recipientId, media, { sendMediaAsDocument: true });
              }
              console.log(`📎 [WHATSAPP CV] Resume PDF successfully delivered to recruiter!`);
            } catch (mediaErr) {
              console.log(`⚠️ CV document notice: ${mediaErr.message}`);
              // Fallback to sending media directly
              try {
                const mediaFallback = MessageMedia.fromFilePath(cvPath);
                await client.sendMessage(recipientId, mediaFallback);
                console.log(`📎 [WHATSAPP CV] Resume successfully delivered via direct media fallback!`);
              } catch (fallbackErr) {
                console.log(`ℹ️ Media fallback notice: ${fallbackErr.message}`);
              }
            }
          }
        } catch (sendErr) {
          console.log(`ℹ️ Recruiter WhatsApp direct notice: ${sendErr.message}`);
        }
      }
    }

    // 3. AUTO-APPLY TO CAREER LINKS & APPLICATION PAGES
    const urlMatches = text.match(/https?:\/\/[^\s"'<>]+/gi);
    if (urlMatches && urlMatches.length > 0) {
      const externalUrls = urlMatches.filter(u => {
        const l = u.toLowerCase();
        return !l.includes('full-stack-portfolio') && 
               !l.includes('rizwanmerndev') && 
               !l.includes('rizwangul-hub') &&
               !l.includes('wa.me') &&
               !l.includes('whatsapp.com') &&
               !l.includes('facebook.com') &&
               !l.includes('fb.com') &&
               !l.includes('instagram.com') &&
               !l.includes('twitter.com') &&
               !l.includes('x.com') &&
               !l.includes('youtube.com') &&
               !l.includes('linkedin.com/company') &&
               !l.includes('linkedin.com/in');
      });

      if (externalUrls.length > 0) {
        const targetApplyUrl = externalUrls[0].replace(/[),.]+$/, '');
        console.log(`🌐 [APPLICATION LINK FOUND]: ${targetApplyUrl}`);
        console.log(`🤖 [AUTO-APPLY] Opening career page in background browser to apply...`);

        (async () => {
          let b = null;
          try {
            b = await puppeteer.launch({
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
            });
            const p = await b.newPage();
            await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await p.goto(targetApplyUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

            const pageData = await p.evaluate(() => {
              const text = document.body ? document.body.innerText : '';
              const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
              const emails = text.match(emailRegex) || [];
              const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href.replace('mailto:', '').split('?')[0]);
              const allEmails = Array.from(new Set([...emails, ...mailtoLinks])).filter(e => !e.includes('example.com') && !e.includes('domain.com') && !e.includes('.png'));

              const hasForm = document.querySelector('form') !== null;
              const hasEmailInput = document.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]') !== null;
              const hasFileInput = document.querySelector('input[type="file"]') !== null;

              return {
                title: document.title,
                emails: allEmails,
                hasForm,
                hasEmailInput,
                hasFileInput
              };
            });

            console.log(`📄 Page Title: "${pageData.title}"`);

            // If a recruiter email was discovered on the application page:
            if (pageData.emails.length > 0 && mailTransporter) {
              const discoveredEmail = pageData.emails[0];
              console.log(`🎯 [RECRUITER EMAIL DISCOVERED ON PAGE]: ${discoveredEmail}`);
              try {
                await mailTransporter.sendMail({
                  from: process.env.SMTP_FROM || process.env.SMTP_USER,
                  to: discoveredEmail,
                  subject: `Application for ${title} — ${candidateName}`,
                  text: pitch,
                  attachments: cvPath && fs.existsSync(cvPath) 
                    ? [{ filename: `${candidateName} - Full Stack Developer CV.pdf`, path: cvPath }] 
                    : []
                });
                console.log(`📧 [AUTO-APPLY EMAIL SENT] Application with CV PDF emailed to discovered recruiter: ${discoveredEmail}`);
              } catch (mErr) {
                console.log(`⚠️ Email notice: ${mErr.message}`);
              }
            }

            // If an online application form is detected:
            if (pageData.hasForm && pageData.hasEmailInput) {
              console.log(`📝 [APPLICATION FORM DETECTED] Auto-filling profile and attaching CV...`);
              try {
                await p.evaluate(({ name, email, port, git, link }) => {
                  function setVal(sel, val) {
                    const el = document.querySelector(sel);
                    if (el) {
                      el.value = val;
                      el.dispatchEvent(new Event('input', { bubbles: true }));
                      el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }
                  setVal('input[name*="name" i], input[id*="name" i], input[placeholder*="name" i]', name);
                  setVal('input[type="email"], input[name*="email" i], input[id*="email" i]', email);
                  setVal('input[type="tel"], input[name*="phone" i], input[id*="phone" i]', '03179500901');
                  setVal('input[name*="portfolio" i], input[id*="portfolio" i]', port);
                  setVal('input[name*="github" i], input[id*="github" i]', git);
                  setVal('input[name*="linkedin" i], input[id*="linkedin" i]', link);
                }, {
                  name: candidateName,
                  email: process.env.SMTP_USER || 'rizwangul535@gmail.com',
                  port: portfolio,
                  git: github,
                  link: linkedin
                });

                if (cvPath && fs.existsSync(cvPath) && pageData.hasFileInput) {
                  const fileInput = await p.$('input[type="file"]');
                  if (fileInput) {
                    await fileInput.uploadFile(cvPath);
                    console.log(`📎 [FORM CV UPLOADED] ${path.basename(cvPath)} attached!`);
                  }
                }

                const submitBtn = await p.$('button[type="submit"], input[type="submit"], button.submit, form button');
                if (submitBtn) {
                  await Promise.all([
                    p.waitForNavigation({ timeout: 10000 }).catch(() => {}),
                    submitBtn.click()
                  ]);
                  console.log(`🚀 [FORM SUBMITTED] Application successfully submitted on ${targetApplyUrl}!`);
                } else {
                  console.log(`✅ [FORM FILLED] All fields filled! Review at ${targetApplyUrl}`);
                }
              } catch (fErr) {
                console.log(`ℹ️ Form fill notice: ${fErr.message}`);
              }
            }

            await b.close();
          } catch (autoErr) {
            if (b) await b.close();
            console.log(`ℹ️ Auto-apply notice: ${autoErr.message}`);
          }
        })();
      }
    }

    console.log(`------------------------------------------------------\n`);
  } catch (err) {
    console.error('Error processing group message:', err.message);
  }
}

// Attach event listeners for real-time incoming messages
client.on('message', async (msg) => {
  await processIncomingMessage(msg);
});

client.on('message_create', async (msg) => {
  await processIncomingMessage(msg);
});

client.initialize();

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down WhatsApp bot cleanly...');
  try {
    await client.destroy();
  } catch (e) {}
  process.exit(0);
});

process.on('SIGTERM', async () => {
  try {
    await client.destroy();
  } catch (e) {}
  process.exit(0);
});
