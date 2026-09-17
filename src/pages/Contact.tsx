import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { useAuth } from '../context/AuthContext';

export default function Contact() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState(params.get('topic') === 'testimonial' ? 'I would like to share a Visual Steps story' : 'Visual Steps question');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.name) setName(current => current || user.name || '');
    if (user?.email) setEmail(current => current || user.email || '');
  }, [user]);

  const submitMessage = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSending(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message, website }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'We could not send your message. Please try again.');
      setSuccess(result.message || 'Your message was sent to Visual Steps.');
      setMessage('');
      setSubject('Visual Steps question');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return <div className="page-shell">
    <div className="page-container max-w-5xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/" className="inline-flex h-7 items-center rounded-xl pr-2 text-[12px] font-bold uppercase tracking-wider text-slate-600 hover:text-blue-600">
          <ArrowLeft className="mr-1 h-3 w-3"/>Back
        </Link>
        <h1 className="text-xl font-bold leading-none tracking-tight text-slate-900">Send Message</h1>
      </div>
      <form onSubmit={submitMessage}>
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-2">
            <CardTitle className="text-base font-bold">Contact Visual Steps</CardTitle>
            <Button type="submit" size="xs" disabled={sending} className="h-8 px-3 text-[12px] font-bold">
              {sending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/> : <Mail className="mr-1.5 h-3.5 w-3.5"/>}
              {sending ? 'Sending…' : 'Send Message'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            {success && <div role="status" className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0"/><p className="text-sm font-bold">{success}</p></div>}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Your name" value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={100}/>
                <Input label="Your email" type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254}/>
              </div>
              <div className="mt-4"><Input label="Subject" value={subject} onChange={event => setSubject(event.target.value)} required minLength={3} maxLength={150}/></div>
              <label className="mt-4 block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Message</span><textarea className="app-control min-h-40 w-full resize-y" value={message} onChange={event => setMessage(event.target.value)} required minLength={10} maxLength={3000}/></label>
              <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)}/></label>
            </div>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            <p className="text-xs text-slate-500">Do not include passwords, child access codes, medical records, or other sensitive information.</p>
          </CardContent>
        </Card>
      </form>
    </div>
  </div>;
}
