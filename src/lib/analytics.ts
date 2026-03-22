import { Platform } from 'react-native';
import { z } from 'zod';
import { config } from '@/constants/config';
import {
  normalizeAnalyticsProperties,
  type AnalyticsPropertyInput,
  type AnalyticsRuntimeConfig,
} from '@/lib/analytics-config';
import { Sentry } from '@/lib/sentry';
import { storage } from '@/lib/storage';

export type AnalyticsEventName =
  | 'app_bootstrapped'
  | 'auth_sign_in_failed'
  | 'auth_sign_in_succeeded'
  | 'auth_sign_up_failed'
  | 'auth_sign_up_succeeded'
  | 'emergency_mode_activated'
  | 'offline_queue_dropped'
  | 'offline_queue_synced';

const MAX_PENDING_ANALYTICS_EVENTS = 50;

const analyticsEventSchema = z.object({
  name: z.enum([
    'app_bootstrapped',
    'auth_sign_in_failed',
    'auth_sign_in_succeeded',
    'auth_sign_up_failed',
    'auth_sign_up_succeeded',
    'emergency_mode_activated',
    'offline_queue_dropped',
    'offline_queue_synced',
  ]),
  anonymous_id: z.string().min(1),
  user_id: z.string().min(1).nullable(),
  timestamp: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Analytics timestamps must be ISO-compatible.'),
  properties: z.record(z.string(), z.union([z.string(), z.number().finite(), z.boolean(), z.null()])),
  context: z.object({
    app_env: z.string().min(1),
    app_name: z.string().min(1),
    platform: z.string().min(1),
  }),
});

type AnalyticsEventPayload = z.infer<typeof analyticsEventSchema>;

class AnalyticsClient {
  private anonymousId: string | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;
  private isFlushing = false;
  private pendingEvents: AnalyticsEventPayload[] = [];
  private userId: string | null = null;

  public async initialize(): Promise<void> {
    if (this.initialized || !config.analytics.enabled) {
      return;
    }

    this.anonymousId = await this.readAnonymousId();
    this.initialized = true;
  }

  public async identify(userId: string): Promise<void> {
    if (!config.analytics.enabled) {
      return;
    }

    await this.initialize();
    this.userId = userId;
  }

  public async reset(): Promise<void> {
    this.userId = null;
  }

  public async track(
    name: AnalyticsEventName,
    properties: Record<string, AnalyticsPropertyInput> = {}
  ): Promise<void> {
    if (!config.analytics.enabled) {
      return;
    }

    try {
      await this.initialize();

      const payload = analyticsEventSchema.parse({
        name,
        anonymous_id: this.anonymousId ?? (await this.readAnonymousId()),
        user_id: this.userId,
        timestamp: new Date().toISOString(),
        properties: normalizeAnalyticsProperties(properties),
        context: {
          app_env: config.env,
          app_name: config.appName,
          platform: Platform.OS,
        },
      });

      this.pendingEvents = [...this.pendingEvents, payload].slice(-MAX_PENDING_ANALYTICS_EVENTS);
      this.scheduleFlush(config.analytics);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Unable to enqueue analytics event:', error);
    }
  }

  private async readAnonymousId(): Promise<string> {
    if (this.anonymousId) {
      return this.anonymousId;
    }

    const storedAnonymousId = await storage.get<string>(storage.keys.ANALYTICS_ANONYMOUS_ID);

    if (storedAnonymousId) {
      this.anonymousId = storedAnonymousId;
      return storedAnonymousId;
    }

    const generatedAnonymousId = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    await storage.set(storage.keys.ANALYTICS_ANONYMOUS_ID, generatedAnonymousId);
    this.anonymousId = generatedAnonymousId;
    return generatedAnonymousId;
  }

  private scheduleFlush(runtimeConfig: AnalyticsRuntimeConfig): void {
    if (this.flushTimer || this.pendingEvents.length === 0) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush(runtimeConfig);
    }, runtimeConfig.flushIntervalMs);
  }

  private async flush(runtimeConfig: AnalyticsRuntimeConfig): Promise<void> {
    if (this.isFlushing || this.pendingEvents.length === 0) {
      return;
    }

    this.isFlushing = true;
    const currentBatch = [...this.pendingEvents];
    this.pendingEvents = [];

    try {
      const response = await fetch(runtimeConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(runtimeConfig.writeKey ? { 'x-analytics-key': runtimeConfig.writeKey } : {}),
        },
        body: JSON.stringify({
          batch: currentBatch,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analytics endpoint responded with status ${response.status}.`);
      }
    } catch (error) {
      this.pendingEvents = [...currentBatch, ...this.pendingEvents].slice(-MAX_PENDING_ANALYTICS_EVENTS);
      Sentry.captureException(error);
      console.error('Unable to flush analytics events:', error);
    } finally {
      this.isFlushing = false;

      if (this.pendingEvents.length > 0) {
        this.scheduleFlush(runtimeConfig);
      }
    }
  }
}

const analyticsClient = new AnalyticsClient();

export function clearAnalyticsIdentity(): Promise<void> {
  return analyticsClient.reset();
}

export function identifyAnalyticsUser(userId: string): Promise<void> {
  return analyticsClient.identify(userId);
}

export function initializeAnalytics(): Promise<void> {
  return analyticsClient.initialize();
}

export function trackAnalyticsEvent(
  name: AnalyticsEventName,
  properties: Record<string, AnalyticsPropertyInput> = {}
): Promise<void> {
  return analyticsClient.track(name, properties);
}
