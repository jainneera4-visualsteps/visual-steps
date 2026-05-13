import { apiFetch } from '../utils/api';
import { generateContent, modelNames } from '../lib/gemini';
import { isAuthError } from '../utils/auth';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { ArrowLeft, Sparkles, Loader2, Gamepad2, Save, CheckCircle2, HelpCircle } from 'lucide-react';
import { Tooltip } from '../components/ui/Tooltip';

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

export default function QuizGenerator() {
  const navigate = useNavigate();
  const location = useLocation();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [gradeLevel, setGradeLevel] = useState('Grade 1');
  const [subject, setSubject] = useState('General Knowledge');
  const [questionType, setQuestionType] = useState('Multiple Choice');
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionScore, setQuestionScore] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quiz, setQuiz] = useState<QuizContent | null>(null);
  const [kids, setKids] = useState<{ id: string; name: string }[]>([]);
  const [selectedKidId, setSelectedKidId] = useState<string>('');
  const [kidProfile, setKidProfile] = useState<any>(null);

  useEffect(() => {
    const fetchKids = async () => {
      try {
        const res = await apiFetch('/api/kids');
        if (res.ok) {
          const data = await res.json();
          const kidList = data.kids || [];
          setKids(kidList);
        }
      } catch (err) {
        console.error('Failed to fetch kids:', err);
      }
    };
    fetchKids();
  }, []);

  useEffect(() => {
    if (selectedKidId) {
      const fetchKidProfile = async () => {
        try {
          const res = await apiFetch(`/api/kids/${encodeURIComponent(selectedKidId)}`);
          if (res.ok) {
            const data = await res.json();
            setKidProfile(data.kid);
          }
        } catch (err) {
          console.error('Failed to fetch kid profile:', err);
        }
      };
      fetchKidProfile();
    } else {
      setKidProfile(null);
    }
  }, [selectedKidId]);

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
        return await generateContent({
          model: modelNames.flash,
          prompt: `Generate an interactive ${questionType} quiz at a ${gradeLevel} reading/comprehension level on the topic: "${topic}". 
        Subject: ${subject}.
        Difficulty Level: ${difficulty}.
        ${kidProfile ? `
        Kid Profile for Context:
        - Name: ${kidProfile.name}
        - Grade Level: ${kidProfile.grade_level || 'N/A'} (Align with Common Core Standards for this level)
        - Interests: ${kidProfile.interests || 'N/A'}
        - Strengths: ${kidProfile.strengths || 'N/A'}
        - Weaknesses: ${kidProfile.weaknesses || 'N/A'}
        ` : ''}
        
        CRITICAL CRITERIA:
        - STRICT QUESTION TYPE: ALL ${numQuestions} questions MUST be of the type: ${questionType}. DO NOT mix different question types.
        - Standards Alignment: ALL content MUST be strictly aligned with Common Core Standards for the specified grade level (${kidProfile?.grade_level || gradeLevel}).
        - Grade Level Consistency: Ensure vocabulary, syntax, and conceptual complexity are perfectly calibrated for ${kidProfile?.grade_level || gradeLevel}.
        - Personalized Context: Infuse the questions with the kid's interests (${kidProfile?.interests || 'N/A'}) to make learning more relatable.
        - Strategic Explanations: Tailor the 'explanation' field to reinforce their weaknesses and build on their strengths.
        - Content Balance: The quiz should be primarily text-based. Focus on deep learning through well-crafted questions.
        - Question Types Requirements:
          - Multiple Choice: Provide 3-5 options. At least one question MUST have multiple correct answers (indices in correctAnswerIndices).
          - True/False: Provide exactly 2 options: ["True", "False"]. The question must be a statement that can be true or false. One index in correctAnswerIndices.
          - Fill in the Blanks: Provide a sentence with a blank represented by "____". The options array MUST contain exactly ONE element which is the correct word or phrase to fill the blank. The question MUST contain the "____" placeholder. One index in correctAnswerIndices (always [0]).
        - No Choices for Fill in the Blanks: Ensure that for 'Fill in the Blanks', no options are displayed to the user during the quiz (handled by the PlayQuiz component).
        
        The quiz should be educational, fun, and engaging.
        Include exactly ${numQuestions} questions.`,
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
                      description: "For Multiple Choice: 3-5 options. For True/False: ['True', 'False']. For Fill in the Blanks: 1 option (the correct answer)."
                    },
                    correctAnswerIndices: { 
                      type: "ARRAY", 
                      items: { type: "INTEGER" }, 
                      description: "The indices of the correct options (0-based). For Multiple Choice, can have one or more indices. For True/False/Fill in the Blanks, will have exactly one index." 
                    },
                    explanation: { type: "STRING", description: "A brief explanation of why the answer is correct" }
                  },
                  required: ["question", "options", "correctAnswerIndices", "explanation"]
                }
              }
            },
            required: ["title", "description", "questions"]
          }
        });
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from AI model');
      }

      let cleanedJson = responseText.trim();
      if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }

      const data = JSON.parse(cleanedJson);
      data.questionScore = questionScore;
      data.questionType = questionType;
      setQuiz(data);

    } catch (error: any) {
      console.error('Failed to generate quiz:', error);
      if (isAuthError(error)) return; // Auth utility handles this
      
      const errorMessage = error.message || "Unknown error";
      if (errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE") || errorMessage.includes("high demand")) {
        alert("The AI service is currently experiencing high demand. Please wait a moment and try again.");
      } else if (errorMessage.includes("500") || errorMessage.includes("Rpc failed")) {
        alert("The AI service is currently busy or experiencing a temporary issue. Please wait a moment and try again.");
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
          kidId: selectedKidId,
          title: quiz.title,
          topic,
          subject,
          difficulty,
          gradeLevel,
          noOfQuestions: numQuestions,
          questionType,
          questionScore,
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

  return (
    <div className="space-y-4 w-full">
      <div className="mb-6">
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">Quiz Generator</h1>
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
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Kid</label>
                <Tooltip content="Choose which child this quiz is for to personalize the content." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedKidId}
                onChange={(e) => setSelectedKidId(e.target.value)}
              >
                <option value="">All Kids</option>
                {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                <Tooltip content="Select the academic subject for the quiz." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 lg:col-span-2 text-left">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Describe a topic / Explain the problem</label>
                <Tooltip content="Describe the specific topic or problem you want the quiz to cover (e.g., 'Addition within 20' or 'Planets')." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <Input 
                placeholder="e.g., Animals, Space, Math..." 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">No. of questions</label>
                <Tooltip content="Choose how many questions the quiz should have (max 50)." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <Input 
                type="number"
                min={1}
                max={50}
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Question Type</label>
                <Tooltip content="Pick the format for the questions (e.g., Multiple Choice)." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
              >
                {questionTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Difficulty</label>
                <Tooltip content="Select how challenging the questions should be for your child." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Score / Question</label>
                <Tooltip content="Set how many points each correct answer is worth toward their progress." variant="help">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
              <Input 
                type="number"
                min={1}
                max={100}
                value={questionScore}
                onChange={(e) => setQuestionScore(Number(e.target.value))}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
              size="sm"
              className="px-6 h-9 font-bold" 
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
          </div>
        </CardContent>
      </Card>

      {quiz && quiz.questions && (
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
              Save Quiz
            </Button>
          </div>

          <Card className="border-none ring-1 ring-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {quiz.title}
                    {kidProfile?.grade_level && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                        {kidProfile.grade_level}
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-slate-500 mt-1">{quiz.description}</p>
                </div>
                <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                  {quiz.questions.length} Qs • {quiz.questionScore} pts/Q
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              {quiz.questions.map((q, idx) => (
                <div key={idx} className="space-y-4 border-b border-slate-100 last:border-0 pb-8 last:pb-0">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image Container */}
                    {q.imageUrl && (
                      <div className="lg:w-1/3 flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 shadow-inner">
                        <img 
                          src={q.imageUrl} 
                          alt="Question illustration"
                          className="w-full h-auto object-cover aspect-video"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 space-y-4">
                      <h3 className="font-bold text-slate-800 text-lg">
                        {idx + 1}. {q.question}
                      </h3>
                      <div className="grid gap-2">
                        {quiz.questionType === 'Fill in the Blanks' ? (
                          <div className="p-3 rounded-lg border border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm flex items-center gap-3">
                            <div className="h-5 w-5 rounded-full border border-emerald-500 bg-emerald-500 flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="font-bold">Correct Answer: {(q.options || [])[0]}</span>
                          </div>
                        ) : (
                          (q.options || []).map((opt, optIdx) => {
                            const isCorrect = (q.correctAnswerIndices || []).includes(optIdx);
                            return (
                              <div 
                                key={optIdx} 
                                className={`p-3 rounded-lg border flex items-center gap-3 transition-colors ${isCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700'}`}
                              >
                                <div className={`h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-slate-50'}`}>
                                  {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                </div>
                                <span className={isCorrect ? 'font-bold' : ''}>{opt}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600">
                        <span className="font-bold text-slate-700">Explanation:</span> {q.explanation}
                      </div>
                    </div>
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
