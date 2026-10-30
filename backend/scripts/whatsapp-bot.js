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
    executablePath: puppeteer.executablePath ? puppeteer.executablePath() : undefined,
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
  botStatus = 'Online and watching groups in real time 24/7';
  console.log('\n======================================================');
  console.log('✅ RIZAGENT WHATSAPP AUTO-HUNTER IS ONLINE AND ACTIVE!');
  console.log('👀 Listening to all your WhatsApp groups in real time...');
  console.log('🎯 Automatic Target: MERN Stack | React | Node.js | React Native');
  console.log('📧 Recruiter with Email -> Auto-emails CV & Tailored Cover Letter');
  console.log('💬 Recruiter with Phone -> Auto-messages WhatsApp Pitch & CV');
  console.log('======================================================\n');
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

client.on('message_create', async (msg) => {
  try {
    const text = msg.body || '';
    if (!text || text.trim().length < 12) return;

    // Avoid reacting to bot's own outreach pitches
    const isBotPitch = 
      text.includes('Salam! I saw your post') || 
      text.includes('rizwangul-hub') || 
      text.includes('rizwanullah.dev');
    if (isBotPitch) return;

    let groupName = 'Direct Chat';
    try {
      const chat = await msg.getChat();
      groupName = chat.name || (chat.isGroup ? 'WhatsApp Group' : 'Direct Chat');
    } catch (e) {}

    // Print live chat activity so you can see messages being processed
    console.log(`[💬 Seen in "${groupName}"]: "${text.substring(0, 60).replace(/\n/g, ' ')}..."`);

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

    const candidateName = process.env.CANDIDATE_NAME || 'Rizwan Ullah';
    const portfolio = process.env.CANDIDATE_PORTFOLIO || 'https://full-stack-portfolio-coral.vercel.app';
    const github = process.env.CANDIDATE_GITHUB || 'https://github.com/rizwangul-hub';
    const linkedin = process.env.CANDIDATE_LINKEDIN || 'https://www.linkedin.com/in/rizwanmerndev';

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

Links & Portfolio:
- 🌐 Portfolio: ${portfolio}
- 💻 GitHub: ${github}
- 💼 LinkedIn: ${linkedin}

I have attached my resume below for your review. Looking forward to discussing how I can contribute immediately!

Best regards,
${candidateName}`;
    } else {
      // Web Development (1 to 5+ years, Full-Stack, MERN, React, Node, Frontend, Backend)
      pitch = `Salam! I saw your post regarding the ${title} position.

I am a Full-Stack MERN & Web Developer with hands-on production experience designing, building, and deploying responsive web and software solutions using MongoDB, Express.js, React.js, Node.js, and modern REST APIs.

Links & Demos:
- 🌐 Portfolio: ${portfolio}
- 💻 GitHub: ${github}
- 💼 LinkedIn: ${linkedin}

I have attached my resume below for your review. Looking forward to discussing how I can add immediate value to your team!

Best regards,
${candidateName}`;
    }

    // 1. AUTO-EMAIL DISPATCH (Local SMTP fallback guarantees delivery with local CV)
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
    const targetEmail = data.recipientEmail || (emailMatch ? emailMatch[0] : null);

    if (targetEmail) {
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
    const phoneMatch = text.match(/(?:\+92|03\d{2})[-.\s]?\d{7}|\b\d{10,12}\b/);
    const targetPhone = data.recipientPhone || job.contact || (phoneMatch ? phoneMatch[0] : null);

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

          // Send CV attachment with document flag and brief pause for chat creation
          if (cvPath && fs.existsSync(cvPath)) {
            await new Promise(r => setTimeout(r, 1500));
            try {
              const media = MessageMedia.fromFilePath(cvPath);
              media.filename = `${candidateName} - Full Stack Developer CV.pdf`;
              media.mimetype = 'application/pdf';
              
              if (chat) {
                await chat.sendMessage(media, { sendMediaAsDocument: true });
              } else {
                await client.sendMessage(recipientId, media, { sendMediaAsDocument: true });
              }
              console.log(`📎 [WHATSAPP CV] Resume PDF successfully delivered to recruiter!`);
            } catch (mediaErr) {
              console.log(`⚠️ CV attachment notice: ${mediaErr.message}`);
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
