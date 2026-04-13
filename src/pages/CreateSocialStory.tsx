import { apiFetch } from '../utils/api';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';
import { ArrowLeft, Sparkles, Save, Plus, Trash2, Image as ImageIcon, Loader2, Volume2, Square, Copy, Printer } from 'lucide-react';

interface StoryPage {
  text: string;
  imageUrl: string;
}

export default function CreateSocialStory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [pages, setPages] = useState<StoryPage[]>([{ text: '', imageUrl: '' }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedKidId, setSelectedKidId] = useState('');
  const [kidStrengths, setKidStrengths] = useState('');
  const [kidWeaknesses, setKidWeaknesses] = useState('');
  const [kidHobbies, setKidHobbies] = useState('');
  const [kidInterests, setKidInterests] = useState('');
  const [kidBehavioralIssues, setKidBehavioralIssues] = useState('');
  const [kidTherapies, setKidTherapies] = useState('');
  const [kidSensoryIssues, setKidSensoryIssues] = useState('');
  const [tone, setTone] = useState('Calming');
  const [length, setLength] = useState('Medium');
  const [language, setLanguage] = useState('English');
  const [sentencesPerParagraph, setSentencesPerParagraph] = useState(2);
  const [kids, setKids] = useState<any[]>([]);
  const [narratorSettings, setNarratorSettings] = useState({
    voice: '',
    rate: 1.0,
    pitch: 1.0,
    narratorType: 'Kind Adult',
    speed: 'Normal',
    highlightWords: true
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || editingPageIndex === null) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        updatePage(editingPageIndex, 'imageUrl', data.imageUrl);
      } else {
        alert('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('An error occurred while uploading.');
    } finally {
      setEditingPageIndex(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isEditing = Boolean(id);

  const testVoice = () => {
    if (!narratorSettings.voice) return;
    
    if (isTestingVoice) {
      window.speechSynthesis.cancel();
      setIsTestingVoice(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Hello! This is a sample of how I will sound as your child's story narrator.");
    const voice = voices.find(v => v.name === narratorSettings.voice);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = narratorSettings.rate;
    utterance.pitch = narratorSettings.pitch;
    
    utterance.onstart = () => setIsTestingVoice(true);
    utterance.onend = () => setIsTestingVoice(false);
    utterance.onerror = () => setIsTestingVoice(false);
    
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const getFilteredVoices = () => {
    const langMap: Record<string, string> = {
      'English': 'en',
      'Spanish': 'es',
      'French': 'fr',
      'German': 'de',
      'Italian': 'it',
      'Portuguese': 'pt',
      'Hindi': 'hi',
      'Chinese': 'zh',
      'Japanese': 'ja'
    };
    const targetLang = langMap[language] || 'en';
    
    let filtered = voices.filter(v => v.lang.startsWith(targetLang));
    
    if (filtered.length === 0) return voices;
    
    if (narratorSettings.narratorType === 'Kind Adult') {
      const prioritized = filtered.filter(v => v.name.includes('Natural') || v.name.includes('Google'));
      return prioritized.length > 0 ? prioritized : filtered;
    } else {
      const prioritized = filtered.filter(v => v.name.includes('Child') || v.name.includes('Junior') || v.name.includes('Kid') || v.name.includes('Zira') || v.name.includes('Samantha'));
      return prioritized.length > 0 ? prioritized : filtered;
    }
  };

  useEffect(() => {
    const filtered = getFilteredVoices();
    if (filtered.length > 0) {
      // If current voice is not in filtered list, pick a new one
      const currentVoiceExists = filtered.some(v => v.name === narratorSettings.voice);
      if (!currentVoiceExists) {
        setNarratorSettings(prev => ({ ...prev, voice: filtered[0].name }));
      }
    }
  }, [language, narratorSettings.narratorType, voices]);

  useEffect(() => {
    const fetchKids = async () => {
      try {
        const res = await apiFetch('/api/kids');
        if (res.ok) {
          const data = await res.json();
          setKids(data.kids || []);
        }
      } catch (error) {
        console.error('Failed to fetch kids', error);
      }
    };
    fetchKids();
  }, []);

  useEffect(() => {
    if (isEditing) {
      const fetchStory = async () => {
        setIsLoading(true);
        try {
          const res = await apiFetch(`/api/social-stories/${id}`);
          if (res.ok) {
            const data = await res.json();
            const story = data.story;
            setTitle(story.title);
            setSelectedKidId(story.kid_id || '');
            
            const content = typeof story.content === 'string' ? JSON.parse(story.content) : story.content;
            if (content.pages) setPages(content.pages);
            if (content.narratorSettings) setNarratorSettings(content.narratorSettings);
            if (content.prompt) setPrompt(content.prompt);
            if (content.language) setLanguage(content.language);
            if (content.tone) setTone(content.tone);
            if (content.length) setLength(content.length);
            if (content.sentencesPerParagraph) setSentencesPerParagraph(content.sentencesPerParagraph);
          } else {
            alert('Failed to fetch story data');
            navigate('/social-stories');
          }
        } catch (error) {
          console.error('Failed to fetch story', error);
          alert('An error occurred while fetching story data');
        } finally {
          setIsLoading(false);
        }
      };
      fetchStory();
    }
  }, [id, isEditing, navigate]);

  const handleKidSelect = (id: string) => {
    setSelectedKidId(id);
    const kid = kids.find(k => k.id === id);
    if (kid) {
      setKidStrengths(kid.strengths || '');
      setKidWeaknesses(kid.weaknesses || '');
      setKidHobbies(kid.hobbies || '');
      setKidInterests(kid.interests || '');
      setKidBehavioralIssues(kid.behavioral_issues || '');
      setKidTherapies(kid.therapies || '');
      setKidSensoryIssues(kid.sensory_issues || '');
    } else {
      setKidStrengths('');
      setKidWeaknesses('');
      setKidHobbies('');
      setKidInterests('');
      setKidBehavioralIssues('');
      setKidTherapies('');
      setKidSensoryIssues('');
    }
  };

  const addPage = () => {
    setPages([...pages, { text: '', imageUrl: '' }]);
  };

  const removePage = (index: number) => {
    if (pages.length === 1) return;
    setPages(pages.filter((_, i) => i !== index));
  };

  const updatePage = (index: number, field: keyof StoryPage, value: string) => {
    const newPages = [...pages];
    newPages[index][field] = value;
    setPages(newPages);
  };

  const generateStory = async () => {
    if (!prompt) return;
    setIsGenerating(true);

    const withRetry = async <T,>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
      try {
        return await fn();
      } catch (error: any) {
        const errString = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error));
        if (errString.toLowerCase().includes('quota') || errString.toLowerCase().includes('billing')) {
          throw new Error('You have exceeded your AI service quota. Please try again later or check your API key billing details.');
        }
        if (retries > 0) {
          console.warn(`Retrying after error: ${errString}. Retries left: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return withRetry(fn, retries - 1, delay * 1.5);
        }
        throw error;
      }
    };

    try {
      const storyLength = length === 'Short' ? '3-4' : length === 'Medium' ? '5-6' : '7-8';
      const response = await withRetry(async () => {
        const res = await apiFetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "gemini-3.1-flash-lite-preview",
            contents: `Create a social story about: ${prompt}. 
        The story should be written in ${language}.
        The story should be written in the second person, as if a narrator is talking directly to the child (using 'you').
        The tone of the story should be ${tone.toLowerCase()}.
        The story title should be interesting, engaging, and fun.
        Break it down into exactly ${storyLength} pages. Each page should have friendly, interactive text, consisting of exactly ${sentencesPerParagraph} sentences.
        The story should suggest how to deal with the issues, what the child can do in the situation, and emphasize that nothing stays the same all the time.
        Format the response as a JSON object with a "title" property and a "pages" array of objects with a "text" property.`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING", description: "An interesting and engaging title for the story" },
                  pages: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        text: { type: "STRING", description: "Friendly, interactive text for the page, consisting of exactly 2-3 sentences." }
                      },
                      required: ["text"]
                    }
                  }
                },
                required: ["title", "pages"]
              }
            }
          })
        });
        if (!res.ok) {
          const errorData = await res.json();
          console.error('API Error:', errorData);
          const message = errorData.details || errorData.error || 'Failed to generate content';
          throw new Error(message);
        }
        return await res.json();
      });

      const generatedData = JSON.parse(response.text || '{}');
      if (generatedData.pages && Array.isArray(generatedData.pages)) {
        setPages(generatedData.pages.map((p: any) => ({ text: p.text, imageUrl: '' })));
        setTitle(generatedData.title || prompt);
      }
    } catch (error: any) {
      console.error('Failed to generate story', error);
      const errorMessage = error.message || "Unknown error";
      if (errorMessage.includes("500") || errorMessage.includes("Rpc failed")) {
        alert("The AI service is currently busy or experiencing a temporary issue. We tried retrying, but it failed. Please wait a moment and try again.");
      } else {
        alert(`Failed to generate story: ${errorMessage}. Please try again.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const saveStory = async () => {
    if (!title) return alert('Please enter a title');
    if (pages.some(p => !p.text)) return alert('Please fill in all page text');

    setIsSaving(true);
    try {
      const url = isEditing ? `/api/social-stories/${id}` : '/api/social-stories';
      const method = isEditing ? 'PUT' : 'POST';
      
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          kidId: selectedKidId || null,
          content: { 
            pages, 
            narratorSettings,
            prompt,
            language,
            tone,
            length,
            sentencesPerParagraph
          } 
        }),
      });

      if (res.ok) {
        navigate('/social-stories');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save story');
      }
    } catch (error) {
      console.error('Failed to save story', error);
      alert('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      <div className="mb-6">
        <button onClick={() => navigate('/social-stories')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Social Stories
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">
              {isEditing ? 'Edit Social Story' : 'Create Social Story'}
            </h1>
            <p className="text-lg font-normal text-slate-500 mt-3">
              {isEditing ? 'Modify your custom story' : 'Design a custom story'}
            </p>
          </div>
        </div>
      </div>

      <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-blue-600" />
              AI Story Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <p className="text-sm text-slate-500">
              Tell the AI what situation you want to explain (e.g., "Going to the dentist", "Sharing toys at school"), and it will draft the story for you.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Language</label>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                  >
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                    <option>Italian</option>
                    <option>Portuguese</option>
                    <option>Hindi</option>
                    <option>Chinese</option>
                    <option>Japanese</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tone</label>
                  <select 
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                  >
                    <option>Calming</option>
                    <option>Encouraging</option>
                    <option>Direct</option>
                    <option>Playful</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Number of Pages</label>
                  <select 
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                  >
                    <option value="Short">Short (3-4 pages)</option>
                    <option value="Medium">Medium (5-6 pages)</option>
                    <option value="Long">Long (7-8 pages)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sentences per Page</label>
                  <select 
                    value={sentencesPerParagraph}
                    onChange={(e) => setSentencesPerParagraph(parseInt(e.target.value))}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                  >
                    <option value={1}>1 Sentence</option>
                    <option value={2}>2 Sentences</option>
                    <option value={3}>3 Sentences</option>
                    <option value={4}>4 Sentences</option>
                    <option value={5}>5 Sentences</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">What is the story about?</label>
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g., Going to the dentist, Sharing toys..." 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && generateStory()}
                  className="h-9 text-sm"
                />
                <Button 
                  size="sm"
                  onClick={generateStory} 
                  disabled={isGenerating || !prompt}
                  className="shrink-0 font-bold"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate
                </Button>
              </div>
            </div>
          </CardContent>
      </Card>

      <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
            <Volume2 className="h-4 w-4 text-blue-600" />
            Narrator Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Narrator Selection</label>
                <button 
                  onClick={testVoice}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                  title={isTestingVoice ? "Stop testing" : "Test this voice"}
                >
                  {isTestingVoice ? (
                    <><Square className="h-3 w-3 fill-current" /> Stop</>
                  ) : (
                    <><Volume2 className="h-3 w-3" /> Test Voice</>
                  )}
                </button>
              </div>
              <select
                value={narratorSettings.narratorType}
                onChange={(e) => setNarratorSettings({ ...narratorSettings, narratorType: e.target.value })}
                className="w-full h-9 px-3 py-1 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="Kind Adult">Kind Adult</option>
                <option value="Friendly Peer">Friendly Peer</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Speech Speed</label>
              <select
                value={narratorSettings.speed}
                onChange={(e) => {
                  const speedLabel = e.target.value;
                  const speedValue = speedLabel === 'Slow' ? 0.8 : speedLabel === 'Fast' ? 1.2 : 1.0;
                  setNarratorSettings({ ...narratorSettings, speed: speedLabel, rate: speedValue });
                }}
                className="w-full h-9 px-3 py-1 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="Slow">Slow</option>
                <option value="Normal">Normal</option>
                <option value="Fast">Fast</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-slate-700">Visual Sync</label>
              <p className="text-[10px] text-slate-500">Highlight words while reading</p>
            </div>
            <button
              onClick={() => setNarratorSettings({ ...narratorSettings, highlightWords: !narratorSettings.highlightWords })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                narratorSettings.highlightWords ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  narratorSettings.highlightWords ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 pt-4 no-print">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Story Details</h2>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveStory} disabled={isSaving} className="font-bold">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isEditing ? 'Update Story' : 'Save Story'}
            </Button>
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Story Title</label>
            <Input 
              placeholder="e.g., My Visit to the Dentist" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-bold h-11"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assign to Kid (Optional)</label>
            <select 
              value={selectedKidId}
              onChange={(e) => handleKidSelect(e.target.value)}
              className="w-full h-11 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
            >
              <option value="">Apply to all kids</option>
              {kids.map((kid) => (
                <option key={kid.id} value={kid.id}>{kid.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {pages.map((page, index) => (
            <Card key={index} className="relative group border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Page Text</label>
                      <Textarea 
                        placeholder="Describe what happens on this page..." 
                        value={page.text}
                        onChange={(e) => updatePage(index, 'text', e.target.value)}
                        rows={3}
                        className="text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Image URL (Optional)</label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="https://example.com/image.jpg" 
                          value={page.imageUrl}
                          onChange={(e) => updatePage(index, 'imageUrl', e.target.value)}
                          className="h-9 text-sm flex-1"
                        />
                        <button 
                          type="button"
                          className="h-9 w-9 shrink-0 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden hover:bg-slate-100 transition-colors"
                          onClick={() => {
                            setEditingPageIndex(index);
                            fileInputRef.current?.click();
                          }}
                        >
                          {page.imageUrl ? (
                            <img src={page.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-slate-300" />
                          )}
                        </button>
                        {page.imageUrl && (
                          <button
                            type="button"
                            className="h-9 w-9 shrink-0 rounded border border-red-200 bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors"
                            onClick={() => updatePage(index, 'imageUrl', '')}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-8 w-8 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    onClick={() => removePage(index)}
                    disabled={pages.length === 1}
                    title="Delete Page"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />

          <Button 
            variant="outline" 
            className="w-full h-12 border-dashed border-2 border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 font-bold"
            onClick={addPage}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Page
          </Button>
        </div>
      </div>

    </div>
  );
}
