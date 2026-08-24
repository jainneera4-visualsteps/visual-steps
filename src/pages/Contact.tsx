import { FormEvent, useState } from 'react';
import { Mail, MessageSquareText, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

const CONTACT_EMAIL = 'visualstepsautism@gmail.com';

export default function Contact() {
  const [params] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(params.get('topic') === 'testimonial' ? 'I would like to share a Visual Steps story' : 'Visual Steps question');
  const [message, setMessage] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = `Name: ${name}\nReply email: ${email}\n\n${message}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return <div className="page-shell"><div className="page-container space-y-8">
    <section className="mx-auto max-w-3xl text-center"><span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-800"><Mail className="h-4 w-4" /> Contact Visual Steps</span><h1 className="mt-6 text-4xl font-black text-slate-950 sm:text-6xl">How can we help?</h1><p className="mt-4 text-lg leading-8 text-slate-600">Ask a product question, report a problem, suggest a feature, or request permission to share a family story.</p></section>
    <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.7fr_1.3fr]">
      <aside className="space-y-4"><div className="app-callout"><MessageSquareText className="h-6 w-6 text-brand-700" /><h2 className="mt-3 font-bold">What to include</h2><p className="mt-2 text-sm leading-6 text-slate-600">Tell us which page you were using, what you expected, and what happened. Never send a password, child login code, payment information, or sensitive clinical information.</p></div><div className="app-callout"><ShieldCheck className="h-6 w-6 text-emerald-700" /><h2 className="mt-3 font-bold">Your privacy</h2><p className="mt-2 text-sm leading-6 text-slate-600">This form opens your own email application. The information you enter is not saved on the Contact page.</p></div></aside>
      <form onSubmit={submit} className="surface space-y-5 p-7"><Input label="Your name" value={name} onChange={event => setName(event.target.value)} required /><Input label="Your email" type="email" value={email} onChange={event => setEmail(event.target.value)} required /><Input label="Subject" value={subject} onChange={event => setSubject(event.target.value)} required /><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Message</span><textarea className="app-control min-h-40 w-full resize-y" value={message} onChange={event => setMessage(event.target.value)} required maxLength={3000} /></label><Button type="submit" className="w-full sm:w-auto"><Mail className="mr-2 h-4 w-4" /> Open email to send</Button><p className="text-xs leading-5 text-slate-500">You will review and send the message from your email app to {CONTACT_EMAIL}.</p></form>
    </section>
  </div></div>;
}
