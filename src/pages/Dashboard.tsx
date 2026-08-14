import { Tooltip } from '../components/ui/Tooltip';
import { apiFetch, safeJson } from '../utils/api';
import { io } from 'socket.io-client';
import { formatReward, rewardImages } from '../utils/rewardUtils';
import { getZonedTime, formatInTimezone } from '../utils/dateUtils';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Select } from '../components/Select';
import { Plus, User, Calendar, BookOpen, Gamepad2, Clock, Trophy, Sparkles, Loader2, ArrowLeft, Edit2, Activity, Brain, Save, Send, HelpCircle, BookOpenText, Trash2 } from 'lucide-react';

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
  chatbot_name?: string;
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
  const [kids, setKids] = useState<Kid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
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
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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
  const [messagesByKid, setMessagesByKid] = useState<Record<string, ParentMessageRecord[]>>({});
  const [isMessagesLoadingByKid, setIsMessagesLoadingByKid] = useState<Record<string, boolean>>({});
  const [selectedMessageIdsByKid, setSelectedMessageIdsByKid] = useState<Record<string, string[]>>({});
  
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
  }, [dashboardSelectedKidId]);



  useEffect(() => {
    if (kids.length > 0) {
      // If none selected or selected kid is no longer in the list (e.g. deleted), select the first one
      if (!dashboardSelectedKidId || !kids.some(k => k.id === dashboardSelectedKidId)) {
        setDashboardSelectedKidId(kids[0].id);
      }
    }
  }, [kids]);

  const fetchRewardItemsForSelectedKid = async () => {
    if (!dashboardSelectedKidId) return;
    try {
      const res = await apiFetch(`/api/kids/${dashboardSelectedKidId}/reward-items?onlyActive=true`);
      if (res.ok) {
        const data = await safeJson(res);
        setRewardItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch reward items:', err);
      setRewardItems([]);
    }
  };

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
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
        safeLocalStorageSet('kids_list', JSON.stringify(kidsList));
      } catch (err: any) {
        console.error('Dashboard: Failed to fetch kids', { error: err, message: err?.message });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (dashboardSelectedKidId) {
      fetchMessagesForKid(dashboardSelectedKidId);
    }
  }, [dashboardSelectedKidId]);

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
              safeLocalStorageSet('kids_list', JSON.stringify(sortedKids));
            }
          });

        if (data?.kidId) {
          fetchMessagesForKid(data.kidId);
        }
      }
    });

    return () => {
      kids.forEach(kid => {
        socket.emit('leave_kid_room', kid.id);
      });
      socket.disconnect();
    };
  }, [kids.map(k => k.id).join(',')]);

  const calculateAge = (dob: string, timezone?: string) => {
    if (!dob) return 'No Age';
    const birthDate = new Date(dob);
    const zoned = getZonedTime(timezone);
    const today = new Date(zoned.year, zoned.month - 1, zoned.day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years old`;
  };

  const handleGiveReward = async (kid: Kid, amount: number = 1) => {
    
    try {
      const newBalance = (kid.reward_balance || 0) + amount;
      const res = await apiFetch(`/api/kids/${kid.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward_balance: newBalance }),
      });

      if (!res.ok) throw new Error('Failed to update reward balance');

      // Update local state
      setKids(prev => prev.map(k => k.id === kid.id ? { ...k, reward_balance: newBalance } : k));
      return true;
    } catch (err) {
      console.error(err);
      alert('Failed to give reward. Please try again.');
      return false;
    }
  };

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

  const handleDeleteMessage = async (kidId: string, messageId: string) => {
    try {
      const res = await apiFetch(`/api/kids/${kidId}/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await safeJson(res);
        alert(data?.error || 'Failed to delete message');
        return;
      }

      setMessagesByKid(prev => ({
        ...prev,
        [kidId]: (prev[kidId] || []).filter((msg) => msg.id !== messageId)
      }));
      setSelectedMessageIdsByKid(prev => ({
        ...prev,
        [kidId]: (prev[kidId] || []).filter((id) => id !== messageId)
      }));
    } catch (err) {
      console.error('Delete message error:', err);
      alert('Failed to delete message');
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
    const datePart = date.toLocaleDateString();
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setShowBuyGrid(false)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>

            <div className="flex items-center gap-4">
              {locations.length > 0 && (
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              )}

              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                <span className="text-sm font-medium text-blue-900">
                  {selectedKid.name}'s Balance:
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {selectedKid.reward_balance} {formatReward(selectedKid.reward_type, selectedKid.reward_balance)}
                </span>
              </div>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <span className="block text-5xl mb-4">🛍️</span>
              <h3 className="text-lg font-medium text-slate-900">No rewards available</h3>
              <p className="text-slate-500 mt-1">Add some rewards in the child's settings.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
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
            <Tooltip content="Add Child's Profile">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">Add Child</Button>
            </Tooltip>
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="w-full mx-auto">
          {kids.filter(k => k.id === dashboardSelectedKidId).map((kid) => (
            <Card key={kid.id} className="rounded-xl shadow-lg bg-white relative overflow-hidden">
              <CardHeader className="bg-blue-600 text-white relative h-24 p-4 flex flex-col justify-start rounded-t-xl">
                <div className="flex justify-between items-start w-full">
                  <div>
                    <CardTitle className="text-2xl font-bold text-white leading-tight">{kid.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-3 text-xl">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleShowBuyGrid(kid)} className="text-white hover:bg-white/20 p-2 text-2xl" aria-label="Buy">🛍️</Button>
                      <div className="group relative">
                        <HelpCircle className="h-4 w-4 text-white/70 cursor-help transition-colors hover:text-white" />
                        <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                              <HelpCircle className="h-4 w-4 text-yellow-700" />
                            </div>
                            <span className="font-bold text-[14px] leading-tight text-slate-900 normal-case">
                              Click the shop icon to view and buy reward items your child has earned.
                            </span>
                          </div>
                          <div className="absolute right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                        </div>
                      </div>
                    </div>
                    {rewardImages[kid.reward_type] ? (
                      <img src={rewardImages[kid.reward_type]} alt={kid.reward_type} className="h-8 w-8" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-3xl">🛍️</span>
                    )}
                    <span className="font-bold text-2xl text-white">{kid.reward_balance || 0}</span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleGiveReward(kid)}
                        className="p-1.5 rounded-full hover:bg-blue-500 transition-colors"
                        aria-label="Add reward"
                      >
                        <Plus className="h-6 w-6" />
                      </button>
                      <div className="group relative">
                        <HelpCircle className="h-4 w-4 text-white/70 cursor-help transition-colors hover:text-white" />
                        <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                              <HelpCircle className="h-4 w-4 text-yellow-700" />
                            </div>
                            <span className="font-bold text-[14px] leading-tight text-slate-900 normal-case">
                              Click the + icon to increase your child's reward balance by 1.
                            </span>
                          </div>
                          <div className="absolute right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-8 left-6 h-16 w-16 rounded-full bg-white flex items-center justify-center text-2xl overflow-hidden border-4 border-white shadow-md z-10">
                    {kid.avatar && (kid.avatar.startsWith('http') || kid.avatar.startsWith('data:')) ? (
                      <img src={kid.avatar} alt={kid.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      kid.avatar || '👤'
                    )}
                  </div>
                    <Tooltip content="Edit child profile settings">
                      <Link to={`/edit-kid/${kid.id}`} className="absolute bottom-4 right-4 text-white hover:text-blue-100">
                        <Edit2 className="h-5 w-5" />
                      </Link>
                    </Tooltip>
                </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  {/* Parent Message Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Send Message to {kid.name}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a message or emoji... 🌟"
                        className="flex-1 h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={parentMessage}
                        onChange={(e) => setParentMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(kid.id)}
                        title="Enter a message to send to your child"
                      />
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
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                      {['🌟', '❤️', '👍', '🎉', '😊', '🚀', '🌈', '🍦', '🎮', '📚'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setParentMessage(prev => prev + emoji)}
                          className="text-lg hover:scale-125 transition-transform p-1"
                          title={`Add ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 items-center text-sm">
                    <Tooltip content={`Manage ${kid.name}'s Activities`}>
                      <Link to={`/assigned-activities/${kid.id}`}>
                        <Button size="sm" variant="outline">Activities</Button>
                      </Link>
                    </Tooltip>
                  </div>

                  <div className="space-y-2">
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

                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="space-y-1">
          <h1 className="text-4xl font-display font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
            Climb together. Effortless tools for certain steps and positive growth.
          </p>
        </div>
        <div className="flex items-end gap-3">
          {kids.length > 0 && !showBuyGrid && (
            <div className="w-44">
              <Select
                label="Select Child"
                value={dashboardSelectedKidId}
                onChange={(e) => setDashboardSelectedKidId(e.target.value)}
              >
                {kids.map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </Select>
            </div>
          )}
          <Link to="/add-kid">
            <Tooltip content="Add Child's Profile">
              <Button size="md" className="h-11 shadow-brand-200">
                <Plus className="mr-2 h-5 w-5" />
                Add Child
              </Button>
            </Tooltip>
          </Link>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
