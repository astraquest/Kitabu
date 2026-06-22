import type { PoolClient } from 'pg';
import { appConfig } from './config.js';
import {
  createNotificationDelivery,
  createUserNotification,
  isFeatureFlagEnabled
} from './repositories.js';

type NotificationClient = PoolClient;

export interface NotifyUserInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  forceInApp?: boolean;
  smsPhoneNumber?: string | null;
  smsBody?: string;
}

export function isSmsConfigured() {
  return (
    appConfig.KITABU_SMS_PROVIDER === 'africastalking' &&
    Boolean(appConfig.KITABU_AFRICASTALKING_USERNAME) &&
    Boolean(appConfig.KITABU_AFRICASTALKING_API_KEY)
  );
}

export async function sendSmsMessage(args: {
  to: string;
  message: string;
}): Promise<{ providerMessageId: string | null }> {
  const form = new URLSearchParams({
    username: appConfig.KITABU_AFRICASTALKING_USERNAME!,
    to: args.to,
    message: args.message
  });

  if (appConfig.KITABU_AFRICASTALKING_SENDER_ID) {
    form.set('from', appConfig.KITABU_AFRICASTALKING_SENDER_ID);
  }

  const response = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      apiKey: appConfig.KITABU_AFRICASTALKING_API_KEY!,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: form.toString()
  });

  const body = (await response.json().catch(() => ({}))) as {
    SMSMessageData?: {
      Recipients?: Array<{
        messageId?: string;
        status?: string;
        statusCode?: number;
      }>;
    };
  };

  if (!response.ok) {
    throw new Error(`Africa's Talking SMS failed: ${response.status}`);
  }

  const recipient = body.SMSMessageData?.Recipients?.[0];
  if (recipient?.status && recipient.status !== 'Success') {
    throw new Error(`Africa's Talking SMS status: ${recipient.status}`);
  }

  return {
    providerMessageId: recipient?.messageId ?? null
  };
}

export async function notifyUser(client: NotificationClient, input: NotifyUserInput) {
  const inAppEnabled = input.forceInApp || (await isFeatureFlagEnabled('notifications.in_app'));
  const notificationId = inAppEnabled
    ? await createUserNotification(client, {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        metadata: input.metadata
      })
    : null;

  const smsEnabled =
    Boolean(input.smsPhoneNumber && input.smsBody) &&
    (await isFeatureFlagEnabled('payments.mpesa_sms'));

  if (!smsEnabled) {
    return { notificationId, smsStatus: 'skipped' as const };
  }

  if (!isSmsConfigured()) {
    await createNotificationDelivery(client, {
      notificationId,
      userId: input.userId,
      channel: 'sms',
      provider: appConfig.KITABU_SMS_PROVIDER,
      status: 'skipped',
      errorMessage: 'SMS provider is not configured'
    });
    return { notificationId, smsStatus: 'skipped' as const };
  }

  try {
    const sms = await sendSmsMessage({
      to: input.smsPhoneNumber!,
      message: input.smsBody!
    });
    await createNotificationDelivery(client, {
      notificationId,
      userId: input.userId,
      channel: 'sms',
      provider: 'africastalking',
      status: 'sent',
      providerMessageId: sms.providerMessageId
    });
    return { notificationId, smsStatus: 'sent' as const };
  } catch (error) {
    await createNotificationDelivery(client, {
      notificationId,
      userId: input.userId,
      channel: 'sms',
      provider: 'africastalking',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'SMS delivery failed'
    });
    return { notificationId, smsStatus: 'failed' as const };
  }
}
