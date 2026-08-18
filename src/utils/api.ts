import { supabase } from '../lib/supabase';
import { clearAuthSession, isAuthError } from './auth';
import { DEFAULT_API_RETRIES, getApiRetryDelayMs, isRetryableApiMethod } from './apiRetry';

export const safeJson = async (response: Response) => {
  const text = await response.text();
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    if (!text || text.trim() === '') {
      return {}; // Handle empty JSON responses gracefully
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON even though content-type was application/json', e);
      console.error('Problematic response body (first 200 chars):', text.substring(0, 200));
      // Fall through to text-based error checks
    }
  }
  
  if (text.includes('Starting Server...') || text.includes('Please wait while your application starts') || text.includes('action required to load new app') || text.includes('__cookie_check.html')) {
    console.warn('Server is starting, app needs loading, or cookie check required...');
    throw new Error('The application is still loading or requires a quick browser check. Please refresh the page in a few seconds.');
  }
  
  const status = response.status;
  const url = response.url;
  const snippet = text.substring(0, 100).replace(/\n/g, ' ');
  console.error(`Response is not JSON (Status: ${status}, URL: ${url}):`, snippet + '...');
  
  if (status === 404) {
    throw new Error(`API endpoint not found: ${url}. Please ensure the backend is running and the route is defined.`);
  }

  if (status === 401 || status === 403) {
    // If we get a 403 HTML response, it's likely the AI Studio proxy blocking the request
    // because the user's AI Studio session expired. Reloading the page will trigger the login flow.
    if (text.includes('403 Forbidden')) {
      console.warn('AI Studio session likely expired. Reloading page to trigger login...');
      window.location.reload();
      // Return a never-resolving promise to prevent further execution while reloading
      return new Promise(() => {});
    }
    throw new Error('Your session has expired. Please log in again.');
  }
  
  throw new Error(`Unexpected response from server (Status: ${status}).`);
};

export const apiFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = DEFAULT_API_RETRIES,
  retryAuthentication = true,
  retryAttempt = 0,
): Promise<Response> => {
  let token = null;
  let isKidSession = false;
  try {
    // If Supabase is pointing to a placeholder, don't even try to get session as it will cause a DNS error/Failed to fetch
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error && isAuthError(error)) {
        await clearAuthSession();
      }
      token = session?.access_token;
    } else {
      console.warn('Supabase not configured, skipping session check in apiFetch');
    }
  } catch (err) {
    console.error('Error getting session in apiFetch:', err);
    if (isAuthError(err)) {
      await clearAuthSession();
    }
  }
  
  if (!token) {
    const kidSessionStr = localStorage.getItem('kid_session');
    if (kidSessionStr) {
      try {
        const kidSession = JSON.parse(kidSessionStr);
        token = kidSession.token;
        isKidSession = true;
      } catch (e) {}
    }
  }
  
  // Create a Headers object from init.headers or input.headers
  let headers = new Headers(init?.headers || {});
  
  // If input is a Request, we should also consider its headers if no init.headers provided
  if (!init?.headers && input instanceof Request) {
    headers = new Headers(input.headers);
  }

  const url = input instanceof Request ? input.url : input.toString();
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const canRetryRequest = isRetryableApiMethod(method);

  if (token && typeof token === 'string' && token !== 'undefined' && token !== 'null' && (url.includes('/api/') || url.startsWith('/api/'))) {
    try {
      // Sanitize token to remove any invalid characters (like newlines) that could cause Headers.set to throw
      const sanitizedToken = token.replace(/[^\x20-\x7E]/g, '');
      headers.set('Authorization', `Bearer ${sanitizedToken}`);
    } catch (e) {
      console.error('Failed to set Authorization header:', e);
    }
  }

  try {
    let response: Response;
    if (input instanceof Request) {
      // Clone the request so it can be used again in case of retry
      const requestToFetch = input.clone();
      const newInit: RequestInit = { ...init, headers };
      response = await fetch(requestToFetch, newInit);
    } else {
      response = await fetch(input, { ...init, headers });
    }

    const contentType = response.headers.get('content-type');

    // Check if we were redirected to the cookie check page
    if (response.url.includes('__cookie_check.html') || (contentType && contentType.includes('text/html') && response.status === 200 && (await response.clone().text().catch(() => '')).includes('__cookie_check.html'))) {
      if (canRetryRequest && retries > 0) {
        const delay = getApiRetryDelayMs(retryAttempt);
        console.warn(`Redirected to cookie check page, retrying in ${delay}ms... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return apiFetch(input, init, retries - 1, retryAuthentication, retryAttempt + 1);
      }
      throw new Error('Redirected to cookie check page. Please refresh the page.');
    }

    // Check for AI Studio fallback page
    if (contentType && contentType.includes('text/html')) {
      const clone = response.clone();
      try {
        const text = await clone.text();
        if (text.includes('Starting Server...') || text.includes('Please wait while your application starts')) {
          throw new Error('Server is starting');
        }
      } catch (e: any) {
        if (e.message === 'Server is starting') throw e;
      }
    }

    const retriableStatuses = [408, 429, 502, 503, 504];
    if (canRetryRequest && retriableStatuses.includes(response.status) && retries > 0) {
      const statusText = `Server error (${response.status})`;
      const backoff = getApiRetryDelayMs(retryAttempt);
      
      console.warn(`${statusText} for ${url}, retrying in ${backoff}ms... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return apiFetch(input, init, retries - 1, retryAuthentication, retryAttempt + 1);
    }

    if (response.status === 401 || response.status === 403 || response.status === 500) {
      if (contentType && contentType.includes('application/json')) {
        const clone = response.clone();
        try {
          const data = await clone.json();
          
          // Only alert for critical configuration errors, not transient ones or known auth errors
          const isKnownAuthError = isAuthError(data.error) || isAuthError(data.details) || isAuthError(data.message);
          
          if (!isKnownAuthError && (data.error === 'Supabase Project Mismatch' || data.error === 'Supabase Connection Error' || (data.error && data.error.includes('API key is not configured')))) {
            const msg = `DEBUG INFO (Status ${response.status}):\n\nError: ${data.error}\n\nDetails: ${data.details || JSON.stringify(data)}\n\nURL: ${url}`;
            console.error('API_FETCH_DEBUG_JSON:', msg);
            alert(msg);
          }
          
          if (data.error === 'Forbidden' || data.error === 'Unauthorized' || data.error === 'Supabase Project Mismatch' || data.error === 'Invalid Session') {
            if (!isKidSession && retryAuthentication && data.error !== 'Supabase Project Mismatch') {
              const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
              if (!refreshError && refreshedData.session) {
                console.warn(`Authentication was rejected for ${url}; refreshed the session and retrying once.`);
                return apiFetch(input, init, retries, false, retryAttempt);
              }
            }
            // Do not destroy the browser session or force a page reload here.
            // The caller needs the original response to show a useful error, and
            // Supabase's auth listener remains responsible for genuine sign-outs.
            console.error(`API authentication rejected for ${url}:`, data);
          }
        } catch (e) {
          // Not JSON or other error
        }
      } else if (response.status === 500) {
        try {
          const text = await response.clone().text();
          if (!isAuthError(text)) {
            const msg = `DEBUG INFO (Status 500, Non-JSON):\n\nURL: ${url}\n\nResponse: ${text.substring(0, 500)}`;
            console.error('API_FETCH_DEBUG_TEXT:', msg);
            alert(msg);
          }
        } catch (e) {
          console.error('Failed to read status 500 response body');
        }
      }
    }
    return response;
  } catch (error) {
    if (canRetryRequest && retries > 0) {
      const backoff = getApiRetryDelayMs(retryAttempt);
      console.warn(`apiFetch failed for ${url}, retrying in ${backoff}ms... (${retries} left)`, error);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return apiFetch(input, init, retries - 1, retryAuthentication, retryAttempt + 1);
    }
    console.error(`apiFetch network error for ${url}:`, error);
    const networkMessage = error instanceof Error ? error.message : String(error);
    const networkError = new Error(`Network failure: ${networkMessage} (URL: ${url}). Please check your connection.`);
    
    // Add alert for critical network failures to help debug
    if (url.includes('/api/')) {
      alert(`NETWORK FAILURE:\n\nURL: ${url}\n\nError: ${networkMessage}\n\nThis usually means the browser cannot reach the backend server. Ensure the development server is running and you are not in an offline state.`);
    }
    
    (networkError as any).originalError = error;
    (networkError as any).url = url;
    throw networkError;
  }
};
