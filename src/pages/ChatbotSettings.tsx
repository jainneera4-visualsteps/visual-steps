import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { apiFetch } from '../utils/api';
import { Bot, ArrowLeft, Save, AlertCircle, Trash2 } from 'lucide-react';
import { ChatbotSettings } from '../utils/chatbot';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';

export default function ChatbotSettingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<ChatbotSettings>({ name: '', gender: 'neutral', personality: 'friendly', tone: 'cheerful', speakingSpeed: 1.0, maxSentences: 2, languageComplexity: 'simple' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchKid = async () => {
      try {
        const res = await apiFetch(`/api/chatbots/${id}`);
        if (!res.ok) throw new Error('Failed to fetch chatbot settings');
        const data = await res.json();
        console.log('Fetched chatbot settings:', data);
        
        if (data.chatbot) {
          setSettings({
            name: data.chatbot.name || '',
            gender: data.chatbot.gender || 'neutral',
            personality: data.chatbot.personality || 'friendly',
            tone: data.chatbot.tone || 'cheerful',
            speakingSpeed: data.chatbot.speaking_speed || data.chatbot.speakingSpeed || 1.0,
            maxSentences: data.chatbot.max_sentences || data.chatbot.maxSentences || 2,
            languageComplexity: data.chatbot.language_complexity || data.chatbot.languageComplexity || 'simple'
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKid();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.name.trim()) {
      setError('Chatbot name is required.');
      return;
    }
    setIsSaving(true);
    setError('');
    setSuccess(false);
    
    try {
      const res = await apiFetch(`/api/chatbots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error('Failed to update chatbot settings');
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this chatbot? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    setError('');
    
    try {
      const res = await apiFetch(`/api/chatbots/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete chatbot');
      
      navigate('/chatbots');
    } catch (err: any) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  const isCreating = settings.name === '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="xs" 
          onClick={() => navigate('/dashboard')} 
          className="pl-0 h-7 hover:bg-transparent hover:text-blue-600 text-[12px] font-bold uppercase"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to Dashboard
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
          {isCreating ? 'Create New Chatbot' : `Edit ${settings.name}`}
        </h1>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-center gap-2 text-red-600 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-md flex items-center gap-2 text-emerald-700 text-xs font-medium">
          <Save className="w-4 h-4 shrink-0" />
          <p>Settings {isCreating ? 'created' : 'saved'} successfully!</p>
        </div>
      )}

      <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 space-y-0">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-600" />
            <CardTitle className="text-base font-bold">
              {isCreating ? 'New Chatbot Configuration' : `${settings.name} Settings`}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-2">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">
                  Chatbot Name
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  placeholder="Enter chatbot name"
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent"
                  required
                />
                <p className="text-[10px] text-slate-400 italic">
                  This is the name your child will see when chatting with their AI friend.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">
                    Gender
                  </label>
                  <select
                    value={settings.gender}
                    onChange={(e) => setSettings({ ...settings, gender: e.target.value })}
                    className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">
                    Personality Type
                  </label>
                  <select
                    value={settings.personality}
                    onChange={(e) => setSettings({ ...settings, personality: e.target.value })}
                    className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="friendly">Friendly & Supportive</option>
                    <option value="funny">Funny & Playful</option>
                    <option value="smart">Smart & Educational</option>
                    <option value="calm">Calm & Soothing</option>
                    <option value="energetic">Energetic & Enthusiastic</option>
                  </select>
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">
                  Speaking Tone
                </label>
                <select
                  value={settings.tone}
                  onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="cheerful">Cheerful & Bright</option>
                  <option value="gentle">Gentle & Soft</option>
                  <option value="encouraging">Encouraging & Motivating</option>
                  <option value="curious">Curious & Inquisitive</option>
                  <option value="silly">Silly & Fun</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">
                    Speaking Speed (0.5 - 2.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="2.0"
                    value={settings.speakingSpeed}
                    onChange={(e) => setSettings({ ...settings, speakingSpeed: parseFloat(e.target.value) })}
                    className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">
                    Max Sentences
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={settings.maxSentences}
                    onChange={(e) => setSettings({ ...settings, maxSentences: parseInt(e.target.value) })}
                    className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">
                    Language Complexity
                  </label>
                  <select
                    value={settings.languageComplexity}
                    onChange={(e) => setSettings({ ...settings, languageComplexity: e.target.value as 'simple' | 'medium' | 'complex' })}
                    className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="simple">Simple</option>
                    <option value="medium">Medium</option>
                    <option value="complex">Complex</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
              <Button 
                type="submit" 
                disabled={isSaving || isDeleting} 
                className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded shadow-sm transition-all active:scale-[0.98]"
              >
                {isSaving ? 'Saving...' : (isCreating ? 'Create Chatbot' : `Save ${settings.name} Settings`)}
              </Button>
              {!isCreating && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={isSaving || isDeleting}
                  className="h-9 px-6 rounded border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold text-sm"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Chatbot'}
                </Button>
              )}
              <Button 
                type="button"
                variant="outline"
                onClick={() => navigate('/chatbots')}
                className="h-9 px-6 rounded border-slate-300 text-slate-600 font-bold text-sm"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
