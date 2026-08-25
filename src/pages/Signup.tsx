import { supabase } from '../lib/supabase';
import { apiFetch } from '../utils/api';
import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/Card';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [welcomeEmailSent, setWelcomeEmailSent] = useState<boolean | null>(null);
  const [createdAccountEmail, setCreatedAccountEmail] = useState('');
  const [signupCreatedSession, setSignupCreatedSession] = useState(false);
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
    setWelcomeEmailSent(null);
    setCreatedAccountEmail('');
    setIsLoading(true);
    signupInProgressRef.current = true;
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create profile in custom users table
        const res = await apiFetch('/api/auth/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.user.id,
            email: normalizedEmail,
            name,
            privacyAccepted: legalAccepted,
            termsAccepted: legalAccepted,
          }),
        });

        const profileResult = await res.json();
        if (!res.ok) {
          throw new Error(profileResult.error || 'Failed to create profile');
        }
        setWelcomeEmailSent(profileResult.emailSent === true);
      }

      setSignupCreatedSession(Boolean(data.session));
      setCreatedAccountEmail(normalizedEmail);
      setSuccess(data.session
        ? 'Your account was created successfully.'
        : 'Your account was created successfully. Confirm your email before signing in.');
    } catch (err: any) {
      signupInProgressRef.current = false;
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
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
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <div>
                <p className="text-lg font-bold text-slate-900">Account created!</p>
                <p className="mt-1 text-sm text-slate-600">{success}</p>
              </div>
              <div className={`rounded-md p-3 text-sm ${welcomeEmailSent ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>
                {welcomeEmailSent
                  ? <>A welcome email was sent to <strong>{createdAccountEmail}</strong>.</>
                  : <>Your account is ready, but the welcome email to <strong>{createdAccountEmail}</strong> could not be sent. You can resend it later from Profile.</>}
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={handleContinue}
                isLoading={isLoading}
              >
                {signupCreatedSession ? 'Continue to Dashboard' : 'Continue to Sign In'}
              </Button>
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
