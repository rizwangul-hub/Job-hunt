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

// Target public search queries for Facebook & Instagram tech hiring (Pakistan Onsite/Remote & Worldwide Remote)
const SOCIAL_TARGETS = [
  { platform: 'facebook', query: 'hiring mern stack developer pakistan email', url: 'https://www.google.com/search?q=site:facebook.com+"hiring"+("mern"+"developer"+OR+"full+stack"+OR+"react")+"pakistan"+gmail.com+OR+careers+OR+hr' },
  { platform: 'facebook', query: 'hiring software developer lahore karachi islamabad email', url: 'https://www.google.com/search?q=site:facebook.com+"we+are+hiring"+("software+engineer"+OR+"web+developer")+(lahore+OR+islamabad+OR+karachi)+email' },
  { platform: 'facebook', query: 'hiring full stack developer worldwide remote send cv', url: 'https://www.google.com/search?q=site:facebook.com+"hiring"+("full+stack"+OR+"mern"+OR+"react")+"remote"+send+cv' },
  { platform: 'instagram', query: 'instagram hiring developer pakistan careers', url: 'https://www.google.com/search?q=site:instagram.com+"hiring"+("mern"+OR+"react"+OR+"fullstack"+OR+"python")+pakistan+("careers"+OR+"hr"+OR+"@" )' },
  { platform: 'instagram', query: 'instagram hiring remote software engineer email', url: 'https://www.google.com/search?q=site:instagram.com+"hiring"+("remote"+OR+"worldwide")+("developer"+OR+"engineer")+email' },
  { platform: 'social', query: 'remote full stack developer hiring email send resume', url: 'https://www.google.com/search?q=("apply+at"+OR+"send+cv+to"+OR+"send+resume+to")+("mern+developer"+OR+"full+stack+developer"+OR+"react")+"remote"' },
  { platform: 'social', query: 'python developer remote hiring email', url: 'https://www.google.com/search?q=("apply+at"+OR+"send+cv+to")+("python+developer"+OR+"backend+developer")+"remote"' }
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
           !low.includes('sentry.io') && !low.includes('schema.org') && !low.includes('duckduckgo');
  });
}

// Scrape social hiring radar (Universal Ultra-Lightweight HTTP Mode, 0MB Overhead)
async function scanSocialTechJobs(whatsappClient = null) {
  console.log('\n======================================================');
  console.log('🌐 STARTING SOCIAL JOB RADAR (FACEBOOK, INSTAGRAM & SOCIAL)');
  console.log(`   Candidate: ${CANDIDATE.name} (${CANDIDATE.email})`);
  console.log(`   Scope: Pakistan (Onsite & Remote) + Worldwide (Remote)`);
  console.log(`   Auto-Apply Mode: Instant CV & Pitch Dispatch`);
  console.log('======================================================\n');

  let newAppliedCount = 0;

  for (const target of SOCIAL_TARGETS) {
    console.log(`🔎 [SCANNING] ${target.platform.toUpperCase()}: "${target.query}"...`);
    try {
      const duckUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(target.query + ' email OR hr')}`;
      const res = await fetch(duckUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) continue;
      const html = await res.text();
      const snippetMatches = html.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/gi) || [];
      for (const snip of snippetMatches) {
        const plain = snip.replace(/<[^>]+>/g, ' ');
        const emails = extractEmails(plain);
        const phone = extractPhoneNumber(plain);
        if (emails.length > 0 || phone) {
          const recEmail = emails[0] || null;
          console.log(`🎯 Recruiter Contact Found on ${target.platform.toUpperCase()}: ${recEmail || phone}`);
          const result = await executeUniversalApply({
            title: 'Full Stack Developer',
            company: `${target.platform.toUpperCase()} Recruiter Post`,
            description: plain,
            recruiterEmail: recEmail,
            recruiterPhone: phone || null,
            applyUrl: `https://${target.platform}.com`,
            channel: target.platform
          }, whatsappClient);
          if (result && (result.emailSent || result.whatsappSent)) newAppliedCount++;
        }
      }
    } catch (err) {
      console.log(`ℹ️ Notice for ${target.platform}: ${err.message}`);
    }
    await delay(1500);
  }

  console.log(`\n======================================================`);
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
