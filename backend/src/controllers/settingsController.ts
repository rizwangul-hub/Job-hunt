import { Response } from 'express';
import { SystemSettings } from '../models/SystemSettings';
import { UserProfile } from '../models/UserProfile';

export async function getSettings(req: any, res: Response): Promise<void> {
  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = await SystemSettings.create({});
  }

  const user = await UserProfile.findById(req.user.id).select('preferences targetRoles skills');

  res.json({
    success: true,
    systemSettings: settings,
    userPreferences: user?.preferences,
    targetRoles: user?.targetRoles,
    targetSkills: user?.skills
  });
}

export async function updateSettings(req: any, res: Response): Promise<void> {
  const {
    agentActive,
    blocklistedRecruiters,
    blocklistedCompanies,
    permittedJobSources,
    preferences,
    targetRoles,
    targetSkills
  } = req.body;

  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = new SystemSettings();
  }

  if (agentActive !== undefined) settings.agentActive = agentActive;
  if (blocklistedRecruiters !== undefined) settings.blocklistedRecruiters = blocklistedRecruiters;
  if (blocklistedCompanies !== undefined) settings.blocklistedCompanies = blocklistedCompanies;
  if (permittedJobSources !== undefined) settings.permittedJobSources = permittedJobSources;
  await settings.save();

  // Update user profile preferences if provided
  if (preferences || targetRoles || targetSkills) {
    const userUpdate: any = {};
    if (preferences) userUpdate.preferences = preferences;
    if (targetRoles) userUpdate.targetRoles = targetRoles;
    if (targetSkills) userUpdate.skills = targetSkills;

    await UserProfile.findByIdAndUpdate(req.user.id, { $set: userUpdate });
  }

  res.json({
    success: true,
    message: 'Settings updated successfully',
    settings
  });
}

export async function toggleAgent(req: any, res: Response): Promise<void> {
  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = await SystemSettings.create({});
  }

  settings.agentActive = !settings.agentActive;
  await settings.save();

  res.json({
    success: true,
    agentActive: settings.agentActive,
    message: settings.agentActive ? 'Agent monitoring activated' : 'Agent monitoring paused'
  });
}
