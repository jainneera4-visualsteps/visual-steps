import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Plus, BookOpen, Trash2, ChevronRight, MessageSquare, ArrowLeft, Eye, Sparkles, X } from 'lucide-react';
import { SocialStoryModal } from '../components/SocialStoryModal';

interface SocialStory {
  id: string;
  title: string;
  created_at: string;
}

export default function SocialStories() {
  const navigate = useNavigate();
  const [stories, setStories] = useState<SocialStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);
  const [viewingStoryId, setViewingStoryId] = useState<string | null>(null);

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

  return (
    <div className="space-y-3">
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
                      Created {new Date(story.created_at).toLocaleDateString()}
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
                  <Link to={`/social-stories/edit/${story.id}`}>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-8 w-8 p-0 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                      title="Edit Story"
                    >
                      <Sparkles className="h-4 w-4" />
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
      {/* Story Delete Confirmation Modal */}
      {storyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
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
        <SocialStoryModal 
          storyId={viewingStoryId} 
          onClose={() => setViewingStoryId(null)} 
        />
      )}
    </div>
  );
}
