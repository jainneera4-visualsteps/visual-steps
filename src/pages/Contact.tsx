import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Mail, MessageSquareText, ShieldCheck, UserRound, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { formatAppDateTime } from '../utils/dateUtils';

type ContactView = 'message' | 'private' | 'group';
type ConsultationSession = { id: string; session_type: 'private' | 'group'; title: string; description: string; starts_at?: string; ends_at?: string; capacity?: number; booked?: number; available?: number; is_rule?: boolean; weekday?: number; weekday_label?: string; start_time?: string; end_time?: string; duration_minutes?: number; timezone?: string };

export default function Contact() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [view, setView] = useState<ContactView>('message');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState(params.get('topic') === 'testimonial' ? 'I would like to share a Visual Steps story' : 'Visual Steps question');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedTime, setRequestedTime] = useState('');
  const [reason, setReason] = useState('');
  const [accessibilityRequest, setAccessibilityRequest] = useState('');
  const [groupPrivacyAcknowledged, setGroupPrivacyAcknowledged] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { if (user) { setName(current => current || user.name || ''); setEmail(current => current || user.email || ''); } }, [user]);
  useEffect(() => {
    if (view === 'message') return;
    setLoadingSessions(true); setError(''); setSessionId(''); setRequestedDate(''); setRequestedTime(''); setSessions([]); setUnavailableDates([]);
    fetch(`/api/consultations/sessions?type=${view}`)
      .then(async response => { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Unable to load available times'); setSessions(data.items || []); setUnavailableDates(data.unavailableDates || []); })
      .catch(loadError => setError(loadError instanceof Error ? loadError.message : 'Unable to load available times'))
      .finally(() => setLoadingSessions(false));
  }, [view]);

  const submitMessage = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSuccess(''); setSending(true);
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, subject, message, website }) });
      const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || 'We could not send your message. Please try again.');
      setSuccess(result.message || 'Visual Steps received your message.'); setMessage('');
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'We could not send your message. Please try again.'); }
    finally { setSending(false); }
  };

  const submitConsultation = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSuccess(''); setSending(true);
    try {
      const response = await fetch('/api/consultations/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: view === 'group' ? sessionId : undefined, availabilityRuleId: view === 'private' ? sessionId : undefined, requestedDate: view === 'private' ? requestedDate : undefined, requestedTime: view === 'private' ? requestedTime : undefined, parentName: name, parentEmail: email, reason, accessibilityRequest, groupPrivacyAcknowledged, parentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York' }) });
      const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || 'Unable to submit the consultation request');
      setSuccess(result.message); setReason(''); setAccessibilityRequest(''); setGroupPrivacyAcknowledged(false); setSessionId(''); setRequestedDate(''); setRequestedTime('');
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to submit the consultation request'); }
    finally { setSending(false); }
  };

  const verified = params.get('consultation') === 'verified';
  const invalid = params.get('consultation') === 'invalid';
  const tabs: Array<{ id: ContactView; label: string; icon: typeof Mail }> = [{ id: 'message', label: 'Send a Message', icon: Mail }, { id: 'private', label: 'Book a Private Call', icon: UserRound }, { id: 'group', label: 'Join a Group Session', icon: Users }];
  const requestedWeekday = requestedDate ? new Date(`${requestedDate}T12:00:00Z`).getUTCDay() : -1;
  const privateSlots = sessions.filter(session => session.weekday === requestedWeekday).flatMap(session => {
    const toMinutes = (value: string) => { const [hour, minute] = value.slice(0, 5).split(':').map(Number); return hour * 60 + minute; };
    const slots: Array<{ ruleId: string; time: string; label: string }> = [];
    const duration = session.duration_minutes || 30;
    for (let minutes = toMinutes(session.start_time || '00:00'); minutes + duration <= toMinutes(session.end_time || '00:00'); minutes += duration) {
      const hour = Math.floor(minutes / 60); const minute = minutes % 60; const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const displayHour = hour % 12 || 12; slots.push({ ruleId: session.id, time, label: `${displayHour}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'} (${session.timezone}) — ${session.title}` });
    }
    return slots;
  });
  const selectedDateUnavailable = unavailableDates.includes(requestedDate);

  return <div className="page-shell"><div className="page-container space-y-8">
    <section className="mx-auto max-w-3xl text-center"><span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-800"><Mail className="h-4 w-4"/>Contact & Support</span><h1 className="mt-6 text-4xl font-black text-slate-950 sm:text-6xl">How can we help?</h1><p className="mt-4 text-lg leading-8 text-slate-600">Send a question, request a private consultation, or join other parents for a Visual Steps group session.</p></section>
    {verified && <p role="status" className="mx-auto max-w-5xl rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">Your email is verified and your consultation request was submitted. Visual Steps will email you when it is confirmed.</p>}{invalid && <p role="alert" className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-800">That verification link is invalid or expired. Please submit the consultation request again.</p>}
    <nav className="mx-auto flex max-w-5xl flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Contact and consultation options">{tabs.map(tab => { const Icon = tab.icon; return <button key={tab.id} type="button" onClick={() => { setView(tab.id); setError(''); setSuccess(''); }} className={`rounded-xl px-4 py-3 text-sm font-black ${view === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><Icon className="mr-2 inline h-4 w-4"/>{tab.label}</button>; })}</nav>
    <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.7fr_1.3fr]">
      <aside className="space-y-4"><div className="app-callout"><MessageSquareText className="h-6 w-6 text-brand-700"/><h2 className="mt-3 font-bold">Choose the right option</h2><p className="mt-2 text-sm leading-6 text-slate-600">Use a private call for account or family-specific questions. Group sessions are for demonstrations and general questions shared by several families.</p></div><div className="app-callout"><ShieldCheck className="h-6 w-6 text-emerald-700"/><h2 className="mt-3 font-bold">Your privacy</h2><p className="mt-2 text-sm leading-6 text-slate-600">Never send passwords, child access codes, medical records, or sensitive family information. Other attendees will be present during group sessions.</p></div>{view !== 'message' && <div className="app-callout"><CalendarDays className="h-6 w-6 text-blue-700"/><h2 className="mt-3 font-bold">Any meeting provider</h2><p className="mt-2 text-sm leading-6 text-slate-600">After confirmation, Visual Steps may provide a Google Meet, Microsoft Teams, Zoom, phone, or other meeting option.</p></div>}</aside>
      {view === 'message' ? <form onSubmit={submitMessage} className="surface space-y-5 p-7">{success && <SuccessMessage text={success}/>}<Input label="Your name" value={name} onChange={event => setName(event.target.value)} required maxLength={100}/><Input label="Your email" type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254}/><Input label="Subject" value={subject} onChange={event => setSubject(event.target.value)} required maxLength={150}/><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Message</span><textarea className="app-control min-h-40 w-full resize-y" value={message} onChange={event => setMessage(event.target.value)} required minLength={10} maxLength={3000}/></label><label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)}/></label>{error && <ErrorMessage text={error}/>}<Button type="submit" disabled={sending}><Mail className="mr-2 h-4 w-4"/>{sending ? 'Sending…' : 'Send message'}</Button></form> : <form onSubmit={submitConsultation} className="surface space-y-5 p-7"><div><h2 className="text-2xl font-black">{view === 'private' ? 'Request a private consultation' : 'Register for a group session'}</h2><p className="mt-2 text-sm leading-6 text-slate-600">You do not need a Visual Steps account. We will email a verification link before submitting your request.</p></div>{success && <SuccessMessage text={success}/>}<Input label="Parent name" value={name} onChange={event => setName(event.target.value)} required maxLength={100}/><Input label="Parent email" type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254}/>{view === 'private' ? <><p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900"><strong>Available days:</strong> {[...new Set(sessions.map(session => session.weekday_label).filter(Boolean))].join(', ') || 'No days published'}. Call length and available times are set by the administrator.</p><Input label="Preferred date" type="date" value={requestedDate} onChange={event => { setRequestedDate(event.target.value); setSessionId(''); setRequestedTime(''); }} min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)} required/>{selectedDateUnavailable ? <p className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">The administrator is unavailable on this date. Please choose another available date.</p> : requestedDate && !privateSlots.length ? <p className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">No private-call times are available on that weekday. Please choose one of the available days shown above.</p> : null}{privateSlots.length > 0 && !selectedDateUnavailable && <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Available call time</span><select className="app-control w-full" value={sessionId && requestedTime ? `${sessionId}|${requestedTime}` : ''} onChange={event => { const [ruleId, time] = event.target.value.split('|'); setSessionId(ruleId || ''); setRequestedTime(time || ''); }} required><option value="">Choose a time</option>{privateSlots.map(slot => <option key={`${slot.ruleId}-${slot.time}`} value={`${slot.ruleId}|${slot.time}`}>{slot.label}</option>)}</select></label>}</> : <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Available group session</span><select className="app-control w-full" value={sessionId} onChange={event => setSessionId(event.target.value)} required><option value="">{loadingSessions ? 'Loading available sessions…' : 'Choose a group session'}</option>{sessions.map(session => <option key={session.id} value={session.id}>{session.title} — {formatAppDateTime(session.starts_at || '')} — {session.available} seat{session.available === 1 ? '' : 's'} left</option>)}</select></label>}{!loadingSessions && !sessions.length && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No {view === 'private' ? 'private-call times' : 'group sessions'} are currently open. You can send a message and ask to be notified when new times are available.</p>}<label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">What would you like help with?</span><textarea className="app-control min-h-32 w-full resize-y" value={reason} onChange={event => setReason(event.target.value)} required minLength={10} maxLength={2000}/></label><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Communication or accessibility request (optional)</span><textarea className="app-control min-h-24 w-full resize-y" value={accessibilityRequest} onChange={event => setAccessibilityRequest(event.target.value)} maxLength={1000}/></label>{view === 'group' && <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><input type="checkbox" className="mt-1 h-4 w-4 accent-blue-600" checked={groupPrivacyAcknowledged} onChange={event => setGroupPrivacyAcknowledged(event.target.checked)} required/><span>I understand that other parents will attend. I will not share names, access codes, medical records, or private information about my child or family.</span></label>}{error && <ErrorMessage text={error}/>}<Button type="submit" disabled={sending || loadingSessions || !sessions.length || (view === 'private' && (!requestedDate || !sessionId || !requestedTime || selectedDateUnavailable))}><CalendarDays className="mr-2 h-4 w-4"/>{sending ? 'Submitting…' : view === 'private' ? 'Request private call' : 'Request group seat'}</Button></form>}
    </section>
  </div></div>;
}

function SuccessMessage({ text }: { text: string }) { return <div role="status" className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0"/><p className="text-sm font-bold">{text}</p></div>; }
function ErrorMessage({ text }: { text: string }) { return <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{text}</p>; }
