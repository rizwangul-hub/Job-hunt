const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runHealthCheck() {
  console.log('======================================================');
  console.log('🩺 SYSTEM HEALTH & STATUS DIAGNOSTIC REPORT');
  console.log('======================================================');

  // 1. Check MongoDB Atlas
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ [DATABASE]: MongoDB Atlas Connected successfully.');
    
    const db = mongoose.connection.db;
    const totalJobs = await db.collection('jobopportunities').countDocuments();
    const appliedJobs = await db.collection('jobopportunities').countDocuments({ applied: true });
    const recentJobs = await db.collection('jobopportunities').find().sort({ _id: -1 }).limit(8).toArray();
    
    console.log(`📊 Total Job Opportunities Tracked: ${totalJobs}`);
    console.log(`🚀 Total Applications Dispatched: ${appliedJobs}`);
    console.log('\n📋 Most Recent Job Records:');
    recentJobs.forEach(j => {
      const time = j.createdAt || j.appliedAt || j._id.getTimestamp();
      console.log(`  - [${j.channel || 'unknown'}] "${j.title}" at "${j.company}" | Applied: ${Boolean(j.applied)} | Recruiter: ${j.recruiterEmail || j.recruiterPhone || 'N/A'} | Time: ${time}`);
    });
    await mongoose.disconnect();
  } catch (dbErr) {
    console.error('❌ [DATABASE ERROR]:', dbErr.message);
  }

  // 2. Check SMTP Transporter
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    await transporter.verify();
    console.log('\n✅ [EMAIL SMTP]: Gmail SMTP credentials verified & ready to dispatch.');
    console.log(`   Account: ${process.env.SMTP_USER}`);
  } catch (mErr) {
    console.error('\n❌ [EMAIL SMTP ERROR]:', mErr.message);
  }

  // 3. Check CV File
  const cvPath = path.join(__dirname, '../uploads/Resume.pdf');
  const cvExists = fs.existsSync(cvPath);
  console.log(`${cvExists ? '✅' : '❌'} [CANDIDATE CV]: Resume.pdf ${cvExists ? 'Found (' + fs.statSync(cvPath).size + ' bytes)' : 'Missing'}`);

  // 4. Check Vercel API Webhook
  try {
    const webhookUrl = process.env.API_WEBHOOK_URL || 'https://backend-rose-two-72.vercel.app/api/webhooks/jobs';
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: 'HEALTH_CHECK_PING', channel: 'ping' })
    });
    console.log(`✅ [VERCEL API]: Webhook responding (HTTP ${res.status})`);
  } catch (apiErr) {
    console.error('❌ [VERCEL API ERROR]:', apiErr.message);
  }

  // 5. Check LinkedIn Radar Cache
  const radarCachePath = path.join(__dirname, '../.linkedin_radar_cache.json');
  if (fs.existsSync(radarCachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(radarCachePath, 'utf8'));
      console.log(`✅ [LINKEDIN RADAR]: Cache active with ${cached.length} parsed jobs.`);
    } catch(e) {}
  } else {
    console.log(`ℹ️ [LINKEDIN RADAR]: Fresh session cache ready.`);
  }

  // 6. Check Local Auth Session Folder
  const authDir = path.join(__dirname, '../.wwebjs_auth');
  console.log(`ℹ️ [LOCAL WHATSAPP AUTH]: Folder ${fs.existsSync(authDir) ? 'Exists' : 'Not Found'}`);

  console.log('======================================================');
}

runHealthCheck().then(() => process.exit(0)).catch(() => process.exit(1));
