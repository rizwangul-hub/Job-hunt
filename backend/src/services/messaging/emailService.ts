import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import fs from 'fs';
import path from 'path';

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  cvFilePath?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  verifiedDelivered: boolean;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      this.transporter = null;
    }
  }

  public async verifyConnection(): Promise<{ connected: boolean; message: string }> {
    if (!this.transporter) {
      return {
        connected: false,
        message: 'SMTP credentials not configured. Please supply SMTP_HOST, SMTP_USER, and SMTP_PASS in .env',
      };
    }

    try {
      await this.transporter.verify();
      return { connected: true, message: 'SMTP server connection verified successfully.' };
    } catch (err: any) {
      logger.error('SMTP verification failed:', err.message);
      return { connected: false, message: `SMTP verification failed: ${err.message}` };
    }
  }

  public async sendApplicationEmail(params: SendEmailParams): Promise<EmailSendResult> {
    const { to, subject, body, cvFilePath } = params;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return {
        success: false,
        error: `Invalid recipient email address: "${to}"`,
        verifiedDelivered: false
      };
    }

    if (!this.transporter) {
      return {
        success: false,
        error: 'Email service unconfigured. Cannot dispatch real email without active SMTP credentials.',
        verifiedDelivered: false
      };
    }

    const attachments: any[] = [];
    if (cvFilePath) {
      if (fs.existsSync(cvFilePath)) {
        attachments.push({
          filename: path.basename(cvFilePath),
          path: cvFilePath
        });
      } else {
        return {
          success: false,
          error: `CV attachment file not found at "${cvFilePath}". Delivery halted.`,
          verifiedDelivered: false
        };
      }
    }

    try {
      const info = await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        text: body,
        attachments
      });

      logger.info(`Email successfully dispatched to ${to}. MessageId: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        verifiedDelivered: true
      };
    } catch (err: any) {
      logger.error(`Email delivery error to ${to}:`, err.message);
      return {
        success: false,
        error: err.message,
        verifiedDelivered: false
      };
    }
  }
}

export const emailService = new EmailService();
