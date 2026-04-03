import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface QuizContent {
  title: string;
  description: string;
  questionScore?: number;
  questions: QuizQuestion[];
}

export default function EditQuiz() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [targetAge, setTargetAge] = useState('5-7 years');
  const [gradeLevel, setGradeLevel] = useState('Grade 1');
  const [description, setDescription] = useState('');
  const [questionScore, setQuestionScore] = useState(1);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [kidId, setKidId] = useState('');
  const [kids, setKids] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchKids();
    fetchQuiz();
  }, [id]);

  const fetchKids = async () => {
    try {
      const res = await apiFetch('/api/kids');
      if (res.ok) {
        const data = await res.json();
        setKids(data.kids || []);
      }
    } catch (err) {
      console.error('Failed to fetch kids', err);
    }
  };

  const fetchQuiz = async () => {
    try {
      const res = await apiFetch(`/api/quizzes/${id}`);
      if (res.ok) {
        const data = await res.json();
        const quiz = data.quiz;
        setTitle(quiz.title);
        setTopic(quiz.topic || '');
        setDifficulty(quiz.difficulty || 'Medium');
        setTargetAge(quiz.target_age || '5-7 years');
        setGradeLevel(quiz.grade_level || 'Grade 1');
        setKidId(quiz.kid_id || '');

        const content = typeof quiz.content === 'string' ? JSON.parse(quiz.content) : quiz.content;
        setDescription(content.description || '');
        setQuestionScore(content.questionScore || 1);
        setQuestions(content.questions || []);
      } else {
        alert('Failed to fetch quiz data');
        navigate('/saved-quizzes');
      }
    } catch (err) {
      console.error('Failed to fetch quiz', err);
      alert('An error occurred while fetching quiz data');
      navigate('/saved-quizzes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return alert('Please enter a title');
    if (questions.length === 0) return alert('Please add at least one question');
    
    setIsSaving(true);
    try {
      const quizContent: QuizContent = {
        title,
        description,
        questionScore,
        questions
      };

      const res = await apiFetch(`/api/quizzes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kidId: kidId || null,
          title,
          topic,
          difficulty,
          targetAge,
          gradeLevel,
          content: quizContent
        })
      });

      if (res.ok) {
        alert('Quiz updated successfully!');
        navigate('/saved-quizzes');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update quiz');
      }
    } catch (err) {
      console.error('Failed to update quiz', err);
      alert('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      explanation: ''
    }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    const newQuestions = [...questions];
    (newQuestions[index] as any)[field] = value;
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[optIndex] = value;
    setQuestions(newQuestions);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const difficulties = ['Very Easy', 'Easy', 'Medium', 'Hard'];
  const targetAges = ['Under 5 years', '5-7 years', '8-10 years', '11-13 years', '14-17 years', '18+ years'];
  const gradeLevels = ['Pre-K', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'High School', 'Adult Basic Education'];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="mb-6">
        <button onClick={() => navigate('/saved-quizzes')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Saved Quizzes
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">Edit Quiz</h1>
            <p className="text-lg font-normal text-slate-500 mt-3">Modify your interactive quiz</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="font-bold">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Card className="border-none ring-1 ring-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">Quiz Metadata</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quiz Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-sm font-bold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Topic</label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assign To</label>
              <select 
                value={kidId} 
                onChange={(e) => setKidId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
              >
                <option value="">None (Library only)</option>
                {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600">
                {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Target Age</label>
              <select value={targetAge} onChange={(e) => setTargetAge(e.target.value)} className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600">
                {targetAges.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Grade Level</label>
              <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600">
                {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Questions</h2>
          <Button size="sm" onClick={addQuestion} variant="outline" className="font-bold">
            <Plus className="mr-2 h-4 w-4" /> Add Question
          </Button>
        </div>

        {questions.map((q, qIdx) => (
          <Card key={qIdx} className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-bold text-slate-900">Question {qIdx + 1}</CardTitle>
              <Button variant="ghost" size="xs" onClick={() => removeQuestion(qIdx)} className="text-slate-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Question Text</label>
                <Textarea 
                  value={q.question} 
                  onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                  placeholder="Enter the question..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.options.map((opt, optIdx) => (
                  <div key={optIdx} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Option {optIdx + 1}</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correct?</span>
                        <input 
                          type="radio" 
                          name={`correct-${qIdx}`} 
                          checked={q.correctAnswerIndex === optIdx}
                          onChange={() => updateQuestion(qIdx, 'correctAnswerIndex', optIdx)}
                          className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <Input 
                      value={opt} 
                      onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                      placeholder={`Option ${optIdx + 1}`}
                      className={`h-9 text-sm ${q.correctAnswerIndex === optIdx ? 'ring-1 ring-emerald-500 border-emerald-500' : ''}`}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Explanation</label>
                <Input 
                  value={q.explanation} 
                  onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                  placeholder="Explain why the answer is correct..."
                  className="h-9 text-sm italic"
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {questions.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500">No questions yet. Click "Add Question" to start.</p>
          </div>
        )}
      </div>
    </div>
  );
}
