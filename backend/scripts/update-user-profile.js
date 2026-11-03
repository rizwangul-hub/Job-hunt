const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function updateProfile() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const updatedTemplate = `Hi {{contact_name}}, I noticed your opening regarding the {{role_title}} role requiring {{matched_tech}}.

I am Rizwan Ullah, a Full-Stack MERN & Software Developer with hands-on production experience building responsive web applications (MongoDB, Express, React, Node.js), Next.js architectures, and cross-platform mobile apps with React Native.

Professional Profiles & Demos:
🌐 Live Portfolio: {{portfolio_url}}
💼 LinkedIn: {{linkedin_url}}
💻 GitHub: {{github_url}}
📞 Direct WhatsApp / Phone: +92 325 5984244
📄 Attached: Resume.pdf

I would welcome the opportunity to discuss how my skill set can support your team. Looking forward to hearing from you!

Best regards,
Rizwan Ullah
Full-Stack Developer
Email: rizwangul535@gmail.com
Phone / WhatsApp: +92 325 5984244`;

  const result = await db.collection('userprofiles').updateMany({}, {
    $set: {
      phone: '+92 325 5984244',
      linkedinUrl: 'https://www.linkedin.com/in/rizwanmerndev',
      githubUrl: 'https://github.com/rizwangul-hub',
      portfolioUrl: 'https://full-stack-portfolio-coral.vercel.app',
      'preferences.notificationPhone': '+92 325 5984244',
      'preferences.pitchTemplate': updatedTemplate,
      'preferences.calendlyUrl': ''
    }
  });

  console.log('✅ Successfully updated UserProfile in MongoDB Atlas:', result.modifiedCount, 'document(s) modified.');
  await mongoose.disconnect();
}

updateProfile().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
