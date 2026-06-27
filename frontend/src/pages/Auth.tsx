import React, { useState } from 'react';
import { User, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onLoginSuccess: () => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [screen, setScreen] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg('');
    setError('');

    try {
      if (screen === 'login') {
        const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
        if (authErr) throw authErr;
        onLoginSuccess();
      } else if (screen === 'signup') {
        const { error: authErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (authErr) throw authErr;
        setMsg('Account created! Check your email to confirm, then sign in.');
        setScreen('login');
      } else {
        const { error: authErr } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (authErr) throw authErr;
        setMsg(`Reset link sent to ${email}. Check your spam folder.`);
        setScreen('login');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-lavender-tint flex flex-col items-center justify-center p-4 antialiased font-sans relative overflow-hidden">

      {/* MASSIVE OUTLINE WATERMARK BACKGROUND */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none z-0 opacity-10 w-full text-center leading-none">
        <span className="massive-text outline-text block text-[130px] md:text-[240px]">madmix</span>
      </div>

      {/* Container Card */}
      <div className="w-full max-w-md bg-brand-white rounded-2xl border border-brand-lavender/30 p-8 flex flex-col space-y-6 relative z-10 shadow-xl">

        {/* Playful Logo Wordmark */}
        <div className="flex flex-col items-center space-y-1 border-b border-brand-lavender-tint/40 pb-5">
          <span className="font-fredoka text-4xl font-bold tracking-tight text-brand-purple lowercase flex items-center">
            madmix
            <span className="text-xs font-sans font-medium text-brand-purple align-super ml-0.5">®</span>
          </span>
          <p className="text-[10px] uppercase tracking-[0.2em] text-brand-purple/70 font-mono font-bold mt-1">
            Insights & Operations Portal
          </p>
        </div>

        {/* Intro */}
        <div className="text-center space-y-1.5">
          <h2 className="font-fredoka font-bold text-lg text-brand-near-black uppercase tracking-tight">
            {screen === 'login' && 'Welcome Back, Partner'}
            {screen === 'signup' && 'Join the MadMix Crew'}
            {screen === 'forgot' && 'Retrieve Your Key'}
          </h2>
          <p className="text-xs text-brand-near-black/70">
            {screen === 'login' && 'Get updates on sales and operations inside our dashboard.'}
            {screen === 'signup' && 'Be in the know. All operational access is pre-authorized.'}
            {screen === 'forgot' && 'We'll email you instructions to restore operational portal.'}
          </p>
        </div>

        {msg && (
          <div className="p-3 bg-brand-green/10 border border-brand-green/20 text-brand-green rounded-full text-center text-xs font-mono font-bold uppercase tracking-wider">
            {msg}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-center text-xs font-mono font-bold tracking-wider">
            {error}
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {screen === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-brand-near-black/50 uppercase tracking-widest block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-purple" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-brand-lavender-tint/20 border border-brand-lavender/25 text-brand-near-black focus:border-brand-purple rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-purple font-mono"
                  placeholder="Enter your full name"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-brand-near-black/50 uppercase tracking-widest block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-purple" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-brand-lavender-tint/20 border border-brand-lavender/25 text-brand-near-black focus:border-brand-purple rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-purple font-mono"
                placeholder="email@madmix.co"
              />
            </div>
          </div>

          {screen !== 'forgot' && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono font-bold text-brand-near-black/50 uppercase tracking-widest block">Password</label>
                {screen === 'login' && (
                  <button
                    type="button"
                    onClick={() => setScreen('forgot')}
                    className="text-[10px] font-mono font-bold text-brand-purple uppercase tracking-wider hover:underline"
                  >
                    Forgot Key?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-purple" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-brand-lavender-tint/20 border border-brand-lavender/25 text-brand-near-black focus:border-brand-purple rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-purple font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            id="auth-submit-btn"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-brand-purple hover:bg-brand-purple/90 disabled:opacity-55 py-3.5 text-white font-mono font-bold uppercase text-xs tracking-wider rounded-full transition-all shadow-md mt-6 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <span>
                  {screen === 'login' && 'Sign In to Dashboard'}
                  {screen === 'signup' && 'Register Member'}
                  {screen === 'forgot' && 'Send Recovery Link'}
                </span>
                <ArrowRight className="w-4 h-4 text-white" />
              </>
            )}
          </button>
        </form>

        {/* Footer toggles */}
        <div className="text-center pt-4 border-t border-brand-lavender-tint/40 text-xs text-brand-near-black/60">
          {screen === 'login' ? (
            <p>
              New to the portal?{' '}
              <button
                onClick={() => { setScreen('signup'); setError(''); setMsg(''); }}
                className="font-bold text-brand-purple hover:underline"
              >
                Create Account
              </button>
            </p>
          ) : (
            <p>
              Already verified?{' '}
              <button
                onClick={() => { setScreen('login'); setError(''); setMsg(''); }}
                className="font-bold text-brand-purple hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

      </div>

      {/* Copy info box */}
      <div className="mt-6 text-[9px] font-mono uppercase tracking-widest text-brand-near-black/45 text-center relative z-10">
        © 2026 MadMix Snacks Ltd. Mumbai, MH. Internal Operations Only.
      </div>
    </div>
  );
}
