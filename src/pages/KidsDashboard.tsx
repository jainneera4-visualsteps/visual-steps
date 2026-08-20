import { apiFetch, safeJson } from '../utils/api';
import { io } from 'socket.io-client';
import { formatReward, rewardImages } from '../utils/rewardUtils';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Star, Lightbulb, CheckCircle, Circle, Clock, LayoutList, WifiOff, Sun, CloudSun, Moon, Sparkles, LogOut, Trophy, Eye, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '../components/Card';
import { ActivityDetailModal } from '../components/ActivityDetailModal';
import { getZonedTime, formatInTimezone, convertDateToTimeZone } from '../utils/dateUtils';
import { SocialStoryModal } from '../components/SocialStoryModal';
import { countActivitiesCompletedOnDate } from '../utils/activityCompletion';

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
  completion_date?: string;
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
  const [kid, setKid] = useState<Kid | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [pendingReward] = useState<any>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);

  const [viewingStoryId, setViewingStoryId] = useState<string | null>(null);
  const [isAccessAllowed, setIsAccessAllowed] = useState(true);
  const [accessMessage, setAccessMessage] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [activeTab, setActiveTab] = useState<'todo' | 'completed' | 'rewards'>('todo');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);

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
  const rewardIcon = kid?.reward_type ? (rewardImages[kid.reward_type] || rewardImages['Penny']) : rewardImages['Penny'];
  
  const themes: Record<string, any> = {
    sky: {
      bg: 'bg-gradient-to-br from-sky-50 via-indigo-50/50 to-amber-50/60',
      header: 'bg-gradient-to-r from-sky-500 via-blue-500 to-violet-500 border-white/40',
      banner: 'bg-white/90 ring-sky-200/80 border-2 border-white',
      bannerText: 'text-slate-800',
      bannerSubtext: 'text-slate-400',
      rules: 'bg-amber-50/95 border-amber-300 text-amber-950',
      rulesHeader: 'bg-yellow-100 text-yellow-600',
      rulesTitle: 'text-yellow-800',
      card: 'ring-indigo-100 border-2 border-white shadow-indigo-200/25',
      cardTitle: 'text-slate-800',
      cardSubtext: 'text-slate-500',
      accent: 'text-sky-600',
      button: 'bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-600 hover:to-violet-600'
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
      isDark: true,
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
  const isDarkTheme = currentTheme.isDark === true;

  // Exit Modal State
  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);

  const safeLocalStorageGet = (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`KidsDashboard: localStorage.getItem failed for ${key}`, error);
      return null;
    }
  };

  const shrinkKidCacheValue = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object') return null;
      const reduced = { ...parsed } as Record<string, any>;
      [
        'parent_message',
        'hobbies',
        'interests',
        'strengths',
        'weaknesses',
        'sensory_issues',
        'behavioral_issues',
        'therapies'
      ].forEach((field) => {
        if (field in reduced) {
          delete reduced[field];
        }
      });
      return JSON.stringify(reduced);
    } catch {
      return null;
    }
  };

  const safeLocalStorageSet = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      return;
    } catch (error: any) {
      console.warn(`KidsDashboard: localStorage.setItem failed for ${key}`,
        { error, valueSize: value.length, key });

      // Attempt best-effort cleanup when quota is exceeded, then retry once
      try {
        const isQuota = error && (
          error.name === 'QuotaExceededError' ||
          error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          error.code === 22 ||
          error.code === 1014 ||
          (typeof error.message === 'string' && error.message.toLowerCase().includes('quota'))
        );

        if (isQuota) {
          const evictLargeCaches = () => {
            try {
              Object.keys(localStorage).forEach(k => {
                if (k.startsWith('activities_') || k.startsWith('all_activities_')) {
                  try { localStorage.removeItem(k); } catch (e) {}
                }
              });
            } catch (e) {
              // ignore iteration errors
            }
          };

          if (key.startsWith('kid_')) {
            const kidIdFromKey = key.slice(4);
            try { localStorage.removeItem(`activities_${kidIdFromKey}`); } catch (e) {}
            try { localStorage.removeItem(`all_activities_${kidIdFromKey}`); } catch (e) {}
          }

          evictLargeCaches();

          if (key.startsWith('kid_')) {
            const trimmedValue = shrinkKidCacheValue(value);
            if (trimmedValue && trimmedValue.length < value.length) {
              try {
                localStorage.setItem(key, trimmedValue);
                console.warn(`KidsDashboard: Stored trimmed kid cache for ${key} after quota error`, { originalSize: value.length, trimmedSize: trimmedValue.length });
                return;
              } catch (e2) {
                console.warn('KidsDashboard: retry with trimmed kid cache failed', e2);
              }
            }
          }

          try {
            localStorage.setItem(key, value);
            return;
          } catch (e2) {
            console.warn('KidsDashboard: retry after localStorage cleanup failed', e2);
          }
        }
      } catch (cleanupErr) {
        console.warn('KidsDashboard: localStorage cleanup attempt threw', cleanupErr);
      }
    }
  };

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

    const zoned = getZonedTime(kid?.timezone);
    const currentTime = zoned.totalMinutes;
    
    const [startHour, startMinute] = kid.start_time.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    
    const [endHour, endMinute] = kid.end_time.split(':').map(Number);
    const endTime = endHour * 60 + endMinute;

    if (currentTime < startTime) {
      setIsAccessAllowed(false);
      const startTimeStr = formatInTimezone(new Date(zoned.year, zoned.month - 1, zoned.day, startHour, startMinute), kid.timezone, { hour: 'numeric', minute: '2-digit' });
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
    const cachedKid = safeLocalStorageGet(`kid_${kidId}`);
    const cachedActivities = safeLocalStorageGet(`activities_${kidId}`);
    let cachedKidData: Kid | null = null;
    
    if (cachedKid) {
      try {
        cachedKidData = JSON.parse(cachedKid);
        setKid(cachedKidData);
      } catch (error) {
        console.warn('KidsDashboard: Failed to parse cached kid data', error, cachedKid);
      }
    }
    if (cachedActivities) {
      try {
        const parsedActivities = JSON.parse(cachedActivities);
        setActivities(parsedActivities);
        setCompletedTodayCount(countActivitiesCompletedOnDate(
          parsedActivities,
          getZonedTime(cachedKidData?.timezone).isoDate,
          cachedKidData?.timezone,
        ));
      } catch (error) {
        console.warn('KidsDashboard: Failed to parse cached activities', error, cachedActivities);
      }
    }

    if (navigator.onLine) {
      try {
        const zoned = getZonedTime(kid?.timezone);
        const localDate = zoned.isoDate;
        setToday(localDate);
        const localTime = zoned.totalMinutes;

        console.log('KidsDashboard: fetchData start', {
          kidId,
          kidTimezone: kid?.timezone,
          localDate,
          localTime,
          cachedKid: !!cachedKid,
          cachedActivities: !!cachedActivities,
        });

        // Fetch everything in parallel - using a wrapper to prevent one failure from breaking all
        const fetchWrapper = async (p: Promise<Response>, name: string) => {
          try {
            const res = await p;
            console.log(`KidsDashboard: ${name} fetch status`, { status: res.status, statusText: res.statusText, url: res.url });
            return res;
          } catch (e) {
            console.error(`KidsDashboard: Individual fetch failed (${name}):`, e);
            // Return a mock "failed" response instead of throwing
            return { ok: false, status: 0, statusText: 'Network Error', url: '', json: async () => ({ error: 'Network Error' }) } as any as Response;
          }
        };

        const [kidRes, actRes, rewardRes] = await Promise.all([
          fetchWrapper(apiFetch(`/api/kids/${encodeURIComponent(kidId || '')}`), 'kid'),
          fetchWrapper(apiFetch(`/api/kids/${encodeURIComponent(kidId || '')}/activities?mode=kid&localDate=${localDate}&localTime=${localTime}&_t=${Date.now()}`), 'activities'),
          fetchWrapper(apiFetch(`/api/kids/${encodeURIComponent(kidId || '')}/reward-items?onlyActive=true`), 'rewards')
        ]);

        // Process Kid Data
        if (kidRes.ok) {
          const kidData = await safeJson(kidRes);
          if (kidData && kidData.kid) {
            setKid(kidData.kid);
            safeLocalStorageSet(`kid_${kidId}`, JSON.stringify(kidData.kid));
          }
        }

        // Process Activities
        if (actRes.ok) {
          const actData = await safeJson(actRes);
          const allActivities = Array.isArray(actData)
            ? actData
            : actData.activities || actData.data?.activities || actData.data || [];
          if (!Array.isArray(allActivities)) {
            console.warn('KidsDashboard: Unexpected activities payload shape:', actData);
          }
          const normalizedActivities = Array.isArray(allActivities) ? allActivities : [];
          console.log('KidsDashboard: Loaded activities', normalizedActivities.length, normalizedActivities);
          setActivities(normalizedActivities);
          if (typeof actData.completedTodayCount === 'number') {
            setCompletedTodayCount(actData.completedTodayCount);
          } else {
            const fallbackCount = countActivitiesCompletedOnDate(
              normalizedActivities,
              localDate,
              kid?.timezone,
            );
            setCompletedTodayCount(fallbackCount);
          }
          safeLocalStorageSet(`activities_${kidId}`, JSON.stringify(normalizedActivities));
        }

        // Process Rewards
        if (rewardRes.ok) {
          const rewardData = await safeJson(rewardRes);
          setRewardItems(rewardData.items || []);
        }

      } catch (error: any) {
        console.error('KidsDashboard: Failed to fetch data', {
          error,
          message: error?.message,
          stack: error?.stack,
          kidId
        });
      }
    }
    
    if (!silent) setIsLoading(false);
  }, [kidId]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Check for new parent message with persistence
    if (kid && kid.parent_message) {
      const lastSeen = localStorage.getItem(`last_seen_message_${kidId}`);
      if (kid.parent_message !== lastSeen) {
        safeLocalStorageSet(`last_seen_message_${kidId}`, kid.parent_message);
      }
    } else if (kid) {
      localStorage.removeItem(`last_seen_message_${kidId}`);
    }
  }, [kid, kidId]);

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
      a.id === activity.id ? { ...a, status: newStatus, completion_date: now } : a
    );
    setActivities(updatedActivities);
    setCompletedTodayCount(count => count + 1);
    safeLocalStorageSet(`activities_${kidId}`, JSON.stringify(updatedActivities));
    
    // Optimistic update for kid's reward balance
    if (kid && newStatus === 'completed') {
      const rewardQty = kid.reward_quantity || 0; // Default to 0 if not set
      const updatedKid = { ...kid, reward_balance: (kid.reward_balance || 0) + rewardQty };
      setKid(updatedKid);
      safeLocalStorageSet(`kid_${kidId}`, JSON.stringify(updatedKid));
    }

    if (selectedActivity && selectedActivity.id === activity.id) {
      setSelectedActivity({ ...selectedActivity, status: newStatus, completion_date: now });
    }

    if (navigator.onLine) {
      try {
        const targetTimezone = kid?.timezone || timezone;
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
            completedAt: convertDateToTimeZone(new Date(), targetTimezone),
            createdAt: convertDateToTimeZone(activity.created_at || new Date(), targetTimezone),
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

  const confirmReward = () => setShowRewardModal(false);

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
    <div className={`child-page w-full min-h-screen ${currentTheme.bg} ${isDarkTheme ? 'kid-theme-dark' : ''} font-display pb-12`} style={currentTheme.bgStyle}>
      {/* Global Header */}
      <header className={`sticky top-0 z-50 w-full border-b border-slate-200 ${currentTheme.header} shadow-sm`}>
        <div className="w-full flex h-12 items-center px-4 relative">
          <div className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded ${isDarkTheme ? 'bg-blue-600' : 'bg-white/20'} text-white shadow-sm`}>
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

            <div className="flex items-center gap-2">

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
        {selectedActivity && isAccessAllowed ? (
          <ActivityDetailModal 
            activity={selectedActivity}
            onClose={() => setSelectedActivity(null)}
            onToggleStatus={handleToggleStatus}
            rewardType={kid?.reward_type}
            canPrint={kid?.can_print}
            showToggleOnly={true}
            timezone={kid?.timezone}
          />
        ) : viewingStoryId && isAccessAllowed ? (
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
                    <p className={`text-[10px] font-black uppercase tracking-widest ${currentTheme.cardSubtext} mb-1 flex items-center gap-2`}>
                      <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                      Special Message from Parent
                    </p>
                    <p className={`text-lg font-black ${currentTheme.cardTitle} italic tracking-tight leading-snug break-words`}>
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
            <div className={`flex flex-col sm:flex-row items-center justify-between rounded-3xl ${currentTheme.banner} p-4 shadow-lg shadow-indigo-200/20 ring-1 gap-4`}>
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
                        {formatInTimezone(currentTime, kid?.timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
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
              {isAccessAllowed && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className={`flex rounded-lg border p-0.5 ${isDarkTheme ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                    <button
                      onClick={() => setActiveTab('todo')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        activeTab === 'todo' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : `${isDarkTheme ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'}`
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
                          : `${isDarkTheme ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'}`
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
                          : `${isDarkTheme ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'}`
                      }`}
                      title="View available rewards"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      🎁 Rewards
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-6">
                    {!isAccessAllowed ? (
                      <div className={`p-8 rounded-2xl border-2 border-dashed ${isDarkTheme ? 'border-slate-700 bg-slate-900/80' : 'border-slate-200 bg-white/50'} text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500`}>
                        <div className={`mb-4 rounded-full ${currentTheme.rulesHeader} p-6 shadow-md animate-bounce`}>
                          <Clock className={`h-12 w-12 ${currentTheme.accent}`} />
                        </div>
                        <h2 className={`text-2xl font-black ${currentTheme.cardTitle} mb-2 tracking-tight`}>{accessMessage}</h2>
                        <p className={`${currentTheme.cardSubtext} font-medium max-w-xs`}>Ask your parent if you need to see your activities or want to keep playing!</p>
                      </div>
                    ) : activeTab === 'rewards' ? (
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
                              <h3 className={`text-sm font-bold ${currentTheme.cardSubtext} uppercase tracking-wider`}>{location}</h3>
                              {items.map((item) => (
                                <div 
                                  key={item.id} 
                                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                                    (kid?.reward_balance || 0) >= item.cost 
                                      ? `border-slate-100 ${isDarkTheme ? 'bg-slate-900' : 'bg-white'}`
                                      : `border-slate-50 ${isDarkTheme ? 'bg-slate-900/40' : 'bg-slate-50'} opacity-60`
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
                            <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${isDarkTheme ? 'border-slate-700 text-slate-300 bg-slate-900/70' : 'border-slate-200 text-slate-400'}`}>
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
                          const effectiveToday = today || getZonedTime(kid?.timezone).isoDate;
                          const filtered = activities.filter(a => {
                            if (activeTab === 'todo') {
                              return a.status !== 'completed' && a.due_date === effectiveToday;
                            }
                            if (activeTab === 'completed') {
                              return a.status === 'completed' && a.due_date === effectiveToday;
                            }
                            return false;
                          });
                          
                          if (filtered.length === 0) {
                            return (
                              <div className={`py-12 text-center rounded-xl border-2 border-dashed ${isDarkTheme ? 'border-slate-700 text-slate-300 bg-slate-900/70' : 'border-slate-200 text-slate-400'}`}>
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
                                  <div className="kid-section-heading flex items-center gap-2 px-1">
                                    {timeIcons[group.time]}
                                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${currentTheme.cardSubtext}`}>
                                      {group.time}
                                    </h3>
                                    <div className={`kid-section-divider h-px flex-1 ${isDarkTheme ? 'bg-slate-600' : 'bg-slate-200'}`} />
                                  </div>
                                  <div className="flex flex-col gap-3">
                                    {group.items.map((activity) => (
                                      <Card 
                                        key={activity.id} 
                                        className={`kid-activity-card transition-all border-none ring-1 ${currentTheme.card} ${activity.status === 'completed' ? (isDarkTheme ? 'kid-activity-card--completed bg-slate-900/75' : 'bg-slate-50') + ' opacity-75 cursor-default' : (isDarkTheme ? 'bg-slate-900' : 'bg-white') + ' cursor-pointer hover:shadow-sm'}`}
                                        onClick={() => {
                                          if (activity.status !== 'completed') {
                                            setSelectedActivity(activity);
                                          }
                                        }}
                                      >
                                        <CardContent className="p-2.5 flex items-start gap-2.5">
                                          <div 
                                            className={`mt-0.5 flex-shrink-0 rounded-full transition-colors ${
                                              activity.status === 'completed' ? 'text-emerald-500' : isDarkTheme ? 'text-sky-300' : 'text-slate-300'
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
                                              <h3 className={`font-black text-lg truncate ${activity.status === 'completed' ? (isDarkTheme ? 'text-slate-300' : 'text-slate-400') + ' line-through' : currentTheme.cardTitle}`}>
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
                      if (pendingReward.is_behavior_goal_reward) {
                        return (
                          <>
                            You have earned 1 <span className="text-emerald-600 font-black">{pendingReward.reward_type}</span> for reaching <span className="text-emerald-600 font-black">10 points</span> on your Daily Behavior Tracker!
                            <span className="block mt-2 font-bold text-slate-500 text-sm italic">The {pendingReward.reward_type} has been added to your balance!</span>
                          </>
                        );
                      }

                      if (pendingReward.is_special_reward) {
                        return (
                          <>
                            You have earned the reward item: <span className="text-emerald-600 font-black">{pendingReward.reward_item_name}</span> for reaching <span className="text-emerald-600 font-black">10 points</span> on your Daily Behavior Tracker!
                            <span className="block mt-2 font-bold text-slate-500 text-sm italic">This reward item has been added to your collection!</span>
                          </>
                        );
                      }

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
      </main>

      {/* Flying Tokens and Celebration Particles Layer */}
    </div>
  );
}
