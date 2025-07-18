'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface FetchOptions {
  cacheKey?: string;
  cacheDuration?: number; // in milliseconds
  retryAttempts?: number;
  retryDelay?: number;
}

interface UseOptimizedDataFetchingResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
}

// Global cache to persist across component unmounts
const globalCache = new Map<string, CacheEntry<any>>();

// Cache cleanup interval
let cacheCleanupInterval: NodeJS.Timeout | null = null;

const startCacheCleanup = () => {
  if (cacheCleanupInterval) return;
  
  cacheCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of globalCache.entries()) {
      if (now > entry.expiresAt) {
        globalCache.delete(key);
      }
    }
  }, 60000); // Clean up every minute
};

const stopCacheCleanup = () => {
  if (cacheCleanupInterval) {
    clearInterval(cacheCleanupInterval);
    cacheCleanupInterval = null;
  }
};

export function useOptimizedDataFetching<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = [],
  options: FetchOptions = {}
): UseOptimizedDataFetchingResult<T> {
  const {
    cacheKey,
    cacheDuration = 5 * 60 * 1000, // 5 minutes default
    retryAttempts = 3,
    retryDelay = 1000
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    startCacheCleanup();
    
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchWithRetry = useCallback(async (attempts: number = retryAttempts): Promise<T> => {
    try {
      return await fetchFunction();
    } catch (err: any) {
      if (attempts > 1 && !err.name?.includes('AbortError')) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchWithRetry(attempts - 1);
      }
      throw err;
    }
  }, [fetchFunction, retryAttempts, retryDelay]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (cacheKey && !forceRefresh) {
      const cached = globalCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        if (mountedRef.current) {
          setData(cached.data);
          setLoading(false);
          setError(null);
        }
        return;
      }
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      const result = await fetchWithRetry();

      if (mountedRef.current) {
        setData(result);
        setLoading(false);

        // Cache the result
        if (cacheKey) {
          globalCache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
            expiresAt: Date.now() + cacheDuration
          });
        }
      }
    } catch (err: any) {
      if (mountedRef.current && !err.name?.includes('AbortError')) {
        setError(err.message || 'Failed to fetch data');
        setLoading(false);
      }
    }
  }, [cacheKey, cacheDuration, fetchWithRetry]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const clearCache = useCallback(() => {
    if (cacheKey) {
      globalCache.delete(cacheKey);
    }
  }, [cacheKey]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache
  };
}

// Parallel data fetching hook
export function useParallelDataFetching<T extends Record<string, any>>(
  fetchFunctions: { [K in keyof T]: () => Promise<T[K]> },
  dependencies: any[] = [],
  options: { [K in keyof T]?: FetchOptions } = {}
): {
  data: Partial<T>;
  loading: { [K in keyof T]: boolean };
  errors: { [K in keyof T]: string | null };
  refetch: (keys?: (keyof T)[]) => Promise<void>;
  clearCache: (keys?: (keyof T)[]) => void;
} {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState<{ [K in keyof T]: boolean }>({} as any);
  const [errors, setErrors] = useState<{ [K in keyof T]: string | null }>({} as any);

  const keys = Object.keys(fetchFunctions) as (keyof T)[];

  const fetchAll = useCallback(async (keysToFetch?: (keyof T)[]) => {
    const targetKeys = keysToFetch || keys;
    
    // Set loading states
    setLoading(prev => {
      const newLoading = { ...prev };
      targetKeys.forEach(key => {
        newLoading[key] = true;
      });
      return newLoading;
    });

    // Clear errors
    setErrors(prev => {
      const newErrors = { ...prev };
      targetKeys.forEach(key => {
        newErrors[key] = null;
      });
      return newErrors;
    });

    // Fetch all data in parallel
    const promises = targetKeys.map(async (key) => {
      try {
        const result = await fetchFunctions[key]();
        return { key, result, error: null };
      } catch (error: any) {
        return { key, result: null, error: error.message || 'Failed to fetch' };
      }
    });

    const results = await Promise.allSettled(promises);

    // Update states
    setData(prev => {
      const newData = { ...prev };
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.result !== null) {
          newData[targetKeys[index]] = result.value.result;
        }
      });
      return newData;
    });

    setErrors(prev => {
      const newErrors = { ...prev };
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          newErrors[targetKeys[index]] = result.value.error;
        } else {
          newErrors[targetKeys[index]] = 'Failed to fetch';
        }
      });
      return newErrors;
    });

    setLoading(prev => {
      const newLoading = { ...prev };
      targetKeys.forEach(key => {
        newLoading[key] = false;
      });
      return newLoading;
    });
  }, [fetchFunctions, keys]);

  const refetch = useCallback(async (keysToRefetch?: (keyof T)[]) => {
    await fetchAll(keysToRefetch);
  }, [fetchAll]);

  const clearCache = useCallback((keysToClear?: (keyof T)[]) => {
    const targetKeys = keysToClear || keys;
    targetKeys.forEach(key => {
      const cacheKey = options[key]?.cacheKey;
      if (cacheKey) {
        globalCache.delete(cacheKey);
      }
    });
  }, [keys, options]);

  useEffect(() => {
    fetchAll();
  }, dependencies);

  return {
    data,
    loading,
    errors,
    refetch,
    clearCache
  };
}

// Cleanup function for when the app unmounts
export const cleanupDataFetchingCache = () => {
  globalCache.clear();
  stopCacheCleanup();
};
