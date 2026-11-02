const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const total = await db.collection('jobopportunities').countDocuments();
  const applied = await db.collection('jobopportunities').find({ applied: true }).toArray();

  console.log(`📊 Total Tracked Jobs: ${total}`);
  console.log(`🚀 Total Applied: ${applied.length}`);

  console.log('\n--- ALL APPLIED JOBS ---');
  applied.forEach((a, i) => {
    console.log(`${i + 1}. "${a.title}" at "${a.company}" | Recruiter: ${a.recruiterEmail || a.recruiterPhone || 'N/A'} | Channel: ${a.channel} | AppliedAt: ${a.appliedAt || a.createdAt}`);
  });

  const recent = await db.collection('jobopportunities').find().sort({ _id: -1 }).limit(10).toArray();
  console.log('\n--- 10 MOST RECENT TRACKED JOBS ---');
  recent.forEach((r, i) => {
    console.log(`${i + 1}. [${r.channel}] "${r.title}" at "${r.company}" | Applied: ${Boolean(r.applied)} | Time: ${r.createdAt || r._id.getTimestamp()}`);
  });

  await mongoose.disconnect();
}

inspect().catch(err => console.error(err));
