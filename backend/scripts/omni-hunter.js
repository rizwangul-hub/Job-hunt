/**
 * RizAgent - Master Omni-Platform Job Hunter & Auto-Applier
 * Candidate: Rizwan Ullah (rizwangul535@gmail.com | +92 325 5984244)
 * 
 * Platforms Monitored 24/7:
 * 1. WhatsApp Groups & Chats (Real-time listener + Auto-Pitch + CV attachment)
 * 2. LinkedIn (Authenticated Easy Apply + Public Recruiter Radar)
 * 3. Facebook Tech Communities (Public Developer hiring groups & recruiter posts)
 * 4. Instagram Tech Feeds (#hiringdeveloper, #mernstack, #pakistantech)
 * 5. Web & RSS Developer Feeds
 * 
 * Unified Action on Every Job Found:
 * - Direct Recruiter Email with Resume.pdf attached via Gmail SMTP
 * - Direct WhatsApp message with CV document attached
 * - Direct LinkedIn Easy Apply form submission
 * - Instant Candidate WhatsApp Alert to +92 325 5984244
 * - Live Sync to Dashboard (https://jobhunt-topaz.vercel.app)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('================================================================');
console.log('🌟 RIZAGENT MASTER OMNI-PLATFORM AUTONOMOUS JOB HUNTER');
console.log('   Candidate: Rizwan Ullah (rizwangul535@gmail.com)');
console.log('   Phone / WhatsApp: +92 325 5984244');
console.log('   Platforms: WhatsApp, LinkedIn, Facebook, Instagram & Web');
console.log('================================================================\n');

// Start the primary WhatsApp Bot engine which already coordinates
// WhatsApp group listening, LinkedIn Radar, and Social Radar
function startOmniEngine() {
  const botScript = path.join(__dirname, 'whatsapp-bot.js');
  console.log(`🚀 Starting Omni-Engine via: ${botScript}`);

  const child = spawn(process.execPath, [botScript], {
    stdio: 'inherit',
    env: { ...process.env, OMNI_MODE: 'true' }
  });

  child.on('close', (code) => {
    console.log(`⚠️ Omni-Engine exited with code ${code}. Auto-restarting in 10 seconds...`);
    setTimeout(startOmniEngine, 10000);
  });

  child.on('error', (err) => {
    console.error(`❌ Process Error: ${err.message}`);
  });
}

startOmniEngine();
