import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Textarea } from '../components/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { 
  AlertCircle, 
  ArrowLeft, 
  Plus, 
  Save, 
  User, 
  Calendar, 
  GraduationCap, 
  Hash, 
  Clock, 
  Target, 
  Coins, 
  ScrollText, 
  Palette, 
  Settings2,
  Upload,
  UserCircle2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';

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
            sensory_issues: kid.sensory_issues || '',
            avatar: kid.avatar || '',
            startTime: kid.start_time || '',
            endTime: kid.end_time || '',
            maxIncompleteLimit: kid.max_incomplete_limit || '',
            rewardType: kid.reward_type || 'Penny',
            rewardQuantity: kid.reward_quantity?.toString() || '1',
            rules: kid.rules || '',
            theme: kid.theme || 'sky',
            can_print: kid.can_print || false,
            timezone: kid.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            kidCode: kid.kid_code || '',
          } as any);
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="w-full px-6 py-6">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between mb-12"
      >
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')} 
            className="group text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-2xl px-6 h-12 text-sm font-black uppercase tracking-widest transition-all"
          >
            <ArrowLeft className="mr-3 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Hub
          </Button>
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-3xl bg-brand-600 flex items-center justify-center text-white shadow-xl shadow-brand-200">
              {isEditing ? <Settings2 className="h-8 w-8" /> : <Plus className="h-8 w-8" />}
            </div>
            <div>
              <h1 className="text-5xl font-display font-black text-slate-900 tracking-tighter italic">
                {isEditing ? 'Refine Profile' : 'New Adventure'}
              </h1>
              <p className="text-xl text-slate-500 font-medium mt-1">
                {isEditing ? 'Keep information up to date for personalized support.' : 'Create a personalized learning and behavior environment.'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 rounded-3xl bg-rose-50 p-6 text-rose-700 border border-rose-100 shadow-xl shadow-rose-200/50"
          >
            <AlertCircle className="h-6 w-6 shrink-0" />
            <p className="font-bold">{error}</p>
          </motion.div>
        )}

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-10"
        >
          {/* Avatar and Identity */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <Card className="h-full shadow-2xl shadow-slate-200 border-none overflow-hidden bg-white">
              <CardHeader className="p-10 border-b border-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <UserCircle2 size={120} />
                </div>
                <CardTitle className="text-2xl font-display font-black flex items-center gap-3 relative z-10">
                  <User className="text-brand-600" />
                  Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="space-y-6">
                  <div className="flex flex-col items-center">
                    <div className="relative group">
                      <div className="h-40 w-40 rounded-[3rem] bg-slate-50 overflow-hidden border-4 border-white shadow-2xl ring-1 ring-slate-100 transition-transform group-hover:scale-105 duration-500">
                        {formData.avatar ? (
                          <img src={formData.avatar} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-200 bg-slate-100">
                            <User size={64} />
                          </div>
                        )}
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
                      <label 
                        htmlFor="avatar-upload" 
                        className="absolute -bottom-2 -right-2 h-14 w-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-xl cursor-pointer hover:bg-brand-700 hover:scale-110 transition-all border-4 border-white"
                      >
                        <Upload size={24} />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Presets</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {[
                        'https://api.dicebear.com/7.x/micah/svg?seed=Oliver&backgroundColor=b6e3f4',
                        'https://api.dicebear.com/7.x/micah/svg?seed=Willow&backgroundColor=ffdfbf',
                        'https://api.dicebear.com/7.x/adventurer/svg?seed=Max',
                        'https://api.dicebear.com/7.x/adventurer/svg?seed=Lily'
                      ].map((avatarUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, avatar: avatarUrl }))}
                          className={`h-14 w-14 rounded-2xl overflow-hidden border-2 transition-all ${
                            formData.avatar === avatarUrl ? 'border-brand-600 ring-4 ring-brand-500/10 scale-110' : 'border-slate-100 grayscale hover:grayscale-0'
                          }`}
                        >
                          <img src={avatarUrl} alt={`Avatar Preset ${idx}`} className="h-full w-full" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <Input
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    icon={<User className="text-slate-400" size={18} />}
                  />
                  <Input
                    label="Date of Birth"
                    name="dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleChange}
                    required
                    icon={<Calendar className="text-slate-400" size={18} />}
                  />
                  <Input
                    label="Grade Level"
                    name="gradeLevel"
                    placeholder="e.g., Kindergarten"
                    value={formData.gradeLevel}
                    onChange={handleChange}
                    required
                    icon={<GraduationCap className="text-slate-400" size={18} />}
                  />
                  <Input
                    label="Unique Child Code"
                    name="kidCode"
                    placeholder="e.g., HERO-123"
                    value={formData.kidCode}
                    onChange={handleChange}
                    required
                    icon={<Hash className="text-slate-400" size={18} />}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Schedule and Rewards */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-10">
            <Card className="shadow-2xl shadow-slate-200 border-none bg-white">
              <CardHeader className="p-10 border-b border-slate-50">
                <CardTitle className="text-2xl font-display font-black flex items-center gap-3">
                  <Clock className="text-emerald-600" />
                  Availability & Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Input
                    label="Daily Start Time"
                    name="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                    icon={<Clock size={18} className="text-slate-400" />}
                  />
                  <Input
                    label="Daily End Time"
                    name="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                    icon={<Clock size={18} className="text-slate-400" />}
                  />
                  <Input
                    label="Max Parallel Activities"
                    name="maxIncompleteLimit"
                    type="number"
                    min="0"
                    placeholder="e.g., 5"
                    value={formData.maxIncompleteLimit}
                    onChange={handleChange}
                    required
                    icon={<Target size={18} className="text-slate-400" />}
                  />
                  <Input
                    label="Reward Multiplier"
                    name="rewardQuantity"
                    type="number"
                    min="1"
                    value={formData.rewardQuantity}
                    onChange={handleChange}
                    required
                    icon={<Coins size={18} className="text-slate-400" />}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-2xl shadow-slate-200 border-none bg-white">
              <CardHeader className="p-10 border-b border-slate-50">
                <CardTitle className="text-2xl font-display font-black flex items-center gap-3">
                  <Coins className="text-amber-500" />
                  Earning Assets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10">
                <div className="flex flex-wrap gap-4">
                  {[
                    { name: 'Penny', icon: 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png' },
                    { name: 'Cent', icon: 'https://cdn-icons-png.flaticon.com/512/550/550638.png' },
                    { name: 'Token', icon: 'https://cdn-icons-png.flaticon.com/512/2169/2169862.png' },
                    { name: 'Bead', icon: 'https://cdn-icons-png.flaticon.com/512/2953/2953423.png' },
                    { name: 'Star', icon: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png' },
                    { name: 'Point', icon: 'https://cdn-icons-png.flaticon.com/512/1170/1170611.png' },
                    { name: 'Sticker', icon: 'https://cdn-icons-png.flaticon.com/512/4359/4359922.png' },
                    { name: 'Dollar', icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%F0%9F%92%B5%3C/text%3E%3C/svg%3E' },
                    { name: 'Hours', icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80"%3E%E2%8C%9B%3C/text%3E%3C/svg%3E' },
                  ].map((reward) => (
                    <button
                      key={reward.name}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, rewardType: reward.name }))}
                      className={`flex-1 min-w-[100px] flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all duration-300 ${
                        formData.rewardType === reward.name 
                          ? 'border-brand-600 bg-brand-50 shadow-lg shadow-brand-500/10 scale-105' 
                          : 'border-slate-50 bg-slate-50/30 hover:border-brand-200 hover:bg-white'
                      }`}
                    >
                      <img src={reward.icon} alt={reward.name} className="h-10 w-10 object-contain" referrerPolicy="no-referrer" />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-600">{reward.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-2xl shadow-slate-200 border-none bg-white">
              <CardHeader className="p-10 border-b border-slate-50">
                <CardTitle className="text-2xl font-display font-black flex items-center gap-3">
                  <Palette className="text-purple-600" />
                  Visual Vibe
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
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
                    { id: 'hero', name: 'Hero', color: 'bg-red-600' }
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, theme: theme.id }))}
                      className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all duration-300 ${
                        formData.theme === theme.id 
                          ? 'border-brand-600 bg-brand-50 shadow-lg shadow-brand-500/10' 
                          : 'border-slate-50 bg-slate-50/30 hover:border-brand-200 hover:bg-white'
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-2xl ${theme.color} shadow-lg ring-2 ring-white`} />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-600">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Clinical & Behavioral Details */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="shadow-2xl shadow-slate-200 border-none bg-white">
            <CardHeader className="p-10 border-b border-slate-50 bg-slate-50/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-display font-black flex items-center gap-3">
                  <ScrollText className="text-brand-600" />
                  Clinical & Support Insights
                </CardTitle>
                <div className="flex items-center gap-2 px-4 py-2 bg-brand-600 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-200">
                  <Sparkles size={14} />
                  AI Assisted Profile
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-12">
              <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Growth & Support</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <Textarea
                    label="Strengths & Brilliance"
                    name="strengths"
                    placeholder="Wht does the child excel at? What are their unique talents?"
                    value={formData.strengths}
                    onChange={handleChange}
                  />
                  <Textarea
                    label="Growth Opportunities"
                    name="weaknesses"
                    placeholder="Areas where the child may need extra encouragement or scaffolding."
                    value={formData.weaknesses}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Behavioral Context</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <Textarea
                    label="Behavioral Observations"
                    name="behavioralIssues"
                    placeholder="Key patterns or behaviors to track and support..."
                    value={formData.behavioralIssues}
                    onChange={handleChange}
                  />
                  <Textarea
                    label="Sensory Profile"
                    name="sensoryIssues"
                    placeholder="Sensory preferences, sensitivities, or seeking behaviors..."
                    value={formData.sensoryIssues}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Daily Foundations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <Textarea
                    label="Therapies & Intervention"
                    name="therapies"
                    placeholder="Ongoing professional supports (Speech, OT, PT, etc.)..."
                    value={formData.therapies}
                    onChange={handleChange}
                  />
                  <Textarea
                    label="Interests & Passions"
                    name="interests"
                    placeholder="Characters, subjects, or activities that spark joy..."
                    value={formData.interests}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-100">
                <Textarea
                  label="Core Rules & Values"
                  name="rules"
                  placeholder="The primary expectations for the child's workspace..."
                  value={formData.rules}
                  onChange={handleChange}
                  className="min-h-[160px]"
                />
              </div>

              <div className="pt-6">
                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <input
                      type="checkbox"
                      id="canPrint"
                      name="canPrint"
                      checked={formData.canPrint}
                      onChange={handleChange}
                      className="h-8 w-8 rounded-xl border-slate-200 text-brand-600 focus:ring-brand-500/20 transition-all cursor-pointer"
                    />
                    <div>
                      <label htmlFor="canPrint" className="text-xl font-black text-slate-900 cursor-pointer">
                        Independent Printing
                      </label>
                      <p className="text-slate-500 font-medium">Child can print activity checklists and visual supports directly.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Global Action Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-10 z-30"
        >
          <div className="p-6 bg-white/80 backdrop-blur-2xl rounded-[3rem] border border-white shadow-2xl flex items-center justify-between gap-6 ring-1 ring-slate-100">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => navigate('/dashboard')} 
              className="h-16 px-10 text-lg font-black uppercase text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-all"
            >
              Discard Changes
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="h-16 px-16 text-xl font-black italic shadow-brand-400 group"
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin mr-3" />
              ) : (
                <Save className="mr-3 h-6 w-6 transition-transform group-hover:scale-110" />
              )}
              {isEditing ? 'Sync Profile' : 'Launch Profile'}
            </Button>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
