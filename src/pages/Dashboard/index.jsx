// src/pages/Dashboard/index.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  useTheme,
  alpha,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Button,
} from '@mui/material';
import {
  Assessment,
  People,
  TrendingUp,
  Download,
  MoreVert,
  Refresh,
  Add,
  Schedule,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentOrganization } = useOrganization();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalAssessments: 0,
    activeAssessments: 0,
    totalCandidates: 0,
    completionRate: 0,
    averageScore: 0,
    pendingReviews: 0,
  });
  
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [currentOrganization?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      const mockStats = {
        totalAssessments: 42,
        activeAssessments: 18,
        totalCandidates: 1250,
        completionRate: 78,
        averageScore: 82,
        pendingReviews: 7,
      };
      
      const mockActivity = [
        {
          id: 1,
          type: 'assessment_completed',
          title: 'JavaScript Fundamentals',
          user: 'John Doe',
          time: '10 minutes ago',
          score: 92,
        },
        {
          id: 2,
          type: 'assessment_created',
          title: 'React Advanced Patterns',
          user: 'Jane Smith',
          time: '2 hours ago',
        },
        {
          id: 3,
          type: 'candidate_invited',
          title: '15 candidates invited',
          user: 'System',
          time: '1 day ago',
        },
        {
          id: 4,
          type: 'assessment_published',
          title: 'Node.js Backend',
          user: 'Bob Wilson',
          time: '2 days ago',
        },
      ];

      setStats(mockStats);
      setRecentActivity(mockActivity);
      
      // Simulate API delay
      setTimeout(() => setLoading(false), 500);
    } catch (error) {
      showSnackbar({ message: 'Failed to load dashboard data', severity: 'error' });
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, subtitle }) => (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" color="text.secondary">
            {title}
          </Typography>
          <Icon sx={{ color: color, opacity: 0.8 }} />
        </Box>
        <Typography variant="h3" component="div" sx={{ fontWeight: 700, mb: 1 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <TrendingUp sx={{ fontSize: 16, color: trend > 0 ? 'success.main' : 'error.main', mr: 0.5 }} />
            <Typography variant="body2" color={trend > 0 ? 'success.main' : 'error.main'}>
              {trend > 0 ? '+' : ''}{trend}% from last month
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const QuickActionCard = ({ title, description, icon: Icon, color, onClick, buttonText = 'Go' }) => (
    <Card sx={{ height: '100%', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
      <CardContent onClick={onClick}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ bgcolor: alpha(color, 0.1), p: 1, borderRadius: 1, mr: 2 }}>
            <Icon sx={{ color: color }} />
          </Box>
          <Typography variant="h6">{title}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" paragraph>
          {description}
        </Typography>
        <Button variant="outlined" size="small" sx={{ mt: 1 }}>
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Helmet>
        <title>Dashboard | Assessly Platform</title>
      </Helmet>

      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {currentOrganization?.name || 'Organization'} • Welcome back, {currentUser?.name}
            </Typography>
          </Box>
          <Box>
            <IconButton onClick={fetchDashboardData} disabled={loading}>
              <Refresh />
            </IconButton>
            <Button variant="contained" startIcon={<Add />} sx={{ ml: 2 }} onClick={() => navigate('/assessments/create')}>
              New Assessment
            </Button>
          </Box>
        </Box>

        {loading ? (
          <LinearProgress sx={{ mb: 3 }} />
        ) : (
          <>
            {/* Stats Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <StatCard
                  title="Total Assessments"
                  value={stats.totalAssessments}
                  icon={Assessment}
                  color={theme.palette.primary.main}
                  trend={12}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <StatCard
                  title="Active"
                  value={stats.activeAssessments}
                  icon={Schedule}
                  color={theme.palette.info.main}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <StatCard
                  title="Candidates"
                  value={stats.totalCandidates.toLocaleString()}
                  icon={People}
                  color={theme.palette.success.main}
                  trend={8}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <StatCard
                  title="Completion Rate"
                  value={`${stats.completionRate}%`}
                  icon={CheckCircle}
                  color={theme.palette.success.main}
                  subtitle={`${Math.round(stats.totalCandidates * (stats.completionRate / 100))} completed`}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <StatCard
                  title="Avg Score"
                  value={stats.averageScore}
                  icon={TrendingUp}
                  color={theme.palette.warning.main}
                  subtitle="out of 100"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <StatCard
                  title="Pending Reviews"
                  value={stats.pendingReviews}
                  icon={ErrorIcon}
                  color={theme.palette.error.main}
                />
              </Grid>
            </Grid>

            {/* Quick Actions */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Quick Actions
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <QuickActionCard
                  title="Create Assessment"
                  description="Build a new assessment with drag & drop"
                  icon={Add}
                  color={theme.palette.primary.main}
                  onClick={() => navigate('/assessments/create')}
                  buttonText="Create"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <QuickActionCard
                  title="Invite Candidates"
                  description="Send assessment invites via email"
                  icon={People}
                  color={theme.palette.success.main}
                  onClick={() => navigate('/candidates/invite')}
                  buttonText="Invite"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <QuickActionCard
                  title="View Reports"
                  description="Analyze assessment performance"
                  icon={TrendingUp}
                  color={theme.palette.info.main}
                  onClick={() => navigate('/reports')}
                  buttonText="View"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <QuickActionCard
                  title="Export Data"
                  description="Download assessment results"
                  icon={Download}
                  color={theme.palette.warning.main}
                  onClick={() => {/* Handle export */}}
                  buttonText="Export"
                />
              </Grid>
            </Grid>

            {/* Recent Activity */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">Recent Activity</Typography>
                  <Button size="small" onClick={() => navigate('/activity')}>
                    View All
                  </Button>
                </Box>
                <Box>
                  {recentActivity.map((activity) => (
                    <Box
                      key={activity.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        py: 2,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Box sx={{ mr: 2 }}>
                        {activity.type === 'assessment_completed' && (
                          <CheckCircle sx={{ color: 'success.main' }} />
                        )}
                        {activity.type === 'assessment_created' && (
                          <Add sx={{ color: 'primary.main' }} />
                        )}
                        {activity.type === 'candidate_invited' && (
                          <People sx={{ color: 'info.main' }} />
                        )}
                        {activity.type === 'assessment_published' && (
                          <Assessment sx={{ color: 'warning.main' }} />
                        )}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1">{activity.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          By {activity.user} • {activity.time}
                        </Typography>
                      </Box>
                      {activity.score && (
                        <Chip label={`${activity.score}/100`} color="primary" size="small" />
                      )}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </>
        )}
      </Box>
    </>
  );
};

export default Dashboard;
