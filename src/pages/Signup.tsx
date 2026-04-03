import { supabase } from '../lib/supabase';
import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/Card';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [secretQuestion, setSecretQuestion] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
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
            email,
            name,
            password,
            secretQuestion,
            secretAnswer,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create profile');
        }
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex items-center justify-center py-2">
      <Card className="w-full max-w-md shadow-sm border-none ring-1 ring-slate-200">
        <CardHeader className="py-3 space-y-0.5">
          <CardTitle className="text-xl text-center font-bold">Create an account</CardTitle>
          <p className="text-center text-[12px] text-slate-500 uppercase font-bold tracking-wider">
            Enter your details to get started
          </p>
        </CardHeader>
        <CardContent className="pb-3 px-5">
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
            
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Security Question (for recovery)</p>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Select a Question</label>
                  <select
                    className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent"
                    value={secretQuestion}
                    onChange={(e) => setSecretQuestion(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select a security question</option>
                    <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                    <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                    <option value="What was the name of your elementary school?">What was the name of your elementary school?</option>
                    <option value="In what city were you born?">In what city were you born?</option>
                    <option value="What was your first car?">What was your first car?</option>
                    <option value="What is your favorite book?">What is your favorite book?</option>
                    <option value="What is the name of the street you grew up on?">What is the name of the street you grew up on?</option>
                    <option value="custom">-- Write my own question --</option>
                  </select>
                </div>

                {secretQuestion === 'custom' || (secretQuestion && !["What was the name of your first pet?", "What is your mother's maiden name?", "What was the name of your elementary school?", "In what city were you born?", "What was your first car?", "What is your favorite book?", "What is the name of the street you grew up on?"].includes(secretQuestion)) ? (
                  <Input
                    label="Your Custom Question"
                    type="text"
                    placeholder="Enter your own security question"
                    value={secretQuestion === 'custom' ? '' : secretQuestion}
                    onChange={(e) => setSecretQuestion(e.target.value)}
                    required
                    className="h-8 text-sm"
                  />
                ) : null}

                <Input
                  label="Answer"
                  type="text"
                  placeholder="Your answer"
                  value={secretAnswer}
                  onChange={(e) => setSecretAnswer(e.target.value)}
                  required
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <Button type="submit" size="xs" className="w-full mt-1 h-8 text-sm" isLoading={isLoading}>
              Sign Up
            </Button>
          </form>
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
