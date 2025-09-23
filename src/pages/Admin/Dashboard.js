import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Grid, 
  Paper,
  LinearProgress,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { 
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import PropTypes from 'prop-types';
import AssessmentChart from '../../components/admin/AssessmentChart';
import UserActivityWidget from '../../components/admin/UserActivityWidget';
import IconButton from '@mui/material/IconButton';

export default function AdminDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { claims } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    assessments: 0,
    activeUsers: 0,
    organizations: 0,
    completions: 0
  });
  const [assessments, setAssessments] = useState([]);

  const token = localStorage.getItem('token');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      if (!token) throw new Error('Authentication token not found');

      // Fetch summary statistics
      const statsResponse = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsResponse.json();
      if (!statsResponse.ok) throw new Error(statsData.message);
      setStats(statsData);

      // Fetch recent assessments
      const assessmentsResponse = await fetch('/api/admin/assessments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const assessmentsData = await assessmentsResponse.json();
      if (!assessmentsResponse.ok) throw new Error(assessmentsData.message);
      setAssessments(assessmentsData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      enqueueSnackbar('Failed to load dashboard data', { 
        variant: 'error',
        autoHideDuration: 3000
      });
    } finally {
      setLoading(false);
    }
  }, [token, enqueueSnackbar]);

  useEffect(() => {
    if (claims?.role === 'admin') {
      fetchDashboardData();
    }
  }, [claims, fetchDashboardData]);

  if (!claims?.role === 'admin') {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          You don't have permission to access this page
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Admin Dashboard
        </Typography>
        <IconButton 
          onClick={fetchDashboardData}
          aria-label="refresh"
          disabled={loading}
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      <Grid container spacing={isMobile ? 1 : 3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Assessments"
            value={stats.assessments}
            icon={<AssessmentIcon color="primary" />}
            loading={loading}
            trend="up"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Users"
            value={stats.activeUsers}
            icon={<PeopleIcon color="secondary" />}
            loading={loading}
            trend="up"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Organizations"
            value={stats.organizations}
            icon={<BusinessIcon color="success" />}
            loading={loading}
            trend="neutral"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completions"
            value={stats.completions}
            icon={<AssessmentIcon color="info" />}
            loading={loading}
            trend="up"
          />
        </Grid>
      </Grid>

      <Grid container spacing={isMobile ? 1 : 3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ 
            p: 2, 
            height: '100%',
            borderRadius: 2
          }}>
            <Typography variant="h6" gutterBottom>
              Recent Assessments
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <AssessmentChart assessments={assessments} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ 
            p: 2, 
            height: '100%',
            borderRadius: 2
          }}>
            <Typography variant="h6" gutterBottom>
              User Activity
            </Typography>
            <UserActivityWidget />
          </Paper>
        </Grid>
      </Grid>

      {/* Mobile-only controls */}
      {isMobile && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button 
            variant="contained"
            onClick={fetchDashboardData}
            startIcon={<RefreshIcon />}
          >
            Refresh Data
          </Button>
        </Box>
      )}
    </Box>
  );
}

function StatCard({ title, value, icon, loading, trend }) {
  // ... (StatCard component remains unchanged as it has no Firebase dependencies)
  const theme = useTheme();
  const trendColors = {
    up: theme.palette.success.main,
    down: theme.palette.error.main,
    neutral: theme.palette.warning.main
  };

  return (
    <Paper elevation={2} sx={{ 
      p: 3, 
      height: '100%',
      borderRadius: 2,
      position: 'relative',
      overflow: 'hidden',
      '&:after': {
        content: '""',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: trendColors[trend] || 'transparent'
      }
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {loading ? '--' : value.toLocaleString()}
          </Typography>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: theme.palette.primary.main
        }}>
          {React.cloneElement(icon, { fontSize: 'large' })}
        </Box>
      </Box>
    </Paper>
  );
}

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  icon: PropTypes.node.isRequired,
  loading: PropTypes.bool,
  trend: PropTypes.oneOf(['up', 'down', 'neutral'])
};

StatCard.defaultProps = {
  loading: false,
  trend: 'neutral'
};
