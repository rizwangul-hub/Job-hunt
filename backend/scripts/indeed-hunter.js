/**
 * RizAgent - Autonomous Indeed Job Hunter & Auto-Applier
 * Candidate: Rizwan Ullah (rizwangul535@gmail.com | +92 325 5984244)
 * 
 * Platforms Monitored:
 * - pk.indeed.com (Pakistan Tech Market: Lahore, Karachi, Islamabad, Remote)
 * - indeed.com (Global Remote Opportunities)
 * 
 * Features:
 * 1. Automatic Job Discovery:
 *    - Full Stack Developer, MERN Stack Developer, React Developer, Python Developer, Web Developer
 * 2. Contact & Recruiter Email Extraction:
 *    - Parses job descriptions for HR/Careers emails (hr@..., careers@..., jobs@...)
 * 3. Autonomous Application Dispatch:
 *    - Dispatches tailored pitch + Resume.pdf attached via Gmail SMTP
 *    - If recruiter WhatsApp/Phone found, delivers CV via WhatsApp
 * 4. "Easily Apply" Form Automation:
 *    - Detects Indeed 1-click apply, fills name, email, phone, experience, and uploads Resume.pdf
 * 5. Private WhatsApp Notification:
 *    - Instantly notifies candidate on WhatsApp (+92 325 5984244)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { executeUniversalApply, CANDIDATE } = require('./universal-applier');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CACHE_FILE = path.join(__dirname, '../.indeed_radar_cache.json');
let processedIndeedJobs = new Set();
if (fs.existsSync(CACHE_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    processedIndeedJobs = new Set(raw);
  } catch (e) {}
}

function saveCache() {
  try {
    const arr = Array.from(processedIndeedJobs).slice(-500);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(arr, null, 2));
  } catch (e) {}
}

const INDEED_QUERIES = [
  { keyword: 'Full Stack Developer', location: 'Pakistan' },
  { keyword: 'MERN Stack Developer', location: 'Pakistan' },
  { keyword: 'React Developer', location: 'Pakistan' },
  { keyword: 'Python Developer', location: 'Remote' },
  { keyword: 'Web Developer', location: 'Pakistan' }
];

const delay = (ms) => new Promise(res => setTimeout(res, ms));

function getCVPath() {
  const rootCv = path.join(__dirname, '../uploads/Resume.pdf');
  if (fs.existsSync(rootCv)) return rootCv;
  const cvDir = path.join(__dirname, '../uploads/cvs');
  if (fs.existsSync(cvDir)) {
    const files = fs.readdirSync(cvDir).filter(f => f.endsWith('.pdf'));
    if (files.length > 0) return path.join(cvDir, files[0]);
  }
  return null;
}

// Extract emails from text
function extractEmails(text) {
  if (!text) return [];
  const regex = /[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(regex) || [];
  return matches.filter(e => {
    const low = e.toLowerCase();
    return !low.endsWith('.png') && !low.endsWith('.jpg') && !low.endsWith('.svg') &&
           !low.includes('example.com') && !low.includes('indeed.com') && !low.includes('sentry.io') &&
           !low.includes('w3.org') && !low.includes('schema.org');
  });
}

// Extract phone numbers (Pakistani & international)
function extractPhoneNumber(text) {
  if (!text) return null;
  const m = text.match(/(?:\+92|0092|0)(?:[-\s]?3[0-9]{2}[-\s]?[0-9]{7}|[-\s]?3[0-9]{9})/);
  if (m) {
    return m[0].replace(/[^\d+]/g, '');
  }
  return null;
}

// Scan Indeed public search streams & Google Indexed Indeed Postings
async function scanIndeedJobs(whatsappClient = null) {
  console.log('\n======================================================');
  console.log('💼 STARTING INDEED AUTONOMOUS JOB RADAR & APPLIER');
  console.log(`   Candidate: ${CANDIDATE.name} (${CANDIDATE.email})`);
  console.log(`   CV Document: Resume.pdf`);
  console.log(`   Target Locations: Pakistan & Remote`);
  console.log('======================================================\n');

  let browser = null;
  let applicationsDispatched = 0;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (puppeteer.executablePath ? puppeteer.executablePath() : undefined),
      protocolTimeout: 60000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ],
      defaultViewport: { width: 1280, height: 800 }
    });

    for (const query of INDEED_QUERIES) {
      console.log(`🔎 [INDEED SCAN] "${query.keyword}" in "${query.location}"...`);

      // Search Google indexed Indeed listings to bypass Cloudflare security challenges cleanly
      const searchUrl = `https://www.google.com/search?q=site:pk.indeed.com+("${encodeURIComponent(query.keyword)}")+pakistan+("careers"+OR+"hr"+OR+"@" )`;
      let page = null;

      try {
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(2000);

        const jobItems = await page.evaluate(() => {
          const list = [];
          const blocks = document.querySelectorAll('div.g, div[data-hveid]');
          blocks.forEach(b => {
            const titleEl = b.querySelector('h3');
            const snippetEl = b.querySelector('div[data-sncf], div.VwiC3b, div[style*="-webkit-line-clamp"]');
            const linkEl = b.querySelector('a');
            if (titleEl && linkEl) {
              list.push({
                title: titleEl.innerText || '',
                snippet: snippetEl ? snippetEl.innerText : '',
                url: linkEl.href || ''
              });
            }
          });
          return list;
        });

        console.log(`📋 Discovered ${jobItems.length} Indeed listings for "${query.keyword}".`);

        for (const job of jobItems) {
          const combined = `${job.title} ${job.snippet}`;
          const lower = combined.toLowerCase();

          // Ensure it's a developer role
          const isDevRole = lower.includes('developer') || lower.includes('engineer') || lower.includes('mern') || lower.includes('react') || lower.includes('stack') || lower.includes('python');
          if (!isDevRole) continue;

          const jobKey = job.title.trim().toLowerCase();
          if (processedIndeedJobs.has(jobKey) || (job.url && processedIndeedJobs.has(job.url))) {
            continue;
          }

          // Extract contacts
          const emails = extractEmails(combined);
          const phone = extractPhoneNumber(combined);

          // Extract company name if possible from title (e.g. "Software Engineer - CompanyName - Indeed")
          let company = 'Indeed Hiring Company';
          const parts = job.title.split('-').map(s => s.trim());
          if (parts.length >= 2 && !parts[1].toLowerCase().includes('indeed')) {
            company = parts[1];
          }

          if (emails.length > 0 || phone) {
            console.log(`\n💼 [INDEED OPPORTUNITY]: "${job.title}" at "${company}"`);
            console.log(`   Recruiter Email: ${emails[0] || 'N/A'}`);
            console.log(`   Recruiter Phone: ${phone || 'N/A'}`);

            const applied = await executeUniversalApply({
              title: job.title,
              company: company,
              description: job.snippet,
              recruiterEmail: emails[0] || null,
              recruiterPhone: phone || null,
              applyUrl: job.url,
              channel: 'indeed',
              whatsappClient: whatsappClient
            });

            processedIndeedJobs.add(jobKey);
            if (job.url) processedIndeedJobs.add(job.url);
            saveCache();

            if (applied) {
              applicationsDispatched++;
              await delay(2500);
            }
          } else {
            // Store as tracked opportunity
            processedIndeedJobs.add(jobKey);
            if (job.url) processedIndeedJobs.add(job.url);
            saveCache();
          }
        }
      } catch (qErr) {
        console.log(`⚠️ Search error for Indeed query "${query.keyword}": ${qErr.message}`);
      } finally {
        if (page && !page.isClosed()) {
          await page.close().catch(() => null);
        }
      }

      await delay(1500);
    }
  } catch (err) {
    console.error('❌ Indeed Radar Error:', err.message);
  } finally {
    if (browser) await browser.close().catch(() => null);
  }

  console.log('\n======================================================');
  console.log(`🏁 INDEED RADAR SCAN COMPLETE: ${applicationsDispatched} new applications dispatched.`);
  console.log('======================================================\n');
  return applicationsDispatched;
}

// Standalone execution support
if (require.main === module) {
  scanIndeedJobs().then(() => {
    console.log('Indeed scan finished.');
    process.exit(0);
  });
}

module.exports = {
  scanIndeedJobs
};
