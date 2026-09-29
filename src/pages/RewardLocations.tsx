import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Plus, Edit2, Trash2, Check, ArrowLeft } from 'lucide-react';
import { apiFetch, safeJson } from '../utils/api';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { ClearableSearch } from '../components/ClearableSearch';

type RewardLocation = { id: string; name: string; created_at: string; rewardCount: number };

export default function RewardLocations() {
  const { kidId } = useParams();
  const [locations, setLocations] = useState<RewardLocation[]>([]);
  const [learnerName, setLearnerName] = useState('Learner');
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editing, setEditing] = useState<RewardLocation | 'new' | null>(null);
  const [name, setName] = useState('');
  const [makeCurrent, setMakeCurrent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async (preserveError = false) => {
    if (!kidId) return;
    try {
      const [locationsResponse, kidResponse] = await Promise.all([
        apiFetch(`/api/kids/${encodeURIComponent(kidId)}/reward-locations`),
        apiFetch(`/api/kids/${encodeURIComponent(kidId)}`),
      ]);
      const locationsData = await safeJson(locationsResponse);
      if (!locationsResponse.ok) throw new Error(locationsData.error || 'Could not load locations');
      setLocations(locationsData.locations || []);
      setCurrentLocation(locationsData.currentLocation || null);
      if (kidResponse.ok) {
        const kidData = await safeJson(kidResponse);
        setLearnerName(kidData.kid?.name || 'Learner');
      }
      if (!preserveError) setError('');
    } catch (cause) {
      if (!preserveError) setError(cause instanceof Error ? cause.message : 'Could not load locations');
    }
  };

  useEffect(() => { void load(); }, [kidId]);

  const openForm = (location: RewardLocation | 'new') => {
    setEditing(location);
    setName(location === 'new' ? '' : location.name);
    setMakeCurrent(location === 'new' ? !currentLocation : location.name.toLowerCase() === currentLocation?.toLowerCase());
    setError('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!kidId || !editing) return;
    setBusy(true);
    setError('');
    let locationSaved = false;
    try {
      const isNew = editing === 'new';
      const response = await apiFetch(isNew
        ? `/api/kids/${encodeURIComponent(kidId)}/reward-locations`
        : `/api/kids/${encodeURIComponent(kidId)}/reward-locations/${encodeURIComponent(editing.id)}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not save location');
      locationSaved = true;
      if (isNew && makeCurrent) setEditing({ ...data.location, rewardCount: 0 });
      if (makeCurrent) {
        const currentResponse = await apiFetch(`/api/kids/${encodeURIComponent(kidId)}/reward-location`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location: isNew ? data.location.name : data.name }),
        });
        const currentData = await safeJson(currentResponse);
        if (!currentResponse.ok) throw new Error(`Location saved, but could not make it current: ${currentData.error || 'Please try again.'}`);
      }
      setEditing(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save location');
      if (locationSaved) void load(true);
    } finally { setBusy(false); }
  };

  const remove = async (location: RewardLocation) => {
    if (!kidId || !window.confirm(`Delete ${location.name}? Choose another current location and move any rewards here first.`)) return;
    setBusy(true);
    setError('');
    try {
      const response = await apiFetch(`/api/kids/${encodeURIComponent(kidId)}/reward-locations/${encodeURIComponent(location.id)}`, { method: 'DELETE' });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not delete location');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete location');
    } finally { setBusy(false); }
  };

  const rows = locations.filter(location => location.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  const pageCount = Math.max(1, Math.ceil(rows.length / 10));
  const visibleRows = rows.slice((page - 1) * 10, page * 10);

  return <div className="space-y-4">
    {editing ? <div className="flex items-center gap-3"><Button variant="ghost" size="xs" onClick={() => { setEditing(null); setError(''); }} className="pl-0 text-[12px] font-bold uppercase"><ArrowLeft className="mr-1 h-3 w-3" /> Back to List</Button><h1 className="text-xl font-bold tracking-tight text-slate-900">{editing === 'new' ? 'New Reward Location' : 'Edit Reward Location'}</h1></div>
      : <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="app-page-title flex items-center gap-3"><MapPin className="h-8 w-8 text-blue-600" />{learnerName}'s Reward Locations</h1><p className="app-page-subtitle">Manage places where rewards can be offered. Only a parent can change the learner's location.</p></div><Button size="xs" onClick={() => openForm('new')}><Plus className="mr-1 h-4 w-4" /> Add Location</Button></div>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    {editing ? <Card className="overflow-hidden border-blue-200 bg-blue-50/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-blue-100 bg-white/50 px-4 py-2"><CardTitle className="text-base font-bold">Location Details</CardTitle></CardHeader>
      <CardContent className="px-4 pb-3 pt-4"><form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2"><label className="block text-[12px] font-bold uppercase text-slate-500">Location Name
          <input autoFocus required maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="e.g., Home or Restaurant" className="mt-1 block h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm font-normal normal-case text-slate-900" />
        </label></div>
        <div><p className="mb-2 text-[12px] font-bold uppercase text-slate-500">Current location</p><label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700"><input type="radio" name="current-reward-location" checked={makeCurrent} onChange={() => setMakeCurrent(true)} className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-600" /> Make this the current location</label><p className="mt-1 text-xs text-slate-500">Choosing this place replaces the previous current location.</p></div>
        <div className="flex justify-end gap-2 border-t border-blue-100 pt-4"><Button type="button" variant="ghost" size="xs" onClick={() => { setEditing(null); setError(''); }}>Cancel</Button><Button type="submit" size="xs" disabled={busy || !name.trim()}>{busy ? 'Saving…' : editing === 'new' ? 'Add Location' : 'Save Changes'}</Button></div>
      </form></CardContent>
    </Card> : <Card className="border-slate-200 shadow-sm"><CardContent className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="w-full max-w-lg"><ClearableSearch label="Search locations" value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Search locations..." /></div><p className="text-sm text-slate-600">✓ marks the current location</p></div>
      <div className="overflow-x-auto"><table className="app-data-table w-full min-w-[580px]"><thead className="app-data-table-head"><tr><th className="px-3 py-2 text-left"><button type="button" onClick={() => { setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); setPage(1); }}>Location {sortDirection === 'asc' ? '↑' : '↓'}</button></th><th className="px-3 py-2 text-left">Rewards</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>
        {visibleRows.map(location => {
          const isCurrent = location.name.toLowerCase() === currentLocation?.toLowerCase();
          return <tr key={location.id} className="app-data-row"><td className={`px-3 py-3 ${isCurrent ? 'font-bold text-blue-700' : 'font-medium text-slate-800'}`}>{isCurrent && <Check className="mr-1 inline h-4 w-4" />}{location.name}</td><td className="px-3 py-3 text-sm text-slate-500">{location.rewardCount} {location.rewardCount === 1 ? 'reward' : 'rewards'}</td><td className="px-3 py-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="xs" aria-label={`Edit ${location.name}`} onClick={() => openForm(location)}><Edit2 className="h-4 w-4" /></Button><Button variant="ghost" size="xs" aria-label={`Delete ${location.name}`} title={isCurrent ? 'Choose another current location before deleting this one' : undefined} disabled={busy || isCurrent} onClick={() => void remove(location)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></td></tr>;
        })}
        {visibleRows.length === 0 && <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-500">{search ? 'No matching locations.' : 'No locations yet. Add one to get started.'}</td></tr>}
      </tbody></table></div>
      {pageCount > 1 && <div className="mt-4 flex items-center justify-end gap-3 text-sm"><Button variant="ghost" size="xs" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} of {pageCount}</span><Button variant="ghost" size="xs" disabled={page === pageCount} onClick={() => setPage(page + 1)}>Next</Button></div>}
    </CardContent></Card>}
  </div>;
}
