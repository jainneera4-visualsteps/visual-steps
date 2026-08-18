import { apiFetch } from '../utils/api';
import { generateContent, generateImage, modelNames } from '../lib/gemini';
import { isAuthError } from '../utils/auth';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';
import { ArrowLeft, Sparkles, Save, Plus, Minus, Trash2, Image as ImageIcon, Loader2, Volume2, Square, HelpCircle } from 'lucide-react';
import { Tooltip } from '../components/ui/Tooltip';

interface StoryPage {
  text: string;
  imageUrl: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

export default function CreateSocialStory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [pages, setPages] = useState<StoryPage[]>([{ text: '', imageUrl: '' }]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState<Record<number, boolean>>({});
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedKidId, setSelectedKidId] = useState('');
  const [, setKidStrengths] = useState('');
  const [, setKidWeaknesses] = useState('');
  const [, setKidHobbies] = useState('');
  const [, setKidInterests] = useState('');
  const [, setKidBehavioralIssues] = useState('');
  const [, setKidTherapies] = useState('');
  const [, setKidSensoryIssues] = useState('');
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

  const t = (text: string) => {
    if (language === 'English') return text;
    const translations: Record<string, Record<string, string>> = {
      'Spanish': {
        'Story Title': 'Título de la historia',
        'Page Text': 'Texto de la página',
        'Image URL (Optional)': 'URL de la imagen (Opcional)',
        'What is the story about?': '¿De qué trata la historia?',
        'AI Story Assistant': 'Asistente de historias de IA',
        'Generate Story': 'Generar historia',
        'Save Story': 'Guardar historia',
        'Update Story': 'Actualizar historia',
        'Story Details': 'Detalles de la historia',
        'Select Kid': 'Seleccionar niño',
        'Language': 'Idioma',
        'Tone': 'Tono',
        'Number of Pages': 'Número de páginas',
        'Sentences per Page': 'Frases por página',
        'Narrator Settings': 'Ajustes del narrador',
        'Narrator Selection': 'Selección del narrador',
        'Speech Speed': 'Velocidad de voz',
        'Visual Sync': 'Sincronización visual',
        'Highlighting': 'Resaltado',
        'Add Page': 'Añadir página',
        'Delete Page': 'Eliminar página',
        'Back to Social Stories': 'Volver a Historias Sociales',
        'Create Social Story': 'Crear Historia Social',
        'Edit Social Story': 'Editar Historia Social',
        'e.g., Going to the dentist, Sharing toys...': 'p. ej., Ir al dentista, Compartir juguetes...',
        'Describe what happens on this page...': 'Describe lo que sucede en esta página...',
      },
      'Hindi': {
        'Story Title': 'कहानी का शीर्षक',
        'Page Text': 'पेज का टेक्स्ट',
        'Image URL (Optional)': 'छवि URL (वैकल्पिक)',
        'What is the story about?': 'कहानी किसके बारे में है?',
        'AI Story Assistant': 'AI कहानी सहायक',
        'Generate Story': 'कहानी बनाएँ',
        'Save Story': 'कहानी सहेजें',
        'Update Story': 'कहानी अपडेट करें',
        'Story Details': 'कहानी का विवरण',
        'Select Kid': 'बच्चे का चयन करें',
        'Language': 'भाषा',
        'Tone': 'टोन',
        'Number of Pages': 'पेजों की संख्या',
        'Sentences per Page': 'प्रति पेज वाक्य',
        'Narrator Settings': 'कथावाचक सेटिंग्स',
        'Narrator Selection': 'कथावाचक का चयन',
        'Speech Speed': 'बोलने की गति',
        'Visual Sync': 'विज़ुअल सिंक',
        'Highlighting': 'हाइलाइटिंग',
        'Add Page': 'पेज जोड़ें',
        'Delete Page': 'पेज हटाएँ',
        'Back to Social Stories': 'सोशल स्टोरीज पर वापस जाएं',
        'Create Social Story': 'सोशल स्टोरी बनाएँ',
        'Edit Social Story': 'सोशल स्टोरी एडिट करें',
        'e.g., Going to the dentist, Sharing toys...': 'जैसे कि, डेंटिस्ट के पास जाना, खिलौने साझा करना...',
        'Describe what happens on this page...': 'बताएं कि इस पेज पर क्या होता है...',
      },
      'French': {
        'Story Title': 'Titre de l\'histoire',
        'Page Text': 'Texte de la page',
        'Image URL (Optional)': 'URL de l\'image (Optionnel)',
        'What is the story about?': 'De quoi parle l\'histoire ?',
        'AI Story Assistant': 'Assistant d\'histoire IA',
        'Generate Story': 'Générer l\'histoire',
        'Save Story': 'Enregistrer l\'histoire',
        'Update Story': 'Mettre à jour l\'histoire',
        'Story Details': 'Détails de l\'histoire',
      },
      'Portuguese': {
        'Story Title': 'Título da história',
        'Page Text': 'Texto da página',
        'Image URL (Optional)': 'URL da imagem (Opcional)',
        'What is the story about?': 'Sobre o que é a história?',
        'AI Story Assistant': 'Assistente de história de IA',
        'Generate Story': 'Gerar história',
        'Save Story': 'Salvar história',
        'Update Story': 'Atualizar história',
        'Story Details': 'Detalhes da história',
      }
    };
    return translations[language]?.[text] || text;
  };

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
            if (content.quiz) setQuiz(content.quiz);
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
        const kid = kids.find(k => k.id === selectedKidId);
        const kidContext = kid ? `
        Kid Profile for Context:
        - Name: ${kid.name}
        - Grade Level: ${kid.grade_level || 'N/A'}
        - Interests: ${kid.interests || 'N/A'}
        - Strengths: ${kid.strengths || 'N/A'}
        - Weaknesses: ${kid.weaknesses || 'N/A'}
        - Behavioral Issues: ${kid.behavioral_issues || 'N/A'}
        - Sensory Issues: ${kid.sensory_issues || 'N/A'}
        ` : '';

        return await generateContent({
          model: modelNames.flash,
          prompt: `You are a Technical Illustrator and Social Story Creator. Create a social story about: ${prompt}. ${kidContext}
        CRITICAL: The entire story (title, page content, quiz questions, options, and explanations) MUST be written strictly in ${language}. 
        The story should be written in the second person, as if a narrator is talking directly to the child.
        The tone of the story should be ${tone.toLowerCase()}.
        The story title should be interesting, engaging, and fun.
        Break it down into exactly ${storyLength} pages. Each page should have friendly, interactive text, consisting of exactly ${sentencesPerParagraph} sentences.
        The story should suggest how to deal with the issues and emphasize that nothing stays the same.
        
        VISUAL STYLE: As a technical illustrator, provide a "visualPrompt" for each page ONLY if an illustration is truly beneficial for comprehension. 
        Descriptions should be optimized for EXTREMELY SIMPLE, minimalist, black and white line art. 
        Thick, clean, bold black lines on pure white background. NO shading, NO gray, NO colors, NO complex details. Focus on very simple, recognizable outlines and shapes. Leave "visualPrompt" empty if not needed.
        
        FORMATTING: All page content and story text must be formatted to be justified.
        
        Also, generate 3-4 simple multiple-choice questions at the end.
        Format the response as a JSON object with a "title" property, a "pages" array, and a "quiz" array.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING", description: `The story title in ${language}` },
              pages: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    text: { type: "STRING", description: `The page text in ${language}` },
                    visualPrompt: { type: "STRING", description: `A description for an illustration (in English)` }
                  },
                  required: ["text", "visualPrompt"]
                }
              },
              quiz: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    question: { type: "STRING", description: `The question text in ${language}` },
                    options: { 
                      type: "ARRAY",
                      items: { type: "STRING", description: `Option text in ${language}` },
                      minItems: 2,
                      maxItems: 4
                    },
                    correctAnswerIndex: { type: "NUMBER" },
                    explanation: { type: "STRING", description: `Explanation in ${language}` }
                  },
                  required: ["question", "options", "correctAnswerIndex"]
                }
              }
            },
            required: ["title", "pages", "quiz"]
          }
        });
      });

      const responseText = response.text;
      const generatedData = JSON.parse(responseText || '{}');
      if (generatedData.pages && Array.isArray(generatedData.pages)) {
        setPages(generatedData.pages.map((p: any) => ({ 
          text: p.text, 
          imageUrl: '',
          visualPrompt: p.visualPrompt 
        })));
        setTitle(generatedData.title || prompt);
      }
      if (generatedData.quiz && Array.isArray(generatedData.quiz)) {
        setQuiz(generatedData.quiz);
      }
    } catch (error: any) {
      console.error('Failed to generate story', error);
      if (isAuthError(error)) return; // Auth utility handles this
      
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

  const generatePageImage = async (index: number) => {
    const page = pages[index];
    const visualPrompt = (page as any).visualPrompt || page.text;
    if (!visualPrompt) return;

    setIsGeneratingImages(prev => ({ ...prev, [index]: true }));
    try {
      // Technical Illustrator style requested by user
      const illustratorPrompt = `VERY SIMPLE, minimalist black and white line art. Thick, clean, bold black lines on pure white background. NO shading, NO gray, NO colors, NO complex details. Content: ${visualPrompt}. CRITICAL: Do NOT include any text, letters, or words in the illustration.`;
      
      const imageUrl = await generateImage(illustratorPrompt);
      if (imageUrl) {
        updatePage(index, 'imageUrl' as any, imageUrl);
      } else {
        alert('Failed to generate image. Please try again.');
      }
    } catch (error: any) {
      console.error('Failed to generate image', error);
      alert(`Failed to generate image: ${error?.message || 'Unknown AI image error'}`);
    } finally {
      setIsGeneratingImages(prev => ({ ...prev, [index]: false }));
    }
  };

  const generateAllImages = async () => {
    setIsGeneratingAllImages(true);
    try {
      for (let i = 0; i < pages.length; i++) {
        // Skip if already has an image
        if (pages[i].imageUrl) continue;
        await generatePageImage(i);
      }
    } finally {
      setIsGeneratingAllImages(false);
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
            quiz,
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
    <div className="space-y-4 pb-12 w-full">
      <div className="mb-6">
        <button onClick={() => navigate('/social-stories')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> {t('Back to Social Stories')}
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">
              {isEditing ? t('Edit Social Story') : t('Create Social Story')}
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
              {t('AI Story Assistant')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('Select Kid')}</label>
                  <Tooltip content="Choose a child to personalize the story based on their profile." variant="help">
                    <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <select 
                  value={selectedKidId}
                  onChange={(e) => handleKidSelect(e.target.value)}
                  disabled={isEditing}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">All Kids</option>
                  {kids.map((kid) => (
                    <option key={kid.id} value={kid.id}>{kid.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('Language')}</label>
                  <Tooltip content="The language in which the story will be generated." variant="help">
                    <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={isEditing}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="flex items-center gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('Tone')}</label>
                  <Tooltip content="The emotional style of the narrative (e.g., Calming for anxiety, Playful for learning)." variant="help">
                    <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <select 
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  disabled={isEditing}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option>Calming</option>
                  <option>Encouraging</option>
                  <option>Direct</option>
                  <option>Playful</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('Number of Pages')}</label>
                  <Tooltip content="Specify the total length of the social story." variant="help">
                    <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <select 
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  disabled={isEditing}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="Short">Short (3-4 pages)</option>
                  <option value="Medium">Medium (5-6 pages)</option>
                  <option value="Long">Long (7-8 pages)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('Sentences per Page')}</label>
                  <Tooltip content="How many sentences should be on each page? Fewer sentences are easier to read." variant="help">
                    <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <div className="flex items-center h-9 w-full bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => setSentencesPerParagraph(Math.max(1, sentencesPerParagraph - 1))}
                    disabled={isEditing || sentencesPerParagraph <= 1}
                    className="flex-1 h-full flex items-center justify-center hover:bg-slate-50 border-r border-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5 text-slate-600" />
                  </button>
                  <div className="flex-1 h-full flex items-center justify-center text-sm font-black text-slate-900 bg-slate-50/30">
                    {sentencesPerParagraph}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSentencesPerParagraph(Math.min(10, sentencesPerParagraph + 1))}
                    disabled={isEditing || sentencesPerParagraph >= 10}
                    className="flex-1 h-full flex items-center justify-center hover:bg-slate-50 border-l border-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('What is the story about?')}</label>
                <Tooltip content="Describe the social situation or behavioral goal for the AI to focus on." variant="help">
                  <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <div className="space-y-2">
                <Textarea 
                  placeholder={t('e.g., Going to the dentist, Sharing toys...')} 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isEditing}
                  className="text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[80px] resize-none"
                  rows={3}
                />
                {!isEditing && (
                  <div className="flex justify-end">
                    <Button 
                      size="sm"
                      onClick={generateStory} 
                      disabled={isGenerating || !prompt}
                      className="font-bold"
                    >
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      {t('Generate Story')}
                    </Button>
                  </div>
                )}
                {!isEditing && pages.length > 0 && pages[0].text && (
                  <div className="flex justify-end pt-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={generateAllImages} 
                      disabled={isGeneratingAllImages}
                      className="font-bold border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      {isGeneratingAllImages ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                      Generate All Illustrations
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
      </Card>

      <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
            <Volume2 className="h-4 w-4 text-blue-600" />
            {t('Narrator Settings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('Narrator Selection')}</label>
                  <Tooltip content="Choose between a warm adult voice or a peer-friendly voice." variant="help">
                    <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
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
                className="w-full h-9 px-3 py-1 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300"
              >
                <option value="Kind Adult">Kind Adult</option>
                <option value="Friendly Peer">Friendly Peer</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('Speech Speed')}</label>
                <Tooltip content="Adjust how fast the story is read aloud." variant="help">
                  <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <select
                value={narratorSettings.speed}
                onChange={(e) => {
                  const speedLabel = e.target.value;
                  const speedValue = speedLabel === 'Slow' ? 0.8 : speedLabel === 'Fast' ? 1.2 : 1.0;
                  setNarratorSettings({ ...narratorSettings, speed: speedLabel, rate: speedValue });
                }}
                className="w-full h-9 px-3 py-1 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300"
              >
                <option value="Slow">Slow</option>
                <option value="Normal">Normal</option>
                <option value="Fast">Fast</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('Visual Sync')}</label>
                <Tooltip content="Highlight words synchronously with the audio to improve tracking and comprehension." variant="help">
                  <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <div className="flex items-center justify-between h-9 p-2.5 bg-slate-50 rounded-md border border-slate-100 shadow-inner">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('Highlighting')}</span>
                <button
                  onClick={() => setNarratorSettings({ ...narratorSettings, highlightWords: !narratorSettings.highlightWords })}
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    narratorSettings.highlightWords ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      narratorSettings.highlightWords ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="space-y-4 pt-4 no-print">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{t('Story Details')}</h2>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveStory} disabled={isSaving} className="font-bold">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isEditing ? t('Update Story') : t('Save Story')}
            </Button>
          </div>
        </div>


        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('Story Title')}</label>
              <Tooltip content="The main heading of your social story." variant="help">
                <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
              </Tooltip>
            </div>
            <Input 
              placeholder="e.g., My Visit to the Dentist" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-bold h-11"
            />
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
                      <div className="flex items-center gap-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('Page Text')}</label>
                        <Tooltip content="The content for this specific page of the story." variant="help">
                          <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                        </Tooltip>
                      </div>
                      <div className="relative">
                        <Textarea 
                          placeholder={t('Describe what happens on this page...')} 
                          value={page.text}
                          onChange={(e) => updatePage(index, 'text', e.target.value)}
                          rows={3}
                          className="text-sm resize-none"
                        />
                        <div className="mt-2 p-3 text-sm text-justify text-slate-600 bg-slate-50 border border-slate-100 rounded-md min-h-[40px]">
                          {page.text || 'Story text preview...'}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('Image URL (Optional)')}</label>
                        <Tooltip content="Provide a link to an image or upload one to visualize this page." variant="help">
                          <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                        </Tooltip>
                      </div>
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 font-bold"
                          disabled={isGeneratingImages[index]}
                          onClick={() => generatePageImage(index)}
                        >
                          {isGeneratingImages[index] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                          AI Art
                        </Button>
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
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageUpload} 
          />

          <Button 
            variant="outline" 
            className="w-full h-12 border-dashed border-2 border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 font-bold"
            onClick={addPage}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('Add Page')}
          </Button>
        </div>
      </div>

    </div>
  );
}
