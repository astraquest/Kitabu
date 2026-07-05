import type { PoolClient } from 'pg';
import { appConfig } from './config.js';
import {
  createNotificationDelivery,
  createUserNotification,
  isFeatureFlagEnabled,
  listEnabledPushTokens,
  setPushTokenEnabled
} from './repositories.js';

type NotificationClient = PoolClient;

export interface NotifyUserInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  forceInApp?: boolean;
  forcePush?: boolean;
  pushTitle?: string;
  pushBody?: string;
  smsPhoneNumber?: string | null;
  smsBody?: string;
}

type PushStatus = 'sent' | 'skipped' | 'failed';

interface ExpoPushTicket {
  status?: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

interface ExpoPushResponse {
  data?: ExpoPushTicket | ExpoPushTicket[];
  errors?: Array<{ message?: string }>;
}

const EXPO_PUSH_SEND_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_BATCH_SIZE = 100;
const REMINDER_CHANNEL_ID = 'daily-study-reminders';

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

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeExpoTickets(payload: ExpoPushResponse): ExpoPushTicket[] {
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload.data) {
    return [payload.data];
  }
  return [];
}

function expoTicketError(ticket: ExpoPushTicket) {
  return ticket.details?.error || ticket.message || 'Expo push delivery failed';
}

async function sendExpoPushMessages(
  messages: Array<Record<string, unknown>>
): Promise<ExpoPushTicket[]> {
  const response = await fetch(EXPO_PUSH_SEND_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(messages)
  });

  const payload = (await response.json().catch(() => ({}))) as ExpoPushResponse;
  if (!response.ok) {
    const message =
      payload.errors?.map(error => error.message).filter(Boolean).join('; ') ||
      `Expo Push Service failed: ${response.status}`;
    throw new Error(message);
  }

  return normalizeExpoTickets(payload);
}

async function sendPushNotifications(
  client: NotificationClient,
  input: NotifyUserInput,
  notificationId: string | null
): Promise<{ pushStatus: PushStatus; pushSent: number; pushFailed: number }> {
  const pushEnabled = input.forcePush || (await isFeatureFlagEnabled('notifications.push'));
  if (!pushEnabled) {
    return { pushStatus: 'skipped', pushSent: 0, pushFailed: 0 };
  }

  const tokens = await listEnabledPushTokens(client, input.userId);
  if (tokens.length === 0) {
    return { pushStatus: 'skipped', pushSent: 0, pushFailed: 0 };
  }

  const deliverables = tokens.map(token => ({
    token,
    message: {
      to: token.token,
      title: input.pushTitle ?? input.title,
      body: input.pushBody ?? input.body,
      sound: 'default',
      channelId: REMINDER_CHANNEL_ID,
      data: {
        notificationId,
        type: input.type,
        ...(input.metadata ?? {})
      }
    }
  }));

  let pushSent = 0;
  let pushFailed = 0;

  try {
    for (const batch of chunk(deliverables, EXPO_PUSH_BATCH_SIZE)) {
      const tickets = await sendExpoPushMessages(batch.map(item => item.message));

      await Promise.all(
        batch.map(async (item, index) => {
          const ticket = tickets[index];
          if (ticket?.status === 'ok') {
            pushSent += 1;
            await createNotificationDelivery(client, {
              notificationId,
              userId: input.userId,
              channel: 'push',
              provider: 'expo',
              status: 'sent',
              providerMessageId: ticket.id ?? null
            });
            return;
          }

          pushFailed += 1;
          const errorMessage = ticket ? expoTicketError(ticket) : 'Expo Push Service did not return a ticket';
          if (ticket?.details?.error === 'DeviceNotRegistered') {
            await setPushTokenEnabled(client, item.token.token, false);
          }
          await createNotificationDelivery(client, {
            notificationId,
            userId: input.userId,
            channel: 'push',
            provider: 'expo',
            status: 'failed',
            errorMessage
          });
        })
      );
    }
  } catch (error) {
    pushFailed += tokens.length - pushSent;
    await createNotificationDelivery(client, {
      notificationId,
      userId: input.userId,
      channel: 'push',
      provider: 'expo',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Expo push delivery failed'
    });
  }

  return {
    pushStatus: pushSent > 0 ? 'sent' : pushFailed > 0 ? 'failed' : 'skipped',
    pushSent,
    pushFailed
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
  const pushResult = await sendPushNotifications(client, input, notificationId);

  const smsEnabled =
    Boolean(input.smsPhoneNumber && input.smsBody) &&
    (await isFeatureFlagEnabled('payments.mpesa_sms'));

  if (!smsEnabled) {
    return { notificationId, smsStatus: 'skipped' as const, ...pushResult };
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
    return { notificationId, smsStatus: 'skipped' as const, ...pushResult };
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
    return { notificationId, smsStatus: 'sent' as const, ...pushResult };
  } catch (error) {
    await createNotificationDelivery(client, {
      notificationId,
      userId: input.userId,
      channel: 'sms',
      provider: 'africastalking',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'SMS delivery failed'
    });
    return { notificationId, smsStatus: 'failed' as const, ...pushResult };
  }
}
