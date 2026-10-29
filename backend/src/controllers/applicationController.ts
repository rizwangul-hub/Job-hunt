import { Response } from 'express';
import { Application } from '../models/Application';
import { JobOpportunity } from '../models/JobOpportunity';
import { ActivityLog } from '../models/ActivityLog';

export async function getApplications(req: any, res: Response): Promise<void> {
  const status = req.query.status as string;
  const query: any = {};
  if (status) {
    query.status = status;
  }

  const applications = await Application.find(query)
    .populate('jobId')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: applications.length, applications });
}

export async function getApplicationById(req: any, res: Response): Promise<void> {
  const application = await Application.findById(req.params.id).populate('jobId');
  if (!application) {
    res.status(404).json({ success: false, message: 'Application not found' });
    return;
  }
  res.json({ success: true, application });
}

export async function updateApplicationStatus(req: any, res: Response): Promise<void> {
  const { status, note } = req.body;
  const validStatuses = [
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
  ];

  if (!validStatuses.includes(status)) {
    res.status(400).json({ success: false, message: 'Invalid application status value.' });
    return;
  }

  const application = await Application.findById(req.params.id);
  if (!application) {
    res.status(404).json({ success: false, message: 'Application not found' });
    return;
  }

  application.status = status;
  application.approvalHistory.push({
    action: `Status updated to ${status}`,
    timestamp: new Date(),
    note
  });
  await application.save();

  // Also sync JobOpportunity status
  if (application.jobId) {
    await JobOpportunity.findByIdAndUpdate(application.jobId, { applicationStatus: status });
  }

  await ActivityLog.create({
    type: 'submission',
    title: `Application Status Changed: ${status}`,
    description: note || `Application manually progressed to ${status}`,
    level: status === 'Interview' || status === 'Offer' ? 'success' : 'info',
    relatedJobId: application.jobId as any
  });

  res.json({ success: true, message: 'Application status updated', application });
}
