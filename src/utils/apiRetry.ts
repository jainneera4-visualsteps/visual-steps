export const DEFAULT_API_RETRIES = 2;

export const isBrowserOffline = (): boolean => (
  typeof navigator !== 'undefined' && navigator.onLine === false
);

export const isRetryableApiMethod = (method?: string): boolean => {
  const normalizedMethod = (method || 'GET').toUpperCase();
  return normalizedMethod === 'GET' || normalizedMethod === 'HEAD';
};

export const getApiRetryDelayMs = (retryAttempt: number): number => (
  Math.min(2000, 500 * (2 ** Math.max(0, retryAttempt)))
);
