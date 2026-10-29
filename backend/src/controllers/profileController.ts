import { Response } from 'express';
import { UserProfile } from '../models/UserProfile';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export async function getProfile(req: any, res: Response): Promise<void> {
  const profile = await UserProfile.findById(req.user.id).select('-passwordHash');
  if (!profile) {
    res.status(404).json({ success: false, message: 'Profile not found' });
    return;
  }
  res.json({ success: true, profile });
}

export async function updateProfile(req: any, res: Response): Promise<void> {
  const allowedUpdates = [
    'fullName',
    'handle',
    'phone',
    'whatsapp',
    'portfolioUrl',
    'linkedinUrl',
    'githubUrl',
    'targetRoles',
    'skills',
    'education',
    'experience',
    'projects',
    'preferences'
  ];

  const updateData: any = {};
  for (const field of allowedUpdates) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  const profile = await UserProfile.findByIdAndUpdate(
    req.user.id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-passwordHash');

  res.json({ success: true, message: 'Profile updated successfully', profile });
}

export async function uploadCV(req: any, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded or invalid file format.' });
    return;
  }

  const file = req.file;
  const category = req.body.category || 'Full Stack / MERN';
  const customName = req.body.name || file.originalname;

  // Verify file readability
  try {
    const stats = fs.statSync(file.path);
    if (stats.size === 0) {
      fs.unlinkSync(file.path);
      res.status(400).json({ success: false, message: 'Uploaded CV file is empty.' });
      return;
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Could not access uploaded CV file.' });
    return;
  }

  const profile = await UserProfile.findById(req.user.id);
  if (!profile) {
    res.status(404).json({ success: false, message: 'User profile not found.' });
    return;
  }

  const isFirstCV = profile.cvs.length === 0;

  const newCV = {
    name: customName,
    category,
    filename: file.filename,
    filepath: file.path,
    filesize: file.size,
    uploadedAt: new Date(),
    isDefault: isFirstCV || req.body.isDefault === 'true',
    isValid: true
  };

  // If set to default, unset other defaults
  if (newCV.isDefault) {
    profile.cvs.forEach(c => { c.isDefault = false; });
  }

  profile.cvs.push(newCV as any);
  await profile.save();

  logger.info(`CV "${newCV.name}" uploaded successfully for ${profile.email}`);

  res.json({
    success: true,
    message: 'CV uploaded and verified successfully',
    cv: profile.cvs[profile.cvs.length - 1]
  });
}

export async function deleteCV(req: any, res: Response): Promise<void> {
  const { id } = req.params;
  const profile = await UserProfile.findById(req.user.id);
  if (!profile) {
    res.status(404).json({ success: false, message: 'Profile not found' });
    return;
  }

  const cvIndex = profile.cvs.findIndex(c => (c._id as any).toString() === id);
  if (cvIndex === -1) {
    res.status(404).json({ success: false, message: 'CV not found' });
    return;
  }

  const cv = profile.cvs[cvIndex];
  if (fs.existsSync(cv.filepath)) {
    try {
      fs.unlinkSync(cv.filepath);
    } catch (err: any) {
      logger.warn(`Could not delete file at ${cv.filepath}:`, err.message);
    }
  }

  profile.cvs.splice(cvIndex, 1);
  if (cv.isDefault && profile.cvs.length > 0) {
    profile.cvs[0].isDefault = true;
  }

  await profile.save();
  res.json({ success: true, message: 'CV removed successfully' });
}
