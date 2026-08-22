import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import { LogOut, Menu, X, Lightbulb, ChevronDown, BookOpen, FileText, Gamepad2, Activity, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Tooltip } from './ui/Tooltip';
import { ParentAssistant } from './ParentAssistant';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [selectedKidId, setSelectedKidId] = useState<string | null>(localStorage.getItem('dashboard_selected_kid_id') || localStorage.getItem('analysis_selected_kid_id'));

  const isActive = (path: string) => location.pathname === path;

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
    else if (path === '/demo') title = 'Guest Demo | Visual Steps';
    else if (path === '/testimonials') title = 'Family Stories | Visual Steps';
    else if (path === '/contact') title = 'Contact | Visual Steps';
    else if (path === '/newsletter') title = 'Weekly Newsletter | Visual Steps';
    else if (path === '/newsletter-admin') title = 'Newsletter Administration | Visual Steps';

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
            <div className="h-4 w-px bg-slate-200" />
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-500">
                  Hi, <Link to="/profile" className="text-slate-900 font-bold hover:text-brand-600 transition-colors">{user.name.split(' ')[0]}</Link>
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
                  <Link to="/testimonials" className="text-[12px] font-bold text-slate-600 uppercase" onClick={() => setIsMenuOpen(false)}>Family Stories</Link>
                  <Link to="/newsletter" className="text-[12px] font-bold text-slate-600 uppercase" onClick={() => setIsMenuOpen(false)}>Newsletter</Link>
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
                  <Link to="/testimonials" className="text-[12px] font-bold text-slate-600 uppercase" onClick={() => setIsMenuOpen(false)}>Family Stories</Link>
                  <Link to="/newsletter" className="text-[12px] font-bold text-slate-600 uppercase" onClick={() => setIsMenuOpen(false)}>Newsletter</Link>
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
      
      <footer className="border-t border-slate-200 bg-white py-1 mt-auto no-print">
        <div className="w-full flex flex-col items-center gap-1 px-4">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500" aria-label="Public information">
            <Link to="/about" className="hover:text-brand-600">About</Link>
            <Link to="/testimonials" className="hover:text-brand-600">Family Stories</Link>
            <Link to="/newsletter" className="hover:text-brand-600">Newsletter</Link>
            <Link to="/contact" className="hover:text-brand-600">Contact</Link>
          </nav>
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
            &copy; {new Date().getFullYear()} Visual Steps.
          </div>
        </div>

      </footer>
      {user && <ParentAssistant />}
    </div>
  );
}
