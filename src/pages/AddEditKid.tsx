import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { AlertCircle, ArrowLeft, History } from 'lucide-react';

export default function AddEditKid() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gradeLevel: '',
    behavioralIssues: '',
    therapies: '',
    hobbies: '',
    interests: '',
    strengths: '',
    weaknesses: '',
    sensoryIssues: '',
    avatar: '',
    startTime: '',
    endTime: '',
    maxIncompleteLimit: '',
    rewardType: 'Penny',
    rewardQuantity: '1',
    rules: '',
    theme: 'sky',
    canPrint: false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    kidCode: '',
  });

  useEffect(() => {
    if (isEditing) {
      setIsLoading(true);
      apiFetch(`/api/kids/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch kid details');
          return res.json();
        })
        .then((data) => {
          const kid = data.kid;
          setFormData({
            name: kid.name || '',
            dob: kid.dob || '',
            gradeLevel: kid.grade_level || '',
            behavioralIssues: kid.behavioral_issues || '',
            therapies: kid.therapies || '',
            hobbies: kid.hobbies || '',
            interests: kid.interests || '',
            strengths: kid.strengths || '',
            weaknesses: kid.weaknesses || '',
            sensoryIssues: kid.sensory_issues || '',
            avatar: kid.avatar || '',
            startTime: kid.start_time || '',
            endTime: kid.end_time || '',
            maxIncompleteLimit: kid.max_incomplete_limit || '',
            rewardType: kid.reward_type || 'Penny',
            rewardQuantity: kid.reward_quantity?.toString() || '1',
            rules: kid.rules || '',
            theme: kid.theme || 'sky',
            canPrint: kid.can_print || false,
            timezone: kid.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            kidCode: kid.kid_code || '',
          });
        })
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [isEditing, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const url = isEditing ? `/api/kids/${id}` : '/api/kids';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        name: formData.name,
        dob: formData.dob,
        grade_level: formData.gradeLevel,
        behavioral_issues: formData.behavioralIssues,
        therapies: formData.therapies,
        hobbies: formData.hobbies,
        interests: formData.interests,
        strengths: formData.strengths,
        weaknesses: formData.weaknesses,
        sensory_issues: formData.sensoryIssues,
        avatar: formData.avatar,
        start_time: formData.startTime,
        end_time: formData.endTime,
        max_incomplete_limit: formData.maxIncompleteLimit,
        reward_type: formData.rewardType,
        reward_quantity: parseInt(formData.rewardQuantity),
        rules: formData.rules,
        theme: formData.theme,
        can_print: formData.canPrint,
        timezone: formData.timezone,
        kid_code: formData.kidCode,
      };

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Failed to save: ${text}`);
        }
        
        // If we have detailed error info from the server, show it
        if (data.message && data.code) {
          throw new Error(`Server Error (${data.code}): ${data.message}${data.hint ? ` - Hint: ${data.hint}` : ''}${data.details ? ` - Details: ${data.details}` : ''}`);
        }
        
        throw new Error(data.error || data.message || 'Failed to save');
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="xs" onClick={() => navigate('/dashboard')} className="pl-0 h-7 hover:bg-transparent hover:text-blue-600 text-[12px] font-bold uppercase">
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to Dashboard
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
          {isEditing ? 'Edit Profile' : 'New Profile'}
        </h1>
      </div>

      <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 space-y-0">
          <CardTitle className="text-base font-bold">{isEditing ? 'Edit Profile Details' : 'Profile Details'}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {error && (
              <div className="flex items-center gap-2 rounded bg-red-50 p-1.5 text-[12px] text-red-600">
                <AlertCircle className="h-3 w-3" />
                {error}
              </div>
            )}

            <div className="space-y-0.5">
              <label className="text-[12px] font-bold text-slate-500 uppercase">Avatar</label>
              <div className="flex items-center gap-2">
                {formData.avatar && (
                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-blue-100">
                    <img src={formData.avatar} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex gap-1 overflow-x-auto pb-0.5 max-w-[200px]">
                  {[
                    'https://api.dicebear.com/7.x/micah/svg?seed=Oliver&backgroundColor=b6e3f4',
                    'https://api.dicebear.com/7.x/micah/svg?seed=Willow&backgroundColor=ffdfbf',
                    'https://api.dicebear.com/7.x/adventurer/svg?seed=Max',
                    'https://api.dicebear.com/7.x/adventurer/svg?seed=Lily'
                  ].map((avatarUrl) => (
                    <button
                      key={avatarUrl}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, avatar: avatarUrl }))}
                      className={`h-7 w-7 flex-shrink-0 overflow-hidden rounded-full border transition-all ${
                        formData.avatar === avatarUrl ? 'border-blue-600 ring-1 ring-blue-600' : 'border-transparent'
                      }`}
                    >
                      <img src={avatarUrl} alt="Avatar" className="h-full w-full" />
                    </button>
                  ))}
                </div>
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setFormData(prev => ({ ...prev, avatar: reader.result as string }));
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label htmlFor="avatar-upload" className="text-[12px] font-bold text-blue-600 cursor-pointer hover:underline">Upload</label>
              </div>
            </div>

            <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Name</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Date of Birth</label>
                <Input
                  name="dob"
                  type="date"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Grade Level</label>
                <Input
                  name="gradeLevel"
                  placeholder="e.g., Grade 3"
                  value={formData.gradeLevel}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Kid Code</label>
                <Input
                  name="kidCode"
                  placeholder="e.g., 123456"
                  value={formData.kidCode}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Start Time</label>
                <Input
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">End Time</label>
                <Input
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Max Activities</label>
                <Input
                  name="maxIncompleteLimit"
                  type="number"
                  min="0"
                  value={isNaN(Number(formData.maxIncompleteLimit)) ? '' : formData.maxIncompleteLimit}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Reward Qty</label>
                <Input
                  name="rewardQuantity"
                  type="number"
                  min="1"
                  value={isNaN(Number(formData.rewardQuantity)) ? '' : formData.rewardQuantity}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-0.5 pt-1 border-t border-slate-200/60">
              <label className="text-[12px] font-bold text-slate-500 uppercase">Rules / General Reminders</label>
              <textarea
                name="rules"
                className="flex min-h-[50px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                placeholder="e.g., Be kind, Clean up after yourself..."
                value={formData.rules}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-200/60">
              <label className="text-[12px] font-bold text-slate-500 uppercase">Reward Type</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'Penny', icon: 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png' },
                  { name: 'Cent', icon: 'https://cdn-icons-png.flaticon.com/512/550/550638.png' },
                  { name: 'Token', icon: 'https://cdn-icons-png.flaticon.com/512/2169/2169862.png' },
                  { name: 'Bead', icon: 'https://cdn-icons-png.flaticon.com/512/2953/2953423.png' },
                  { name: 'Star', icon: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png' },
                  { name: 'Point', icon: 'https://cdn-icons-png.flaticon.com/512/1170/1170611.png' },
                  { name: 'Sticker', icon: 'https://cdn-icons-png.flaticon.com/512/4359/4359922.png' },
                  { name: 'Dollar', icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%F0%9F%92%B5%3C/text%3E%3C/svg%3E' },
                  { name: 'Coffee', icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%E2%98%95%3C/text%3E%3C/svg%3E' },
                  { name: 'Drink', icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%F0%9F%8D%B9%3C/text%3E%3C/svg%3E' },
                  { name: 'Ticket', icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%F0%9F%8E%9F%EF%B8%8F%3C/text%3E%3C/svg%3E' },
                  { name: 'Hour', icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%E2%8C%9B%3C/text%3E%3C/svg%3E' },
                  { name: 'Credit', icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%F0%9F%92%B3%3C/text%3E%3C/svg%3E' }
                ].map((reward) => (
                  <button
                    key={reward.name}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rewardType: reward.name }))}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${
                      formData.rewardType === reward.name 
                        ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' 
                        : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <img src={reward.icon} alt={reward.name} className="h-6 w-6 object-contain" referrerPolicy="no-referrer" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">{reward.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
              <h3 className="text-[12px] font-bold text-slate-500 uppercase">Dashboard Theme</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'sky', name: 'Sky', color: 'bg-sky-400' },
                  { id: 'emerald', name: 'Emerald', color: 'bg-emerald-400' },
                  { id: 'sunset', name: 'Sunset', color: 'bg-orange-400' },
                  { id: 'royal', name: 'Royal', color: 'bg-purple-400' },
                  { id: 'space', name: 'Space', color: 'bg-slate-900' },
                  { id: 'jungle', name: 'Jungle', color: 'bg-green-600' },
                  { id: 'ocean', name: 'Ocean', color: 'bg-blue-800' },
                  { id: 'dino', name: 'Dino', color: 'bg-amber-800' },
                  { id: 'fairy', name: 'Fairy', color: 'bg-pink-400' },
                  { id: 'hero', name: 'Hero', color: 'bg-red-600' },
                  { id: 'sports', name: 'Sports', color: 'bg-indigo-600' },
                  { id: 'safari', name: 'Safari', color: 'bg-orange-500' },
                  { id: 'art', name: 'Art', color: 'bg-pink-300' },
                  { id: 'music', name: 'Music', color: 'bg-purple-500' },
                  { id: 'construction', name: 'Build', color: 'bg-yellow-500' }
                ].map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, theme: theme.id }))}
                    className={`flex flex-col items-center gap-1 p-1.5 min-w-[60px] rounded-lg border transition-all ${
                      formData.theme === theme.id 
                        ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' 
                        : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className={`h-6 w-6 rounded-full ${theme.color} shadow-inner`} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-200/60">
              <h3 className="text-[12px] font-bold text-slate-500 uppercase">Additional Details</h3>
              
              <div className="grid gap-2.5 md:grid-cols-2">
                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Therapies Needed</label>
                  <textarea
                    name="therapies"
                    className="flex min-h-[32px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g., Speech therapy..."
                    value={formData.therapies}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Hobbies</label>
                  <textarea
                    name="hobbies"
                    className="flex min-h-[32px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g., Drawing..."
                    value={formData.hobbies}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Interests</label>
                  <textarea
                    name="interests"
                    className="flex min-h-[32px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g., Dinosaurs..."
                    value={formData.interests}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Strengths</label>
                  <textarea
                    name="strengths"
                    className="flex min-h-[32px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g., Good memory..."
                    value={formData.strengths}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Weaknesses</label>
                  <textarea
                    name="weaknesses"
                    className="flex min-h-[32px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g., Fine motor skills..."
                    value={formData.weaknesses}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Sensory Issues</label>
                  <textarea
                    name="sensoryIssues"
                    className="flex min-h-[32px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g., Loud noises..."
                    value={formData.sensoryIssues}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Behavioral Issues</label>
                  <textarea
                    name="behavioralIssues"
                    className="flex min-h-[32px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g., Transitions..."
                    value={formData.behavioralIssues}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-0.5">
              <label className="text-[12px] font-bold text-slate-500 uppercase">Timezone</label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {Intl.supportedValuesOf('timeZone').map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-200/60">
              <h3 className="text-[12px] font-bold text-slate-500 uppercase">Permissions</h3>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="canPrint"
                  name="canPrint"
                  checked={formData.canPrint}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <label htmlFor="canPrint" className="text-[12px] font-medium text-slate-700">
                  Allow child to print activity steps
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60">
              <Button type="button" variant="ghost" size="xs" onClick={() => navigate('/dashboard')} className="h-7 text-[12px] font-bold uppercase">
                Cancel
              </Button>
              <Button type="submit" size="xs" className="h-7 text-[12px] font-bold uppercase" isLoading={isLoading}>
                {isEditing ? 'Save Changes' : 'Create Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
