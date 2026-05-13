import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle2, Loader2, Image as ImageIcon, Layers } from 'lucide-react';
import { LayeredCanvasEditor } from '../components/LayeredCanvasEditor';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndices: number[];
  explanation: string;
  imageUrl?: string;
}

interface QuizContent {
  title: string;
  description: string;
  questionType?: string;
  questionScore?: number;
  questions: QuizQuestion[];
}

export default function EditQuiz() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [gradeLevel, setGradeLevel] = useState('Grade 1');
  const [description, setDescription] = useState('');
  const [questionScore, setQuestionScore] = useState(1);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionType, setQuestionType] = useState('Multiple Choice');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const fetchQuiz = async () => {
    try {
      const res = await apiFetch(`/api/quizzes/${id}`);
      if (res.ok) {
        const data = await res.json();
        const quiz = data.quiz;
        setTitle(quiz.title);
        setTopic(quiz.topic || '');
        setDifficulty(quiz.difficulty || 'Medium');
        setGradeLevel(quiz.grade_level || 'Grade 1');

        const content = typeof quiz.content === 'string' ? JSON.parse(quiz.content) : quiz.content;
        setDescription(content.description || '');
        setQuestionScore(content.questionScore || 1);
        setQuestionType(content.questionType || 'Multiple Choice');
        setQuestions((content.questions || []).map((q: any) => ({
          ...q,
          correctAnswerIndices: q.correctAnswerIndices || [q.correctAnswerIndex || 0]
        })));
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
        questionType,
        questions
      };

      const res = await apiFetch(`/api/quizzes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          topic,
          difficulty,
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
      correctAnswerIndices: [0],
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

  const handleImageUpload = (index: number, file: File) => {
    if (!file) return;
    
    // Check file size (limit to 2MB for base64 storage)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size is too large. Please select an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      updateQuestion(index, 'imageUrl', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[optIndex] = value;
    setQuestions(newQuestions);
  };

  const addOption = (qIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.push('');
    setQuestions(newQuestions);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].options.length > 2) {
      newQuestions[qIndex].options.splice(optIndex, 1);
      
      // Update indices
      newQuestions[qIndex].correctAnswerIndices = newQuestions[qIndex].correctAnswerIndices
        .filter(i => i !== optIndex)
        .map(i => i > optIndex ? i - 1 : i);
      
      if (newQuestions[qIndex].correctAnswerIndices.length === 0) {
        newQuestions[qIndex].correctAnswerIndices = [0];
      }
      
      setQuestions(newQuestions);
    }
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
    <div className="w-full space-y-6 pb-12">
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
            Save Quiz
          </Button>
        </div>
      </div>

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
                {questionType === 'Fill in the Blanks' ? (
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Correct Answer</label>
                    <Input 
                      value={q.options[0]} 
                      onChange={(e) => updateOption(qIdx, 0, e.target.value)}
                      placeholder="Enter the correct answer..."
                      className="h-10 text-sm ring-1 ring-emerald-500 border-emerald-500"
                    />
                  </div>
                ) : (
                  q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Option {optIdx + 1}</label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correct?</span>
                          <input 
                            type="checkbox" 
                            checked={q.correctAnswerIndices.includes(optIdx)}
                            onChange={() => {
                              const currentIndices = q.correctAnswerIndices;
                              let newIndices: number[];
                              if (currentIndices.includes(optIdx)) {
                                if (currentIndices.length > 1) {
                                  newIndices = currentIndices.filter(i => i !== optIdx);
                                } else {
                                  newIndices = currentIndices; // Keep at least one
                                }
                              } else {
                                newIndices = [...currentIndices, optIdx];
                              }
                              updateQuestion(qIdx, 'correctAnswerIndices', newIndices);
                            }}
                            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 rounded"
                          />
                          <button 
                            onClick={() => removeOption(qIdx, optIdx)}
                            className="text-slate-400 hover:text-red-500"
                            disabled={q.options.length <= 2}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <Input 
                        value={opt} 
                        onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                        placeholder={`Option ${optIdx + 1}`}
                        className={`h-9 text-sm ${q.correctAnswerIndices.includes(optIdx) ? 'ring-1 ring-emerald-500 border-emerald-500' : ''}`}
                      />
                    </div>
                  ))
                )}
              </div>
              
              {questionType !== 'Fill in the Blanks' && (
                <Button 
                  variant="outline" 
                  size="xs" 
                  onClick={() => addOption(qIdx)}
                  className="mt-3 text-[11px]"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Option
                </Button>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Explanation</label>
                <Input 
                  value={q.explanation} 
                  onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                  placeholder="Explain why the answer is correct..."
                  className="h-9 text-sm italic"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-50">
                <div className="flex items-center gap-2 mb-1">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Question Image (Optional)</label>
                </div>
                
                <div className="space-y-3">
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div 
                      className="w-full md:w-48 aspect-video bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-300 transition-colors group relative"
                      onClick={() => document.getElementById(`image-upload-${qIdx}`)?.click()}
                    >
                      {q.imageUrl ? (
                        <>
                          <img src={q.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-white text-[10px] font-bold uppercase tracking-widest">Change Image</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                          <p className="text-[10px] text-slate-400 font-medium">Click to upload</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Image URL</label>
                        <Input 
                          value={q.imageUrl || ''} 
                          onChange={(e) => updateQuestion(qIdx, 'imageUrl', e.target.value)}
                          placeholder="Or paste an image URL here..."
                          className="h-8 text-xs"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input 
                          type="file" 
                          id={`image-upload-${qIdx}`}
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(qIdx, file);
                          }}
                        />
                        <Button 
                          variant="outline" 
                          size="xs" 
                          onClick={() => document.getElementById(`image-upload-${qIdx}`)?.click()}
                          className="text-[10px] h-7"
                        >
                          Upload Local File
                        </Button>
                        {q.imageUrl && (
                          <Button 
                            variant="danger" 
                            size="xs" 
                            onClick={() => updateQuestion(qIdx, 'imageUrl', '')}
                            className="text-[10px] h-7 font-bold shadow-sm"
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Remove Image
                          </Button>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 italic">Recommended: 16:9 aspect ratio. Max 2MB for local files.</p>
                    </div>
                  </div>
                </div>
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
