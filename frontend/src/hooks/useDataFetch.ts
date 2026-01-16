'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseDataFetchOptions<T> {
  fetchFn: () => Promise<{ data: T }>;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
}

export function useDataFetch<T>({ 
  fetchFn, 
  enabled = true,
  onSuccess,
  onError 
}: UseDataFetchOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetchFn();
      setData(response.data);
      onSuccess?.(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to load data';
      setError(errorMessage);
      onError?.(err);
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, enabled, onSuccess, onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
