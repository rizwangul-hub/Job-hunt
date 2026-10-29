import mongoose, { Schema, Document } from 'mongoose';

export interface IRecruiterMessage {
  sender: 'agent' | 'recruiter';
  text: string;
  timestamp: Date;
}

export interface IRecruiterConversation extends Document {
  jobId?: mongoose.Types.ObjectId;
  jobTitle?: string;
  company?: string;
  recruiterName: string;
  recruiterAvatar?: string;
  channel: 'WhatsApp' | 'Email' | 'Telegram';
  contact: string;
  lastMessage: string;
  read: boolean;
  status: 'active' | 'interview_scheduled' | 'archived';
  messages: IRecruiterMessage[];
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecruiterMessageSchema = new Schema<IRecruiterMessage>({
  sender: { type: String, enum: ['agent', 'recruiter'], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const RecruiterConversationSchema = new Schema<IRecruiterConversation>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'JobOpportunity', required: false, index: true },
    jobTitle: { type: String, default: '' },
    company: { type: String, default: '' },
    recruiterName: { type: String, required: true },
    recruiterAvatar: { type: String, default: 'HR' },
    channel: { type: String, enum: ['WhatsApp', 'Email', 'Telegram'], required: true },
    contact: { type: String, required: true },
    lastMessage: { type: String, required: true },
    read: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'interview_scheduled', 'archived'],
      default: 'active'
    },
    messages: [RecruiterMessageSchema],
    isDemo: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const RecruiterConversation = mongoose.model<IRecruiterConversation>(
  'RecruiterConversation',
  RecruiterConversationSchema
);
