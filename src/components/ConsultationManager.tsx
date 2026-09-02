import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Save, UserRound, Users } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { apiFetch, safeJson } from '../utils/api';
import { formatAppDateTime } from '../utils/dateUtils';

type Booking = { id: string; parent_name: string; parent_email: string; reason: string; accessibility_request: string; parent_timezone: string; status: string; email_verified_at: string | null; admin_notes: string | null };
type Session = { id: string; session_type: 'private' | 'group'; title: string; description: string; starts_at: string; ends_at: string; capacity: number; status: string; meeting_provider: string | null; meeting_link: string | null; consultation_bookings: Booking[] };
type AvailabilityRule = { id: string; title: string; description: string; weekday: number; start_time: string; end_time: string; duration_minutes: number; timezone: string; is_active: boolean };
type UnavailableDate = { unavailable_date: string; reason: string };
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const formatTime = (value: string) => {
  const [hour, minute] = value.slice(0, 5).split(':').map(Number);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hour, minute));
};

async function adminJson(url: string, init?: RequestInit) {
  const response = await apiFetch(url, init); const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.error || 'Consultation request failed'); return payload;
}

export function ConsultationManager() {
  const [items, setItems] = useState<Session[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([]);
  const [sessionType, setSessionType] = useState<'private' | 'group'>('private');
  const [title, setTitle] = useState('Visual Steps support consultation');
  const [description, setDescription] = useState('Ask questions and receive help using Visual Steps.');
  const [startsAt, setStartsAt] = useState(''); const [endsAt, setEndsAt] = useState(''); const [capacity, setCapacity] = useState(6);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1]); const [startTime, setStartTime] = useState('16:00'); const [endTime, setEndTime] = useState('18:00'); const [durationMinutes, setDurationMinutes] = useState(30);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York');
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const load = async () => { setBusy(true); try { const data = await adminJson('/api/admin/consultations'); setItems(data.items || []); setAvailabilityRules(data.availabilityRules || []); setUnavailableDates(data.unavailableDates || []); } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to load consultations'); } finally { setBusy(false); } };
  useEffect(() => { void load(); }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
      const data = sessionType === 'private'
        ? await adminJson('/api/admin/consultations/availability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, weekdays: selectedWeekdays, startTime, endTime, durationMinutes, timezone }) })
        : await adminJson('/api/admin/consultations/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionType, title, description, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), capacity }) });
      setNotice(data.message); setStartsAt(''); setEndsAt(''); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to create consultation'); }
    finally { setBusy(false); }
  };

  const updateSession = async (session: Session, changes: Record<string, unknown>) => {
    setBusy(true); setNotice('');
    try { await adminJson(`/api/admin/consultations/sessions/${session.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) }); setNotice('Session updated.'); await load(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to update session'); } finally { setBusy(false); }
  };

  const updateBooking = async (booking: Booking, status: string, adminNotes: string) => {
    setBusy(true); setNotice('');
    try { const data = await adminJson(`/api/admin/consultations/bookings/${booking.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, adminNotes }) }); setNotice(data.message || 'Booking updated.'); await load(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to update booking'); } finally { setBusy(false); }
  };
  const toggleAvailability = async (rule: AvailabilityRule) => {
    setBusy(true); setNotice('');
    try { await adminJson(`/api/admin/consultations/availability/${rule.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !rule.is_active }) }); setNotice(`Private-call availability ${rule.is_active ? 'paused' : 'opened'}.`); await load(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to update availability'); } finally { setBusy(false); }
  };
  const toggleWeekday = (weekday: number) => setSelectedWeekdays(current => current.includes(weekday) ? current.filter(day => day !== weekday) : [...current, weekday].sort());
  const toggleUnavailableDate = async (date: string, currentlyUnavailable: boolean) => {
    setBusy(true); setNotice('');
    try {
      const data = await adminJson(`/api/admin/consultations/unavailable-dates${currentlyUnavailable ? `/${date}` : ''}`, currentlyUnavailable ? { method: 'DELETE' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unavailableDate: date }) });
      setNotice(data.message); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to update that date'); } finally { setBusy(false); }
  };

  return <div className="space-y-6">
    {notice && <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900">{notice}</p>}
    <form onSubmit={create} className="surface space-y-5 p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black">Publish consultation availability</h2><p className="mt-1 text-sm text-slate-600">For private calls, select several weekdays, an available time period, and the call length. Parents choose a matching date and a generated call time. You decide whether to confirm the request.</p></div><Button type="button" variant="outline" onClick={() => void load()} disabled={busy}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></div><div className="grid gap-4 md:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Session type</span><select className="app-control w-full" value={sessionType} onChange={event => setSessionType(event.target.value as 'private' | 'group')}><option value="private">Private call · parent requests a date</option><option value="group">Group session · fixed date</option></select></label>{sessionType === 'group' && <Input label="Maximum families" type="number" min={2} max={50} value={capacity} onChange={event => setCapacity(Number(event.target.value))}/>}<Input label="Title" value={title} onChange={event => setTitle(event.target.value)} maxLength={150}/>{sessionType === 'private' ? <><fieldset className="md:col-span-2"><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">Available days</legend><div className="flex flex-wrap gap-2">{weekdayNames.map((day, index) => <label key={day} className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-bold ${selectedWeekdays.includes(index) ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`}><input type="checkbox" className="sr-only" checked={selectedWeekdays.includes(index)} onChange={() => toggleWeekday(index)}/>{day}</label>)}</div></fieldset><Input label="Available from" type="time" value={startTime} onChange={event => setStartTime(event.target.value)} required/><Input label="Available until" type="time" value={endTime} onChange={event => setEndTime(event.target.value)} required/><Input label="Call length in minutes" type="number" min={15} max={180} step={5} value={durationMinutes} onChange={event => setDurationMinutes(Number(event.target.value))} required/><Input label="Availability timezone" value={timezone} onChange={event => setTimezone(event.target.value)} maxLength={100}/><p className="md:col-span-2 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">Parents will see times generated from this period using the {durationMinutes || 0}-minute call length.</p></> : <><Input label="Start time" type="datetime-local" value={startsAt} onChange={event => setStartsAt(event.target.value)} required/><Input label="End time" type="datetime-local" value={endsAt} onChange={event => setEndsAt(event.target.value)} required/></>}</div><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Public description</span><textarea className="app-control min-h-24 w-full" value={description} onChange={event => setDescription(event.target.value)} maxLength={2000}/></label><Button type="submit" disabled={busy || (sessionType === 'private' && (!selectedWeekdays.length || !startTime || !endTime || endTime <= startTime || durationMinutes < 15 || durationMinutes > 180)) || (sessionType === 'group' && (!startsAt || !endsAt))}><CalendarDays className="mr-2 h-4 w-4"/>{sessionType === 'private' ? 'Publish private-call availability' : 'Publish group session'}</Button></form>
    {availabilityRules.length > 0 && <section className="surface overflow-hidden"><div className="border-b p-5"><h2 className="text-xl font-black">Weekly private-call availability</h2><p className="mt-1 text-sm text-slate-600">Parents choose a date matching one of these weekdays, then select an available time.</p></div><div className="divide-y">{availabilityRules.map(rule => <div key={rule.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-black">{rule.title}</p><p className="text-sm text-slate-600">{weekdayNames[rule.weekday]} · {formatTime(rule.start_time)}–{formatTime(rule.end_time)} · {rule.duration_minutes}-minute calls · {rule.timezone}</p></div><Button type="button" variant="outline" onClick={() => void toggleAvailability(rule)} disabled={busy}>{rule.is_active ? 'Pause availability' : 'Reopen availability'}</Button></div>)}</div></section>}
    <ConsultationCalendar sessions={items} unavailableDates={unavailableDates} busy={busy} onToggleUnavailable={toggleUnavailableDate}/>
    <section className="space-y-4">{items.map(session => <SessionCard key={session.id} session={session} busy={busy} onSessionUpdate={updateSession} onBookingUpdate={updateBooking}/>)}{!items.length && !busy && <div className="surface p-8 text-center text-slate-500">No consultation sessions have been created.</div>}</section>
  </div>;
}

function ConsultationCalendar({ sessions, unavailableDates, busy, onToggleUnavailable }: { sessions: Session[]; unavailableDates: UnavailableDate[]; busy: boolean; onToggleUnavailable: (date: string, currentlyUnavailable: boolean) => Promise<void> }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const year = month.getFullYear(); const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay(); const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const blocked = new Set(unavailableDates.map(item => item.unavailable_date));
  const bookingsByDate = new Map<string, Session[]>();
  for (const session of sessions) {
    const date = new Date(session.starts_at); if (date.getFullYear() !== year || date.getMonth() !== monthIndex) continue;
    const key = dateKey(date); bookingsByDate.set(key, [...(bookingsByDate.get(key) || []), session]);
  }
  const cells: Array<number | null> = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (cells.length % 7) cells.push(null);
  return <section className="surface overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-4 border-b p-5"><div><h2 className="text-xl font-black">Consultation calendar</h2><p className="mt-1 text-sm text-slate-600">See bookings and select any date to mark it unavailable or reopen it. Existing bookings remain visible.</p></div><div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft className="h-4 w-4"/></Button><strong className="min-w-36 text-center">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong><Button type="button" size="sm" variant="outline" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight className="h-4 w-4"/></Button></div></div><div className="grid grid-cols-7 border-b bg-slate-50 text-center text-xs font-black uppercase text-slate-500">{weekdayNames.map(day => <div key={day} className="p-2">{day.slice(0, 3)}</div>)}</div><div className="grid grid-cols-7">{cells.map((day, index) => { if (!day) return <div key={`empty-${index}`} className="min-h-28 border-b border-r bg-slate-50/60"/>; const date = new Date(year, monthIndex, day); const key = dateKey(date); const isBlocked = blocked.has(key); const daySessions = bookingsByDate.get(key) || []; return <button key={key} type="button" disabled={busy} onClick={() => void onToggleUnavailable(key, isBlocked)} className={`min-h-28 border-b border-r p-2 text-left align-top transition hover:bg-blue-50 ${isBlocked ? 'bg-red-50' : 'bg-white'}`} title={isBlocked ? 'Select to reopen this date' : 'Select to mark this date unavailable'}><span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-black ${isBlocked ? 'bg-red-600 text-white' : 'text-slate-700'}`}>{day}</span>{isBlocked && <span className="mt-1 block text-xs font-bold text-red-700">Unavailable</span>}{daySessions.slice(0, 3).map(session => <span key={session.id} className="mt-1 block truncate rounded bg-blue-100 px-1.5 py-1 text-xs font-semibold text-blue-900">{new Date(session.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {session.consultation_bookings?.[0]?.parent_name || session.title} · {session.consultation_bookings?.[0]?.status || session.status}</span>)}{daySessions.length > 3 && <span className="mt-1 block text-xs font-bold text-slate-500">+{daySessions.length - 3} more</span>}</button>; })}</div></section>;
}

function SessionCard({ session, busy, onSessionUpdate, onBookingUpdate }: { session: Session; busy: boolean; onSessionUpdate: (session: Session, changes: Record<string, unknown>) => Promise<void>; onBookingUpdate: (booking: Booking, status: string, notes: string) => Promise<void> }) {
  const [provider, setProvider] = useState(session.meeting_provider || ''); const [link, setLink] = useState(session.meeting_link || '');
  return <article className="surface overflow-hidden"><div className="flex flex-wrap items-start justify-between gap-4 border-b p-5"><div className="flex gap-3">{session.session_type === 'group' ? <Users className="mt-1 h-6 w-6 text-blue-700"/> : <UserRound className="mt-1 h-6 w-6 text-emerald-700"/>}<div><h3 className="text-xl font-black">{session.title}</h3><p className="mt-1 text-sm text-slate-600">{session.session_type === 'private' ? 'Parent-requested date' : 'Scheduled group date'}: {formatAppDateTime(session.starts_at)} · {session.session_type === 'group' ? `${session.capacity} families maximum` : 'Private call'}</p><p className="mt-1 text-sm text-slate-500">{session.description}</p></div></div><select className="app-control w-auto" value={session.status} onChange={event => void onSessionUpdate(session, { status: event.target.value })}><option value="draft">Awaiting admin decision</option><option value="open">Open</option><option value="full">Full</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div><div className="grid gap-3 border-b bg-slate-50 p-5 md:grid-cols-[0.6fr_1fr_auto]"><label><span className="mb-1 block text-xs font-black uppercase text-slate-500">Meeting provider</span><select className="app-control w-full" value={provider} onChange={event => setProvider(event.target.value)}><option value="">Choose later</option><option value="google_meet">Google Meet</option><option value="microsoft_teams">Microsoft Teams</option><option value="zoom">Zoom</option><option value="phone">Phone</option><option value="other">Other</option></select></label><Input label="Meeting link or instructions" value={link} onChange={event => setLink(event.target.value)} maxLength={1000}/><Button type="button" variant="outline" className="self-end" onClick={() => void onSessionUpdate(session, { meetingProvider: provider, meetingLink: link })} disabled={busy}><Save className="mr-2 h-4 w-4"/>Save meeting details</Button></div><div className="border-b bg-blue-50 px-5 py-3"><h4 className="font-black text-blue-950">Parent requests · booking status and private administrator notes</h4><p className="mt-1 text-xs text-blue-800">Status and administrator notes are visible only in this protected administration area.</p></div><div className="divide-y">{session.consultation_bookings?.map(booking => <BookingRow key={booking.id} booking={booking} busy={busy} onUpdate={onBookingUpdate}/>)}{!session.consultation_bookings?.length && <p className="p-5 text-sm text-slate-500">No parent requests for this session.</p>}</div></article>;
}

function BookingRow({ booking, busy, onUpdate }: { booking: Booking; busy: boolean; onUpdate: (booking: Booking, status: string, notes: string) => Promise<void> }) {
  const [status, setStatus] = useState(booking.status); const [notes, setNotes] = useState(booking.admin_notes || '');
  return <div className="grid gap-4 p-5 lg:grid-cols-[0.8fr_1.2fr_0.8fr]"><div><p className="font-black">{booking.parent_name}</p><p className="text-sm text-slate-600">{booking.parent_email}</p><p className="mt-1 text-xs text-slate-500">{booking.email_verified_at ? 'Email verified' : 'Waiting for email verification'} · {booking.parent_timezone}</p></div><div><p className="whitespace-pre-wrap text-sm leading-6">{booking.reason}</p>{booking.accessibility_request && <p className="mt-2 rounded-lg bg-blue-50 p-2 text-xs text-blue-900"><strong>Communication request:</strong> {booking.accessibility_request}</p>}</div><div className="space-y-2"><select className="app-control w-full" value={status} onChange={event => setStatus(event.target.value)}><option value="requested">Requested</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No-show</option></select><textarea className="app-control min-h-20 w-full text-sm" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Private administrator notes"/><Button size="sm" onClick={() => void onUpdate(booking, status, notes)} disabled={busy || booking.status === 'pending_verification'}>Update booking</Button></div></div>;
}
