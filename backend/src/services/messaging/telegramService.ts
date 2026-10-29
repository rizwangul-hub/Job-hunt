import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export class TelegramService {
  public async verifyConnection(): Promise<{ connected: boolean; message: string }> {
    if (!env.TELEGRAM_BOT_TOKEN) {
      return {
        connected: false,
        message: 'Telegram Bot token unconfigured. Enter TELEGRAM_BOT_TOKEN in .env to connect.',
      };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`);
      const data: any = await res.json();
      if (data.ok) {
        return {
          connected: true,
          message: `Telegram bot @${data.result.username} connected successfully.`
        };
      } else {
        return {
          connected: false,
          message: `Telegram API error: ${data.description}`
        };
      }
    } catch (err: any) {
      return { connected: false, message: `Telegram connection error: ${err.message}` };
    }
  }

  public async sendAlert(messageText: string): Promise<boolean> {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return false;
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: messageText,
          parse_mode: 'HTML'
        })
      });
      const data: any = await res.json();
      return !!data.ok;
    } catch (err: any) {
      logger.error('Telegram dispatch error:', err.message);
      return false;
    }
  }
}

export const telegramService = new TelegramService();
