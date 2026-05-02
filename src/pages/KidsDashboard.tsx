import { apiFetch, safeJson } from '../utils/api';
import { io } from 'socket.io-client';
import { formatReward, rewardImages } from '../utils/rewardUtils';
import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Star, Lock, Lightbulb, LayoutGrid, CheckCircle, Circle, Clock, Target, Coins, LayoutList, WifiOff, Loader2, Gamepad2, PlayCircle, Sun, CloudSun, Moon, Sparkles, LogOut, Trophy, Eye, TrendingUp, MessageSquare, X } from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import { ActivityDetailModal } from '../components/ActivityDetailModal';
import { SocialStoryModal } from '../components/SocialStoryModal';
import { ChatbotComponent } from '../components/ChatbotComponent';

interface ActivityStep {
  id?: number;
  step_number: number;
  description: string;
  image_url?: string;
}

interface Activity {
  id: string;
  kid_id: string;
  activity_type: string;
  category: string;
  repeat_frequency: string;
  time_of_day: string;
  description: string;
  link: string;
  image_url: string;
  status: 'pending' | 'completed';
  due_date: string;
  repeat_interval?: number;
  repeat_unit?: string;
  completed_at?: string;
  created_at?: string;
  steps?: ActivityStep[];
  isHistory?: boolean;
}

interface Kid {
  id: string;
  name: string;
  avatar?: string;
  dob?: string;
  grade_level?: string;
  hobbies?: string;
  interests?: string;
  strengths?: string;
  weaknesses?: string;
  sensory_issues?: string;
  behavioral_issues?: string;
  notes?: string;
  therapies?: string;
  start_time?: string;
  end_time?: string;
  reward_type?: string;
  reward_quantity?: number;
  reward_balance?: number;
  rules?: string;
  theme?: string;
  can_print?: boolean;
  timezone?: string;
  parent_message?: string;
  chatbot_name?: string;
}

interface RewardItem {
  id: string;
  kid_id: string;
  name: string;
  cost: number;
  image_url?: string;
  location?: string;
}

export default function KidsDashboard() {
  const { kidId } = useParams();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [kid, setKid] = useState<Kid | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [pendingReward, setPendingReward] = useState<any>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const lastMessageRef = useRef<string | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
      }
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(e => console.log('Audio play blocked:', e));
    } catch (e) {
      console.error('Failed to play sound', e);
    }
  }, []);

  const triggerCelebration = useCallback(() => {
    playNotificationSound();
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 1000
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }, []);
  const [viewingStoryId, setViewingStoryId] = useState<string | null>(null);
  const [isAccessAllowed, setIsAccessAllowed] = useState(true);
  const [accessMessage, setAccessMessage] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [activeTab, setActiveTab] = useState<'todo' | 'completed' | 'rewards' | 'games'>('todo');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [timezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  const [behaviorDefinitions, setBehaviorDefinitions] = useState<any[]>([]);
  const [behaviorLogs, setBehaviorLogs] = useState<any[]>([]);
  const [behaviorTracker, setBehaviorTracker] = useState<any[]>([]);

  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const m = now.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years old`;
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (kid) {
      document.title = `${kid.name}'s Dashboard | Visual Steps`;
    } else {
      document.title = 'Kids Dashboard | Visual Steps';
    }
  }, [kid]);

  const [today, setToday] = useState<string | null>(null);
  const completedTodayCount = activities.filter(a => {
    if (a.status !== 'completed') return false;
    if (!a.completed_at) return a.due_date === today;
    const completedDate = a.completed_at.split('T')[0];
    return completedDate === today;
  }).length;
  
  const rewardIcon = kid?.reward_type ? (rewardImages[kid.reward_type] || rewardImages['Penny']) : rewardImages['Penny'];
  
  const themes: Record<string, any> = {
    sky: {
      bg: 'bg-sky-50',
      header: 'bg-sky-600',
      banner: 'bg-white ring-sky-100',
      bannerText: 'text-slate-800',
      bannerSubtext: 'text-slate-400',
      rules: 'bg-yellow-50 border-yellow-200 text-yellow-900',
      rulesHeader: 'bg-yellow-100 text-yellow-600',
      rulesTitle: 'text-yellow-800',
      card: 'ring-slate-200',
      cardTitle: 'text-slate-800',
      cardSubtext: 'text-slate-500',
      accent: 'text-sky-600',
      button: 'bg-sky-600 hover:bg-sky-700'
    },
    emerald: {
      bg: 'bg-emerald-50',
      header: 'bg-emerald-600',
      banner: 'bg-white ring-emerald-100',
      bannerText: 'text-slate-800',
      bannerSubtext: 'text-slate-400',
      rules: 'bg-emerald-100 border-emerald-200 text-emerald-900',
      rulesHeader: 'bg-emerald-200 text-emerald-700',
      rulesTitle: 'text-emerald-800',
      card: 'ring-emerald-200',
      cardTitle: 'text-slate-800',
      cardSubtext: 'text-slate-500',
      accent: 'text-emerald-600',
      button: 'bg-emerald-600 hover:bg-emerald-700'
    },
    sunset: {
      bg: 'bg-orange-50',
      header: 'bg-orange-600',
      banner: 'bg-white ring-orange-100',
      bannerText: 'text-slate-800',
      bannerSubtext: 'text-slate-400',
      rules: 'bg-orange-100 border-orange-200 text-orange-900',
      rulesHeader: 'bg-orange-200 text-orange-700',
      rulesTitle: 'text-orange-800',
      card: 'ring-orange-200',
      cardTitle: 'text-slate-800',
      cardSubtext: 'text-slate-500',
      accent: 'text-orange-600',
      button: 'bg-orange-600 hover:bg-orange-700'
    },
    royal: {
      bg: 'bg-purple-50',
      header: 'bg-purple-600',
      banner: 'bg-white ring-purple-100',
      bannerText: 'text-slate-800',
      bannerSubtext: 'text-slate-400',
      rules: 'bg-purple-100 border-purple-200 text-purple-900',
      rulesHeader: 'bg-purple-200 text-purple-700',
      rulesTitle: 'text-purple-800',
      card: 'ring-purple-200',
      cardTitle: 'text-slate-800',
      cardSubtext: 'text-slate-500',
      accent: 'text-purple-600',
      button: 'bg-purple-600 hover:bg-purple-700'
    },
    space: {
      bg: 'bg-slate-950',
      bgStyle: {
        backgroundImage: 'url("https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1920")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      },
      header: 'bg-slate-900/80 backdrop-blur-md',
      banner: 'bg-slate-900/90 backdrop-blur-sm ring-slate-800',
      bannerText: 'text-white',
      bannerSubtext: 'text-slate-400',
      rules: 'bg-slate-900/90 border-slate-700 text-slate-300',
      rulesHeader: 'bg-slate-800 text-blue-400',
      rulesTitle: 'text-blue-300',
      card: 'ring-slate-800',
      cardTitle: 'text-white',
      cardSubtext: 'text-slate-400',
      accent: 'text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700'
    },
    jungle: {
      bg: 'bg-green-50',
      bgStyle: {
        backgroundImage: 'url("https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&q=80&w=1920")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      },
      header: 'bg-green-700/80 backdrop-blur-md',
      banner: 'bg-white/90 backdrop-blur-sm ring-green-100',
      bannerText: 'text-green-900',
      bannerSubtext: 'text-green-700',
      rules: 'bg-green-50/90 border-green-200 text-green-900',
      rulesHeader: 'bg-green-100 text-green-600',
      rulesTitle: 'text-green-800',
      card: 'ring-green-200',
      cardTitle: 'text-green-900',
      cardSubtext: 'text-green-700',
      accent: 'text-green-600',
      button: 'bg-green-600 hover:bg-green-700'
    },
    ocean: {
      bg: 'bg-blue-50',
      bgStyle: {
        backgroundImage: 'url("https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&q=80&w=1920")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      },
      header: 'bg-blue-800/80 backdrop-blur-md',
      banner: 'bg-white/90 backdrop-blur-sm ring-blue-100',
      bannerText: 'text-blue-900',
      bannerSubtext: 'text-blue-700',
      rules: 'bg-blue-50/90 border-blue-200 text-blue-900',
      rulesHeader: 'bg-blue-100 text-blue-600',
      rulesTitle: 'text-blue-800',
      card: 'ring-blue-200',
      cardTitle: 'text-blue-900',
      cardSubtext: 'text-blue-700',
      accent: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700'
    },
    dino: {
      bg: 'bg-amber-50',
      bgStyle: {
        backgroundImage: 'url("https://images.unsplash.com/photo-1551103782-8ab07afd45c1?auto=format&fit=crop&q=80&w=1920")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      },
      header: 'bg-amber-800/80 backdrop-blur-md',
      banner: 'bg-white/90 backdrop-blur-sm ring-amber-100',
      bannerText: 'text-amber-900',
      bannerSubtext: 'text-amber-700',
      rules: 'bg-amber-50/90 border-amber-200 text-amber-900',
      rulesHeader: 'bg-amber-100 text-amber-600',
      rulesTitle: 'text-amber-800',
      card: 'ring-amber-200',
      cardTitle: 'text-amber-900',
      cardSubtext: 'text-amber-700',
      accent: 'text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700'
    },
    fairy: {
      bg: 'bg-pink-50',
      bgStyle: {
        backgroundImage: 'url("https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1920")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      },
      header: 'bg-pink-600/80 backdrop-blur-md',
      banner: 'bg-white/90 backdrop-blur-sm ring-pink-100',
      bannerText: 'text-pink-900',
      bannerSubtext: 'text-pink-700',
      rules: 'bg-pink-50/90 border-pink-200 text-pink-900',
      rulesHeader: 'bg-pink-100 text-pink-600',
      rulesTitle: 'text-pink-800',
      card: 'ring-pink-200',
      cardTitle: 'text-pink-900',
      cardSubtext: 'text-pink-700',
      accent: 'text-pink-600',
      button: 'bg-pink-600 hover:bg-pink-700'
    },
    hero: {
      bg: 'bg-red-50',
      bgStyle: {
        backgroundImage: 'url("https://images.unsplash.com/photo-1531259683007-016a7b628fc3?auto=format&fit=crop&q=80&w=1920")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      },
      header: 'bg-red-700/80 backdrop-blur-md',
      banner: 'bg-white/90 backdrop-blur-sm ring-red-100',
      bannerText: 'text-red-900',
      bannerSubtext: 'text-red-700',
      rules: 'bg-red-50/90 border-red-200 text-red-900',
      rulesHeader: 'bg-red-100 text-red-600',
      rulesTitle: 'text-red-800',
      card: 'ring-red-200',
      cardTitle: 'text-red-900',
      cardSubtext: 'text-red-700',
      accent: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700'
    },
    sports: {
      bg: 'bg-indigo-50',
      bgStyle: {
        backgroundImage: 'url("https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=1920")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      },
      header: 'bg-indigo-700/80 backdrop-blur-md',
      banner: 'bg-white/90 backdrop-blur-sm ring-indigo-100',
      bannerText: 'text-indigo-900',
      bannerSubtext: 'text-indigo-700',
      rules: 'bg-indigo-50/90 border-indigo-200 text-indigo-900',
      rulesHeader: 'bg-indigo-100 text-indigo-600',
      rulesTitle: 'text-indigo-800',
      card: 'ring-indigo-200',
      cardTitle: 'text-indigo-900',
      cardSubtext: 'text-indigo-700',
      accent: 'text-indigo-600',
      button: 'bg-indigo-600 hover:bg-indigo-700'
    },
    safari: {
      bg: 'bg-orange-50',
      bgStyle: {
        backgroundImage: 'url("https://images.unsplash.com/photo-1547407139-3c921a66005c?auto=format&fit=crop&q=80&w=1920")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      },
      header: 'bg-orange-700/80 backdrop-blur-md',
      banner: 'bg-white/90 backdrop-blur-sm ring-orange-100',
      bannerText: 'text-orange-900',
      bannerSubtext: 'text-orange-700',
      rules: 'bg-orange-50/90 border-orange-200 text-orange-900',
      rulesHeader: 'bg-orange-100 text-orange-600',
      rulesTitle: 'text-orange-800',
      card: 'ring-orange-200',
      cardTitle: 'text-orange-900',
      cardSubtext: 'text-orange-700',
      accent: 'text-orange-600',
      button: 'bg-orange-600 hover:bg-orange-700'
    },
    art: {
      bg: 'bg-pink-50',
      bgStyle: {
        backgroundImage: 'url("https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1920")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      },
      header: 'bg-pink-600/80 backdrop-blur-md',
      banner: 'bg-white/90 backdrop-blur-sm ring-pink-100',
      bannerText: 'text-pink-900',
      bannerSubtext: 'text-pink-700',
      rules: 'bg-pink-50/90 border-pink-200 text-pink-900',
      rulesHeader: 'bg-pink-100 text-pink-600',
      rulesTitle: 'text-pink-800',
      card: 'ring-pink-200',
      cardTitle: 'text-pink-900',
      cardSubtext: 'text-pink-700',
      accent: 'text-pink-600',
      button: 'bg-pink-600 hover:bg-pink-700'
    },
    music: {
      bg: 'bg-purple-50',
      bgStyle: {
        backgroundImage: 'url("https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&q=80&w=1920")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      },
      header: 'bg-purple-700/80 backdrop-blur-md',
      banner: 'bg-white/90 backdrop-blur-sm ring-purple-100',
      bannerText: 'text-purple-900',
      bannerSubtext: 'text-purple-700',
      rules: 'bg-purple-50/90 border-purple-200 text-purple-900',
      rulesHeader: 'bg-purple-100 text-purple-600',
      rulesTitle: 'text-purple-800',
      card: 'ring-purple-200',
      cardTitle: 'text-purple-900',
      cardSubtext: 'text-purple-700',
      accent: 'text-purple-600',
      button: 'bg-purple-600 hover:bg-purple-700'
    },
    construction: {
      bg: 'bg-yellow-50',
      bgStyle: {
        backgroundImage: 'url("https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1920")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      },
      header: 'bg-yellow-700/80 backdrop-blur-md',
      banner: 'bg-white/90 backdrop-blur-sm ring-yellow-100',
      bannerText: 'text-yellow-900',
      bannerSubtext: 'text-yellow-700',
      rules: 'bg-yellow-50/90 border-yellow-200 text-yellow-900',
      rulesHeader: 'bg-yellow-100 text-yellow-600',
      rulesTitle: 'text-yellow-800',
      card: 'ring-yellow-200',
      cardTitle: 'text-yellow-900',
      cardSubtext: 'text-yellow-700',
      accent: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700'
    }
  };

  const currentTheme = themes[kid?.theme || 'sky'] || themes.sky;

  // Exit Modal State
  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (kid) {
      checkAccessTime();
      // Check every minute
      const interval = setInterval(checkAccessTime, 60000);
      return () => clearInterval(interval);
    }
  }, [kid]);

  const checkAccessTime = () => {
    if (!kid?.start_time || !kid?.end_time) {
      setIsAccessAllowed(true);
      return;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = kid.start_time.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    
    const [endHour, endMinute] = kid.end_time.split(':').map(Number);
    const endTime = endHour * 60 + endMinute;

    if (currentTime < startTime) {
      setIsAccessAllowed(false);
      const startTimeDate = new Date(`2000-01-01T${kid.start_time}`);
      const startTimeStr = isNaN(startTimeDate.getTime()) ? kid.start_time : startTimeDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      setAccessMessage(`Activities start at ${startTimeStr}`);
    } else if (currentTime > endTime) {
      setIsAccessAllowed(false);
      setAccessMessage('Sleep time! Come back tomorrow');
    } else {
      setIsAccessAllowed(true);
      setAccessMessage('');
    }
  };

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    
    // Load from cache first
    const cachedKid = localStorage.getItem(`kid_${kidId}`);
    const cachedActivities = localStorage.getItem(`activities_${kidId}`);
    
    if (cachedKid) setKid(JSON.parse(cachedKid));
    if (cachedActivities) setActivities(JSON.parse(cachedActivities));

    if (navigator.onLine) {
      try {
        const now = new Date();
        const kidTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: kidTimezone,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: false
        });
        const parts = formatter.formatToParts(now);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
        const localDate = `${year}-${month}-${day}`;
        setToday(localDate);
        const localTime = hour * 60 + minute;

        // Fetch everything in parallel
        const [kidRes, actRes, rewardRes, quizRes, defsRes, logsRes, trackerRes] = await Promise.all([
          apiFetch(`/api/kids/${encodeURIComponent(kidId || '')}`),
          apiFetch(`/api/kids/${encodeURIComponent(kidId || '')}/activities?mode=kid&localDate=${localDate}&localTime=${localTime}&_t=${Date.now()}`),
          apiFetch(`/api/kids/${encodeURIComponent(kidId || '')}/reward-items`),
          apiFetch(`/api/kids/${encodeURIComponent(kidId || '')}/quizzes`),
          apiFetch(`/api/kids/${encodeURIComponent(kidId || '')}/behavior-definitions`),
          apiFetch(`/api/kids/${encodeURIComponent(kidId || '')}/behaviors`),
          apiFetch(`/api/kids/${encodeURIComponent(kidId || '')}/behavior-tracker`)
        ]);

        // Process Kid Data
        if (kidRes.ok) {
          const kidData = await safeJson(kidRes);
          if (kidData && kidData.kid) {
            setKid(kidData.kid);
            localStorage.setItem(`kid_${kidId}`, JSON.stringify(kidData.kid));
            
            const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (kidData.kid.timezone !== currentTz) {
              apiFetch(`/api/kids/${encodeURIComponent(kidId || '')}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timezone: currentTz })
              });
            }
          }
        }

        // Process Activities
        if (actRes.ok) {
          const actData = await safeJson(actRes);
          const allActivities = actData.activities || [];
          setActivities(allActivities);
          localStorage.setItem(`activities_${kidId}`, JSON.stringify(allActivities));
        }

        // Process Rewards
        if (rewardRes.ok) {
          const rewardData = await safeJson(rewardRes);
          setRewardItems(rewardData.items || []);
        }

        // Process Quizzes
        if (quizRes.ok) {
          const quizData = await safeJson(quizRes);
          setQuizzes(quizData.quizzes || []);
        }

        // Process Behavior Definitions
        if (defsRes.ok) {
          const defsData = await safeJson(defsRes);
          const definitions = defsData.definitions || [];
          const priorityMap: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
          const getPriority = (def: any) => {
            if (def.priority) return priorityMap[def.priority] || 2;
            const match = (def.description || '').match(/\[Priority: (High|Medium|Low)\]/);
            return match ? priorityMap[match[1]] : 2;
          };
          definitions.sort((a: any, b: any) => getPriority(b) - getPriority(a));
          setBehaviorDefinitions(definitions);
        }

        // Process Logs
        if (logsRes.ok) {
          const logsData = await safeJson(logsRes);
          setBehaviorLogs(logsData.behaviors || []);
        }

        // Process Tracker
        if (trackerRes.ok) {
          const trackerData = await safeJson(trackerRes);
          setBehaviorTracker(trackerData.tracker || []);
        }

      } catch (error) {
        console.error('Failed to fetch data', error);
      }
    }
    
    if (!silent) setIsLoading(false);
  }, [kidId]);

  const [showChatbot, setShowChatbot] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Check for pending rewards
    if (kid && kid.notes) {
      // More robust regex to capture the whole reward line
      const pendingMatches = [...kid.notes.matchAll(/\[PendingReward\]: (.*?)(?: \[Message\]: (.*)|$)/g)];
      if (pendingMatches.length > 0) {
        try {
          const lastMatch = pendingMatches[pendingMatches.length - 1];
          const jsonStr = lastMatch[1].trim();
          const reward = JSON.parse(jsonStr);
          
          if (!pendingReward || JSON.stringify(reward) !== JSON.stringify(pendingReward)) {
            setPendingReward(reward);
            if (!showRewardModal) {
              const rewardId = reward.timestamp || Date.now();
              const dismissedKey = `dismissed_reward_${kidId}_${rewardId}`;
              if (!localStorage.getItem(dismissedKey)) {
                setShowRewardModal(true);
                triggerCelebration();
              }
            }
          }
        } catch (e) {
          console.error("Failed to parse pending reward", e);
        }
      } else {
        setShowRewardModal(false);
        setPendingReward(null);
      }
    }

    // Check for new parent message with persistence
    if (kid && kid.parent_message) {
      const lastSeen = localStorage.getItem(`last_seen_message_${kidId}`);
      if (kid.parent_message !== lastSeen) {
        console.log('New parent message detected, triggering celebration');
        triggerCelebration();
        localStorage.setItem(`last_seen_message_${kidId}`, kid.parent_message);
      }
    } else if (kid) {
      localStorage.removeItem(`last_seen_message_${kidId}`);
    }
  }, [kid, kidId, triggerCelebration, pendingReward, showRewardModal]);

  useEffect(() => {
    // Set up socket connection
    const socket = io(window.location.origin);
    
    if (kidId) {
      socket.emit('join_kid_room', kidId);
    }

    socket.on('data_updated', (data) => {
      console.log('Received data_updated event:', data);
      if (data.kidId === kidId) {
        fetchData(true);
      }
    });

    // Refresh data every 10 seconds
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        fetchData(true);
      }
    }, 10000);

    // Also refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        fetchData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (kidId) {
        socket.emit('leave_kid_room', kidId);
      }
      socket.disconnect();
    };
  }, [fetchData, kidId]);

  const handleToggleStatus = async (activity: Activity) => {
    // Kids cannot uncheck completed activities
    if (activity.status === 'completed') return;

    const newStatus: 'completed' = 'completed';
    
    // Optimistic update for activities
    const now = new Date().toISOString();
    const updatedActivities = activities.map(a => 
      a.id === activity.id ? { ...a, status: newStatus, completed_at: now } : a
    );
    setActivities(updatedActivities);
    localStorage.setItem(`activities_${kidId}`, JSON.stringify(updatedActivities));
    
    // Optimistic update for kid's reward balance
    if (kid && newStatus === 'completed') {
      const rewardQty = kid.reward_quantity || 0; // Default to 0 if not set
      const updatedKid = { ...kid, reward_balance: (kid.reward_balance || 0) + rewardQty };
      setKid(updatedKid);
      localStorage.setItem(`kid_${kidId}`, JSON.stringify(updatedKid));
    }

    if (selectedActivity && selectedActivity.id === activity.id) {
      setSelectedActivity({ ...selectedActivity, status: newStatus, completed_at: now });
    }

    if (navigator.onLine) {
      try {
        const res = await apiFetch(`/api/activities/${encodeURIComponent(activity.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...activity,
            activityType: activity.activity_type,
            repeatFrequency: activity.repeat_frequency,
            timeOfDay: activity.time_of_day,
            imageUrl: activity.image_url,
            dueDate: activity.due_date,
            status: newStatus,
          }),
        });
        
        if (!res.ok) {
          throw new Error('Failed to update status');
        }
        
        // Refresh data from server to account for max incomplete limit
        await fetchData(true);
      } catch (error) {
        console.error('Failed to update status', error);
        // Revert on error if online
        fetchData(true);
      }
    } else {
      // Offline: Status updated locally
      console.log('Offline: Status updated locally');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('kid_session');
    navigate('/?mode=kid');
  };

  const confirmReward = async () => {
    if (!kid) return;
    try {
        if (pendingReward) {
          const rewardId = pendingReward.timestamp || JSON.stringify(pendingReward);
          localStorage.setItem(`dismissed_reward_${kidId}_${rewardId}`, 'true');
        }
        const res = await apiFetch(`/api/kids/${encodeURIComponent(kid.id)}/confirm-reward`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reward_id: 'dummy' })
        });
        if (res.ok) {
            setShowRewardModal(false);
            fetchData(true); // refresh
        } else {
            console.error('Failed to confirm reward');
        }
    } catch (e) {
        console.error('Error confirming reward', e);
    }
  };


  if (isLoading) {
    return (
      <div className={`flex h-screen items-center justify-center ${currentTheme.bg}`}>
        <div className="h-32 w-32 animate-bounce rounded-full bg-white p-6 shadow-xl">
          <Star className="h-full w-full text-yellow-400" />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-screen ${currentTheme.bg} font-sans pb-12`} style={currentTheme.bgStyle}>
      {/* Global Header */}
      <header className={`sticky top-0 z-50 w-full border-b border-slate-200 ${currentTheme.header} shadow-sm`}>
        <div className="w-full flex h-12 items-center px-4 relative">
          <div className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded ${kid?.theme === 'space' ? 'bg-blue-600' : 'bg-white/20'} text-white shadow-sm`}>
              <Lightbulb className="h-4 w-4" />
            </div>
            <span className={`text-lg font-bold tracking-tight text-white hidden sm:inline`}>Visual Steps</span>
          </div>

          {/* Centered Child Profile Card removed */}

          <div className="ml-auto flex items-center gap-3">
            {isOffline && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700 border border-amber-200">
                <WifiOff className="h-3 w-3" />
                OFFLINE MODE
              </div>
            )}
            
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
              <button 
                onClick={() => setActiveTab('rewards')}
                className="rounded bg-white/30 px-2 py-1 hover:bg-white/40 transition-colors text-[10px] uppercase"
                title="View available rewards"
              >
                Available Rewards
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowChatbot(!showChatbot)}
                className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase text-white transition-colors ${showChatbot ? 'bg-white/40' : 'bg-white/20 hover:bg-white/30'}`}
                title="Chat with Buddy"
              >
                <MessageSquare className="h-3 w-3" />
                <span className="hidden sm:inline">Buddy Chat</span>
              </button>
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-1 rounded bg-white/20 px-2 py-1 text-[10px] font-bold uppercase text-white hover:bg-white/30 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-3 w-3" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-3">
        {!isAccessAllowed ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className={`mb-3 rounded-full ${currentTheme.rulesHeader} p-4 shadow-md`}>
              <Clock className={`h-8 w-8 ${currentTheme.accent}`} />
            </div>
            <h2 className={`text-xl font-bold ${currentTheme.cardTitle} mb-1`}>{accessMessage}</h2>
            <p className="text-sm text-slate-500">Ask your parent if you need to see your activities.</p>
          </div>
        ) : selectedActivity ? (
          <ActivityDetailModal 
            activity={selectedActivity}
            onClose={() => setSelectedActivity(null)}
            onToggleStatus={handleToggleStatus}
            rewardType={kid?.reward_type}
            canPrint={kid?.can_print}
            showToggleOnly={true}
          />
        ) : viewingStoryId ? (
          <SocialStoryModal 
            storyId={viewingStoryId} 
            onClose={() => setViewingStoryId(null)} 
          />
        ) : (
          <div className="space-y-3">
            {/* Parent Message - If exists */}
            {kid?.parent_message && (
              <div className={`rounded-xl p-4 ${currentTheme.rules} border-l-4 border-blue-500 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden group`}>
                {/* Decoration for celebration */}
                <div className="absolute top-0 right-0 p-2">
                  <div className="relative">
                    <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                    <div className="absolute top-0 left-0 h-5 w-5 animate-ping rounded-full bg-yellow-400 opacity-20"></div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-inner">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-2">
                      <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                      Special Message from Parent
                    </p>
                    <p className="text-lg font-black text-slate-800 italic tracking-tight leading-snug break-words">
                      "{kid.parent_message}"
                    </p>
                  </div>
                </div>

                <div className="absolute -bottom-2 -left-2 opacity-5">
                  <Trophy className="h-16 w-16 text-blue-500 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                </div>
              </div>
            )}

            {/* Dashboard Banner - Full Width */}
            <div className={`flex flex-col sm:flex-row items-center justify-between rounded-xl ${currentTheme.banner} p-4 shadow-sm ring-1 gap-4`}>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-3">
                  {kid?.avatar ? (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm">
                      <img src={kid.avatar} alt={kid.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xl font-bold shadow-sm ${currentTheme.accent}`}>
                      {kid?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <h1 className={`text-3xl font-black ${currentTheme.bannerText} leading-tight`}>Hi, {kid?.name || 'there'}! 👋</h1>
                    <div className="flex items-center gap-1.5">
                      <Clock className={`h-3.5 w-3.5 ${currentTheme.bannerSubtext}`} />
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${currentTheme.bannerSubtext}`}>
                        {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-8 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-8">
                <div className="flex flex-col items-center sm:items-end">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${currentTheme.bannerSubtext} opacity-60 mb-0.5`}>Done Today</span>
                  <div className={`flex items-center gap-1.5 text-xl font-black ${currentTheme.bannerText}`}>
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    {completedTodayCount}
                  </div>
                </div>
                <div className="flex flex-col items-center sm:items-end">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${currentTheme.bannerSubtext} opacity-60 mb-0.5`}>Total {kid?.reward_type || 'Rewards'}</span>
                  <div className={`flex items-center gap-1.5 text-xl font-black ${currentTheme.bannerText}`}>
                    <img src={rewardIcon} alt={kid?.reward_type} className="h-6 w-6 object-contain" referrerPolicy="no-referrer" />
                    {kid?.reward_balance || 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Tabs and View Toggle Area */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className={`flex rounded-lg border p-0.5 ${kid?.theme === 'space' ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                  <button
                    onClick={() => setActiveTab('todo')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      activeTab === 'todo' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : `${kid?.theme === 'space' ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'}`
                    }`}
                    title="View activities to be done"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    📝 To Be Done
                  </button>
                  <button
                    onClick={() => setActiveTab('completed')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      activeTab === 'completed' 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : `${kid?.theme === 'space' ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'}`
                    }`}
                    title="View completed activities"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    ✅ Completed
                  </button>
                  <button
                    onClick={() => setActiveTab('rewards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      activeTab === 'rewards' 
                        ? 'bg-amber-500 text-white shadow-sm' 
                        : `${kid?.theme === 'space' ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'}`
                    }`}
                    title="View available rewards"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    🎁 Rewards
                  </button>
                </div>
              </div>

              {/* Dashboard Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Left Column: Activities / Main Content (2/3 width on desktop) */}
                <div className="lg:col-span-2 w-full min-w-0">
                  <div className="flex flex-col gap-6">
                    {activeTab === 'rewards' ? (
                      <div className="space-y-6">
                        <div className={`rounded-xl p-6 shadow-sm ring-1 ${currentTheme.banner} flex flex-col items-center text-center`}>
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 shadow-inner">
                            <img src={rewardIcon} alt={kid?.reward_type} className="h-10 w-10 drop-shadow-md" />
                          </div>
                          <h2 className={`text-2xl font-black ${currentTheme.bannerText}`}>Available Rewards</h2>
                          <p className={`mt-1 font-medium ${currentTheme.bannerSubtext}`}>
                            You have <span className="text-emerald-600 font-bold">{kid?.reward_balance || 0}</span> {formatReward(kid?.reward_type, kid?.reward_balance || 0)}!
                          </p>
                        </div>

                        <div className="space-y-6">
                          {Object.entries(rewardItems.reduce((acc, item) => {
                            const location = item.location || 'General';
                            if (!acc[location]) acc[location] = [];
                            acc[location].push(item);
                            return acc;
                          }, {} as Record<string, RewardItem[]>)).map(([location, items]) => (
                            <div key={location} className="space-y-3">
                              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{location}</h3>
                              {items.map((item) => (
                                <div 
                                  key={item.id} 
                                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                                    (kid?.reward_balance || 0) >= item.cost 
                                      ? `border-slate-100 ${kid?.theme === 'space' ? 'bg-slate-900' : 'bg-white'}` 
                                      : `border-slate-50 ${kid?.theme === 'space' ? 'bg-slate-900/40' : 'bg-slate-50'} opacity-60`
                                  }`}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                      {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                                          <Trophy className="h-6 w-6" />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <h4 className={`font-bold ${currentTheme.cardTitle}`}>{item.name}</h4>
                                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                                        Cost: {item.cost} {formatReward(kid?.reward_type, item.cost)}
                                      </p>
                                      {(kid?.reward_balance || 0) < item.cost && (
                                        <p className={`mt-0.5 text-[10px] font-bold ${currentTheme.cardSubtext} uppercase`}>
                                          Need {item.cost - (kid?.reward_balance || 0)} more
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                          {rewardItems.length === 0 && (
                            <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${kid?.theme === 'space' ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                              <Sparkles className="h-12 w-12 opacity-20 mx-auto mb-4" />
                              <p className="font-bold">No rewards in the catalog yet!</p>
                              <p className="text-sm mt-1">Ask your parent to add some prizes.</p>
                            </div>
                          )}
                        </div>

                        <div className={`bg-blue-50 p-4 rounded-xl border border-blue-100 text-center`}>
                          <p className="text-blue-800 font-bold">
                            Ask your parent to buy these rewards for you! 🎁
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full">
                        {(() => {
                          const filtered = activities.filter(a => {
                            if (activeTab === 'todo') {
                              return a.status !== 'completed' && a.due_date === today;
                            } else {
                              if (a.status !== 'completed') return false;
                              if (!a.completed_at) return a.due_date === today;
                              const completedDate = a.completed_at.split('T')[0];
                              return completedDate === today;
                            }
                          });
                          
                          if (filtered.length === 0) {
                            return (
                              <div className={`py-12 text-center rounded-xl border-2 border-dashed ${kid?.theme === 'space' ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                                <p className="font-bold">No activities yet!</p>
                                <p className="text-sm mt-1">Check back later for more fun things to do.</p>
                              </div>
                            );
                          }

                          const timeOfDayOrder = ['Morning', 'Afternoon', 'Evening', 'Night', 'Any time'];
                          const grouped = timeOfDayOrder.reduce((acc, time) => {
                            const items = filtered.filter(a => (a.time_of_day || 'Any time') === time);
                            if (items.length > 0) {
                              acc.push({ time, items });
                            }
                            return acc;
                          }, [] as { time: string, items: Activity[] }[]);

                          const others = filtered.filter(a => !timeOfDayOrder.includes(a.time_of_day || 'Any time'));
                          if (others.length > 0) {
                            grouped.push({ time: 'Other', items: others });
                          }

                          const timeIcons: Record<string, any> = {
                            'Morning': <Sun className="h-4 w-4 text-amber-500" />,
                            'Afternoon': <CloudSun className="h-4 w-4 text-orange-400" />,
                            'Evening': <Moon className="h-4 w-4 text-indigo-400" />,
                            'Night': <Sparkles className="h-4 w-4 text-slate-400" />,
                            'Any time': <Clock className="h-4 w-4 text-slate-400" />,
                            'Other': <Clock className="h-4 w-4 text-slate-400" />
                          };

                          return (
                            <div className="space-y-6">
                              {grouped.map((group) => (
                                <div key={group.time} className="space-y-3">
                                  <div className="flex items-center gap-2 px-1">
                                    {timeIcons[group.time]}
                                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${currentTheme.cardSubtext}`}>
                                      {group.time}
                                    </h3>
                                    <div className={`h-px flex-1 ${kid?.theme === 'space' ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                  </div>
                                  <div className="flex flex-col gap-3">
                                    {group.items.map((activity) => (
                                      <Card 
                                        key={activity.id} 
                                        className={`transition-all border-none ring-1 ${currentTheme.card} ${activity.status === 'completed' ? 'bg-slate-50 opacity-75 cursor-default' : (kid?.theme === 'space' ? 'bg-slate-900' : 'bg-white') + ' cursor-pointer hover:shadow-sm'}`}
                                        onClick={() => {
                                          if (activity.status !== 'completed') {
                                            setSelectedActivity(activity);
                                          }
                                        }}
                                      >
                                        <CardContent className="p-2.5 flex items-start gap-2.5">
                                          <div 
                                            className={`mt-0.5 flex-shrink-0 rounded-full transition-colors ${
                                              activity.status === 'completed' ? 'text-emerald-500' : 'text-slate-300'
                                            }`}
                                          >
                                            {activity.status === 'completed' ? (
                                              <CheckCircle className="h-6 w-6" />
                                            ) : (
                                              <Circle className="h-6 w-6" />
                                            )}
                                          </div>
                                          
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <h3 className={`font-black text-lg truncate ${activity.status === 'completed' ? 'text-slate-400 line-through' : currentTheme.cardTitle}`}>
                                                {activity.activity_type}
                                              </h3>
                                              {activity.link?.includes('/social-stories/view/') && (
                                                <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600`}>
                                                  <Eye className="h-3 w-3" />
                                                </div>
                                              )}
                                            </div>
                                            
                                            {activity.description && (
                                              <p className={`mt-0.5 text-sm font-medium ${currentTheme.cardSubtext} line-clamp-2 leading-tight`}>
                                                {activity.description}
                                              </p>
                                            )}

                                            <div className={`mt-2 flex items-center gap-3 text-[11px] font-bold ${currentTheme.bannerSubtext} uppercase tracking-wider`}>
                                              {activity.due_date && activity.due_date !== today && (
                                                <div className="flex items-center gap-1">
                                                  <Calendar className="h-3 w-3" />
                                                  {activity.due_date}
                                                </div>
                                              )}
                                              {activity.steps && activity.steps.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                  <LayoutList className="h-3 w-3" />
                                                  {activity.steps.length} steps
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {activity.image_url && !activity.description && (
                                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                                              <img 
                                                key={activity.image_url}
                                                src={activity.image_url} 
                                                alt={activity.activity_type} 
                                                className="aspect-square w-full object-cover"
                                                referrerPolicy="no-referrer"
                                              />
                                            </div>
                                          )}
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Sidebar (1/3 width on desktop, stacks on mobile) */}
                <aside className="lg:col-span-1 flex flex-col gap-8 lg:sticky lg:top-8 self-start">
                  
                  {/* Right Bottom: Rules */}
                  {kid?.rules && (
                    <div className={`rounded-2xl border ${currentTheme.rules} p-6 shadow-sm ring-1 ring-black/5`}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${currentTheme.rulesHeader} shadow-sm`}>
                          <Lightbulb className="h-5 w-5" />
                        </div>
                        <h3 className={`text-lg font-black ${currentTheme.rulesTitle} uppercase tracking-wider`}>My Progress</h3>
                      </div>
                      <div className="space-y-4">
                        {behaviorDefinitions.filter(def => def.is_active !== false).length > 0 ? (
                          behaviorDefinitions
                            .filter(def => def.is_active !== false)
                            .map((def) => {
                            const timeMatch = (def.description || '').match(/^\[Time: (\d{2}):(\d{2}):(\d{2})\](?:\[Priority: (High|Medium|Low)\])?(?:\[Goal: (\d+)\])? (.*)$/s);
                            const priority = def.priority || (timeMatch && timeMatch[4] ? timeMatch[4] : 'Medium');
                            const goalValue = def.goal || (timeMatch && timeMatch[5] ? parseInt(timeMatch[5]) : 1);
                            const targetTime = def.target_time || (timeMatch ? `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}` : null);
                            const displayDesc = timeMatch ? timeMatch[6] : def.description;
                            
                            // Count actual hits/logs for this behavior
                            const trackerEntry = behaviorTracker.find(t => t.definition_id === def.id);
                            const currentHits = trackerEntry ? trackerEntry.points : 0;
                            const remarks = trackerEntry ? trackerEntry.remarks : '';
                            // Reset count logic
                            // Or just continuous total until they reach goal N times?
                            // Let's assume progress is towards the goal.
                            const progress = Math.min(100, (currentHits / goalValue) * 100);
                            
                            return (
                              <div key={def.id} className="space-y-3 p-3 rounded-lg bg-white/50 border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                {remarks && (
                                  <p className="text-xs text-brand-700 font-bold italic animate-in fade-in slide-in-from-top-1 duration-500">
                                    {remarks}
                                  </p>
                                )}
                                <div className="flex justify-between items-center">
                                  <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-1000 ease-out-back ${
                                        def.type === 'desired' ? 'bg-emerald-500' : 'bg-rose-500'
                                      }`}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-black text-emerald-600 ml-3 shrink-0">
                                    {Math.round(progress)}%
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[16px] font-black text-slate-700 uppercase tracking-tight">
                                    {displayDesc || def.name}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          kid.rules.split('\n').filter(r => r.trim()).map((rule, idx) => (
                          <div key={idx} className="flex gap-3 items-start group">
                            <div className={`mt-2 h-2 w-2 rounded-full shrink-0 ${currentTheme.accent} group-hover:scale-125 transition-transform`} />
                            <p className="text-sm sm:text-base font-medium leading-relaxed break-words">
                              {rule}
                            </p>
                          </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}


                </aside>

              </div>
            </div>
          </div>
        )}
        {showRewardModal && pendingReward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-500 overflow-hidden relative border-4 border-emerald-100">
                  {/* Ribbon decoration */}
                  <div className="absolute -top-1 -right-1 overflow-hidden h-24 w-24">
                      <div className="bg-emerald-500 text-white font-black text-xs py-1 w-32 -rotate-45 translate-x-[-28px] translate-y-[24px] shadow-sm uppercase tracking-widest">
                          Goal Reached
                      </div>
                  </div>
                  
                  {/* Decorative background elements (crackers/sprinkles) */}
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                      <Sparkles key={i} className={`absolute text-emerald-500 animate-pulse`} 
                        style={{ 
                          top: `${Math.random() * 80}%`, 
                          left: `${Math.random() * 80}%`,
                          animationDelay: `${i * 0.5}s`,
                          transform: `scale(${0.5 + Math.random()}) rotate(${Math.random() * 360}deg)`
                        }} 
                      />
                    ))}
                  </div>

                  <div className="h-24 w-24 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-6 shadow-inner ring-8 ring-emerald-50/50">
                      <Trophy className="h-12 w-12 animate-bounce" />
                  </div>
                  
                  <h2 className="text-3xl font-black text-slate-800 mb-2 leading-tight">Amazing Job!</h2>
                  <p className="text-slate-600 mb-8 font-medium">
                    {(() => {
                      const rewardTypeRaw = kid?.reward_type || 'stars';
                      const rewardType = pendingReward.amount === 1 
                        ? (rewardTypeRaw.toLowerCase().endsWith('s') ? rewardTypeRaw.slice(0, -1) : rewardTypeRaw)
                        : (rewardTypeRaw.toLowerCase().endsWith('s') ? rewardTypeRaw : rewardTypeRaw + 's');
                      
                      let behaviorList = pendingReward.definition_name || 'Behavior';
                      if (pendingReward.behaviors && Array.isArray(pendingReward.behaviors)) {
                        const names = pendingReward.behaviors.map((b: any) => b.name);
                        if (names.length === 1) {
                          behaviorList = names[0];
                        } else if (names.length === 2) {
                          behaviorList = `${names[0]} and ${names[1]}`;
                        } else {
                          const last = names.pop();
                          behaviorList = `${names.join(', ')} and ${last}`;
                        }
                      }

                      return (
                        <>
                          You have earned <span className="text-emerald-600 font-black">{pendingReward.amount} {rewardType}</span> for being <span className="text-emerald-600 font-black italic">{behaviorList}</span>.
                          <span className="block mt-2 font-bold text-slate-500 text-sm italic">The {rewardType} have been added to your balance!</span>
                        </>
                      );
                    })()}
                  </p>
                  
                  <button
                      onClick={confirmReward}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black py-4 px-8 rounded-2xl transition-all shadow-lg hover:shadow-emerald-200/50 active:scale-95 text-lg uppercase tracking-wider"
                  >
                      Yay! Awesome!
                  </button>
              </div>
          </div>
        )}
        {showChatbot && kid && (
          <div className="fixed bottom-4 right-4 z-[60] w-[350px] max-w-[calc(100vw-32px)]">
            <ChatbotComponent 
              kidId={kid.id}
              kidName={kid.name}
              chatbotName={kid.chatbot_name}
              activities={activities}
              rewardBalance={kid.reward_balance || 0}
              rewardType={kid.reward_type || 'stars'}
              rewardItems={rewardItems}
              theme={kid.theme}
              location={location}
              timezone={timezone}
              kidProfile={{
                dob: kid.dob,
                gradeLevel: kid.grade_level,
                hobbies: kid.hobbies,
                interests: kid.interests,
                strengths: kid.strengths,
                weaknesses: kid.weaknesses,
                sensoryIssues: kid.sensory_issues,
                behavioralIssues: kid.behavioral_issues,
                notes: kid.notes,
                therapies: kid.therapies
              }}
            />
            <button 
              onClick={() => setShowChatbot(false)}
              className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg border-2 border-white hover:bg-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </main>

    </div>
  );
}
