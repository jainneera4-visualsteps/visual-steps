import { apiFetch } from '../utils/api';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { ArrowLeft, FileText, Trash2, Sparkles, Eye, Edit2, HelpCircle, Loader2 } from 'lucide-react';
import { Tooltip } from '../components/ui/Tooltip';
import { Pagination } from '../components/Pagination';

interface Worksheet {
  id: string;
  title: string;
  topic: string;
  subject: string;
  target_age: string;
  grade_level?: string;
  worksheet_type: string;
  created_at: string;
  updated_at?: string;
  kid_id?: string;
}

export default function SavedWorksheets() {
  const navigate = useNavigate();
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [kids, setKids] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [worksheetToDelete, setWorksheetToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  const totalPages = Math.ceil(worksheets.length / itemsPerPage) || 1;
  const paginatedWorksheets = worksheets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [worksheetsRes, kidsRes] = await Promise.all([
        apiFetch('/api/worksheets'),
        apiFetch('/api/kids')
      ]);

      if (worksheetsRes.ok && kidsRes.ok) {
        const worksheetsData = await worksheetsRes.json();
        const kidsData = await kidsRes.json();
        
        const kidsMap: Record<string, any> = {};
        const kidsArray = Array.isArray(kidsData) ? kidsData : (kidsData.kids || []);
        kidsArray.forEach((k: any) => {
          kidsMap[k.id] = k;
        });
        
        setKids(kidsMap);
        setWorksheets(worksheetsData.worksheets || []);
      } else {
        throw new Error('Failed to fetch data');
      }
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
    <div className="space-y-6 w-full pb-10">
      <div className="mb-6">
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">Saved Worksheets</h1>
            <p className="text-lg font-normal text-slate-500 mt-3">Review and print your educational creations.</p>
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
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      ) : worksheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200">
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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={itemsPerPage} onPageChange={setCurrentPage} onPageSizeChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }} />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Kid Name</span>
                      <Tooltip content="The child assigned to this worksheet." variant="help">
                        <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                      </Tooltip>
                    </div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Worksheet Title</span>
                      <Tooltip content="The title of your saved worksheet." variant="help">
                        <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                      </Tooltip>
                    </div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Subject</span>
                      <Tooltip content="The academic subject area of the worksheet." variant="help">
                        <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                      </Tooltip>
                    </div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Topic</span>
                      <Tooltip content="The specific sub-topic covered." variant="help">
                        <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                      </Tooltip>
                    </div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Type</span>
                      <Tooltip content="The format of the worksheet (e.g., Word Search, Matching)." variant="help">
                        <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                      </Tooltip>
                    </div>
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5 text-right">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Actions</span>
                      <Tooltip content="View, edit, or delete the worksheet." variant="help">
                        <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                      </Tooltip>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedWorksheets.map((worksheet) => (
                  <tr key={worksheet.id} className="group hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {worksheet.kid_id && kids[worksheet.kid_id] ? (
                          <>
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 overflow-hidden ring-1 ring-white">
                              {kids[worksheet.kid_id].avatar_url || kids[worksheet.kid_id].avatar ? (
                                <img src={kids[worksheet.kid_id].avatar_url || kids[worksheet.kid_id].avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[10px] font-bold">
                                  {kids[worksheet.kid_id].name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <span className="text-[13px] font-bold text-slate-700">{kids[worksheet.kid_id].name}</span>
                          </>
                        ) : (
                          <span className="text-[12px] text-slate-400 italic">Not assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 text-[14px] leading-tight">{worksheet.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-bold text-blue-600 uppercase tracking-wider">{worksheet.subject}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <span className="text-[12px] font-medium truncate max-w-[150px] inline-block">{worksheet.topic}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-medium text-slate-600 capitalize">{worksheet.worksheet_type?.replace('-', ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link to={`/worksheet-generator?id=${worksheet.id}`}>
                          <button className="text-slate-400 hover:text-blue-500 transition-colors" title="View">
                            <Eye className="h-5 w-5" />
                          </button>
                        </Link>
                        <Link to={`/worksheet-generator?id=${worksheet.id}&edit=true`}>
                          <button className="text-slate-400 hover:text-amber-500 transition-colors" title="Edit">
                            <Edit2 className="h-5 w-5" />
                          </button>
                        </Link>
                        <button 
                          onClick={(e) => handleDelete(worksheet.id, e)}
                          className="text-slate-400 hover:text-red-500 transition-colors" 
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                <Button variant="danger" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold">
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
