import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import { Input } from '../components/Input';
import { ArrowLeft, CheckCircle2, XCircle, Trophy, Star, RefreshCcw, Volume2, Square } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizContent {
  title: string;
  description: string;
  questionType?: string;
  questionScore?: number;
  questions: {
    question: string;
    options: string[];
    correctAnswerIndices: number[];
    explanation: string;
    imageUrl?: string;
  }[];
}

export default function PlayQuiz() {
  const { id, kidId } = useParams<{ id: string, kidId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [userResponses, setUserResponses] = useState<(number[] | string)[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFeedbackPlaying, setIsFeedbackPlaying] = useState(false);
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

    if (!quiz || !quiz.questions || !quiz.questions[currentQuestionIndex]) return;

    const currentQ = quiz.questions[currentQuestionIndex];
    const questionText = currentQ.question.replace(/_+/g, 'blank');
    
    let textToRead = questionText;
    if (quiz.questionType !== 'Fill in the Blanks') {
      const optionsText = (currentQ.options || []).join('. ');
      textToRead = `${questionText}. ${optionsText}`;
    }

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

  const handleListenFeedback = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    if (isFeedbackPlaying) {
      window.speechSynthesis.cancel();
      setIsFeedbackPlaying(false);
      return;
    }

    if (!quiz || !quiz.questions || !quiz.questions[currentQuestionIndex]) return;

    const currentQ = quiz.questions[currentQuestionIndex];
    const feedbackText = currentQ.explanation;

    const utterance = new SpeechSynthesisUtterance(feedbackText);
    const voice = getFriendlyVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.pitch = 1.2;
    utterance.rate = 0.9;
    
    utterance.onstart = () => setIsFeedbackPlaying(true);
    utterance.onend = () => setIsFeedbackPlaying(false);
    utterance.onerror = () => setIsFeedbackPlaying(false);

    window.speechSynthesis.cancel(); // Stop any other speech
    setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  const fetchQuiz = async () => {
    try {
      const res = await apiFetch(`/api/quizzes/${id}`);
      if (res.ok) {
        const data = await res.json();
        console.log('PlayQuiz: fetched quiz data:', data);
        if (!data.quiz) {
          console.error('PlayQuiz: data.quiz is undefined!');
          navigate('/dashboard');
          return;
        }
        const content = typeof data.quiz.content === 'string' ? JSON.parse(data.quiz.content) : data.quiz.content;
        console.log('PlayQuiz: parsed content:', content);
        if (!content || !content.questions) {
          console.error('PlayQuiz: content or content.questions is undefined!');
          navigate('/dashboard');
          return;
        }
        setQuiz(content);
        setUserResponses(new Array(content.questions.length).fill([]));
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
    if (isAnswerChecked || !quiz || !quiz.questions || !quiz.questions[currentQuestionIndex]) return;
    
    const currentQuestion = quiz.questions[currentQuestionIndex];
    if (!currentQuestion || !currentQuestion.correctAnswerIndices) return;

    const isMultiSelect = currentQuestion.correctAnswerIndices.length > 1;
    
    let newSelected: number[];
    if (isMultiSelect) {
      if (selectedAnswers.includes(index)) {
        newSelected = selectedAnswers.filter(i => i !== index);
      } else {
        newSelected = [...selectedAnswers, index];
      }
    } else {
      newSelected = [index];
    }
    
    setSelectedAnswers(newSelected);
    const newResponses = [...userResponses];
    newResponses[currentQuestionIndex] = newSelected;
    setUserResponses(newResponses);
  };

  const handleTypedAnswerChange = (val: string) => {
    if (isAnswerChecked) return;
    setTypedAnswer(val);
    const newResponses = [...userResponses];
    newResponses[currentQuestionIndex] = val;
    setUserResponses(newResponses);
  };

  const handleCheckAnswer = () => {
    if (!quiz || !quiz.questions || !quiz.questions[currentQuestionIndex]) return;
    
    const currentQuestion = quiz.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    // Validate that an answer is provided
    if (quiz.questionType === 'Fill in the Blanks') {
      if (!typedAnswer.trim()) return;
    } else {
      if (selectedAnswers.length === 0) return;
    }
    
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsFeedbackPlaying(false);
    
    setIsAnswerChecked(true);
    
    let isCorrect = false;
    if (quiz.questionType === 'Fill in the Blanks') {
      const options = currentQuestion.options || [];
      const correctText = options[0] ? options[0].toLowerCase().trim() : '';
      const userText = typedAnswer.toLowerCase().trim();
      isCorrect = userText === correctText;
    } else {
      const correctIndices = currentQuestion.correctAnswerIndices || [];
      if (selectedAnswers.length === correctIndices.length) {
        isCorrect = selectedAnswers.every(idx => correctIndices.includes(idx)) && 
                    correctIndices.every(idx => selectedAnswers.includes(idx));
      }
    }

    if (isCorrect) {
      setScore(prev => prev + 1);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#3B82F6', '#F59E0B']
      });
    }
  };

  const saveResult = async (finalScore: number) => {
    console.log('PlayQuiz: saveResult called, kidId:', kidId, 'score:', finalScore);
    if (!kidId) {
      console.log('PlayQuiz: saveResult skipped, no kidId');
      return;
    }
    try {
      const res = await apiFetch('/api/quiz-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: id,
          kidId: kidId,
          responses: userResponses,
          score: finalScore,
          totalQuestions: quiz!.questions.length,
          questions: quiz!.questions
        })
      });
      console.log('PlayQuiz: saveResult response status:', res.status);
    } catch (err) {
      console.error('Failed to save quiz result', err);
    }
  };

  const handleNextQuestion = () => {
    if (!quiz || !quiz.questions || isFinished) return;
    
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsFeedbackPlaying(false);
    
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswers([]);
      setTypedAnswer('');
      setIsAnswerChecked(false);
    } else {
      setIsFinished(true);
      setScore(prevScore => {
        saveResult(prevScore);
        return prevScore;
      });
      if (score === quiz.questions.length) {
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
    setIsFeedbackPlaying(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setTypedAnswer('');
    setIsAnswerChecked(false);
    setScore(0);
    setUserResponses(new Array(quiz?.questions.length || 0).fill([]));
    setIsFinished(false);
  };

  if (isLoading) {
    console.log('PlayQuiz: isLoading is true');
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!quiz) {
    console.log('PlayQuiz: quiz is null');
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-semibold text-slate-900">Quiz not found</h3>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-6">
          Go Back
        </Button>
      </div>
    );
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    console.log('PlayQuiz: quiz has no questions');
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-semibold text-slate-900">Quiz has no questions</h3>
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
            <p className="text-blue-50 font-bold text-xl drop-shadow-sm">You completed: {quiz.title}</p>
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
              <Button variant="outline" onClick={() => navigate(`/kids-dashboard/${kidId}`)} className="w-full font-bold">
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
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 h-[60px] flex items-center shrink-0 z-10 shadow-sm sticky top-0">
        <div className="w-full flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <h1 className="text-lg font-black text-slate-900 truncate mr-4 tracking-tight">{quiz.title}</h1>
              <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                {currentQuestionIndex + 1} / {quiz.questions.length}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          <div className="shrink-0 flex items-center gap-2">
            <button 
              onClick={handleListenQuestion} 
              className={`inline-flex items-center justify-center rounded-full transition-colors h-9 w-9 border ${isPlaying ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'} shadow-sm`}
              title="Listen to question"
            >
              {isPlaying ? <Square className="h-3.5 w-3.5 fill-current" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1">
        <div className="h-full grid grid-cols-1 md:grid-cols-4">
          <div className="md:col-span-3 flex flex-col bg-white border-r border-slate-100">
            <div className="p-4 md:p-8 space-y-6">
              <div className="space-y-0.5">
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">Question</span>
                <h2 className="text-lg md:text-2xl font-bold text-slate-900 leading-tight">
                  {currentQuestion.question}
                </h2>
              </div>
              
              {currentQuestion.imageUrl && (
                <div className="flex items-center justify-center py-1.5 bg-slate-50/50 rounded-xl border border-slate-100">
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Question illustration"
                    className="max-w-full max-h-[35vh] object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Select Your Answer</span>
                
                {quiz.questionType === 'Fill in the Blanks' ? (
                  <div className="max-w-xl">
                    <Input
                      placeholder="Type your answer here..."
                      value={typedAnswer}
                      onChange={(e) => handleTypedAnswerChange(e.target.value)}
                      disabled={isAnswerChecked}
                      className="h-10 text-xl font-bold border-2 rounded-lg focus:border-blue-500 bg-white shadow-sm"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(currentQuestion.correctAnswerIndices || []).length > 1 && !isAnswerChecked && (
                      <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded-full w-fit">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Select all that apply</span>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(currentQuestion.options || []).map((option, idx) => {
                        const isSelected = selectedAnswers.includes(idx);
                        const isCorrect = (currentQuestion.correctAnswerIndices || []).includes(idx);
                        const isMultiSelect = (currentQuestion.correctAnswerIndices || []).length > 1;
                        
                        let buttonClass = "w-full p-2.5 text-left rounded-lg border-2 transition-all duration-200 font-bold text-[16px] flex items-center justify-between group shadow-sm min-h-[50px] ";
                        
                        if (!isAnswerChecked) {
                          buttonClass += isSelected 
                            ? "border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-500/5" 
                            : "border-slate-100 bg-white text-slate-600 hover:border-blue-200 hover:bg-slate-50";
                        } else {
                          if (isCorrect) {
                            buttonClass += "border-emerald-500 bg-emerald-50 text-emerald-900";
                          } else if (isSelected && !isCorrect) {
                            buttonClass += "border-red-500 bg-red-50 text-red-900";
                          } else {
                            buttonClass += "border-slate-50 bg-white text-slate-300 opacity-40";
                          }
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectAnswer(idx)}
                            disabled={isAnswerChecked}
                            className={buttonClass}
                          >
                            <span className="flex-1 pr-2 leading-tight font-extrabold text-lg line-clamp-2">{option}</span>
                            {!isAnswerChecked ? (
                              <div className={`shrink-0 w-4 h-4 border-2 transition-colors ${isMultiSelect ? 'rounded' : 'rounded-full'} ${isSelected ? 'border-blue-500 bg-blue-500 flex items-center justify-center shadow-md' : 'border-slate-200 group-hover:border-blue-300'}`}>
                                {isSelected && isMultiSelect && <CheckCircle2 className="h-3 w-3 text-white" />}
                              </div>
                            ) : (
                              <>
                                {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                {isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500" />}
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Actions & Feedback (25% / 1 part) */}
          <div className="md:col-span-1 border-t md:border-t-0 bg-slate-50 flex flex-col">
            <div className="p-4 md:p-6 flex flex-col bg-slate-50/50">
              {/* Primary Action at Top */}
              <div className="pb-3">
                {!isAnswerChecked ? (
                  <Button 
                    size="lg" 
                    onClick={handleCheckAnswer} 
                    disabled={quiz.questionType === 'Fill in the Blanks' ? !typedAnswer.trim() : selectedAnswers.length === 0}
                    className="w-full h-12 font-black uppercase tracking-[0.15em] text-base bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 rounded-xl active:scale-[0.98] transition-all"
                  >
                    Check Answer
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    onClick={handleNextQuestion}
                    className="w-full h-12 font-black uppercase tracking-[0.15em] text-base bg-slate-900 hover:bg-black shadow-lg shadow-slate-900/20 rounded-xl active:scale-[0.98] transition-all"
                  >
                    {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'View Results'}
                  </Button>
                )}
              </div>

              <div className="space-y-4 transition-all duration-300">
                <div className="space-y-1">
                  <span className="text-[13px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-[13px] font-bold text-slate-500">
                      <span>Completed</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="pt-1.5 flex items-center justify-between border-t border-slate-50 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Score</span>
                        <span className="text-3xl font-black text-slate-800 leading-none">{score}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Question</span>
                        <span className="text-xl font-bold text-slate-600 leading-none">{currentQuestionIndex + 1}/{(quiz.questions || []).length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {isAnswerChecked && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-black text-slate-400 uppercase tracking-widest">Feedback</span>
                      <button 
                        onClick={handleListenFeedback}
                        className={`p-1.5 rounded-full transition-colors ${isFeedbackPlaying ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-200'}`}
                        title="Listen to feedback"
                      >
                        {isFeedbackPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className={`p-3 rounded-xl border-2 shadow-sm ${
                      (quiz.questionType === 'Fill in the Blanks' 
                        ? typedAnswer.toLowerCase().trim() === ((currentQuestion.options || [])[0] || '').toLowerCase().trim()
                        : (selectedAnswers.length === (currentQuestion.correctAnswerIndices || []).length && selectedAnswers.every(idx => (currentQuestion.correctAnswerIndices || []).includes(idx))))
                        ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          (quiz.questionType === 'Fill in the Blanks' 
                            ? typedAnswer.toLowerCase().trim() === ((currentQuestion.options || [])[0] || '').toLowerCase().trim()
                            : (selectedAnswers.length === (currentQuestion.correctAnswerIndices || []).length && selectedAnswers.every(idx => (currentQuestion.correctAnswerIndices || []).includes(idx))))
                            ? 'bg-emerald-500 text-white shadow-sm' : 'bg-red-500 text-white shadow-sm'
                        }`}>
                          {(quiz.questionType === 'Fill in the Blanks' 
                            ? typedAnswer.toLowerCase().trim() === ((currentQuestion.options || [])[0] || '').toLowerCase().trim()
                            : (selectedAnswers.length === (currentQuestion.correctAnswerIndices || []).length && selectedAnswers.every(idx => (currentQuestion.correctAnswerIndices || []).includes(idx)))) 
                            ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <h4 className={`text-lg font-black uppercase tracking-tight ${
                          (quiz.questionType === 'Fill in the Blanks' 
                            ? typedAnswer.toLowerCase().trim() === ((currentQuestion.options || [])[0] || '').toLowerCase().trim()
                            : (selectedAnswers.length === (currentQuestion.correctAnswerIndices || []).length && selectedAnswers.every(idx => (currentQuestion.correctAnswerIndices || []).includes(idx))))
                            ? 'text-emerald-700' : 'text-red-700'
                        }`}>
                          {(quiz.questionType === 'Fill in the Blanks' 
                            ? typedAnswer.toLowerCase().trim() === ((currentQuestion.options || [])[0] || '').toLowerCase().trim()
                            : (selectedAnswers.length === (currentQuestion.correctAnswerIndices || []).length && selectedAnswers.every(idx => (currentQuestion.correctAnswerIndices || []).includes(idx)))) ? 'Awesome!' : 'Try Again!'}
                        </h4>
                      </div>
                      <p className="text-slate-700 text-[15px] font-extrabold leading-relaxed">{currentQuestion.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
