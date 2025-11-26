// src/pages/Admin/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Grid, 
  Paper,
  LinearProgress,
  useMediaQuery,
  useTheme,
  IconButton
} from '@mui/material';
import { 
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useSnackbar } from 'notistack';

// Lazy load heavy components
const AssessmentChart = React.lazy(() => import('../../components/admin/AssessmentChart.jsx'));
const UserActivityWidget = React.lazy(() => import('../../components/admin/UserActivityWidget.jsx'));

// Loading fallback for lazy components
const ChartLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
    <CircularProgress />
  </Box>
);

// Memoized StatCard Component
const StatCard = React.memo(({ title, value, icon, loading, trend }) => {
  const theme = useTheme();
  
  const trendColors = {
    up: theme.palette.success.main,
    down: theme.palette.error.main,
    neutral: theme.palette.text.secondary
  };

  const displayValue = useMemo(() => 
    loading ? '--' : value.toLocaleString(),
    [loading, value]
  );

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        height: '100%',
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4
        },
        '&:after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: trendColors[trend] || 'transparent'
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ minHeight: '2.5rem' }}>
            {displayValue}
          </Typography>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: theme.palette.primary.main,
          ml: 1
        }}>
          {React.cloneElement(icon, { 
            sx: { fontSize: '2rem', opacity: 0.8 } 
          })}
        </Box>
      </Box>
    </Paper>
  );
});

// Permission Denied Component
const PermissionDenied = React.memo(() => (
  <Box sx={{ p: 3, textAlign: 'center' }}>
    <Typography variant="h6" color="error" gutterBottom>
      Access Denied
    </Typography>
    <Typography variant="body1" color="text.secondary">
      You don't have permission to access the admin dashboard.
    </Typography>
  </Box>
));

export default function AdminDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { claims, isAuthenticated } = useAuth(); // Added isAuthenticated
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    assessments: 0,
    activeUsers: 0,
    organizations: 0,
    completions: 0
  });
  const [assessments, setAssessments] = useState([]);

  // FIXED: Better token handling and admin check
  const token = useMemo(() => {
    try {
      return localStorage.getItem('token');
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  }, []);

  const isAdmin = useMemo(() => {
    return claims?.role === 'admin' && isAuthenticated;
  }, [claims, isAuthenticated]);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    // Don't fetch if not admin or no token
    if (!isAdmin || !token) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // FIXED: Added timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const [statsResponse, assessmentsResponse] = await Promise.all([
        fetch('/api/admin/stats', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }),
        fetch('/api/admin/assessments', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        })
      ]);

      clearTimeout(timeoutId);

      // Handle stats response
      if (!statsResponse.ok) {
        const errorText = await statsResponse.text();
        let errorMessage = 'Failed to fetch stats';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Handle assessments response
      if (!assessmentsResponse.ok) {
        const errorText = await assessmentsResponse.text();
        let errorMessage = 'Failed to fetch assessments';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      const assessmentsData = await assessmentsResponse.json();
      setAssessments(assessmentsData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // FIXED: Better error messages
      let userMessage = 'Failed to load dashboard data';
      if (error.name === 'AbortError') {
        userMessage = 'Request timeout. Please try again.';
      } else if (error.message.includes('Authentication')) {
        userMessage = 'Authentication failed. Please login again.';
      } else {
        userMessage = error.message || userMessage;
      }

      enqueueSnackbar(userMessage, { 
        variant: 'error',
        autoHideDuration: 4000,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isAdmin, enqueueSnackbar]);

  const handleRefresh = useCallback(() => {
    if (!loading) {
      fetchDashboardData(true);
    }
  }, [fetchDashboardData, loading]);

  // FIXED: Better useEffect with cleanup
  useEffect(() => {
    let mounted = true;

    if (isAdmin && token) {
      if (mounted) {
        fetchDashboardData();
      }
    } else if (mounted) {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [isAdmin, token, fetchDashboardData]);

  // Memoized stat cards data
  const statCards = useMemo(() => [
    {
      title: "Total Assessments",
      value: stats.assessments,
      icon: <AssessmentIcon />,
      trend: "up"
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      icon: <PeopleIcon />,
      trend: "up"
    },
    {
      title: "Organizations",
      value: stats.organizations,
      icon: <BusinessIcon />,
      trend: "neutral"
    },
    {
      title: "Completions",
      value: stats.completions,
      icon: <AssessmentIcon />,
      trend: "up"
    }
  ], [stats]);

  // FIXED: Show loading state initially
  if (loading && !refreshing) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!isAdmin) {
    return <PermissionDenied />;
  }

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      {/* Header */}
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
          onClick={handleRefresh}
          aria-label="refresh dashboard data"
          disabled={loading || refreshing}
          color="primary"
          size="large"
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Loading Indicator */}
      {(loading || refreshing) && <LinearProgress sx={{ mb: 3 }} />}

      {/* Stat Cards Grid */}
      <Grid container spacing={isMobile ? 1 : 3} sx={{ mb: 3 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <StatCard 
              title={card.title}
              value={card.value}
              icon={card.icon}
              loading={loading || refreshing}
              trend={card.trend}
            />
          </Grid>
        ))}
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={isMobile ? 1 : 3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ 
            p: 2, 
            height: '100%',
            borderRadius: 2,
            minHeight: 400
          }}>
            <Typography variant="h6" gutterBottom>
              Recent Assessments Activity
            </Typography>
            <React.Suspense fallback={<ChartLoader />}>
              <AssessmentChart data={assessments} loading={loading || refreshing} />
            </React.Suspense>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ 
            p: 2, 
            height: '100%',
            borderRadius: 2,
            minHeight: 400
          }}>
            <Typography variant="h6" gutterBottom>
              User Activity Feed
            </Typography>
            <React.Suspense fallback={<ChartLoader />}>
              <UserActivityWidget />
            </React.Suspense>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
