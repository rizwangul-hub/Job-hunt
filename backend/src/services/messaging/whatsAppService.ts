import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export interface WhatsAppSendResult {
  success: boolean;
  actionTaken: 'cloud_api_sent' | 'click_to_chat_url_generated';
  clickToChatUrl?: string;
  error?: string;
  messageId?: string;
}

export class WhatsAppService {
  public static cleanPhoneNumber(phone: string): string {
    return phone.replace(/[^\d]/g, '');
  }

  public static generateClickToChatUrl(phone: string, messageText: string): string {
    let clean = WhatsAppService.cleanPhoneNumber(phone);
    // If Pakistani local number starting with 03..., format to international 923...
    if (clean.startsWith('03') && clean.length === 11) {
      clean = '92' + clean.substring(1);
    }
    return `https://wa.me/${clean}?text=${encodeURIComponent(messageText)}`;
  }

  public async verifyConnection(): Promise<{ connected: boolean; message: string }> {
    if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
      return {
        connected: false,
        message: 'WhatsApp Cloud API unconfigured. Click-to-chat link generation available for manual messaging.',
      };
    }

    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}`, {
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`
        }
      });
      if (res.ok) {
        return { connected: true, message: 'WhatsApp Cloud API connection verified.' };
      } else {
        const data: any = await res.json();
        return { connected: false, message: `WhatsApp Cloud API error: ${JSON.stringify(data.error?.message || data)}` };
      }
    } catch (err: any) {
      return { connected: false, message: `WhatsApp connection failed: ${err.message}` };
    }
  }

  public async sendOrPrepareOutreach(params: {
    recipientPhone: string;
    messageText: string;
  }): Promise<WhatsAppSendResult> {
    const { recipientPhone, messageText } = params;
    const clickToChatUrl = WhatsAppService.generateClickToChatUrl(recipientPhone, messageText);

    // If Cloud API configured, attempt delivery
    if (env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN) {
      try {
        let toPhone = WhatsAppService.cleanPhoneNumber(recipientPhone);
        if (toPhone.startsWith('03') && toPhone.length === 11) {
          toPhone = '92' + toPhone.substring(1);
        }

        const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: toPhone,
            type: 'text',
            text: { body: messageText }
          })
        });

        const data: any = await res.json();
        if (res.ok) {
          return {
            success: true,
            actionTaken: 'cloud_api_sent',
            messageId: data.messages?.[0]?.id,
            clickToChatUrl
          };
        } else {
          logger.warn('WhatsApp Cloud API dispatch error, returning click-to-chat fallback:', data);
          return {
            success: true,
            actionTaken: 'click_to_chat_url_generated',
            clickToChatUrl,
            error: data.error?.message
          };
        }
      } catch (err: any) {
        logger.error('WhatsApp API request error:', err.message);
        return {
          success: true,
          actionTaken: 'click_to_chat_url_generated',
          clickToChatUrl,
          error: err.message
        };
      }
    }

    // Default compliant fallback: create prepared WhatsApp click-to-chat link
    return {
      success: true,
      actionTaken: 'click_to_chat_url_generated',
      clickToChatUrl
    };
  }
}

export const whatsAppService = new WhatsAppService();
