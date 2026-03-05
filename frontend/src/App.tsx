import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { ThemeModeProvider, useThemeMode } from './contexts/ThemeModeContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RootOrApp from './components/RootOrApp';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import SalarySlips from './pages/SalarySlips';
import SalarySlipView from './pages/SalarySlipView';
import Announcements from './pages/Announcements';
import Users from './pages/Users';
import Holidays from './pages/Holidays';
import Admin from './pages/Admin';
import LeaveApproval from './pages/LeaveApproval';
import Reports from './pages/Reports';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function getTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#4F46E5',
        light: '#818CF8',
        dark: '#3730A3',
      },
      secondary: {
        main: '#0EA5E9',
        light: '#38BDF8',
        dark: '#0284C7',
      },
      ...(mode === 'dark' && {
        background: {
          default: '#0F172A',
          paper: '#1E293B',
        },
      }),
      ...(mode === 'light' && {
        background: {
          default: '#F8FAFC',
          paper: '#FFFFFF',
        },
      }),
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 800 },
      h2: { fontWeight: 800 },
      h3: { fontWeight: 700 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 12,
            fontWeight: 600,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow:
              mode === 'light'
                ? '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)'
                : '0 1px 3px 0 rgb(0 0 0 / 0.2)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundImage: 'none',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          size: 'medium',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600,
          },
        },
      },
    },
  });
}

function AppWithTheme() {
  const { mode } = useThemeMode();
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<RootOrApp />}>
              <Route
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="leave" element={<Leave />} />
                <Route path="salary-slips" element={<SalarySlips />} />
                <Route path="salary-slips/view/:id" element={<SalarySlipView />} />
                <Route path="announcements" element={<Announcements />} />
                <Route path="users" element={<Users />} />
                <Route path="holidays" element={<Holidays />} />
                <Route path="admin" element={<Admin />} />
                <Route path="leave-approval" element={<LeaveApproval />} />
                <Route path="reports" element={<Reports />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <AppWithTheme />
      </ThemeModeProvider>
    </QueryClientProvider>
  );
}

export default App;
