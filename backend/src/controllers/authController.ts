import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserProfile } from '../models/UserProfile';
import { env } from '../config/env';
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await UserProfile.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(401).json({ success: false, message: 'Invalid credentials.' });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    res.status(401).json({ success: false, message: 'Invalid credentials.' });
    return;
  }

  const token = jwt.sign(
    { id: user._id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any }
  );

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      handle: user.handle
    }
  });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, message: 'Logged out successfully.' });
}

export async function getCurrentUser(req: any, res: Response): Promise<void> {
  const user = await UserProfile.findById(req.user.id).select('-passwordHash');
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({ success: true, user });
}
