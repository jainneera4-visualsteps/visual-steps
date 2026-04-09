import { apiFetch, safeJson } from '../utils/api';
import { io } from 'socket.io-client';
import { formatReward, rewardImages } from '../utils/rewardUtils';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Plus, User, Calendar, BookOpen, Gamepad2, Clock, Trophy, Sparkles, Loader2, ArrowLeft, Edit2, ShoppingBag } from 'lucide-react';

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
}

export default function Dashboard() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showBuyGrid, setShowBuyGrid] = useState(false);
  const [selectedKid, setSelectedKid] = useState<Kid | null>(null);
  const [rewardItems, setRewardItems] = useState<any[]>([]);
  const [isBuying, setIsBuying] = useState<string | null>(null);
  const [dashboardSelectedKidId, setDashboardSelectedKidId] = useState<string>('');
  const [parentMessage, setParentMessage] = useState<string>('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  useEffect(() => {
    if (kids.length > 0 && !dashboardSelectedKidId) {
      setDashboardSelectedKidId(kids[0].id);
    }
  }, [kids, dashboardSelectedKidId]);

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
        localStorage.setItem('kids_list', JSON.stringify(kidsList));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
              localStorage.setItem('kids_list', JSON.stringify(sortedKids));
            }
          });
      }
    });

    return () => {
      kids.forEach(kid => {
        socket.emit('leave_kid_room', kid.id);
      });
      socket.disconnect();
    };
  }, [kids.map(k => k.id).join(',')]);

  const calculateAge = (dob: string) => {
    if (!dob) return 'No Age';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years old`;
  };

  const handleGiveReward = async (kid: Kid) => {
    const amount = 1;
    
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
    } catch (err) {
      console.error(err);
      alert('Failed to give reward. Please try again.');
    }
  };

  const handleShowBuyGrid = async (kid: Kid) => {
    setSelectedKid(kid);
    setShowBuyGrid(true);
    setRewardItems([]);
    
    try {
      const res = await apiFetch(`/api/kids/${kid.id}/reward-items`);
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
          itemName: item.name
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
      const res = await apiFetch(`/api/kids/${kidId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_message: parentMessage }),
      });

      if (res.ok) {
        setParentMessage('');
        alert('Message sent to child!');
      } else {
        alert('Failed to send message');
      }
    } catch (err) {
      console.error('Send message error:', err);
      alert('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-lg text-slate-600 mt-2">Empower your child's growth with personalized activities and real-time progress insights.</p>
          </div>
          <div className="flex items-center gap-4">
            {kids.length > 0 && !showBuyGrid && (
              <div className="flex flex-col">
                <label htmlFor="kid-select" className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Select Profile</label>
                <select
                  id="kid-select"
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[180px]"
                  value={dashboardSelectedKidId}
                  onChange={(e) => setDashboardSelectedKidId(e.target.value)}
                >
                  {kids.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </div>
            )}
            <Link to="/add-kid">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add Child
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
        ) : showBuyGrid && selectedKid ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setShowBuyGrid(false)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                <span className="text-sm font-medium text-blue-900">
                  {selectedKid.name}'s Balance:
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {selectedKid.reward_balance} {formatReward(selectedKid.reward_type, selectedKid.reward_balance)}
                </span>
              </div>
            </div>

            {rewardItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <Trophy className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No rewards available</h3>
                <p className="text-slate-500 mt-1">Add some rewards in the child's settings.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
                {rewardItems.map((item) => (
                  <Card key={item.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-slate-50 flex items-center justify-center p-6 border-b border-slate-100">
                      {item.icon ? (
                        <span className="text-6xl">{item.icon}</span>
                      ) : (
                        <Trophy className="h-16 w-16 text-slate-300" />
                      )}
                    </div>
                    <CardContent className="flex-1 flex flex-col p-4">
                      <h3 className="font-bold text-slate-900 mb-1 text-lg">{item.name}</h3>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-blue-600 font-bold">
                          {item.cost} {formatReward(selectedKid.reward_type, item.cost)}
                        </div>
                        {item.location && (
                          <div className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {item.location}
                          </div>
                        )}
                      </div>
                      <Button
                        className="mt-auto w-full"
                        disabled={selectedKid.reward_balance < item.cost || isBuying === item.id}
                        onClick={() => handleBuyReward(item)}
                      >
                        {isBuying === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : selectedKid.reward_balance >= item.cost ? (
                          'Buy'
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
        ) : kids.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
            <div className="rounded-full bg-slate-100 p-4">
              <User className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-900">No profiles yet</h3>
            <p className="mt-2 text-slate-500 max-w-xs">
              Get started by adding a child.
            </p>
            <Link to="/add-kid" className="mt-6">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">Add Child</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="w-full mx-auto">
              {kids.filter(k => k.id === dashboardSelectedKidId).map((kid) => (
                <Card key={kid.id} className="rounded-xl shadow-lg bg-white relative overflow-hidden">
                  <CardHeader className="bg-blue-600 text-white relative h-28 p-6 flex flex-col justify-start rounded-t-xl">
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <CardTitle className="text-2xl font-bold text-white leading-tight">{kid.name}</CardTitle>
                        <p className="text-sm text-blue-100 font-medium">{calculateAge(kid.dob)}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xl">
                        <Button size="xs" variant="ghost" onClick={() => handleShowBuyGrid(kid)} className="text-white hover:bg-blue-700/50 p-2" aria-label="Buy"><ShoppingBag className="h-5 w-5" /></Button>
                        {rewardImages[kid.reward_type] ? (
                          <img src={rewardImages[kid.reward_type]} alt={kid.reward_type} className="h-7 w-7" referrerPolicy="no-referrer" />
                        ) : (
                          <Trophy className="h-7 w-7 text-yellow-300" />
                        )}
                        <span className="font-bold text-2xl">{kid.reward_balance || 0}</span>
                        <button 
                          onClick={() => handleGiveReward(kid)}
                          className="p-1.5 rounded-full hover:bg-blue-500 transition-colors"
                        >
                          <Plus className="h-6 w-6" />
                        </button>
                      </div>
                    </div>
                    <Link to={`/edit-kid/${kid.id}`} className="absolute bottom-4 right-4 text-white hover:text-blue-100">
                      <Edit2 className="h-5 w-5" />
                    </Link>
                    <div className="absolute -bottom-8 left-6 h-16 w-16 rounded-full bg-white flex items-center justify-center text-2xl overflow-hidden border-4 border-white shadow-md z-10">
                        {kid.avatar && (kid.avatar.startsWith('http') || kid.avatar.startsWith('data:')) ? (
                          <img src={kid.avatar} alt={kid.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          kid.avatar || '👤'
                        )}
                      </div>
                  </CardHeader>
                  <CardContent className="pt-10">
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
                          />
                          <Button 
                            size="sm" 
                            onClick={() => handleSendMessage(kid.id)}
                            disabled={isSendingMessage || !parentMessage.trim()}
                          >
                            {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                          </Button>
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                          {['🌟', '❤️', '👍', '🎉', '😊', '🚀', '🌈', '🍦', '🎮', '📚'].map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setParentMessage(prev => prev + emoji)}
                              className="text-lg hover:scale-125 transition-transform p-1"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 items-center">
                        <Link to={`/assigned-activities/${kid.id}`}>
                          <Button size="sm" variant="outline">Activities</Button>
                        </Link>
                        <Link to={`/behaviors/${kid.id}`}>
                          <Button size="sm" variant="outline">Behaviors</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
