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
  IconButton,
  Button,
  Alert,
  Chip
} from '@mui/material';
import { 
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Dashboard as DashboardIcon,
  OnlinePrediction as OnlineIcon,
  OfflineBolt as OfflineIcon
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

// Error Boundary for lazy components
const ChartErrorBoundary = ({ children, componentName }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <WarningIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
        <Typography variant="body1">
          Failed to load {componentName}
        </Typography>
      </Box>
    );
  }

  return children;
};

// Memoized StatCard Component
const StatCard = React.memo(({ title, value, icon, loading, trend, subtitle }) => {
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
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
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
    <WarningIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
    <Typography variant="h5" color="warning.main" gutterBottom>
      Access Denied
    </Typography>
    <Typography variant="body1" color="text.secondary" paragraph>
      You don't have permission to access the admin dashboard.
    </Typography>
    <Button 
      variant="contained" 
      onClick={() => window.location.href = '/'}
      startIcon={<DashboardIcon />}
    >
      Return to Home
    </Button>
  </Box>
));

// API Configuration based on documentation
const API_CONFIG = {
  baseURL: 'https://assesslyplatform-t49h.onrender.com/api/v1',
  endpoints: {
    // Health endpoints
    health: '/health',
    
    // Admin statistics endpoints
    adminStats: '/admin/stats',
    adminAssessments: '/admin/assessments',
    
    // User endpoints
    userProfile: '/users/profile',
    
    // Assessment endpoints
    assessments: '/assessments',
    
    // Organization endpoints
    organizations: '/organizations'
  },
  timeout: 10000,
  rateLimit: {
    auth: 10,    // 10 requests per minute for auth
    other: 100   // 100 requests per minute for other endpoints
  }
};

// Mock data for development and fallback
const MOCK_DATA = {
  stats: {
    totalAssessments: 47,
    activeUsers: 156,
    totalOrganizations: 12,
    completedAssessments: 324,
    pendingAssessments: 23,
    totalRevenue: 12500
  },
  assessments: [
    { 
      id: 1, 
      title: 'React Skills Assessment', 
      completions: 45, 
      createdAt: '2024-01-15T00:00:00.000Z',
      status: 'active',
      organization: 'Tech Corp'
    },
    { 
      id: 2, 
      title: 'JavaScript Fundamentals', 
      completions: 89, 
      createdAt: '2024-01-14T00:00:00.000Z',
      status: 'active',
      organization: 'Dev Academy'
    },
    { 
      id: 3, 
      title: 'Node.js Backend Test', 
      completions: 23, 
      createdAt: '2024-01-13T00:00:00.000Z',
      status: 'active',
      organization: 'Startup Inc'
    }
  ]
};

// API Service functions
const apiService = {
  async request(endpoint, options = {}) {
    const url = `${API_CONFIG.baseURL}${endpoint}`;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
      config.signal = controller.signal;

      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Handle API response format (success boolean field)
      if (data.success === false) {
        throw new Error(data.message || 'API request failed');
      }

      return data.data || data; // Return data field or entire response

    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  },

  async getHealth() {
    return this.request(API_CONFIG.endpoints.health);
  },

  async getAdminStats() {
    return this.request(API_CONFIG.endpoints.adminStats);
  },

  async getAdminAssessments() {
    return this.request(API_CONFIG.endpoints.adminAssessments);
  },

  async getUserProfile() {
    return this.request(API_CONFIG.endpoints.userProfile);
  }
};

export default function AdminDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { claims, isAuthenticated, user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalAssessments: 0,
    activeUsers: 0,
    totalOrganizations: 0,
    completedAssessments: 0,
    pendingAssessments: 0,
    totalRevenue: 0
  });
  const [assessments, setAssessments] = useState([]);
  const [apiStatus, setApiStatus] = useState('checking');
  const [retryCount, setRetryCount] = useState(0);

  // Enhanced admin check based on API user role
  const isAdmin = useMemo(() => {
    const userRole = user?.role || claims?.role || localStorage.getItem('userRole');
    const userEmail = user?.email || localStorage.getItem('userEmail');
    
    const adminCheck = (
      userRole === 'admin' || 
      userRole === 'administrator' ||
      userEmail === 'admin@assessly.com'
    );

    console.log('🔐 Admin Verification:', {
      userRole,
      userEmail,
      isAuthenticated,
      isAdmin: adminCheck,
      userData: user
    });

    return adminCheck && isAuthenticated;
  }, [claims, user, isAuthenticated]);

  // Check API health
  const checkApiHealth = useCallback(async () => {
    try {
      await apiService.getHealth();
      setApiStatus('online');
      return true;
    } catch (error) {
      console.warn('API health check failed:', error);
      setApiStatus('offline');
      return false;
    }
  }, []);

  // Enhanced data fetching compliant with API documentation
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const useMockData = process.env.NODE_ENV === 'development' || apiStatus === 'offline';
    
    try {
      // Use mock data in development or if API is offline after retries
      if (useMockData && retryCount > 1) {
        console.log('🛠️ Using mock data (development/fallback mode)');
        setStats(MOCK_DATA.stats);
        setAssessments(MOCK_DATA.assessments);
        setApiStatus('mock');
        return;
      }

      // Fetch actual data from API
      const [statsData, assessmentsData] = await Promise.all([
        apiService.getAdminStats(),
        apiService.getAdminAssessments()
      ]);

      // Transform API data to match our component expectations
      setStats({
        totalAssessments: statsData.totalAssessments || statsData.assessments || 0,
        activeUsers: statsData.activeUsers || statsData.users || 0,
        totalOrganizations: statsData.totalOrganizations || statsData.organizations || 0,
        completedAssessments: statsData.completedAssessments || statsData.completions || 0,
        pendingAssessments: statsData.pendingAssessments || 0,
        totalRevenue: statsData.totalRevenue || 0
      });

      setAssessments(assessmentsData || []);
      setApiStatus('online');
      setRetryCount(0);

      if (isRefresh) {
        enqueueSnackbar('Dashboard updated successfully', { 
          variant: 'success',
          autoHideDuration: 2000,
        });
      }

    } catch (error) {
      console.error('❌ Dashboard data fetch failed:', error);
      setRetryCount(prev => prev + 1);

      // Enhanced error handling with specific API error messages
      let userMessage = 'Failed to load dashboard data';
      
      if (error.name === 'AbortError') {
        userMessage = 'Request timeout - API server is not responding';
      } else if (error.message.includes('401')) {
        userMessage = 'Authentication failed - please login again';
        setTimeout(() => window.location.href = '/auth?tab=login', 2000);
      } else if (error.message.includes('403')) {
        userMessage = 'Access denied - admin privileges required';
      } else if (error.message.includes('404')) {
        userMessage = 'Admin endpoints not found - check API version';
      } else if (error.message.includes('429')) {
        userMessage = 'Rate limit exceeded - please wait a moment';
      } else if (error.message.includes('500')) {
        userMessage = 'Server error - please try again later';
      } else {
        userMessage = error.message || userMessage;
      }

      enqueueSnackbar(userMessage, { 
        variant: 'error',
        autoHideDuration: 5000,
      });

      // Fallback to mock data in development
      if (process.env.NODE_ENV === 'development') {
        setStats(MOCK_DATA.stats);
        setAssessments(MOCK_DATA.assessments);
        setApiStatus('mock');
      } else {
        setApiStatus('offline');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, enqueueSnackbar, apiStatus, retryCount]);

  const handleRefresh = useCallback(() => {
    if (!loading) {
      fetchDashboardData(true);
    }
  }, [fetchDashboardData, loading]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Initialize dashboard with API compliance
  useEffect(() => {
    let mounted = true;

    const initializeDashboard = async () => {
      if (!mounted) return;

      if (!isAdmin) {
        setLoading(false);
        return;
      }

      console.log('🚀 Initializing Admin Dashboard with API:', API_CONFIG.baseURL);

      // Check API health first
      const apiHealthy = await checkApiHealth();
      
      if (mounted) {
        if (apiHealthy) {
          await fetchDashboardData();
        } else {
          // If API is down, use mock data in development
          if (process.env.NODE_ENV === 'development') {
            setStats(MOCK_DATA.stats);
            setAssessments(MOCK_DATA.assessments);
            setApiStatus('mock');
            enqueueSnackbar('Development mode: Using demo data', { 
              variant: 'info',
            });
          } else {
            enqueueSnackbar('Cannot connect to API server', { 
              variant: 'warning',
            });
          }
          setLoading(false);
        }
      }
    };

    initializeDashboard();

    return () => {
      mounted = false;
    };
  }, [isAdmin, fetchDashboardData, checkApiHealth, enqueueSnackbar]);

  // Debug info
  useEffect(() => {
    console.log('📊 Dashboard State:', {
      isAdmin,
      isAuthenticated,
      loading,
      refreshing,
      apiStatus,
      retryCount,
      stats,
      assessmentsCount: assessments.length,
      apiBase: API_CONFIG.baseURL
    });
  }, [isAdmin, isAuthenticated, loading, refreshing, apiStatus, retryCount, stats, assessments]);

  // Memoized stat cards data compliant with API response structure
  const statCards = useMemo(() => [
    {
      title: "Total Assessments",
      value: stats.totalAssessments,
      icon: <AssessmentIcon />,
      trend: "up",
      subtitle: apiStatus === 'mock' ? 'Demo Data' : 'Active assessments'
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      icon: <PeopleIcon />,
      trend: "up",
      subtitle: apiStatus === 'mock' ? 'Demo Data' : 'Currently active'
    },
    {
      title: "Organizations",
      value: stats.totalOrganizations,
      icon: <BusinessIcon />,
      trend: "neutral",
      subtitle: apiStatus === 'mock' ? 'Demo Data' : 'Registered orgs'
    },
    {
      title: "Completions",
      value: stats.completedAssessments,
      icon: <AssessmentIcon />,
      trend: "up",
      subtitle: apiStatus === 'mock' ? 'Demo Data' : 'Total completed'
    }
  ], [stats, apiStatus]);

  // Show loading state
  if (loading && !refreshing) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="body1" color="text.secondary">
          Loading admin dashboard...
        </Typography>
        <Chip 
          icon={<OnlineIcon />} 
          label="Connecting to API..." 
          color="primary" 
          variant="outlined" 
        />
      </Box>
    );
  }

  // Permission check
  if (!isAdmin) {
    return <PermissionDenied />;
  }

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      {/* Header with API status */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        mb: 3,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 2 : 0
      }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Admin Dashboard
            </Typography>
            <Chip 
              icon={apiStatus === 'online' ? <OnlineIcon /> : <OfflineIcon />} 
              label={apiStatus === 'online' ? 'API Online' : 'API Offline'} 
              color={apiStatus === 'online' ? 'success' : 'warning'} 
              size="small" 
            />
          </Box>
          <Typography variant="body1" color="text.secondary">
            Welcome back, {user?.name || 'Admin'} • {user?.email || 'admin@assessly.com'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {apiStatus === 'offline' && (
            <Button 
              variant="outlined" 
              color="warning" 
              onClick={handleRetry}
              size="small"
              startIcon={<RefreshIcon />}
            >
              Retry Connection
            </Button>
          )}
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
      </Box>

      {/* Status Alerts */}
      {apiStatus === 'mock' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Development Mode:</strong> Using demonstration data. API server is unavailable or endpoints are not implemented.
        </Alert>
      )}
      
      {apiStatus === 'offline' && retryCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Cannot connect to Assessly Platform API. Please check your connection and ensure the API server is running.
        </Alert>
      )}

      {/* Loading Indicator */}
      {(loading || refreshing) && <LinearProgress sx={{ mb: 3 }} />}

      {/* Stat Cards Grid */}
      <Grid container spacing={isMobile ? 1 : 3} sx={{ mb: 3 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <StatCard 
              title={card.title}
              value={card.value}
              icon={card.icon}
              loading={loading || refreshing}
              trend={card.trend}
              subtitle={card.subtitle}
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
              Assessment Activity
            </Typography>
            <ChartErrorBoundary componentName="Assessment Chart">
              <React.Suspense fallback={<ChartLoader />}>
                <AssessmentChart 
                  data={assessments} 
                  loading={loading || refreshing} 
                />
              </React.Suspense>
            </ChartErrorBoundary>
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
              Recent Activity
            </Typography>
            <ChartErrorBoundary componentName="Activity Widget">
              <React.Suspense fallback={<ChartLoader />}>
                <UserActivityWidget />
              </React.Suspense>
            </ChartErrorBoundary>
          </Paper>
        </Grid>
      </Grid>

      {/* API Info Footer */}
      <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          API: {API_CONFIG.baseURL} • Status: {apiStatus} • Rate Limit: {API_CONFIG.rateLimit.other} req/min
        </Typography>
      </Box>
    </Box>
  );
  }
