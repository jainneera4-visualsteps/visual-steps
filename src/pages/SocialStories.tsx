import { apiFetch } from '../utils/api';
import { formatAppDate, formatAppDateTime } from '../utils/dateUtils';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Plus, BookOpen, Trash2, ArrowLeft, Eye, Pencil, Printer, Loader2, HelpCircle, Share2, Copy, Link2Off } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { Tooltip } from '../components/ui/Tooltip';
import { SocialStoryModal } from '../components/SocialStoryModal';
import { SampleLearningContent } from '../components/SampleLearningContent';
import { usePageSelection } from '../hooks/usePageSelection';

interface SocialStory {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  kid_id: string | null;
  language?: string;
  tone?: string;
}

export default function SocialStories() {
  const navigate = useNavigate();
  const [stories, setStories] = useState<SocialStory[]>([]);
  const [kids, setKids] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);
  const [viewingStoryId, setViewingStoryId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [storyToShare, setStoryToShare] = useState<SocialStory | null>(null);
  const [shareDays, setShareDays] = useState(7);
  const [shareUrl, setShareUrl] = useState('');
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [hasActiveShare, setHasActiveShare] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  const totalPages = Math.ceil(stories.length / itemsPerPage) || 1;
  const paginatedStories = stories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const selection = usePageSelection(paginatedStories.map(story => story.id));

  const fetchStories = async () => {
    setError(null);
    try {
      const [storiesRes, kidsRes] = await Promise.all([
        apiFetch('/api/social-stories'),
        apiFetch('/api/kids')
      ]);

      if (storiesRes.ok && kidsRes.ok) {
        const storiesData = await storiesRes.json();
        const kidsData = await kidsRes.json();
        
        const kidsMap: Record<string, any> = {};
        const kidsArray = Array.isArray(kidsData) ? kidsData : (kidsData.kids || []);
        kidsArray.forEach((k: any) => {
          kidsMap[k.id] = k;
        });
        
        const rawStories = storiesData.stories || [];
        const processedStories = rawStories.map((story: any) => {
          try {
            const parsed = typeof story.content === 'string' ? JSON.parse(story.content) : story.content;
            return {
              ...story,
              language: parsed?.language || 'English',
              tone: parsed?.tone || 'Calming'
            };
          } catch (e) {
            return { ...story, language: 'English', tone: 'Calming' };
          }
        });

        const sortedStories = processedStories.sort((a: any, b: any) => 
          new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
        );
        setKids(kidsMap);
        setStories(sortedStories);
      } else {
        setError('Failed to fetch data');
      }
    } catch (err: any) {
      console.error('Failed to fetch stories', err);
      setError(err.message || 'Failed to fetch stories');
    } finally {
      setIsLoading(false);
    }
  };

  const openShareDialog = async (story: SocialStory) => {
    setStoryToShare(story);
    setShareUrl('');
    setShareExpiresAt(null);
    setShareCopied(false);
    setHasActiveShare(false);
    try {
      const response = await apiFetch(`/api/social-stories/${encodeURIComponent(story.id)}/share`);
      if (response.ok) {
        const data = await response.json();
        setHasActiveShare(Boolean(data.active));
        setShareExpiresAt(data.expiresAt || null);
      }
    } catch (error) {
      console.error('Failed to load sharing status', error);
    }
  };

  const createShareLink = async () => {
    if (!storyToShare) return;
    setIsSharing(true);
    try {
      const response = await apiFetch(`/api/social-stories/${encodeURIComponent(storyToShare.id)}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays: shareDays }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create sharing link');
      setShareUrl(data.shareUrl);
      setShareCopied(false);
      setShareExpiresAt(data.expiresAt);
      setHasActiveShare(true);
    } catch (error: any) {
      alert(error.message || 'Could not create sharing link');
    } finally {
      setIsSharing(false);
    }
  };

  const revokeShareLink = async () => {
    if (!storyToShare) return;
    setIsSharing(true);
    try {
      const response = await apiFetch(`/api/social-stories/${encodeURIComponent(storyToShare.id)}/share`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not stop sharing');
      setShareUrl('');
      setShareExpiresAt(null);
      setHasActiveShare(false);
    } catch (error: any) {
      alert(error.message || 'Could not stop sharing');
    } finally {
      setIsSharing(false);
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
                
                .pages-column { display: flex; flex-direction: column; gap: 20px; }
                .story-paragraph { 
                  break-inside: auto; 
                  page-break-inside: auto;
                  padding: 0;
                  margin-bottom: 20px;
                }

                .paragraph-content-wrapper {
                  display: flex;
                  gap: 25px;
                  align-items: flex-start;
                  break-inside: auto;
                  page-break-inside: auto;
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
                  break-inside: avoid;
                }
                .paragraph-image img { width: 100%; height: 100%; object-fit: cover; }
                
                .paragraph-text-container { 
                  flex: 1; 
                  display: block;
                  break-inside: auto;
                }
                .paragraph-text { 
                  font-size: 20px; 
                  line-height: 1.5;
                  color: #1e293b;
                  margin: 0; 
                  white-space: pre-wrap;
                  font-weight: 700;
                  text-align: justify;
                  hyphens: none;
                  word-break: normal;
                  overflow-wrap: normal;
                  break-inside: auto;
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

  const deleteSelectedStories = async () => {
    const ids = Array.from(selection.selectedSet);
    if (ids.length === 0 || !window.confirm(`Delete ${ids.length} selected ${ids.length === 1 ? 'story' : 'stories'}?`)) return;
    const results = await Promise.all(ids.map(async id => {
      try {
        const response = await apiFetch(`/api/social-stories/${encodeURIComponent(id)}`, { method: 'DELETE' });
        return { id, ok: response.ok };
      } catch {
        return { id, ok: false };
      }
    }));
    const deletedIds = results.filter(result => result.ok).map(result => result.id);
    setStories(current => current.filter(story => !deletedIds.includes(story.id)));
    selection.removeSelected(deletedIds);
    const failed = results.length - deletedIds.length;
    if (failed > 0) setError(`${failed} selected ${failed === 1 ? 'story could' : 'stories could'} not be deleted.`);
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

      <SampleLearningContent show="story" compact />

      {error ? (
        <Card className="border-none ring-1 ring-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-red-100 p-4 mb-4">
              <ArrowLeft className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-red-900">Error Fetching Stories</h3>
            <p className="mt-2 text-sm text-red-700 max-w-sm">
              {error}
            </p>
            <Button onClick={fetchStories} className="mt-6 bg-red-600 hover:bg-red-700">
              Try Again
            </Button>
          </CardContent>
        </Card>
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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <span className="text-sm font-semibold text-slate-600">{selection.selectedSet.size} selected</span>
            <Button variant="danger" size="xs" disabled={selection.selectedSet.size === 0} onClick={deleteSelectedStories}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete selected
            </Button>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={itemsPerPage} onPageChange={setCurrentPage} onPageSizeChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }} />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all social stories on this page"
                        checked={selection.allPageSelected}
                        ref={element => { if (element) element.indeterminate = selection.somePageSelected; }}
                        onChange={event => selection.togglePage(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Kid Name</span>
                        <Tooltip content="The child assigned to this story." variant="help">
                          <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Story title</span>
                        <Tooltip content="The main heading of the social story." variant="help">
                          <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Language</span>
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Tone</span>
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Updated At</span>
                        <Tooltip content="The date this story was last updated." variant="help">
                          <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5 text-right">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Actions</span>
                        <Tooltip content="Manage your social stories." variant="help">
                          <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                        </Tooltip>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStories.map((story) => {
                    const kid = kids[story.kid_id || ''];
                    return (
                      <tr key={story.id} className="group hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${story.title}`}
                            checked={selection.selectedSet.has(story.id)}
                            onChange={event => selection.toggleOne(story.id, event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                        </td>
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
                            <span className="font-bold text-slate-900 text-[14px] leading-tight">{story.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-medium text-slate-600">{story.language || 'English'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-medium text-slate-600">{story.tone || 'Calming'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[14px] font-medium text-slate-600">
                            {(() => {
                              const d = new Date(story.updated_at || story.created_at);
                              return isNaN(d.getTime()) 
                                ? (story.updated_at || story.created_at) 
                                : formatAppDate(d);
                            })()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              className="text-slate-400 hover:text-blue-500 transition-colors"
                              title="Share securely"
                              onClick={() => openShareDialog(story)}
                            >
                              <Share2 className="h-5 w-5" />
                            </button>
                            <button 
                              className="text-slate-400 hover:text-blue-500 transition-colors" 
                              title="View"
                              onClick={() => setViewingStoryId(story.id)}
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button 
                              className="text-slate-400 hover:text-blue-500 transition-colors" 
                              title="Print"
                              onClick={() => handlePrint(story.id)}
                              disabled={isPrinting}
                            >
                              {isPrinting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
                            </button>
                            <Link to={`/social-stories/edit/${story.id}`}>
                              <button className="text-slate-400 hover:text-blue-500 transition-colors" title="Edit">
                                <Pencil className="h-5 w-5" />
                              </button>
                            </Link>
                            <button 
                              onClick={() => setStoryToDelete(story.id)}
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

      {/* Story Delete Confirmation Modal */}
      {storyToShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5 text-blue-600" /> Share Story</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Create a private link for <strong>{storyToShare.title}</strong>. Anyone with the link can view this story until it expires or you revoke it.
              </p>
              {hasActiveShare && !shareUrl && (
                <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  An active link exists{shareExpiresAt ? ` until ${formatAppDateTime(shareExpiresAt)}` : ''}. Create a new link to replace it, or stop sharing.
                </div>
              )}
              <label className="block text-sm font-bold text-slate-700">
                Link expires after
                <select value={shareDays} onChange={event => setShareDays(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                </select>
              </label>
              {shareUrl && (
                <div className="space-y-2">
                  <div className="break-all rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{shareUrl}</div>
                  {/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(shareUrl) && (
                    <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                      This preview link works only on this computer. To open it on a phone or another device, create the link from the live Visual Steps website.
                    </p>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      await navigator.clipboard.writeText(shareUrl);
                      setShareCopied(true);
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" /> {shareCopied ? 'Link Copied' : 'Copy Link'}
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {hasActiveShare && (
                  <Button variant="outline" onClick={revokeShareLink} disabled={isSharing} className="text-red-600">
                    <Link2Off className="mr-2 h-4 w-4" /> Stop Sharing
                  </Button>
                )}
                <Button variant="outline" onClick={() => setStoryToShare(null)}>Close</Button>
                <Button onClick={createShareLink} disabled={isSharing}>
                  {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                  {hasActiveShare ? 'Replace Link' : 'Create Link'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
