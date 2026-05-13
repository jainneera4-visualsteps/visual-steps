import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { ArrowLeft, Gamepad2, Trash2, Plus, PlayCircle, Pencil, HelpCircle, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Input } from '../components/Input';
import { Tooltip } from '../components/ui/Tooltip';

export default function SavedQuizzes() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [kids, setKids] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const totalPages = Math.ceil(quizzes.length / itemsPerPage) || 1;
  const paginatedQuizzes = quizzes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchQuizzes = async () => {
    setError(null);
    try {
      const [quizzesRes, kidsRes] = await Promise.all([
        apiFetch('/api/quizzes'),
        apiFetch('/api/kids')
      ]);

      if (quizzesRes.ok && kidsRes.ok) {
        const quizzesData = await quizzesRes.json();
        const kidsData = await kidsRes.json();
        
        const kidsMap: Record<string, any> = {};
        const kidsArray = Array.isArray(kidsData) ? kidsData : (kidsData.kids || []);
        kidsArray.forEach((k: any) => {
          kidsMap[k.id] = k;
        });
        
        setKids(kidsMap);
        setQuizzes(quizzesData.quizzes || []);
      } else {
        const quizErr = !quizzesRes.ok ? `Quizzes: ${quizzesRes.status}` : '';
        const kidErr = !kidsRes.ok ? `Kids: ${kidsRes.status}` : '';
        setError(`Failed to fetch data. ${quizErr} ${kidErr}`.trim());
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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">PER PAGE:</span>
              <div className="relative">
                <select 
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer min-w-[70px] shadow-sm transition-all hover:border-slate-300"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <ChevronLeft className="h-3 w-3 rotate-[270deg]" strokeWidth={3} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 hover:bg-slate-50 rounded-md transition-colors text-slate-400 disabled:opacity-20 disabled:cursor-not-allowed group"
                >
                  <ChevronLeft className="h-5 w-5 group-hover:text-slate-600 transition-colors" strokeWidth={2} />
                </button>
                <span className="text-[14px] font-bold text-slate-700 whitespace-nowrap">
                  Page <span className="text-slate-900">{currentPage}</span> of <span className="text-slate-900">{totalPages}</span>
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 hover:bg-slate-50 rounded-md transition-colors text-slate-400 disabled:opacity-20 disabled:cursor-not-allowed group"
                >
                  <ChevronRight className="h-5 w-5 group-hover:text-slate-600 transition-colors" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Kid Name</span>
                        <Tooltip content="The child assigned to this quiz." variant="help">
                          <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Quiz title</span>
                        <Tooltip content="The main heading of the quiz." variant="help">
                          <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Subject</span>
                        <Tooltip content="The general category of the quiz." variant="help">
                          <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Topic</span>
                        <Tooltip content="The specific area of study covered." variant="help">
                          <HelpCircle className="h-4 w-4 text-blue-500 cursor-help" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Difficulty Level</span>
                        <Tooltip content="The intended challenge level." variant="help">
                          <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Score per question</span>
                        <Tooltip content="The points awarded for each correct answer." variant="help">
                          <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5 text-right">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Actions</span>
                        <Tooltip content="Manage your saved quizzes." variant="help">
                          <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                        </Tooltip>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedQuizzes.map((quiz) => {
                    const kid = kids[quiz.kid_id];
                    return (
                      <tr key={quiz.id} className="group hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {kid?.avatar ? (
                              <img src={kid.avatar} className="h-6 w-6 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-600">
                                {kid?.name?.charAt(0) || 'A'}
                              </div>
                            )}
                            <span className="font-bold text-slate-700 text-[13px]">{kid?.name || 'All Kids'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-[14px] leading-tight">{quiz.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[14px] font-medium text-slate-600">
                            {quiz.subject || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[14px] font-medium text-slate-600 line-clamp-1">
                            {quiz.topic || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[14px] font-medium text-slate-600 capitalize">
                            {quiz.difficulty || 'Medium'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[14px] font-bold text-slate-700">
                            {quiz.score_per_question || 1} pts
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <Link to={`/play-quiz/${quiz.id}`}>
                              <button className="text-slate-400 hover:text-blue-500 transition-colors" title="View">
                                <Eye className="h-5 w-5" />
                              </button>
                            </Link>
                            <Link to={`/edit-quiz/${quiz.id}`}>
                              <button className="text-slate-400 hover:text-blue-500 transition-colors" title="Edit">
                                <Pencil className="h-5 w-5" />
                              </button>
                            </Link>
                            <button 
                              onClick={() => setQuizToDelete(quiz.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors" 
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
