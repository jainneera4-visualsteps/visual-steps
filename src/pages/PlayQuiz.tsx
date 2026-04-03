import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import { ArrowLeft, CheckCircle2, XCircle, Trophy, Star, RefreshCcw, Volume2, Square } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizContent {
  title: string;
  description: string;
  questionScore?: number;
  questions: {
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
  }[];
}

export default function PlayQuiz() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  useEffect(() => {
    if (quiz) {
      document.title = `Play ${quiz.title} | Visual Steps`;
    } else {
      document.title = 'Play Quiz | Visual Steps';
    }
  }, [quiz]);

  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const getFriendlyVoice = () => {
    if (voices.length === 0) return null;
    
    const preferredVoices = [
      'Google US English',
      'Google UK English Female',
      'Samantha',
      'Victoria',
      'Karen',
      'Tessa'
    ];
    
    for (const voiceName of preferredVoices) {
      const voice = voices.find(v => v.name === voiceName);
      if (voice) return voice;
    }
    
    const femaleEnglish = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'));
    if (femaleEnglish) return femaleEnglish;
    
    const anyEnglish = voices.find(v => v.lang.startsWith('en'));
    if (anyEnglish) return anyEnglish;
    
    return voices[0];
  };

  const handleListenQuestion = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (!quiz) return;

    const questionText = quiz.questions[currentQuestionIndex].question;
    const optionsText = quiz.questions[currentQuestionIndex].options.join('. ');
    const textToRead = `${questionText}. ${optionsText}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    const voice = getFriendlyVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.pitch = 1.2;
    utterance.rate = 0.9;
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  const fetchQuiz = async () => {
    try {
      const res = await apiFetch(`/api/quizzes/${id}`);
      if (res.ok) {
        const data = await res.json();
        const content = typeof data.quiz.content === 'string' ? JSON.parse(data.quiz.content) : data.quiz.content;
        setQuiz(content);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Failed to fetch quiz', err);
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAnswer = (index: number) => {
    if (isAnswerChecked) return;
    setSelectedAnswer(index);
  };

  const handleCheckAnswer = () => {
    if (selectedAnswer === null || !quiz) return;
    
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    
    setIsAnswerChecked(true);
    
    const isCorrect = selectedAnswer === quiz.questions[currentQuestionIndex].correctAnswerIndex;
    if (isCorrect) {
      setScore(score + 1);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#3B82F6', '#F59E0B']
      });
    }
  };

  const handleNextQuestion = () => {
    if (!quiz) return;
    
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswerChecked(false);
    } else {
      setIsFinished(true);
      if (score + (selectedAnswer === quiz.questions[currentQuestionIndex].correctAnswerIndex ? 1 : 0) === quiz.questions.length) {
        confetti({
          particleCount: 300,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#F59E0B', '#EF4444', '#3B82F6', '#10B981']
        });
      }
    }
  };

  const handleRestart = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerChecked(false);
    setScore(0);
    setIsFinished(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-semibold text-slate-900">Quiz not found</h3>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-6">
          Go Back
        </Button>
      </div>
    );
  }

  if (isFinished) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    const questionScore = quiz.questionScore || 1;
    const totalScore = score * questionScore;
    const maxScore = quiz.questions.length * questionScore;
    let message = "Good try!";
    if (percentage === 100) message = "Perfect Score!";
    else if (percentage >= 80) message = "Great Job!";
    else if (percentage >= 60) message = "Well Done!";

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-none ring-1 ring-slate-200 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 text-center text-white">
            <Trophy className="w-20 h-20 mx-auto mb-4 text-yellow-300 drop-shadow-md" />
            <h1 className="text-3xl font-black uppercase tracking-tight mb-2">{message}</h1>
            <p className="text-blue-100 font-medium">You completed: {quiz.title}</p>
          </div>
          <CardContent className="p-8 text-center space-y-8">
            <div className="flex justify-center items-end gap-2">
              <span className="text-6xl font-black text-slate-800">{totalScore}</span>
              <span className="text-2xl font-bold text-slate-400 mb-1">/ {maxScore}</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2">
              {[...Array(quiz.questions.length)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-8 h-8 ${i < score ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'}`} 
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button variant="outline" onClick={() => navigate(-1)} className="w-full font-bold">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={handleRestart} className="w-full font-bold bg-blue-600 hover:bg-blue-700">
                <RefreshCcw className="w-4 h-4 mr-2" />
                Play Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div className="text-center flex-1 px-4">
            <h1 className="text-lg font-bold text-slate-800 truncate">{quiz.title}</h1>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </p>
          </div>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
        <div className="max-w-3xl mx-auto mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-8 flex flex-col">
        <Card className="flex-1 border-none ring-1 ring-slate-200 shadow-lg overflow-hidden flex flex-col relative">
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={handleListenQuestion} 
              className={`inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 h-10 w-10 border ${isPlaying ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'} cursor-pointer shadow-sm`}
              title="Listen to question"
            >
              {isPlaying ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
          </div>
          <div className="p-6 md:p-10 bg-white flex-1 flex flex-col justify-center min-h-[200px] pt-14">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 text-center leading-tight">
              {currentQuestion.question}
            </h2>
          </div>
          
          <div className="p-4 md:p-8 bg-slate-50 border-t border-slate-100 space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === currentQuestion.correctAnswerIndex;
              
              let buttonClass = "w-full p-4 md:p-5 text-left rounded-xl border-2 transition-all duration-200 font-medium text-lg flex items-center justify-between group ";
              
              if (!isAnswerChecked) {
                buttonClass += isSelected 
                  ? "border-blue-500 bg-blue-50 text-blue-800 shadow-sm ring-2 ring-blue-500/20" 
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50";
              } else {
                if (isCorrect) {
                  buttonClass += "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm";
                } else if (isSelected && !isCorrect) {
                  buttonClass += "border-red-500 bg-red-50 text-red-800 shadow-sm";
                } else {
                  buttonClass += "border-slate-200 bg-white text-slate-400 opacity-60";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
                  disabled={isAnswerChecked}
                  className={buttonClass}
                >
                  <span className="flex-1 pr-4">{option}</span>
                  {isAnswerChecked && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />}
                  {isAnswerChecked && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />}
                  {!isAnswerChecked && (
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300 group-hover:border-blue-300'}`} />
                  )}
                </button>
              );
            })}
          </div>

          {isAnswerChecked && (
            <div className={`p-6 border-t ${selectedAnswer === currentQuestion.correctAnswerIndex ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-start gap-3">
                {selectedAnswer === currentQuestion.correctAnswerIndex ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <h4 className={`font-bold ${selectedAnswer === currentQuestion.correctAnswerIndex ? 'text-emerald-800' : 'text-red-800'}`}>
                    {selectedAnswer === currentQuestion.correctAnswerIndex ? 'Correct!' : 'Not quite!'}
                  </h4>
                  <p className={`text-sm mt-1 ${selectedAnswer === currentQuestion.correctAnswerIndex ? 'text-emerald-700' : 'text-red-700'}`}>
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="mt-6 flex justify-end">
          {!isAnswerChecked ? (
            <Button 
              size="lg" 
              onClick={handleCheckAnswer} 
              disabled={selectedAnswer === null}
              className="w-full md:w-auto px-12 font-bold text-lg h-14"
            >
              Check Answer
            </Button>
          ) : (
            <Button 
              size="lg" 
              onClick={handleNextQuestion}
              className="w-full md:w-auto px-12 font-bold text-lg h-14 bg-slate-800 hover:bg-slate-900"
            >
              {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
