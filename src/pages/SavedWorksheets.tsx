import { apiFetch } from '../utils/api';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { ArrowLeft, FileText, Trash2, Printer, Calendar, BookOpen, Sparkles, Eye, Edit2 } from 'lucide-react';

interface Worksheet {
  id: string;
  title: string;
  topic: string;
  subject: string;
  target_age: string;
  grade_level?: string;
  worksheet_type: string;
  created_at: string;
}

export default function SavedWorksheets() {
  const navigate = useNavigate();
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [worksheetToDelete, setWorksheetToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchWorksheets();
  }, []);

  const fetchWorksheets = async () => {
    try {
      const res = await apiFetch('/api/worksheets');
      if (!res.ok) throw new Error('Failed to fetch worksheets');
      const data = await res.json();
      setWorksheets(data.worksheets);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWorksheetToDelete(id);
  };

  const confirmDelete = async () => {
    if (!worksheetToDelete) return;
    const id = worksheetToDelete;
    setWorksheetToDelete(null);

    try {
      const res = await apiFetch(`/api/worksheets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete worksheet');
      setWorksheets(worksheets.filter(w => w.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete worksheet');
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">Saved Worksheets</h1>
            <p className="text-lg font-normal text-slate-500 mt-3">Review and print your educational creations</p>
          </div>
          <Link to="/worksheet-generator">
            <Button variant="outline" size="xs" className="h-7 text-[12px]">
              <Sparkles className="mr-1 h-3 w-3" />
              New Worksheet
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : worksheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <div className="bg-slate-50 p-6 rounded-full mb-4">
            <FileText className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-bold text-slate-600">No Saved Worksheets</h3>
          <p className="max-w-xs text-sm">You haven't saved any worksheets yet. Generate one to see it here.</p>
          <Link to="/worksheet-generator" className="mt-4">
            <Button size="sm">Generate First Worksheet</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {worksheets.map((worksheet) => (
            <Card key={worksheet.id} className="group overflow-hidden border-none ring-1 ring-slate-200 hover:ring-blue-400 transition-all hover:shadow-md bg-white">
              <CardContent className="p-2.5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 truncate">
                      {worksheet.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-1.5 py-0.5 rounded">
                      {worksheet.subject}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {worksheet.target_age} {worksheet.grade_level ? `• ${worksheet.grade_level}` : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">{worksheet.topic}</p>
                </div>

                <div className="flex items-center gap-1">
                  <Link to={`/worksheet-generator?id=${worksheet.id}`}>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                      title="View Worksheet"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to={`/worksheet-generator?id=${worksheet.id}&edit=true`}>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50"
                      title="Edit Worksheet Settings"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-8 w-8 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    onClick={(e) => {
                      e.preventDefault();
                      setWorksheetToDelete(worksheet.id);
                    }}
                    title="Delete Worksheet"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Worksheet Delete Confirmation Modal */}
      {worksheetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete Worksheet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-6">Are you sure you want to delete this worksheet? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setWorksheetToDelete(null)}>
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
