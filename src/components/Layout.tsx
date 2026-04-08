import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import { User, LogOut, Menu, X, Lightbulb, ChevronDown, Sparkles, BookOpen, FileText, Gamepad2 } from 'lucide-react';
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
    else if (path === '/chatbots') title = 'Chatbots | Visual Steps';
    else if (path === '/login' || path === '/') title = 'Login | Visual Steps';
    else if (path === '/signup') title = 'Sign Up | Visual Steps';
    else if (path === '/forgot-password') title = 'Forgot Password | Visual Steps';
    else if (path === '/about') title = 'About | Visual Steps';

    document.title = title;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm no-print">
        <div className="container mx-auto flex h-10 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white shadow-sm">
                <Lightbulb className="h-3.5 w-3.5" />
              </div>
              <span className="text-base font-bold tracking-tight text-blue-900">Visual Steps</span>
            </Link>

            {user && (
              <nav className="hidden md:flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className={`text-[12px] font-bold uppercase tracking-wider transition-colors hover:text-blue-600 ${
                    isActive('/dashboard') ? 'text-blue-600' : 'text-slate-600'
                  }`}
                >
                  Dashboard
                </Link>
                
                {/* Activities Dropdown */}
                <div className="relative group">
                  <button
                    onMouseEnter={() => setIsActivitiesOpen(true)}
                    onMouseLeave={() => setIsActivitiesOpen(false)}
                    className={`flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider transition-colors hover:text-blue-600 ${
                      location.pathname.includes('activities') || 
                      location.pathname.includes('quizzes') || 
                      location.pathname.includes('social-stories') || 
                      location.pathname.includes('worksheets') 
                        ? 'text-blue-600' : 'text-slate-600'
                    }`}
                  >
                    Activities
                    <ChevronDown size={12} className={`transition-transform ${isActivitiesOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isActivitiesOpen && (
                    <div 
                      onMouseEnter={() => setIsActivitiesOpen(true)}
                      onMouseLeave={() => setIsActivitiesOpen(false)}
                      className="absolute left-0 mt-0 w-48 rounded-lg bg-white shadow-xl ring-1 ring-black/5 py-1 z-[60]"
                    >
                      <Link
                        to="/activity-library"
                        className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 uppercase tracking-wider"
                        onClick={() => setIsActivitiesOpen(false)}
                      >
                        <Sparkles size={14} className="text-blue-500" />
                        Create Activity
                      </Link>
                      <Link
                        to="/saved-quizzes"
                        className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 uppercase tracking-wider"
                        onClick={() => setIsActivitiesOpen(false)}
                      >
                        <Gamepad2 size={14} className="text-indigo-500" />
                        Quizzes
                      </Link>
                      <Link
                        to="/social-stories"
                        className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 uppercase tracking-wider"
                        onClick={() => setIsActivitiesOpen(false)}
                      >
                        <BookOpen size={14} className="text-pink-500" />
                        Social Stories
                      </Link>
                      <Link
                        to="/saved-worksheets"
                        className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 uppercase tracking-wider"
                        onClick={() => setIsActivitiesOpen(false)}
                      >
                        <FileText size={14} className="text-amber-500" />
                        Worksheets
                      </Link>
                      <Link
                        to="/games"
                        className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 uppercase tracking-wider"
                        onClick={() => setIsActivitiesOpen(false)}
                      >
                        <Gamepad2 size={14} className="text-emerald-500" />
                        Games
                      </Link>
                    </div>
                  )}
                </div>

                <Link
                  to="/profile"
                  className={`text-[12px] font-bold uppercase tracking-wider transition-colors hover:text-blue-600 ${
                    isActive('/profile') ? 'text-blue-600' : 'text-slate-600'
                  }`}
                >
                  Profile
                </Link>
              </nav>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/about" className="text-[12px] font-bold text-slate-600 hover:text-blue-600 uppercase tracking-wider transition-colors mr-4">
              About
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-slate-500">Hi, {user.name.split(' ')[0]}</span>
                <Button variant="ghost" size="xs" onClick={logout} className="h-7 text-[11px] px-1.5">
                  <LogOut className="mr-1 h-3 w-3" />
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link to="/login">
                  <Button variant="ghost" size="xs" className="h-7 text-[12px] px-2">Sign in</Button>
                </Link>
                <Link to="/signup">
                  <Button size="xs" className="h-7 text-[12px] px-2">Join now</Button>
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
                    <Link to="/activity-library" className="text-[12px] font-bold text-slate-600 uppercase flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                      <Sparkles size={14} className="text-blue-500" /> Create Activity
                    </Link>
                    <Link to="/saved-quizzes" className="text-[12px] font-bold text-slate-600 uppercase flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                      <Gamepad2 size={14} className="text-indigo-500" /> Quizzes
                    </Link>
                    <Link to="/social-stories" className="text-[12px] font-bold text-slate-600 uppercase flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                      <BookOpen size={14} className="text-pink-500" /> Social Stories
                    </Link>
                    <Link to="/saved-worksheets" className="text-[12px] font-bold text-slate-600 uppercase flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                      <FileText size={14} className="text-amber-500" /> Worksheets
                    </Link>
                    <Link to="/games" className="text-[12px] font-bold text-slate-600 uppercase flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                      <Gamepad2 size={14} className="text-emerald-500" /> Games
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

      <main className="container mx-auto px-4 py-2">
        <Outlet />
      </main>
      
      <footer className="border-t border-slate-200 bg-white py-1 mt-auto no-print">
        <div className="container mx-auto px-4 flex flex-col items-center gap-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
            &copy; {new Date().getFullYear()} Visual Steps.
          </div>
        </div>
      </footer>
    </div>
  );
}
