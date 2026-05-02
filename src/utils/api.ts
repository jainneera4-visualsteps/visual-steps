import { supabase } from '../lib/supabase';

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

export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit, retries = 15): Promise<Response> => {
  let token = null;
  let isKidSession = false;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error && (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token'))) {
      console.warn('apiFetch: Invalid refresh token detected, clearing session...');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
          localStorage.removeItem(key);
        }
      }
      await supabase.auth.signOut().catch(() => {});
    }
    token = session?.access_token;
  } catch (err) {
    console.error('Error getting session in apiFetch:', err);
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
      console.warn('Redirected to cookie check page, retrying...');
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return apiFetch(input, init, retries - 1);
      }
      throw new Error('Redirected to cookie check page and retries exhausted. Please refresh the page.');
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

    if (response.status === 503 && retries > 0) {
      console.warn(`Service unavailable (503), retrying... (${retries} left)`);
      const backoff = (16 - retries) * 1000; // Increasing delay
      await new Promise(resolve => setTimeout(resolve, backoff));
      return apiFetch(input, init, retries - 1);
    }

    if (response.status === 401 || response.status === 403 || response.status === 500) {
      if (contentType && contentType.includes('application/json')) {
        const clone = response.clone();
        try {
          const data = await clone.json();
          
          // Only alert for critical configuration errors, not transient ones
          if (data.error === 'Supabase Project Mismatch' || data.error === 'Supabase Connection Error' || (data.error && data.error.includes('API key is not configured'))) {
            const msg = `DEBUG INFO (Status ${response.status}):\n\nError: ${data.error}\n\nDetails: ${data.details || JSON.stringify(data)}\n\nURL: ${url}`;
            console.error('API_FETCH_DEBUG_JSON:', msg);
            alert(msg);
          }
          
          if (data.error === 'Forbidden' || data.error === 'Unauthorized' || data.error === 'Supabase Project Mismatch' || data.error === 'Invalid Session') {
            const wasKid = isKidSession;
            
            // Only redirect if we are NOT on a standalone view page
            const isStandaloneView = window.location.pathname.includes('/social-stories/view/');
            
            if (!isStandaloneView) {
              localStorage.removeItem('token');
              localStorage.removeItem('kid_session');
              // Manually clear local storage as a fallback
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
                  localStorage.removeItem(key);
                }
              }
              // Crucial: Actually sign out of Supabase to clear the invalid session from local storage
              supabase.auth.signOut().catch(() => {});
              
              if (window.location.pathname !== '/' && window.location.pathname !== '/signup') {
                window.location.href = wasKid ? '/?mode=kid' : '/';
              }
            } else {
              console.warn('Auth error on standalone view, but skipping redirect to allow component to handle it.');
            }
          }
        } catch (e) {
          // Not JSON or other error
        }
      } else if (response.status === 500) {
        try {
          const text = await response.clone().text();
          const msg = `DEBUG INFO (Status 500, Non-JSON):\n\nURL: ${url}\n\nResponse: ${text.substring(0, 500)}`;
          console.error('API_FETCH_DEBUG_TEXT:', msg);
          alert(msg);
        } catch (e) {
          console.error('Failed to read status 500 response body');
        }
      }
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      console.warn(`apiFetch failed for ${url}, retrying... (${retries} left)`, error);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return apiFetch(input, init, retries - 1);
    }
    console.error(`apiFetch network error for ${url}:`, error);
    const networkError = new Error(`Failed to connect to the server at ${url}. Please check your internet connection or try again later.`);
    (networkError as any).originalError = error;
    throw networkError;
  }
};
