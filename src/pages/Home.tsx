import { supabase } from '../lib/supabase';
import { apiFetch, safeJson } from '../utils/api';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { 
  AlertCircle, Sparkles, CheckCircle2, Clock, Search, User, ArrowRight, Eye, EyeOff
} from 'lucide-react';

interface Kid {
  id: string;
  name: string;
}

export default function Home() {
  const [loginMode, setLoginMode] = useState<'parent' | 'kid'>('parent');
  
  // Parent Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Kid Login State
  const [parentEmail, setParentEmail] = useState('');
  const [kids, setKids] = useState<Kid[]>([]);
  const [selectedKidId, setSelectedKidId] = useState('');
  const [kidCode, setKidCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'kid') {
      setLoginMode('kid');
      // Clear any stale kid session when entering kid mode
      localStorage.removeItem('kid_session');
    }
  }, [location]);

  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSearching(true);
    setKids([]);
    setSelectedKidId('');

    try {
      const res = await apiFetch('/api/kids/by-parent-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parentEmail.trim() }),
      });

      if (!res.ok) {
        const data = await safeJson(res);
        throw new Error(data.error || 'Parent not found');
      }

      const data = await safeJson(res);
      setKids(data.kids);
      if (data.kids.length > 0) {
        setSelectedKidId(data.kids[0].id);
      } else {
        setError('No kids found for this parent email.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKidId) {
      setError('Please select your name');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const res = await apiFetch('/api/kids/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kidCode, kidId: selectedKidId }),
      });

      if (!res.ok) {
        throw new Error('Invalid Kid Code');
      }

      const data = await safeJson(res);
      localStorage.setItem('kid_session', JSON.stringify({ kidId: data.kidId, token: data.token }));
      navigate(`/kids-dashboard/${data.kidId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      {/* Hero Section with Login */}
      <section className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-sky-50 py-6 px-6 shadow-md ring-1 ring-slate-200/50">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-8 lg:flex-row">
            {/* Left: Hero Text */}
            <div className="flex-1 text-center lg:text-left space-y-4">
              <h1 className="text-4xl md:text-6xl font-black text-blue-950 leading-[0.9] tracking-tighter">
                Personalized <span className="text-blue-600">Growth</span> for Every Child
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl">
                The all-in-one platform dedicated to helping parents and children with autism stay engaged with meaningful activities all day long. We help you motivate your kids for learning while having fun at the same time.
              </p>
              <div className="space-y-3 pt-4">
                <p className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em] opacity-60">
                  Why Parents Love Visual Steps:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-slate-600 text-sm">
                  <li className="flex items-start gap-3">
                    <div className="mt-1 bg-blue-100 p-1 rounded-md">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-slate-900 font-bold">Daily Connection & Motivation</strong>
                      <p className="text-xs text-slate-500 leading-relaxed">Send encouraging messages and fun emojis to your child throughout the day. This simple support builds their confidence and makes learning a joyful experience.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 bg-blue-100 p-1 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-slate-900 font-bold">Engaging Learning Quizzes</strong>
                      <p className="text-xs text-slate-500 leading-relaxed">Create fun quizzes that match your child's interests and learning pace. These activities turn lessons into exciting challenges that keep them motivated.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 bg-blue-100 p-1 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-slate-900 font-bold">Daily Routine Social Stories</strong>
                      <p className="text-xs text-slate-500 leading-relaxed">Use simple picture stories to help your child understand daily routines and transitions. These visual guides reduce anxiety and help them feel more independent.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 bg-blue-100 p-1 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-slate-900 font-bold">Meaningful Offline Activities</strong>
                      <p className="text-xs text-slate-500 leading-relaxed">Print custom worksheets to keep your child learning even when they are away from the screen. These hands-on activities are a great way to practice skills at home.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 bg-blue-100 p-1 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-slate-900 font-bold">Motivating Reward Systems</strong>
                      <p className="text-xs text-slate-500 leading-relaxed">Give your child fun rewards for completing their daily tasks and learning goals. This exciting system makes every success feel special and keeps them moving forward.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 bg-blue-100 p-1 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-slate-900 font-bold">Daily Progress Insights</strong>
                      <p className="text-xs text-slate-500 leading-relaxed">See how much your child is learning with simple daily progress reports. These insights help you celebrate their wins and plan for future growth.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 bg-blue-100 p-1 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-slate-900 font-bold">Independent Daily Engagement</strong>
                      <p className="text-xs text-slate-500 leading-relaxed">Give your child a simple dashboard they can use all by themselves. This easy interface helps them feel proud of their own progress and accomplishments.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 bg-blue-100 p-1 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-slate-900 font-bold">Safe & Secure Engagement</strong>
                      <p className="text-xs text-slate-500 leading-relaxed">We use strong security to keep your child's learning environment safe and private. You can focus on their growth knowing their digital journey is protected.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: Login Card */}
            <div className="w-full max-w-[400px] flex-shrink-0">
              <Card className="shadow-xl border-none ring-1 ring-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-100">
                  <button 
                    onClick={() => { setLoginMode('parent'); setError(''); }}
                    className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      loginMode === 'parent' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Parent Login
                  </button>
                  <button 
                    onClick={() => { setLoginMode('kid'); setError(''); }}
                    className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      loginMode === 'kid' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Kid Login
                  </button>
                </div>

                <CardContent className="px-6 py-6">
                  {error && (
                    <div className="mb-4 flex items-center gap-2 rounded bg-red-50 p-2 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {error}
                    </div>
                  )}

                  {loginMode === 'parent' ? (
                    <form onSubmit={handleParentSubmit} className="space-y-4">
                      <Input
                        label="Email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-10 text-sm"
                      />
                      <Input
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-10 text-sm"
                        rightElement={
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-slate-400 hover:text-slate-600 focus:outline-none"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        }
                      />
                      <div className="flex justify-end">
                        <Link to="/forgot-password" university-link="true" className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wider">
                          Forgot?
                        </Link>
                      </div>
                      <Button type="submit" size="sm" className="w-full h-10 text-sm font-bold uppercase tracking-wider" isLoading={isLoading}>
                        Sign In
                      </Button>
                      <div className="text-center pt-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          No account?{' '}
                          <Link to="/signup" className="text-blue-600 hover:underline">
                            Sign up
                          </Link>
                        </p>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleKidSubmit} className="space-y-5">
                      {/* Step 1: Parent Email Input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">1. Parent's Email</label>
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
                            <Input
                              type="email"
                              placeholder="parent@example.com"
                              value={parentEmail}
                              onChange={(e) => {
                                setParentEmail(e.target.value);
                                setKids([]);
                                setSelectedKidId('');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (parentEmail && !isSearching) {
                                    handleSearchParent(e as unknown as React.FormEvent);
                                  }
                                }
                              }}
                              required
                              className="h-10 text-sm"
                              disabled={isInitialLoading}
                            />
                          </div>
                          <Button 
                            type="button" 
                            onClick={handleSearchParent}
                            disabled={!parentEmail || isSearching}
                            className="h-10 w-10 flex-shrink-0 p-0 flex items-center justify-center mt-0"
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Step 2: Select Kid Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">2. Who are you?</label>
                        <div className="relative">
                          <select
                            value={selectedKidId}
                            onChange={(e) => setSelectedKidId(e.target.value)}
                            className="w-full h-10 rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none disabled:bg-slate-50 disabled:text-slate-400"
                            required
                            disabled={!parentEmail || isSearching}
                          >
                            <option value="">{isSearching ? 'Loading kids...' : 'Select Your Name'}</option>
                            {kids.map((kid) => (
                              <option key={kid.id} value={kid.id}>
                                {kid.name}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <User className="h-4 w-4 text-slate-400" />
                          </div>
                        </div>
                      </div>

                      {/* Step 3: Kid Code Input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">3. Your Kid Code</label>
                        <Input
                          type="text"
                          placeholder="Enter your code"
                          value={kidCode}
                          onChange={(e) => setKidCode(e.target.value)}
                          required
                          className="h-10 text-sm"
                          disabled={!selectedKidId}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        size="sm" 
                        className="w-full h-10 text-sm font-bold uppercase tracking-wider" 
                        isLoading={isLoading}
                        disabled={!kidCode}
                      >
                        Start My Activities
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
