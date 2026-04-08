import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { ArrowLeft, Sparkles, Loader2, Gamepad2, Save, CheckCircle2 } from 'lucide-react';

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

export default function QuizGenerator() {
  const navigate = useNavigate();
  const location = useLocation();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [targetAge, setTargetAge] = useState('5-7 years');
  const [gradeLevel, setGradeLevel] = useState('Grade 1');
  const [subject, setSubject] = useState('General Knowledge');
  const [questionType, setQuestionType] = useState('Multiple Choice');
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionScore, setQuestionScore] = useState(1);
  const [kidId, setKidId] = useState('');
  const [kids, setKids] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quiz, setQuiz] = useState<QuizContent | null>(null);

  useEffect(() => {
    fetchKids();
  }, []);

  const fetchKids = async () => {
    try {
      const res = await apiFetch('/api/kids');
      if (res.ok) {
        const data = await res.json();
        setKids(data.kids);
        if (data.kids.length > 0) {
          setKidId(data.kids[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch kids', err);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    setQuiz(null);

    const withRetry = async <T,>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
      try {
        return await fn();
      } catch (error: any) {
        const errString = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error));
        if (errString.toLowerCase().includes('quota') || errString.toLowerCase().includes('billing')) {
          throw new Error('You have exceeded your AI service quota. Please try again later or check your API key billing details.');
        }
        if (retries > 0) {
          console.warn(`Retrying after error: ${errString}. Retries left: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return withRetry(fn, retries - 1, delay * 1.5);
        }
        throw error;
      }
    };

    try {
      const response = await withRetry(async () => {
        const res = await apiFetch('/api/generate', {
          method: 'POST',
          body: JSON.stringify({
            model: "gemini-3-flash-preview",
            contents: `Generate an interactive ${questionType} quiz for a person aged ${targetAge} at a ${gradeLevel} reading/comprehension level on the topic: "${topic}". 
        Subject: ${subject}.
        Difficulty Level: ${difficulty}.
        
        CRITICAL CRITERIA:
        - Target Age: ${targetAge} (Ensure tone and context are appropriate for this age).
        - Grade Level: ${gradeLevel} (Ensure vocabulary, concepts, and reading complexity are perfectly aligned with this grade level).
        
        The quiz should be educational, fun, and engaging.
        Include exactly ${numQuestions} questions.`,
            config: {
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING", description: "The title of the quiz" },
                  description: { type: "STRING", description: "A short description of the quiz" },
                  questions: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        question: { type: "STRING", description: "The question text" },
                        options: { 
                          type: "ARRAY", 
                          items: { type: "STRING" },
                          description: "2 to 4 options depending on the question type"
                        },
                        correctAnswerIndex: { type: "INTEGER", description: "The index of the correct option (0-based)" },
                        explanation: { type: "STRING", description: "A brief explanation of why the answer is correct" }
                      },
                      required: ["question", "options", "correctAnswerIndex", "explanation"]
                    }
                  }
                },
                required: ["title", "description", "questions"]
              }
            }
          })
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to generate content');
        }
        return await res.json();
      });

      let responseText = response.text;
      
      if (!responseText) {
        throw new Error('Empty response from AI model');
      }

      let cleanedJson = responseText.trim();
      if (cleanedJson.startsWith('\`\`\`')) {
        cleanedJson = cleanedJson.replace(/^\`\`\`(?:json)?\n?/, '').replace(/\n?\`\`\`$/, '').trim();
      }

      const data = JSON.parse(cleanedJson);
      data.questionScore = questionScore;
      setQuiz(data);

    } catch (error: any) {
      console.error('Failed to generate quiz:', error);
      const errorMessage = error.message || "Unknown error";
      if (errorMessage.includes("500") || errorMessage.includes("Rpc failed")) {
        alert("The AI service is currently busy or experiencing a temporary issue. We tried retrying, but it failed. Please wait a moment and try again.");
      } else {
        alert(`Failed to generate quiz: ${errorMessage}. Please try again.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!quiz) return;
    setIsSaving(true);
    
    try {
      const res = await apiFetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kidId: kidId || null,
          title: quiz.title,
          topic,
          difficulty,
          targetAge,
          gradeLevel,
          content: quiz
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Server error saving quiz:', errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to save quiz');
      }
      
      alert('Quiz saved successfully!');
      navigate('/saved-quizzes');
    } catch (err: any) {
      console.error('Save error:', err);
      alert(`Failed to save quiz: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const difficulties = ['Very Easy', 'Easy', 'Medium', 'Hard'];
  const targetAges = ['Under 5 years', '5-7 years', '8-10 years', '11-13 years', '14-17 years', '18+ years'];
  const gradeLevels = ['Pre-K', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'High School', 'Adult Basic Education'];
  const subjects = ['General Knowledge', 'Math', 'Science', 'Reading', 'History', 'Geography', 'Art', 'Music'];
  const questionTypes = ['Multiple Choice', 'True/False', 'Fill in the Blanks'];
  const numQuestionsOptions = [3, 5, 7, 10, 15, 20];
  const scoreOptions = [1, 2, 5, 10];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">Quiz & Game Generator</h1>
            <p className="text-lg font-normal text-slate-500 mt-3">Create interactive learning games</p>
          </div>
          <Link to="/saved-quizzes">
            <Button variant="outline" size="xs" className="h-7 text-[12px]">
              <Gamepad2 className="mr-1 h-3 w-3" />
              Saved Quizzes
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-none ring-1 ring-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Topic</label>
              <Input 
                placeholder="e.g., Animals, Space, Math..." 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Target Age</label>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={targetAge}
                onChange={(e) => setTargetAge(e.target.value)}
              >
                {targetAges.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Grade Level</label>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
              >
                {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject</label>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Question Type</label>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
              >
                {questionTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Difficulty</label>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Questions</label>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
              >
                {numQuestionsOptions.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Score / Q</label>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={questionScore}
                onChange={(e) => setQuestionScore(Number(e.target.value))}
              >
                {scoreOptions.map(s => <option key={s} value={s}>{s} pts</option>)}
              </select>
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assign To (Optional)</label>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={kidId}
                onChange={(e) => setKidId(e.target.value)}
              >
                <option value="">None (Save to library)</option>
                {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
          </div>
          <Button 
            className="w-full h-10 font-bold" 
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Quiz...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Quiz
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {quiz && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 text-[12px]"
            >
              {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save & Assign Quiz
            </Button>
          </div>

          <Card className="border-none ring-1 ring-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800">{quiz.title}</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">{quiz.description}</p>
                </div>
                <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                  {quiz.questions.length} Qs • {quiz.questionScore} pts/Q
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              {quiz.questions.map((q, idx) => (
                <div key={idx} className="space-y-3">
                  <h3 className="font-bold text-slate-800">
                    {idx + 1}. {q.question}
                  </h3>
                  <div className="grid gap-2 pl-4">
                    {q.options.map((opt, optIdx) => (
                      <div 
                        key={optIdx} 
                        className={`p-3 rounded-lg border ${optIdx === q.correctAnswerIndex ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700'}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${optIdx === q.correctAnswerIndex ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                            {optIdx === q.correctAnswerIndex && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                          <span className={optIdx === q.correctAnswerIndex ? 'font-bold' : ''}>{opt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pl-4 text-sm text-slate-500 italic">
                    Explanation: {q.explanation}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {!quiz && !isGenerating && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
          <div className="bg-slate-50 p-6 rounded-full mb-4">
            <Gamepad2 className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-bold text-slate-600">No Quiz Generated Yet</h3>
          <p className="max-w-xs text-sm">Enter a topic above and click generate to create an interactive quiz.</p>
        </div>
      )}
    </div>
  );
}
