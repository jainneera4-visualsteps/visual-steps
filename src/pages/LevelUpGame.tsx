import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { apiFetch, safeJson } from '../utils/api';
import { generateContent, modelNames } from '../lib/gemini';
import { 
  Gamepad2, 
  Trophy, 
  ArrowLeft, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GRADES = [
  'Pre-K',
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade',
  '10th Grade',
  '11th Grade',
  '12th Grade'
];

const SUBJECTS = [
  'Math',
  'Science',
  'English',
  'History',
  'Geography',
  'General Knowledge'
];

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export default function LevelUpGame() {
  const navigate = useNavigate();
  const [kids, setKids] = useState<any[]>([]);
  const [selectedKidId, setSelectedKidId] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [gameState, setGameState] = useState<'setup' | 'loading' | 'playing' | 'result' | 'success'>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [isLevelingUp, setIsLevelingUp] = useState(false);

  useEffect(() => {
    const fetchKids = async () => {
      // Check for kid session first
      const kidSession = localStorage.getItem('kid_session');
      const kidInfo = kidSession ? JSON.parse(kidSession) : null;

      const res = await apiFetch('/api/kids');
      if (res.ok) {
        const data = await safeJson(res);
        const fetchedKids = data.kids || [];
        setKids(fetchedKids);
        
        if (kidInfo && kidInfo.kidId) {
          setSelectedKidId(kidInfo.kidId);
          const kid = fetchedKids.find((k: any) => k.id === kidInfo.kidId);
          if (kid) {
            setSelectedGrade(kid.grade_level || GRADES[0]);
          }
        } else if (fetchedKids.length > 0) {
          setSelectedKidId(fetchedKids[0].id);
          setSelectedGrade(fetchedKids[0].grade_level || GRADES[0]);
        }
      }
    };
    fetchKids();
  }, []);

  const isKidMode = !!localStorage.getItem('kid_session');

  const handleKidChange = (kidId: string) => {
    setSelectedKidId(kidId);
    const kid = kids.find(k => k.id === kidId);
    if (kid) {
      setSelectedGrade(kid.grade_level || GRADES[0]);
    }
  };

  const generateQuestions = async () => {
    setGameState('loading');
    try {
      const response = await generateContent({
        model: modelNames.flash,
        prompt: `Generate 10 multiple-choice questions for a ${selectedGrade} student in the subject of ${selectedSubject}. 
      Return the response as a JSON array of objects, each with 'question', 'options' (array of 4 strings), 'correctAnswer' (one of the options), and 'explanation'.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              question: { type: "STRING" },
              options: { 
                type: "ARRAY", 
                items: { type: "STRING" }
              },
              correctAnswer: { type: "STRING" },
              explanation: { type: "STRING" }
            },
            required: ['question', 'options', 'correctAnswer', 'explanation']
          }
        }
      });
      
      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from AI model');
      }

      const data = JSON.parse(responseText);
      setQuestions(data);
      setGameState('playing');
      setCurrentQuestionIndex(0);
      setScore(0);
    } catch (error) {
      console.error('Error generating questions:', error);
      setGameState('setup');
      alert('Failed to generate questions. Please try again.');
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(answer);
    const correct = answer === questions[currentQuestionIndex].correctAnswer;
    setIsAnswerCorrect(correct);
    if (correct) setScore(prev => prev + 1);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
    } else {
      setGameState('result');
    }
  };

  const handleLevelUp = async () => {
    setIsLevelingUp(true);
    const currentIndex = GRADES.indexOf(selectedGrade);
    const nextGrade = GRADES[currentIndex + 1] || selectedGrade;

    if (nextGrade !== selectedGrade) {
      try {
        const res = await apiFetch(`/api/kids/${selectedKidId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grade_level: nextGrade })
        });
        if (res.ok) {
          setGameState('success');
        }
      } catch (error) {
        console.error('Error leveling up:', error);
      }
    }
    setIsLevelingUp(false);
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

  if (gameState === 'success') {
    const nextGrade = GRADES[GRADES.indexOf(selectedGrade) + 1];
    return (
      <div className="w-full py-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-12 shadow-2xl ring-1 ring-slate-200 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-purple-500 to-blue-500" />
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Trophy className="h-12 w-12" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4">CONGRATULATIONS!</h2>
          <p className="text-xl text-slate-600 mb-8 font-medium">
            {kids.find(k => k.id === selectedKidId)?.name} has officially leveled up to <span className="text-green-600 font-black">{nextGrade}</span>!
          </p>
          <div className="space-y-4">
            <Button 
              className="w-full h-16 text-xl font-black bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={() => setGameState('setup')}
            >
              Play Another Quest
            </Button>
            <Button 
              variant="ghost" 
              className="w-full font-bold text-slate-400 hover:text-yellow-600 hover:bg-yellow-50"
              onClick={goBack}
            >
              Back to {isKidMode ? 'Dashboard' : 'Games'}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'setup') {
    return (
      <div className="w-full py-8">
        <Button variant="ghost" onClick={goBack} className="mb-6 text-slate-500 hover:text-yellow-600 hover:bg-yellow-50">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to {isKidMode ? 'Dashboard' : 'Games'}
        </Button>

        <Card className="border-none ring-1 ring-slate-200 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-purple-500 to-blue-500" />
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-8 text-white text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-black">Brain Quest Challenge</h1>
            <p className="text-yellow-50 font-medium">Test your knowledge and level up your grade!</p>
          </div>
          
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              {!isKidMode && (
                <div>
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 block">Select Child</label>
                  <select 
                    className="w-full rounded-lg border-slate-200 text-slate-900 font-bold focus:ring-yellow-500"
                    value={selectedKidId}
                    onChange={(e) => handleKidChange(e.target.value)}
                  >
                    {kids.map(k => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 block">Current Grade</label>
                  {isKidMode ? (
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-bold text-slate-900 flex items-center justify-between">
                      <span>{selectedGrade}</span>
                      <GraduationCap className="h-4 w-4 text-yellow-500" />
                    </div>
                  ) : (
                    <select 
                      className="w-full rounded-lg border-slate-200 text-slate-900 font-bold focus:ring-yellow-500"
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                    >
                      {GRADES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 block">Subject</label>
                  <select 
                    className="w-full rounded-lg border-slate-200 text-slate-900 font-bold focus:ring-yellow-500"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    <option value="">Select Subject</option>
                    {SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-14 text-lg font-black bg-yellow-500 hover:bg-yellow-600 shadow-lg shadow-yellow-100 text-white"
              disabled={!selectedSubject}
              onClick={generateQuestions}
            >
              Start Brain Quest <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center px-4">
        <div className="relative mb-8">
          <div className="h-24 w-24 animate-spin rounded-full border-4 border-yellow-100 border-t-yellow-500"></div>
          <Sparkles className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-yellow-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Generating Your Brain Quest...</h2>
        <p className="text-slate-500 font-medium">Gemini is crafting 10 special questions for you!</p>
      </div>
    );
  }

  if (gameState === 'playing') {
    const q = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="w-full py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-black text-yellow-600 uppercase tracking-widest">Question {currentQuestionIndex + 1} of 10</span>
            <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Score: {score}</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-yellow-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Card className="border-none ring-1 ring-slate-200 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-purple-500 to-blue-500" />
              <CardContent className="p-8">
                <h2 className="text-2xl font-black text-slate-900 mb-8 leading-tight">{q.question}</h2>
                
                <div className="grid gap-4">
                  {q.options.map((opt, idx) => {
                    let style = "border-slate-200 hover:border-yellow-500 hover:bg-yellow-50";
                    if (selectedAnswer === opt) {
                      style = opt === q.correctAnswer 
                        ? "border-green-500 bg-green-50 ring-2 ring-green-500" 
                        : "border-red-500 bg-red-50 ring-2 ring-red-500";
                    } else if (selectedAnswer !== null && opt === q.correctAnswer) {
                      style = "border-green-500 bg-green-50";
                    }

                    return (
                      <button
                        key={idx}
                        disabled={selectedAnswer !== null}
                        onClick={() => handleAnswerSelect(opt)}
                        className={`w-full p-4 rounded-xl border-2 text-left font-bold transition-all duration-200 flex items-center justify-between ${style}`}
                      >
                        <span>{opt}</span>
                        {selectedAnswer === opt && (
                          opt === q.correctAnswer ? <CheckCircle2 className="text-green-600" /> : <XCircle className="text-red-600" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedAnswer && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-8 p-6 rounded-xl ${isAnswerCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
                  >
                    <p className="font-black mb-2 flex items-center gap-2">
                      {isAnswerCorrect ? <Sparkles size={18} /> : null}
                      {isAnswerCorrect ? 'Great Job!' : 'Not quite...'}
                    </p>
                    <p className="font-medium">{q.explanation}</p>
                    <Button 
                      className="mt-6 w-full bg-yellow-500 text-white border-none shadow-sm hover:bg-yellow-600 font-black"
                      onClick={nextQuestion}
                    >
                      {currentQuestionIndex === questions.length - 1 ? 'See Results' : 'Next Question'}
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (gameState === 'result') {
    const passed = score >= 8; // 80% to pass
    const currentIndex = GRADES.indexOf(selectedGrade);
    const nextGrade = GRADES[currentIndex + 1];

    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <Card className="border-none ring-1 ring-slate-200 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-purple-500 to-blue-500" />
          <div className={`p-12 ${passed ? 'bg-green-600' : 'bg-slate-900'} text-white`}>
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              {passed ? <Trophy size={48} /> : <Gamepad2 size={48} />}
            </div>
            <h1 className="text-4xl font-black mb-2">{passed ? 'CHALLENGE PASSED!' : 'KEEP TRYING!'}</h1>
            <p className="text-xl opacity-90 font-bold">You got {score} out of 10 correct!</p>
          </div>

          <CardContent className="p-12 space-y-8">
            {passed ? (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Current</p>
                    <p className="text-xl font-black text-slate-900">{selectedGrade}</p>
                  </div>
                  <ChevronRight className="text-slate-300 h-8 w-8" />
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Next Level</p>
                    <p className="text-xl font-black text-green-600">{nextGrade || 'Master'}</p>
                  </div>
                </div>
                
                <p className="text-slate-600 font-medium text-lg">
                  Amazing work! You've proven your skills in {selectedSubject}. Ready to level up?
                </p>

                <Button 
                  className="w-full h-16 text-xl font-black bg-green-600 hover:bg-green-700 shadow-xl shadow-green-100 text-white"
                  onClick={handleLevelUp}
                  disabled={isLevelingUp}
                >
                  {isLevelingUp ? <Loader2 className="animate-spin" /> : 'LEVEL UP NOW!'}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-slate-600 font-medium text-lg">
                  You need at least 8 correct answers to level up. Don't give up, you can do it!
                </p>
                <Button 
                  className="w-full h-16 text-xl font-black bg-yellow-500 hover:bg-yellow-600 text-white"
                  onClick={() => setGameState('setup')}
                >
                  Try Again
                </Button>
              </div>
            )}
            
            <Button 
              variant="ghost" 
              className="w-full font-bold text-slate-400 hover:text-yellow-600 hover:bg-yellow-50"
              onClick={() => navigate('/games')}
            >
              Back to Games
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
