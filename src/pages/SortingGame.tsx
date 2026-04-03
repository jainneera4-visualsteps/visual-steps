import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  ArrowLeft, 
  RotateCcw, 
  Trophy, 
  Sparkles,
  Gamepad2,
  Timer,
  Star,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import confetti from 'canvas-confetti';

const CATEGORIES = [
  {
    id: 'fruits',
    name: 'Fruits',
    color: '#FFCFDF', // Pastel Pink
    items: [
      { id: 'f1', name: 'Apple', emoji: '🍎', category: 'fruits' },
      { id: 'f2', name: 'Banana', emoji: '🍌', category: 'fruits' },
      { id: 'f3', name: 'Strawberry', emoji: '🍓', category: 'fruits' },
      { id: 'f4', name: 'Grapes', emoji: '🍇', category: 'fruits' },
    ]
  },
  {
    id: 'vegetables',
    name: 'Vegetables',
    color: '#E0FFD1', // Pastel Green
    items: [
      { id: 'v1', name: 'Carrot', emoji: '🥕', category: 'vegetables' },
      { id: 'v2', name: 'Broccoli', emoji: '🥦', category: 'vegetables' },
      { id: 'v3', name: 'Corn', emoji: '🌽', category: 'vegetables' },
      { id: 'v4', name: 'Tomato', emoji: '🍅', category: 'vegetables' },
    ]
  }
];

interface Item {
  id: string;
  name: string;
  emoji: string;
  category: string;
}

export default function SortingGame() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const allItems = CATEGORIES.flatMap(cat => cat.items);
    const shuffledItems = allItems.sort(() => Math.random() - 0.5);
    setItems(shuffledItems);
    setCurrentItemIndex(0);
    setScore(0);
    setIsWon(false);
    setFeedback(null);
  };

  const handleSort = (categoryId: string) => {
    if (feedback !== null) return;

    const currentItem = items[currentItemIndex];
    if (currentItem.category === categoryId) {
      setScore(prev => prev + 1);
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }

    setTimeout(() => {
      setFeedback(null);
      if (currentItemIndex < items.length - 1) {
        setCurrentItemIndex(prev => prev + 1);
      } else {
        setIsWon(true);
        if (score + (currentItem.category === categoryId ? 1 : 0) === items.length) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }
    }, 1000);
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

  const currentItem = items[currentItemIndex];
  const progress = ((currentItemIndex + 1) / items.length) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <Button variant="ghost" onClick={goBack} className="font-bold text-slate-500">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to {isKidMode ? 'Dashboard' : 'Games'}
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
            <Star size={18} className="text-yellow-500" />
            <span className="font-black text-slate-700">Score: {score}/{items.length}</span>
          </div>
        </div>
      </div>

      {isWon ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[40px] p-12 shadow-2xl border-8 border-yellow-200 text-center"
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
          <h1 className="text-5xl font-black text-slate-900 mb-4">Great Sorting!</h1>
          <p className="text-xl text-slate-500 font-bold mb-8">
            You sorted {score} out of {items.length} items correctly!
          </p>
          <div className="flex flex-col gap-4">
            <Button 
              onClick={initializeGame}
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
      ) : (
        <div className="space-y-12">
          {/* Progress */}
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
            <motion.div 
              className="h-full bg-blue-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>

          {/* Current Item */}
          <div className="flex justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentItem?.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="relative"
              >
                <Card className="w-48 h-48 rounded-[40px] shadow-2xl border-8 border-white bg-slate-50 flex flex-col items-center justify-center">
                  <span className="text-7xl mb-2">{currentItem?.emoji}</span>
                  <span className="text-xl font-black text-slate-700">{currentItem?.name}</span>
                </Card>
                
                {feedback && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg"
                  >
                    {feedback === 'correct' ? (
                      <CheckCircle2 size={48} className="text-green-500" />
                    ) : (
                      <XCircle size={48} className="text-red-500" />
                    )}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sorting Bins */}
          <div className="grid grid-cols-2 gap-8">
            {CATEGORIES.map(cat => (
              <motion.button
                key={cat.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSort(cat.id)}
                className="h-48 rounded-[40px] shadow-xl border-8 border-white flex flex-col items-center justify-center transition-colors"
                style={{ backgroundColor: cat.color }}
              >
                <span className="text-2xl font-black text-slate-800 uppercase tracking-widest">
                  {cat.name}
                </span>
                <div className="mt-4 flex gap-2">
                  {cat.items.slice(0, 2).map(i => (
                    <span key={i.id} className="text-2xl opacity-50">{i.emoji}</span>
                  ))}
                </div>
              </motion.button>
            ))}
          </div>

          <p className="text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">
            Tap the correct category!
          </p>
        </div>
      )}
    </div>
  );
}
