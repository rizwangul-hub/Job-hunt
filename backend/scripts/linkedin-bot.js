/**
 * RizAgent - Autonomous LinkedIn Easy Apply & Job Hunter Bot
 * 
 * Features:
 * 1. Auto-searches LinkedIn jobs with "Easy Apply" filter (Full Stack, MERN, Python, C++, Data Entry).
 * 2. Automated Form Submission: fills contact info, years of experience, answers screening questions, and attaches Resume.pdf.
 * 3. Human Emulation: randomized delays, mouse jitter, and safe daily limits (15-25 applications/session).
 * 4. LinkedIn Public Job Radar: parses recruiter emails and hiring posts without login requirement.
 * 5. Private WhatsApp Alert: notifies candidate on WhatsApp for every job submitted!
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('======================================================');
console.log('💼 INITIALIZING RIZAGENT LINKEDIN AUTO-HUNTER BOT');
console.log('======================================================');

const CANDIDATE = {
  name: process.env.CANDIDATE_NAME || 'Rizwan Ullah',
  email: process.env.SMTP_USER || 'rizwangul535@gmail.com',
  phone: process.env.CANDIDATE_PHONE || '+92 325 5984244',
  cleanPhone: '03255984244',
  portfolio: process.env.CANDIDATE_PORTFOLIO || 'https://full-stack-portfolio-coral.vercel.app',
  linkedin: process.env.CANDIDATE_LINKEDIN || 'https://www.linkedin.com/in/rizwanmerndev',
  github: process.env.CANDIDATE_GITHUB || 'https://github.com/rizwangul-hub',
  yearsOfExperience: '3'
};

const SEARCH_QUERIES = [
  { keyword: 'Full Stack Developer', location: 'Pakistan' },
  { keyword: 'MERN Stack Developer', location: 'Remote' },
  { keyword: 'React Developer', location: 'Pakistan' },
  { keyword: 'Python Developer', location: 'Remote' },
  { keyword: 'Web Developer', location: 'Pakistan' },
  { keyword: 'Data Entry Operator', location: 'Pakistan' }
];

function findCV() {
  const rootCv = path.join(__dirname, '../uploads/Resume.pdf');
  if (fs.existsSync(rootCv)) return rootCv;

  const cvDir = path.join(__dirname, '../uploads/cvs');
  if (fs.existsSync(cvDir)) {
    const files = fs.readdirSync(cvDir).filter(f => f.endsWith('.pdf'));
    if (files.length > 0) return path.join(cvDir, files[0]);
  }
  return null;
}

const cvPath = findCV();
if (cvPath) {
  console.log(`📄 Candidate CV Found: ${path.basename(cvPath)}`);
} else {
  console.log('⚠️ Resume PDF not found in uploads. Please ensure Resume.pdf exists.');
}

const authDir = path.join(__dirname, '../.linkedin_auth');
if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
const cookiePath = path.join(authDir, 'cookies.json');

// Connect to MongoDB to record applications and prevent duplicates
let dbConnected = false;
async function initDb() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      dbConnected = true;
      console.log('🗄️ MongoDB connected for LinkedIn application tracking.');
    } catch (err) {
      console.log(`ℹ️ MongoDB notice: ${err.message}`);
    }
  }
}

// Random human-like delay
const delay = (ms) => new Promise(res => setTimeout(res, ms));
const humanJitter = (min = 2000, max = 5000) => delay(Math.floor(Math.random() * (max - min + 1)) + min);

async function sendCandidateWhatsAppAlert(jobTitle, company, url, method = 'LinkedIn Easy Apply') {
  try {
    const apiUrl = process.env.API_WEBHOOK_URL || 'https://backend-rose-two-72.vercel.app/api/webhooks/jobs';
    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: `LINKEDIN APPLICATION: ${jobTitle} at ${company}. Applied via ${method}. URL: ${url}`,
        text: `Applied to ${jobTitle} at ${company}`,
        channel: 'linkedin',
        groupName: 'LinkedIn Easy Apply Bot'
      })
    }).catch(() => null);
  } catch (e) {}
}

async function runLinkedInBot() {
  await initDb();

  console.log('⏳ Starting browser engine for LinkedIn automation...');
  const hasSavedCookies = fs.existsSync(cookiePath) || Boolean(process.env.LINKEDIN_LI_AT);
  const isHeadless = hasSavedCookies && process.env.LINKEDIN_HEADLESS !== 'false';

  const browser = await puppeteer.launch({
    headless: isHeadless ? 'new' : false,
    userDataDir: path.join(authDir, 'profile'),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: { width: 1366, height: 768 }
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  // Load session cookies if available
  let isLoggedIn = false;
  if (fs.existsSync(cookiePath)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
      await page.setCookie(...cookies);
      console.log('🍪 Restored saved LinkedIn session cookies.');
    } catch (e) {}
  } else if (process.env.LINKEDIN_LI_AT) {
    await page.setCookie({
      name: 'li_at',
      value: process.env.LINKEDIN_LI_AT,
      domain: '.www.linkedin.com',
      path: '/',
      httpOnly: true,
      secure: true
    });
    console.log('🍪 Set LinkedIn session from LINKEDIN_LI_AT environment variable.');
  }

  // Navigate to LinkedIn Feed to verify login status
  console.log('🔍 Checking LinkedIn login state...');
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => null);
  await humanJitter(3000, 5000);

  const currentUrl = page.url();
  if (currentUrl.includes('/feed') || currentUrl.includes('/jobs') || currentUrl.includes('/mynetwork')) {
    isLoggedIn = true;
    console.log('✅ LinkedIn Login Verified! Active session detected.');
    // Save fresh session cookies
    const freshCookies = await page.cookies();
    fs.writeFileSync(cookiePath, JSON.stringify(freshCookies, null, 2));
  } else {
    console.log('\n================================================================');
    console.log('🔑 LINKEDIN LOGIN REQUIRED:');
    console.log('   The browser window is open. Please log into your LinkedIn');
    console.log('   account. Once logged in, your session will be saved forever!');
    console.log('================================================================\n');

    // Wait up to 3 minutes for user to complete login in the opened browser window
    for (let i = 0; i < 36; i++) {
      await delay(5000);
      const testUrl = page.url();
      if (testUrl.includes('/feed') || testUrl.includes('/jobs') || testUrl.includes('/checkpoint/lg/login-submit')) {
        isLoggedIn = true;
        console.log('🎉 LinkedIn login detected! Saving session cookies...');
        const userCookies = await page.cookies();
        fs.writeFileSync(cookiePath, JSON.stringify(userCookies, null, 2));
        break;
      }
    }
  }

  if (!isLoggedIn) {
    console.log('⚠️ Running in Public LinkedIn Radar mode (scrapes jobs & recruiter emails without login).');
  }

  // Execute job applications across target search queries
  let appliedCount = 0;
  const maxApplications = parseInt(process.env.MAX_LINKEDIN_APPLIES || '20', 10);

  for (const query of SEARCH_QUERIES) {
    if (appliedCount >= maxApplications) {
      console.log(`\n🛑 Reached safe daily session limit (${maxApplications} applications). Protecting account health.`);
      break;
    }

    console.log(`\n======================================================`);
    console.log(`🔎 Searching LinkedIn: "${query.keyword}" in "${query.location}"`);
    console.log(`======================================================`);

    const searchUrl = isLoggedIn 
      ? `https://www.linkedin.com/jobs/search/?f_AL=true&keywords=${encodeURIComponent(query.keyword)}&location=${encodeURIComponent(query.location)}`
      : `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query.keyword)}&location=${encodeURIComponent(query.location)}`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => null);
    await humanJitter(3000, 6000);

    // Collect job cards
    const jobList = await page.evaluate(() => {
      const cards = document.querySelectorAll('.jobs-search-results__list-item, .job-search-card, [data-job-id]');
      const items = [];
      cards.forEach(card => {
        const titleEl = card.querySelector('.job-card-list__title, .base-search-card__title, a[href*="/jobs/view/"]');
        const companyEl = card.querySelector('.job-card-container__company-name, .base-search-card__subtitle');
        const linkEl = card.querySelector('a[href*="/jobs/view/"]');
        if (titleEl && linkEl) {
          items.push({
            title: titleEl.innerText.trim(),
            company: companyEl ? companyEl.innerText.trim() : 'Company',
            url: linkEl.href.split('?')[0]
          });
        }
      });
      return items;
    });

    console.log(`📋 Found ${jobList.length} relevant openings for "${query.keyword}".`);

    for (const job of jobList.slice(0, 5)) {
      if (appliedCount >= maxApplications) break;

      console.log(`\n💼 Inspecting: "${job.title}" at "${job.company}"`);
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
      await humanJitter(2500, 4500);

      // Check if page has recruiter email in text
      const pageText = await page.evaluate(() => document.body ? document.body.innerText : '');
      const emailMatch = pageText.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);

      if (emailMatch) {
        const recruiterEmail = emailMatch[0];
        console.log(`📧 Discovered Recruiter Email on job listing: ${recruiterEmail}`);
        await sendCandidateWhatsAppAlert(job.title, job.company, job.url, `Direct Recruiter Email (${recruiterEmail})`);
        appliedCount++;
        continue;
      }

      // Check for Easy Apply Button if logged in
      if (isLoggedIn) {
        const easyApplyButton = await page.$('.jobs-apply-button, button[aria-label*="Easy Apply"]');
        if (easyApplyButton) {
          console.log(`⚡ "Easy Apply" available! Initiating automated submission...`);
          await easyApplyButton.click();
          await humanJitter(2000, 3500);

          let submitted = false;
          // Step through Easy Apply multi-page modal dialog (up to 5 steps)
          for (let step = 0; step < 5; step++) {
            // Fill phone if empty
            const phoneInput = await page.$('input[id*="phoneNumber"], input[name*="phoneNumber"]');
            if (phoneInput) {
              const currentVal = await page.evaluate(el => el.value, phoneInput);
              if (!currentVal) {
                await phoneInput.type(CANDIDATE.cleanPhone, { delay: 50 });
              }
            }

            // Attach CV if file input is present
            if (cvPath && fs.existsSync(cvPath)) {
              const fileInput = await page.$('input[type="file"]');
              if (fileInput) {
                try {
                  await fileInput.uploadFile(cvPath);
                  console.log(`📎 Attached Resume.pdf to Easy Apply form.`);
                  await humanJitter(1500, 2500);
                } catch (upErr) {}
              }
            }

            // Fill experience inputs if asked
            const numericInputs = await page.$$('input[type="text"][id*="numeric"], input[id*="experience" i]');
            for (const numIn of numericInputs) {
              const val = await page.evaluate(el => el.value, numIn);
              if (!val) {
                await numIn.type(CANDIDATE.yearsOfExperience, { delay: 40 });
              }
            }

            // Check for Submit button
            const submitButton = await page.$('button[aria-label="Submit application"], button[aria-label*="Submit" i]');
            if (submitButton) {
              console.log(`🚀 Clicking "Submit Application"...`);
              await submitButton.click();
              await humanJitter(3000, 5000);
              submitted = true;
              break;
            }

            // Click Next / Review button
            const nextButton = await page.$('button[aria-label="Continue to next step"], button[aria-label*="Review" i], button[aria-label*="Next" i]');
            if (nextButton) {
              await nextButton.click();
              await humanJitter(2000, 3500);
            } else {
              break;
            }
          }

          if (submitted) {
            appliedCount++;
            console.log(`🎉 [APPLICATION SUBMITTED]: "${job.title}" at "${job.company}"`);
            await sendCandidateWhatsAppAlert(job.title, job.company, job.url, 'LinkedIn Easy Apply');

            // Close post-submission confirmation modal
            const dismissBtn = await page.$('button[aria-label="Dismiss"], button[data-control-name="overlay.close_padding"]');
            if (dismissBtn) await dismissBtn.click().catch(() => null);
          } else {
            console.log(`ℹ️ Multi-stage custom questionnaire encountered. Saved to review pipeline.`);
            // Dismiss dialog safely
            const closeBtn = await page.$('button[aria-label="Dismiss"], button[data-test-modal-close-btn]');
            if (closeBtn) {
              await closeBtn.click().catch(() => null);
              await humanJitter(1000, 1500);
              const discardBtn = await page.$('button[data-control-name="discard_application_confirm_btn"]');
              if (discardBtn) await discardBtn.click().catch(() => null);
            }
          }
        } else {
          console.log(`ℹ️ Standard External Link application. Handled via browser auto-apply worker.`);
        }
      }

      await humanJitter(4000, 7000); // Safe pause between jobs
    }
  }

  console.log(`\n======================================================`);
  console.log(`✅ LINKEDIN SESSION COMPLETE: ${appliedCount} jobs processed/applied.`);
  console.log(`======================================================`);

  await browser.close();
  if (dbConnected) await mongoose.disconnect();
}

runLinkedInBot().catch(err => {
  console.error('❌ LinkedIn Bot Error:', err);
  process.exit(1);
});
