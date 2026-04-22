import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Plus, BookOpen, Trash2, ChevronRight, MessageSquare, ArrowLeft, Eye, Pencil, X, Printer, Loader2, Lightbulb } from 'lucide-react';
import { SocialStoryModal } from '../components/SocialStoryModal';

interface SocialStory {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function SocialStories() {
  const navigate = useNavigate();
  const [stories, setStories] = useState<SocialStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);
  const [viewingStoryId, setViewingStoryId] = useState<string | null>(null);
  const [printingStory, setPrintingStory] = useState<any | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await apiFetch('/api/social-stories');
      if (res.ok) {
        const data = await res.json();
        setStories(data.stories || []);
      }
    } catch (error) {
      console.error('Failed to fetch stories', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = async (storyId: string) => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      const res = await apiFetch(`/api/social-stories/${storyId}`);
      if (res.ok) {
        const data = await res.json();
        const story = data.story;
        let storyContent;
        try {
          const parsed = typeof story.content === 'string' ? JSON.parse(story.content) : story.content;
          if (Array.isArray(parsed)) {
            storyContent = { pages: parsed };
          } else if (parsed && typeof parsed === 'object') {
            storyContent = parsed;
          } else {
            storyContent = { pages: [] };
          }
        } catch (e) {
          console.error('Failed to parse story content', e);
          storyContent = { pages: [] };
        }
        
        // Use New Window Strategy for robust printing
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          alert('Please allow popups to print this story.');
          setIsPrinting(false);
          return;
        }

        const pages = storyContent.pages || [];
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(style => style.outerHTML)
          .join('\n');

        const pagesHtml = pages.map((page: any, index: number) => `
          <div class="story-paragraph">
            <div class="paragraph-content-wrapper">
              ${page.imageUrl ? `
                <div class="paragraph-image">
                  <img src="${page.imageUrl}" alt="Page ${index + 1}" referrerpolicy="no-referrer" />
                </div>
              ` : ''}
              <div class="paragraph-text-container">
                <p class="paragraph-text font-bold">${page.text}</p>
              </div>
            </div>
          </div>
        `).join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print Social Story - ${story.title}</title>
              ${styles}
              <style>
                @page { size: auto; margin: 0.75in; }
                @media print {
                  html, body { 
                    margin: 0; padding: 0 !important; 
                    background: white !important; 
                    height: auto !important; 
                    overflow: visible !important;
                  }
                  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
                body { 
                  font-family: inherit; 
                  padding: 0; 
                  background: white;
                  color: black;
                }
                .print-header { 
                  display: flex; 
                  align-items: center; 
                  justify-content: space-between; 
                  border-bottom: 2px solid black; 
                  padding-bottom: 15px; 
                  margin-bottom: 30px; 
                }
                .logo-container { display: flex; align-items: center; gap: 10px; }
                .logo-icon { width: 32px; height: 32px; background: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; }
                .logo-text {
                  font-size: 20px;
                  font-weight: bold;
                  color: #1e3a8a !important;
                  text-transform: uppercase;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .story-title {
                  font-size: 24px;
                  font-weight: 900;
                  text-transform: uppercase;
                  text-align: right;
                  flex: 1;
                  margin-left: 20px;
                  color: black !important;
                }
                
                .pages-column { display: flex; flex-direction: column; gap: 30px; }
                .story-paragraph { 
                  break-inside: avoid; 
                  padding: 0;
                }

                .paragraph-content-wrapper {
                  display: flex;
                  gap: 25px;
                  align-items: flex-start;
                }
                
                .paragraph-image { 
                  width: 180px; 
                  flex-shrink: 0;
                  aspect-ratio: 1; 
                  border: 1px solid #e2e8f0; 
                  background: #f8fafc; 
                  border-radius: 12px; 
                  overflow: hidden; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                }
                .paragraph-image img { width: 100%; height: 100%; object-fit: cover; }
                
                .paragraph-text-container { 
                  flex: 1; 
                  display: flex;
                }
                .paragraph-text { 
                  font-size: 20px; 
                  line-height: 1.5;
                  color: #1e293b;
                  margin: 0; 
                  white-space: pre-wrap;
                  font-weight: 700;
                  text-align: justify;
                }
                
                @media (max-width: 600px) {
                  .paragraph-content-wrapper { flex-direction: column; }
                  .paragraph-image { width: 100%; max-width: 250px; margin: 0 auto 15px; }
                }
              </style>
            </head>
            <body>
              <div class="print-header">
                <div class="logo-container">
                  <div class="logo-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                  </div>
                  <span class="logo-text">Visual Steps</span>
                </div>
                <h1 class="story-title">${story.title}</h1>
              </div>
              <div class="pages-column">
                ${pagesHtml}
              </div>
              <script>
                window.onload = () => {
                  setTimeout(() => {
                    window.print();
                    window.close();
                  }, 800);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        setIsPrinting(false);
      } else {
        setIsPrinting(false);
        alert('Failed to load story for printing. Please try again.');
      }
    } catch (error) {
      console.error('Failed to print story', error);
      setIsPrinting(false);
      alert('An error occurred while preparing the print view.');
    }
  };

  const deleteStory = (id: string) => {
    setStoryToDelete(id);
  };

  const confirmDelete = async () => {
    if (!storyToDelete) return;
    const id = storyToDelete;
    setStoryToDelete(null);
    try {
      const res = await apiFetch(`/api/social-stories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStories(stories.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete story', error);
    }
  };

  if (isLoading) {
    return (
      <div className="relative w-full">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="space-y-3 no-print-area">
        <div className="mb-6">
          <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">Social Stories</h1>
              <p className="text-lg font-normal text-slate-500 mt-3">Create visual stories to help individuals navigate social situations.</p>
            </div>
            <Link to="/social-stories/create">
              <Button variant="outline" size="xs" className="h-7 text-[12px]">
                <Plus className="mr-1 h-3 w-3" />
                New Story
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
              <BookOpen className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-bold text-slate-600">No Social Stories</h3>
            <p className="max-w-xs text-sm">Social stories use simple language and visuals to explain social situations and expectations.</p>
            <Link to="/social-stories/create" className="mt-4">
              <Button size="sm">Create Your First Story</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {stories.map((story) => (
              <Card key={story.id} className="group overflow-hidden border-none ring-1 ring-slate-200 hover:ring-blue-400 transition-all hover:shadow-md bg-white">
                <CardContent className="p-2.5 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900 truncate">
                        {story.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Created {(() => {
                          const d = new Date(story.created_at);
                          return isNaN(d.getTime()) ? story.created_at : d.toLocaleDateString();
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-8 w-8 p-0 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      title="View Story"
                      onClick={() => setViewingStoryId(story.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      title="Print Story"
                      onClick={() => handlePrint(story.id)}
                      disabled={isPrinting}
                    >
                      {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                    </Button>
                    <Link to={`/social-stories/edit/${story.id}`}>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-8 w-8 p-0 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                        title="Edit Story"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-8 w-8 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setStoryToDelete(story.id)}
                      title="Delete Story"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Story Delete Confirmation Modal */}
      {storyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm no-print-area">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete Story
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-6">Are you sure you want to delete this story? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setStoryToDelete(null)}>
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

      {/* Social Story View Modal */}
      {viewingStoryId && (
        <div className="no-print-area">
          <SocialStoryModal 
            storyId={viewingStoryId} 
            onClose={() => setViewingStoryId(null)} 
            onPrint={() => handlePrint(viewingStoryId)}
          />
        </div>
      )}

    </div>
  );
}
