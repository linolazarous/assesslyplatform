import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Box,
  TablePagination,
  Badge
} from '@mui/material';
import {
  Assignment,
  People,
  CheckCircle,
  HourglassEmpty,
  DoneAll
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import PropTypes from 'prop-types';

const statusConfig = {
  active: { color: 'success', icon: <CheckCircle /> },
  in_progress: { color: 'warning', icon: <HourglassEmpty /> },
  completed: { color: 'primary', icon: <DoneAll /> }
};

export default function AssessmentDashboard() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const { enqueueSnackbar } = useSnackbar();

  // New function to fetch assessments from the Vercel API
  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch(`/api/assessments?status=${activeTab}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch assessments');
      }

      setAssessments(data.assessments);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      enqueueSnackbar('Failed to load assessments', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [activeTab, enqueueSnackbar]);

  const handleStartAssessment = async (assessmentId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch(`/api/assessments/${assessmentId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to start assessment');
      }

      enqueueSnackbar('Assessment started', { variant: 'success' });
      fetchAssessments(); // Refresh the list
    } catch (err) {
      console.error('Error starting assessment:', err);
      enqueueSnackbar(`Failed to start assessment: ${err.message}`, { 
        variant: 'error',
        autoHideDuration: 5000
      });
    }
  };

  const filteredAssessments = assessments.filter(a => 
    activeTab === 'all' || a.status === activeTab
  );

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Assessment Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {['active', 'in_progress', 'completed'].map((tab) => (
            <Chip
              key={tab}
              label={tab.replace('_', ' ')}
              onClick={() => setActiveTab(tab)}
              color={activeTab === tab ? 'primary' : 'default'}
              variant={activeTab === tab ? 'filled' : 'outlined'}
              sx={{ textTransform: 'capitalize' }}
            />
          ))}
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredAssessments.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          No {activeTab.replace('_', ' ')} assessments found
        </Typography>
      ) : (
        <>
          <List sx={{ mb: 2 }}>
            {filteredAssessments
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((assessment) => (
                <ListItem 
                  key={assessment.id} 
                  divider
                  secondaryAction={
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={statusConfig[assessment.status]?.icon}
                      onClick={() => handleStartAssessment(assessment.id)}
                      disabled={assessment.status === 'completed'}
                      sx={{ textTransform: 'capitalize' }}
                    >
                      {assessment.status === 'active' ? 'Start' : 
                       assessment.status === 'in_progress' ? 'Continue' : 'Completed'}
                    </Button>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Badge
                          color={statusConfig[assessment.status]?.color}
                          variant="dot"
                          overlap="circular"
                        >
                          <Typography fontWeight="medium">
                            {assessment.title}
                          </Typography>
                        </Badge>
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" component="span" display="block">
                          Created: {assessment.createdAt}
                        </Typography>
                        {assessment.dueDate && (
                          <Typography variant="body2" component="span" display="block">
                            Due: {new Date(assessment.dueDate).toLocaleString()}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
          </List>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredAssessments.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </>
      )}
    </Paper>
  );
}

AssessmentDashboard.propTypes = {
  // Add prop types if needed based on parent components
};
