import mongoose, { Schema, Document } from 'mongoose';

export interface IApplication extends Document {
  jobId: mongoose.Types.ObjectId;
  cvUsed: string;
  mode: 'REVIEW_ONLY' | 'APPROVAL_REQUIRED' | 'RESTRICTED_AUTO_APPLY';
  status:
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
  draftCoverLetter?: string;
  draftMessage?: string;
  screenshotUrl?: string;
  errorLog?: string;
  humanVerificationRequired: boolean;
  verificationReason?: string;
  submittedAt?: Date;
  confirmationCode?: string;
  approvalHistory: Array<{
    action: string;
    timestamp: Date;
    note?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'JobOpportunity', required: true, index: true },
    cvUsed: { type: String, required: true },
    mode: {
      type: String,
      enum: ['REVIEW_ONLY', 'APPROVAL_REQUIRED', 'RESTRICTED_AUTO_APPLY'],
      default: 'APPROVAL_REQUIRED'
    },
    status: {
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
      default: 'Review Required'
    },
    draftCoverLetter: { type: String },
    draftMessage: { type: String },
    screenshotUrl: { type: String },
    errorLog: { type: String },
    humanVerificationRequired: { type: Boolean, default: false },
    verificationReason: { type: String },
    submittedAt: { type: Date },
    confirmationCode: { type: String },
    approvalHistory: [
      {
        action: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String }
      }
    ]
  },
  { timestamps: true }
);

export const Application = mongoose.model<IApplication>('Application', ApplicationSchema);
