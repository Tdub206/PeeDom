import { storage } from './storage';
import { ReturnIntent, IntentType, ReplayStrategy } from '@/types';

class ReturnIntentManager {
  private currentIntent: ReturnIntent | null = null;

  /**
   * Set a return intent when user tries a protected action while not authenticated
   */
  async set(options: {
    type: IntentType;
    route: string;
    params: Record<string, unknown>;
    replay_strategy: ReplayStrategy;
  }): Promise<void> {
    const intent: ReturnIntent = {
      intent_id: this.generateIntentId(),
      type: options.type,
      route: options.route,
      params: options.params,
      created_at: new Date().toISOString(),
      replay_strategy: options.replay_strategy,
    };

    this.currentIntent = intent;
    await storage.set(storage.keys.RETURN_INTENT, intent);
  }

  /**
   * Get the current return intent
   */
  async get(): Promise<ReturnIntent | null> {
    if (this.currentIntent) {
      return this.currentIntent;
    }

    const stored = await storage.get<ReturnIntent>(storage.keys.RETURN_INTENT);
    if (stored) {
      this.currentIntent = stored;
      return stored;
    }

    return null;
  }

  /**
   * Clear the return intent after successful execution or cancellation
   */
  async clear(): Promise<void> {
    this.currentIntent = null;
    await storage.remove(storage.keys.RETURN_INTENT);
  }

  /**
   * Check if an intent exists and is still valid
   */
  async hasIntent(): Promise<boolean> {
    const intent = await this.get();
    if (!intent) return false;

    // Check if intent is older than 30 minutes (stale)
    const intentAge = Date.now() - new Date(intent.created_at).getTime();
    const MAX_INTENT_AGE = 30 * 60 * 1000; // 30 minutes

    if (intentAge > MAX_INTENT_AGE) {
      await this.clear();
      return false;
    }

    return true;
  }

  /**
   * Get intent and prepare for replay
   * Returns the intent and clears it from storage
   */
  async consume(): Promise<ReturnIntent | null> {
    const intent = await this.get();
    if (intent) {
      await this.clear();
    }
    return intent;
  }

  private generateIntentId(): string {
    return `intent_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

export const returnIntent = new ReturnIntentManager();
