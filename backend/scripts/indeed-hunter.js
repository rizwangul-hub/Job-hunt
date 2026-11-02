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
  // Pakistan (Onsite & Remote)
  { keyword: 'Full Stack Developer', location: 'Pakistan' },
  { keyword: 'MERN Stack Developer', location: 'Pakistan' },
  { keyword: 'Software Developer', location: 'Pakistan' },
  { keyword: 'React Developer', location: 'Pakistan' },
  { keyword: 'Node.js Developer', location: 'Pakistan' },
  { keyword: 'Web Developer', location: 'Pakistan' },
  { keyword: 'Python Developer', location: 'Pakistan' },
  { keyword: 'Data Entry Operator', location: 'Pakistan' },
  // Worldwide (Strictly Remote)
  { keyword: 'Full Stack Developer', location: 'Remote' },
  { keyword: 'MERN Stack Developer', location: 'Remote' },
  { keyword: 'React Developer', location: 'Remote' },
  { keyword: 'Node.js Developer', location: 'Remote' },
  { keyword: 'Frontend Developer', location: 'Remote' },
  { keyword: 'Backend Developer', location: 'Remote' },
  { keyword: 'Python Developer', location: 'Remote' }
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
           !low.includes('w3.org') && !low.includes('schema.org') && !low.includes('duckduckgo');
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

// Scan Indeed public search streams (Universal Ultra-Lightweight HTTP Mode, 0MB Overhead)
async function scanIndeedJobs(whatsappClient = null) {
  console.log('\n======================================================');
  console.log('💼 STARTING INDEED AUTONOMOUS JOB RADAR & APPLIER');
  console.log(`   Candidate: ${CANDIDATE.name} (${CANDIDATE.email})`);
  console.log(`   CV Document: Resume.pdf`);
  console.log(`   Scope: Pakistan (Onsite & Remote) + Worldwide (Remote)`);
  console.log('======================================================\n');

  let applicationsDispatched = 0;

  for (const query of INDEED_QUERIES) {
    console.log(`🔎 [INDEED SCAN] "${query.keyword}" in "${query.location}"...`);
    try {
      const locFilter = query.location.toLowerCase() === 'remote' ? 'remote' : 'pakistan';
      const searchUrl = `https://html.duckduckgo.com/html/?q=site:pk.indeed.com+("${encodeURIComponent(query.keyword)}")+${locFilter}+("careers"+OR+"hr"+OR+"@" )`;
      const res = await fetch(searchUrl, {
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
          console.log(`🎯 Recruiter Contact Found on Indeed: ${recEmail || phone} for "${query.keyword}"`);
          const result = await executeUniversalApply({
            title: query.keyword,
            company: 'Indeed Tech Recruiter',
            description: plain,
            recruiterEmail: recEmail,
            recruiterPhone: phone || null,
            applyUrl: 'https://pk.indeed.com',
            channel: 'indeed'
          }, whatsappClient);
          if (result && (result.emailSent || result.whatsappSent)) applicationsDispatched++;
        }
      }
    } catch (err) {
      console.log(`ℹ️ Notice for Indeed "${query.keyword}": ${err.message}`);
    }
    await delay(1500);
  }

  console.log(`\n======================================================`);
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
