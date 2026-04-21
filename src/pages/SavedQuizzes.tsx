import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { ArrowLeft, Gamepad2, Trash2, Plus, PlayCircle, Pencil } from 'lucide-react';

export default function SavedQuizzes() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setError(null);
    try {
      const res = await apiFetch('/api/quizzes');
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data.quizzes);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to fetch quizzes');
      }
    } catch (err: any) {
      console.error('Failed to fetch quizzes', err);
      setError(err.message || 'Failed to fetch quizzes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setQuizToDelete(id);
  };

  const confirmDelete = async () => {
    if (!quizToDelete) return;
    const id = quizToDelete;
    setQuizToDelete(null);
    
    try {
      const res = await apiFetch(`/api/quizzes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setQuizzes(quizzes.filter(q => q.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete quiz', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-10">
      <div className="mb-6">
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">Saved Quizzes</h1>
            <p className="text-lg font-normal text-slate-500 mt-3">Manage interactive games and assessments</p>
          </div>
          <Link to="/quiz-generator">
            <Button variant="outline" size="xs" className="h-7 text-[12px]">
              <Plus className="mr-1 h-3 w-3" />
              New Quiz
            </Button>
          </Link>
        </div>
      </div>

      {error ? (
        <Card className="border-none ring-1 ring-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-red-100 p-4 mb-4">
              <ArrowLeft className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-red-900">Error Fetching Quizzes</h3>
            <p className="mt-2 text-sm text-red-700 max-w-sm">
              {error}
            </p>
            <Button onClick={fetchQuizzes} className="mt-6 bg-red-600 hover:bg-red-700">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : quizzes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <div className="bg-slate-50 p-6 rounded-full mb-4">
            <Gamepad2 className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-bold text-slate-600">No Saved Quizzes</h3>
          <p className="max-w-xs text-sm">You haven't created any quizzes yet. Generate one to see it here.</p>
          <Link to="/quiz-generator" className="mt-4">
            <Button size="sm">Generate First Quiz</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="group overflow-hidden border-none ring-1 ring-slate-200 hover:ring-blue-400 transition-all hover:shadow-md bg-white">
              <CardContent className="p-2.5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Gamepad2 className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 truncate">
                      {quiz.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-1.5 py-0.5 rounded">
                      {quiz.subject}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {quiz.grade_level ? `• ${quiz.grade_level}` : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">{quiz.topic}</p>
                </div>

                <div className="flex items-center gap-1">
                  <Link to={`/play-quiz/${quiz.id}`}>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-8 w-8 p-0 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      title="Play Quiz"
                    >
                      <PlayCircle className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to={`/edit-quiz/${quiz.id}`}>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-8 w-8 p-0 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                      title="Edit Quiz"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-8 w-8 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setQuizToDelete(quiz.id)}
                    title="Delete Quiz"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Quiz Delete Confirmation Modal */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete Quiz
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-6">Are you sure you want to delete this quiz? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setQuizToDelete(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
