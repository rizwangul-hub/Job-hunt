import mongoose, { Schema, Document } from 'mongoose';

export interface IJobOpportunity extends Document {
  title: string;
  company: string;
  channel: 'whatsapp' | 'telegram' | 'linkedin' | 'manual' | 'rss';
  groupName: string;
  poster: string;
  contact: string;
  contactType: 'whatsapp' | 'email' | 'url';
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
  duplicateFingerprint: string;
  status: 'pending' | 'auto-sent' | 'discarded' | 'approved' | 'rejected';
  applicationStatus:
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
  pitchSent?: string | null;
  discoveredAt: Date;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const JobOpportunitySchema = new Schema<IJobOpportunity>(
  {
    title: { type: String, required: true },
    company: { type: String, required: true, default: 'Undisclosed' },
    channel: {
      type: String,
      enum: ['whatsapp', 'telegram', 'linkedin', 'manual', 'rss'],
      default: 'manual'
    },
    groupName: { type: String, default: 'Direct Input' },
    poster: { type: String, default: 'Recruiter' },
    contact: { type: String, default: 'N/A' },
    contactType: {
      type: String,
      enum: ['whatsapp', 'email', 'url'],
      default: 'email'
    },
    rawText: { type: String, required: true },
    extractedSkills: { type: [String], default: [] },
    matchedTech: { type: [String], default: [] },
    seniority: { type: String, default: 'Entry/Mid' },
    location: { type: String, default: 'Remote' },
    isRemote: { type: Boolean, default: true },
    salaryStipend: { type: String },
    deadline: { type: String },
    applicationUrl: { type: String },
    matchScore: { type: Number, default: 0, min: 0, max: 100 },
    matchExplanation: { type: String, default: '' },
    duplicateFingerprint: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'auto-sent', 'discarded', 'approved', 'rejected'],
      default: 'pending'
    },
    applicationStatus: {
      type: String,
      enum: [
        'Discovered',
        'Analysing',
        'Matched',
        'Review Required',
        'Approved',
        'Preparing Application',
        'Awaiting Human Verification',
        'Ready to Submit',
        'Submitted',
        'Submission Unconfirmed',
        'Failed',
        'Rejected',
        'Interview',
        'Offer',
        'Closed'
      ],
      default: 'Discovered'
    },
    pitchSent: { type: String, default: null },
    discoveredAt: { type: Date, default: Date.now },
    isDemo: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const JobOpportunity = mongoose.model<IJobOpportunity>('JobOpportunity', JobOpportunitySchema);
