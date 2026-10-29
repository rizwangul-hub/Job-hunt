import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
  agentActive: boolean;
  blocklistedRecruiters: string[];
  blocklistedCompanies: string[];
  dailyApplicationsSent: number;
  lastDailyReset: Date;
  permittedJobSources: string[];
  demoModeDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    agentActive: { type: Boolean, default: true },
    blocklistedRecruiters: { type: [String], default: [] },
    blocklistedCompanies: { type: [String], default: [] },
    dailyApplicationsSent: { type: Number, default: 0 },
    lastDailyReset: { type: Date, default: Date.now },
    permittedJobSources: {
      type: [String],
      default: ['whatsapp', 'telegram', 'manual', 'linkedin']
    },
    demoModeDefault: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const SystemSettings = mongoose.model<ISystemSettings>(
  'SystemSettings',
  SystemSettingsSchema
);
