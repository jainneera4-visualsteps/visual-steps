import { supabase } from '../lib/supabase';
import { apiFetch, safeJson } from '../utils/api';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Card, CardContent } from '../components/Card';
import { ProductDemoVideo } from '../components/ProductDemoVideo';
import { IntroVideo } from '../components/IntroVideo';
import { HomeIllustrationSlideshow } from '../components/HomeIllustrationSlideshow';
import { AlertCircle, ArrowUpRight, Facebook, Instagram, ListTodo, Mail, Search, ShieldCheck, TrendingUp, UserRound, Eye, EyeOff } from 'lucide-react';
import { startGuestSession } from '../guest/guestSession';

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
  const [publicLinks, setPublicLinks] = useState<{ facebook?: string; instagram?: string }>({});
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

  useEffect(() => {
    fetch('/api/public-links')
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => setPublicLinks({ facebook: data.facebook, instagram: data.instagram }))
      .catch(() => setPublicLinks({}));
  }, []);

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
                Visual Steps helps families turn routines, learning and everyday responsibilities into clear visual activities a child / adult can understand, complete and celebrate.
              </p>
              <HomeIllustrationSlideshow />
            </div>

            {/* Right: Login Card */}
            <div className="w-full max-w-[400px] flex-shrink-0 space-y-5">
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
                      <button type="button" onClick={() => { startGuestSession(); navigate('/dashboard'); }} className="flex h-10 w-full items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100">
                        Continue as Guest
                      </button>
                      <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Families choose what to add. A nickname can be used, and private family information is never published automatically.</p>
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
              <div className="min-w-0">
                <IntroVideo />
              </div>
            </div>
          </div>

          <section className="relative mt-8 overflow-hidden rounded-[2rem] border border-amber-200/70 bg-gradient-to-br from-amber-100 via-sky-100 to-emerald-100 px-5 py-9 shadow-xl shadow-slate-300/30 sm:px-8 sm:py-11">
            <div aria-hidden="true" className="absolute -left-14 top-20 h-40 w-28 rotate-12 rounded-[45%] bg-sky-300/30" />
            <div aria-hidden="true" className="absolute -bottom-16 -right-8 h-40 w-32 -rotate-12 rounded-[45%] bg-orange-300/30" />
            <div className="relative mx-auto max-w-6xl">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-700">A calmer way to plan and grow</p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Why choose Visual Steps?</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">A planning and learning companion for autistic children and adults—and the families and caregivers supporting them.</p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                <article className="rounded-3xl border border-white bg-white/90 p-6 shadow-lg shadow-slate-400/10 sm:p-7">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-100 text-sky-700"><UserRound className="h-7 w-7" /></span>
                  <h3 className="mt-6 text-2xl font-black leading-tight text-slate-950">Made for each person</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Bring routines, responsibilities, learning, interests, and personal goals into one calm place. Support can be adapted to the person’s age, abilities, communication, and needs.</p>
                </article>

                <article className="rounded-3xl border border-white bg-white/90 p-6 shadow-lg shadow-slate-400/10 sm:p-7">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><ListTodo className="h-7 w-7" /></span>
                  <h3 className="mt-6 text-2xl font-black leading-tight text-slate-950">Clear, manageable next steps</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Turn plans into visual activities, schedules, learning resources, and meaningful rewards. The learner sees a focused view of what to do next without unnecessary clutter.</p>
                </article>

                <article className="rounded-3xl border border-white bg-white/90 p-6 shadow-lg shadow-slate-400/10 sm:p-7">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-700"><TrendingUp className="h-7 w-7" /></span>
                  <h3 className="mt-6 text-2xl font-black leading-tight text-slate-950">Grow with confidence</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Clear expectations can reduce uncertainty and support participation and independence. Parents and caregivers can notice progress, adjust support, and plan meaningful next activities together.</p>
                </article>
              </div>

              <div className="mt-6 rounded-2xl border border-white/80 bg-white/65 px-5 py-4 text-center text-sm font-semibold leading-6 text-slate-700 backdrop-blur-sm">Parents and caregivers create the plan. The child or adult sees a clear, focused schedule on their own device.</div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link to="/signup" className="rounded-full bg-brand-700 px-7 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-800">Get started</Link>
                <Link to="/about" className="rounded-full border border-brand-300 bg-white/70 px-7 py-3 text-sm font-black text-brand-800 transition hover:bg-white">Learn more</Link>
              </div>
            </div>
          </section>

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <section className="min-w-0">
              <div className="max-w-3xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">See how Visual Steps works</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">Explore at your own pace</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">Open the narrated tour for a closer look at the parent and learner experience.</p>
              </div>
              <div className="mt-5 space-y-5">
                <div className="min-w-0"><ProductDemoVideo /></div>
              </div>
            </section>

          <section className="rounded-3xl border border-brand-100 bg-white/75 p-5 shadow-sm sm:p-7">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">Explore, learn, and stay connected</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">A calmer place for families to grow together</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">Read practical weekly guidance and connect through available community pages after exploring what Visual Steps can offer your family.</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/newsletter/subscribe" className="group flex min-w-[16rem] flex-1 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 transition hover:-translate-y-0.5 hover:bg-blue-50">
                <span className="rounded-xl bg-white p-2 text-blue-600 shadow-sm"><Mail className="h-5 w-5" /></span>
                <span><strong className="block text-sm text-slate-900">Subscribe Newsletter</strong><small className="text-slate-600">Updates, ideas, and family resources</small></span>
                <ArrowUpRight className="ml-auto h-4 w-4 text-blue-500" />
              </Link>
              {publicLinks.facebook && <a href={publicLinks.facebook} target="_blank" rel="noreferrer" className="group flex min-w-[16rem] flex-1 items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 transition hover:-translate-y-0.5 hover:bg-sky-50">
                <span className="rounded-xl bg-white p-2 text-sky-700 shadow-sm"><Facebook className="h-5 w-5" /></span><span><strong className="block text-sm text-slate-900">Facebook</strong><small className="text-slate-600">Follow Visual Steps updates</small></span><ArrowUpRight className="ml-auto h-4 w-4 text-sky-600" />
              </a>}
              {publicLinks.instagram && <a href={publicLinks.instagram} target="_blank" rel="noreferrer" className="group flex min-w-[16rem] flex-1 items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/70 p-4 transition hover:-translate-y-0.5 hover:bg-rose-50">
                <span className="rounded-xl bg-white p-2 text-rose-600 shadow-sm"><Instagram className="h-5 w-5" /></span><span><strong className="block text-sm text-slate-900">Instagram</strong><small className="text-slate-600">See welcoming visual ideas</small></span><ArrowUpRight className="ml-auto h-4 w-4 text-rose-500" />
              </a>}
            </div>
          </section>
          </div>
        </div>
      </section>
    </div>
  );
}
