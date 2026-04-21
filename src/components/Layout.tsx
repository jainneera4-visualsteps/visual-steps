import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import { User, LogOut, Menu, X, Lightbulb, ChevronDown, Sparkles, BookOpen, FileText, Gamepad2, LayoutGrid } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

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
    else if (path.startsWith('/social-stories/view/')) title = 'View Social Story | Visual Steps';
    else if (path === '/login' || path === '/') title = 'Login | Visual Steps';
    else if (path === '/signup') title = 'Sign Up | Visual Steps';
    else if (path === '/forgot-password') title = 'Forgot Password | Visual Steps';
    else if (path === '/about') title = 'About | Visual Steps';

    document.title = title;
  }, [location.pathname]);

  return (
    <div className="h-dvh w-full bg-slate-50 font-sans text-slate-900 flex flex-col overflow-hidden">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md no-print">
        <div className="w-full flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-200 group-hover:scale-105 transition-transform">
                <Lightbulb className="h-6 w-6" />
              </div>
              <span className="text-xl font-display font-bold tracking-tight text-slate-900">Visual Steps</span>
            </Link>

            {user && (
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  to="/dashboard"
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-slate-100 ${
                    isActive('/dashboard') ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
                  }`}
                >
                  Dashboard
                </Link>
                
                {/* Activities Dropdown */}
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
                  
                  {/* ... contents preserved ... */}
                  {isActivitiesOpen && (
                    <div 
                      onMouseEnter={() => setIsActivitiesOpen(true)}
                      onMouseLeave={() => setIsActivitiesOpen(false)}
                      className="absolute left-0 mt-0 w-56 rounded-2xl bg-white shadow-2xl shadow-slate-200 ring-1 ring-slate-200 p-2 z-[60] animate-in fade-in zoom-in-95 duration-100"
                    >
                      <Link
                        to="/saved-quizzes"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-all leading-tight"
                        onClick={() => setIsActivitiesOpen(false)}
                      >
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                          <Gamepad2 size={18} />
                        </div>
                        Quizzes
                      </Link>
                      <Link
                        to="/social-stories"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-all leading-tight"
                        onClick={() => setIsActivitiesOpen(false)}
                      >
                        <div className="h-8 w-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500">
                          <BookOpen size={18} />
                        </div>
                        Social Stories
                      </Link>
                      <Link
                        to="/saved-worksheets"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-all leading-tight"
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

                <Link
                  to="/profile"
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-slate-100 ${
                    isActive('/profile') ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
                  }`}
                >
                  Profile
                </Link>
              </nav>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/about" className="text-sm font-semibold text-slate-600 hover:text-brand-600 transition-all">
              About
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-500">Hi, <span className="text-slate-900 font-bold">{user.name.split(' ')[0]}</span></span>
                <Button variant="outline" size="sm" onClick={logout} className="h-9">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
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

          {user && (
            <button
              className="md:hidden p-1 text-slate-600"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}
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

                  <Link to="/profile" className="text-[12px] font-bold text-slate-600 uppercase" onClick={() => setIsMenuOpen(false)}>
                    Profile
                  </Link>
                  <button onClick={() => { logout(); setIsMenuOpen(false); }} className="text-left text-[12px] font-bold text-slate-600 uppercase">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/about" className="text-[12px] font-bold text-slate-600 uppercase" onClick={() => setIsMenuOpen(false)}>
                    About
                  </Link>
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

      <main className="flex-grow overflow-y-auto p-2 md:p-4 scrollbar-hide">
        <div className="w-full h-full">
          <Outlet />
        </div>
      </main>
      
      <footer className="border-t border-slate-200 bg-white py-1 mt-auto no-print">
        <div className="w-full flex flex-col items-center gap-1 px-4">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
            &copy; {new Date().getFullYear()} Visual Steps.
          </div>
        </div>
      </footer>
    </div>
  );
}
