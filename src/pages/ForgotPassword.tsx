import { apiFetch } from '../utils/api';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/Card';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [secretQuestion, setSecretQuestion] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGetQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await apiFetch('/api/auth/get-secret-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'User not found');

      setSecretQuestion(data.secretQuestion);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, secretAnswer, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Card className="w-full max-w-sm shadow-sm border-none ring-1 ring-slate-200">
        <CardHeader className="space-y-0.5 py-3 px-5">
          <CardTitle className="text-xl text-center font-bold">Reset Password</CardTitle>
          <p className="text-center text-[12px] text-slate-500 uppercase font-bold tracking-wider">
            {step === 1 ? 'Enter your email' : 'Answer your security question'}
          </p>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {success ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-2">
              <CheckCircle className="h-8 w-8 text-blue-500" />
              <p className="text-center text-base font-bold text-blue-700">{success}</p>
            </div>
          ) : (
            <form onSubmit={step === 1 ? handleGetQuestion : handleResetPassword} className="space-y-2.5">
              {error && (
                <div className="flex items-center gap-2 rounded bg-red-50 p-1.5 text-[12px] text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </div>
              )}

              {step === 1 && (
                <>
                  <Input
                    label="Email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-8 text-sm"
                  />
                  <Button type="submit" size="xs" className="w-full h-8 text-sm" isLoading={isLoading}>
                    Next
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="rounded bg-slate-50 p-2 border border-slate-200">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Security Question</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{secretQuestion}</p>
                  </div>
                  <Input
                    label="Answer"
                    type="text"
                    placeholder="Your answer"
                    value={secretAnswer}
                    onChange={(e) => setSecretAnswer(e.target.value)}
                    required
                    className="h-8 text-sm"
                  />
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-8 text-sm"
                  />
                  <Button type="submit" size="xs" className="w-full h-8 text-sm" isLoading={isLoading}>
                    Reset Password
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="w-full h-7 text-[12px]"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                </>
              )}
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center border-t py-2 px-4">
          <Link to="/login" className="text-[12px] font-bold text-blue-600 hover:underline uppercase tracking-wider">
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
