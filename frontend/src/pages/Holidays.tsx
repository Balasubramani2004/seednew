import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Snackbar,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { holidaysApi } from '../api/holidays';
import { Holiday } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Holidays: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'LAB_ADMIN';
  const [open, setOpen] = useState(false);
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    date: '',
    name: '',
    description: '',
  });

  const { data: holidays, isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => holidaysApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: holidaysApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      handleClose();
      setSnackbar({ open: true, message: 'Holiday added successfully!', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Failed to add holiday', severity: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Holiday> }) =>
      holidaysApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      handleClose();
      setSnackbar({ open: true, message: 'Holiday updated successfully!', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Failed to update holiday', severity: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: holidaysApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setSnackbar({ open: true, message: 'Holiday deleted successfully!', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Failed to delete holiday', severity: 'error' });
    },
  });

  const handleClose = () => {
    setOpen(false);
    setEditHoliday(null);
    setFormData({ date: '', name: '', description: '' });
  };

  const handleOpen = (holiday?: Holiday) => {
    if (holiday) {
      setEditHoliday(holiday);
      setFormData({
        date: holiday.date.split('T')[0],
        name: holiday.name,
        description: holiday.description || '',
      });
    }
    setOpen(true);
  };

  const handleSubmit = () => {
    if (editHoliday) {
      updateMutation.mutate({
        id: editHoliday.id,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Sort holidays by date
  const sortedHolidays = holidays
    ? [...holidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  // Group holidays by year
  const holidaysByYear = sortedHolidays.reduce((acc, holiday) => {
    const year = new Date(holiday.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(holiday);
    return acc;
  }, {} as Record<number, Holiday[]>);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Holiday Calendar
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage company holidays
          </Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
            Add Holiday
          </Button>
        )}
      </Box>

      {Object.keys(holidaysByYear).length === 0 ? (
        <Card elevation={2}>
          <CardContent>
            <Alert severity="info">No holidays configured yet</Alert>
          </CardContent>
        </Card>
      ) : (
        Object.entries(holidaysByYear)
          .sort(([a], [b]) => parseInt(b) - parseInt(a))
          .map(([year, yearHolidays]) => (
            <Card key={year} elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {year} ({yearHolidays.length} holidays)
                </Typography>
                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <strong>Date</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Day</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Holiday Name</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Description</strong>
                        </TableCell>
                        {isAdmin && (
                          <TableCell align="center">
                            <strong>Actions</strong>
                          </TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {yearHolidays.map((holiday) => {
                        const date = new Date(holiday.date);
                        return (
                          <TableRow key={holiday.id} hover>
                            <TableCell>{date.toLocaleDateString('en-IN')}</TableCell>
                            <TableCell>
                              {date.toLocaleDateString('en-IN', { weekday: 'long' })}
                            </TableCell>
                            <TableCell>
                              <strong>{holiday.name}</strong>
                            </TableCell>
                            <TableCell>{holiday.description || '-'}</TableCell>
                            <TableCell align="center">
                              {isAdmin && (
                                <>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleOpen(holiday)}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDelete(holiday.id)}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ))
      )}

      {/* Add/Edit Holiday Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editHoliday ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="Holiday Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              label="Description (Optional)"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : editHoliday
                ? 'Update'
                : 'Add Holiday'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Holidays;
