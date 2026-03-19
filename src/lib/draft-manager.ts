import { storage } from './storage';
import {
  AddBathroomDraft,
  ClaimBusinessDraft,
  CleanlinessRatingDraft,
  Draft,
  DraftType,
  LiveStatusDraft,
  SubmitCodeDraft,
} from '@/types';

class DraftManager {
  /**
   * Save a draft
   */
  async save<T = unknown>(
    type: DraftType,
    data: T,
    userId: string,
    draftId?: string
  ): Promise<string> {
    const id = draftId || this.generateDraftId();
    const key = this.getDraftKey(type, id);

    const draft: Draft<T> = {
      id,
      type,
      data,
      created_at: draftId ? (await this.get<T>(type, id))?.created_at || new Date().toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: userId,
    };

    await storage.set(key, draft);
    await this.updateDraftIndex(type, id, userId);

    return id;
  }

  /**
   * Get a draft by type and ID
   */
  async get<T = unknown>(type: DraftType, draftId: string): Promise<Draft<T> | null> {
    const key = this.getDraftKey(type, draftId);
    return await storage.get<Draft<T>>(key);
  }

  /**
   * List all drafts of a specific type for a user
   */
  async list<T = unknown>(type: DraftType, userId: string): Promise<Draft<T>[]> {
    const index = await this.getDraftIndex(type, userId);
    const drafts: Draft<T>[] = [];

    for (const draftId of index) {
      const draft = await this.get<T>(type, draftId);
      if (draft && draft.user_id === userId) {
        drafts.push(draft);
      }
    }

    // Sort by updated_at descending
    return drafts.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  /**
   * Delete a draft
   */
  async delete(type: DraftType, draftId: string, userId: string): Promise<void> {
    const key = this.getDraftKey(type, draftId);
    await storage.remove(key);
    await this.removeFromDraftIndex(type, draftId, userId);
  }

  /**
   * Delete all drafts of a specific type for a user
   */
  async deleteAll(type: DraftType, userId: string): Promise<void> {
    const index = await this.getDraftIndex(type, userId);
    
    for (const draftId of index) {
      const key = this.getDraftKey(type, draftId);
      await storage.remove(key);
    }

    await this.clearDraftIndex(type, userId);
  }

  /**
   * Check if a draft exists
   */
  async exists(type: DraftType, draftId: string): Promise<boolean> {
    const draft = await this.get(type, draftId);
    return draft !== null;
  }

  private getDraftKey(type: DraftType, draftId: string): string {
    return `draft:${type}:${draftId}`;
  }

  private getDraftIndexKey(type: DraftType, userId: string): string {
    return `draft_index:${type}:${userId}`;
  }

  private async getDraftIndex(type: DraftType, userId: string): Promise<string[]> {
    const key = this.getDraftIndexKey(type, userId);
    const index = await storage.get<string[]>(key);
    return index || [];
  }

  private async updateDraftIndex(type: DraftType, draftId: string, userId: string): Promise<void> {
    const index = await this.getDraftIndex(type, userId);
    if (!index.includes(draftId)) {
      index.push(draftId);
      const key = this.getDraftIndexKey(type, userId);
      await storage.set(key, index);
    }
  }

  private async removeFromDraftIndex(type: DraftType, draftId: string, userId: string): Promise<void> {
    const index = await this.getDraftIndex(type, userId);
    const filtered = index.filter(id => id !== draftId);
    const key = this.getDraftIndexKey(type, userId);
    await storage.set(key, filtered);
  }

  private async clearDraftIndex(type: DraftType, userId: string): Promise<void> {
    const key = this.getDraftIndexKey(type, userId);
    await storage.remove(key);
  }

  private generateDraftId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

export const draftManager = new DraftManager();

// Convenience functions for specific draft types
export const addBathroomDrafts = {
  save: (data: AddBathroomDraft, userId: string, draftId?: string) =>
    draftManager.save('add_bathroom', data, userId, draftId),
  get: (draftId: string) => draftManager.get<AddBathroomDraft>('add_bathroom', draftId),
  list: (userId: string) => draftManager.list<AddBathroomDraft>('add_bathroom', userId),
  delete: (draftId: string, userId: string) => draftManager.delete('add_bathroom', draftId, userId),
};

export const claimBusinessDrafts = {
  save: (data: ClaimBusinessDraft, userId: string, draftId?: string) =>
    draftManager.save('claim_business', data, userId, draftId),
  get: (draftId: string) => draftManager.get<ClaimBusinessDraft>('claim_business', draftId),
  list: (userId: string) => draftManager.list<ClaimBusinessDraft>('claim_business', userId),
  delete: (draftId: string, userId: string) => draftManager.delete('claim_business', draftId, userId),
};

export const submitCodeDrafts = {
  save: (data: SubmitCodeDraft, userId: string, draftId?: string) =>
    draftManager.save('submit_code', data, userId, draftId),
  get: (draftId: string) => draftManager.get<SubmitCodeDraft>('submit_code', draftId),
  list: (userId: string) => draftManager.list<SubmitCodeDraft>('submit_code', userId),
  delete: (draftId: string, userId: string) => draftManager.delete('submit_code', draftId, userId),
};

export const cleanlinessRatingDrafts = {
  save: (data: CleanlinessRatingDraft, userId: string, draftId?: string) =>
    draftManager.save('rate_cleanliness', data, userId, draftId),
  get: (draftId: string) => draftManager.get<CleanlinessRatingDraft>('rate_cleanliness', draftId),
  list: (userId: string) => draftManager.list<CleanlinessRatingDraft>('rate_cleanliness', userId),
  delete: (draftId: string, userId: string) => draftManager.delete('rate_cleanliness', draftId, userId),
};

export const liveStatusDrafts = {
  save: (data: LiveStatusDraft, userId: string, draftId?: string) =>
    draftManager.save('report_live_status', data, userId, draftId),
  get: (draftId: string) => draftManager.get<LiveStatusDraft>('report_live_status', draftId),
  list: (userId: string) => draftManager.list<LiveStatusDraft>('report_live_status', userId),
  delete: (draftId: string, userId: string) => draftManager.delete('report_live_status', draftId, userId),
};
