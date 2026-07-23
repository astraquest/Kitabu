import type { PoolClient } from 'pg';
import { appConfig } from './config.js';
import {
  createNotificationDelivery,
  createUserNotification,
  disablePushToken,
  listEnabledPushTokens,
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

async function sendExpoPushNotifications(
  client: NotificationClient,
  input: NotifyUserInput,
  notificationId: string | null
) {
  const pushEnabled = await isFeatureFlagEnabled('notifications.push');
  if (!pushEnabled) {
    return 'skipped' as const;
  }

  const tokens = await listEnabledPushTokens(client, input.userId);
  if (!tokens.length) {
    return 'skipped' as const;
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      signal: AbortSignal.timeout(5_000),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(
        tokens.map(({ token }) => ({
          to: token,
          title: input.title,
          body: input.body,
          sound: 'default',
          channelId: 'daily-study-reminders',
          data: input.metadata ?? {}
        }))
      )
    });

    const payload = (await response.json().catch(() => ({}))) as {
      data?: Array<{
        status?: 'ok' | 'error';
        id?: string;
        message?: string;
        details?: { error?: string };
      }>;
    };
    const tickets = Array.isArray(payload.data) ? payload.data : [];

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index].token;
      const ticket = tickets[index];
      const delivered = response.ok && ticket?.status === 'ok';
      const providerError = ticket?.details?.error || ticket?.message || null;

      await createNotificationDelivery(client, {
        notificationId,
        userId: input.userId,
        channel: 'push',
        provider: 'expo',
        status: delivered ? 'sent' : 'failed',
        providerMessageId: ticket?.id ?? null,
        errorMessage: delivered ? null : providerError || `Expo push failed: ${response.status}`
      });

      if (providerError === 'DeviceNotRegistered') {
        await disablePushToken(client, token);
      }
    }

    return tickets.some(ticket => ticket.status === 'ok') ? ('sent' as const) : ('failed' as const);
  } catch (error) {
    await createNotificationDelivery(client, {
      notificationId,
      userId: input.userId,
      channel: 'push',
      provider: 'expo',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Expo push delivery failed'
    });
    return 'failed' as const;
  }
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

  const pushStatus = await sendExpoPushNotifications(client, input, notificationId);

  const smsEnabled =
    Boolean(input.smsPhoneNumber && input.smsBody) &&
    (await isFeatureFlagEnabled('payments.mpesa_sms'));

  if (!smsEnabled) {
    return { notificationId, pushStatus, smsStatus: 'skipped' as const };
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
    return { notificationId, pushStatus, smsStatus: 'skipped' as const };
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
    return { notificationId, pushStatus, smsStatus: 'sent' as const };
  } catch (error) {
    await createNotificationDelivery(client, {
      notificationId,
      userId: input.userId,
      channel: 'sms',
      provider: 'africastalking',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'SMS delivery failed'
    });
    return { notificationId, pushStatus, smsStatus: 'failed' as const };
  }
}
