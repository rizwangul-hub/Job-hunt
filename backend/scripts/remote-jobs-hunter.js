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
    const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=80', {
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
    const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${tag}`, {
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

async function fetchArbeitnowJobs() {
  const jobs = [];
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(12000)
    });
    if (res.ok) {
      const data = await res.json();
      for (const j of (data.data || []).slice(0, 60)) {
        if (!j || !j.slug) continue;
        jobs.push({
          id: `arbeit_${j.slug}`,
          title: j.title,
          company: j.company_name,
          url: j.url,
          location: j.remote ? 'Remote' : (j.location || 'Remote'),
          description: j.description ? j.description.replace(/<[^>]+>/g, ' ') : '',
          source: 'arbeitnow'
        });
      }
    }
  } catch (e) {
    console.log(`ℹ️ Arbeitnow API Notice: ${e.message}`);
  }
  return jobs;
}

async function fetchHimalayasJobs() {
  const jobs = [];
  try {
    const res = await fetch('https://himalayas.app/jobs/api?limit=50', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(12000)
    });
    if (res.ok) {
      const data = await res.json();
      for (const j of (data.jobs || [])) {
        if (!j || !j.id) continue;
        jobs.push({
          id: `himalayas_${j.id}`,
          title: j.title,
          company: j.companyName,
          url: j.applicationLink || `https://himalayas.app/companies/${j.companySlug}/jobs/${j.slug}`,
          location: j.locationRestrictions?.join(', ') || 'Remote',
          description: j.description ? j.description.replace(/<[^>]+>/g, ' ') : (j.excerpt || ''),
          source: 'himalayas'
        });
      }
    }
  } catch (e) {
    console.log(`ℹ️ Himalayas API Notice: ${e.message}`);
  }
  return jobs;
}

async function fetchWeWorkRemotelyJobs() {
  const jobs = [];
  const feeds = [
    'https://weworkremotely.com/categories/remote-programming-jobs.rss',
    'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
    'https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss',
    'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss'
  ];

  for (const feedUrl of feeds) {
    try {
      const res = await fetch(feedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        const xml = await res.text();
        const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
        for (const item of items) {
          const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
          const linkMatch = item.match(/<link>(.*?)<\/link>/);
          const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || item.match(/<description>([\s\S]*?)<\/description>/);
          const guidMatch = item.match(/<guid[^>]*>(.*?)<\/guid>/);

          if (titleMatch && linkMatch) {
            const rawTitle = titleMatch[1].trim();
            const parts = rawTitle.split(':');
            const company = parts.length > 1 ? parts[0].trim() : 'Tech Company';
            const title = parts.length > 1 ? parts.slice(1).join(':').trim() : rawTitle;
            const url = linkMatch[1].trim();
            const id = guidMatch ? `wwr_${guidMatch[1].replace(/[^a-zA-Z0-9]/g, '')}` : `wwr_${Buffer.from(url).toString('base64').slice(0, 20)}`;
            const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, ' ').trim() : '';

            jobs.push({
              id,
              title,
              company,
              url,
              location: 'Remote',
              description,
              source: 'weworkremotely'
            });
          }
        }
      }
    } catch (e) {}
  }
  return jobs;
}

async function fetchHackerNewsWhoIsHiring() {
  const jobs = [];
  try {
    const userRes = await fetch('https://hacker-news.firebaseio.com/v0/user/whoishiring.json', { signal: AbortSignal.timeout(8000) });
    if (!userRes.ok) return jobs;
    const userData = await userRes.json();
    const candidateThreadIds = (userData.submitted || []).slice(0, 8);

    for (const threadId of candidateThreadIds) {
      try {
        const threadRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${threadId}.json`, { signal: AbortSignal.timeout(8000) });
        if (!threadRes.ok) continue;
        const thread = await threadRes.json();
        if (!thread || !thread.title || !thread.title.includes('Who is hiring?')) continue;

        console.log(`📡 Ingesting HN Hiring Thread: "${thread.title}" (${(thread.kids || []).length} comments)`);
        // Scan up to 150 comments per monthly thread for hundreds of fresh recruiter emails
        const commentIds = (thread.kids || []).slice(0, 150);

        for (let i = 0; i < commentIds.length; i += 15) {
          const batch = commentIds.slice(i, i + 15);
          const fetched = await Promise.all(
            batch.map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(6000) }).then(r => r.json()).catch(() => null))
          );

          for (const item of fetched) {
            if (!item || !item.text || item.deleted) continue;
            const plain = item.text.replace(/<[^>]+>/g, ' ').replace(/&#x2F;/g, '/').replace(/&amp;/g, '&');
            const firstLine = plain.split('\n')[0].trim();
            const parts = firstLine.split('|');
            const company = parts.length > 0 ? parts[0].trim() : 'Tech Startup';
            const title = parts.length > 1 ? parts[1].trim() : 'Software Engineer';
            const location = parts.length > 2 ? parts[2].trim() : 'Remote';

            jobs.push({
              id: `hn_${item.id}`,
              title: title.length > 60 ? title.substring(0, 60) : title,
              company: company.length > 40 ? company.substring(0, 40) : company,
              url: `https://news.ycombinator.com/item?id=${item.id}`,
              location,
              description: plain,
              source: 'hackernews'
            });
          }
        }
      } catch (tErr) {}
    }
  } catch (e) {
    console.log(`ℹ️ HackerNews API Notice: ${e.message}`);
  }
  return jobs;
}

async function scanHighVolumeRemoteJobs(whatsappClient = null) {
  console.log('\n======================================================');
  console.log('🚀 STARTING HIGH-VOLUME GLOBAL DEVELOPER JOB RADAR');
  console.log(`   Candidate: ${CANDIDATE.name} (${CANDIDATE.email})`);
  console.log(`   Targets: Remotive, Jobicy, RemoteOK, Arbeitnow, Himalayas, WeWorkRemotely, HackerNews`);
  console.log('======================================================\n');

  let totalDispatched = 0;

  // 1. Fetch from 8 high-volume global sources in parallel
  const [
    remotiveJobs,
    jobicyReact,
    jobicyFullStack,
    jobicyNode,
    jobicyPython,
    remoteOkJobs,
    arbeitJobs,
    himalayasJobs,
    wwrJobs,
    hnJobs
  ] = await Promise.all([
    fetchRemotiveJobs(),
    fetchJobicyJobs('react'),
    fetchJobicyJobs('full-stack'),
    fetchJobicyJobs('nodejs'),
    fetchJobicyJobs('python'),
    fetchRemoteOkJobs(),
    fetchArbeitnowJobs(),
    fetchHimalayasJobs(),
    fetchWeWorkRemotelyJobs(),
    fetchHackerNewsWhoIsHiring()
  ]);

  const allJobs = [
    ...remotiveJobs,
    ...jobicyReact,
    ...jobicyFullStack,
    ...jobicyNode,
    ...jobicyPython,
    ...remoteOkJobs,
    ...arbeitJobs,
    ...himalayasJobs,
    ...wwrJobs,
    ...hnJobs
  ];
  console.log(`📊 Total Fresh Remote Jobs Ingested: ${allJobs.length}`);

  let directLinksAlerted = 0;

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
    let emails = extractEmails(job.description);

    // If no email in summary, attempt quick inspection of employer destination page
    if (emails.length === 0 && job.url) {
      try {
        const destRes = await fetch(job.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(5000)
        });
        if (destRes.ok) {
          const destHtml = await destRes.text();
          emails = extractEmails(destHtml);
          if (emails.length > 0) {
            console.log(`🎯 Recruiter Email Discovered on Employer Page: ${emails[0]}`);
          }
        }
      } catch (fErr) {}
    }

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
      console.log(`📋 [DIRECT APPLY URL] "${job.title}" at "${job.company}" -> ${job.url}`);
      // Record direct apply opportunity to database so Rizwan can track & 1-tap apply
      try {
        const webhookUrl = process.env.API_WEBHOOK_URL || 'https://backend-rose-two-72.vercel.app/api/webhooks/jobs';
        const rawText = `DIRECT APPLY ROLE: ${job.title} at ${job.company}. URL: ${job.url}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText,
            text: rawText,
            channel: job.source,
            groupName: 'Global Remote Tech Radar',
            skipAutoApply: true,
            onlyIngest: true,
            job: {
              title: job.title,
              company: job.company,
              applyUrl: job.url,
              applied: false,
              status: 'ready_to_apply',
              location: job.location || 'Remote'
            }
          }),
          signal: AbortSignal.timeout(6000)
        }).catch(() => null);

        // Notify Rizwan on WhatsApp with direct 1-click apply link (Up to top 3 per scan to avoid notification flooding)
        if (directLinksAlerted < 3 && whatsappClient && typeof whatsappClient.sendMessage === 'function') {
          directLinksAlerted++;
          const alertMsg = `💼 *[DIRECT APPLY MATCH]*\n*Role:* ${job.title}\n*Company:* ${job.company}\n*Location:* ${job.location || 'Remote'}\n🔗 *Apply Link:* ${job.url}\n\n_Auto-screened for your Full-Stack Developer profile._`;
          for (const jid of (CANDIDATE.alertJids || [CANDIDATE.whatsappJid])) {
            await whatsappClient.sendMessage(jid, alertMsg).catch(() => null);
          }
        }
      } catch (recErr) {}
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
