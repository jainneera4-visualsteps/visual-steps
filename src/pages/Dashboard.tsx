import { Tooltip } from '../components/ui/Tooltip';
import { apiFetch, safeJson } from '../utils/api';
import { formatAppDate } from '../utils/dateUtils';
import { io } from 'socket.io-client';
import { formatReward, rewardImages } from '../utils/rewardUtils';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Plus, User, Loader2, ArrowLeft, ArrowRight, CheckCircle2, Edit2, Eye, Send, HelpCircle, Trash2, Smile } from 'lucide-react';
import { ParentOnboarding } from '../components/ParentOnboarding';
import { useAuth } from '../context/AuthContext';
import { isGuestSession } from '../guest/guestSession';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';

interface Kid {
  id: string;
  name: string;
  dob: string;
  grade_level: string;
  hobbies: string;
  interests: string;
  strengths: string;
  weaknesses: string;
  sensory_issues: string;
  avatar: string;
  reward_balance: number;
  reward_type: string;
  reward_icon?: string;
  parent_message?: string;
  timezone?: string;
}

interface ParentMessageRecord {
  id: string;
  kid_id: string;
  message: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, refreshProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [kids, setKids] = useState<Kid[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activityCount, setActivityCount] = useState<number | null>(null);
  const [needsAttentionCount, setNeedsAttentionCount] = useState(0);
  const [attentionRefreshKey, setAttentionRefreshKey] = useState(0);
  const [quickStartDismissed, setQuickStartDismissed] = useState(false);
  const safeLocalStorageSet = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Dashboard: localStorage.setItem failed for ${key}`, error);
      try {
        const err = error as any;
        const isQuota = err && (
          err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          err.code === 22 ||
          err.code === 1014 ||
          (typeof err.message === 'string' && err.message.toLowerCase().includes('quota'))
        );

        if (!isQuota) return;

        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('activities_') || k.startsWith('all_activities_') || k === 'kids_list') {
            try {
              localStorage.removeItem(k);
            } catch {
              // Ignore best-effort cleanup errors.
            }
          }
        });

        localStorage.setItem(key, value);
      } catch (retryError) {
        console.warn(`Dashboard: localStorage retry failed for ${key}`, retryError);
      }
    }
  };
  
  const [showBuyGrid, setShowBuyGrid] = useState(false);

  const [selectedKid, setSelectedKid] = useState<Kid | null>(null);
  const [rewardItems, setRewardItems] = useState<any[]>([]);
  const [isBuying, setIsBuying] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [dashboardSelectedKidId, setDashboardSelectedKidId] = useState<string>(() => {
    try {
      return localStorage.getItem('dashboard_selected_kid_id') || '';
    } catch (error) {
      console.warn('Dashboard: localStorage.getItem failed for dashboard_selected_kid_id', error);
      return '';
    }
  });
  const [parentMessage, setParentMessage] = useState<string>('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 });

  const positionEmojiPicker = () => {
    const button = emojiButtonRef.current;
    if (!button) return;
    const bounds = button.getBoundingClientRect();
    const pickerWidth = Math.min(350, window.innerWidth - 16);
    const pickerHeight = Math.min(420, window.innerHeight - 16);
    const left = Math.max(8, Math.min(bounds.right - pickerWidth, window.innerWidth - pickerWidth - 8));
    const below = bounds.bottom + 8;
    const top = below + pickerHeight <= window.innerHeight ? below : Math.max(8, bounds.top - pickerHeight - 8);
    setEmojiPickerPosition({ top, left });
  };

  useEffect(() => {
    if (!isEmojiPickerOpen) return;
    positionEmojiPicker();
    window.addEventListener('resize', positionEmojiPicker);
    window.addEventListener('scroll', positionEmojiPicker, true);
    return () => {
      window.removeEventListener('resize', positionEmojiPicker);
      window.removeEventListener('scroll', positionEmojiPicker, true);
    };
  }, [isEmojiPickerOpen]);
  const [messagesByKid, setMessagesByKid] = useState<Record<string, ParentMessageRecord[]>>({});
  const [isMessagesLoadingByKid, setIsMessagesLoadingByKid] = useState<Record<string, boolean>>({});
  const [selectedMessageIdsByKid, setSelectedMessageIdsByKid] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user?.id) return;
    try {
      setQuickStartDismissed(localStorage.getItem(`quick_start_dismissed_${user.id}`) === 'true');
    } catch {
      setQuickStartDismissed(false);
    }
  }, [user?.id]);

  const completeOnboarding = async () => {
    setShowOnboarding(false);
    if (user?.onboarding_completed === true) return;
    try {
      const response = await apiFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingCompleted: true }),
      });
      if (!response.ok) throw new Error('Unable to save onboarding preference');
      await refreshProfile();
    } catch (error) {
      console.error('Dashboard: failed to save onboarding completion', error);
    }
  };
  
  useEffect(() => {
    if (rewardItems.length > 0) {
      const locations = [...new Set(rewardItems.map(item => item.location || 'General'))];
      if (!selectedLocation || !locations.includes(selectedLocation)) {
        setSelectedLocation(locations[0]);
      }
    }
  }, [rewardItems]);
  
  useEffect(() => {
    if (dashboardSelectedKidId) {
      safeLocalStorageSet('dashboard_selected_kid_id', dashboardSelectedKidId);
    }
  }, [dashboardSelectedKidId, attentionRefreshKey]);

  useEffect(() => {
    const handleHeaderSelection = (event: Event) => {
      const kidId = (event as CustomEvent<string>).detail;
      if (kidId) setDashboardSelectedKidId(kidId);
    };
    window.addEventListener('visual-steps:selected-kid', handleHeaderSelection);
    return () => window.removeEventListener('visual-steps:selected-kid', handleHeaderSelection);
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tour') === '1') setShowOnboarding(true);
  }, []);



  useEffect(() => {
    if (kids.length > 0) {
      // If none selected or selected kid is no longer in the list (e.g. deleted), select the first one
      if (!dashboardSelectedKidId || !kids.some(k => k.id === dashboardSelectedKidId)) {
        setDashboardSelectedKidId(kids[0].id);
      }
    } else if (!isLoading && dashboardSelectedKidId) {
      setDashboardSelectedKidId('');
      try {
        localStorage.removeItem('dashboard_selected_kid_id');
      } catch {
        // Storage is optional; the in-memory selection is already cleared.
      }
    }
  }, [kids, isLoading, dashboardSelectedKidId]);

  const fetchMessagesForKid = async (kidId: string) => {
    if (!kidId) return;
    setIsMessagesLoadingByKid(prev => ({ ...prev, [kidId]: true }));
    try {
      const res = await apiFetch(`/api/kids/${kidId}/messages`);
      if (!res.ok) throw new Error('Failed to fetch parent messages');
      const data = await safeJson(res);
      const messages = data.messages || [];
      setMessagesByKid(prev => ({ ...prev, [kidId]: messages }));
      setSelectedMessageIdsByKid(prev => {
        const validIds = new Set(messages.map((m: ParentMessageRecord) => m.id));
        const existing = prev[kidId] || [];
        return {
          ...prev,
          [kidId]: existing.filter((id) => validIds.has(id))
        };
      });
    } catch (err) {
      console.error('Failed to fetch parent messages:', err);
      setMessagesByKid(prev => ({ ...prev, [kidId]: [] }));
    } finally {
      setIsMessagesLoadingByKid(prev => ({ ...prev, [kidId]: false }));
    }
  };


  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const kidsRes = await apiFetch('/api/kids');
        if (!kidsRes.ok) throw new Error('Failed to fetch kids');
        const kidsData = await safeJson(kidsRes);
        const kidsList = kidsData.kids || [];
        // Sort kids by age descending (oldest to youngest) -> dob ascending
        kidsList.sort((a: Kid, b: Kid) => new Date(a.dob).getTime() - new Date(b.dob).getTime());
        setKids(kidsList);
      } catch (err: any) {
        console.error('Dashboard: Failed to fetch kids', { error: err, message: err?.message });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (dashboardSelectedKidId && kids.some(kid => kid.id === dashboardSelectedKidId)) {
      fetchMessagesForKid(dashboardSelectedKidId);
    }
  }, [dashboardSelectedKidId, kids]);

  useEffect(() => {
    if (!dashboardSelectedKidId || isGuestSession()) {
      setActivityCount(null);
      setNeedsAttentionCount(0);
      return;
    }
    let cancelled = false;
    setActivityCount(null);
    apiFetch(`/api/kids/${encodeURIComponent(dashboardSelectedKidId)}/activities`)
      .then(response => response.ok ? safeJson(response) : Promise.reject(new Error('Unable to load activities')))
      .then(data => {
        if (cancelled) return;
        const activities = Array.isArray(data) ? data : data?.activities || [];
        setActivityCount(Array.isArray(activities) ? activities.length : 0);
        const verificationCount = Array.isArray(activities)
          ? activities.filter((activity: any) => activity.status === 'awaiting_verification').length
          : 0;
        const helpCount = Array.isArray(data?.helpRequests) ? data.helpRequests.length : 0;
        setNeedsAttentionCount(verificationCount + helpCount);
      })
      .catch(error => {
        if (!cancelled) console.error('Dashboard: failed to load Quick Start progress', error);
      });
    return () => { cancelled = true; };
  }, [dashboardSelectedKidId]);

  const dismissQuickStart = () => {
    setQuickStartDismissed(true);
    if (!user?.id) return;
    try {
      localStorage.setItem(`quick_start_dismissed_${user.id}`, 'true');
    } catch {
      // The panel can still be dismissed for the current session.
    }
  };

  // Join rooms when kids are loaded
  useEffect(() => {
    if (kids.length === 0) return;
    
    const socket = io(window.location.origin);
    
    kids.forEach(kid => {
      socket.emit('join_kid_room', kid.id);
    });

    socket.on('data_updated', (data) => {
      console.log('Received data_updated event:', data);
      // Re-fetch kids if any kid updates
      if (navigator.onLine) {
        apiFetch('/api/kids')
          .then(res => safeJson(res))
          .then(kidsData => {
            if (kidsData && Array.isArray(kidsData.kids)) {
              const sortedKids = [...kidsData.kids].sort((a: Kid, b: Kid) => new Date(a.dob).getTime() - new Date(b.dob).getTime());
              setKids(sortedKids);
            }
          });

        if (data?.kidId) {
          fetchMessagesForKid(data.kidId);
          if (data.kidId === dashboardSelectedKidId) setAttentionRefreshKey(key => key + 1);
        }
      }
    });

    return () => {
      kids.forEach(kid => {
        socket.emit('leave_kid_room', kid.id);
      });
      socket.disconnect();
    };
  }, [kids.map(k => k.id).join(','), dashboardSelectedKidId]);

  const handleShowBuyGrid = async (kid: Kid) => {
    setSelectedKid(kid);
    setShowBuyGrid(true);
    setRewardItems([]);
    
    try {
      const res = await apiFetch(`/api/kids/${kid.id}/reward-items?onlyActive=true`);
      if (res.ok) {
        const data = await safeJson(res);
        setRewardItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch reward items:', err);
    }
  };

  useEffect(() => {
    if (searchParams.get('shop') !== '1') {
      if (showBuyGrid) setShowBuyGrid(false);
      return;
    }
    if (kids.length === 0 || !dashboardSelectedKidId) return;
    const selected = kids.find(kid => kid.id === dashboardSelectedKidId);
    if (!selected || (showBuyGrid && selectedKid?.id === selected.id)) return;
    void handleShowBuyGrid(selected);
  }, [searchParams, kids, dashboardSelectedKidId, showBuyGrid, selectedKid?.id]);

  const handleBuyReward = async (item: any) => {
    if (!selectedKid) return;
    
    if (selectedKid.reward_balance < item.cost) {
      alert('Not enough balance to buy this reward.');
      return;
    }

    setIsBuying(item.id);
    try {
      const res = await apiFetch(`/api/kids/${selectedKid.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quantity: item.cost,
          itemName: item.name,
          location: item.location || 'General',
          purchasedAt: new Date().toISOString()
        }),
      });

      if (res.ok) {
        // Update local state
        const newBalance = selectedKid.reward_balance - item.cost;
        setKids(prev => prev.map(k => k.id === selectedKid.id ? { ...k, reward_balance: newBalance } : k));
        setSelectedKid(prev => prev ? { ...prev, reward_balance: newBalance } : null);
        alert(`Successfully bought: ${item.name}`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to buy reward');
      }
    } catch (err) {
      console.error('Buy error:', err);
      alert('Failed to buy reward. Please try again.');
    } finally {
      setIsBuying(null);
    }
  };

  const handleSendMessage = async (kidId: string) => {
    if (!parentMessage.trim()) return;
    
    setIsSendingMessage(true);
    try {
      const res = await apiFetch(`/api/kids/${kidId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: parentMessage }),
      });

      if (res.ok) {
        setParentMessage('');
        await fetchMessagesForKid(kidId);
      } else {
        const data = await safeJson(res);
        alert(data?.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Send message error:', err);
      alert('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleToggleMessageSelection = (kidId: string, messageId: string) => {
    setSelectedMessageIdsByKid(prev => {
      const existing = prev[kidId] || [];
      const isSelected = existing.includes(messageId);
      return {
        ...prev,
        [kidId]: isSelected
          ? existing.filter((id) => id !== messageId)
          : [...existing, messageId]
      };
    });
  };

  const handleToggleSelectAllMessages = (kidId: string) => {
    const messages = messagesByKid[kidId] || [];
    const allIds = messages.map((msg) => msg.id);
    const selectedIds = selectedMessageIdsByKid[kidId] || [];
    const shouldSelectAll = selectedIds.length !== allIds.length;

    setSelectedMessageIdsByKid(prev => ({
      ...prev,
      [kidId]: shouldSelectAll ? allIds : []
    }));
  };

  const handleDeleteSelectedMessages = async (kidId: string) => {
    const selectedIds = selectedMessageIdsByKid[kidId] || [];
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(`Delete ${selectedIds.length} selected message(s)?`);
    if (!confirmed) return;

    try {
      const results = await Promise.all(
        selectedIds.map(async (messageId) => {
          const res = await apiFetch(`/api/kids/${kidId}/messages/${messageId}`, { method: 'DELETE' });
          return { messageId, ok: res.ok };
        })
      );

      const deletedIds = results.filter((r) => r.ok).map((r) => r.messageId);
      const failedCount = results.length - deletedIds.length;

      if (deletedIds.length > 0) {
        setMessagesByKid(prev => ({
          ...prev,
          [kidId]: (prev[kidId] || []).filter((msg) => !deletedIds.includes(msg.id))
        }));
      }

      setSelectedMessageIdsByKid(prev => ({ ...prev, [kidId]: [] }));

      if (failedCount > 0) {
        alert(`${failedCount} message(s) could not be deleted.`);
      }
    } catch (err) {
      console.error('Bulk delete message error:', err);
      alert('Failed to delete selected messages');
    }
  };

  const formatMessageTimestamp = (createdAt: string) => {
    const date = new Date(createdAt);
    const datePart = formatAppDate(date);
    const timePart = date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  };


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
      );
    }

    if (showBuyGrid && selectedKid) {
      const locations = [...new Set(rewardItems.map(item => item.location || 'General'))];
      const filteredItems = rewardItems.filter(item => (item.location || 'General') === selectedLocation);
      
      return (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="xs" onClick={() => setSearchParams(current => { const next = new URLSearchParams(current); next.delete('shop'); return next; }, { replace: true })} className="h-7 pl-0 text-[12px] font-bold uppercase hover:bg-transparent hover:text-blue-600">
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back to Dashboard
            </Button>
            <h1 className="text-xl font-bold leading-none tracking-tight text-slate-900">Reward Shop</h1>
          </div>

          <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-blue-100 bg-white/50 px-4 py-2">
              <CardTitle className="text-base font-bold">Buy Rewards for {selectedKid.name}</CardTitle>
              <div className="flex items-center gap-3">
              {locations.length > 0 && (
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              )}

              <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5">
                <span className="text-xs font-medium text-blue-900">Balance:</span>
                <span className="text-sm font-bold text-blue-600">
                  {selectedKid.reward_balance} {formatReward(selectedKid.reward_type, selectedKid.reward_balance)}
                </span>
              </div>
            </div>
            </CardHeader>
            <CardContent className="p-4">

          {filteredItems.length === 0 ? (
            <div className="border border-slate-200 bg-white py-12 text-center">
              <span className="block text-5xl mb-4">🛍️</span>
              <h3 className="text-lg font-medium text-slate-900">No rewards available</h3>
              <p className="text-slate-500 mt-1">Add some rewards in the child's settings.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              {filteredItems.map((item) => (
                <Card key={item.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-28 bg-slate-50 flex items-center justify-center p-4 border-b border-slate-100">
                    {item.icon ? (
                      <span className="text-4xl">{item.icon}</span>
                    ) : (
                      <span className="text-4xl">🛍️</span>
                    )}
                  </div>
                  <CardContent className="flex-1 flex flex-col p-3">
                    <h3 className="font-bold text-slate-900 mb-1 text-base">{item.name}</h3>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-blue-600 font-bold text-sm">
                        {item.cost} {formatReward(selectedKid.reward_type, item.cost)}
                      </div>
                    </div>
                    <Button
                      className="mt-auto w-full h-8 text-sm"
                      disabled={selectedKid.reward_balance < item.cost || isBuying === item.id}
                      onClick={() => handleBuyReward(item)}
                    >
                      {isBuying === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : selectedKid.reward_balance >= item.cost ? (
                        <div className="flex items-center">
                          <span className="mr-2">🛍️</span>
                          <span>Buy</span>
                        </div>
                      ) : (
                        'Not enough balance'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
            </CardContent>
          </Card>
        </div>
      );
    }

    if (kids.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
          <div className="rounded-full bg-slate-100 p-4">
            <User className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-slate-900">No profiles yet</h3>
          <p className="mt-2 text-slate-500 max-w-xs">
            Get started by adding a child.
          </p>
          <Link to="/add-kid" className="mt-6">
            <Tooltip content="Add Child / Adult Profile">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">Add Child / Adult</Button>
            </Tooltip>
          </Link>
        </div>
      );
    }

    return (
      <div className="h-full w-full">
        <div className="h-full w-full">
          {kids.filter(k => k.id === dashboardSelectedKidId).map((kid) => (
            <Card key={kid.id} data-dashboard-content className="relative h-full !rounded-none !border-0 bg-white !shadow-none !ring-0 !outline-none">
              <CardContent className="h-full !p-0">
                <div className="h-full w-full">
                  <section className="h-full w-full rounded-none border-0 bg-white px-0 pb-5 pt-0 shadow-none" aria-label="Learner communication">
                  {/* Parent Message Input */}
                  <div className="space-y-2" data-guest-tour="parent-message">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Send Message to {kid.name}</label>
                    <div className="flex gap-2">
                      <div className="relative min-w-0 flex-1">
                        <input
                          type="text"
                          placeholder="Type a message or emoji... 🌟"
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={parentMessage}
                          onChange={(e) => setParentMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(kid.id)}
                          title="Enter a message to send to your child"
                        />
                        <Tooltip content="Add an emoji">
                          <button ref={emojiButtonRef} type="button" onClick={() => setIsEmojiPickerOpen(open => !open)} aria-label="Choose an emoji" aria-expanded={isEmojiPickerOpen} className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md border-0 bg-transparent text-slate-500 transition-colors hover:bg-blue-50/70 hover:text-blue-700">
                            <Smile className="h-5 w-5" />
                          </button>
                        </Tooltip>
                        {isEmojiPickerOpen && createPortal(
                          <div className="fixed z-[200] max-w-[calc(100vw-1rem)] shadow-2xl" style={{ top: emojiPickerPosition.top, left: emojiPickerPosition.left }} aria-label="Message emojis">
                            <EmojiPicker
                              onEmojiClick={(emojiData: EmojiClickData) => {
                                setParentMessage(previous => previous + emojiData.emoji);
                                setIsEmojiPickerOpen(false);
                              }}
                              width={350}
                              height={420}
                              lazyLoadEmojis
                              searchPlaceHolder="Search emojis"
                              previewConfig={{ showPreview: false }}
                            />
                          </div>,
                          document.body,
                        )}
                      </div>
                      <Tooltip content="Send message">
                        <Button 
                          size="sm" 
                          onClick={() => handleSendMessage(kid.id)}
                          disabled={isSendingMessage || !parentMessage.trim()}
                          aria-label="Send message"
                        >
                          {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Message History
                      </label>
                      <span className="text-[10px] font-medium text-slate-400">
                        Latest first
                      </span>
                    </div>

                    {isMessagesLoadingByKid[kid.id] ? (
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500 shadow-sm">Loading messages...</div>
                    ) : (messagesByKid[kid.id] || []).length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400 shadow-sm">
                        No messages yet.
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-white">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-1 focus:ring-blue-600"
                              checked={(messagesByKid[kid.id] || []).length > 0 && (selectedMessageIdsByKid[kid.id] || []).length === (messagesByKid[kid.id] || []).length}
                              onChange={() => handleToggleSelectAllMessages(kid.id)}
                              aria-label="Select all messages"
                              title="Select all"
                            />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Messages</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSelectedMessages(kid.id)}
                            disabled={(selectedMessageIdsByKid[kid.id] || []).length === 0}
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Delete selected messages"
                            aria-label="Delete selected messages"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                          {(messagesByKid[kid.id] || []).map((msg) => (
                          <div key={msg.id} className="border-b border-slate-100 last:border-b-0">
                            <div className="flex items-start gap-3 px-4 py-3">
                              <input
                                type="checkbox"
                                className="mt-5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-1 focus:ring-blue-600"
                                checked={(selectedMessageIdsByKid[kid.id] || []).includes(msg.id)}
                                onChange={() => handleToggleMessageSelection(kid.id, msg.id)}
                                aria-label="Select message"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  {formatMessageTimestamp(msg.created_at)}
                                </p>
                                <p className="mt-1 text-sm text-slate-700 leading-6 break-words">{msg.message}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    )}
                  </div>

                  </section>

                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-full w-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 p-3 lg:hidden">
        <div className="flex w-full min-w-0 items-center gap-3">
          <span className="shrink-0 text-[11px] font-black uppercase tracking-[0.16em] text-brand-700">Dashboard</span>
          <span className="h-4 w-px shrink-0 bg-slate-300" aria-hidden="true" />
          <p className="truncate text-sm font-semibold text-slate-600">Climb together. Effortless tools for certain steps and positive growth.</p>
        </div>
        <Button type="button" size="sm" className="h-9" onClick={() => setShowOnboarding(true)}>
          <HelpCircle className="mr-1.5 h-4 w-4" />Start tour
        </Button>
        {kids.length > 0 && !showBuyGrid && (
          <select aria-label="Select Child" value={dashboardSelectedKidId} onChange={(event) => setDashboardSelectedKidId(event.target.value)} className="h-9 min-w-32 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold">
            {kids.map(kid => <option key={kid.id} value={kid.id}>{kid.name}</option>)}
          </select>
        )}
        <Link to="/add-kid" data-guest-tour="add-child"><Button size="sm" className="h-9"><Plus className="mr-1.5 h-4 w-4" />Add Child / Adult</Button></Link>
      </div>

      {searchParams.get('shop') !== '1' && !showBuyGrid && !isGuestSession() && !quickStartDismissed && (
        <section className="m-4 shrink-0 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-5 shadow-sm" aria-labelledby="quick-start-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-700">Quick Start</p>
              <h2 id="quick-start-title" className="mt-1 text-2xl font-black text-slate-950">Create one useful visual activity</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Start with one real activity. Add small steps, then preview the simple experience your child or adult will see. You can explore rewards, schedules, learning tools and other settings later.</p>
            </div>
            <button type="button" onClick={dismissQuickStart} className="shrink-0 text-xs font-bold text-slate-500 underline underline-offset-4 hover:text-slate-800">Hide Quick Start</button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Link to={kids.length ? `/edit-kid/${dashboardSelectedKidId || kids[0]?.id}` : '/add-kid'} className="group rounded-xl border border-white bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200">
              <div className="flex items-center justify-between gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-black text-brand-800">1</span>{kids.length > 0 && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}</div>
              <h3 className="mt-3 font-black text-slate-950">{kids.length ? 'Profile ready' : 'Add the person you support'}</h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">{kids.length ? 'You can review or update the selected profile.' : 'Create a child or adult profile using the information that helps you provide support.'}</p>
            </Link>

            {kids.length > 0 ? <Link to={`/assigned-activities/${dashboardSelectedKidId || kids[0]?.id}`} className="group rounded-xl border border-white bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200">
              <div className="flex items-center justify-between gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-black text-brand-800">2</span>{activityCount !== null && activityCount > 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <ArrowRight className="h-5 w-5 text-brand-600 transition group-hover:translate-x-1" />}</div>
              <h3 className="mt-3 font-black text-slate-950">{activityCount !== null && activityCount > 0 ? 'Visual activity ready' : 'Create the first activity'}</h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">Open Activities, add one meaningful activity, and break it into small concrete steps.</p>
            </Link> : <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 opacity-70">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-500">2</span><h3 className="mt-3 font-black text-slate-700">Create the first activity</h3><p className="mt-1 text-sm leading-5 text-slate-500">This becomes available after you add a profile.</p>
            </div>}

            {kids.length > 0 ? <Link to={`/kids-dashboard/${dashboardSelectedKidId || kids[0]?.id}`} className="group rounded-xl border border-white bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200">
              <div className="flex items-center justify-between gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-black text-brand-800">3</span><Eye className="h-5 w-5 text-brand-600" /></div>
              <h3 className="mt-3 font-black text-slate-950">Preview the learner experience</h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">See exactly how the selected profile and activities appear before handing over the device.</p>
            </Link> : <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 opacity-70">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-500">3</span><h3 className="mt-3 font-black text-slate-700">Preview the learner experience</h3><p className="mt-1 text-sm leading-5 text-slate-500">Preview becomes available after a profile is created.</p>
            </div>}
          </div>

          {activityCount !== null && activityCount > 0 && <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-emerald-900">Your first visual activity is ready.</p><p className="mt-0.5 text-sm text-emerald-800">Preview what the child or adult will see, or continue creating activities when they are useful.</p></div><button type="button" onClick={dismissQuickStart} className="shrink-0 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800">Finish Quick Start</button></div>}
        </section>
      )}

      <div className="min-h-0 flex-1">{renderContent()}</div>
      {showOnboarding && <ParentOnboarding onClose={completeOnboarding} />}
    </div>
  );
}
