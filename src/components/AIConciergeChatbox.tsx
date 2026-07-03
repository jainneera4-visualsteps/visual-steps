import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bot, Send, X, Sparkles, Loader2, Plus, Trophy, Check, ArrowRight } from 'lucide-react';
import { useWalkthrough } from '../context/WalkthroughContext';
import { apiFetch, safeJson } from '../utils/api';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionStatus?: {
    type: 'onboarding' | 'navigation' | 'activity' | 'tokens' | 'quiz';
    label: string;
    loading: boolean;
    success: boolean;
    errorMsg?: string;
  };
}

export function AIConciergeChatbox() {
  const navigate = useNavigate();
  const location = useLocation();
  const { startWalkthrough } = useWalkthrough();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Hi! I am your official Visual Steps AI Concierge. I'm here to provide warm, clear, and compassionate support as you navigate our platform. How can I assist you and your family today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [kids, setKids] = useState<any[]>([]);
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync selected kid ID and fetch kid profiles
  useEffect(() => {
    const fetchKids = async () => {
      try {
        const response = await apiFetch('/api/kids');
        const parsed = await safeJson(response);
        if (parsed && Array.isArray(parsed.kids)) {
          setKids(parsed.kids);
          // Set selected kid from storage or default to first
          const localSelectedId = localStorage.getItem('dashboard_selected_kid_id') || localStorage.getItem('analysis_selected_kid_id');
          if (localSelectedId) {
            setSelectedKidId(localSelectedId);
          } else if (parsed.kids.length > 0) {
            setSelectedKidId(parsed.kids[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching kids inside Concierge:', err);
      }
    };

    fetchKids();

    const handleStorageChange = () => {
      const id = localStorage.getItem('dashboard_selected_kid_id') || localStorage.getItem('analysis_selected_kid_id');
      if (id) setSelectedKidId(id);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [location.pathname]);

  // Scroll to bottom rules
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userPrompt = query.trim();
    setQuery('');
    setLoading(true);

    const userMsg: Message = {
      sender: 'user',
      text: userPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await apiFetch('/api/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: userPrompt })
      });

      const data = await safeJson(response);

      if (data?.functionCall) {
        const actionType = data.functionCall;
        const args = data.args || {};
        const replyText = data.response || `Executing the requested action: ${actionType}...`;

        // Create status action tracking
        let actionLabel = 'Processing...';
        let actionCat: 'onboarding' | 'navigation' | 'activity' | 'tokens' | 'quiz' = 'navigation';

        if (actionType === 'triggerOnboardingTour') {
          actionLabel = 'Starting the Parent Walkthrough Onboarding Tour';
          actionCat = 'onboarding';
        } else if (actionType === 'openPage') {
          const rawPath = args.path || '/';
          let pathLabel = 'Dashboard';
          if (rawPath === '/worksheets') pathLabel = 'Worksheets';
          if (rawPath === '/reports') pathLabel = 'Progress Reports';
          if (rawPath === '/planner') pathLabel = 'Activity Planner';
          if (rawPath === '/tokens') pathLabel = 'Token Economy Center';
          actionLabel = `Navigating to ${pathLabel} page...`;
          actionCat = 'navigation';
        } else if (actionType === 'addActivity') {
          actionLabel = `Scheduling chore/activity: "${args.title || 'Task'}"...`;
          actionCat = 'activity';
        } else if (actionType === 'distributeTokens') {
          actionLabel = `Awarding ${args.tokens || 1} virtual reward token(s)...`;
          actionCat = 'tokens';
        } else if (actionType === 'generate_custom_quiz') {
          actionLabel = `Generating custom quiz on ${args.subject || 'subject'}: "${args.topic || 'topic'}"...`;
          actionCat = 'quiz';
        }

        const systemMsgId = Date.now();
        const assistantMsg: Message = {
          sender: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionStatus: {
            type: actionCat,
            label: actionLabel,
            loading: true,
            success: false
          }
        };

        setMessages(prev => [...prev, assistantMsg]);

        // Process actual actions based on custom API call results
        setTimeout(async () => {
          try {
            if (actionType === 'triggerOnboardingTour') {
              // Ensure we are on Dashboard first where the guide mounts
              if (location.pathname !== '/dashboard') {
                navigate('/dashboard');
              }
              // Wait for navigation and trigger guide
              setTimeout(() => {
                startWalkthrough();
              }, 400);

              updateActionStatus(systemMsgId, true, '');
            } 
            else if (actionType === 'openPage') {
              const rawPath = args.path || '/';
              let actualPath = '/dashboard';
              
              const currentKidId = selectedKidId || (kids.length > 0 ? kids[0].id : null);

              if (rawPath === '/worksheets') {
                actualPath = '/worksheet-generator';
              } else if (rawPath === '/reports') {
                actualPath = currentKidId ? `/progress-report/${currentKidId}` : '/dashboard';
              } else if (rawPath === '/planner') {
                actualPath = currentKidId ? `/assigned-activities/${currentKidId}` : '/dashboard';
              } else if (rawPath === '/tokens') {
                actualPath = currentKidId ? `/behaviors/${currentKidId}` : '/dashboard';
              }

              navigate(actualPath);
              updateActionStatus(systemMsgId, true, '');
            } 
            else if (actionType === 'addActivity') {
              const currentKidId = selectedKidId || (kids.length > 0 ? kids[0].id : null);
              if (!currentKidId) {
                throw new Error("No child profile selected. Please register a child profile first in Dashboard.");
              }

              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const formattedDate = tomorrow.toISOString().split('T')[0];

              await apiFetch('/api/activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  kidId: currentKidId,
                  activityType: args.activityType || 'chore',
                  category: 'Daily Routine',
                  description: `Assigned via AI Concierge. Practice and positive reinforcement routine.`,
                  dueDate: formattedDate,
                  status: 'pending'
                })
              });

              updateActionStatus(systemMsgId, true, `Successfully created! View details in the Activity Planner.`);
              window.dispatchEvent(new CustomEvent('api_data_updated', { detail: { kidId: currentKidId } }));
            } 
            else if (actionType === 'distributeTokens') {
              const currentKidId = selectedKidId || (kids.length > 0 ? kids[0].id : null);
              if (!currentKidId) {
                throw new Error("No child profile selected. Please register or select a child first.");
              }

              const tokenCount = parseInt(args.tokens || '1', 10);
              const currentDate = new Date().toISOString().split('T')[0];

              await apiFetch(`/api/kids/${currentKidId}/behaviors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  description: 'Awarded by AI Concierge',
                  token_change: tokenCount,
                  rewards_earned: tokenCount,
                  date: currentDate,
                  remarks: 'Autogenerated positive reinforcement reward token distribution.',
                  occurrence: 1
                })
              });

              updateActionStatus(systemMsgId, true, `Successfully distributed ${tokenCount} token(s) to ${kids.find(k => k.id === currentKidId)?.name || 'student'}!`);
              window.dispatchEvent(new CustomEvent('api_data_updated', { detail: { kidId: currentKidId } }));
            }
            else if (actionType === 'generate_custom_quiz') {
              const currentKidId = args.student_id || selectedKidId || (kids.length > 0 ? kids[0].id : null);
              const subjectStr = args.subject || '';
              const topicStr = args.topic || '';
              const difficultyStr = args.difficulty || 'medium';
              const questionsCount = args.number_of_questions || 5;

              navigate(`/quiz-generator?student_id=${currentKidId || ''}&subject=${encodeURIComponent(subjectStr)}&topic=${encodeURIComponent(topicStr)}&difficulty=${encodeURIComponent(difficultyStr)}&questions=${questionsCount}`);
              updateActionStatus(systemMsgId, true, `Successfully loaded custom quiz settings under the Quiz Generator! Review or click "Generate Quiz" to proceed.`);
            }
          } catch (err: any) {
            console.error('Action execution failed:', err);
            updateActionStatus(systemMsgId, false, err.message || 'Action failed');
          }
        }, 1200);

      } else {
        const assistantMsg: Message = {
          sender: 'assistant',
          text: data?.response || "I have processed your query, let me know if there is anything else I can guide you through on Visual Steps!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      console.error('Error talking with concierge command api:', err);
      const errMsg: Message = {
        sender: 'assistant',
        text: "I'm having a hard time connecting to our server right now, but please ask again. I'm always here to help you support your children!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const updateActionStatus = (timestampId: number, success: boolean, customMsg: string) => {
    setMessages(prev => 
      prev.map(m => {
        if (m.actionStatus && m.sender === 'assistant') {
          return {
            ...m,
            text: customMsg ? `${m.text}\n\n${customMsg}` : m.text,
            actionStatus: {
              ...m.actionStatus,
              loading: false,
              success,
              errorMsg: success ? undefined : (customMsg || 'Execution failed')
            }
          };
        }
        return m;
      })
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none no-print" id="ai-concierge-root">
      {/* Floating Chat Box */}
      {isOpen && (
        <div className="w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col mb-4 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto" id="ai-concierge-chatbox">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-indigo-600 px-4 py-3.5 flex items-center justify-between text-white shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                <Bot className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">Visual Steps AI Concierge</h3>
                <span className="text-[10px] text-teal-100 font-medium tracking-wide uppercase">Official Platform Support</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                className={`flex gap-2.5 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="h-7 w-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-teal-600" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className={`rounded-2xl px-3.5 py-2.5 text-xs select-text leading-relaxed whitespace-pre-wrap shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-br from-teal-600 to-teal-500 text-white rounded-br-none' 
                      : 'bg-white text-slate-800 border border-slate-200/70 rounded-bl-none'
                  }`}>
                    {msg.text}

                    {/* Progress action card */}
                    {msg.actionStatus && (
                      <div className="mt-3 p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 flex items-center gap-2.5">
                        {msg.actionStatus.loading ? (
                          <Loader2 className="h-4.5 w-4.5 text-indigo-500 animate-spin flex-shrink-0" />
                        ) : msg.actionStatus.success ? (
                          <div className="h-4.5 w-4.5 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm animate-bounce">
                            <Check className="h-3 w-3" />
                          </div>
                        ) : (
                          <div className="h-4.5 w-4.5 rounded-full bg-red-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                            <X className="h-3 w-3" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-[11px] font-medium leading-normal">{msg.actionStatus.label}</p>
                          {msg.actionStatus.loading && (
                            <span className="text-[9px] text-slate-400 font-normal">Executing program...</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className={`text-[9px] text-slate-400/80 font-medium px-1 ${msg.sender === 'user' ? 'text-right' : ''}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Support Suggestions */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex flex-wrap gap-1.5">
            <button 
              onClick={() => setQuery("Can you show me around the app?")}
              className="text-[10px] text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-full font-medium transition-colors border border-teal-100 cursor-pointer"
            >
              ✨ Show Platform Tour
            </button>
            <button 
              onClick={() => setQuery("Please take me to the worksheets generator")}
              className="text-[10px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-full font-medium transition-colors border border-indigo-100 cursor-pointer"
            >
              📝 Worksheets Page
            </button>
            <button 
              onClick={() => setQuery("Add vacuum cleaning to chores list")}
              className="text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-full font-medium transition-colors border border-amber-100 cursor-pointer"
            >
              🧹 Schedule Vacuuming
            </button>
          </div>

          {/* Form input */}
          <form onSubmit={handleSend} className="p-3.5 border-t border-slate-200/70 bg-white flex items-center gap-2">
            <input 
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask anything about Visual Steps..."
              disabled={loading}
              className="flex-1 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 px-3.5 py-2 rounded-xl text-xs text-slate-800 transition-all placeholder:text-slate-400/90"
            />
            <button 
              type="submit"
              disabled={!query.trim() || loading}
              className="h-9 w-9 bg-gradient-to-br from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-teal-600/10 flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Bubble */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-gradient-to-br from-teal-600 to-indigo-600 shadow-xl shadow-teal-600/30 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20 pointer-events-auto"
        title="Open AI Concierge Support"
        id="ai-concierge-toggle-btn"
      >
        {isOpen ? (
          <X className="h-6 w-6 animate-in spin-in-90 duration-300" />
        ) : (
          <div className="relative">
            <Bot className="h-6 w-6 animate-pulse" />
            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
