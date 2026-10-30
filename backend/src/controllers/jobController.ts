import { Response } from 'express';
import { JobOpportunity } from '../models/JobOpportunity';
import { Application } from '../models/Application';
import { UserProfile } from '../models/UserProfile';
import { ActivityLog } from '../models/ActivityLog';
import { SystemSettings } from '../models/SystemSettings';
import { aiService } from '../services/ai/aiService';
import { ScoringEngine } from '../services/matching/scoringEngine';
import { browserWorker } from '../services/browser-automation/browserWorker';
import { whatsAppService, WhatsAppService } from '../services/messaging/whatsAppService';
import { emailService } from '../services/messaging/emailService';
import { validateSafeUrl } from '../services/browser-automation/urlSafety';
import { logger } from '../utils/logger';

export async function getJobs(req: any, res: Response): Promise<void> {
  const isDemo = req.query.demo === 'true';
  const filter = req.query.filter as string; // 'all', 'auto-sent', 'pending', 'discarded'
  const search = req.query.search as string;

  const query: any = { isDemo };

  if (filter && filter !== 'all') {
    query.status = filter;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
      { rawText: { $regex: search, $options: 'i' } },
      { poster: { $regex: search, $options: 'i' } },
    ];
  }

  const jobs = await JobOpportunity.find(query).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, count: jobs.length, jobs });
}

export async function submitManualJob(req: any, res: Response): Promise<void> {
  const { rawText, channel = 'manual', groupName = 'Manual Input' } = req.body;

  if (!rawText || !rawText.trim()) {
    res.status(400).json({ success: false, message: 'Job post content or URL is required.' });
    return;
  }

  const user = await UserProfile.findById(req.user.id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User profile not found.' });
    return;
  }

  // 1. Extract Details via AI
  const extracted = await aiService.extractJobDetails(rawText);

  // 2. Duplicate Detection Fingerprint
  const fingerprint = ScoringEngine.calculateFingerprint({
    company: extracted.company,
    title: extracted.title,
    rawText,
    contact: extracted.contact
  });

  const existing = await JobOpportunity.findOne({ duplicateFingerprint: fingerprint });
  if (existing) {
    res.status(409).json({
      success: false,
      message: `Duplicate opportunity detected! This job was already logged as ID: ${existing._id}`,
      job: existing
    });
    return;
  }

  // 3. Match Evaluation
  const evalResult = ScoringEngine.evaluateJob({
    title: extracted.title,
    seniority: extracted.seniority,
    matchedTech: extracted.matchedTech,
    isRemote: extracted.isRemote,
    location: extracted.location,
    criteria: {
      targetRoles: user.targetRoles,
      skills: user.skills,
      remoteOnly: user.preferences.remoteOnly,
      internshipsJuniorOnly: user.preferences.internshipsJuniorOnly,
      minMatchThreshold: user.preferences.minMatchThreshold
    }
  });

  // 4. Determine Action Status according to Automation Mode
  let status: 'pending' | 'auto-sent' | 'discarded' = 'pending';
  let appStatus: any = 'Discovered';
  let pitchSent: string | null = null;
  let clickToChatUrl: string | undefined = undefined;

  // Generate Click-to-Chat URL in advance if contact is a phone/WhatsApp contact
  if (extracted.contactType === 'whatsapp' && extracted.contact && extracted.contact !== 'N/A') {
    const defaultPitch = user.preferences.pitchTemplate
      .replace(/{{contact_name}}/g, extracted.poster || 'Hiring Team')
      .replace(/{{role_title}}/g, extracted.title)
      .replace(/{{matched_tech}}/g, extracted.matchedTech.join(', '))
      .replace(/{{portfolio_url}}/g, user.portfolioUrl)
      .replace(/{{linkedin_url}}/g, user.linkedinUrl)
      .replace(/{{github_url}}/g, user.githubUrl);
    clickToChatUrl = WhatsAppService.generateClickToChatUrl(extracted.contact, defaultPitch);
  }

  const mode = user.preferences.automationMode; // 'REVIEW_ONLY' | 'APPROVAL_REQUIRED' | 'RESTRICTED_AUTO_APPLY'

  if (evalResult.score < user.preferences.minMatchThreshold) {
    status = 'discarded';
    appStatus = 'Closed';
  } else if (mode === 'RESTRICTED_AUTO_APPLY' && evalResult.isEligibleForAutoApply) {
    // Check Daily Application Limits
    const settings = await SystemSettings.findOne();
    if (settings && settings.dailyApplicationsSent >= user.preferences.maxApplicationsPerDay) {
      status = 'pending';
      appStatus = 'Review Required';
      logger.warn('Daily application limit reached. Holding opportunity for review.');
    } else {
      // Prepare pitch
      pitchSent = user.preferences.pitchTemplate
        .replace(/{{contact_name}}/g, extracted.poster)
        .replace(/{{role_title}}/g, extracted.title)
        .replace(/{{matched_tech}}/g, extracted.matchedTech.join(', '))
        .replace(/{{portfolio_url}}/g, user.portfolioUrl)
        .replace(/{{linkedin_url}}/g, user.linkedinUrl)
        .replace(/{{github_url}}/g, user.githubUrl);

      status = 'auto-sent';
      appStatus = 'Submitted';

      // 5. DIRECT DISPATCH: If recruiter contact is email, automatically send email with CV & Portfolio
      const defaultCV = user.cvs.find(c => c.isDefault) || user.cvs[0];
      if (extracted.contactType === 'email' && extracted.contact.includes('@')) {
        try {
          const emailRes = await emailService.sendApplicationEmail({
            to: extracted.contact,
            subject: `Application for ${extracted.title} — ${user.fullName}`,
            body: pitchSent,
            cvFilePath: defaultCV?.filepath
          });
          if (emailRes.success) {
            logger.info(`Automated application email dispatched directly to ${extracted.contact}`);
            await ActivityLog.create({
              type: 'application',
              title: `Direct Email Dispatched: ${extracted.title}`,
              description: `CV & tailored pitch sent to ${extracted.contact}`,
              level: 'success'
            });
          }
        } catch (e: any) {
          logger.error('Auto email dispatch failed:', e.message);
        }
      }
    }
  } else {
    // Default Mode B or Mode A: requires approval
    status = 'pending';
    appStatus = 'Review Required';
  }

  const job = new JobOpportunity({
    title: extracted.title,
    company: extracted.company,
    channel,
    groupName,
    poster: extracted.poster,
    contact: extracted.contact,
    contactType: extracted.contactType,
    rawText,
    extractedSkills: extracted.extractedSkills,
    matchedTech: extracted.matchedTech,
    seniority: extracted.seniority,
    location: extracted.location,
    isRemote: extracted.isRemote,
    salaryStipend: extracted.salaryStipend,
    applicationUrl: extracted.applicationUrl,
    clickToChatUrl,
    matchScore: evalResult.score,
    matchExplanation: evalResult.explanation,
    duplicateFingerprint: fingerprint,
    status,
    applicationStatus: appStatus,
    pitchSent,
    discoveredAt: new Date(),
    isDemo: false
  });

  await job.save();

  // Activity Log
  await ActivityLog.create({
    type: 'discovery',
    title: `Job Lead Analyzed: ${job.title}`,
    description: `Match score ${job.matchScore}%. Action: ${job.status}. Company: ${job.company}`,
    level: job.matchScore >= 80 ? 'success' : 'info',
    relatedJobId: job._id
  });

  res.status(201).json({
    success: true,
    message: 'Job processed and evaluated successfully',
    job
  });
}

export async function analyseJobOnly(req: any, res: Response): Promise<void> {
  const { rawText } = req.body;
  if (!rawText) {
    res.status(400).json({ success: false, message: 'Text required' });
    return;
  }

  const user = await UserProfile.findById(req.user.id);
  const extracted = await aiService.extractJobDetails(rawText);

  const evalResult = ScoringEngine.evaluateJob({
    title: extracted.title,
    seniority: extracted.seniority,
    matchedTech: extracted.matchedTech,
    isRemote: extracted.isRemote,
    location: extracted.location,
    criteria: {
      targetRoles: user?.targetRoles || [],
      skills: user?.skills || [],
      remoteOnly: user?.preferences.remoteOnly || false,
      internshipsJuniorOnly: user?.preferences.internshipsJuniorOnly || false,
      minMatchThreshold: user?.preferences.minMatchThreshold || 80
    }
  });

  res.json({
    success: true,
    extracted,
    evaluation: evalResult
  });
}

export async function getJobById(req: any, res: Response): Promise<void> {
  const job = await JobOpportunity.findById(req.params.id);
  if (!job) {
    res.status(404).json({ success: false, message: 'Job not found' });
    return;
  }

  const application = await Application.findOne({ jobId: job._id });

  res.json({ success: true, job, application });
}

export async function prepareApplication(req: any, res: Response): Promise<void> {
  const job = await JobOpportunity.findById(req.params.id);
  if (!job) {
    res.status(404).json({ success: false, message: 'Job not found' });
    return;
  }

  const user = await UserProfile.findById(req.user.id);
  if (!user) {
    res.status(404).json({ success: false, message: 'Profile not found' });
    return;
  }

  // Generate tailored cover letter / pitch
  const coverLetter = await aiService.generateCoverLetter({
    jobTitle: job.title,
    company: job.company,
    matchedTech: job.matchedTech,
    portfolioUrl: user.portfolioUrl,
    linkedinUrl: user.linkedinUrl,
    githubUrl: user.githubUrl,
    contactName: job.poster
  });

  const pitchMessage = user.preferences.pitchTemplate
    .replace(/{{contact_name}}/g, job.poster)
    .replace(/{{role_title}}/g, job.title)
    .replace(/{{matched_tech}}/g, job.matchedTech.join(', '))
    .replace(/{{portfolio_url}}/g, user.portfolioUrl)
    .replace(/{{linkedin_url}}/g, user.linkedinUrl)
    .replace(/{{github_url}}/g, user.githubUrl);

  // If application URL is present, inspect page with browser worker
  let browserInspection = null;
  if (job.applicationUrl) {
    browserInspection = await browserWorker.inspectPage(job.applicationUrl);
  }

  // Pre-generate WhatsApp 1-Click Outreach URL
  let clickToChatUrl = job.clickToChatUrl;
  if (job.contactType === 'whatsapp' && job.contact && job.contact !== 'N/A') {
    clickToChatUrl = WhatsAppService.generateClickToChatUrl(job.contact, pitchMessage);
  }

  res.json({
    success: true,
    coverLetter,
    pitchMessage,
    clickToChatUrl,
    browserInspection
  });
}

export async function approveJob(req: any, res: Response): Promise<void> {
  const job = await JobOpportunity.findById(req.params.id);
  if (!job) {
    res.status(404).json({ success: false, message: 'Job not found' });
    return;
  }

  const user = await UserProfile.findById(req.user.id);
  const customMessage = req.body.message || job.pitchSent || 'Inquiring regarding opening.';
  const defaultCV = user?.cvs.find(c => c.isDefault) || user?.cvs[0];

  let actionResult: any = { success: true };

  // Dispatch according to contact type
  if (job.contactType === 'whatsapp' && job.contact !== 'N/A') {
    const waResult = await whatsAppService.sendOrPrepareOutreach({
      recipientPhone: job.contact,
      messageText: customMessage
    });
    actionResult = waResult;
    if (waResult.clickToChatUrl) {
      job.clickToChatUrl = waResult.clickToChatUrl;
    }
  } else if (job.contactType === 'email' && job.contact.includes('@')) {
    const emResult = await emailService.sendApplicationEmail({
      to: job.contact,
      subject: `Application for ${job.title} — ${user?.fullName}`,
      body: customMessage,
      cvFilePath: defaultCV?.filepath
    });
    actionResult = emResult;
  } else if (job.applicationUrl) {
    // Playwright browser form submission
    const formResult = await browserWorker.prepareAndFillApplication({
      applicationUrl: job.applicationUrl,
      profile: {
        fullName: user?.fullName || 'Rizwan Ullah',
        email: user?.email || '',
        phone: user?.phone || '',
        portfolioUrl: user?.portfolioUrl || '',
        linkedinUrl: user?.linkedinUrl || '',
        githubUrl: user?.githubUrl || ''
      },
      cvFilePath: defaultCV?.filepath,
      coverLetterText: customMessage,
      shouldSubmit: true
    });
    actionResult = formResult;
  }

  job.status = 'auto-sent';
  job.applicationStatus = 'Submitted';
  job.pitchSent = customMessage;
  await job.save();

  // Create Application Record
  await Application.create({
    jobId: job._id,
    cvUsed: defaultCV ? defaultCV.name : 'No CV Attached',
    mode: user?.preferences.automationMode || 'APPROVAL_REQUIRED',
    status: 'Submitted',
    draftMessage: customMessage,
    submittedAt: new Date(),
    approvalHistory: [
      {
        action: 'Manual Approval by Candidate',
        timestamp: new Date(),
        note: `Approved and dispatched via ${job.contactType}`
      }
    ]
  });

  await ActivityLog.create({
    type: 'approval',
    title: `Approved & Dispatched: ${job.title}`,
    description: `Outreach dispatched to ${job.poster} (${job.contact})`,
    level: 'success',
    relatedJobId: job._id
  });

  res.json({
    success: true,
    message: 'Opportunity approved and dispatched.',
    job,
    actionResult
  });
}

export async function batchIngestGroupJobs(req: any, res: Response): Promise<void> {
  const { messages, channel = 'whatsapp', groupName = 'WhatsApp Job Group' } = req.body;

  if (!messages || (!Array.isArray(messages) && typeof messages !== 'string')) {
    res.status(400).json({ success: false, message: 'Array of messages or raw group dump string required.' });
    return;
  }

  const user = await UserProfile.findById(req.user.id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User profile not found.' });
    return;
  }

  // Parse raw text messages split by dividers or line breaks
  let postList: string[] = [];
  if (Array.isArray(messages)) {
    postList = messages.map(m => String(m).trim()).filter(m => m.length > 20);
  } else {
    // Split by common message dividers: multiple newlines, date stamps, or dashes
    postList = messages
      .split(/\n\s*[-—=]{3,}\s*\n|\n{2,}/g)
      .map(m => m.trim())
      .filter(m => m.length > 20);
  }

  const results: any[] = [];
  const defaultCV = user.cvs.find(c => c.isDefault) || user.cvs[0];

  for (const rawText of postList.slice(0, 30)) {
    try {
      // 1. Extract Details via AI
      const extracted = await aiService.extractJobDetails(rawText);

      // Skip invalid / noise messages
      if (!extracted.title || extracted.title === 'Undisclosed Role' || extracted.title.length < 3) {
        continue;
      }

      // 2. Duplicate Detection Fingerprint
      const fingerprint = ScoringEngine.calculateFingerprint({
        company: extracted.company,
        title: extracted.title,
        rawText,
        contact: extracted.contact
      });

      const existing = await JobOpportunity.findOne({ duplicateFingerprint: fingerprint });
      if (existing) {
        continue; // Skip already ingested
      }

      // 3. Match Evaluation
      const evalResult = ScoringEngine.evaluateJob({
        title: extracted.title,
        seniority: extracted.seniority,
        matchedTech: extracted.matchedTech,
        isRemote: extracted.isRemote,
        location: extracted.location,
        criteria: {
          targetRoles: user.targetRoles,
          skills: user.skills,
          remoteOnly: user.preferences.remoteOnly,
          internshipsJuniorOnly: user.preferences.internshipsJuniorOnly,
          minMatchThreshold: user.preferences.minMatchThreshold
        }
      });

      // 4. Generate Pre-filled Pitch
      const pitchMessage = user.preferences.pitchTemplate
        .replace(/{{contact_name}}/g, extracted.poster || 'Hiring Team')
        .replace(/{{role_title}}/g, extracted.title)
        .replace(/{{matched_tech}}/g, extracted.matchedTech.join(', '))
        .replace(/{{portfolio_url}}/g, user.portfolioUrl)
        .replace(/{{linkedin_url}}/g, user.linkedinUrl)
        .replace(/{{github_url}}/g, user.githubUrl);

      let clickToChatUrl: string | undefined = undefined;
      if (extracted.contactType === 'whatsapp' && extracted.contact && extracted.contact !== 'N/A') {
        clickToChatUrl = WhatsAppService.generateClickToChatUrl(extracted.contact, pitchMessage);
      }

      let status: 'pending' | 'auto-sent' | 'discarded' = 'pending';
      let appStatus: any = 'Review Required';
      let directActionTaken = 'Queued for Review';

      // Auto-dispatch if candidate is high match and automation mode permits or direct email is found
      const isAutoSend = evalResult.score >= user.preferences.minMatchThreshold && evalResult.isEligibleForAutoApply;
      if (isAutoSend && extracted.contactType === 'email' && extracted.contact.includes('@')) {
        try {
          const emailRes = await emailService.sendApplicationEmail({
            to: extracted.contact,
            subject: `Application for ${extracted.title} — ${user.fullName}`,
            body: pitchMessage,
            cvFilePath: defaultCV?.filepath
          });
          if (emailRes.success) {
            status = 'auto-sent';
            appStatus = 'Submitted';
            directActionTaken = `Direct Email Dispatched with CV to ${extracted.contact}`;
          }
        } catch (e: any) {
          logger.warn(`Auto-email failed for ${extracted.contact}: ${e.message}`);
        }
      } else if (isAutoSend && extracted.contactType === 'whatsapp' && clickToChatUrl) {
        status = 'pending';
        appStatus = 'Ready to Submit';
        directActionTaken = '1-Click WhatsApp Link Ready';
      }

      const job = await JobOpportunity.create({
        title: extracted.title,
        company: extracted.company,
        channel,
        groupName,
        poster: extracted.poster,
        contact: extracted.contact,
        contactType: extracted.contactType,
        rawText,
        extractedSkills: extracted.extractedSkills,
        matchedTech: extracted.matchedTech,
        seniority: extracted.seniority,
        location: extracted.location,
        isRemote: extracted.isRemote,
        salaryStipend: extracted.salaryStipend,
        applicationUrl: extracted.applicationUrl,
        clickToChatUrl,
        matchScore: evalResult.score,
        matchExplanation: evalResult.explanation,
        duplicateFingerprint: fingerprint,
        status,
        applicationStatus: appStatus,
        pitchSent: isAutoSend ? pitchMessage : null,
        discoveredAt: new Date(),
        isDemo: false
      });

      results.push({
        title: job.title,
        company: job.company,
        matchScore: job.matchScore,
        contact: job.contact,
        contactType: job.contactType,
        action: directActionTaken,
        clickToChatUrl
      });
    } catch (err: any) {
      logger.error('Error processing batch job lead:', err.message);
    }
  }

  res.json({
    success: true,
    processedCount: results.length,
    jobs: results
  });
}

export async function rejectJob(req: any, res: Response): Promise<void> {
  const job = await JobOpportunity.findById(req.params.id);
  if (!job) {
    res.status(404).json({ success: false, message: 'Job not found' });
    return;
  }

  job.status = 'rejected';
  job.applicationStatus = 'Rejected';
  await job.save();

  await ActivityLog.create({
    type: 'approval',
    title: `Candidate Rejected: ${job.title}`,
    description: `Manually dismissed opportunity at ${job.company}`,
    level: 'info',
    relatedJobId: job._id
  });

  res.json({ success: true, message: 'Job rejected', job });
}

export async function previewUrlSafety(req: any, res: Response): Promise<void> {
  const { url } = req.body;
  const result = await validateSafeUrl(url);
  if (!result.isSafe) {
    res.status(400).json({ success: false, reason: result.reason });
    return;
  }
  const inspect = await browserWorker.inspectPage(url);
  res.json({ success: true, inspect });
}
