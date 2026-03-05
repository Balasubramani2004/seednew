import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  InputAdornment,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeModeContext';

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
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const successMessage = (location.state as { message?: string })?.message;
  const isSm = useMediaQuery(theme.breakpoints.up('sm'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await login({ email, password });
      if ('requires2fa' in response && response.requires2fa) {
        setTwoFactorToken(response.twoFactorToken);
        // Decode the token to detect email OTP vs TOTP
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
      setError(
        err.response?.data?.message ||
        'Login failed. Please check your credentials.'
      );
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
      setError(
        err.response?.data?.message || 'Invalid code. Please try again.'
      );
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          right: '-50%',
          width: '100%',
          height: '100%',
          background: `radial-gradient(circle, ${theme.palette.primary.light}30 0%, transparent 70%)`,
          pointerEvents: 'none',
        },
      }}
    >
      <IconButton
        onClick={toggleMode}
        aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          color: 'white',
          bgcolor: 'rgba(255,255,255,0.2)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
          zIndex: 1,
        }}
      >
        {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
      <Container maxWidth="sm">
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography
                variant="h4"
                fontWeight={800}
                gutterBottom
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Attend Ease
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Automated Attendance & Payroll System
              </Typography>
            </Box>

            {successMessage && (
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                {successMessage}
              </Alert>
            )}
            {error && (
              <Alert
                severity="error"
                sx={{ mb: 3, borderRadius: 2 }}
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            )}

            {step === '2fa' ? (
              <form onSubmit={handle2faSubmit}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {isEmailOtp ? '📧 Check Your Email' : '🔐 Two-Factor Authentication'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isEmailOtp
                      ? `A 6-digit verification code was sent to your email address. Enter it below to sign in.`
                      : 'Enter the 6-digit code from your authenticator app.'}
                  </Typography>
                </Box>
                <TextField
                  label="Verification code"
                  placeholder="000000"
                  fullWidth
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
                  margin="normal"
                  autoFocus
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading || twoFactorCode.length !== 6}
                  startIcon={<LoginIcon />}
                  sx={{
                    mt: 3,
                    mb: 2,
                    py: 1.75,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    boxShadow: `0 4px 14px 0 ${theme.palette.primary.main}40`,
                  }}
                >
                  {loading ? 'Verifying…' : 'Verify and sign in'}
                </Button>
                <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
                  <Typography
                    component="button"
                    type="button"
                    onClick={handleBackToLogin}
                    sx={{
                      color: 'primary.main',
                      textDecoration: 'none',
                      fontWeight: 600,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Back to sign in
                  </Typography>
                </Typography>
              </form>
            ) : (
              <form onSubmit={handleSubmit}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  margin="normal"
                  autoComplete="email"
                  autoFocus
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  margin="normal"
                  autoComplete="current-password"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? (
                            <VisibilityOff fontSize="small" />
                          ) : (
                            <Visibility fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={<LoginIcon />}
                  sx={{
                    mt: 3,
                    mb: 2,
                    py: 1.75,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    boxShadow: `0 4px 14px 0 ${theme.palette.primary.main}40`,
                  }}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
                <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
                  <Link
                    to="/forgot-password"
                    style={{
                      color: theme.palette.primary.main,
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Forgot password?
                  </Link>
                </Typography>
              </form>
            )}

            <Box
              sx={{
                mt: 3,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 2,
                border: 1,
                borderColor: 'grey.200',
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                fontWeight={600}
              >
                Demo credentials
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Email: admin@cambridge.edu.in
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Password: admin123
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Login;
