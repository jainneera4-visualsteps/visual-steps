import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [secretQuestion, setSecretQuestion] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const securityQuestions = [
    "What was the name of your first pet?",
    "What is your mother's maiden name?",
    "What was the name of your elementary school?",
    "In what city were you born?",
    "What was your first car?",
    "What is your favorite book?",
    "What is the name of the street you grew up on?"
  ];

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setSecretQuestion(user.secret_question || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await apiFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, newPassword, secretQuestion, secretAnswer }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setNewPassword(''); // Clear password field
      setSecretAnswer(''); // Clear answer field
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await apiFetch('/api/auth/resend-welcome-email', {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend email');

      setMessage({ type: 'success', text: 'Welcome email sent! Please check your inbox (and spam folder).' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="mb-6">
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">Account Settings</h1>
            <p className="text-lg font-normal text-slate-500 mt-3">Manage your account details and preferences.</p>
          </div>
        </div>
      </div>
      
      <Card className="shadow-sm border-none ring-1 ring-slate-200">
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-base">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            {message.text && (
              <div className={`flex items-center gap-2 rounded p-1.5 text-[12px] ${
                message.type === 'success' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
              }`}>
                {message.type === 'success' ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {message.text}
              </div>
            )}

            <div className="grid gap-2.5 md:grid-cols-2">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-7 text-sm"
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-7 text-sm"
              />
            </div>

            <div className="pt-1.5 border-t border-slate-100 space-y-2">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Security Question</h3>
              <div className="grid gap-2.5 md:grid-cols-2">
                <div className="space-y-0.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Select a Question</label>
                  <select
                    className="flex h-7 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    value={securityQuestions.includes(secretQuestion) ? secretQuestion : (secretQuestion ? 'custom' : '')}
                    onChange={(e) => setSecretQuestion(e.target.value)}
                  >
                    <option value="" disabled>Select a security question</option>
                    {securityQuestions.map(q => <option key={q} value={q}>{q}</option>)}
                    <option value="custom">-- Write my own question --</option>
                  </select>
                </div>

                <Input
                  label="Answer"
                  type="text"
                  placeholder="Keep current answer"
                  value={secretAnswer}
                  onChange={(e) => setSecretAnswer(e.target.value)}
                  className="h-7 text-sm"
                />
              </div>

              {(secretQuestion === 'custom' || (secretQuestion && !securityQuestions.includes(secretQuestion))) && (
                <Input
                  label="Your Custom Question"
                  type="text"
                  placeholder="Enter your own security question"
                  value={secretQuestion === 'custom' ? '' : secretQuestion}
                  onChange={(e) => setSecretQuestion(e.target.value)}
                  className="h-7 text-sm"
                />
              )}
            </div>

            <div className="pt-1.5 border-t border-slate-100">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Change Password</h3>
              <Input
                label="New Password"
                type="password"
                placeholder="Keep current password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-7 text-sm"
              />
            </div>

            <div className="flex justify-between items-center pt-1.5">
              <Button 
                type="button" 
                variant="outline" 
                size="xs" 
                className="h-7 text-[11px] border-slate-200 text-slate-500 hover:text-slate-700"
                onClick={handleResendEmail}
                isLoading={isResending}
              >
                Resend Welcome Email
              </Button>
              <Button type="submit" size="xs" className="h-7 text-sm" isLoading={isLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
