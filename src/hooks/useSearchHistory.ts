import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearStoredSearchHistory,
  loadSearchHistory,
  saveSearchHistory,
} from '@/lib/search-history';
import { SearchHistoryItem } from '@/types';
import { removeSearchHistoryEntry, upsertSearchHistory } from '@/utils/search';

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const historyRef = useRef<SearchHistoryItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const storedHistory = await loadSearchHistory();

        if (!isMounted) {
          return;
        }

        setHistory(storedHistory);
        historyRef.current = storedHistory;
        setError(null);
      } catch (historyError) {
        if (!isMounted) {
          return;
        }

        setHistory([]);
        historyRef.current = [];
        setError(historyError instanceof Error ? historyError : new Error('Unable to load recent searches.'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const addToHistory = useCallback(async (query: string) => {
    try {
      const nextHistory = upsertSearchHistory(historyRef.current, query);
      historyRef.current = nextHistory;
      setHistory(nextHistory);
      await saveSearchHistory(nextHistory);
      setError(null);
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError : new Error('Unable to save this search.'));
    }
  }, []);

  const removeFromHistory = useCallback(async (query: string) => {
    try {
      const nextHistory = removeSearchHistoryEntry(historyRef.current, query);
      historyRef.current = nextHistory;
      setHistory(nextHistory);
      await saveSearchHistory(nextHistory);
      setError(null);
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError : new Error('Unable to update recent searches.'));
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await clearStoredSearchHistory();
      historyRef.current = [];
      setHistory([]);
      setError(null);
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError : new Error('Unable to clear recent searches.'));
    }
  }, []);

  return {
    history,
    isLoading,
    error,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
