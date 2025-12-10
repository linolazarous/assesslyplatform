// src/pages/AssessmentDetail/index.jsx
import React, { Suspense, lazy, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Chip,
  IconButton,
  Button,
  CircularProgress,
  Tooltip,
  Breadcrumbs,
  Link,
  Alert,
  LinearProgress,
  Divider,
  Tab,
  Tabs,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  Share,
  Download,
  BarChart,
  People,
  Assignment,
  Schedule,
  Visibility,
  ContentCopy,
  QrCode,
  Lock,
  Public,
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

// Lazy components
const AssessmentAnalytics = lazy(() => 
  import('../../components/assessments/AnalyticsDashboard')
);

const CandidateList = lazy(() => 
  import('../../components/assessments/CandidateList')
);

const QuestionEditor = lazy(() => 
  import('../../components/assessments/QuestionEditor')
);

const ShareAssessmentDialog = lazy(() => 
  import('../../components/assessments/ShareAssessmentDialog')
);

const DeleteConfirmationDialog = lazy(() => 
  import('../../components/assessments/DeleteConfirmationDialog')
);

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`assessment-tabpanel-${index}`}
      aria-labelledby={`assessment-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AssessmentDetail = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    completed: 0,
    avgScore: 0,
    avgTime: 0,
  });

  // Fetch assessment data
  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/assessments/${assessmentId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (!response.ok) throw new Error('Failed to fetch assessment');
        
        const data = await response.json();
        setAssessment(data);
        
        // Fetch analytics
        const analyticsRes = await fetch(`/api/analytics/assessment/${assessmentId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
          setStats({
            totalCandidates: analyticsData.totalCandidates || 0,
            completed: analyticsData.completedCandidates || 0,
            avgScore: analyticsData.averageScore || 0,
            avgTime: analyticsData.averageTime || 0,
          });
        }
      } catch (error) {
        showSnackbar('Failed to load assessment details', 'error');
        console.error('Error fetching assessment:', error);
      } finally {
        setLoading(false);
      }
    };

    if (assessmentId) {
      fetchAssessment();
    }
  }, [assessmentId, showSnackbar]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEdit = () => {
    navigate(`/assessments/${assessmentId}/edit`);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        showSnackbar('Assessment deleted successfully', 'success');
        navigate('/assessments');
      }
    } catch (error) {
      showSnackbar('Failed to delete assessment', 'error');
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const { id } = await response.json();
        showSnackbar('Assessment duplicated successfully', 'success');
        navigate(`/assessments/${id}`);
      }
    } catch (error) {
      showSnackbar('Failed to duplicate assessment', 'error');
    }
  };

  const handleExport = async (format = 'csv') => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assessment-${assessmentId}-${format}.${format}`;
        a.click();
        showSnackbar(`Exported as ${format.toUpperCase()}`, 'success');
      }
    } catch (error) {
      showSnackbar('Failed to export assessment', 'error');
    }
  };

  const handleStatusToggle = async () => {
    if (!assessment) return;
    
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: assessment.status === 'active' ? 'inactive' : 'active',
        }),
      });
      
      if (response.ok) {
        const updated = await response.json();
        setAssessment(updated);
        showSnackbar(
          `Assessment ${updated.status === 'active' ? 'activated' : 'deactivated'}`,
          'success'
        );
      }
    } catch (error) {
      showSnackbar('Failed to update status', 'error');
    }
  };

  const canEdit = useMemo(() => {
    if (!assessment || !user) return false;
    return user.role === 'super_admin' || 
           user.role === 'organization_admin' ||
           (user.role === 'assessor' && assessment.createdBy === user.id);
  }, [assessment, user]);

  const canDelete = useMemo(() => {
    if (!assessment || !user) return false;
    return user.role === 'super_admin' || 
           (user.role === 'organization_admin' && assessment.organizationId === user.organizationId);
  }, [assessment, user]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!assessment) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          Assessment not found or you don't have permission to view it.
        </Alert>
        <Button
          component={RouterLink}
          to="/assessments"
          startIcon={<ArrowBack />}
          sx={{ mt: 2 }}
        >
          Back to Assessments
        </Button>
      </Container>
    );
  }

  const completionRate = stats.totalCandidates > 0 
    ? Math.round((stats.completed / stats.totalCandidates) * 100) 
    : 0;

  return (
    <>
      <Helmet>
        <title>{assessment.title} - Assessly Platform</title>
      </Helmet>

      <Container maxWidth="xl">
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3, mt: 2 }}>
          <Link component={RouterLink} to="/dashboard" color="inherit">
            Dashboard
          </Link>
          <Link component={RouterLink} to="/assessments" color="inherit">
            Assessments
          </Link>
          <Typography color="text.primary">{assessment.title}</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                  {assessment.title}
                </Typography>
                <Chip
                  label={assessment.status.toUpperCase()}
                  color={assessment.status === 'active' ? 'success' : 'default'}
                  size="small"
                  icon={assessment.status === 'active' ? <Public /> : <Lock />}
                />
                {assessment.isTemplate && (
                  <Chip label="Template" color="info" size="small" />
                )}
              </Box>
              
              <Typography variant="body1" color="text.secondary" paragraph>
                {assessment.description}
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <Tooltip title="Number of questions">
                  <Chip
                    icon={<Assignment fontSize="small" />}
                    label={`${assessment.questions?.length || 0} Questions`}
                    variant="outlined"
                    size="small"
                  />
                </Tooltip>
                
                <Tooltip title="Time limit">
                  <Chip
                    icon={<Schedule fontSize="small" />}
                    label={`${assessment.timeLimit || 'No'} time limit`}
                    variant="outlined"
                    size="small"
                  />
                </Tooltip>
                
                <Tooltip title="Total candidates">
                  <Chip
                    icon={<People fontSize="small" />}
                    label={`${stats.totalCandidates} Candidates`}
                    variant="outlined"
                    size="small"
                  />
                </Tooltip>
                
                <Tooltip title="Created date">
                  <Chip
                    label={`Created: ${format(new Date(assessment.createdAt), 'MMM d, yyyy')}`}
                    variant="outlined"
                    size="small"
                  />
                </Tooltip>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {canEdit && (
                    <Button
                      variant="contained"
                      startIcon={<Edit />}
                      onClick={handleEdit}
                      size="small"
                    >
                      Edit
                    </Button>
                  )}
                  
                  <Button
                    variant="outlined"
                    startIcon={<Share />}
                    onClick={() => setShareDialogOpen(true)}
                    size="small"
                  >
                    Share
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<ContentCopy />}
                    onClick={handleDuplicate}
                    size="small"
                  >
                    Duplicate
                  </Button>
                  
                  {canDelete && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => setDeleteDialogOpen(true)}
                      size="small"
                    >
                      Delete
                    </Button>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => handleExport('csv')}
                    size="small"
                  >
                    CSV
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => handleExport('pdf')}
                    size="small"
                  >
                    PDF
                  </Button>
                  
                  <Button
                    variant={assessment.status === 'active' ? 'outlined' : 'contained'}
                    color={assessment.status === 'active' ? 'warning' : 'success'}
                    onClick={handleStatusToggle}
                    size="small"
                  >
                    {assessment.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h3" color="primary">
                {stats.totalCandidates}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Candidates
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">
                {completionRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completion Rate
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={completionRate} 
                sx={{ mt: 1 }}
              />
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h3" color="info.main">
                {stats.avgScore}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Score
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h3" color="warning.main">
                {Math.round(stats.avgTime / 60)}m
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg. Time
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab 
                icon={<BarChart />} 
                iconPosition="start" 
                label="Analytics" 
              />
              <Tab 
                icon={<People />} 
                iconPosition="start" 
                label="Candidates" 
              />
              <Tab 
                icon={<Assignment />} 
                iconPosition="start" 
                label="Questions" 
              />
              <Tab 
                icon={<Visibility />} 
                iconPosition="start" 
                label="Preview" 
              />
            </Tabs>
          </Box>

          {/* Analytics Tab */}
          <TabPanel value={tabValue} index={0}>
            <Suspense fallback={<CircularProgress />}>
              {analytics ? (
                <AssessmentAnalytics data={analytics} />
              ) : (
                <Alert severity="info">
                  No analytics data available yet. Share the assessment with candidates to see results.
                </Alert>
              )}
            </Suspense>
          </TabPanel>

          {/* Candidates Tab */}
          <TabPanel value={tabValue} index={1}>
            <Suspense fallback={<CircularProgress />}>
              <CandidateList assessmentId={assessmentId} />
            </Suspense>
          </TabPanel>

          {/* Questions Tab */}
          <TabPanel value={tabValue} index={2}>
            <Suspense fallback={<CircularProgress />}>
              <QuestionEditor 
                assessmentId={assessmentId}
                questions={assessment.questions || []}
                readOnly={!canEdit}
              />
            </Suspense>
          </TabPanel>

          {/* Preview Tab */}
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ p: 4, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="h5" gutterBottom>
                Assessment Preview
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  This is a preview of how candidates will see the assessment. 
                  Actual functionality may be limited in preview mode.
                </Typography>
                
                <Button
                  variant="contained"
                  component={RouterLink}
                  to={`/assessment/take/${assessmentId}?preview=true`}
                  target="_blank"
                >
                  Launch Full Preview
                </Button>
              </Box>
            </Box>
          </TabPanel>
        </Paper>
      </Container>

      {/* Dialogs */}
      <Suspense fallback={null}>
        <ShareAssessmentDialog
          open={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
          assessmentId={assessmentId}
          assessmentTitle={assessment.title}
        />
        
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title="Delete Assessment"
          message={`Are you sure you want to delete "${assessment.title}"? This action cannot be undone.`}
        />
      </Suspense>
    </>
  );
};

export default React.memo(AssessmentDetail);
