import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Volume2, Square, Printer, BookOpen, Lightbulb } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent } from './Card';
import { apiFetch, safeJson } from '../utils/api';
import { motion, AnimatePresence } from 'motion/react';

interface StoryPage {
  text: string;
  imageUrl: string;
}

interface SocialStory {
  id: string;
  title: string;
  content: string;
}

interface NarratorSettings {
  voice: string;
  rate: number;
  pitch: number;
}

export function SocialStoryModal({ 
  storyId, 
  onClose,
  onPrint
}: { 
  storyId: string; 
  onClose: () => void;
  onPrint?: () => void;
}) {
  const [story, setStory] = useState<SocialStory | null>(null);
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [narratorSettings, setNarratorSettings] = useState<NarratorSettings | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    fetchStory();
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, [storyId]);

  const fetchStory = async () => {
    try {
      const res = await apiFetch(`/api/social-stories/${storyId}`);
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
    if (narratorSettings?.voice) {
      const savedVoice = voices.find(v => v.name === narratorSettings.voice);
      if (savedVoice) return savedVoice;
    }
    const preferred = ['Google US English', 'Google UK English Female', 'Samantha', 'Victoria'];
    for (const name of preferred) {
      const v = voices.find(v => v.name === name);
      if (v) return v;
    }
    return voices.find(v => v.lang.startsWith('en')) || voices[0];
  };

  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentWordIndex(null);
    
    if (autoPlay && pages.length > 0 && hasStarted) {
      const text = pages[currentPage]?.text;
      if (text) {
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = getFriendlyVoice();
        if (voice) utterance.voice = voice;
        utterance.pitch = narratorSettings?.pitch ?? 1.0;
        utterance.rate = narratorSettings?.rate ?? 0.75;
        
        const tokens = text.split(/(\s+)/);
        
        utterance.onboundary = (event) => {
          if (event.name === 'word') {
            const charIndex = event.charIndex;
            let currentLength = 0;
            let wordIdx = 0;
            for (let i = 0; i < tokens.length; i++) {
              if (i % 2 === 0) { // It's a word
                if (currentLength <= charIndex && charIndex < currentLength + tokens[i].length) {
                  setCurrentWordIndex(wordIdx);
                  break;
                }
                wordIdx++;
              }
              currentLength += tokens[i].length;
            }
          }
        };
        
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentWordIndex(null);
          if (autoPlay && currentPage < pages.length - 1) {
            setTimeout(() => setCurrentPage(prev => prev + 1), 1500);
          } else {
            setAutoPlay(false);
            setHasStarted(false);
          }
        };
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [currentPage, autoPlay, pages, voices, hasStarted]);

  const handleListen = () => {
    if (isPlaying || autoPlay) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setAutoPlay(false);
      setHasStarted(false);
      setCurrentWordIndex(null);
    } else {
      // Unlock audio for Safari
      const unlockUtterance = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(unlockUtterance);
      
      setAutoPlay(true);
      setHasStarted(true);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  if (!story || pages.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8">
      <div className="relative w-full max-w-[98vw] h-full max-h-[95vh] flex flex-col bg-white rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 truncate max-w-[200px] md:max-w-md">
              {story.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onPrint && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onPrint}
                className="h-10 px-4 rounded-xl font-bold uppercase tracking-wider text-slate-600 hover:bg-blue-50 transition-all"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            )}
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
              onClick={onClose}
              className="h-10 w-10 p-0 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Book Content */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-100/50 p-4 md:px-32 md:py-8">
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
                      const shouldHighlight = (narratorSettings as any)?.highlightWords ?? true;
                      
                      if (!shouldHighlight || currentWordIndex === null) return text;
                      
                      const tokens = text.split(/(\s+)/);
                      let wordIdx = 0;
                      
                      return tokens.map((token, i) => {
                        if (i % 2 === 0) {
                          const isHighlighted = wordIdx === currentWordIndex;
                          wordIdx++;
                          return isHighlighted ? (
                            <span key={i} className="bg-yellow-200 rounded px-1">{token}</span>
                          ) : (
                            <span key={i}>{token}</span>
                          );
                        } else {
                          return <span key={i}>{token}</span>;
                        }
                      });
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
        <div className="h-2 w-full bg-slate-100">
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

function Sparkles({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  );
}
