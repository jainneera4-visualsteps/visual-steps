import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import { LogOut, Menu, X, Lightbulb, ChevronDown, BookOpen, FileText, Gamepad2, Activity, TrendingUp, Facebook, Instagram, Mail, Newspaper, Users, Settings, Database, ShieldCheck, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Tooltip } from './ui/Tooltip';
import { ParentAssistant } from './ParentAssistant';
import { isGuestSession } from '../guest/guestSession';
import { apiFetch } from '../utils/api';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isArchiveMonthsOpen, setIsArchiveMonthsOpen] = useState(false);
  const [isMobileArchiveOpen, setIsMobileArchiveOpen] = useState(false);
  const [newsletterMonths, setNewsletterMonths] = useState<{ value: string; label: string }[]>([]);
  const [isNewsletterAdmin, setIsNewsletterAdmin] = useState(false);
  const [publicLinks, setPublicLinks] = useState<{ facebook?: string; instagram?: string }>({});
  const [selectedKidId, setSelectedKidId] = useState<string | null>(localStorage.getItem('dashboard_selected_kid_id') || localStorage.getItem('analysis_selected_kid_id'));

  const isActive = (path: string) => location.pathname === path;

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
    else if (path === '/data-management') title = 'Data Management | Visual Steps';
    else if (path === '/activity-library') title = 'Activity Library | Visual Steps';
    else if (path === '/saved-quizzes') title = 'Saved Quizzes | Visual Steps';
    else if (path === '/social-stories') title = 'Social Stories | Visual Steps';
    else if (path === '/saved-worksheets') title = 'Saved Worksheets | Visual Steps';
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
    else if (path === '/about') title = 'About | Visual Steps';
    else if (path === '/pricing') title = 'Plans & Pricing | Visual Steps';
    else if (path === '/demo' || path === '/guest') title = 'Guest Login | Visual Steps';
    else if (path === '/testimonials') title = 'Testimonials | Visual Steps';
    else if (path === '/contact') title = 'Contact | Visual Steps';
    else if (path === '/privacy') title = 'Privacy Policy | Visual Steps';
    else if (path === '/terms') title = 'Terms of Service | Visual Steps';
    else if (path === '/cookies') title = 'Cookies & Analytics | Visual Steps';
    else if (path.startsWith('/newsletter/issues/')) title = 'Newsletter Issue | Visual Steps';
    else if (path.startsWith('/newsletter/archive/')) title = 'Newsletter Archive | Visual Steps';
    else if (path === '/newsletter/subscribe') title = 'Subscribe to Visual Steps Weekly';
    else if (path === '/newsletter') title = 'Weekly Newsletter | Visual Steps';
    else if (path === '/newsletter-admin') title = 'Newsletter Administration | Visual Steps';
    else if (path === '/admin/insights') title = 'Administrator Insights | Visual Steps';
    else if (path.startsWith('/features/')) title = 'Feature Guide | Visual Steps';

    document.title = title;
  }, [location.pathname]);

  return (
    <div className="parent-theme h-dvh w-full font-sans text-slate-900 flex flex-col overflow-hidden print:overflow-visible print:h-auto print:block">
      <header className="parent-nav sticky top-0 z-50 w-full border-b no-print">
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
              <nav className="hidden md:flex items-center gap-1">
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

                <Tooltip content="Create Activities">
                  <div className="relative group">
                    <button
                      data-guest-tour="activities-menu"
                      onMouseEnter={() => setIsActivitiesOpen(true)}
                      onMouseLeave={() => setIsActivitiesOpen(false)}
                      className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-slate-100 ${
                        location.pathname.includes('activities') || 
                        location.pathname.includes('quizzes') || 
                        location.pathname.includes('social-stories') || 
                        location.pathname.includes('worksheets') 
                          ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
                      }`}
                    >
                      Activities
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
                              to={`/progress-report/${selectedKidId}`}
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
                            <Link
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
                            </Link>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </Tooltip>
              </nav>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Tooltip content="Plans and future premium features">
              <Link to="/pricing" className="text-sm font-semibold text-slate-600 hover:text-brand-600 transition-all">
                Plans
              </Link>
            </Tooltip>
            <Tooltip content="About Visual Steps">
              <Link to="/about" className="text-sm font-semibold text-slate-600 hover:text-brand-600 transition-all">
                About
              </Link>
            </Tooltip>
            <Tooltip content="Contact Visual Steps">
              <Link to="/contact" className="text-sm font-semibold text-slate-600 hover:text-brand-600 transition-all">
                Contact
              </Link>
            </Tooltip>
            <div className="relative">
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
            {isNewsletterAdmin && <div className="relative">
              <button onMouseEnter={() => setIsAdminOpen(true)} onMouseLeave={() => setIsAdminOpen(false)} onClick={() => setIsAdminOpen(value => !value)} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all hover:bg-slate-100 ${location.pathname.startsWith('/admin') || location.pathname === '/newsletter-admin' ? 'bg-violet-50 text-violet-700' : 'text-slate-600'}`} aria-expanded={isAdminOpen}><ShieldCheck size={16}/> Admin <ChevronDown size={14} className={isAdminOpen ? 'rotate-180' : ''}/></button>
              {isAdminOpen && <div onMouseEnter={() => setIsAdminOpen(true)} onMouseLeave={() => setIsAdminOpen(false)} className="app-menu absolute right-0 z-[60] mt-0 w-56">
                <Link to="/admin/insights" className="app-menu-item" onClick={() => setIsAdminOpen(false)}><BarChart3 size={18} className="text-blue-600"/> Insights</Link>
                <Link to="/newsletter-admin" className="app-menu-item" onClick={() => setIsAdminOpen(false)}><Settings size={18} className="text-violet-600"/> Manage newsletter</Link>
              </div>}
            </div>}
            <div className="h-4 w-px bg-slate-200" />
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-500">
                  Hi, <Link to="/profile" className="text-slate-900 font-bold hover:text-brand-600 transition-colors">{user.name.split(' ')[0]}</Link>
                </span>
                <Tooltip content="Review and clean up saved family data"><Link to="/data-management" className="inline-flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-brand-600"><Database className="h-4 w-4" /> Data</Link></Tooltip>
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
            className="md:hidden p-1 text-slate-600"
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

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white p-2">
            <nav className="flex flex-col gap-2">
              {user ? (
                <>
                  <Link to="/dashboard" className="text-[12px] font-bold text-slate-600 uppercase" onClick={() => setIsMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <Link to="/data-management" className="text-[12px] font-bold text-slate-600 uppercase flex items-center gap-2" onClick={() => setIsMenuOpen(false)}><Database size={14} className="text-blue-600" /> Data Management</Link>
                  <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-blue-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Activities</span>
                    <Link to="/saved-quizzes" className="text-[12px] font-bold text-slate-600 uppercase flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                      <Gamepad2 size={14} className="text-indigo-500" /> Quizzes
                    </Link>
                    <Link to="/social-stories" className="text-[12px] font-bold text-slate-600 uppercase flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                      <BookOpen size={14} className="text-pink-500" /> Social Stories
                    </Link>
                    <Link to="/saved-worksheets" className="text-[12px] font-bold text-slate-600 uppercase flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                      <FileText size={14} className="text-amber-500" /> Worksheets
                    </Link>
                  </div>
                  <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-blue-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Analytics</span>
                    {selectedKidId && (
                      <>
                        <Link to={`/progress-report/${selectedKidId}`} className="text-[12px] font-bold text-slate-600 uppercase flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                          <Activity size={14} className="text-indigo-500" /> Progress Report
                        </Link>
                        <Link to={`/summary-report/${selectedKidId}`} className="text-[12px] font-bold text-slate-600 uppercase flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                          <TrendingUp size={14} className="text-emerald-500" /> Summary Report
                        </Link>
                      </>
                    )}
                  </div>

                  <button onClick={() => { logout(); setIsMenuOpen(false); }} className="text-left text-[12px] font-bold text-slate-600 uppercase">
                    Sign out
                  </button>
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
                  {isNewsletterAdmin && <div className="flex flex-col gap-1.5 border-l-2 border-violet-100 pl-2"><span className="text-[11px] font-bold uppercase tracking-wider text-violet-700">Admin</span><Link to="/admin/insights" className="text-[11px] font-bold uppercase text-slate-600" onClick={() => setIsMenuOpen(false)}>Insights</Link><Link to="/newsletter-admin" className="text-[11px] font-bold uppercase text-slate-600" onClick={() => setIsMenuOpen(false)}>Manage newsletter</Link></div>}
                  <Link to="/contact" className="text-[12px] font-bold text-slate-600 uppercase" onClick={() => setIsMenuOpen(false)}>Contact</Link>
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

      <main className="flex flex-grow overflow-y-auto p-2 md:p-3 print:overflow-visible print:h-auto print:p-0 print:block">
        <div className="w-full h-full print:h-auto print:block">
          <Outlet />
        </div>
      </main>
      
      <footer className="mt-auto border-t border-slate-200 bg-white py-3 no-print">
        <div className="flex w-full flex-col items-center gap-2 px-4">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-bold text-slate-600" aria-label="Public information">
            <Link to="/about" className="hover:text-brand-600">About</Link>
            <Link to="/testimonials" className="hover:text-brand-600">Testimonials</Link>
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
