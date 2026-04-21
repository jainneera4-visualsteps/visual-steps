import { apiFetch, safeJson } from '../utils/api';
import { generateContent, modelNames } from '../lib/gemini';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Textarea } from '../components/Textarea';
import { 
  Plus, Trash2, Edit2, Sparkles, BookOpen, 
  ArrowLeft, Search, Filter, LayoutGrid, 
  Activity as ActivityIcon, Clock, Repeat, ImageIcon, X,
  ChevronRight, CheckCircle2, Eye, LayoutList,
  Library,
  Target,
  Wand2,
  Settings2,
  Trash,
  Save,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
      const response = await generateContent({
        model: modelNames.flash,
        prompt: `Generate 3 creative activity ideas for a child named ${kid.name} based on their profile:
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
      });
      
      const responseText = response.text;
      const suggestions = JSON.parse(responseText || '[]');
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
      <div className="w-full px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between mb-12"
        >
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={() => {
                setView('library');
                setEditingTemplateId(null);
                setPredefinedType('');
                setPredefinedId('');
              }} 
              className="group text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-2xl px-6 h-12 text-sm font-black uppercase tracking-widest transition-all"
            >
              <ArrowLeft className="mr-3 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Library
            </Button>
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 rounded-3xl bg-brand-600 flex items-center justify-center text-white shadow-xl shadow-brand-200">
                {view === 'edit' ? <Settings2 className="h-8 w-8" /> : <Plus className="h-8 w-8" />}
              </div>
              <div>
                <h1 className="text-5xl font-display font-black text-slate-900 tracking-tighter italic">
                  {view === 'edit' ? 'Refine Activity' : 'Create Template'}
                </h1>
                <p className="text-xl text-slate-500 font-medium mt-1">
                  Design repeatable tasks and activities for your children's success.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Main Configuration */}
            <div className="lg:col-span-2 space-y-10">
              {view === 'create' && (
                <Card className="shadow-2xl shadow-indigo-100 border-none bg-indigo-50/30 overflow-hidden ring-1 ring-indigo-100">
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-2xl font-display font-black text-indigo-900 flex items-center gap-3">
                      <Sparkles className="text-indigo-600" />
                      AI Genius Assistant
                    </CardTitle>
                    <p className="text-indigo-600 font-medium">Select a child to generate personalized, therapeutic activity ideas.</p>
                  </CardHeader>
                  <CardContent className="p-8 pt-4 space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <Select
                          value={selectedKidForSuggestions}
                          onChange={(e) => {
                            setSelectedKidForSuggestions(e.target.value);
                            if (e.target.value) generateAISuggestions(e.target.value);
                            else setAiSuggestions([]);
                          }}
                          className="h-14 !bg-white"
                        >
                          <option value="">Choose a child profile...</option>
                          {kids.map(k => (
                            <option key={k.id} value={k.id}>{k.name}</option>
                          ))}
                        </Select>
                      </div>
                      <Button 
                        type="button" 
                        variant="secondary"
                        onClick={() => generateAISuggestions(selectedKidForSuggestions)}
                        disabled={isGeneratingSuggestions || !selectedKidForSuggestions}
                        className="h-14 px-8 font-black uppercase tracking-widest bg-white border-none shadow-xl shadow-indigo-200"
                      >
                        {isGeneratingSuggestions ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            Thinking...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Wand2 size={18} />
                            Inspire Me
                          </span>
                        )}
                      </Button>
                    </div>

                    <AnimatePresence>
                      {aiSuggestions.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="grid gap-6 mt-4"
                        >
                          {aiSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              type="button"
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
                              className="group bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-600 shadow-xl shadow-indigo-200/20 text-left transition-all hover:scale-[1.02] active:scale-95"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 ring-indigo-100">
                                  {suggestion.category}
                                </span>
                                <Plus size={20} className="text-indigo-300 group-hover:text-indigo-600 transition-colors" />
                              </div>
                              <h4 className="text-xl font-display font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{suggestion.activityType}</h4>
                              <p className="text-slate-500 font-medium mt-2 leading-relaxed line-clamp-2">{suggestion.description}</p>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-2xl shadow-slate-200 border-none bg-white">
                <CardHeader className="p-10 border-b border-slate-50">
                  <CardTitle className="text-2xl font-display font-black flex items-center gap-3">
                    <BookOpen className="text-brand-600" />
                    Activity Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Input
                      label="Activity Category"
                      placeholder="e.g., Education, Chores"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      list="activity-categories"
                      className="h-14"
                    />
                    <datalist id="activity-categories">
                      {Array.from(new Set(templates.map(t => t.category).filter(Boolean))).map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>

                    <Input
                      label="Activity Name"
                      placeholder="e.g., Daily Reading"
                      value={formData.activityType}
                      onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                      required
                      list="activity-types"
                      className="h-14"
                    />
                    <datalist id="activity-types">
                      {Array.from(new Set([...templates.map(t => t.activity_type), ...DEFAULT_ACTIVITIES])).map((type) => (
                        <option key={type} value={type} />
                      ))}
                    </datalist>
                  </div>

                  <Textarea
                    label="Description"
                    placeholder="Describe the activity purpose and context..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-[120px]"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Input
                      label="External Link (Optional)"
                      placeholder="https://..."
                      value={formData.link}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      className="h-14"
                    />
                    <div className="space-y-4">
                      <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest pl-2">Display Artwork</label>
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {formData.imageUrl ? (
                            <img src={formData.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="text-slate-300" size={24} />
                          )}
                        </div>
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
                            }
                          }}
                        />
                        <label 
                          htmlFor="template-image-upload"
                          className={`flex-1 h-14 flex items-center justify-center gap-3 rounded-[1.25rem] border-2 border-slate-100 bg-white font-black text-slate-600 hover:border-brand-600 hover:text-brand-600 transition-all cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          <Upload size={18} />
                          {isUploading ? 'Uploading...' : 'Upload Image'}
                        </label>
                        {formData.imageUrl && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setFormData({ ...formData, imageUrl: '' })}
                            className="h-14 w-14 rounded-2xl text-rose-500 hover:bg-rose-50 border-none"
                          >
                            <Trash2 size={24} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-2xl shadow-slate-200 border-none bg-white">
                <CardHeader className="p-10 border-b border-slate-50 flex flex-row items-center justify-between">
                  <CardTitle className="text-2xl font-display font-black flex items-center gap-3">
                    <LayoutList className="text-brand-600" />
                    Structured Steps
                  </CardTitle>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleAddStep}
                    className="h-12 px-6 rounded-2xl font-black text-brand-600 border-brand-100 hover:bg-brand-50"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Milestone
                  </Button>
                </CardHeader>
                <CardContent className="p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {formData.steps.map((step, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative p-6 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-brand-200 hover:shadow-xl hover:shadow-brand-500/5 transition-all"
                      >
                        <div className="flex gap-6 items-start">
                          <div className="h-12 w-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-brand-200 shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-4">
                            <Textarea
                              placeholder={`Milestone description...`}
                              value={step.description}
                              onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                              className="min-h-[80px] !bg-transparent border-none focus:ring-0 px-0 placeholder:text-slate-300"
                            />
                            <div className="flex items-center gap-4">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id={`step-image-${index}`}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleStepImageUpload(index, file);
                                }}
                              />
                              <label
                                htmlFor={`step-image-${index}`}
                                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 cursor-pointer"
                              >
                                <ImageIcon size={14} />
                                {step.image_url ? 'Update Visualization' : 'Add Illustration'}
                              </label>
                              {step.image_url && (
                                <div className="h-8 w-8 rounded-lg overflow-hidden ring-2 ring-white shadow-sm">
                                  <img src={step.image_url} alt="Step" className="h-full w-full object-cover" />
                                </div>
                              )}
                            </div>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => handleRemoveStep(index)}
                            className="h-10 w-10 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                    {formData.steps.length === 0 && (
                      <div className="md:col-span-2 py-16 text-center text-slate-400 font-medium bg-slate-50 border-2 border-dashed border-slate-100 rounded-[3rem]">
                        <LayoutList className="mx-auto h-12 w-12 mb-4 opacity-20" />
                        No steps defined. Add steps to help break down the activity.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Assets */}
            <div className="lg:col-span-1 space-y-10">
              <Card className="shadow-2xl shadow-slate-200 border-none bg-white overflow-hidden">
                <CardHeader className="p-8 border-b border-slate-50 bg-emerald-50/30">
                  <CardTitle className="text-xl font-display font-black flex items-center gap-3">
                    <LayoutGrid className="text-emerald-600" />
                    Asset Library
                  </CardTitle>
                  <p className="text-emerald-700 font-medium text-sm">Link existing digital assets for a unified workflow.</p>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-6">
                    <Select
                      label="Connect Asset Type"
                      value={predefinedType}
                      onChange={(e) => {
                        setPredefinedType(e.target.value);
                        setPredefinedId('');
                      }}
                    >
                      <option value="">Choose Asset Type...</option>
                      <option value="quiz">Interactive Quizzes</option>
                      <option value="story">Social Narratives</option>
                      <option value="worksheet">Practice Sheets</option>
                    </Select>

                    {predefinedType && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <Select
                          label={`Choose ${predefinedType.charAt(0).toUpperCase() + predefinedType.slice(1)}`}
                          value={predefinedId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPredefinedId(val);
                            if (!val) return;
                            
                            if (predefinedType === 'story') {
                              const story = socialStories.find(s => s.id === val);
                              if (story) setFormData({ ...formData, activityType: 'Social Story', description: story.title, link: `/social-stories/view/${story.id}`, category: 'Social Skills' });
                            } else if (predefinedType === 'quiz') {
                              const quiz = quizzes.find(q => q.id === val);
                              if (quiz) setFormData({ ...formData, activityType: 'Quiz', description: quiz.title, link: `/play-quiz/${quiz.id}`, category: 'Education' });
                            } else if (predefinedType === 'worksheet') {
                              const worksheet = worksheets.find(w => w.id === val);
                              if (worksheet) setFormData({ ...formData, activityType: 'Worksheet', description: worksheet.title, link: `/worksheet-generator?id=${worksheet.id}`, category: 'Education' });
                            }
                          }}
                        >
                          <option value="">Select individual asset...</option>
                          {predefinedType === 'quiz' && quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                          {predefinedType === 'story' && socialStories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                          {predefinedType === 'worksheet' && worksheets.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
                        </Select>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="p-6 bg-white/80 backdrop-blur-2xl rounded-[3rem] border border-white shadow-2xl flex items-center justify-between gap-6 sticky bottom-10 z-30 ring-1 ring-slate-100">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setView('library')} 
              className="h-16 px-10 text-lg font-black uppercase text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-all"
            >
              Discard Changes
            </Button>
            <Button 
              type="submit" 
              className="h-16 px-16 text-xl font-black italic shadow-brand-400 group"
            >
              <Save className="mr-3 h-6 w-6 transition-transform group-hover:scale-110" />
              {view === 'edit' ? 'Update Template' : 'Deploy Template'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16">
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
              <Library className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-5xl font-display font-black text-slate-900 tracking-tighter italic">
                Knowledge Library
              </h1>
              <p className="text-xl text-slate-500 font-medium mt-1">
                Your curated collection of activities, stories, and growth opportunities.
              </p>
            </div>
          </div>
        </div>
        <Button 
          onClick={() => {
            setPredefinedType('');
            setPredefinedId('');
            setView('create');
          }} 
          className="h-16 px-12 rounded-[2rem] text-xl font-black italic shadow-brand-400"
        >
          <Plus className="mr-3 h-7 w-7" />
          Create New Entry
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 p-8 bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 mb-12 ring-1 ring-slate-100">
        <div className="flex-1 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
          <Input 
            placeholder="Explore your library..." 
            className="pl-16 h-14 text-lg !bg-slate-50/50 hover:!bg-white focus:!bg-white border-none ring-1 ring-slate-100 hover:ring-brand-200 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 min-w-[280px]">
          <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner">
            <Filter size={24} />
          </div>
          <div className="flex-1">
            <Select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-14 !bg-slate-50/50 border-none ring-1 ring-slate-100"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 animate-pulse rounded-[3rem] bg-slate-100" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100">
          <div className="bg-slate-50 p-10 rounded-[2.5rem] mb-8 shadow-inner">
            <ActivityIcon className="h-20 w-20 text-slate-200" />
          </div>
          <h3 className="text-3xl font-display font-black text-slate-900 tracking-tight">Your library is waiting</h3>
          <p className="max-w-md text-xl text-slate-500 mt-4 font-medium mb-10 leading-relaxed">
            Populate your universe with activities, habits, and social adventures tailored for your children.
          </p>
          <Button onClick={() => setView('create')} className="h-16 px-12 rounded-3xl text-lg font-black uppercase tracking-widest shadow-xl">
            Ignite Your First Activity
          </Button>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={template.id}
            >
              <Card className="group border-none shadow-xl hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-500 bg-white hover:-translate-y-2 rounded-[3rem] overflow-hidden flex flex-col h-full ring-1 ring-slate-100">
                <div className="relative h-48 overflow-hidden">
                  {template.image_url ? (
                    <img src={template.image_url} alt={template.activity_type} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-full w-full bg-slate-50 flex items-center justify-center text-slate-100">
                      <Library size={80} />
                    </div>
                  )}
                  <div className="absolute top-6 left-6">
                    <span className="px-4 py-1.5 bg-white/90 backdrop-blur-md text-brand-700 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                      {template.category || 'Legacy'}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent flex items-end p-8">
                     <div className="flex items-center gap-3">
                        {template.link?.includes('/social-stories/view/') && (
                          <div className="h-10 w-10 rounded-xl bg-blue-500/80 backdrop-blur-sm text-white flex items-center justify-center shadow-lg">
                            <Eye size={20} />
                          </div>
                        )}
                        {template.steps && template.steps.length > 0 && (
                          <div className="h-10 px-4 rounded-xl bg-white/80 backdrop-blur-sm text-slate-900 flex items-center gap-2 text-xs font-black shadow-lg uppercase tracking-widest">
                            <LayoutList size={14} className="text-brand-600" />
                            {template.steps.length} Milestones
                          </div>
                        )}
                     </div>
                  </div>
                </div>

                <CardContent className="p-8 flex-1 flex flex-col">
                  <div className="flex-1 space-y-3">
                    <h3 className="text-2xl font-display font-black text-slate-900 leading-tight group-hover:text-brand-600 transition-colors truncate">
                      {template.activity_type}
                    </h3>
                    {template.description && (
                      <p className="text-slate-500 font-medium leading-relaxed line-clamp-3">
                        {template.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setFormData({
                            activityType: template.activity_type,
                            category: template.category,
                            description: template.description || '',
                            link: template.link || '',
                            imageUrl: template.image_url || '',
                            steps: template.steps || [],
                          });
                          setEditingTemplateId(template.id);
                          setView('edit');
                        }}
                        className="h-12 w-12 rounded-2xl text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                      >
                        <Edit2 size={20} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="h-12 w-12 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash size={18} />
                      </Button>
                    </div>
                    {template.link && (
                      <a 
                        href={template.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all shadow-sm"
                      >
                        <ChevronRight size={24} />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
