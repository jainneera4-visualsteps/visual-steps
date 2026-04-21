import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Star, 
  Sparkles, 
  Trophy,
  Lightbulb,
  HelpCircle
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';

// Sample Level Data
const LEVELS = {
  'Level 1': [
    {
      id: 1,
      question: "If you have 3 red apples and 2 green apples, how many apples do you have in total?",
      answer: "5 Apples!",
      funFact: "Apples float in water because they are 25% air!",
      color: "#FFCFDF" // Pastel Pink
    },
    {
      id: 2,
      question: "Which shape has 3 sides and 3 corners?",
      answer: "A Triangle!",
      funFact: "The pyramids in Egypt are shaped like triangles!",
      color: "#B9F3FC" // Pastel Blue
    },
    {
      id: 3,
      question: "What comes next in this pattern: Red, Blue, Red, Blue, ...?",
      answer: "Red!",
      funFact: "Patterns are everywhere in nature, like the stripes on a zebra!",
      color: "#E0FFD1" // Pastel Green
    }
  ]
};

export default function BrainQuest() {
  const navigate = useNavigate();
  const [currentLevel] = useState('Level 1');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const deck = LEVELS[currentLevel as keyof typeof LEVELS];
  const currentCard = deck[currentIndex];
  const progress = ((currentIndex + 1) / deck.length) * 100;

  const handleNext = () => {
    if (currentIndex < deck.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 150);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
      }, 150);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
  };

  const isKidMode = !!localStorage.getItem('kid_session');

  const goBack = () => {
    if (isKidMode) {
      const kidSession = localStorage.getItem('kid_session');
      const kidId = kidSession ? JSON.parse(kidSession).kidId : null;
      if (kidId) {
        navigate(`/kids-dashboard/${kidId}`);
        return;
      }
    }
    navigate('/games');
  };

  if (isFinished) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-12 shadow-2xl border-8 border-yellow-200"
        >
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <Trophy size={120} className="text-yellow-400" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -top-4 -right-4"
              >
                <Sparkles size={48} className="text-blue-400" />
              </motion.div>
            </div>
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-4">Well Done!</h1>
          <p className="text-xl text-slate-500 font-bold mb-12">
            You finished the {currentLevel} deck! You are a superstar!
          </p>
          <div className="flex flex-col gap-4">
            <Button 
              onClick={handleReset}
              className="h-16 text-xl font-black bg-blue-500 hover:bg-blue-600 rounded-2xl shadow-lg shadow-blue-100"
            >
              <RotateCcw className="mr-2" /> Play Again
            </Button>
            <Button 
              variant="ghost"
              onClick={goBack}
              className="h-12 font-bold text-slate-400"
            >
              Back to {isKidMode ? 'Dashboard' : 'Games'}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full h-full py-4 flex flex-col">
      <Button variant="ghost" onClick={goBack} className="mb-6 font-bold text-slate-500">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to {isKidMode ? 'Dashboard' : 'Games'}
      </Button>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {currentLevel} • Card {currentIndex + 1} of {deck.length}
          </span>
          <div className="flex gap-1">
            {deck.map((_, i) => (
              <div 
                key={i} 
                className={`h-2 w-2 rounded-full ${i <= currentIndex ? 'bg-blue-400' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        </div>
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1">
          <motion.div 
            className="h-full bg-blue-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard Container */}
      <div className="relative h-[450px] w-full perspective-1000">
        <motion.div
          className="w-full h-full relative preserve-3d cursor-pointer"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front Side */}
          <div 
            className="absolute inset-0 w-full h-full backface-hidden rounded-[40px] shadow-xl p-12 flex flex-col items-center justify-center text-center border-8 border-white"
            style={{ backgroundColor: currentCard.color }}
          >
            <div className="mb-6 p-4 bg-white/50 rounded-full">
              <HelpCircle size={48} className="text-slate-700" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight">
              {currentCard.question}
            </h2>
            <p className="mt-12 text-sm font-black text-slate-500 uppercase tracking-widest animate-bounce">
              Tap to Flip!
            </p>
          </div>

          {/* Back Side */}
          <div 
            className="absolute inset-0 w-full h-full backface-hidden rounded-[40px] shadow-xl p-12 flex flex-col items-center justify-center text-center border-8 border-white rotate-y-180"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <div className="mb-4 p-3 bg-green-100 rounded-full">
              <Star size={32} className="text-green-500 fill-green-500" />
            </div>
            <h3 className="text-4xl font-black text-green-600 mb-8">
              {currentCard.answer}
            </h3>
            
            <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-100 relative mt-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                Fun Fact!
              </div>
              <p className="text-slate-600 font-bold text-lg leading-relaxed">
                {currentCard.funFact}
              </p>
            </div>
            
            <p className="mt-8 text-xs font-black text-slate-300 uppercase tracking-widest">
              Tap to see question again
            </p>
          </div>
        </motion.div>
      </div>

      {/* Navigation Controls */}
      <div className="mt-12 flex items-center justify-between gap-4">
        <Button
          disabled={currentIndex === 0}
          onClick={handlePrevious}
          className="flex-1 h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 border-none font-black text-lg"
        >
          <ChevronLeft className="mr-2" /> Back
        </Button>
        
        <Button
          onClick={handleNext}
          className="flex-[2] h-16 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white border-none font-black text-xl shadow-lg shadow-blue-100"
        >
          {currentIndex === deck.length - 1 ? 'Finish!' : 'Next Card'} <ChevronRight className="ml-2" />
        </Button>
      </div>

      {/* CSS for 3D Flip */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
