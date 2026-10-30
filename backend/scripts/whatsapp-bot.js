const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('======================================================');
console.log('🤖 INITIALIZING RIZAGENT WHATSAPP AUTO-HUNTER BOT');
console.log('======================================================');

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

client.on('loading_screen', (percent, message) => {
  console.log(`⏳ Loading WhatsApp Web: ${percent}% - ${message}`);
});

client.on('qr', (qr) => {
  console.log('\n================================================================');
  console.log('📱 SCAN THIS QR CODE WITH YOUR WHATSAPP TO LINK AUTO-HUNTER:');
  console.log('   1. Open WhatsApp on your phone');
  console.log('   2. Tap Settings (or 3 dots) > Linked Devices');
  console.log('   3. Tap "Link a Device" and point your camera at this QR code:');
  console.log('================================================================\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('🔐 Authentication successful! WhatsApp session saved.');
});

client.on('auth_failure', (msg) => {
  console.error('❌ WhatsApp authentication failed:', msg);
});

client.on('ready', () => {
  console.log('\n======================================================');
  console.log('✅ RIZAGENT WHATSAPP AUTO-HUNTER IS ONLINE AND ACTIVE!');
  console.log('👀 Listening to all your WhatsApp groups in real time...');
  console.log('🎯 Automatic Target: MERN Stack | React | Node.js | React Native');
  console.log('📧 Recruiter with Email -> Auto-emails CV & Tailored Cover Letter');
  console.log('💬 Recruiter with Phone -> Auto-messages WhatsApp Pitch & CV');
  console.log('======================================================\n');
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
      lower.includes('opportunity') ||
      lower.includes('dev') ||
      lower.includes('engineer') ||
      lower.includes('cv') ||
      lower.includes('resume') ||
      lower.includes('frontend') ||
      lower.includes('backend') ||
      lower.includes('fullstack') ||
      lower.includes('full stack') ||
      lower.includes('walk in');

    if (!isHiring) return;

    // Simple hash to avoid spamming the same forward
    const hash = text.substring(0, 50).toLowerCase();
    if (processedMessageHashes.has(hash)) return;
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
    const title = job.title || 'Software Developer';
    const company = job.company || 'Tech Team';

    console.log(`🎯 Evaluated: "${title}" at "${company}"`);
    console.log(`📊 Profile Match Score: ${score}%`);

    // 1. AUTO-EMAIL DISPATCH CONFIRMATION
    if (data.directDispatched) {
      console.log(`📧 [EMAIL SENT] CV (Resume.pdf) & tailored cover letter emailed to: ${data.recipientEmail}`);
    }

    // 2. AUTO-WHATSAPP OUTREACH DISPATCH
    // Check if phone number exists in response or text
    const phoneMatch = text.match(/(?:\+92|03\d{2})[-.\s]?\d{7}|\b\d{10,12}\b/);
    const targetPhone = data.recipientPhone || job.contact || (phoneMatch ? phoneMatch[0] : null);

    if (score >= 80 && targetPhone) {
      let cleanPhone = targetPhone.replace(/[^\d]/g, '');
      if (cleanPhone.startsWith('03') && cleanPhone.length === 11) {
        cleanPhone = '92' + cleanPhone.substring(1);
      }

      if (cleanPhone.length >= 10) {
        const recipientId = `${cleanPhone}@c.us`;
        const candidateName = process.env.CANDIDATE_NAME || 'Rizwan Ullah';
        const portfolio = process.env.CANDIDATE_PORTFOLIO || 'https://rizwanullah.dev';
        const github = process.env.CANDIDATE_GITHUB || 'https://github.com/rizwangul-hub';
        const linkedin = process.env.CANDIDATE_LINKEDIN || 'https://linkedin.com/in/rizwanullah';

        const pitch = `Salam! I saw your post regarding the ${title} position.

I am a Full-Stack MERN & React Native Developer with hands-on production experience designing and building responsive web and mobile solutions using MongoDB, Express.js, React.js, Node.js, and Tailwind CSS.

Links & Demos:
- 🌐 Portfolio: ${portfolio}
- 💻 GitHub: ${github}
- 💼 LinkedIn: ${linkedin}

I have attached my resume below for your review. Looking forward to discussing how I can add immediate value to your team!

Best regards,
${candidateName} (RizMern)`;

        try {
          // Send pitch message
          await client.sendMessage(recipientId, pitch);
          console.log(`💬 [WHATSAPP OUTREACH] Tailored pitch with Portfolio & Links sent to recruiter (+${cleanPhone})!`);

          // Send CV attachment
          if (cvPath && fs.existsSync(cvPath)) {
            const media = MessageMedia.fromFilePath(cvPath);
            await client.sendMessage(recipientId, media, { caption: `${candidateName} - Full Stack Developer CV.pdf` });
            console.log(`📎 [WHATSAPP CV] Resume PDF successfully delivered to recruiter!`);
          }
        } catch (sendErr) {
          console.log(`ℹ️ Recruiter WhatsApp direct notice: ${sendErr.message}`);
        }
      }
    }

    console.log(`------------------------------------------------------\n`);
  } catch (err) {
    console.error('Error processing group message:', err.message);
  }
});

client.initialize();
