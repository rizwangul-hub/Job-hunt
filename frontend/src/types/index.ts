export type ChannelType = 'whatsapp' | 'telegram' | 'linkedin' | 'manual' | 'rss';
export type ContactType = 'whatsapp' | 'email' | 'url';

export type ApplicationStatus =
  | 'Discovered'
  | 'Analysing'
  | 'Matched'
  | 'Review Required'
  | 'Approved'
  | 'Preparing Application'
  | 'Awaiting Human Verification'
  | 'Ready to Submit'
  | 'Submitted'
  | 'Submission Unconfirmed'
  | 'Failed'
  | 'Rejected'
  | 'Interview'
  | 'Offer'
  | 'Closed';

export type AutomationMode = 'REVIEW_ONLY' | 'APPROVAL_REQUIRED' | 'RESTRICTED_AUTO_APPLY';

export interface UserCV {
  _id: string;
  name: string;
  category: 'Full Stack / MERN' | 'React / Frontend' | 'React Native / Mobile' | 'Internship / Junior';
  filename: string;
  filepath: string;
  filesize: number;
  uploadedAt: string;
  isDefault: boolean;
  isValid: boolean;
}

export interface UserProfile {
  _id?: string;
  fullName: string;
  handle: string;
  email: string;
  phone: string;
  whatsapp: string;
  portfolioUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  targetRoles: string[];
  skills: string[];
  education: Array<{
    institution: string;
    degree: string;
    year: string;
  }>;
  experience: Array<{
    title: string;
    company: string;
    period: string;
    description: string;
  }>;
  projects: Array<{
    title: string;
    description: string;
    tech: string[];
    link?: string;
  }>;
  cvs: UserCV[];
  preferences: {
    minMatchThreshold: number;
    preferredLocation: string;
    remoteOnly: boolean;
    internshipsJuniorOnly: boolean;
    targetSalary: string;
    maxApplicationsPerDay: number;
    automationMode: AutomationMode;
    pitchTemplate: string;
  };
}

export interface JobOpportunity {
  _id: string;
  id?: string;
  title: string;
  company: string;
  channel: ChannelType;
  groupName: string;
  poster: string;
  contact: string;
  contactType: ContactType;
  rawText: string;
  extractedSkills: string[];
  matchedTech: string[];
  seniority: string;
  location: string;
  isRemote: boolean;
  salaryStipend?: string;
  deadline?: string;
  applicationUrl?: string;
  matchScore: number;
  matchExplanation: string;
  status: 'pending' | 'auto-sent' | 'discarded' | 'approved' | 'rejected';
  applicationStatus: ApplicationStatus;
  pitchSent?: string | null;
  discoveredAt: string;
  timeAgo?: string;
  isDemo?: boolean;
}

export interface RecruiterMessage {
  _id?: string;
  sender: 'agent' | 'recruiter';
  text: string;
  timestamp: string;
  time?: string;
}

export interface RecruiterConversation {
  _id: string;
  id?: string;
  jobId: string;
  jobTitle?: string;
  company?: string;
  recruiterName: string;
  recruiterAvatar?: string;
  channel: 'WhatsApp' | 'Email' | 'Telegram';
  contact: string;
  lastMessage: string;
  updatedAt: string;
  timeAgo?: string;
  read: boolean;
  messages: RecruiterMessage[];
  status: 'active' | 'interview_scheduled' | 'archived';
  isDemo?: boolean;
}

export interface ApplicationRecord {
  _id: string;
  jobId: string | JobOpportunity;
  cvUsed: string;
  mode: AutomationMode;
  status: ApplicationStatus;
  draftCoverLetter?: string;
  draftMessage?: string;
  screenshotUrl?: string;
  errorLog?: string;
  humanVerificationRequired?: boolean;
  verificationReason?: string;
  submittedAt?: string;
  confirmationCode?: string;
  createdAt: string;
  approvalHistory: Array<{
    action: string;
    timestamp: string;
    note?: string;
  }>;
}

export interface DashboardStats {
  scannedToday: number;
  analyzedTotal: number;
  fullStackMatches: number;
  awaitingApproval: number;
  submittedSuccessfully: number;
  requiringAttention: number;
  failedAttempts: number;
  recruiterRepliesCount: number;
  unreadRepliesCount: number;
}

export interface IntegrationStatus {
  provider: 'whatsapp' | 'telegram' | 'linkedin' | 'smtp' | 'rss';
  name: string;
  connected: boolean;
  statusText: string;
  lastSync?: string;
  configRequired: boolean;
  permissionsVerified: boolean;
  details?: Record<string, any>;
}

export interface ActivityItem {
  _id: string;
  type: 'discovery' | 'analysis' | 'approval' | 'submission' | 'error' | 'reply' | 'system';
  title: string;
  description: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  relatedJobId?: string;
}
