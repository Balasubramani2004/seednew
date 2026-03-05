import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  useTheme,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Timelapse,
  BeachAccess,
} from '@mui/icons-material';
import { attendanceApi } from '../api/attendance';
import { leaveApi } from '../api/leave';
import { announcementsApi } from '../api/announcements';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

type RangeKey = 'this_month' | 'last_month' | '3_months' | '6_months';

function getDateRange(range: RangeKey): { startDate: string; endDate: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const firstOfMonth = (y: number, m: number) => new Date(y, m, 1);
  const lastOfMonth = (y: number, m: number) => new Date(y, m + 1, 0);

  const y = now.getFullYear();
  const m = now.getMonth();

  if (range === 'this_month') return { startDate: fmt(firstOfMonth(y, m)), endDate: fmt(now) };
  if (range === 'last_month') return { startDate: fmt(firstOfMonth(y, m - 1)), endDate: fmt(lastOfMonth(y, m - 1)) };
  if (range === '3_months') return { startDate: fmt(firstOfMonth(y, m - 2)), endDate: fmt(now) };
  return { startDate: fmt(firstOfMonth(y, m - 5)), endDate: fmt(now) };
}

function shortMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString('default', { month: 'short', year: '2-digit' });
}

function shortDate(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

const RangeLabel: Record<RangeKey, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  '3_months': '3 Months',
  '6_months': '6 Months',
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isAdmin = user?.role === Role.LAB_ADMIN || user?.role === Role.SUPER_ADMIN;

  const [range, setRange] = useState<RangeKey>('this_month');
  const dateRange = getDateRange(range);

  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => attendanceApi.getDashboard(),
  });

  const { data: leaveBalance, isLoading: leaveLoading } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveApi.getBalance(),
  });

  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => announcementsApi.getAll(),
  });

  if (statsLoading || leaveLoading || announcementsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  const statCards = [
    {
      title: 'Present Days',
      value: dashboardStats?.presentDays || 0,
      icon: <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />,
      color: 'success.light',
    },
    {
      title: 'Absent Days',
      value: dashboardStats?.absentDays || 0,
      icon: <Cancel sx={{ fontSize: 40, color: 'error.main' }} />,
      color: 'error.light',
    },
    {
      title: 'Half Days',
      value: dashboardStats?.halfDays || 0,
      icon: <Timelapse sx={{ fontSize: 40, color: 'warning.main' }} />,
      color: 'warning.light',
    },
    {
      title: 'Casual Leaves',
      value: dashboardStats?.casualLeaves || 0,
      icon: <BeachAccess sx={{ fontSize: 40, color: 'info.main' }} />,
      color: 'info.light',
    },
  ];

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Welcome back, {user?.name}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's an overview of your attendance and performance this month
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Stat Cards */}
        {statCards.map((card, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card
              elevation={0}
              sx={{
                border: 1,
                borderColor: 'divider',
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 20px rgb(0 0 0 / 0.08)',
                  borderColor: 'primary.light',
                },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2" fontWeight={600} gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: card.color, p: 1.5, borderRadius: 2 }}>{card.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}


        {/* Leave Balance */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Leave Balance
              </Typography>
              <Box mt={2}>
                <Box display="flex" justifyContent="space-between" mb={1.5}>
                  <Typography variant="body2" color="text.secondary">Total Leaves</Typography>
                  <Typography variant="body2" fontWeight={600}>{leaveBalance?.totalLeaves || 12}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1.5}>
                  <Typography variant="body2" color="text.secondary">Used</Typography>
                  <Typography variant="body2" color="error.main" fontWeight={600}>{leaveBalance?.usedLeaves || 0}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1.5}>
                  <Typography variant="body2" color="text.secondary">Pending</Typography>
                  <Typography variant="body2" color="warning.main" fontWeight={600}>{leaveBalance?.pendingLeaves || 0}</Typography>
                </Box>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}
                >
                  <Typography variant="body2" fontWeight={700}>Available</Typography>
                  <Typography variant="body2" color="success.main" fontWeight={700}>{leaveBalance?.availableLeaves || 12}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Announcements */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Recent Announcements
              </Typography>
              <Box mt={2}>
                {announcements && announcements.length > 0 ? (
                  announcements.slice(0, 5).map((announcement) => (
                    <Paper
                      key={announcement.id}
                      elevation={0}
                      sx={{
                        p: 2,
                        mb: 1.5,
                        borderRadius: 2,
                        bgcolor: announcement.isRead ? 'grey.50' : 'primary.50',
                        border: 1,
                        borderColor: announcement.isRead ? 'grey.200' : 'primary.200',
                      }}
                    >
                      <Box display="flex" alignItems="center" mb={0.5}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ flexGrow: 1 }}>
                          {announcement.title}
                        </Typography>
                        <Chip
                          label={announcement.priority}
                          size="small"
                          color={
                            announcement.priority === 'HIGH'
                              ? 'error'
                              : announcement.priority === 'MEDIUM'
                                ? 'warning'
                                : 'default'
                          }
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {announcement.content}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        By {announcement.creator.name} · {new Date(announcement.createdAt).toLocaleDateString()}
                      </Typography>
                    </Paper>
                  ))
                ) : (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    No announcements available
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
};

export default Dashboard;
