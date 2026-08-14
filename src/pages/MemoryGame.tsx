import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  RotateCcw, 
  Trophy, 
  Sparkles,
  Gamepad2,
  Timer,
  Star
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import confetti from 'canvas-confetti';

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'];

interface MemoryCard {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryGame() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (isActive && !isWon) {
      interval = setInterval(() => {
        setTimer((timer) => timer + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, isWon]);

  const initializeGame = () => {
    const gameEmojis = [...EMOJIS, ...EMOJIS];
    const shuffledCards = gameEmojis
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledCards);
    setFlippedCards([]);
    setMoves(0);
    setIsWon(false);
    setTimer(0);
    setIsActive(false);
  };

  const handleCardClick = (id: number) => {
    if (!isActive) setIsActive(true);
    if (flippedCards.length === 2 || cards[id].isFlipped || cards[id].isMatched) return;

    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);

    const newFlippedCards = [...flippedCards, id];
    setFlippedCards(newFlippedCards);

    if (newFlippedCards.length === 2) {
      setMoves(prev => prev + 1);
      const [firstId, secondId] = newFlippedCards;
      
      if (cards[firstId].emoji === cards[secondId].emoji) {
        // Match found
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[firstId].isMatched = true;
          matchedCards[secondId].isMatched = true;
          setCards(matchedCards);
          setFlippedCards([]);
          
          if (matchedCards.every(card => card.isMatched)) {
            setIsWon(true);
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 }
            });
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[firstId].isFlipped = false;
          resetCards[secondId].isFlipped = false;
          setCards(resetCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full py-8">
      <div className="mb-8 flex items-center justify-between">
        <Button variant="ghost" onClick={goBack} className="font-bold text-slate-500">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to {isKidMode ? 'Dashboard' : 'Games'}
        </Button>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
            <Timer size={18} className="text-blue-500" />
            <span className="font-black text-slate-700">{formatTime(timer)}</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
            <Gamepad2 size={18} className="text-purple-500" />
            <span className="font-black text-slate-700">{moves} Moves</span>
          </div>
        </div>
      </div>

      {isWon ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[40px] p-12 shadow-2xl border-8 border-yellow-200 text-center max-w-2xl mx-auto"
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
          <h1 className="text-5xl font-black text-slate-900 mb-4">Amazing!</h1>
          <p className="text-xl text-slate-500 font-bold mb-8">
            You matched all the cards in {moves} moves and {formatTime(timer)}!
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
        <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
          {cards.map((card) => (
            <motion.div
              key={card.id}
              whileHover={{ scale: card.isFlipped || card.isMatched ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="aspect-square cursor-pointer perspective-1000"
              onClick={() => handleCardClick(card.id)}
            >
              <motion.div
                className="w-full h-full relative preserve-3d"
                animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
                transition={{ duration: 0.4 }}
              >
                {/* Front Side (Hidden) */}
                <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg flex items-center justify-center border-4 border-white">
                  <Star size={32} className="text-white/30 fill-white/20" />
                </div>

                {/* Back Side (Emoji) */}
                <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl bg-white shadow-lg flex items-center justify-center border-4 border-blue-100 rotate-y-180">
                  <span className="text-4xl md:text-5xl">{card.emoji}</span>
                  {card.isMatched && (
                    <div className="absolute inset-0 bg-green-500/10 rounded-2xl flex items-center justify-center">
                      <div className="bg-green-500 rounded-full p-1">
                        <Star size={16} className="text-white fill-white" />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      )}

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
