import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  Divider, // Divider is imported but not used, keeping for completeness
  CircularProgress,
  Box,
  TablePagination,
  Badge
} from '@mui/material';
import {
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

  // FIX: Use useCallback to memoize the fetch function and avoid recreating it.
  // This makes the function stable and safe to be a dependency.
  const fetchAssessments = useCallback(async () => {
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
      
      // Ensure data.assessments exists and is an array
      setAssessments(Array.isArray(data.assessments) ? data.assessments : data);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      enqueueSnackbar(`Failed to load assessments: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, enqueueSnackbar]); // Dependencies added

  // FIX: Add fetchAssessments as a dependency. Now that it's wrapped in useCallback, 
  // it only changes when activeTab or enqueueSnackbar changes.
  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]); 

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
      fetchAssessments(); // Refresh the list - fetchAssessments is now stable
    } catch (err) {
      console.error('Error starting assessment:', err);
      enqueueSnackbar(`Failed to start assessment: ${err.message}`, { 
        variant: 'error',
        autoHideDuration: 5000
      });
    }
  };
  
  // NOTE: The backend API request already filters by status based on `activeTab`. 
  // We can simplify `filteredAssessments` or remove it if the backend does all the work.
  // Keeping it as a filter just in case the API returns all, but the initial code suggests pre-filtering.
  // If the API returns ONLY the activeTab data, this filter is redundant and should be removed.
  // For safety, let's assume the API pre-filters and remove the client-side filter.
  // const filteredAssessments = assessments; // Simplified, assuming API filters

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Assessment Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Use consistent status values */}
          {Object.keys(statusConfig).map((tab) => (
            <Chip
              key={tab}
              label={tab.replace('_', ' ')}
              onClick={() => {
                setActiveTab(tab);
                setPage(0); // Reset page on tab change for better UX
              }}
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
      ) : assessments.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          No {activeTab.replace('_', ' ')} assessments found
        </Typography>
      ) : (
        <>
          <List sx={{ mb: 2 }}>
            {assessments // Use assessments directly
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((assessment) => (
                <ListItem 
                  key={assessment.id} 
                  divider
                  secondaryAction={
                    <Button
                      variant="contained"
                      size="small"
                      // Ensure assessment.status exists in statusConfig before accessing icon
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
                          // Ensure assessment.status exists in statusConfig before accessing color
                          color={statusConfig[assessment.status]?.color || 'default'}
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
                          Created: {new Date(assessment.createdAt).toLocaleDateString()} {/* Added formatting */}
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
            count={assessments.length} // Use assessments.length directly
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
