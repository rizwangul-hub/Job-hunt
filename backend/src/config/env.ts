import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'rizagent_default_secret_key_change_in_production_38472918',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Single user initial credentials
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'rizwangul535@gmail.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'RizMern2026!Secure',
  ADMIN_NAME: process.env.ADMIN_NAME || 'Rizwan Ullah',

  // AI Provider
  AI_PROVIDER: ((process.env.AI_PROVIDER || 'heuristic').toLowerCase()) as 'openai' | 'gemini' | 'anthropic' | 'heuristic',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',

  // Browser automation
  PLAYWRIGHT_HEADLESS: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  BROWSER_TIMEOUT_MS: parseInt(process.env.BROWSER_TIMEOUT_MS || '30000', 10),

  // Messaging integrations
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'Rizwan Ullah <rizwangul535@gmail.com>',

  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',

  WHATSAPP_PHONE_NUMBER_ID: (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim().replace(/^["']|["']$/g, ''),
  WHATSAPP_ACCESS_TOKEN: (process.env.WHATSAPP_ACCESS_TOKEN || '').trim().replace(/^["']|["']$/g, ''),
  WHATSAPP_VERIFY_TOKEN: (process.env.WHATSAPP_VERIFY_TOKEN || 'rizagent_whatsapp_webhook_token_2026').trim().replace(/^["']|["']$/g, ''),
  WHATSAPP_APP_SECRET: (process.env.WHATSAPP_APP_SECRET || '').trim().replace(/^["']|["']$/g, ''),
};
