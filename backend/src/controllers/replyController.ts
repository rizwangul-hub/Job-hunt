import { Response } from 'express';
import { RecruiterConversation } from '../models/RecruiterConversation';
import { JobOpportunity } from '../models/JobOpportunity';
import { whatsAppService } from '../services/messaging/whatsAppService';
import { emailService } from '../services/messaging/emailService';
import { ActivityLog } from '../models/ActivityLog';

export async function getReplies(req: any, res: Response): Promise<void> {
  const isDemo = req.query.demo === 'true';
  const replies = await RecruiterConversation.find({ isDemo }).sort({ updatedAt: -1 });
  res.json({ success: true, count: replies.length, replies });
}

export async function getReplyById(req: any, res: Response): Promise<void> {
  const reply = await RecruiterConversation.findById(req.params.id);
  if (!reply) {
    res.status(404).json({ success: false, message: 'Conversation not found' });
    return;
  }

  // Mark as read
  if (!reply.read) {
    reply.read = true;
    await reply.save();
  }

  res.json({ success: true, reply });
}

export async function sendReply(req: any, res: Response): Promise<void> {
  const { text } = req.body;
  if (!text || !text.trim()) {
    res.status(400).json({ success: false, message: 'Message text required' });
    return;
  }

  const conversation = await RecruiterConversation.findById(req.params.id);
  if (!conversation) {
    res.status(404).json({ success: false, message: 'Conversation not found' });
    return;
  }

  // Add agent message
  conversation.messages.push({
    sender: 'agent',
    text: text.trim(),
    timestamp: new Date()
  });
  conversation.lastMessage = `You: ${text.trim()}`;
  conversation.updatedAt = new Date();
  await conversation.save();

  // If real integration is connected, dispatch
  if (!conversation.isDemo) {
    if (conversation.channel === 'WhatsApp') {
      await whatsAppService.sendOrPrepareOutreach({
        recipientPhone: conversation.contact,
        messageText: text
      });
    } else if (conversation.channel === 'Email') {
      await emailService.sendApplicationEmail({
        to: conversation.contact,
        subject: `Re: Application Follow-up`,
        body: text
      });
    }
  }

  await ActivityLog.create({
    type: 'reply',
    title: `Replied to ${conversation.recruiterName}`,
    description: `Sent response via ${conversation.channel}`,
    level: 'info',
    relatedJobId: conversation.jobId
  });

  res.json({ success: true, message: 'Reply sent successfully', conversation });
}

export async function simulateReply(req: any, res: Response): Promise<void> {
  // Find an existing demo job or create one
  let job = await JobOpportunity.findOne({ isDemo: true });
  if (!job) {
    job = await JobOpportunity.findOne();
  }

  const sampleReply = new RecruiterConversation({
    jobId: job?._id,
    jobTitle: job?.title || 'Full-Stack MERN Developer',
    company: job?.company || 'DevSync Solutions',
    recruiterName: req.body.recruiterName || 'Sarah HR (FinTech Solutions)',
    recruiterAvatar: 'FS',
    channel: req.body.channel || 'WhatsApp',
    contact: req.body.contact || '+92 345 8899221',
    lastMessage: req.body.message || 'Hi Rizwan, your MERN stack and React Native profile looks like a great fit! Can we connect for a quick 10-minute screening call today?',
    read: false,
    status: 'active',
    messages: [
      {
        sender: 'agent',
        text: 'Hi Sarah, I noticed your post regarding the Full-Stack role. Portfolio: https://rizwanullah.dev with CV attached.',
        timestamp: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        sender: 'recruiter',
        text: req.body.message || 'Hi Rizwan, your MERN stack and React Native profile looks like a great fit! Can we connect for a quick 10-minute screening call today?',
        timestamp: new Date()
      }
    ],
    isDemo: true
  });

  await sampleReply.save();

  await ActivityLog.create({
    type: 'reply',
    title: `Simulated Reply from ${sampleReply.recruiterName}`,
    description: `Demo response received via ${sampleReply.channel}`,
    level: 'success',
    relatedJobId: job?._id
  });

  res.json({ success: true, message: 'Simulated reply created', conversation: sampleReply });
}
