import { FormEvent, useState } from 'react';
import { CheckCircle2, Mail, MessageSquareText, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export default function Contact() {
  const [params] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(params.get('topic') === 'testimonial' ? 'I would like to share a Visual Steps story' : 'Visual Steps question');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSending(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message, website }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'We could not send your message. Please try again.');
      setSent(true);
      setMessage('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return <div className="page-shell"><div className="page-container space-y-8">
    <section className="mx-auto max-w-3xl text-center"><span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-800"><Mail className="h-4 w-4" /> Contact Visual Steps</span><h1 className="mt-6 text-4xl font-black text-slate-950 sm:text-6xl">How can we help?</h1><p className="mt-4 text-lg leading-8 text-slate-600">Ask a product question, report a problem, suggest a feature, or request permission to share a family story.</p></section>
    <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.7fr_1.3fr]">
      <aside className="space-y-4"><div className="app-callout"><MessageSquareText className="h-6 w-6 text-brand-700" /><h2 className="mt-3 font-bold">What to include</h2><p className="mt-2 text-sm leading-6 text-slate-600">Tell us which page you were using, what you expected, and what happened. Never send a password, child login code, payment information, or sensitive clinical information.</p></div><div className="app-callout"><ShieldCheck className="h-6 w-6 text-emerald-700" /><h2 className="mt-3 font-bold">Your privacy</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your message is sent securely to Visual Steps. It is used to understand and respond to your question and is not displayed publicly.</p></div></aside>
      <form onSubmit={submit} className="surface space-y-5 p-7">
        {sent && <div role="status" className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Message sent</p><p className="mt-1 text-sm">Visual Steps received your message and can reply to the email address you provided.</p></div></div>}
        <Input label="Your name" value={name} onChange={event => { setName(event.target.value); setSent(false); }} required maxLength={100} />
        <Input label="Your email" type="email" value={email} onChange={event => { setEmail(event.target.value); setSent(false); }} required maxLength={254} />
        <Input label="Subject" value={subject} onChange={event => { setSubject(event.target.value); setSent(false); }} required maxLength={150} />
        <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Message</span><textarea className="app-control min-h-40 w-full resize-y" value={message} onChange={event => { setMessage(event.target.value); setSent(false); }} required minLength={10} maxLength={3000} /></label>
        <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <Button type="submit" className="w-full sm:w-auto" disabled={sending}><Mail className="mr-2 h-4 w-4" /> {sending ? 'Sending…' : 'Send message'}</Button>
        <p className="text-xs leading-5 text-slate-500">Your email application will not open. Visual Steps will receive this message directly.</p>
      </form>
    </section>
  </div></div>;
}
