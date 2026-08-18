import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../utils/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/Card';
import { AlertCircle, CheckCircle, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const recoveryRedirect = new URLSearchParams(window.location.search).get('mode') === 'recovery';
  const [isRecovery, setIsRecovery] = useState(recoveryRedirect);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const recoveryError = hashParams.get('error_description');
    if (recoveryError) setError(decodeURIComponent(recoveryError.replace(/\+/g, ' ')));
    if (!recoveryRedirect) return;

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) setError(sessionError.message);
      setRecoveryReady(Boolean(data.session));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && recoveryRedirect)) {
        setIsRecovery(true);
        setRecoveryReady(Boolean(session));
      }
    });

    return () => subscription.unsubscribe();
  }, [recoveryRedirect]);

  const handleSendRecoveryEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const redirectTo = `${window.location.origin}/forgot-password?mode=recovery`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
      if (resetError) throw resetError;
      setSuccess(`If an account exists for ${normalizedEmail}, a password reset link has been sent. Please check your inbox and spam folder.`);
    } catch (requestError: any) {
      setError(requestError.message || 'Unable to send the password reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('This password reset link is invalid or has expired. Please request a new link.');

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      try {
        await apiFetch('/api/auth/password-change-confirmation', { method: 'POST' }, 0);
      } catch (notificationError) {
        console.warn('Password changed, but confirmation email could not be requested', notificationError);
      }

      await supabase.auth.signOut();
      setSuccess('Your password has been updated securely. Redirecting to sign in...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (resetError: any) {
      setError(resetError.message || 'Unable to update the password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Card className="w-full max-w-sm shadow-sm border-none ring-1 ring-slate-200">
        <CardHeader className="space-y-0.5 py-3 px-5">
          <CardTitle className="text-xl text-center font-bold">
            {isRecovery ? 'Choose a New Password' : 'Reset Password'}
          </CardTitle>
          <p className="text-center text-[12px] text-slate-500 uppercase font-bold tracking-wider">
            {isRecovery ? 'Secure email recovery' : 'Receive a secure recovery link'}
          </p>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {success ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-3">
              <CheckCircle className="h-9 w-9 text-green-500" />
              <p className="text-center text-sm font-semibold text-green-700">{success}</p>
            </div>
          ) : (
            <form onSubmit={isRecovery ? handleSetNewPassword : handleSendRecoveryEmail} className="space-y-3">
              {error && (
                <div className="flex items-start gap-2 rounded bg-red-50 p-2 text-[12px] text-red-600">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {isRecovery ? (
                <>
                  {!recoveryReady && !error && (
                    <p className="rounded bg-amber-50 p-2 text-center text-xs text-amber-800">Verifying your recovery link…</p>
                  )}
                  <Input label="New Password" type="password" placeholder="At least 6 characters" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required disabled={!recoveryReady} className="h-8 text-sm" />
                  <Input label="Confirm New Password" type="password" placeholder="Enter the password again" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={!recoveryReady} className="h-8 text-sm" />
                  <Button type="submit" size="xs" className="w-full h-8 text-sm" isLoading={isLoading} disabled={!recoveryReady}>Update Password</Button>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 rounded bg-blue-50 p-2 text-xs text-blue-700">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                    We will email you a secure, single-use link to choose a new password.
                  </div>
                  <Input label="Email" type="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-8 text-sm" />
                  <Button type="submit" size="xs" className="w-full h-8 text-sm" isLoading={isLoading}>Send Reset Link</Button>
                </>
              )}
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center border-t py-2 px-4">
          <Link to="/login" className="text-[12px] font-bold text-blue-600 hover:underline uppercase tracking-wider">Back to Sign In</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
