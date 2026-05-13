import { supabase } from '../lib/supabase';

export const clearAuthSession = async () => {
  console.warn('Clearing auth session due to invalid token...');
  
  // 1. Manually clear local storage for Supabase and our own tokens
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('sb-') || 
        key.includes('auth-token') || 
        key === 'token' || 
        key === 'kid_session' ||
        key.includes('supabase.auth.token')
      )) {
        localStorage.removeItem(key);
        // Decrement index since we removed an item
        i--;
      }
    }
  } catch (e) {
    console.error('Error clearing localStorage:', e);
  }

  // 2. Try to call signOut to notify Supabase (even if it might fail)
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('Supabase signOut failed (expected if token was already invalid):', e);
  }

  // 3. Clear session storage just in case
  try {
    sessionStorage.clear();
  } catch (e) {}

  // 4. Force a reload if we are not on the login/landing page
  if (window.location.pathname !== '/' && window.location.pathname !== '/signup') {
    window.location.href = '/';
  }
};

export const isAuthError = (error: any): boolean => {
  if (!error) return false;
  const message = typeof error === 'string' ? error : (error.message || error.error_description || error.error || '');
  
  const isAuthErr = (
    message.includes('Auth session missing!') ||
    message.includes('Refresh Token Not Found') || 
    message.includes('Invalid Refresh Token') ||
    message.includes('JWT expired') ||
    message.includes('Invalid login credentials') ||
    message.includes('Invalid Session') ||
    message.includes('Supabase Project Mismatch') ||
    message.includes('Unauthorized') ||
    message.includes('Forbidden') ||
    message.includes('User not found') ||
    message.includes('session_not_found') ||
    message.includes('refresh_token_not_found')
  );

  if (isAuthErr) {
    console.error('Detected Auth Error:', message);
  }
  
  return isAuthErr;
};
