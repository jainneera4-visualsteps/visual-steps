import { supabase } from '../lib/supabase';
import { apiFetch, safeJson } from '../utils/api';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Card, CardContent } from '../components/Card';
import { FeatureHighlights } from '../components/FeatureHighlights';
import { AlertCircle, Search, Eye, EyeOff } from 'lucide-react';

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
  const [isInitialLoading] = useState(false);

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;
      if (!data.session) {
        throw new Error('Login succeeded, but no authentication session was created. Please try again.');
      }

      // AuthContext loads the matching parent profile after SIGNED_IN. Its user
      // state effect above performs the navigation once the protected route is
      // ready, avoiding a redirect race back to the login page.
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
    <div className="w-full flex items-center justify-center">
      {/* Hero Section with Login */}
      <section className="public-hero w-full bg-gradient-to-br from-brand-50/90 via-white to-emerald-50/60 px-5 py-8 sm:px-8 sm:py-12">
        <div className="w-full">
          <div className="flex flex-col items-start gap-8 lg:flex-row">
            {/* Left: Hero Text */}
            <div className="flex-1 text-center lg:text-left space-y-4">
              <div className="inline-flex items-center rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-800">
                Calmer routines • clearer next steps
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-slate-950 leading-[0.98] tracking-tight">
                Make every day feel more <span className="text-brand-600">possible.</span>
              </h1>
              <p className="text-lg leading-8 text-slate-600 max-w-2xl">
                Visual Steps helps families turn routines, learning and everyday responsibilities into clear visual activities children can understand, complete and celebrate.
              </p>
              <figure className="relative overflow-hidden rounded-3xl border border-white/90 bg-white shadow-lg shadow-slate-300/25">
                <img
                  src="/illustrations/home-family-routine.webp"
                  alt="A parent and child calmly organizing picture cards on a visual daily schedule"
                  className="h-56 w-full object-cover object-center sm:h-72"
                  width="1440"
                  height="960"
                  fetchPriority="high"
                />
                <figcaption className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md">
                  Clear routines. Confident next steps.
                </figcaption>
              </figure>
              <div className="space-y-5 pt-4">
                <p className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em] opacity-60">
                  Built for the way families really work
                </p>
                <FeatureHighlights surface="home" limit={10} detailed columns={2} />
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
                      <div className="relative py-1">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                        <div className="relative flex justify-center"><span className="bg-white px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">or explore first</span></div>
                      </div>
                      <Link to="/demo" className="flex h-10 w-full items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100">
                        Try Guest Demo
                      </Link>
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
                        <div>
                          <Select
                            value={selectedKidId}
                            onChange={(e) => setSelectedKidId(e.target.value)}
                            className="h-10"
                            required
                            disabled={!parentEmail || isSearching}
                          >
                            <option value="">{isSearching ? 'Loading kids...' : 'Select Your Name'}</option>
                            {kids.map((kid) => (
                              <option key={kid.id} value={kid.id}>
                                {kid.name}
                              </option>
                            ))}
                          </Select>
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
