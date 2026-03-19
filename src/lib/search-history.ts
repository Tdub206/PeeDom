import { storage } from '@/lib/storage';
import { SearchHistoryItem } from '@/types';
import {
  removeSearchHistoryEntry,
  sanitizeSearchHistory,
  upsertSearchHistory,
} from '@/utils/search';

export async function loadSearchHistory(): Promise<SearchHistoryItem[]> {
  const storedHistory = await storage.get<unknown>(storage.keys.SEARCH_HISTORY);
  return sanitizeSearchHistory(storedHistory);
}

export async function saveSearchHistory(history: SearchHistoryItem[]): Promise<void> {
  await storage.set(storage.keys.SEARCH_HISTORY, history);
}

export async function clearStoredSearchHistory(): Promise<void> {
  await storage.remove(storage.keys.SEARCH_HISTORY);
}

export async function rememberSearchQuery(
  history: SearchHistoryItem[],
  query: string
): Promise<SearchHistoryItem[]> {
  const nextHistory = upsertSearchHistory(history, query);
  await saveSearchHistory(nextHistory);
  return nextHistory;
}

export async function forgetSearchQuery(
  history: SearchHistoryItem[],
  query: string
): Promise<SearchHistoryItem[]> {
  const nextHistory = removeSearchHistoryEntry(history, query);
  await saveSearchHistory(nextHistory);
  return nextHistory;
}
