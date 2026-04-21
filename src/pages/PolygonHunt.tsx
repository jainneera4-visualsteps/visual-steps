import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Star, RefreshCcw, HelpCircle, Gamepad2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import confetti from 'canvas-confetti';

interface Polygon {
  name: string;
  sides: number;
  color: string;
  points: string;
}

const POLYGONS: Polygon[] = [
  { name: 'Triangle', sides: 3, color: '#ef4444', points: '50,10 90,90 10,90' },
  { name: 'Square', sides: 4, color: '#3b82f6', points: '15,15 85,15 85,85 15,85' },
  { name: 'Pentagon', sides: 5, color: '#10b981', points: '50,5 95,40 80,95 20,95 5,40' },
  { name: 'Hexagon', sides: 6, color: '#f59e0b', points: '50,5 93,27 93,73 50,95 7,73 7,27' },
  { name: 'Heptagon', sides: 7, color: '#8b5cf6', points: '50,5 89,25 98,68 72,95 28,95 2,68 11,25' },
  { name: 'Octagon', sides: 8, color: '#ec4899', points: '30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30' },
];

const PolygonHunt: React.FC = () => {
  const navigate = useNavigate();
  const [targetPolygon, setTargetPolygon] = useState<Polygon>(POLYGONS[0]);
  const [options, setOptions] = useState<Polygon[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'won'>('playing');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string, selectedId?: string } | null>(null);
  const [isKidMode, setIsKidMode] = useState(false);

  useEffect(() => {
    const kidData = localStorage.getItem('kid_session');
    setIsKidMode(!!kidData);
    generateRound();
  }, []);

  const generateRound = () => {
    const randomTarget = POLYGONS[Math.floor(Math.random() * POLYGONS.length)];
    setTargetPolygon(randomTarget);

    // Generate 3 random incorrect options
    const otherOptions = POLYGONS
      .filter(p => p.name !== randomTarget.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allOptions = [...otherOptions, randomTarget];
    setOptions(allOptions.sort(() => Math.random() - 0.5));
    setFeedback(null);
  };

  const handleGuess = (polygon: Polygon) => {
    if (gameState === 'won' || (feedback && feedback.type === 'success')) return;

    if (polygon.name === targetPolygon.name) {
      const newScore = score + 1;
      setScore(newScore);
      setStreak(streak + 1);
      setFeedback({ type: 'success', message: 'Great job! You found it!', selectedId: polygon.name });

      if (newScore >= 10) {
        setGameState('won');
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
        });
      } else {
        setTimeout(generateRound, 1500);
      }
    } else {
      setStreak(0);
      setFeedback({ type: 'error', message: `That's a ${polygon.name}. Try again!`, selectedId: polygon.name });
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const resetGame = () => {
    setScore(0);
    setStreak(0);
    setGameState('playing');
    generateRound();
  };

  const handleBack = () => {
    if (isKidMode) {
      const kidSession = localStorage.getItem('kid_session');
      if (kidSession) {
        const { kidId } = JSON.parse(kidSession);
        navigate(`/kids-dashboard/${kidId}`);
      } else {
        navigate('/games');
      }
    } else {
      navigate('/games');
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            onClick={handleBack}
          >
            <ArrowLeft size={20} />
            Back
          </Button>
          <div className="flex items-center gap-4">
            <div className="bg-white px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-200 flex items-center gap-2">
              <Trophy className="text-yellow-500" size={20} />
              <span className="font-black text-slate-700">{score}/10</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-200 flex items-center gap-2">
              <Star className="text-orange-500" size={20} />
              <span className="font-black text-slate-700">Streak: {streak}</span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {gameState === 'playing' ? (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h1 className="text-4xl font-black text-slate-900 mb-2">Polygon Hunt</h1>
                <p className="text-2xl text-blue-600 font-black">Find the <span className="underline decoration-4 underline-offset-4">{targetPolygon.name}</span>!</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {options.map((polygon) => (
                  <motion.div
                    key={polygon.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Card 
                      className={`p-8 flex items-center justify-center cursor-pointer transition-all duration-200 border-4 ${
                        feedback?.selectedId === polygon.name
                          ? feedback.type === 'success'
                            ? 'border-green-500 bg-green-50'
                            : 'border-red-500 bg-red-50'
                          : 'border-transparent bg-white hover:shadow-xl ring-1 ring-slate-200'
                      }`}
                      onClick={() => handleGuess(polygon)}
                    >
                      <svg
                        viewBox="0 0 100 100"
                        className="w-full h-full drop-shadow-md"
                      >
                        <polygon
                          points={polygon.points}
                          fill={polygon.color}
                          stroke="white"
                          strokeWidth="2"
                        />
                      </svg>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`text-center p-4 rounded-xl font-bold text-lg ${
                      feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {feedback.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="won"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8 py-12"
            >
              <div className="flex justify-center">
                <div className="bg-yellow-100 p-8 rounded-full">
                  <Trophy size={120} className="text-yellow-500" />
                </div>
              </div>
              <div>
                <h2 className="text-5xl font-black text-slate-900 mb-4">Polygon Master!</h2>
                <p className="text-xl text-slate-600 font-medium">
                  You found all the shapes! You're an expert at polygons.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-6 text-xl rounded-2xl"
                  onClick={resetGame}
                >
                  <RefreshCcw className="mr-2" />
                  Play Again
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="font-black px-8 py-6 text-xl rounded-2xl border-2"
                  onClick={handleBack}
                >
                  Back to Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 p-6 bg-blue-50 rounded-2xl border-2 border-blue-100">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <HelpCircle className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="font-black text-blue-900">How to play</h3>
              <p className="text-blue-700 text-sm mt-1">
                Look at the name of the shape at the top, then click on the matching shape below. Try to get 10 in a row!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};

export default PolygonHunt;
