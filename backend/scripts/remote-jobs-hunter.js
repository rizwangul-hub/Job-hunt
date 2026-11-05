/**
 * RizAgent - High-Volume Global Remote Tech Job Hunter
 * Candidate: Rizwan Ullah (rizwangul535@gmail.com | +92 325 5984244)
 * 
 * Sources:
 * 1. Remotive API (Software Development, Full-Stack, React, Python)
 * 2. Jobicy API (React, Full-Stack, Node.js, Frontend, Backend)
 * 3. RemoteOK API (Web Developer, MERN, Software Engineer)
 * 
 * Auto-Dispatches:
 * - Direct Email with Resume.pdf & Tailored Pitch (Portfolio, LinkedIn, GitHub, WhatsApp)
 * - Autonomous Form Fill on Direct Apply Links
 */

const fs = require('fs');
const path = require('path');
const { executeUniversalApply, isRelevantTechJobOrProject, CANDIDATE } = require('./universal-applier');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CACHE_FILE = path.join(__dirname, '../.remote_jobs_cache.json');
let processedJobIds = new Set();
if (fs.existsSync(CACHE_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    processedJobIds = new Set(raw);
  } catch (e) {}
}

function saveCache() {
  try {
    const arr = Array.from(processedJobIds).slice(-1500);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(arr, null, 2));
  } catch (e) {}
}

function extractEmails(text) {
  if (!text) return [];
  const matches = text.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g) || [];
  return matches.filter(e => {
    const low = e.toLowerCase();
    return !low.endsWith('.png') && !low.endsWith('.jpg') && !low.endsWith('.svg') &&
           !low.includes('example.com') && !low.includes('sentry.io') &&
           !low.includes('w3.org') && !low.includes('schema.org') &&
           !low.includes('jobicy.com') && !low.includes('remotive.com') &&
           !low.includes('remoteok.com');
  });
}

async function fetchRemotiveJobs() {
  const jobs = [];
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=30', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(12000)
    });
    if (res.ok) {
      const data = await res.json();
      for (const j of (data.jobs || [])) {
        jobs.push({
          id: `remotive_${j.id}`,
          title: j.title,
          company: j.company_name,
          url: j.url,
          location: j.candidate_required_location || 'Remote',
          description: j.description ? j.description.replace(/<[^>]+>/g, ' ') : '',
          source: 'remotive'
        });
      }
    }
  } catch (e) {
    console.log(`ℹ️ Remotive API Notice: ${e.message}`);
  }
  return jobs;
}

async function fetchJobicyJobs(tag = 'react') {
  const jobs = [];
  try {
    const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=25&tag=${tag}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(12000)
    });
    if (res.ok) {
      const data = await res.json();
      for (const j of (data.jobs || [])) {
        jobs.push({
          id: `jobicy_${j.id}`,
          title: j.jobTitle,
          company: j.companyName,
          url: j.url,
          location: j.jobGeo || 'Remote',
          description: j.jobDescription ? j.jobDescription.replace(/<[^>]+>/g, ' ') : (j.jobExcerpt || ''),
          source: 'jobicy'
        });
      }
    }
  } catch (e) {
    console.log(`ℹ️ Jobicy API (${tag}) Notice: ${e.message}`);
  }
  return jobs;
}

async function fetchRemoteOkJobs() {
  const jobs = [];
  try {
    const res = await fetch('https://remoteok.com/api?tag=dev', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(12000)
    });
    if (res.ok) {
      const data = await res.json();
      for (const j of (Array.isArray(data) ? data.slice(1, 30) : [])) {
        if (!j || !j.id) continue;
        jobs.push({
          id: `remoteok_${j.id}`,
          title: j.position,
          company: j.company,
          url: j.apply_url || j.url,
          location: j.location || 'Remote',
          description: j.description ? j.description.replace(/<[^>]+>/g, ' ') : '',
          source: 'remoteok'
        });
      }
    }
  } catch (e) {
    console.log(`ℹ️ RemoteOK API Notice: ${e.message}`);
  }
  return jobs;
}

async function scanHighVolumeRemoteJobs(whatsappClient = null) {
  console.log('\n======================================================');
  console.log('🚀 STARTING HIGH-VOLUME GLOBAL DEVELOPER JOB RADAR');
  console.log(`   Candidate: ${CANDIDATE.name} (${CANDIDATE.email})`);
  console.log(`   Targets: Remotive, Jobicy, RemoteOK`);
  console.log('======================================================\n');

  let totalDispatched = 0;

  // 1. Fetch from high-volume sources in parallel
  const [remotiveJobs, jobicyReact, jobicyFullStack, remoteOkJobs] = await Promise.all([
    fetchRemotiveJobs(),
    fetchJobicyJobs('react'),
    fetchJobicyJobs('full-stack'),
    fetchRemoteOkJobs()
  ]);

  const allJobs = [...remotiveJobs, ...jobicyReact, ...jobicyFullStack, ...remoteOkJobs];
  console.log(`📊 Total Fresh Remote Jobs Ingested: ${allJobs.length}`);

  for (const job of allJobs) {
    if (!job || !job.title || !job.id) continue;
    if (processedJobIds.has(job.id)) continue;
    processedJobIds.add(job.id);

    // Filter using candidate's strict tech relevance shield
    const relevance = isRelevantTechJobOrProject(job.title, job.description, job.location);
    if (!relevance.relevant) {
      continue;
    }

    console.log(`\n💼 Matching Tech Role: "${job.title}" at "${job.company}" (${job.source.toUpperCase()})`);

    // Check for direct email in job description
    const emails = extractEmails(job.description);
    if (emails.length > 0) {
      const recruiterEmail = emails[0];
      console.log(`🎯 Recruiter Contact Found: ${recruiterEmail}`);
      const applied = await executeUniversalApply({
        title: job.title,
        company: job.company,
        description: job.description,
        recruiterEmail: recruiterEmail,
        applyUrl: job.url,
        channel: job.source,
        whatsappClient
      });
      if (applied) totalDispatched++;
    } else {
      console.log(`ℹ️ Apply URL available: ${job.url}`);
    }
  }

  saveCache();
  console.log(`\n🏁 High-Volume Scan Complete: ${totalDispatched} direct applications dispatched.`);
  return totalDispatched;
}

module.exports = {
  scanHighVolumeRemoteJobs
};

if (require.main === module) {
  scanHighVolumeRemoteJobs().then(() => process.exit(0)).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
