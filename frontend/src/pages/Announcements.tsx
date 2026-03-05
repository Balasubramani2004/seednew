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
  Chip,
  Alert,
  Snackbar,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import { Add, Campaign, Edit, Delete } from '@mui/icons-material';
import { announcementsApi } from '../api/announcements';
import { useAuth } from '../contexts/AuthContext';
import { Announcement } from '../types';

const Announcements: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'LAB_ADMIN';
  const [open, setOpen] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState<Announcement | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'MEDIUM',
    targetAudience: 'ALL',
  });

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => announcementsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: announcementsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      handleClose();
      setSnackbar({ open: true, message: 'Announcement created!', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Failed to create announcement', severity: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => announcementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      handleClose();
      setSnackbar({ open: true, message: 'Announcement updated!', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Failed to update announcement', severity: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: announcementsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setSnackbar({ open: true, message: 'Announcement deleted!', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Failed to delete announcement', severity: 'error' });
    },
  });

  const handleOpen = (announcement?: Announcement) => {
    if (announcement) {
      setEditAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        targetAudience: announcement.targetAudience,
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditAnnouncement(null);
    setFormData({ title: '', content: '', priority: 'MEDIUM', targetAudience: 'ALL' });
  };

  const handleSubmit = () => {
    if (editAnnouncement) {
      updateMutation.mutate({ id: editAnnouncement.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      deleteMutation.mutate(id);
    }
  };

  const getPriorityColor = (priority: string): any => {
    switch (priority) {
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'default';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Announcements
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Company announcements and updates
          </Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
            New Announcement
          </Button>
        )}
      </Box>

      {announcements && announcements.length > 0 ? (
        announcements.map((announcement) => (
          <Card key={announcement.id} elevation={2} sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Campaign color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    {announcement.title}
                  </Typography>
                </Box>
                <Box display="flex" gap={1} alignItems="center">
                  <Chip
                    label={announcement.priority}
                    color={getPriorityColor(announcement.priority)}
                    size="small"
                  />
                  {announcement.isPinned && (
                    <Chip label="Pinned" color="info" size="small" variant="outlined" />
                  )}
                  {isAdmin && (
                    <>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpen(announcement)}
                        title="Edit announcement"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(announcement.id)}
                        title="Delete announcement"
                        disabled={deleteMutation.isPending}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Box>
              <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                {announcement.content}
              </Typography>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  By {announcement.creator?.name} &bull;{' '}
                  {new Date(announcement.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Typography>
                <Chip label={announcement.targetAudience} size="small" variant="outlined" />
              </Box>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card elevation={2}>
          <CardContent>
            <Alert severity="info">No announcements available</Alert>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Announcement Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                label="Priority"
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Target Audience</InputLabel>
              <Select
                value={formData.targetAudience}
                label="Target Audience"
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              >
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="EMPLOYEES">Employees Only</MenuItem>
                <MenuItem value="ADMINS">Admins Only</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createMutation.isPending || updateMutation.isPending || !formData.title || !formData.content}
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : editAnnouncement
                ? 'Update'
                : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Announcements;
