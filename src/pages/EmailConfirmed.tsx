import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { CheckCircle, LoaderCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const finishingRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const finishConfirmation = async (session: Session | null) => {
      if (!active || finishingRef.current || !session) return;
      finishingRef.current = true;
      try {
        // The confirmation link creates a short-lived authenticated session.
        // Use it to create the verified parent profile and send the welcome
        // message, then require credentials on the normal sign-in form.
        const welcomeResponse = await apiFetch('/api/auth/complete-registration', { method: 'POST' }, 0);
        if (!welcomeResponse.ok) {
          const welcomeResult = await welcomeResponse.json().catch(() => ({}));
          throw new Error(welcomeResult.error || 'Your verified account could not be prepared yet.');
        }
        await supabase.auth.signOut({ scope: 'local' });
        if (active) navigate('/login?email-confirmed=true', { replace: true });
      } catch (confirmationError: any) {
        finishingRef.current = false;
        if (active) setError(confirmationError.message || 'Your email is verified, but your account could not be prepared yet.');
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Let Supabase release its internal auth lock before the welcome API
      // reads the newly created confirmation session.
      window.setTimeout(() => void finishConfirmation(session), 0);
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError && active) setError(sessionError.message);
      void finishConfirmation(data.session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-[55vh] w-full items-center justify-center px-4">
      <Card className="w-full max-w-md border-none text-center shadow-sm ring-1 ring-slate-200">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            {error ? <CheckCircle className="h-8 w-8 text-emerald-600" /> : <LoaderCircle className="h-8 w-8 animate-spin text-blue-600" />}
          </div>
          <CardTitle>{error ? 'Email verified' : 'Finishing email verification'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <p className="text-sm leading-6 text-slate-600">
            {error || 'Please wait while Visual Steps prepares your sign-in page.'}
          </p>
          {error && <Button type="button" className="w-full" onClick={() => window.location.reload()}>Retry Account Setup</Button>}
        </CardContent>
      </Card>
    </div>
  );
}
