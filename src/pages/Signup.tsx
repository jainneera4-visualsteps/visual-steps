import { supabase } from '../lib/supabase';
import { apiFetch } from '../utils/api';
import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/Card';
import { AlertCircle, CheckCircle, Eye, EyeOff, MailCheck } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdAccountEmail, setCreatedAccountEmail] = useState('');
  const [signupCreatedSession, setSignupCreatedSession] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const signupInProgressRef = useRef(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !signupInProgressRef.current && !success) {
      navigate('/dashboard');
    }
  }, [user, success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setResendMessage('');
    setCreatedAccountEmail('');
    setIsLoading(true);
    signupInProgressRef.current = true;
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirmed`,
          data: {
            name: name.trim(),
            privacyAccepted: legalAccepted,
            termsAccepted: legalAccepted,
            legalVersion: '2026-08-25',
          },
        },
      });

      if (error) throw error;

      // Email-confirmed registrations do not have a session yet. Their parent
      // profile is created only after the confirmation link proves ownership
      // of the address. Auto-confirmed development projects can finish here.
      if (data.user && data.session) {
        const res = await apiFetch('/api/auth/complete-registration', {
          method: 'POST',
        });

        const profileResult = await res.json();
        if (!res.ok) {
          throw new Error(profileResult.error || 'Failed to create profile');
        }
      }

      setSignupCreatedSession(Boolean(data.session));
      setCreatedAccountEmail(normalizedEmail);
      setSuccess(data.session
        ? 'Your account is ready. You can continue to your dashboard.'
        : 'Open the verification message we sent and select Confirm Email before signing in.');
    } catch (err: any) {
      signupInProgressRef.current = false;
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setError('');
    setResendMessage('');
    setIsLoading(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: createdAccountEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
      });
      if (resendError) throw resendError;
      setResendMessage('A new verification message was requested. Check your inbox and spam folder.');
    } catch (resendError: any) {
      setError(resendError.message || 'The verification message could not be resent. Please wait a moment and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseDifferentEmail = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    signupInProgressRef.current = false;
    setSuccess('');
    setCreatedAccountEmail('');
    setSignupCreatedSession(false);
    setResendMessage('');
    setPassword('');
  };

  const handleContinue = async () => {
    if (!signupCreatedSession) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    try {
      await refreshProfile();
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Card className="w-full max-w-md shadow-sm border-none ring-1 ring-slate-200">
        <CardHeader className="py-3 space-y-0.5">
          <CardTitle className="text-xl text-center font-bold">Create an account</CardTitle>
          <p className="text-center text-[12px] text-slate-500 uppercase font-bold tracking-wider">
            Enter your details to get started
          </p>
        </CardHeader>
        <CardContent className="pb-3 px-5">
          {success ? (
            <div className="space-y-4 py-4 text-center">
              {signupCreatedSession
                ? <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                : <MailCheck className="mx-auto h-12 w-12 text-blue-600" />}
              <div>
                <p className="text-lg font-bold text-slate-900">{signupCreatedSession ? 'Account ready' : 'Verify your email'}</p>
                <p className="mt-1 text-sm text-slate-600">{success}</p>
              </div>
              {!signupCreatedSession && <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                Verification was requested for <strong>{createdAccountEmail}</strong>. Receiving this message can take a few minutes.
              </div>}
              {resendMessage && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{resendMessage}</div>}
              {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              {signupCreatedSession && <Button
                type="button"
                className="w-full"
                onClick={handleContinue}
                isLoading={isLoading}
              >
                Continue to Dashboard
              </Button>}
              {!signupCreatedSession && <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" onClick={handleResendConfirmation} isLoading={isLoading}>Resend verification</Button>
                <Button type="button" variant="outline" onClick={handleUseDifferentEmail}>Use a different email</Button>
              </div>}
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {error && (
              <div className="flex items-center gap-2 rounded bg-red-50 p-1.5 text-[12px] text-red-600">
                <AlertCircle className="h-3 w-3" />
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                label="Full Name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-8 text-sm"
              />
              <Input
                label="Email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-8 text-sm"
              />
            </div>
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-8 text-sm"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />
            <p className="text-[11px] leading-4 text-slate-500">Use at least 6 characters. A longer, unique password is safer.</p>
            <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-2 text-[11px] leading-5 text-slate-600">
              <input type="checkbox" className="mt-1" checked={legalAccepted} onChange={event => setLegalAccepted(event.target.checked)} required />
              <span>I agree to the <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 underline">Terms of Service</Link> and acknowledge the <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 underline">Privacy Policy</Link>.</span>
            </label>
            <Button type="submit" size="xs" className="w-full mt-1 h-8 text-sm" isLoading={isLoading}>
              Sign Up
            </Button>
          </form>
          )}
        </CardContent>
        <CardFooter className="justify-center border-t py-2 px-4">
          <p className="text-[12px] text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
