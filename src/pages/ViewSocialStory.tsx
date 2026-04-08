import { apiFetch, safeJson } from '../utils/api';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { X, ChevronLeft, ChevronRight, BookOpen, Printer, Volume2, Square, ArrowLeft, Sparkles, Lightbulb } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

interface StoryPage {
  text: string;
  imageUrl: string;
}

interface SocialStory {
  id: string;
  title: string;
  content: string; // JSON string
  created_at: string;
}

interface NarratorSettings {
  voice: string;
  rate: number;
  pitch: number;
  narratorType?: string;
  speed?: string;
  highlightWords?: boolean;
}

export default function ViewSocialStory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [story, setStory] = useState<SocialStory | null>(null);
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [narratorSettings, setNarratorSettings] = useState<NarratorSettings | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isKidMode, setIsKidMode] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
  const [currentWordLength, setCurrentWordLength] = useState<number>(0);
  const [storyLanguage, setStoryLanguage] = useState('English');

  useEffect(() => {
    fetchStory();
    setIsKidMode(!!localStorage.getItem('kid_session'));
  }, [id]);

  useEffect(() => {
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const fetchStory = async () => {
    try {
      const res = await apiFetch(`/api/social-stories/${id}`);
      if (res.ok) {
        const data = await safeJson(res);
        setStory(data.story);
        try {
          const parsed = JSON.parse(data.story.content);
          if (Array.isArray(parsed)) {
            setPages(parsed);
          } else if (parsed && typeof parsed === 'object') {
            setPages(parsed.pages || []);
            setNarratorSettings(parsed.narratorSettings || null);
            setStoryLanguage(parsed.language || 'English');
          }
        } catch (e) {
          console.error('Failed to parse story content', e);
        }
      }
    } catch (error) {
      console.error('Failed to fetch story', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFriendlyVoice = () => {
    if (voices.length === 0) return null;
    
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
    const targetLang = langMap[storyLanguage] || 'en';
    
    let filtered = voices.filter(v => v.lang.startsWith(targetLang));
    if (filtered.length === 0) filtered = voices;
    
    if (narratorSettings?.narratorType === 'Kind Adult') {
      const prioritized = filtered.filter(v => v.name.includes('Natural') || v.name.includes('Google'));
      return prioritized.length > 0 ? prioritized[0] : filtered[0];
    } else if (narratorSettings?.narratorType === 'Friendly Peer') {
      const prioritized = filtered.filter(v => v.name.includes('Child') || v.name.includes('Junior') || v.name.includes('Kid') || v.name.includes('Zira') || v.name.includes('Samantha'));
      return prioritized.length > 0 ? prioritized[0] : filtered[0];
    }
    
    return filtered[0];
  };

  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentWordIndex(null);
    
    if (autoPlay && pages.length > 0) {
      const text = pages[currentPage]?.text;
      if (text) {
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = getFriendlyVoice();
        if (voice) utterance.voice = voice;
        
        // If it's a Friendly Peer and we didn't find a specific child voice, pitch it up
        let finalPitch = narratorSettings?.pitch ?? 1.0;
        if (narratorSettings?.narratorType === 'Friendly Peer' && voice && !voice.name.match(/child|kid|junior|kathy|fred|princess/i)) {
          finalPitch = Math.min(2.0, finalPitch * 1.4);
        }
        
        utterance.pitch = finalPitch;
        utterance.rate = narratorSettings?.rate ?? 1.0;
        
        if (narratorSettings?.highlightWords) {
          utterance.onboundary = (event) => {
            if (event.name === 'word') {
              setCurrentWordIndex(event.charIndex);
              
              // Fallback for voices that don't provide charLength
              let length = event.charLength;
              if (!length) {
                const remainingText = text.substring(event.charIndex);
                // Match the word until the next space or punctuation
                const match = remainingText.match(/^[\w'’À-ÿ]+/);
                length = match ? match[0].length : 1;
              }
              setCurrentWordLength(length);
            }
          };
        }

        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentWordIndex(null);
          if (autoPlay && currentPage < pages.length - 1) {
            setTimeout(() => setCurrentPage(prev => prev + 1), 1500);
          } else {
            setAutoPlay(false);
          }
        };
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [currentPage, autoPlay, pages, voices, narratorSettings]);

  const handleListen = () => {
    if (isPlaying || autoPlay) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setAutoPlay(false);
    } else {
      setAutoPlay(true);
    }
  };

  const handleClose = () => {
    if (isKidMode) {
      const kidSession = localStorage.getItem('kid_session');
      if (kidSession) {
        const { kidId } = JSON.parse(kidSession);
        navigate(`/kids-dashboard/${kidId}`);
      } else {
        navigate('/');
      }
    } else if (user) {
      navigate('/social-stories');
    } else {
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!story || pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <BookOpen className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Story Not Found</h2>
        <Button onClick={handleClose}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 md:p-8">
      <div className="relative w-full max-w-[98vw] h-full max-h-[95vh] flex flex-col bg-white rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 no-print">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 truncate max-w-[200px] md:max-w-md">
              {story.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleListen}
              className={`h-10 px-4 rounded-xl font-bold uppercase tracking-wider transition-all ${autoPlay ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-50 text-slate-600'}`}
            >
              {autoPlay ? <Square className="mr-2 h-4 w-4 fill-current" /> : <Volume2 className="mr-2 h-4 w-4" />}
              {autoPlay ? 'Stop' : 'Listen'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              className="h-10 w-10 p-0 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Book Content */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-100/50 p-4 md:px-32 md:py-8 no-print">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 50, rotateY: -10 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              exit={{ opacity: 0, x: -50, rotateY: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full h-full flex flex-col md:flex-row bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 perspective-1000"
            >
              {/* Left Side (Image) - Only show if imageUrl exists */}
              {pages[currentPage].imageUrl && (
                <div className="w-full md:w-[42%] h-1/2 md:h-full bg-slate-50 flex items-start justify-center border-b md:border-b-0 md:border-r border-slate-100 p-4 md:p-6 min-h-0">
                  <img 
                    src={pages[currentPage].imageUrl} 
                    alt={`Page ${currentPage + 1}`}
                    className="w-full max-h-full object-contain rounded-xl shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Right Side (Text) - Full width if no image */}
              <div className={`h-full py-6 px-12 md:py-10 md:px-16 flex flex-col bg-white relative ${pages[currentPage].imageUrl ? 'w-full md:w-[58%]' : 'w-full'}`}>
                {/* Page Header */}
                <div className="w-full flex items-center justify-between mb-6 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white shadow-sm">
                      <Lightbulb className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-bold tracking-tight text-blue-900">Visual Steps</span>
                  </div>
                  <div className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">
                    {currentPage + 1}
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-start overflow-y-auto pb-4">
                  <p className={`${pages[currentPage].imageUrl ? 'text-lg md:text-xl' : 'text-xl md:text-3xl'} font-bold text-slate-800 leading-relaxed text-justify whitespace-pre-wrap`}>
                    {(() => {
                      const text = pages[currentPage].text;
                      if (!narratorSettings?.highlightWords || currentWordIndex === null || !isPlaying) {
                        return text;
                      }
                      const before = text.substring(0, currentWordIndex);
                      const word = text.substring(currentWordIndex, currentWordIndex + currentWordLength);
                      const after = text.substring(currentWordIndex + currentWordLength);
                      return (
                        <>
                          {before}
                          <span className="bg-yellow-200 rounded px-0.5 transition-colors duration-150">{word}</span>
                          {after}
                        </>
                      );
                    })()}
                  </p>

                  {currentPage === pages.length - 1 && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="mt-8 flex justify-center shrink-0"
                    >
                      <div className="bg-emerald-50 text-emerald-700 px-6 py-2 rounded-full font-black uppercase tracking-wider text-sm border border-emerald-100 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        The End!
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="absolute inset-x-2 md:inset-x-6 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
            <Button
              variant="ghost"
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="h-16 w-16 rounded-full bg-white/90 shadow-xl border border-slate-200 text-blue-600 disabled:opacity-0 transition-all pointer-events-auto hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="h-10 w-10" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setCurrentPage(prev => Math.min(pages.length - 1, prev + 1))}
              disabled={currentPage === pages.length - 1}
              className="h-16 w-16 rounded-full bg-white/90 shadow-xl border border-slate-200 text-blue-600 disabled:opacity-0 transition-all pointer-events-auto hover:scale-110 active:scale-95"
            >
              <ChevronRight className="h-10 w-10" />
            </Button>
          </div>
        </div>

        {/* Footer Progress */}
        <div className="h-2 w-full bg-slate-100 no-print">
          <motion.div 
            className="h-full bg-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
          />
        </div>
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  );
}
