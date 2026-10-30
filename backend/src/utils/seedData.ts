import bcrypt from 'bcryptjs';
import { UserProfile } from '../models/UserProfile';
import { Integration } from '../models/Integration';
import { SystemSettings } from '../models/SystemSettings';
import { JobOpportunity } from '../models/JobOpportunity';
import { RecruiterConversation } from '../models/RecruiterConversation';
import { ActivityLog } from '../models/ActivityLog';
import { env } from '../config/env';
import { logger } from './logger';
import { ScoringEngine } from '../services/matching/scoringEngine';

export async function seedInitialData(): Promise<void> {
  // 1. Initial User
  const existingUser = await UserProfile.findOne();
  if (!existingUser) {
    logger.info('No user account found. Creating primary administrator profile...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, salt);

    const user = new UserProfile({
      email: env.ADMIN_EMAIL,
      passwordHash,
      fullName: env.ADMIN_NAME,
      handle: 'RizMern',
      phone: '+92 300 0000000',
      whatsapp: '+92 300 0000000',
      portfolioUrl: 'https://full-stack-portfolio-coral.vercel.app',
      linkedinUrl: 'https://www.linkedin.com/in/rizwanmerndev',
      githubUrl: 'https://github.com/rizwangul-hub',
      targetRoles: [
        'MERN Stack Developer',
        'Full Stack Developer',
        'React Developer',
        'Node.js Developer',
        'React Native Developer',
        'Junior Software Developer',
        'Software Development Intern'
      ],
      skills: [
        'React.js',
        'Node.js',
        'Express.js',
        'MongoDB',
        'React Native',
        'JavaScript',
        'TypeScript',
        'Tailwind CSS',
        'REST APIs',
        'Git',
        'HTML',
        'CSS'
      ],
      education: [
        {
          institution: 'University of Engineering and Technology',
          degree: 'Bachelor of Science in Computer Science',
          year: '2024'
        }
      ],
      experience: [
        {
          title: 'Full Stack MERN Developer',
          company: 'Software Innovation Labs',
          period: '2023 - Present',
          description: 'Designed and built full-stack dashboard applications and REST APIs using MongoDB, Express.js, React, and Node.js.'
        }
      ],
      projects: [
        {
          title: 'RizAgent AI Command Center',
          description: 'Autonomous job hunt and browser outreach platform for software developers.',
          tech: ['React', 'TypeScript', 'Node.js', 'Express', 'MongoDB', 'Playwright'],
          link: 'https://github.com/rizwanullah/rizagent'
        },
        {
          title: 'FinTech Mobile App',
          description: 'Cross-platform mobile application with real-time biometric and currency conversion features.',
          tech: ['React Native', 'Node.js', 'Tailwind CSS'],
          link: 'https://github.com/rizwanullah/fintech-app'
        }
      ],
      cvs: [],
      preferences: {
        minMatchThreshold: 80,
        preferredLocation: 'Pakistan / Remote',
        remoteOnly: false,
        internshipsJuniorOnly: false,
        targetSalary: 'Competitive / Stipend',
        maxApplicationsPerDay: 15,
        automationMode: 'APPROVAL_REQUIRED'
      }
    });

    await user.save();
    logger.info(`Primary profile created for: ${env.ADMIN_EMAIL}`);
  } else if (existingUser.email !== env.ADMIN_EMAIL) {
    existingUser.email = env.ADMIN_EMAIL;
    const salt = await bcrypt.genSalt(10);
    existingUser.passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, salt);
    await existingUser.save();
    logger.info(`Primary profile email synchronized to: ${env.ADMIN_EMAIL}`);
  }

  // 2. Initial Integrations
  const integrationsList = [
    { provider: 'whatsapp', name: 'WhatsApp Business / Direct', connected: false, statusText: 'Polling via Click-to-Chat / Cloud API Ready', configRequired: true },
    { provider: 'telegram', name: 'Telegram Bot API (@devjobs_pk)', connected: false, statusText: 'Webhook / Polling Ready', configRequired: true },
    { provider: 'linkedin', name: 'LinkedIn Stream (#MERN #React)', connected: false, statusText: 'Feed Monitoring Ready', configRequired: true },
    { provider: 'smtp', name: 'SMTP Email Delivery', connected: false, statusText: 'SMTP Credentials Pending', configRequired: true },
    { provider: 'rss', name: 'Tech Internship RSS Feeds', connected: false, statusText: 'Feeds Configured', configRequired: false }
  ];

  for (const item of integrationsList) {
    const exists = await Integration.findOne({ provider: item.provider });
    if (!exists) {
      await Integration.create(item);
    }
  }

  // 3. System Settings
  const settings = await SystemSettings.findOne();
  if (!settings) {
    await SystemSettings.create({
      agentActive: true,
      blocklistedRecruiters: [],
      blocklistedCompanies: [],
      dailyApplicationsSent: 0,
      permittedJobSources: ['whatsapp', 'telegram', 'manual', 'linkedin']
    });
  }

  // 4. Initial System Activity Log
  const logCount = await ActivityLog.countDocuments();
  if (logCount === 0) {
    await ActivityLog.create({
      type: 'system',
      title: 'RizAgent Engine Initialized',
      description: 'System started in single-user mode. MERN stack & React Native target pipeline active.',
      level: 'info'
    });
  }
}

/**
 * Loads cleanly isolated demo data for Demo Mode
 */
export async function seedDemoData(): Promise<void> {
  const existingDemo = await JobOpportunity.findOne({ isDemo: true });
  if (existingDemo) return;

  const demoJobs = [
    {
      title: 'Full-Stack MERN Developer',
      company: 'DevSync Lahore',
      channel: 'whatsapp' as const,
      groupName: 'Pakistan Tech Internships & Jobs',
      poster: 'Hassan Recruiter (DevSync Lahore)',
      contact: '+92 321 8847291',
      contactType: 'whatsapp' as const,
      rawText: 'Urgent hiring! Looking for Full-Stack MERN Developer (React, Node, Express, MongoDB) for a 6-month contract with possibility of full-time. Remote in PK. Share portfolio and CV to WhatsApp: 03218847291.',
      extractedSkills: ['React', 'Node.js', 'Express.js', 'MongoDB', 'REST APIs'],
      matchedTech: ['React.js', 'Node.js', 'Express.js', 'MongoDB'],
      seniority: 'Entry/Mid',
      location: 'Remote (Pakistan)',
      isRemote: true,
      salaryStipend: '80k - 120k PKR',
      matchScore: 96,
      matchExplanation: 'Exact match with MERN stack core competencies (MongoDB, Express, React, Node). Remote Pakistan position.',
      duplicateFingerprint: 'demo-fp-101',
      status: 'auto-sent' as const,
      applicationStatus: 'Submitted' as const,
      pitchSent: "Hi Hassan, I noticed your post regarding the Full-Stack MERN Developer role. I'm Rizwan Ullah, specializing in MongoDB, Express, React, and Node.js. My portfolio is at https://rizwanullah.dev and my resume is attached. Let's discuss!",
      isDemo: true
    },
    {
      title: 'React Native Mobile Developer',
      company: 'InnovateX',
      channel: 'telegram' as const,
      groupName: 'Dev Opportunities PK (@devjobs_pk)',
      poster: 'InnovateX Careers',
      contact: 'jobs@innovatex.io',
      contactType: 'email' as const,
      rawText: 'Junior to Mid-Level React Native Developer needed to collaborate on an ongoing fintech mobile application. Tailwind + React Native CLI. Email resumes to jobs@innovatex.io with subject [Mobile Dev - Riz].',
      extractedSkills: ['React Native', 'Tailwind CSS', 'Mobile UI', 'CLI'],
      matchedTech: ['React Native', 'Tailwind CSS'],
      seniority: 'Junior / Entry-Level',
      location: 'Remote',
      isRemote: true,
      salaryStipend: '70k - 100k PKR',
      matchScore: 89,
      matchExplanation: 'High match on React Native and Tailwind CSS. Junior-friendly fintech application.',
      duplicateFingerprint: 'demo-fp-102',
      status: 'auto-sent' as const,
      applicationStatus: 'Submitted' as const,
      pitchSent: "Hello InnovateX team, I saw your opening for a React Native Developer. As a mobile engineer proficient in React Native and modern UI workflows, I'd love to contribute. Please review my CV attached and portfolio.",
      isDemo: true
    },
    {
      title: 'Frontend React Intern',
      company: 'NextGen Solutions',
      channel: 'whatsapp' as const,
      groupName: 'Pakistan Tech Internships & Jobs',
      poster: 'Ayesha HR',
      contact: '+92 301 5554321',
      contactType: 'whatsapp' as const,
      rawText: 'Need an intern for Frontend React only (Next.js experience a plus). Stipend 30k-40k/month. Direct message portfolio links on WhatsApp.',
      extractedSkills: ['React.js', 'Next.js', 'Frontend'],
      matchedTech: ['React.js', 'Frontend'],
      seniority: 'Internship',
      location: 'Islamabad / Hybrid',
      isRemote: false,
      salaryStipend: '30k-40k/month',
      matchScore: 78,
      matchExplanation: 'Frontend React internship. Match score 78% is below default 80% threshold, requires manual candidate review.',
      duplicateFingerprint: 'demo-fp-103',
      status: 'pending' as const,
      applicationStatus: 'Review Required' as const,
      isDemo: true
    },
    {
      title: 'Senior Java / Spring Boot Architect',
      company: 'CloudGrid Systems',
      channel: 'linkedin' as const,
      groupName: 'LinkedIn Feed Stream',
      poster: 'CloudGrid Systems',
      contact: 'hr@cloudgridsys.com',
      contactType: 'email' as const,
      rawText: 'Hiring Senior Java / Spring Boot architect. 7+ years required in Kubernetes, AWS and microservices architecture.',
      extractedSkills: ['Java', 'Spring Boot', 'Kubernetes', 'AWS'],
      matchedTech: [],
      seniority: 'Senior / Lead',
      location: 'Karachi (On-site)',
      isRemote: false,
      salaryStipend: '350k+ PKR',
      matchScore: 28,
      matchExplanation: 'Senior Java architecture position requiring 7+ years outside target qualifications. Discarded.',
      duplicateFingerprint: 'demo-fp-104',
      status: 'discarded' as const,
      applicationStatus: 'Closed' as const,
      isDemo: true
    }
  ];

  for (const item of demoJobs) {
    const job = await JobOpportunity.create(item);

    // Create demo replies for the first two jobs
    if (item.contact === '+92 321 8847291') {
      await RecruiterConversation.create({
        jobId: job._id,
        jobTitle: item.title,
        company: item.company,
        recruiterName: item.poster,
        recruiterAvatar: 'HR',
        channel: 'WhatsApp',
        contact: item.contact,
        lastMessage: 'Salam Rizwan! Went through your portfolio and MERN demos, specifically the dashboard and APIs. Can we get on a quick 15-min Google Meet call tomorrow at 3:00 PM PKT?',
        read: false,
        status: 'active',
        messages: [
          {
            sender: 'agent',
            text: item.pitchSent || '',
            timestamp: new Date(Date.now() - 25 * 60 * 1000)
          },
          {
            sender: 'recruiter',
            text: 'Salam Rizwan! Went through your portfolio and MERN demos, specifically the dashboard and APIs. Can we get on a quick 15-min Google Meet call tomorrow at 3:00 PM PKT?',
            timestamp: new Date(Date.now() - 10 * 60 * 1000)
          }
        ],
        isDemo: true
      });
    } else if (item.contact === 'jobs@innovatex.io') {
      await RecruiterConversation.create({
        jobId: job._id,
        jobTitle: item.title,
        company: item.company,
        recruiterName: item.poster,
        recruiterAvatar: 'IX',
        channel: 'Email',
        contact: item.contact,
        lastMessage: 'Hi Rizwan, thank you for reaching out promptly. Your React Native experience looks solid. Could you share your GitHub repository links for mobile apps as well?',
        read: false,
        status: 'active',
        messages: [
          {
            sender: 'agent',
            text: item.pitchSent || '',
            timestamp: new Date(Date.now() - 60 * 60 * 1000)
          },
          {
            sender: 'recruiter',
            text: 'Hi Rizwan, thank you for reaching out promptly. Your React Native experience looks solid. Could you share your GitHub repository links for mobile apps as well?',
            timestamp: new Date(Date.now() - 45 * 60 * 1000)
          }
        ],
        isDemo: true
      });
    }
  }

  logger.info('Demo seed data populated for Demo Mode testing.');
}
