'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HyperspeedCanvas from '@/components/HyperspeedCanvas';
import { api } from '@/lib/api';

const SeismoIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [accel, setAccel]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  // If already authenticated, skip to dashboard
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('ss_auth') === '1') {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || password.length < 4) {
      setError('Please enter a valid email and password (min 4 chars).');
      return;
    }

    setLoading(true);

    try {
      const data = await api.login(email, password);
      localStorage.setItem('ss_token', data.access_token);
      localStorage.setItem('ss_auth', '1');
      localStorage.setItem('ss_user', JSON.stringify({ email }));
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 900);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#07070F' }}
      onMouseDown={() => setAccel(true)}
      onMouseUp={() => setAccel(false)}
      onTouchStart={() => setAccel(true)}
      onTouchEnd={() => setAccel(false)}
    >
      <HyperspeedCanvas accelerate={accel} />

      {/* Overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(8,8,20,0.35) 0%, rgba(7,7,15,0.55) 100%)',
      }} />

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', padding: '14px 32px',
        background: 'rgba(7,7,15,0.5)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '7px',
            background: 'linear-gradient(135deg, #1565C0, #2196F3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px rgba(33,150,243,0.45)',
          }}>
            <SeismoIcon />
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
            Seismo<span style={{ color: '#2196F3' }}>Sense</span>
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {[{ label: 'Features', href: '#' }, { label: 'About', href: '#' }].map(l => (
          <Link key={l.label} href={l.href} style={{
            marginLeft: '28px',
            fontFamily: 'Inter, sans-serif', fontSize: '14px',
            color: 'rgba(255,255,255,0.65)', textDecoration: 'none',
          }}>{l.label}</Link>
        ))}

        <Link href="/signup" style={{
          marginLeft: '24px', padding: '8px 20px',
          borderRadius: '8px', background: '#fff', color: '#07070F',
          fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600,
          textDecoration: 'none',
        }}>Sign up</Link>
      </nav>

      {/* ── Auth Card ── */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 20, width: '100%', maxWidth: '400px',
        padding: '0 16px',
      }}>
        <div style={{
          background: 'rgba(10,10,22,0.84)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '14px',
          padding: '36px 32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(33,150,243,0.08)',
        }}>

          {/* Success state */}
          {success ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'rgba(33,150,243,0.12)',
                border: '2px solid #2196F3',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px',
                boxShadow: '0 0 24px rgba(33,150,243,0.35)',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2196F3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
                Authenticated!
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
                Redirecting to dashboard…
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1565C0, #2196F3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                  boxShadow: '0 0 20px rgba(33,150,243,0.4)',
                }}>
                  <SeismoIcon />
                </div>
                <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                  Welcome back
                </h1>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '5px' }}>
                  Sign in to SeismoSense
                </p>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: '9px 12px', marginBottom: '14px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '7px', fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#EF4444',
                }}>
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Email */}
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: '6px' }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={{
                      width: '100%', padding: '10px 13px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '7px',
                      color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '14px',
                      outline: 'none',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#2196F3'; e.target.style.boxShadow = '0 0 0 3px rgba(33,150,243,0.18)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                {/* Password */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>Password</label>
                    <Link href="#" style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#2196F3', textDecoration: 'none' }}>Forgot password?</Link>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: '100%', padding: '10px 40px 10px 13px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '7px',
                        color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '14px',
                        outline: 'none',
                      }}
                      onFocus={e => { e.target.style.borderColor = '#2196F3'; e.target.style.boxShadow = '0 0 0 3px rgba(33,150,243,0.18)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: '2px',
                    }}>
                      {showPw
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: '6px',
                    width: '100%', padding: '11px',
                    borderRadius: '7px', border: 'none',
                    background: loading ? 'rgba(33,150,243,0.45)' : 'linear-gradient(135deg, #1976D2, #2196F3)',
                    color: '#fff',
                    fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 0 20px rgba(33,150,243,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"
                        style={{ animation: 'spin 0.8s linear infinite' }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Signing in…
                    </>
                  ) : 'Sign in →'}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '20px' }}>
                Don&apos;t have an account?{' '}
                <Link href="/signup" style={{ color: '#2196F3', textDecoration: 'none', fontWeight: 500 }}>Sign up</Link>
              </p>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '14px', fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.22)' }}>
          Click &amp; hold anywhere to activate hyperspeed ⚡
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
