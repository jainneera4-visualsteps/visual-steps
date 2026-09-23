import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import { LogOut, Menu, X, Lightbulb, ChevronDown, BookOpen, FileText, Gamepad2, Puzzle, Activity, TrendingUp, Facebook, Instagram, Mail, Newspaper, Users, Database, ShieldCheck, HelpCircle, Plus, Edit2, ShoppingCart, BellRing, Gift, Award, Lock } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Tooltip } from './ui/Tooltip';
import { ParentAssistant } from './ParentAssistant';
import { endGuestSession, isGuestSession } from '../guest/guestSession';
import { apiFetch, clearApiReadCache, safeJson } from '../utils/api';
import { getRewardIcon } from '../utils/rewardUtils';
import { prefetchProgressReport } from '../utils/progressReportData';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [isArchiveMonthsOpen, setIsArchiveMonthsOpen] = useState(false);
  const [isMobileArchiveOpen, setIsMobileArchiveOpen] = useState(false);
  const [newsletterMonths, setNewsletterMonths] = useState<{ value: string; label: string }[]>([]);
  const [isNewsletterSubscribed, setIsNewsletterSubscribed] = useState(false);
  const [isNewsletterAdmin, setIsNewsletterAdmin] = useState(false);
  const [publicLinks, setPublicLinks] = useState<{ facebook?: string; instagram?: string }>({});
  const [selectedKidId, setSelectedKidId] = useState<string | null>(localStorage.getItem('dashboard_selected_kid_id') || localStorage.getItem('analysis_selected_kid_id'));
  const [headerKids, setHeaderKids] = useState<{ id: string; name: string; avatar?: string; reward_balance?: number; reward_type?: string; reward_icon?: string }[]>([]);
  const [activityWorkspaceCounts, setActivityWorkspaceCounts] = useState({ needsAttention: 0, verification: 0, completed: 0, onHold: 0, ended: 0 });
  const [activityCountsRefreshKey, setActivityCountsRefreshKey] = useState(0);
  const alertAudioContextRef = useRef<AudioContext | null>(null);

  const getAlertAudioContext = () => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!alertAudioContextRef.current || alertAudioContextRef.current.state === 'closed') {
      alertAudioContextRef.current = new AudioContextClass();
    }
    return alertAudioContextRef.current;
  };

  const playHelpAlertTone = () => {
    try {
      const context = getAlertAudioContext();
      if (!context) return;
      if (context.state === 'suspended') {
        void context.resume().then(() => {
          if (context.state === 'running') playHelpAlertTone();
        }).catch(() => undefined);
        return;
      }
      const playTone = (frequency: number, startsAt: number) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startsAt);
        gain.gain.setValueAtTime(0.0001, startsAt);
        gain.gain.exponentialRampToValueAtTime(0.12, startsAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.18);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startsAt);
        oscillator.stop(startsAt + 0.2);
      };
      const now = context.currentTime;
      playTone(660, now);
      playTone(880, now + 0.2);
    } catch (error) {
      console.warn('Help alert sound could not play:', error);
    }
  };

  useEffect(() => {
    // Browsers allow later notification sounds after one ordinary interaction.
    const unlockAlertSound = () => {
      const context = getAlertAudioContext();
      if (context?.state === 'suspended') void context.resume();
    };
    window.addEventListener('pointerdown', unlockAlertSound, { once: true });
    window.addEventListener('keydown', unlockAlertSound, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAlertSound);
      window.removeEventListener('keydown', unlockAlertSound);
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;
  const requestedActivityTab = new URLSearchParams(location.search).get('tab');
  const currentWorkspace = location.pathname === '/dashboard' || location.pathname === '/add-kid' || location.pathname.startsWith('/edit-kid/') || location.pathname === '/profile'
      ? 'dashboard'
    : location.pathname.startsWith('/assigned-activities/') && ['rewards', 'bonus_rewards', 'positive_recognition', 'bonus_tokens'].includes(requestedActivityTab || '')
      ? 'rewards'
    : location.pathname.startsWith('/assigned-activities/') || location.pathname === '/activity-library'
      ? 'activities'
      : ['/saved-quizzes', '/quiz-generator', '/social-stories', '/social-stories/create', '/saved-worksheets', '/worksheet-generator', '/games'].some(path => location.pathname === path || location.pathname.startsWith(`${path}/`))
        ? 'learning'
        : location.pathname.startsWith('/admin') || location.pathname === '/newsletter-admin'
          ? 'admin'
          : location.pathname.startsWith('/newsletter') && location.pathname !== '/newsletter/community'
            ? 'newsletter'
            : location.pathname.startsWith('/progress-report/') || location.pathname.startsWith('/summary-report/') || ['/data-management', '/activity-history'].includes(location.pathname)
              ? 'progress'
              : 'support';

  const workspaceLink = (workspace: string) => {
    if (workspace === 'activities') return selectedKidId ? `/assigned-activities/${selectedKidId}?tab=activities` : '/dashboard';
    if (workspace === 'rewards') return selectedKidId ? `/assigned-activities/${selectedKidId}?tab=rewards` : '/dashboard';
    if (workspace === 'learning') return '/saved-quizzes';
    if (workspace === 'newsletter') return '/newsletter';
    if (workspace === 'progress') return selectedKidId ? `/progress-report/${selectedKidId}?view=quiz-results` : '/dashboard';
    if (workspace === 'support') return user ? '/support' : '/contact';
    if (workspace === 'admin') return '/admin/insights';
    return '/dashboard';
  };
  const prefetchWorkspace = (workspace: string) => {
    if (workspace === 'progress' && selectedKidId) {
      prefetchProgressReport(selectedKidId);
      return;
    }
    if (workspace === 'dashboard') void apiFetch('/api/kids').catch(() => undefined);
    if (workspace === 'activities' && selectedKidId) void apiFetch(`/api/kids/${encodeURIComponent(selectedKidId)}/activities?mode=parent`).catch(() => undefined);
    if (workspace === 'rewards' && selectedKidId) {
      void apiFetch(`/api/kids/${encodeURIComponent(selectedKidId)}/reward-items`).catch(() => undefined);
      void apiFetch(`/api/kids/${encodeURIComponent(selectedKidId)}/behavior-bonuses`).catch(() => undefined);
    }
    if (workspace === 'learning') {
      void apiFetch('/api/quizzes').catch(() => undefined);
      void apiFetch('/api/kids').catch(() => undefined);
    }
    if (workspace === 'newsletter') void fetch('/api/newsletters').catch(() => undefined);
  };
  const prefetchDestination = (destination: string) => {
    if ((destination.startsWith('/progress-report/') || destination.startsWith('/summary-report/')) && selectedKidId) prefetchProgressReport(selectedKidId);
    if (destination === '/saved-quizzes') void apiFetch('/api/quizzes').catch(() => undefined);
    if (destination === '/saved-worksheets') void apiFetch('/api/worksheets').catch(() => undefined);
    if (destination === '/social-stories') void apiFetch('/api/social-stories').catch(() => undefined);
    if (destination === '/activity-history') void apiFetch('/api/data-management?historyType=activity', {}, 0).catch(() => undefined);
    if (['/saved-quizzes', '/saved-worksheets', '/social-stories', '/games'].includes(destination)) void apiFetch('/api/kids').catch(() => undefined);
  };
  const learnerActivitiesRoute = selectedKidId ? `/assigned-activities/${selectedKidId}` : '/dashboard';
  const workspaceSecondaryLinks: Record<string, { label: string; to: string }[]> = {
    dashboard: [
    ],
    activities: [
      { label: 'Current', to: `${learnerActivitiesRoute}?tab=activities` },
      ...(activityWorkspaceCounts.needsAttention > 0 ? [{ label: 'Needs Attention', to: `${learnerActivitiesRoute}?tab=help_requested` }] : []),
      ...(activityWorkspaceCounts.verification > 0 ? [{ label: 'Verification', to: `${learnerActivitiesRoute}?tab=verification` }] : []),
      ...(activityWorkspaceCounts.completed > 0 ? [{ label: 'Completed', to: `${learnerActivitiesRoute}?tab=completed` }] : []),
      ...(activityWorkspaceCounts.onHold > 0 ? [{ label: 'On Hold', to: `${learnerActivitiesRoute}?tab=on_hold` }] : []),
      ...(activityWorkspaceCounts.ended > 0 ? [{ label: 'Ended', to: `${learnerActivitiesRoute}?tab=ended` }] : []),
    ],
    rewards: [
      { label: 'Rewards Catalog', to: `${learnerActivitiesRoute}?tab=rewards` },
      { label: 'Positive Recognition', to: `${learnerActivitiesRoute}?tab=positive_recognition` },
      { label: 'Give Bonus Tokens', to: `${learnerActivitiesRoute}?tab=bonus_tokens` },
    ],
    learning: [
      { label: 'Quizzes', to: '/saved-quizzes' },
      { label: 'Worksheets', to: '/saved-worksheets' },
      { label: 'Social Stories', to: '/social-stories' },
      { label: 'Games', to: '/games' },
    ],
    newsletter: [
      { label: 'Weekly Archive', to: '/newsletter' },
      { label: isNewsletterSubscribed ? 'Unsubscribe Newsletter' : 'Subscribe Newsletter', to: isNewsletterSubscribed ? '/newsletter/unsubscribe' : '/newsletter/subscribe' },
    ],
    progress: [
      ...(selectedKidId ? [
        { label: 'Quizzes', to: `/progress-report/${selectedKidId}?view=quiz-results` },
        { label: 'Games', to: `/progress-report/${selectedKidId}?view=game-results` },
        { label: 'Retries', to: `/progress-report/${selectedKidId}?view=activity-retries` },
        { label: 'Rewards History', to: `/progress-report/${selectedKidId}?view=reward-purchases` },
      ] : []),
      { label: 'Activity History', to: '/activity-history' },
      ...(selectedKidId && isNewsletterAdmin ? [{ label: 'Summary', to: `/summary-report/${selectedKidId}` }] : []),
    ],
    support: [
      { label: 'Contact', to: '/support' },
      { label: 'Share with the Community', to: '/newsletter/community' },
    ],
    admin: [
      { label: 'Insights', to: '/admin/insights' },
      { label: 'Support Inbox', to: '/admin/support' },
      { label: 'Manage Newsletter', to: '/newsletter-admin' },
    ],
  };
  const parentWorkspaces = [
    { id: 'dashboard', label: 'Dashboard', icon: Lightbulb },
    { id: 'activities', label: 'Activities', icon: Activity },
    { id: 'rewards', label: 'Rewards', icon: Gift },
    { id: 'learning', label: 'Learning', icon: BookOpen },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'support', label: 'Connect', icon: Users },
    { id: 'newsletter', label: 'Newsletter', icon: Mail },
    ...(isNewsletterAdmin ? [{ id: 'admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];
  const guestMode = isGuestSession();
  const guestAvailableWorkspaces = new Set(['dashboard', 'activities', 'rewards']);
  const guestSignupMessage = 'Sign up to use this feature and keep your family’s information.';

  useEffect(() => {
    if (!user) {
      setHeaderKids([]);
      return;
    }
    apiFetch('/api/kids')
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => {
        const kids = Array.isArray(data.kids) ? data.kids : [];
        setHeaderKids(kids.map((kid: { id: string; name: string; avatar?: string; reward_balance?: number; reward_type?: string; reward_icon?: string }) => ({ id: kid.id, name: kid.name, avatar: kid.avatar, reward_balance: kid.reward_balance, reward_type: kid.reward_type, reward_icon: kid.reward_icon })));
        if (kids[0]?.id && (!selectedKidId || !kids.some((kid: { id: string }) => kid.id === selectedKidId))) {
          setSelectedKidId(kids[0].id);
          localStorage.setItem('dashboard_selected_kid_id', kids[0].id);
        }
      })
      .catch(() => setHeaderKids([]));
  }, [user]);

  useEffect(() => {
    const handleRewardBalance = (event: Event) => {
      const detail = (event as CustomEvent<{ kidId: string; rewardBalance: number }>).detail;
      if (!detail?.kidId || !Number.isFinite(detail.rewardBalance)) return;
      setHeaderKids(current => current.map(kid => kid.id === detail.kidId
        ? { ...kid, reward_balance: detail.rewardBalance }
        : kid));
    };
    window.addEventListener('visual-steps:reward-balance-updated', handleRewardBalance);
    return () => window.removeEventListener('visual-steps:reward-balance-updated', handleRewardBalance);
  }, []);

  useEffect(() => {
    if (!user || !selectedKidId) {
      setActivityWorkspaceCounts({ needsAttention: 0, verification: 0, completed: 0, onHold: 0, ended: 0 });
      return;
    }
    let cancelled = false;
    const applyCounts = (activities: any[], helpRequests: any[]) => {
      if (cancelled) return;
      const nextCounts = {
        needsAttention: helpRequests.length,
        verification: activities.filter(activity => activity.status === 'awaiting_verification').length,
        completed: activities.filter(activity => activity.status === 'completed').length,
        onHold: activities.filter(activity => activity.status === 'on_hold').length,
        ended: activities.filter(activity => activity.status === 'ended').length,
      };
      setActivityWorkspaceCounts(nextCounts);

      const currentLocation = locationRef.current;
      const requestedTab = new URLSearchParams(currentLocation.search).get('tab');
      const activeListIsEmpty = requestedTab === 'help_requested' ? nextCounts.needsAttention === 0
        : requestedTab === 'verification' ? nextCounts.verification === 0
          : requestedTab === 'completed' ? nextCounts.completed === 0
            : requestedTab === 'on_hold' ? nextCounts.onHold === 0
              : requestedTab === 'ended' ? nextCounts.ended === 0
                : false;
      if (currentLocation.pathname.startsWith('/assigned-activities/') && activeListIsEmpty) {
        navigate(`/assigned-activities/${selectedKidId}?tab=activities`, { replace: true });
      }
    };
    apiFetch(`/api/kids/${encodeURIComponent(selectedKidId)}/activities?mode=parent`)
      .then(async response => response.ok ? safeJson(response) : Promise.reject(new Error('Unable to load activity menu counts')))
      .then(data => applyCounts(Array.isArray(data?.activities) ? data.activities : [], Array.isArray(data?.helpRequests) ? data.helpRequests : []))
      .catch(() => { if (!cancelled) setActivityWorkspaceCounts({ needsAttention: 0, verification: 0, completed: 0, onHold: 0, ended: 0 }); });

    const handleCounts = (event: Event) => {
      const detail = (event as CustomEvent<{ kidId: string; activities: any[]; helpRequests: any[] }>).detail;
      if (detail?.kidId === selectedKidId) applyCounts(detail.activities || [], detail.helpRequests || []);
    };
    window.addEventListener('visual-steps:activity-workspace-counts', handleCounts);
    return () => {
      cancelled = true;
      window.removeEventListener('visual-steps:activity-workspace-counts', handleCounts);
    };
  }, [user, selectedKidId, activityCountsRefreshKey]);

  useEffect(() => {
    if (!user || !selectedKidId || isGuestSession()) return;
    const socket = io(window.location.origin);
    socket.emit('join_kid_room', selectedKidId);
    socket.on('help_requested', (data) => {
      if (data?.kidId === selectedKidId) {
        playHelpAlertTone();
      }
    });
    socket.on('data_updated', (data) => {
      if (data?.kidId === selectedKidId) {
        clearApiReadCache();
        setActivityCountsRefreshKey(value => value + 1);
      }
    });
    return () => {
      socket.emit('leave_kid_room', selectedKidId);
      socket.disconnect();
    };
  }, [user, selectedKidId]);

  const selectHeaderKid = (kidId: string) => {
    setSelectedKidId(kidId);
    localStorage.setItem('dashboard_selected_kid_id', kidId);
    localStorage.setItem('analysis_selected_kid_id', kidId);
    const nextKid = headerKids.find(kid => kid.id === kidId);
    if (nextKid) localStorage.setItem('dashboard_selected_kid_name', nextKid.name);
    window.dispatchEvent(new CustomEvent('visual-steps:selected-kid', { detail: kidId }));

    const kidScopedRoute = location.pathname.match(/^\/(assigned-activities|progress-report|summary-report|edit-kid)\/[^/]+(.*)$/);
    if (kidScopedRoute) {
      navigate(`/${kidScopedRoute[1]}/${kidId}${kidScopedRoute[2]}${location.search}${location.hash}`, { replace: true });
      return;
    }

    const nextParams = new URLSearchParams(location.search);
    if (nextParams.has('kidId')) {
      nextParams.set('kidId', kidId);
      navigate(`${location.pathname}?${nextParams.toString()}${location.hash}`, { replace: true });
    }
  };
  const selectedHeaderKid = headerKids.find(kid => kid.id === selectedKidId) || headerKids[0];

  useEffect(() => {
    fetch('/api/public-links')
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => setPublicLinks({ facebook: data.facebook, instagram: data.instagram }))
      .catch(() => setPublicLinks({}));
  }, []);

  useEffect(() => {
    const hostname = window.location.hostname.toLowerCase();
    const isLocalDevelopment = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.localhost');
    if (isLocalDevelopment || navigator.doNotTrack === '1' || location.pathname.startsWith('/admin') || location.pathname === '/newsletter-admin') return;
    const storageKey = 'visual_steps_analytics_session';
    let sessionId = sessionStorage.getItem(storageKey);
    if (!sessionId) {
      sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(storageKey, sessionId);
    }
    const width = window.innerWidth;
    const deviceCategory = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
    void fetch('/api/analytics/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pagePath: location.pathname, sessionId, referrer: document.referrer, deviceCategory }),
      keepalive: true,
    }).catch(() => undefined);
  }, [location.pathname]);

  useEffect(() => {
    fetch('/api/newsletters')
      .then(response => response.ok ? response.json() : Promise.reject())
      .then((issues: { issue_date?: string }[]) => {
        const months = [...new Set((Array.isArray(issues) ? issues : []).map(issue => String(issue.issue_date || '').slice(0, 7)).filter(Boolean))];
        setNewsletterMonths(months.map(value => ({
          value,
          label: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`)),
        })));
      })
      .catch(() => setNewsletterMonths([]));
  }, []);

  useEffect(() => {
    if (!user || isGuestSession()) { setIsNewsletterAdmin(false); return; }
    apiFetch('/api/admin/status', {}, 0)
      .then(response => setIsNewsletterAdmin(response.ok))
      .catch(() => setIsNewsletterAdmin(false));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const loadSubscription = () => {
      if (!user || isGuestSession()) {
        setIsNewsletterSubscribed(false);
        return;
      }
      apiFetch('/api/newsletter/subscription', {}, 0)
        .then(async response => response.ok ? safeJson(response) : Promise.reject())
        .then(data => { if (!cancelled) setIsNewsletterSubscribed(data?.subscribed === true); })
        .catch(() => { if (!cancelled) setIsNewsletterSubscribed(false); });
    };
    loadSubscription();
    window.addEventListener('visual-steps:newsletter-subscription-changed', loadSubscription);
    return () => {
      cancelled = true;
      window.removeEventListener('visual-steps:newsletter-subscription-changed', loadSubscription);
    };
  }, [user]);

  useEffect(() => {
    // Sync selected kid ID from localStorage
    const handleStorageChange = () => {
      setSelectedKidId(localStorage.getItem('dashboard_selected_kid_id') || localStorage.getItem('analysis_selected_kid_id'));
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Also check on path change as our own code might set it without triggering 'storage' event in same tab
    handleStorageChange();

    return () => window.removeEventListener('storage', handleStorageChange);
  }, [location.pathname]);

  useEffect(() => {
    const path = location.pathname;
    let title = 'Visual Steps';
    
    if (path === '/dashboard') title = 'Dashboard | Visual Steps';
    else if (path === '/profile') title = 'Profile | Visual Steps';
    else if (path === '/data-management' || path === '/activity-history') title = 'Activity History | Visual Steps';
    else if (path === '/activity-library') title = 'Activities Library | Visual Steps';
    else if (path === '/saved-quizzes') title = 'Saved Quizzes | Visual Steps';
    else if (path === '/social-stories') title = 'Social Stories | Visual Steps';
    else if (path === '/saved-worksheets') title = 'Saved Worksheets | Visual Steps';
    else if (path === '/games') title = 'Learning Games | Visual Steps';
    else if (path === '/games/place-value') title = 'Place Value Builder | Visual Steps';
    else if (path === '/games/expanded-form') title = 'Expanded Form Explorer | Visual Steps';
    else if (path === '/games/digit-value') title = 'Digit Value Detective | Visual Steps';
    else if (path === '/games/place-value-clues') title = 'Place Value Clues | Visual Steps';
    else if (path === '/add-kid') title = 'Add Kid | Visual Steps';
    else if (path.startsWith('/edit-kid/')) title = 'Edit Kid | Visual Steps';
    else if (path.startsWith('/assigned-activities/')) title = 'Assigned Activities | Visual Steps';
    else if (path === '/quiz-generator') title = 'Quiz Generator | Visual Steps';
    else if (path === '/worksheet-generator') title = 'Worksheet Generator | Visual Steps';
    else if (path === '/social-stories/create') title = 'Create Social Story | Visual Steps';
    else if (path.startsWith('/social-stories/view/') || path.startsWith('/social-stories/shared/')) title = 'View Social Story | Visual Steps';
    else if (path === '/login' || path === '/') title = 'Login | Visual Steps';
    else if (path === '/signup') title = 'Sign Up | Visual Steps';
    else if (path === '/forgot-password') title = 'Forgot Password | Visual Steps';
    else if (path === '/auth/confirmed') title = 'Email Verified | Visual Steps';
    else if (path === '/about') title = 'About | Visual Steps';
    else if (path === '/pricing') title = 'Plans & Pricing | Visual Steps';
    else if (path === '/demo' || path === '/guest') title = 'Guest Login | Visual Steps';
    else if (path === '/testimonials') title = 'Testimonials | Visual Steps';
    else if (path === '/contact') title = 'Contact | Visual Steps';
    else if (path === '/support') title = 'Contact | Visual Steps';
    else if (path === '/privacy') title = 'Privacy Policy | Visual Steps';
    else if (path === '/terms') title = 'Terms of Service | Visual Steps';
    else if (path === '/cookies') title = 'Cookies & Analytics | Visual Steps';
    else if (path.startsWith('/newsletter/issues/')) title = 'Newsletter Issue | Visual Steps';
    else if (path.startsWith('/newsletter/archive/')) title = 'Newsletter Archive | Visual Steps';
    else if (path === '/newsletter/subscribe') title = 'Subscribe to Visual Steps Weekly';
    else if (path === '/newsletter') title = 'Weekly Newsletter | Visual Steps';
    else if (path === '/newsletter-admin') title = 'Newsletter Administration | Visual Steps';
    else if (path === '/admin/insights') title = 'Administrator Insights | Visual Steps';
    else if (path === '/admin/support') title = 'Support Inbox | Visual Steps';
    else if (path.startsWith('/features/')) title = 'Feature Guide | Visual Steps';

    document.title = title;
  }, [location.pathname]);

  return (
    <div className="parent-theme h-dvh w-full font-sans text-slate-900 flex flex-col overflow-hidden print:overflow-visible print:h-auto print:block">
      <header className="parent-nav sticky top-0 z-50 w-full shrink-0 no-print">
        <div className="parent-accent-line h-0.5 w-full" />
        <div className="w-full flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group transition-all">
              <div className="parent-brand-mark flex h-10 w-10 items-center justify-center rounded-xl text-white group-hover:scale-105 transition-transform">
                <Lightbulb className="h-6 w-6" />
              </div>
              <span className="text-xl font-display font-bold tracking-tight text-slate-900">Visual Steps</span>
            </Link>
            
            {user && (
              <nav className="hidden lg:flex items-center gap-1" aria-label="Main parent workspaces">
                {parentWorkspaces.map(item => {
                  const Icon = item.icon;
                  const warmWorkspace = () => prefetchWorkspace(item.id);
                  const guestLocked = guestMode && !guestAvailableWorkspaces.has(item.id);
                  if (guestLocked) return <Tooltip key={item.id} content={guestSignupMessage}>
                    <span className="inline-flex" tabIndex={0}>
                      <button type="button" disabled aria-label={`${item.label}. Sign up required.`} className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg px-3 text-sm font-bold text-slate-400 opacity-70">
                        <Icon className="h-4 w-4" />{item.label}<Lock className="h-3 w-3" />
                      </button>
                    </span>
                  </Tooltip>;
                  return <Link key={item.id} to={workspaceLink(item.id)} onMouseEnter={warmWorkspace} onFocus={warmWorkspace} onPointerDown={warmWorkspace} aria-current={currentWorkspace === item.id ? 'page' : undefined} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-bold transition-all ${currentWorkspace === item.id ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-brand-700'}`}><Icon className="h-4 w-4" />{item.label}</Link>;
                })}
              </nav>
            )}

            {user && (
              <nav className="hidden">
                <Tooltip content="Parent's Dashboard">
                  <Link
                    to="/dashboard"
                    data-guest-tour="dashboard-menu"
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-slate-100 ${
                      isActive('/dashboard') ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
                    }`}
                  >
                    Dashboard
                  </Link>
                </Tooltip>

                <Tooltip content="Open the activities library">
                  <div className="relative group">
                    <button
                      data-guest-tour="activities-menu"
                      onMouseEnter={() => setIsActivitiesOpen(true)}
                      onMouseLeave={() => setIsActivitiesOpen(false)}
                      className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-slate-100 ${
                        location.pathname.includes('activities') || 
                        location.pathname.includes('quizzes') || 
                        location.pathname.includes('social-stories') || 
                        location.pathname.includes('worksheets') ||
                        location.pathname.includes('games')
                          ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
                      }`}
                    >
                      Activities Library
                      <ChevronDown size={14} className={`transition-transform duration-200 ${isActivitiesOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Activity dropdown menu */}
                    {isActivitiesOpen && (
                      <div 
                        onMouseEnter={() => setIsActivitiesOpen(true)}
                        onMouseLeave={() => setIsActivitiesOpen(false)}
                        className="app-menu absolute left-0 z-[60] mt-0 w-56 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <Link
                          to="/saved-quizzes"
                          className="app-menu-item"
                          onClick={() => setIsActivitiesOpen(false)}
                        >
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                            <Gamepad2 size={18} />
                          </div>
                          Quizzes
                        </Link>
                        <Link
                          to="/social-stories"
                          className="app-menu-item"
                          onClick={() => setIsActivitiesOpen(false)}
                        >
                          <div className="h-8 w-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500">
                            <BookOpen size={18} />
                          </div>
                          Social Stories
                        </Link>
                        <Link
                          to="/saved-worksheets"
                          className="app-menu-item"
                          onClick={() => setIsActivitiesOpen(false)}
                        >
                          <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                            <FileText size={18} />
                          </div>
                          Worksheets
                        </Link>
                        <Link
                          to="/games"
                          className="app-menu-item"
                          onClick={() => setIsActivitiesOpen(false)}
                        >
                          <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Puzzle size={18} />
                          </div>
                          Games
                        </Link>
                      </div>
                    )}
                  </div>
                </Tooltip>

                <Tooltip content="Parent's Analytics">
                  <div className="relative group">
                    <button
                      onMouseEnter={() => {
                        setIsAnalyticsOpen(true);
                        setSelectedKidId(localStorage.getItem('dashboard_selected_kid_id') || localStorage.getItem('analysis_selected_kid_id'));
                      }}
                      onMouseLeave={() => setIsAnalyticsOpen(false)}
                      onClick={() => {
                        setIsAnalyticsOpen(!isAnalyticsOpen);
                        setSelectedKidId(localStorage.getItem('dashboard_selected_kid_id') || localStorage.getItem('analysis_selected_kid_id'));
                      }}
                      className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-slate-100 ${
                        location.pathname.includes('progress-report') || location.pathname.includes('assigned-activities') 
                          ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
                      }`}
                    >
                      Analytics
                      <ChevronDown size={14} className={`transition-transform duration-200 ${isAnalyticsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Analytics dropdown menu */}
                    {isAnalyticsOpen && (
                      <div 
                        onMouseEnter={() => setIsAnalyticsOpen(true)}
                        onMouseLeave={() => setIsAnalyticsOpen(false)}
                        className="app-menu absolute left-0 z-[60] mt-0 w-56 animate-in fade-in zoom-in-95 duration-100"
                      >
                        {selectedKidId && (
                          <>
                            <Link
                              to={`/progress-report/${selectedKidId}?view=quiz-results`}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all leading-tight ${
                                location.pathname.includes('progress-report') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'
                              }`}
                              onClick={() => setIsAnalyticsOpen(false)}
                            >
                              <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                                <Activity size={18} />
                              </div>
                              Progress Report
                            </Link>
                            {isNewsletterAdmin && <Link
                              to={`/summary-report/${selectedKidId}`}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all leading-tight ${
                                location.pathname.includes('summary-report') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'
                              }`}
                              onClick={() => setIsAnalyticsOpen(false)}
                            >
                              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                                <TrendingUp size={18} />
                              </div>
                              Summary Report
                            </Link>}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </Tooltip>
              </nav>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <Tooltip content="What is included in Visual Steps">
              <Link to="/pricing" className="hidden text-sm font-semibold text-slate-600 hover:text-brand-600 transition-all">
                Plans
              </Link>
            </Tooltip>
            <Tooltip content="About Visual Steps">
              <Link to="/about" className="hidden text-sm font-semibold text-slate-600 hover:text-brand-600 transition-all">
                About
              </Link>
            </Tooltip>
            <Tooltip content="Contact Visual Steps">
              <Link to="/contact" className="hidden text-sm font-semibold text-slate-600 hover:text-brand-600 transition-all">
                Contact
              </Link>
            </Tooltip>
            <div className="relative hidden">
              <button
                onMouseEnter={() => setIsNewsletterOpen(true)}
                onMouseLeave={() => setIsNewsletterOpen(false)}
                onClick={() => setIsNewsletterOpen(value => !value)}
                className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all hover:bg-slate-100 ${location.pathname.startsWith('/newsletter') ? 'bg-brand-50 text-brand-700' : 'text-slate-600'}`}
                aria-expanded={isNewsletterOpen}
              >
                Newsletter <ChevronDown size={14} className={isNewsletterOpen ? 'rotate-180' : ''} />
              </button>
              {isNewsletterOpen && <div onMouseEnter={() => setIsNewsletterOpen(true)} onMouseLeave={() => setIsNewsletterOpen(false)} className="app-menu absolute right-0 z-[60] mt-0 w-64">
                <div className="relative" onMouseEnter={() => setIsArchiveMonthsOpen(true)} onMouseLeave={() => setIsArchiveMonthsOpen(false)}>
                  <div className="app-menu-item cursor-default"><Newspaper size={18} className="text-blue-600" /><span className="flex-1">Weekly archive</span><ChevronDown size={14} className="-rotate-90" /></div>
                  {isArchiveMonthsOpen && <div className="app-menu absolute right-full top-0 z-[70] w-52">
                    {newsletterMonths.length ? newsletterMonths.map(month => <Link key={month.value} to={`/newsletter/archive/${month.value}`} className="app-menu-item" onClick={() => { setIsArchiveMonthsOpen(false); setIsNewsletterOpen(false); }}>{month.label}</Link>) : <span className="block px-3 py-2 text-xs text-slate-500">No published issues yet</span>}
                  </div>}
                </div>
                <Link to="/newsletter/community" className="app-menu-item" onClick={() => setIsNewsletterOpen(false)}><Users size={18} className="text-emerald-600" /> Share with the community</Link>
                <Link to="/newsletter/subscribe" className="app-menu-item" onClick={() => setIsNewsletterOpen(false)}><Mail size={18} className="text-blue-600"/> Subscribe</Link>
              </div>}
            </div>
            <div className="h-4 w-px bg-slate-200" />
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-500">
                  Hi, {guestMode ? <span className="font-bold text-slate-900">{user.name.split(' ')[0]}</span> : <Link to="/profile" className="text-slate-900 font-bold hover:text-brand-600 transition-colors">{user.name.split(' ')[0]}</Link>}
                </span>
                <Tooltip content="Sign Out">
                  <Button variant="outline" size="sm" onClick={logout} className="h-9">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </Button>
                </Tooltip>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">Join free</Button>
                </Link>
              </div>
            )}
          </div>

          <button
            className="lg:hidden p-1 text-slate-600"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            onClick={() => {
              setIsMenuOpen(!isMenuOpen);
              if (!isMenuOpen) {
                setSelectedKidId(localStorage.getItem('dashboard_selected_kid_id') || localStorage.getItem('analysis_selected_kid_id'));
              }
            }}
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {user && (
          <div className="hidden h-12 items-center justify-between gap-4 border-t border-slate-100 bg-gradient-to-r from-blue-50/80 via-white to-emerald-50/70 px-4 lg:flex lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              {currentWorkspace === 'dashboard' ? (
                <>
                  <span className="shrink-0 text-[11px] font-black uppercase tracking-[0.16em] text-brand-700">Dashboard</span>
                  <span className="h-4 w-px shrink-0 bg-slate-300" aria-hidden="true" />
                  <p className="truncate text-sm font-semibold text-slate-600">Climb together. Effortless tools for certain steps and positive growth.</p>
                </>
              ) : (
                <>
                  <span className="shrink-0 text-[11px] font-black uppercase tracking-[0.16em] text-brand-700">{currentWorkspace}</span>
                  <span className="h-4 w-px shrink-0 bg-slate-300" aria-hidden="true" />
                  <nav className="flex flex-wrap items-center gap-1" aria-label={`${currentWorkspace} workspace navigation`}>
                    {(workspaceSecondaryLinks[currentWorkspace] || []).map(item => {
                      const currentUrl = `${location.pathname}${location.search}${location.hash}`;
                      const active = currentUrl === item.to || (!item.to.includes('?') && !item.to.includes('#') && !location.search && !location.hash && location.pathname === item.to);
                      const warmDestination = () => prefetchDestination(item.to);
                      return <Link key={`${item.label}-${item.to}`} to={item.to} onMouseEnter={warmDestination} onFocus={warmDestination} onPointerDown={warmDestination} aria-current={active ? 'page' : undefined} className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${active ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-100' : 'text-slate-600 hover:bg-white/80 hover:text-brand-700'}`}>{item.label}</Link>;
                    })}
                  </nav>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!guestMode && <Button type="button" variant="outline" size="sm" className="h-8 border-blue-600 bg-blue-600 px-3 text-white hover:border-blue-700 hover:bg-blue-700 hover:text-white" onClick={() => navigate('/dashboard?tour=1')}>
                <HelpCircle className="mr-1.5 h-3.5 w-3.5" />Start tour
              </Button>}
              {headerKids.length > 0 && (
                <select aria-label="Select Child" value={selectedKidId || headerKids[0].id} onChange={(event) => selectHeaderKid(event.target.value)} className="h-8 w-36 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                  {headerKids.map(kid => <option key={kid.id} value={kid.id}>{kid.name}</option>)}
                </select>
              )}
              {guestMode ? <Tooltip content={guestSignupMessage}><span tabIndex={0}><Button size="sm" disabled className="h-8 px-3"><Lock className="mr-1.5 h-3.5 w-3.5" />Add Child / Adult</Button></span></Tooltip> : <Link to="/add-kid"><Button size="sm" className="h-8 px-3"><Plus className="mr-1.5 h-4 w-4" />Add Child / Adult</Button></Link>}
            </div>
          </div>
        )}

        {user && selectedHeaderKid && (
          <div className="flex h-16 w-full shrink-0 items-center justify-between bg-gradient-to-r from-blue-600 to-cyan-600 px-3 text-white sm:px-4 lg:h-20 lg:px-7" aria-label={`Selected learner: ${selectedHeaderKid.name}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white text-2xl shadow-md lg:h-14 lg:w-14 lg:text-3xl">
                {selectedHeaderKid.avatar && (selectedHeaderKid.avatar.startsWith('http') || selectedHeaderKid.avatar.startsWith('data:')) ? <img src={selectedHeaderKid.avatar} alt={selectedHeaderKid.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : selectedHeaderKid.avatar || '👤'}
              </div>
              <span className="truncate text-xl font-black lg:text-2xl">{selectedHeaderKid.name}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 lg:pr-1">
              {activityWorkspaceCounts.needsAttention > 0 && (
                <Tooltip content={`${selectedHeaderKid.name} needs help now`}>
                  <Link to={`/assigned-activities/${selectedHeaderKid.id}?tab=help_requested`} className="flex h-9 items-center gap-1.5 rounded-lg bg-rose-500 px-2.5 text-xs font-black text-white shadow-md ring-2 ring-white/80 transition hover:bg-rose-600" aria-label={`${selectedHeaderKid.name} needs help with ${activityWorkspaceCounts.needsAttention} ${activityWorkspaceCounts.needsAttention === 1 ? 'activity' : 'activities'}`}>
                    <BellRing className="h-4 w-4 animate-pulse" /> Needs Help <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-rose-600">{activityWorkspaceCounts.needsAttention}</span>
                  </Link>
                </Tooltip>
              )}
              <Tooltip content={`Buy rewards for ${selectedHeaderKid.name}`}><Link to="/dashboard?shop=1" className="rounded-lg p-2 transition-colors hover:bg-white/15" aria-label={`Buy rewards for ${selectedHeaderKid.name}`}><ShoppingCart className="h-7 w-7" /></Link></Tooltip>
              <img src={getRewardIcon(selectedHeaderKid.reward_type, selectedHeaderKid.reward_icon)} alt={selectedHeaderKid.reward_type || 'Reward'} className="h-8 w-8" referrerPolicy="no-referrer" />
              <span className="text-2xl font-black">{selectedHeaderKid.reward_balance || 0}</span>
              {guestMode ? <Tooltip content={guestSignupMessage}><span tabIndex={0} className="rounded-lg p-2 text-white/55" aria-label="Edit learner profile. Sign up required."><Lock className="h-5 w-5" /></span></Tooltip> : <Tooltip content="Edit learner profile"><Link to={`/edit-kid/${selectedHeaderKid.id}`} className="rounded-lg p-2 transition-colors hover:bg-white/15" aria-label="Edit learner profile"><Edit2 className="h-6 w-6" /></Link></Tooltip>}
            </div>
          </div>
        )}

        {user && <div className="h-3 w-full shrink-0 bg-white" aria-hidden="true" data-layout-row="content-spacing" />}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-200 bg-white p-3 lg:hidden">
            <nav className="flex flex-col gap-2">
              {user ? (
                <>
                  {parentWorkspaces.map(workspace => {
                    const Icon = workspace.icon;
                    const submenus = workspaceSecondaryLinks[workspace.id] || [];
                    const guestLocked = guestMode && !guestAvailableWorkspaces.has(workspace.id);
                    return (
                      <section key={workspace.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2">
                        {guestLocked ? <div className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-2 text-sm font-black text-slate-400" aria-disabled="true" title={guestSignupMessage}>
                          <Icon className="h-4 w-4" /> {workspace.label}<Lock className="ml-auto h-3.5 w-3.5" />
                        </div> : <Link to={workspaceLink(workspace.id)} onClick={() => setIsMenuOpen(false)} className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-black ${currentWorkspace === workspace.id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-800'}`}>
                          <Icon className="h-4 w-4" /> {workspace.label}
                        </Link>}
                        {guestLocked && <p className="px-2 pb-1 text-[10px] font-semibold leading-4 text-slate-500">Sign up to use this feature.</p>}
                        {!guestLocked && submenus.length > 0 && (
                          <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l-2 border-brand-100 pl-2">
                            {submenus.map(item => <Link key={`${workspace.id}-${item.label}`} to={item.to} onClick={() => setIsMenuOpen(false)} onPointerDown={() => prefetchDestination(item.to)} className="rounded px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:text-brand-700">{item.label}</Link>)}
                          </div>
                        )}
                      </section>
                    );
                  })}
                  <section className="flex flex-col gap-1 border-t border-slate-200 pt-2">
                    {guestMode ? <><span className="px-2 py-1.5 text-xs font-bold text-slate-400" title={guestSignupMessage}>Parent Profile · Sign up required</span><span className="px-2 py-1.5 text-xs font-bold text-slate-400" title={guestSignupMessage}>Add Child / Adult · Sign up required</span></> : <><Link to="/profile" className="px-2 py-1.5 text-xs font-bold text-slate-600" onClick={() => setIsMenuOpen(false)}>Parent Profile</Link><Link to="/add-kid" className="px-2 py-1.5 text-xs font-bold text-slate-600" onClick={() => setIsMenuOpen(false)}>Add Child / Adult</Link></>}
                    {guestMode && <button type="button" className="px-2 py-1.5 text-left text-xs font-black text-blue-700" onClick={() => { setIsMenuOpen(false); endGuestSession(); window.location.assign('/signup'); }}>Sign up to keep your work</button>}
                    <Link to="/pricing" className="px-2 py-1.5 text-xs font-bold text-slate-600" onClick={() => setIsMenuOpen(false)}>Plans</Link>
                    <Link to="/testimonials" className="px-2 py-1.5 text-xs font-bold text-slate-600" onClick={() => setIsMenuOpen(false)}>Testimonials</Link>
                    <button onClick={() => { logout(); setIsMenuOpen(false); }} className="px-2 py-1.5 text-left text-xs font-bold text-slate-600">Sign out</button>
                  </section>
                </>
              ) : (
                <>
                  <Link to="/about" className="text-[12px] font-bold text-slate-600 uppercase" onClick={() => setIsMenuOpen(false)}>
                    About
                  </Link>
                  <Link to="/pricing" className="text-[12px] font-bold text-slate-600 uppercase" onClick={() => setIsMenuOpen(false)}>
                    Plans
                  </Link>
                  <Link to="/testimonials" className="text-[12px] font-bold text-slate-600 uppercase" onClick={() => setIsMenuOpen(false)}>Testimonials</Link>
                  <span className="text-[12px] font-bold text-slate-600 uppercase">Newsletter</span>
                  <div className="flex flex-col gap-1 pl-3 border-l-2 border-emerald-100">
                    <button type="button" className="flex items-center gap-1 text-left text-[11px] font-bold text-slate-600 uppercase" onClick={() => setIsMobileArchiveOpen(value => !value)}>Weekly archive <ChevronDown size={12} className={isMobileArchiveOpen ? 'rotate-180' : ''}/></button>
                    {isMobileArchiveOpen && newsletterMonths.map(month => <Link key={month.value} to={`/newsletter/archive/${month.value}`} className="pl-3 text-[11px] font-semibold text-slate-500" onClick={() => setIsMenuOpen(false)}>{month.label}</Link>)}
                    <Link to="/newsletter/community" className="text-[11px] font-bold text-slate-600 uppercase" onClick={() => setIsMenuOpen(false)}>Share with community</Link>
                    <Link to="/newsletter/subscribe" className="text-[11px] font-bold text-blue-700 uppercase" onClick={() => setIsMenuOpen(false)}>Subscribe</Link>
                  </div>
                  <Link to="/contact" className="text-[12px] font-bold text-slate-600 uppercase" onClick={() => setIsMenuOpen(false)}>Contact</Link>
                  <Link to="/login" className="text-[12px] font-bold text-slate-600 uppercase" onClick={() => setIsMenuOpen(false)}>
                    Sign in
                  </Link>
                  <Link to="/signup" className="text-[12px] font-bold text-blue-600 uppercase" onClick={() => setIsMenuOpen(false)}>
                    Join now
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="app-page-scroll flex min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-white px-4 py-0 print:overflow-visible print:h-auto print:p-0 print:block">
        <div className="min-h-full w-full bg-white print:h-auto print:block">
          <Outlet />
        </div>
      </main>
      
      <footer className="mt-auto shrink-0 border-t border-slate-200 bg-white py-3 no-print">
        <div className="flex w-full flex-col items-center gap-2 px-4">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-bold text-slate-600" aria-label="Public information">
            <Link to="/about" className="hover:text-brand-600">About</Link>
            <Link to="/testimonials" className="hover:text-brand-600">Testimonials</Link>
            <Link to="/pricing" className="hover:text-brand-600">Plans</Link>
            <Link to="/contact" className="hover:text-brand-600">Contact</Link>
            <Link to="/privacy" className="hover:text-brand-600">Privacy</Link>
            <Link to="/terms" className="hover:text-brand-600">Terms</Link>
            <Link to="/cookies" className="hover:text-brand-600">Cookies & Analytics</Link>
            {publicLinks.facebook && <a href={publicLinks.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand-600"><Facebook className="h-4 w-4" />Facebook</a>}
            {publicLinks.instagram && <a href={publicLinks.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand-600"><Instagram className="h-4 w-4" />Instagram</a>}
          </nav>
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
            &copy; {new Date().getFullYear()} Visual Steps.
          </div>
        </div>

      </footer>
      {!isGuestSession() && (user || location.pathname === '/' || location.pathname === '/login') && <ParentAssistant publicMode={!user} />}
    </div>
  );
}
