/**
 * RizAgent - Autonomous Facebook & Instagram Social Tech Job Radar
 * Candidate: Rizwan Ullah (rizwangul535@gmail.com | +92 325 5984244)
 * 
 * Functions:
 * 1. Monitors public Facebook Tech Communities & Recruiter Posts:
 *    - "MERN Stack Developers Pakistan"
 *    - "React JS Developers"
 *    - "Pakistan Software Engineers & IT Professionals"
 *    - "Karachi, Lahore & Islamabad Software Jobs"
 * 2. Monitors Instagram Tech Recruitment Feeds:
 *    - Public tags: #pakistantechjobs, #mernstackdeveloper, #reactdeveloper, #remotejobs
 * 3. Extracts Recruiter Emails & WhatsApp Phone numbers.
 * 4. Automatically triggers Universal Applier (sends Resume.pdf via Email & WhatsApp).
 * 5. Runs continuously in background (daemon mode) or single-scan.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { executeUniversalApply, CANDIDATE } = require('./universal-applier');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CACHE_FILE = path.join(__dirname, '../.social_radar_cache.json');
let processedPosts = new Set();
if (fs.existsSync(CACHE_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    processedPosts = new Set(raw);
  } catch (e) {}
}

function saveCache() {
  try {
    const arr = Array.from(processedPosts).slice(-300);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(arr, null, 2));
  } catch (e) {}
}

// Tech keywords that signify relevant roles
const TARGET_KEYWORDS = [
  'full stack', 'fullstack', 'mern', 'react', 'reactjs', 'node', 'nodejs',
  'frontend', 'front-end', 'backend', 'back-end', 'software engineer',
  'web developer', 'python', 'javascript', 'nextjs', 'data entry', 'computer operator'
];

// Target public search queries for Facebook & Instagram tech hiring
const SOCIAL_TARGETS = [
  { platform: 'facebook', query: 'hiring mern stack developer pakistan', url: 'https://www.google.com/search?q=site:facebook.com+"hiring"+("mern"+"developer"+OR+"full+stack"+OR+"react")+"pakistan"+gmail.com+OR+careers+OR+hr' },
  { platform: 'facebook', query: 'hiring react developer pakistan', url: 'https://www.google.com/search?q=site:facebook.com+"we+are+hiring"+("software+engineer"+OR+"web+developer")+pakistan+email' },
  { platform: 'instagram', query: 'instagram hiring developer pakistan', url: 'https://www.google.com/search?q=site:instagram.com+"hiring"+("mern"+OR+"react"+OR+"fullstack"+OR+"python")+pakistan+("careers"+OR+"hr"+OR+"@" )' },
  { platform: 'social', query: 'remote full stack developer hiring email', url: 'https://www.google.com/search?q=("apply+at"+OR+"send+cv+to"+OR+"send+resume+to")+("mern+developer"+OR+"full+stack+developer"+OR+"react")+pakistan' }
];

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// Extract Pakistani phone number
function extractPhoneNumber(text) {
  if (!text) return null;
  // Match +92 3XX XXXXXXX or 03XX XXXXXXX or 03XXXXXXXXX
  const m = text.match(/(?:\+92|0092|0)(?:[-\s]?3[0-9]{2}[-\s]?[0-9]{7}|[-\s]?3[0-9]{9})/);
  if (m) {
    return m[0].replace(/[^\d+]/g, '');
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
           !low.includes('example.com') && !low.includes('google.com') && !low.includes('w3.org') &&
           !low.includes('sentry.io') && !low.includes('schema.org');
  });
}

// Scrape social hiring radar
async function scanSocialTechJobs(whatsappClient = null) {
  console.log('\n======================================================');
  console.log('🌐 STARTING SOCIAL JOB RADAR (FACEBOOK, INSTAGRAM & SOCIAL)');
  console.log(`   Candidate: ${CANDIDATE.name} (${CANDIDATE.email})`);
  console.log(`   Auto-Apply Mode: Instant CV & Pitch Dispatch`);
  console.log('======================================================\n');

  let browser = null;
  let newAppliedCount = 0;

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

    for (const target of SOCIAL_TARGETS) {
      console.log(`🔎 [SCANNING] ${target.platform.toUpperCase()}: "${target.query}"...`);
      let page = null;
      try {
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(2000);

        // Extract search snippets & titles
        const results = await page.evaluate(() => {
          const items = [];
          const blocks = document.querySelectorAll('div.g, div[data-hveid]');
          blocks.forEach(b => {
            const titleEl = b.querySelector('h3');
            const snippetEl = b.querySelector('div[data-sncf], div.VwiC3b, div[style*="-webkit-line-clamp"]');
            const linkEl = b.querySelector('a');
            if (titleEl && linkEl) {
              items.push({
                title: titleEl.innerText || '',
                snippet: snippetEl ? snippetEl.innerText : '',
                url: linkEl.href || ''
              });
            }
          });
          return items;
        });

        console.log(`📋 Found ${results.length} public leads on ${target.platform.toUpperCase()}.`);

        for (const item of results) {
          const combinedText = `${item.title} ${item.snippet}`;
          const lower = combinedText.toLowerCase();

          // Check if it matches developer role keywords
          const isTechJob = TARGET_KEYWORDS.some(kw => lower.includes(kw));
          if (!isTechJob) continue;

          // Check if already processed
          const postKey = item.title.trim().toLowerCase();
          if (processedPosts.has(postKey) || (item.url && processedPosts.has(item.url))) {
            continue;
          }

          // Extract contacts
          const emails = extractEmails(combinedText);
          const phone = extractPhoneNumber(combinedText);

          if (emails.length > 0 || phone) {
            console.log(`\n💼 [OPPORTUNITY IDENTIFIED]: "${item.title}"`);
            console.log(`   Source: ${target.platform.toUpperCase()} (${item.url})`);
            console.log(`   Recruiter Email: ${emails[0] || 'N/A'}`);
            console.log(`   Recruiter Phone: ${phone || 'N/A'}`);

            const applied = await executeUniversalApply({
              title: item.title,
              company: target.platform === 'facebook' ? 'Facebook Tech Recruiter' : 'Instagram Tech Recruiter',
              description: item.snippet,
              recruiterEmail: emails[0] || null,
              recruiterPhone: phone || null,
              applyUrl: item.url,
              channel: target.platform,
              whatsappClient: whatsappClient
            });

            processedPosts.add(postKey);
            if (item.url) processedPosts.add(item.url);
            saveCache();

            if (applied) {
              newAppliedCount++;
              await delay(3000);
            }
          }
        }
      } catch (err) {
        console.log(`⚠️ Search error on ${target.platform}: ${err.message}`);
      } finally {
        if (page && !page.isClosed()) {
          await page.close().catch(() => null);
        }
      }
    }
  } catch (mainErr) {
    console.error('❌ Social Radar Error:', mainErr.message);
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
  }

  console.log('\n======================================================');
  console.log(`🏁 SOCIAL RADAR SCAN COMPLETE: ${newAppliedCount} new applications dispatched.`);
  console.log('======================================================\n');
  return newAppliedCount;
}

// Standalone execution support
if (require.main === module) {
  scanSocialTechJobs().then(() => {
    console.log('Done.');
    process.exit(0);
  });
}

module.exports = {
  scanSocialTechJobs
};
