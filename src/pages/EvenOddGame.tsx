import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  RotateCcw, 
  Trophy, 
  Sparkles,
  Gamepad2,
  Star,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '../components/Button';
import confetti from 'canvas-confetti';

export default function EvenOddGame() {
  const navigate = useNavigate();
  const [number, setNumber] = useState(0);
  const [score, setScore] = useState(0);
  const [totalPlayed, setTotalPlayed] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [streak, setStreak] = useState(0);

  const isKidMode = !!localStorage.getItem('kid_session');

  useEffect(() => {
    generateNewNumber();
  }, []);

  const generateNewNumber = () => {
    const newNum = Math.floor(Math.random() * 100) + 1;
    setNumber(newNum);
    setFeedback(null);
  };

  const handleChoice = (choice: 'even' | 'odd') => {
    if (feedback !== null || isWon) return;

    const isEven = number % 2 === 0;
    const correct = (choice === 'even' && isEven) || (choice === 'odd' && !isEven);

    setTotalPlayed(prev => prev + 1);

    if (correct) {
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
      setFeedback('correct');
      
      if (score + 1 >= 10) {
        setIsWon(true);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } else {
      setStreak(0);
      setFeedback('incorrect');
    }

    if (score + 1 < 10) {
      setTimeout(() => {
        generateNewNumber();
      }, 1000);
    }
  };

  const initializeGame = () => {
    setScore(0);
    setTotalPlayed(0);
    setStreak(0);
    setIsWon(false);
    generateNewNumber();
  };

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

  if (isWon) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[40px] p-12 shadow-2xl border-8 border-yellow-200"
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
          <h1 className="text-5xl font-black text-slate-900 mb-4">Math Master!</h1>
          <p className="text-xl text-slate-500 font-bold mb-12">
            You got 10 correct answers! Great job identifying even and odd numbers.
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
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <Button variant="ghost" onClick={goBack} className="font-bold text-slate-500">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to {isKidMode ? 'Dashboard' : 'Games'}
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
            <Star size={18} className="text-yellow-500" />
            <span className="font-black text-slate-700">Score: {score}/10</span>
          </div>
          {streak > 1 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
            >
              {streak} Streak! 🔥
            </motion.div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl border-b-8 border-slate-100 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-slate-50">
          <motion.div 
            className="h-full bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${(score / 10) * 100}%` }}
          />
        </div>

        <div className="mb-12">
          <span className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">Is this number Even or Odd?</span>
          <motion.div
            key={number}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-9xl font-black text-slate-900 drop-shadow-sm"
          >
            {number}
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Button
            onClick={() => handleChoice('even')}
            disabled={feedback !== null}
            className={`h-32 text-3xl font-black rounded-3xl transition-all ${
              feedback === 'correct' && number % 2 === 0 
                ? 'bg-green-500 hover:bg-green-500 scale-105' 
                : feedback === 'incorrect' && number % 2 === 0
                ? 'bg-red-500 hover:bg-red-500'
                : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-100'
            }`}
          >
            EVEN
          </Button>
          <Button
            onClick={() => handleChoice('odd')}
            disabled={feedback !== null}
            className={`h-32 text-3xl font-black rounded-3xl transition-all ${
              feedback === 'correct' && number % 2 !== 0 
                ? 'bg-green-500 hover:bg-green-500 scale-105' 
                : feedback === 'incorrect' && number % 2 !== 0
                ? 'bg-red-500 hover:bg-red-500'
                : 'bg-purple-500 hover:bg-purple-600 shadow-lg shadow-purple-100'
            }`}
          >
            ODD
          </Button>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="mt-8 flex items-center justify-center gap-2"
            >
              {feedback === 'correct' ? (
                <>
                  <CheckCircle2 className="text-green-500" size={32} />
                  <span className="text-2xl font-black text-green-500 uppercase italic">Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="text-red-500" size={32} />
                  <span className="text-2xl font-black text-red-500 uppercase italic">Oops!</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 text-center">
        <p className="text-slate-400 font-bold flex items-center justify-center gap-2">
          <Gamepad2 size={16} />
          Can you get 10 correct in a row?
        </p>
      </div>
    </div>
  );
}
