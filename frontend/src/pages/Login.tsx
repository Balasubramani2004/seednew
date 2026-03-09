import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isEmailOtp, setIsEmailOtp] = useState(false);
  const { login, complete2fa, completeEmailOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = (location.state as { message?: string })?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await login({ email, password });
      if ('requires2fa' in response && response.requires2fa) {
        setTwoFactorToken(response.twoFactorToken);
        try {
          const parts = response.twoFactorToken.split('.');
          const decoded = JSON.parse(atob(parts[1]));
          setIsEmailOtp(decoded.purpose === '2fa-email');
        } catch {
          setIsEmailOtp(false);
        }
        setStep('2fa');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handle2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEmailOtp) {
        await completeEmailOtp(twoFactorToken, twoFactorCode);
      } else {
        await complete2fa(twoFactorToken, twoFactorCode);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setStep('credentials');
    setTwoFactorToken('');
    setTwoFactorCode('');
    setIsEmailOtp(false);
    setError('');
  };

  return (
    <div style={styles.page}>
      <style>{`
        @media (max-width: 767px) {
          .login-photo-panel { display: none !important; }
        }
        input:focus, select:focus {
          outline: none;
        }
        .login-input-wrapper:focus-within {
          border-color: #2196F3 !important;
          box-shadow: 0 0 0 3px rgba(33,150,243,0.12);
        }
        .create-btn:hover:not(:disabled) {
          background: rgba(108,99,255,0.06) !important;
        }
        .sign-in-btn:hover:not(:disabled) {
          filter: brightness(1.08);
        }
      `}</style>

      {/* ── Left: Photo panel ── */}
      <div className="login-photo-panel" style={styles.photoPanel}>
        <img
          src="/samsung-seed-centre.png"
          alt="Samsung Seed Centre office"
          style={styles.photo}
        />
        <div style={styles.photoOverlay} />
        <div style={styles.brandWrapper}>
          <span style={styles.brandSamsung}>SAMSUNG</span>
          <span style={styles.brandSeed}>SEED CENTRE</span>
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div style={styles.formPanel}>
        <div style={styles.card}>

          {/* Top icon */}
          <div style={styles.iconCircle}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>

          {step === '2fa' ? (
            <>
              <h2 style={styles.heading}>{isEmailOtp ? '📧 Check Your Email' : '🔐 Two-Factor Auth'}</h2>
              <p style={styles.subheading}>
                {isEmailOtp
                  ? 'A 6-digit code was sent to your email. Enter it below.'
                  : 'Enter the 6-digit code from your authenticator app.'}
              </p>

              {error && <div style={styles.errorBox}>{error}</div>}

              <form onSubmit={handle2faSubmit} style={styles.form}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Verification Code</label>
                  <div className="login-input-wrapper" style={styles.inputWrapper}>
                    <span style={styles.inputIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      style={styles.input}
                      type="text"
                      placeholder="000000"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      inputMode="numeric"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="sign-in-btn"
                  style={{ ...styles.signInBtn, cursor: (loading || twoFactorCode.length !== 6) ? 'not-allowed' : 'pointer', opacity: (loading || twoFactorCode.length !== 6) ? 0.7 : 1 }}
                  disabled={loading || twoFactorCode.length !== 6}
                >
                  {loading ? 'Verifying…' : 'Verify & Sign In'}
                </button>

                <p style={{ textAlign: 'center', marginTop: 12, fontSize: 14, color: '#6b7280' }}>
                  <button type="button" onClick={handleBackToLogin} style={styles.textBtn}>
                    ← Back to sign in
                  </button>
                </p>
              </form>
            </>
          ) : (
            <>
              <h2 style={styles.heading}>Welcome Back</h2>
              <p style={styles.subheading}>Sign in to access your dashboard</p>

              {successMessage && <div style={styles.successBox}>{successMessage}</div>}
              {error && <div style={styles.errorBox}>{error}</div>}

              <form onSubmit={handleSubmit} style={styles.form}>

                {/* Email */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Email Address</label>
                  <div className="login-input-wrapper" style={styles.inputWrapper}>
                    <span style={styles.inputIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      style={styles.input}
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Password</label>
                  <div className="login-input-wrapper" style={styles.inputWrapper}>
                    <span style={styles.inputIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      style={styles.input}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>



                {/* Forgot Password */}
                <div style={{ textAlign: 'right', marginBottom: 16, marginTop: -4 }}>
                  <Link to="/forgot-password" style={styles.forgotLink}>
                    Forgot Password?
                  </Link>
                </div>

                {/* Sign In */}
                <button
                  type="submit"
                  className="sign-in-btn"
                  style={{ ...styles.signInBtn, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1 }}
                  disabled={loading}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>


              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#eef2f7',
  },

  /* Left photo panel — visible by default, hidden on mobile via media query */
  photoPanel: {
    flex: '0 0 45%',
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'brightness(0.5) blur(1px)',
  },
  photoOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(160deg, rgba(0,30,60,0.4) 0%, rgba(0,0,0,0.55) 100%)',
  },
  brandWrapper: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  brandSamsung: {
    fontSize: 'clamp(32px, 6vw, 68px)',
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '0.09em',
    textShadow: '0 3px 20px rgba(0,0,0,0.6)',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },
  brandSeed: {
    fontSize: 'clamp(22px, 4vw, 48px)',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '0.14em',
    textShadow: '0 3px 20px rgba(0,0,0,0.6)',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },

  /* Right form panel */
  formPanel: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    backgroundColor: '#eef2f7',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: '40px 36px 34px',
    width: '100%',
    maxWidth: 430,
    boxShadow: '0 8px 48px rgba(0,0,0,0.10)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #42a5f5 0%, #1565C0 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    boxShadow: '0 4px 18px rgba(33,150,243,0.38)',
  },

  heading: {
    margin: '0 0 6px',
    fontSize: 24,
    fontWeight: 800,
    color: '#1a2340',
    textAlign: 'center',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },
  subheading: {
    margin: '0 0 24px',
    fontSize: 14,
    color: '#8a95a8',
    textAlign: 'center',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },

  form: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    display: 'block',
    fontSize: 11.5,
    fontWeight: 600,
    color: '#8a95a8',
    marginBottom: 6,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1.6px solid #e5e9f0',
    borderRadius: 13,
    backgroundColor: '#fff',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    overflow: 'hidden',
  },
  inputIcon: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 6,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: 15,
    color: '#1a2340',
    padding: '13px 12px 13px 2px',
    backgroundColor: 'transparent',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },
  select: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: 15,
    color: '#1a2340',
    padding: '13px 36px 13px 2px',
    backgroundColor: 'transparent',
    appearance: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },
  eyeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0 14px 0 4px',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },

  forgotLink: {
    fontSize: 13,
    fontWeight: 600,
    color: '#6C63FF',
    textDecoration: 'none',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },

  signInBtn: {
    width: '100%',
    padding: '15px',
    borderRadius: 50,
    border: 'none',
    background: 'linear-gradient(90deg, #2196F3 0%, #1565C0 100%)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    marginTop: 4,
    marginBottom: 20,
    letterSpacing: '0.02em',
    boxShadow: '0 4px 18px rgba(33,150,243,0.32)',
    transition: 'filter 0.2s, opacity 0.2s',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },

  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e9f0',
  },
  dividerText: {
    fontSize: 13,
    color: '#adb5bd',
    whiteSpace: 'nowrap',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },

  createBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: 50,
    border: '1.8px solid #6C63FF',
    background: 'transparent',
    color: '#6C63FF',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'not-allowed',
    letterSpacing: '0.02em',
    transition: 'background 0.2s',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },

  textBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#2196F3',
    fontSize: 14,
    fontWeight: 600,
    padding: 0,
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },

  errorBox: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    fontSize: 13,
    marginBottom: 14,
    border: '1px solid #fecaca',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },
  successBox: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    color: '#166534',
    fontSize: 13,
    marginBottom: 14,
    border: '1px solid #bbf7d0',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },
};

export default Login;
