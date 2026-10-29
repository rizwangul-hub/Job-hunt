import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  type: 'discovery' | 'analysis' | 'approval' | 'submission' | 'error' | 'reply' | 'system';
  title: string;
  description: string;
  level: 'info' | 'success' | 'warning' | 'error';
  relatedJobId?: mongoose.Types.ObjectId;
  timestamp: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    type: {
      type: String,
      required: true,
      enum: ['discovery', 'analysis', 'approval', 'submission', 'error', 'reply', 'system']
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    level: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info'
    },
    relatedJobId: { type: Schema.Types.ObjectId, ref: 'JobOpportunity' },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
