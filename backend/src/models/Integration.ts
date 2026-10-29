import mongoose, { Schema, Document } from 'mongoose';

export interface IIntegration extends Document {
  provider: 'whatsapp' | 'telegram' | 'linkedin' | 'smtp' | 'rss';
  name: string;
  connected: boolean;
  statusText: string;
  lastSync?: Date;
  configRequired: boolean;
  permissionsVerified: boolean;
  configMetadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>(
  {
    provider: {
      type: String,
      required: true,
      unique: true,
      enum: ['whatsapp', 'telegram', 'linkedin', 'smtp', 'rss']
    },
    name: { type: String, required: true },
    connected: { type: Boolean, default: false },
    statusText: { type: String, default: 'Not Configured' },
    lastSync: { type: Date },
    configRequired: { type: Boolean, default: true },
    permissionsVerified: { type: Boolean, default: false },
    configMetadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export const Integration = mongoose.model<IIntegration>('Integration', IntegrationSchema);
