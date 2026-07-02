'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HyperspeedCanvas from '@/components/HyperspeedCanvas';
import { api } from '@/lib/api';

const SeismoIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

function Field({ label, type = 'text', value, onChange, placeholder, required }) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const isPw = type === 'password';

  return (
    <div>
      <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPw && showPw ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          style={{
            width: '100%',
            padding: isPw ? '10px 40px 10px 13px' : '10px 13px',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${focused ? '#2196F3' : 'rgba(255,255,255,0.1)'}`,
            boxShadow: focused ? '0 0 0 3px rgba(33,150,243,0.18)' : 'none',
            borderRadius: '7px',
            color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '14px',
            outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {isPw && (
          <button type="button" onClick={() => setShowPw(v => !v)} style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: '2px',
          }}>
            {showPw
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
        )}
      </div>
    </div>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [accel, setAccel]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [step, setStep]     = useState(0); // 0 = form, 1 = success

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return;
    setLoading(true);
    try {
      await api.signup({ name: form.name, email: form.email, password: form.password });
      setStep(1);
    } catch (err) {
      setError(err.message || 'Failed to create account.');
      setLoading(false);
    }
  };

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthColors = ['#EF4444', '#F59E0B', '#2196F3', '#10B981'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

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
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(8,8,20,0.35) 0%, rgba(7,7,15,0.55) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', padding: '14px 32px',
        background: 'rgba(7,7,15,0.5)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
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
        </Link>

        <div style={{ flex: 1 }} />

        {[{ label: 'Features', href: '#' }, { label: 'About', href: '#' }].map(l => (
          <Link key={l.label} href={l.href} style={{ marginLeft: '28px', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>{l.label}</Link>
        ))}

        <Link href="/signin" style={{
          marginLeft: '24px', padding: '8px 20px',
          borderRadius: '8px',
          background: '#fff', color: '#07070F',
          fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600,
          textDecoration: 'none',
        }}>Sign in</Link>
      </nav>

      {/* ── Auth Card ── */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 20, width: '100%', maxWidth: '420px',
        padding: '0 16px',
      }}>
        <div style={{
          background: 'rgba(10,10,22,0.82)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '14px',
          padding: '36px 32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(33,150,243,0.08)',
        }}>

          {step === 0 ? (
            <>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '26px' }}>
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
                  Create your account
                </h1>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '5px' }}>
                  Join SeismoSense — monitor the planet
                </p>
              </div>



              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                {error && (
                  <div style={{
                    padding: '9px 12px',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '7px', fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#EF4444',
                  }}>
                    {error}
                  </div>
                )}
                <Field label="Full name"         type="text"     value={form.name}     onChange={set('name')}     placeholder="Geophysicist Name" required />
                <Field label="Email address"     type="email"    value={form.email}    onChange={set('email')}    placeholder="you@example.com" required />
                <Field label="Password"          type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" required />

                {/* Password strength */}
                {form.password && (
                  <div>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[0,1,2,3].map(i => (
                        <div key={i} style={{
                          flex: 1, height: '3px', borderRadius: '99px',
                          background: i < strength ? strengthColors[strength - 1] : 'rgba(255,255,255,0.1)',
                          transition: 'background 0.3s',
                        }} />
                      ))}
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: strength > 0 ? strengthColors[strength-1] : '#fff' }}>
                      {strength > 0 ? strengthLabels[strength-1] : ''}
                    </span>
                  </div>
                )}

                <Field label="Confirm password" type="password" value={form.confirm}  onChange={set('confirm')}  placeholder="Repeat password" required />

                {/* Password mismatch warning */}
                {form.confirm && form.password !== form.confirm && (
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#EF4444', marginTop: '-6px' }}>
                    ⚠ Passwords do not match
                  </div>
                )}

                {/* Terms */}
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                  By creating an account you agree to our{' '}
                  <Link href="#" style={{ color: '#2196F3', textDecoration: 'none' }}>Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="#" style={{ color: '#2196F3', textDecoration: 'none' }}>Privacy Policy</Link>.
                </p>

                <button
                  type="submit"
                  disabled={loading || (form.confirm && form.password !== form.confirm)}
                  style={{
                    marginTop: '4px',
                    width: '100%', padding: '11px',
                    borderRadius: '7px', border: 'none',
                    background: loading ? 'rgba(33,150,243,0.5)' : 'linear-gradient(135deg, #1976D2, #2196F3)',
                    color: '#fff',
                    fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 0 20px rgba(33,150,243,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'opacity 0.2s',
                  }}
                >
                  {loading ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Creating account…
                    </>
                  ) : 'Create account →'}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '20px' }}>
                Already have an account?{' '}
                <Link href="/signin" style={{ color: '#2196F3', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
              </p>
            </>
          ) : (
            /* ── Success state ── */
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(16,185,129,0.15)', border: '2px solid #10B981',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 0 24px rgba(16,185,129,0.3)',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                Account created!
              </h2>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px', lineHeight: 1.6 }}>
                Welcome to SeismoSense, {form.name.split(' ')[0] || 'Analyst'}.<br />
                Check your email to verify your account.
              </p>
              <button onClick={() => router.push('/signin')} style={{
                display: 'inline-block', padding: '11px 28px',
                background: 'linear-gradient(135deg, #1976D2, #2196F3)',
                color: '#fff', borderRadius: '7px', border: 'none',
                fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600,
                boxShadow: '0 0 20px rgba(33,150,243,0.35)',
                cursor: 'pointer',
              }}>
                Sign In →
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '16px', fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.22)' }}>
          Click &amp; hold anywhere to activate hyperspeed ⚡
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
