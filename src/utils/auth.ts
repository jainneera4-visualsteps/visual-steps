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
  
  // Extract all potential error message strings recursively/comprehensively
  const getErrorMessages = (err: any): string[] => {
    if (!err) return [];
    if (typeof err === 'string') return [err];
    
    const messages: string[] = [];
    if (typeof err === 'object') {
      if (typeof err.message === 'string') messages.push(err.message);
      if (typeof err.error_description === 'string') messages.push(err.error_description);
      if (typeof err.error === 'string') messages.push(err.error);
      if (typeof err.details === 'string') messages.push(err.details);
      if (typeof err.code === 'string') messages.push(err.code);
      
      // Handle nested structures e.g. err.error: { message: '...' }
      if (err.error && typeof err.error === 'object') {
        messages.push(...getErrorMessages(err.error));
      }
      try {
        messages.push(JSON.stringify(err));
      } catch (e) {}
    }
    return messages;
  };

  const messages = getErrorMessages(error);
  const combinedMessage = messages.join(' ').toLowerCase();

  const isAuthErr = (
    combinedMessage.includes('session') ||
    combinedMessage.includes('refresh') ||
    combinedMessage.includes('jwt') ||
    combinedMessage.includes('unauthorized') ||
    combinedMessage.includes('forbidden') ||
    combinedMessage.includes('credentials') ||
    combinedMessage.includes('expired') ||
    combinedMessage.includes('auth') ||
    combinedMessage.includes('mismatch') ||
    combinedMessage.includes('not found') ||
    combinedMessage.includes('invalid') ||
    combinedMessage.includes('token')
  );

  if (isAuthErr) {
    console.error('Detected Auth Error inside error object:', error, 'Combined message parsed:', combinedMessage);
  }
  
  return isAuthErr;
};
