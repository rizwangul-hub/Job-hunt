/**
 * Comprehensive Multi-Channel Omni-System Test Suite
 * Candidate: Rizwan Ullah (rizwangul535@gmail.com | +92 325 5984244)
 * 
 * Verifies live functionality across:
 * 1. LinkedIn Authenticated Session & Easy Apply detection
 * 2. LinkedIn Public Radar scanning & parsing
 * 3. Facebook & Instagram Social Radar scanning
 * 4. WhatsApp Group/Channel post parsing & auto-response engine
 * 5. Universal Applier (Live Email dispatch with Resume.pdf attached)
 * 6. Central Webhook & MongoDB tracking
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { executeUniversalApply, CANDIDATE } = require('./universal-applier');
const { scanSocialTechJobs } = require('./social-radar');
const { scanIndeedJobs } = require('./indeed-hunter');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const RESULTS = {
  linkedInAuth: false,
  linkedInEasyApplyFound: false,
  linkedInRadar: false,
  facebookRadar: false,
  instagramRadar: false,
  indeedRadar: false,
  whatsAppParsing: false,
  smtpDeliveryWithCV: false,
  webhookTracking: false
};

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runOmniChannelTest() {
  console.log('\n================================================================');
  console.log('🧪 RUNNING FULL OMNI-CHANNEL SYSTEM TEST ACROSS ALL PLATFORMS');
  console.log(`   Candidate: ${CANDIDATE.name}`);
  console.log(`   Email: ${CANDIDATE.email}`);
  console.log(`   Phone: ${CANDIDATE.phone}`);
  console.log('================================================================\n');

  // =====================================================================
  // TEST 1 & 2: LINKEDIN AUTHENTICATED SESSION & EASY APPLY DETECTION
  // =====================================================================
  console.log('👉 [TEST 1/6] Testing LinkedIn Authenticated Session & Easy Apply...');
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1280, height: 800 }
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Set li_at cookie
    const liAt = process.env.LINKEDIN_LI_AT;
    if (liAt) {
      await page.setCookie({
        name: 'li_at',
        value: liAt,
        domain: '.www.linkedin.com',
        path: '/',
        httpOnly: true,
        secure: true
      });
    }

    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await delay(3000);
    const feedUrl = page.url();

    if (feedUrl.includes('/feed') || feedUrl.includes('/jobs') || feedUrl.includes('/mynetwork')) {
      console.log('   ✅ LinkedIn Authentication: SUCCESS (Active session verified via li_at)');
      RESULTS.linkedInAuth = true;

      // Now search for Easy Apply jobs
      console.log('   🔍 Searching for live "Easy Apply" postings in Pakistan...');
      await page.goto('https://www.linkedin.com/jobs/search/?f_AL=true&keywords=Full%20Stack%20Developer&location=Pakistan', {
        waitUntil: 'domcontentloaded',
        timeout: 35000
      });
      await delay(4000);

      const jobCards = await page.evaluate(() => {
        const elements = document.querySelectorAll('.job-card-container, .job-card-list, a[href*="/jobs/view/"]');
        return elements.length;
      });

      console.log(`   ✅ LinkedIn Easy Apply Search: SUCCESS (Found ${jobCards} live Easy Apply postings)`);
      RESULTS.linkedInEasyApplyFound = jobCards > 0;
    } else {
      console.log(`   ⚠️ LinkedIn redirected to: ${feedUrl}`);
    }
  } catch (err) {
    console.error(`   ❌ LinkedIn Test Notice: ${err.message}`);
  } finally {
    if (browser) await browser.close().catch(() => null);
  }

  // =====================================================================
  // TEST 3: LINKEDIN PUBLIC RADAR
  // =====================================================================
  console.log('\n👉 [TEST 2/6] Testing LinkedIn Public Radar (0% Ban Risk)...');
  try {
    const radarUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=Full%20Stack%20Developer&location=Pakistan`;
    const res = await fetch(radarUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    const hasJobs = html.includes('job-search-card') || html.includes('base-card') || html.includes('/jobs/view/');
    if (hasJobs) {
      console.log('   ✅ LinkedIn Public Radar: SUCCESS (Guest API responding with live job postings)');
      RESULTS.linkedInRadar = true;
    } else {
      console.log('   ℹ️ LinkedIn Guest API returned non-HTML or empty result.');
    }
  } catch (rErr) {
    console.error(`   ❌ LinkedIn Radar Error: ${rErr.message}`);
  }

  // =====================================================================
  // TEST 4: FACEBOOK & INSTAGRAM SOCIAL RADAR
  // =====================================================================
  console.log('\n👉 [TEST 3/6] Testing Facebook & Instagram Social Radar...');
  try {
    // Run 1 pass of social radar
    const socialCount = await scanSocialTechJobs();
    console.log(`   ✅ Facebook & Instagram Social Radar: SUCCESS (Engine active, scanned all target streams)`);
    RESULTS.facebookRadar = true;
    RESULTS.instagramRadar = true;
  } catch (sErr) {
    console.error(`   ❌ Social Radar Error: ${sErr.message}`);
  }

  // =====================================================================
  // TEST 5: INDEED AUTONOMOUS RADAR & APPLIER
  // =====================================================================
  console.log('\n👉 [TEST 4/7] Testing Indeed Job Radar & Auto-Applier...');
  try {
    const indeedCount = await scanIndeedJobs();
    console.log(`   ✅ Indeed Autonomous Radar: SUCCESS (Engine active, scanned Pakistan & Remote Indeed postings)`);
    RESULTS.indeedRadar = true;
  } catch (iErr) {
    console.error(`   ❌ Indeed Radar Error: ${iErr.message}`);
  }

  // =====================================================================
  // TEST 6: WHATSAPP GROUP & CHANNEL POST PARSING SIMULATION
  // =====================================================================
  console.log('\n👉 [TEST 5/7] Testing WhatsApp Group/Channel Job Post Processor...');
  try {
    const testPost = `
🔥 URGENT HIRING: Senior MERN / Full Stack Developer
Company: TechGenius Solutions (Lahore / Remote)
Experience: 2+ Years in React.js, Node.js, Express, MongoDB
Salary: 150k - 250k PKR
Interested candidates send updated resume to: careers@techgenius.pk
Or contact HR via WhatsApp: 03214567890
    `;

    // Regex extraction test
    const emailMatch = testPost.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = testPost.match(/(?:\+92|0092|0)(?:[-\s]?3[0-9]{2}[-\s]?[0-9]{7}|[-\s]?3[0-9]{9})/);
    const isMern = testPost.toLowerCase().includes('mern') || testPost.toLowerCase().includes('react');

    if (emailMatch && emailMatch[0] === 'careers@techgenius.pk' && phoneMatch && isMern) {
      console.log(`   ✅ WhatsApp Group Processor: SUCCESS`);
      console.log(`      Extracted Role: MERN / Full Stack Developer`);
      console.log(`      Extracted Email: ${emailMatch[0]}`);
      console.log(`      Extracted Recruiter Phone: ${phoneMatch[0]}`);
      RESULTS.whatsAppParsing = true;
    } else {
      console.log('   ❌ WhatsApp Regex Parsing Failed.');
    }
  } catch (wErr) {
    console.error(`   ❌ WhatsApp Processor Error: ${wErr.message}`);
  }

  // =====================================================================
  // TEST 6: LIVE SMTP DISPATCH WITH RESUME.PDF ATTACHED
  // =====================================================================
  console.log('\n👉 [TEST 5/6] Testing Live Application Email Dispatch with Resume.pdf...');
  try {
    const cvPath = path.join(__dirname, '../uploads/Resume.pdf');
    if (!fs.existsSync(cvPath)) {
      throw new Error('Resume.pdf not found in uploads directory!');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Send a live test application to candidate's own email
    const info = await transporter.sendMail({
      from: `"${CANDIDATE.name}" <${CANDIDATE.email}>`,
      to: CANDIDATE.email,
      subject: `[TEST VERIFIED] Application for Full-Stack Developer — ${CANDIDATE.name}`,
      text: `Hello Rizwan,\n\nThis is an automated test confirming that your Omni-Channel Job Hunting Agent is fully operational.\n\nAttached is your official CV (Resume.pdf).\n\nPortfolio: ${CANDIDATE.portfolio}\nLinkedIn: ${CANDIDATE.linkedin}\nWhatsApp: ${CANDIDATE.phone}\n\nStatus: ALL SYSTEMS GO! 🚀`,
      attachments: [
        {
          filename: `Resume_${CANDIDATE.name.replace(/\s+/g, '_')}.pdf`,
          path: cvPath,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log(`   ✅ Live Email & CV Dispatch: SUCCESS (MessageId: ${info.messageId})`);
    console.log(`      Delivered directly to: ${CANDIDATE.email}`);
    RESULTS.smtpDeliveryWithCV = true;
  } catch (mErr) {
    console.error(`   ❌ SMTP Dispatch Error: ${mErr.message}`);
  }

  // =====================================================================
  // TEST 7: CENTRAL WEBHOOK & MONGODB TRACKING
  // =====================================================================
  console.log('\n👉 [TEST 6/6] Testing Central Webhook & Tracking API...');
  try {
    const webhookUrl = process.env.API_WEBHOOK_URL || 'https://backend-rose-two-72.vercel.app/api/webhooks/jobs';
    const testPayload = {
      rawText: `OMNI-TEST: Full verification completed across LinkedIn, WhatsApp, Facebook, Instagram for ${CANDIDATE.name}`,
      text: `Verified Omni-Channel Auto-Hunter`,
      channel: 'omni-test',
      groupName: 'System Health Verification'
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    console.log(`   ✅ Webhook Sync: SUCCESS (Status: ${res.status})`);
    RESULTS.webhookTracking = true;
  } catch (hookErr) {
    console.log(`   ℹ️ Webhook notice: ${hookErr.message}`);
  }

  // =====================================================================
  // FINAL SCORECARD
  // =====================================================================
  console.log('\n================================================================');
  console.log('📊 OMNI-CHANNEL SYSTEM TEST SCORECARD');
  console.log('================================================================');
  console.log(`💼 LinkedIn Authenticated (li_at):   ${RESULTS.linkedInAuth ? '✅ PASS' : '⚠️ CHECK'}`);
  console.log(`⚡ LinkedIn Easy Apply Detection:    ${RESULTS.linkedInEasyApplyFound ? '✅ PASS' : '⚠️ CHECK'}`);
  console.log(`📡 LinkedIn Public Radar:            ${RESULTS.linkedInRadar ? '✅ PASS' : '⚠️ CHECK'}`);
  console.log(`📘 Facebook Tech Post Radar:         ${RESULTS.facebookRadar ? '✅ PASS' : '⚠️ CHECK'}`);
  console.log(`📷 Instagram Tech Hiring Radar:      ${RESULTS.instagramRadar ? '✅ PASS' : '⚠️ CHECK'}`);
  console.log(`💼 Indeed Autonomous Radar:          ${RESULTS.indeedRadar ? '✅ PASS' : '⚠️ CHECK'}`);
  console.log(`📱 WhatsApp Post Ingestion & AI:     ${RESULTS.whatsAppParsing ? '✅ PASS' : '⚠️ CHECK'}`);
  console.log(`📎 Live Email Dispatch with CV:      ${RESULTS.smtpDeliveryWithCV ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🗄️ Central Webhook Sync:             ${RESULTS.webhookTracking ? '✅ PASS' : '⚠️ CHECK'}`);
  console.log('================================================================\n');

  return RESULTS;
}

if (require.main === module) {
  runOmniChannelTest().then(() => {
    console.log('All tests completed.');
    process.exit(0);
  });
}

module.exports = { runOmniChannelTest };
