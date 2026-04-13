import { apiFetch, safeJson } from '../utils/api';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { 
  Plus, Trash2, Edit2, Sparkles, BookOpen, 
  ArrowLeft, Search, Filter, LayoutGrid, 
  Activity as ActivityIcon, Clock, Repeat, ImageIcon, X,
  ChevronRight, CheckCircle2, Eye, LayoutList
} from 'lucide-react';

interface ActivityStep {
  id?: string;
  step_number: number;
  description: string;
  image_url?: string;
}

interface ActivityTemplate {
  id: string;
  activity_type: string;
  category: string;
  description: string;
  link: string;
  image_url: string;
  steps: ActivityStep[];
  created_at: string;
}

interface Kid {
  id: string;
  name: string;
  hobbies?: string;
  interests?: string;
  therapies?: string;
  strengths?: string;
  weaknesses?: string;
  sensory_issues?: string;
  behavioral_issues?: string;
}

const DEFAULT_ACTIVITIES = [
  "Read a book", "Draw a picture", "Build with blocks", "Go for a walk",
  "Practice handwriting", "Do a puzzle", "Play with playdough", "Listen to music",
  "Help with chores", "Play a board game", "Do simple math problems", "Practice piano",
  "Dance to a song", "Write in a journal", "Do a science experiment", "Learn a new word",
  "Practice yoga", "Sort toys by color", "Build a fort", "Tell a story"
];

export default function ActivityLibrary() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [socialStories, setSocialStories] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [worksheets, setWorksheets] = useState<any[]>([]);
  const [kids, setKids] = useState<Kid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [view, setView] = useState<'library' | 'create' | 'edit'>('library');
  const [isUploading, setIsUploading] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [selectedKidForSuggestions, setSelectedKidForSuggestions] = useState<string>('');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [predefinedType, setPredefinedType] = useState<string>('');
  const [predefinedId, setPredefinedId] = useState<string>('');
  
  const [formData, setFormData] = useState({
    activityType: '',
    category: '',
    description: '',
    link: '',
    imageUrl: '',
    steps: [] as ActivityStep[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [templatesRes, kidsRes, storiesRes, quizzesRes, worksheetsRes] = await Promise.all([
        apiFetch('/api/activity-templates'),
        apiFetch('/api/kids'),
        apiFetch('/api/social-stories'),
        apiFetch('/api/quizzes'),
        apiFetch('/api/worksheets')
      ]);

      if (templatesRes.ok) {
        const data = await safeJson(templatesRes);
        setTemplates(data.templates || []);
      }
      
      if (kidsRes.ok) {
        const data = await safeJson(kidsRes);
        setKids(data.kids || []);
      }

      if (storiesRes.ok) {
        const data = await safeJson(storiesRes);
        setSocialStories(data.stories || []);
      }

      if (quizzesRes.ok) {
        const data = await safeJson(quizzesRes);
        setQuizzes(data.quizzes || []);
      }

      if (worksheetsRes.ok) {
        const data = await safeJson(worksheetsRes);
        setWorksheets(data.worksheets || []);
      }
    } catch (error) {
      console.error('Failed to fetch library data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await apiFetch(`/api/activity-templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete template', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = view === 'edit' ? `/api/activity-templates/${editingTemplateId}` : '/api/activity-templates';
      const method = view === 'edit' ? 'PUT' : 'POST';
      
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setView('library');
        setEditingTemplateId(null);
        fetchData();
        setFormData({
          activityType: '',
          category: '',
          description: '',
          link: '',
          imageUrl: '',
          steps: [],
        });
      }
    } catch (error) {
      console.error('Failed to save template', error);
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return data.imageUrl;
      }
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setIsUploading(false);
    }
    return null;
  };

  const handleStepImageUpload = async (index: number, file: File) => {
    const url = await handleImageUpload(file);
    if (url) {
      const newSteps = [...formData.steps];
      newSteps[index].image_url = url;
      setFormData({ ...formData, steps: newSteps });
    }
  };

  const handleAddStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { step_number: formData.steps.length + 1, description: '' }]
    });
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = formData.steps
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, step_number: i + 1 }));
    setFormData({ ...formData, steps: newSteps });
  };

  const handleStepChange = (index: number, field: keyof ActivityStep, value: any) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  const generateAISuggestions = async (kidId: string) => {
    if (!kidId) return;
    const kid = kids.find(k => k.id === kidId);
    if (!kid) return;

    setIsGeneratingSuggestions(true);
    try {
      const res = await apiFetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-3.1-flash-lite-preview",
          contents: `Generate 3 creative activity ideas for a child named ${kid.name} based on their profile:
        Hobbies: ${kid.hobbies || 'Not specified'}
        Interests: ${kid.interests || 'Not specified'}
        Therapies: ${kid.therapies || 'Not specified'}
        Strengths: ${kid.strengths || 'Not specified'}
        Weaknesses: ${kid.weaknesses || 'Not specified'}
        Sensory Issues: ${kid.sensory_issues || 'Not specified'}
        Behavioral Issues: ${kid.behavioral_issues || 'Not specified'}
        
        The activities should be therapeutic, engaging, and tailored to their specific needs.
        Each activity should have:
        - activityType (short name)
        - category (e.g., Education, Sensory, Motor Skills, Social, Chores)
        - description (detailed explanation)
        - steps (list of 3-5 clear steps)`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  activityType: { type: "STRING" },
                  category: { type: "STRING" },
                  description: { type: "STRING" },
                  steps: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["activityType", "category", "description", "steps"]
              }
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
      const response = await res.json();

      const suggestions = JSON.parse(response.text || '[]');
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to generate AI suggestions', error);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category).filter(Boolean)))];

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.activity_type.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (view === 'create' || view === 'edit') {
    return (
      <div className="space-y-4 pb-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="xs" onClick={() => {
            setView('library');
            setEditingTemplateId(null);
            setPredefinedType('');
            setPredefinedId('');
          }} className="pl-0 h-7 hover:bg-transparent hover:text-blue-600 text-[12px] font-bold uppercase">
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to Library
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
            {view === 'edit' ? 'Edit Activity Template' : 'New Activity Template'}
          </h1>
        </div>

        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between py-2 px-4 space-y-0">
            <CardTitle className="text-base font-bold">{view === 'edit' ? 'Edit Template Details' : 'Template Details'}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {view === 'create' && (
                <div className="space-y-3">
                  {/* AI Suggestions Section */}
                  <div className="space-y-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <label className="text-[12px] font-bold text-indigo-600 uppercase">AI Activity Ideas</label>
                      </div>
                      {selectedKidForSuggestions && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="xs" 
                          onClick={() => generateAISuggestions(selectedKidForSuggestions)}
                          disabled={isGeneratingSuggestions}
                          className="h-6 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
                        >
                          {isGeneratingSuggestions ? 'Generating...' : 'Refresh Ideas'}
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <select
                        className="flex h-8 flex-1 rounded border border-indigo-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        value={selectedKidForSuggestions}
                        onChange={(e) => {
                          setSelectedKidForSuggestions(e.target.value);
                          if (e.target.value) generateAISuggestions(e.target.value);
                          else setAiSuggestions([]);
                        }}
                      >
                        <option value="">-- Select a child for personalized ideas --</option>
                        {kids.map(k => (
                          <option key={k.id} value={k.id}>{k.name}</option>
                        ))}
                      </select>
                    </div>

                    {aiSuggestions.length > 0 && (
                      <div className="grid gap-2 mt-2">
                        {aiSuggestions.map((suggestion, idx) => (
                          <div key={idx} className="bg-white p-2 rounded border border-indigo-100 shadow-sm hover:border-indigo-300 transition-colors group">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">{suggestion.category}</span>
                                  <h4 className="text-sm font-bold text-slate-900">{suggestion.activityType}</h4>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{suggestion.description}</p>
                              </div>
                              <Button
                                type="button"
                                size="xs"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    activityType: suggestion.activityType,
                                    category: suggestion.category,
                                    description: suggestion.description,
                                    steps: suggestion.steps.map((s: string, i: number) => ({
                                      step_number: i + 1,
                                      description: s
                                    }))
                                  });
                                  setAiSuggestions([]);
                                  setSelectedKidForSuggestions('');
                                }}
                                className="h-7 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px]"
                              >
                                Use Idea
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {isGeneratingSuggestions && (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                        <span className="ml-2 text-xs text-indigo-600 font-medium">Thinking of great ideas...</span>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2.5 md:grid-cols-2">
                    <div className="space-y-0.5 p-2 bg-blue-50 rounded border border-blue-100">
                      <label className="text-[12px] font-bold text-blue-600 uppercase">Select Activity Type (Optional)</label>
                      <select
                        className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                        value={predefinedType}
                        onChange={(e) => {
                          setPredefinedType(e.target.value);
                          setPredefinedId('');
                        }}
                      >
                        <option value="">-- Select Type --</option>
                        <option value="quiz">Quizzes</option>
                        <option value="story">Social Stories</option>
                        <option value="worksheet">Worksheets</option>
                      </select>
                    </div>

                    <div className="space-y-0.5 p-2 bg-blue-50 rounded border border-blue-100">
                      <label className="text-[12px] font-bold text-blue-600 uppercase">Select Pre-defined Activity</label>
                      <select
                        className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-slate-50 disabled:cursor-not-allowed"
                        disabled={!predefinedType}
                        value={predefinedId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPredefinedId(val);
                          if (!val) return;
                          
                          if (predefinedType === 'story') {
                            const story = socialStories.find(s => s.id === val);
                            if (story) {
                              setFormData({
                                ...formData,
                                activityType: 'Social Story',
                                description: story.title,
                                link: `/social-stories/view/${story.id}`,
                                category: 'Social Skills'
                              });
                            }
                          } else if (predefinedType === 'quiz') {
                            const quiz = quizzes.find(q => q.id === val);
                            if (quiz) {
                              setFormData({
                                ...formData,
                                activityType: 'Quiz',
                                description: quiz.title,
                                link: `/play-quiz/${quiz.id}`,
                                category: 'Education'
                              });
                            }
                          } else if (predefinedType === 'worksheet') {
                            const worksheet = worksheets.find(w => w.id === val);
                            if (worksheet) {
                              setFormData({
                                ...formData,
                                activityType: 'Worksheet',
                                description: worksheet.title,
                                link: `/worksheet-generator?id=${worksheet.id}`,
                                category: 'Education'
                              });
                            }
                          }
                        }}
                      >
                        <option value="">-- Select Activity --</option>
                        {predefinedType === 'quiz' && quizzes.map(q => (
                          <option key={q.id} value={q.id}>{q.title}</option>
                        ))}
                        {predefinedType === 'story' && socialStories.map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                        {predefinedType === 'worksheet' && worksheets.map(w => (
                          <option key={w.id} value={w.id}>{w.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                <div className="grid gap-2.5 md:grid-cols-2">
                  <div className="space-y-0.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Activity Category</label>
                    <input
                      list="activity-categories"
                      className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Education, Chores"
                    />
                    <datalist id="activity-categories">
                      {Array.from(new Set(templates.map(t => t.category).filter(Boolean))).map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Activity Name</label>
                    <input
                      list="activity-types"
                      className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent"
                      value={formData.activityType}
                      onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                      required
                      placeholder="e.g., Read a book"
                      autoComplete="on"
                    />
                    <datalist id="activity-types">
                      {Array.from(new Set([...templates.map(t => t.activity_type), ...DEFAULT_ACTIVITIES])).map((type) => (
                        <option key={type} value={type} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Description</label>
                <textarea
                  className="flex min-h-[40px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add details..."
                />
              </div>

              <div className="grid gap-2.5 md:grid-cols-2">
                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Link</label>
                  <Input
                    className="h-8 text-sm"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Image</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="template-image-upload"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleImageUpload(file);
                          if (url) setFormData({ ...formData, imageUrl: url });
                          e.target.value = '';
                        }
                      }}
                    />
                    <label
                      htmlFor="template-image-upload"
                      className={`flex h-8 w-full cursor-pointer items-center justify-center rounded border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-50 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                      {isUploading ? 'Uploading...' : (formData.imageUrl ? 'Change' : 'Upload')}
                    </label>
                    {formData.imageUrl && (
                      <div className="flex items-center gap-1">
                        <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded border border-slate-200">
                          <img src={formData.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="xs" 
                          onClick={() => setFormData({ ...formData, imageUrl: '' })}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Steps Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Steps</label>
                  <Button type="button" variant="ghost" size="xs" onClick={handleAddStep} className="h-6 text-[11px] px-1.5">
                    <Plus className="mr-1 h-2.5 w-2.5" /> Add Step
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {formData.steps.map((step, index) => (
                    <div key={index} className="flex gap-2 items-start rounded border border-slate-200 bg-slate-50 p-2">
                      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                        {index + 1}
                      </span>
                      <div className="flex-1 space-y-1.5">
                        <textarea
                          className="flex min-h-[30px] w-full rounded border border-slate-300 bg-white px-1.5 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-600"
                          value={step.description}
                          onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                          placeholder={`Step ${index + 1}...`}
                        />
                        <div className="flex items-center gap-1.5">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={`step-image-${index}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleStepImageUpload(index, file);
                                e.target.value = '';
                              }
                            }}
                          />
                          <label
                            htmlFor={`step-image-${index}`}
                            className="flex cursor-pointer items-center text-[11px] font-bold text-blue-600 hover:text-blue-800"
                          >
                            <ImageIcon className="mr-1 h-2.5 w-2.5" />
                            {step.image_url ? 'Change' : 'Image'}
                          </label>
                          {step.image_url && (
                            <div className="flex items-center gap-1">
                              <div className="relative h-5 w-5 overflow-hidden rounded border border-slate-200">
                                <img src={step.image_url} alt="Step" className="h-full w-full object-cover" />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStepChange(index, 'image_url', '')}
                                className="text-red-500 hover:text-red-700"
                                title="Delete image"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="xs" onClick={() => handleRemoveStep(index)} className="h-5 w-5 p-0">
                        <Trash2 className="h-3 w-3 text-slate-400 hover:text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end items-center pt-1">
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="xs" onClick={() => {
                    setView('library');
                    setEditingTemplateId(null);
                    setPredefinedType('');
                    setPredefinedId('');
                  }} className="h-7 text-[12px]">
                    Cancel
                  </Button>
                  <Button type="submit" size="xs" className="h-7 text-[12px]">
                    {view === 'edit' ? 'Save Changes' : 'Save Template'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="mb-6">
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">Activity Library</h1>
            <p className="text-lg font-normal text-slate-500 mt-3">Manage your personalized activities and assign them to your kids.</p>
          </div>
          <Button onClick={() => {
            setPredefinedType('');
            setPredefinedId('');
            setView('create');
          }} className="h-10 px-6 font-bold uppercase tracking-wider">
            <Plus className="mr-2 h-4 w-4" />
            Create Activity
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search activities..." 
            className="pl-10 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 min-w-[200px]">
          <Filter className="h-4 w-4 text-slate-400" />
          <select 
            className="flex-1 h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <div className="bg-slate-50 p-6 rounded-full mb-4">
            <ActivityIcon className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-bold text-slate-600">No Activities Found</h3>
          <p className="max-w-xs text-sm">Create personalized activities to build your library and assign them whenever needed.</p>
          <Button onClick={() => setView('create')} className="mt-4" variant="outline">
            Create Your First Activity
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="group border-none ring-1 ring-slate-200 hover:ring-blue-400 transition-all bg-white">
              <CardContent className="p-2.5 flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0 h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  {template.image_url ? (
                    <img src={template.image_url} alt={template.activity_type} className="aspect-square w-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                  ) : (
                    <ActivityIcon className="h-5 w-5" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 truncate flex items-center gap-2">
                      {template.activity_type}
                      {template.link?.includes('/social-stories/view/') && (
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600`}>
                          <Eye className="h-3 w-3" />
                        </div>
                      )}
                    </h3>
                    {template.category && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10 uppercase">
                        {template.category}
                      </span>
                    )}
                  </div>
                  
                  {template.description && (
                    <div className="mt-0.5">
                      {template.link ? (
                        <a 
                          href={template.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[12px] text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {template.description}
                        </a>
                      ) : (
                        <p className="text-[12px] text-slate-500 line-clamp-1">{template.description}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {template.steps && template.steps.length > 0 && (
                      <div className="flex items-center gap-1">
                        <LayoutList className="h-2.5 w-2.5" />
                        {template.steps.length} steps
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setFormData({
                        activityType: template.activity_type,
                        category: template.category || '',
                        description: template.description || '',
                        link: template.link || '',
                        imageUrl: template.image_url || '',
                        steps: template.steps || [],
                      });
                      setEditingTemplateId(template.id);
                      setView('edit');
                    }}
                    title="Edit Template"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                  <button
                    type="button"
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-red-50 group transition-all active:scale-95"
                    onClick={() => handleDeleteTemplate(template.id)}
                    title="Delete Template"
                  >
                    <Trash2 className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
