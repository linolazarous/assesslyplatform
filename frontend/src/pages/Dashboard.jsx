import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Settings,
  Plus,
  TrendingUp,
  Target,
  Clock,
  Award,
  ChevronRight,
  Zap,
  AlertCircle,
  RefreshCw,
  Shield,
  DollarSign,
  User
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Alert, AlertDescription } from '../components/ui/alert';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import api from '../services/api';
import { toast } from 'sonner';

// Constants
const LOCAL_STORAGE_KEYS = {
  TOKEN: 'assessly_token',
  USER: 'assessly_user'
};

const STATS_COLORS = {
  blue: 'text-blue-600',
  teal: 'text-teal-600',
  green: 'text-green-600',
  purple: 'text-purple-600'
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [subscription, setSubscription] = useState(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch user data
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);

      // Fetch dashboard stats
      const statsResponse = await api.get('/dashboard/stats');
      const dashboardStats = statsResponse.data;
      setDashboardData(dashboardStats);

      // Fetch assessments
      const assessmentsResponse = await api.get('/assessments?limit=4');
      const assessments = assessmentsResponse.data.assessments || [];
      setRecentAssessments(assessments);

      // Fetch subscription
      try {
        const subscriptionResponse = await api.get('/subscriptions/me');
        setSubscription(subscriptionResponse.data);
      } catch (subError) {
        console.log('Subscription endpoint not available');
        setSubscription({ has_subscription: true, plan: userResponse.data.plan || 'free' });
      }

      // Calculate stats for display
      const calculatedStats = [
        {
          id: 'total-assessments',
          label: 'Total Assessments',
          value: dashboardStats?.stats?.assessments?.total || 0,
          change: dashboardStats?.stats?.assessments?.total > 0 ? '+12%' : '0%',
          icon: FileText,
          color: 'blue'
        },
        {
          id: 'active-candidates',
          label: 'Active Candidates',
          value: dashboardStats?.stats?.candidates?.invited || 0,
          change: dashboardStats?.stats?.candidates?.invited > 0 ? '+8%' : '0%',
          icon: Users,
          color: 'teal'
        },
        {
          id: 'completion-rate',
          label: 'Completion Rate',
          value: dashboardStats?.stats?.candidates?.total > 0 
            ? `${Math.round((dashboardStats.stats.candidates.completed / dashboardStats.stats.candidates.total) * 100)}%`
            : '0%',
          change: dashboardStats?.stats?.candidates?.completed > 0 ? '+2.1%' : '0%',
          icon: Target,
          color: 'green'
        },
        {
          id: 'avg-assessment-time',
          label: 'Avg. Assessment Time',
          value: '12m', // This would come from analytics endpoint
          change: '-5%',
          icon: Clock,
          color: 'purple'
        }
      ];

      setStats(calculatedStats);

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      
      let errorMessage = 'Failed to load dashboard data';
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
        navigate('/login', { 
          state: { message: 'Your session has expired. Please log in again.' }
        });
        return;
      }
      
      // Handle network errors
      if (!err.response) {
        toast.error('Network error. Please check your connection.');
      }
      
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [navigate]);

  // Fetch user data and initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
        if (!token) {
          navigate('/login');
          return;
        }

        const userData = localStorage.getItem(LOCAL_STORAGE_KEYS.USER);
        if (!userData) {
          // Try to fetch user from API
          await fetchDashboardData();
          return;
        }

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        await fetchDashboardData();

      } catch (err) {
        console.error('Dashboard initialization error:', err);
        setError(err.message || 'Failed to load dashboard data');
        
        // Only redirect on auth errors
        if (err.message.includes('User data not found') || err.response?.status === 401) {
          localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
          localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
          navigate('/login');
        }
      }
    };

    initializeDashboard();
  }, [navigate, fetchDashboardData]);

  // Navigation handlers
  const handleCreateAssessment = useCallback(async () => {
    try {
      const response = await api.post('/assessments', {
        title: 'New Assessment',
        description: 'Create your assessment questions here',
        assessment_type: 'multiple_choice',
        duration_minutes: 30,
        questions: [],
        settings: {}
      });
      
      if (response.data.success) {
        toast.success('Assessment created successfully!');
        navigate(`/assessments/${response.data.assessment_id}`);
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('limit reached')) {
        toast.error(error.response.data.detail);
        handleUpgradePlan();
      } else {
        toast.error('Failed to create assessment. Please try again.');
      }
    }
  }, [navigate]);

  const handleViewAllAssessments = useCallback(() => {
    navigate('/assessments');
  }, [navigate]);

  const handleAssessmentClick = useCallback((id) => {
    navigate(`/assessments/${id}`);
  }, [navigate]);

  const handleUpgradePlan = useCallback(() => {
    navigate('/pricing');
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  const handleBilling = useCallback(() => {
    navigate('/dashboard/billing');
  }, [navigate]);

  const handleUserProfile = useCallback(() => {
    navigate('/dashboard/profile');
  }, [navigate]);

  const handleOrganization = useCallback(() => {
    navigate('/dashboard/organization');
  }, [navigate]);

  const handleInviteCandidates = useCallback(() => {
    if (recentAssessments.length === 0) {
      toast.info('Please create an assessment first.');
      return;
    }
    // If there are assessments, navigate to the first one's candidate invitation
    const firstAssessment = recentAssessments[0];
    navigate(`/assessments/${firstAssessment.id}/candidates/invite`);
  }, [recentAssessments, navigate]);

  const handleViewAnalytics = useCallback(() => {
    navigate('/dashboard/analytics');
  }, [navigate]);

  const handleExportReports = useCallback(() => {
    if (recentAssessments.length === 0) {
      toast.info('No assessments to export.');
      return;
    }
    toast.info('Export functionality coming soon!');
  }, [recentAssessments]);

  // Calculate plan limits
  const getPlanLimits = useCallback((plan) => {
    const limits = {
      free: { assessments: 5, candidates: 50 },
      basic: { assessments: 50, candidates: 500 },
      professional: { assessments: 1000, candidates: 100000 },
      enterprise: { assessments: 10000, candidates: 1000000 }
    };
    return limits[plan] || limits.free;
  }, []);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array(4).fill(0).map((_, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {Array(3).fill(0).map((_, idx) => (
                  <Skeleton key={idx} className="h-32 w-full" />
                ))}
              </div>
              <div className="space-y-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error && !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}. Please try refreshing the page or contact support if the issue persists.
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex space-x-3">
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={() => navigate('/login')}>
                Return to Login
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const planLimits = getPlanLimits(user?.plan || 'free');
  const assessmentUsage = dashboardData?.stats?.assessments?.total || 0;
  const candidateUsage = dashboardData?.stats?.candidates?.total || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="pt-16">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {user?.name || 'User'}!
                </h1>
                <p className="text-gray-600 mt-1">{user?.organization || 'Your Organization'}</p>
                <div className="flex items-center mt-2 space-x-2">
                  <Badge className={`${
                    user?.plan === 'free' ? 'bg-blue-100 text-blue-800' :
                    user?.plan === 'basic' ? 'bg-teal-100 text-teal-800' :
                    user?.plan === 'professional' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user?.plan || 'free'} plan
                  </Badge>
                  {user?.plan === 'free' && (
                    <Badge variant="outline" className="text-xs">
                      {candidateUsage}/{planLimits.candidates} candidates
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  aria-label="Refresh dashboard"
                  size="sm"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSettings}
                  aria-label="Settings"
                  size="sm"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 transition-all"
                  onClick={handleCreateAssessment}
                  disabled={isRefreshing || (user?.plan === 'free' && assessmentUsage >= planLimits.assessments)}
                  aria-label="Create new assessment"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assessment
                  {user?.plan === 'free' && assessmentUsage >= planLimits.assessments && (
                    <Badge className="ml-2 bg-yellow-100 text-yellow-800">Limit Reached</Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Some data may not be loading correctly. {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Stats Grid */}
          <section aria-label="Dashboard statistics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats && stats.map((stat) => (
              <Card 
                key={stat.id} 
                className="border-2 hover:shadow-lg transition-all duration-300 hover:border-blue-200"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.label}
                  </CardTitle>
                  <stat.icon 
                    className={`h-5 w-5 ${STATS_COLORS[stat.color]}`}
                    aria-hidden="true"
                  />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="flex items-center text-sm">
                    <TrendingUp
                      className={`h-4 w-4 mr-1 ${
                        stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}
                      aria-hidden="true"
                    />
                    <span 
                      className={
                        stat.change.startsWith('+') 
                          ? 'text-green-600 font-medium' 
                          : 'text-red-600 font-medium'
                      }
                    >
                      {stat.change}
                    </span>
                    <span className="text-gray-500 ml-1">vs last month</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Assessments */}
            <section className="lg:col-span-2" aria-label="Recent assessments">
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <LayoutDashboard className="mr-2 h-5 w-5 text-blue-600" aria-hidden="true" />
                        Recent Assessments
                        {recentAssessments.length > 0 && (
                          <Badge className="ml-2 bg-blue-100 text-blue-800">
                            {recentAssessments.length}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>Your latest assessment activities</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {recentAssessments.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={handleViewAllAssessments}
                          aria-label="View all assessments"
                        >
                          View All
                          <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentAssessments.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments yet</h3>
                      <p className="text-gray-600 mb-4">Create your first assessment to get started</p>
                      <Button 
                        onClick={handleCreateAssessment}
                        disabled={user?.plan === 'free' && assessmentUsage >= planLimits.assessments}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Assessment
                        {user?.plan === 'free' && assessmentUsage >= planLimits.assessments && (
                          <Badge className="ml-2 bg-yellow-100 text-yellow-800">Limit Reached</Badge>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentAssessments.map((assessment) => {
                        // Get candidate count for this assessment
                        const candidateCount = dashboardData?.recent?.candidates?.filter(
                          c => c.assessment_id === assessment.id
                        ).length || 0;
                        
                        return (
                          <button
                            key={assessment.id}
                            onClick={() => handleAssessmentClick(assessment.id)}
                            className="w-full text-left flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            aria-label={`View ${assessment.title} assessment`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center">
                                <h4 className="font-semibold text-gray-900 truncate">
                                  {assessment.title || 'Untitled Assessment'}
                                </h4>
                                <Badge
                                  className={`ml-3 shrink-0 ${
                                    assessment.status === 'published'
                                      ? 'bg-green-100 text-green-700'
                                      : assessment.status === 'draft'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {assessment.status || 'draft'}
                                </Badge>
                              </div>
                              <div className="flex items-center mt-2 text-sm text-gray-600">
                                <Users className="h-4 w-4 mr-1 shrink-0" aria-hidden="true" />
                                <span>
                                  {candidateCount} candidates
                                </span>
                                <span className="mx-2" aria-hidden="true">•</span>
                                <Clock className="h-4 w-4 mr-1 shrink-0" aria-hidden="true" />
                                <span>{assessment.duration_minutes || 30} min</span>
                              </div>
                              {assessment.description && (
                                <p className="text-sm text-gray-500 mt-2 truncate">
                                  {assessment.description}
                                </p>
                              )}
                            </div>
                            <div className="ml-4 shrink-0">
                              <div className="w-16 h-16 relative" role="presentation">
                                <svg 
                                  className="w-16 h-16 transform -rotate-90"
                                  viewBox="0 0 64 64"
                                  aria-hidden="true"
                                >
                                  <circle 
                                    cx="32" 
                                    cy="32" 
                                    r="28" 
                                    stroke="#e5e7eb" 
                                    strokeWidth="4" 
                                    fill="none" 
                                  />
                                  <circle
                                    cx="32"
                                    cy="32"
                                    r="28"
                                    stroke="#3b82f6"
                                    strokeWidth="4"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 28}`}
                                    strokeDashoffset={`${2 * Math.PI * 28 * 0.25}`} // 25% completion (mock)
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs font-bold text-gray-700">
                                    {candidateCount > 0 ? '25%' : '0%'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Quick Actions & Insights */}
            <div className="space-y-6">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="mr-2 h-5 w-5 text-teal-600" aria-hidden="true" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={handleCreateAssessment}
                    disabled={user?.plan === 'free' && assessmentUsage >= planLimits.assessments}
                  >
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    New Assessment
                    {user?.plan === 'free' && assessmentUsage >= planLimits.assessments && (
                      <Badge className="ml-2 bg-yellow-100 text-yellow-800">Limit Reached</Badge>
                    )}
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={handleInviteCandidates}
                    disabled={recentAssessments.length === 0 || (user?.plan === 'free' && candidateUsage >= planLimits.candidates)}
                  >
                    <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                    Invite Candidates
                    {recentAssessments.length === 0 && (
                      <Badge className="ml-2 bg-gray-100 text-gray-700">Create assessment first</Badge>
                    )}
                    {user?.plan === 'free' && candidateUsage >= planLimits.candidates && (
                      <Badge className="ml-2 bg-yellow-100 text-yellow-800">Limit Reached</Badge>
                    )}
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={handleViewAnalytics}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />
                    View Analytics
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={handleExportReports}
                    disabled={recentAssessments.length === 0}
                  >
                    <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                    Export Reports
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 bg-gradient-to-br from-blue-50 to-teal-50">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="mr-2 h-5 w-5 text-blue-600" aria-hidden="true" />
                    Usage Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-700">Assessments Created</span>
                      <span className="font-semibold text-gray-900">
                        {assessmentUsage}
                        {user?.plan === 'free' ? ` / ${planLimits.assessments}` : ''}
                      </span>
                    </div>
                    {user?.plan === 'free' && (
                      <div 
                        className="w-full bg-gray-200 rounded-full h-2"
                        role="progressbar"
                        aria-valuenow={Math.min((assessmentUsage / planLimits.assessments) * 100, 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min((assessmentUsage / planLimits.assessments) * 100, 100)}%` 
                          }} 
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-700">Candidates Assessed</span>
                      <span className="font-semibold text-gray-900">
                        {candidateUsage}
                        {user?.plan === 'free' ? ` / ${planLimits.candidates}` : 
                         user?.plan === 'basic' ? ' / 500' : ''}
                      </span>
                    </div>
                    {user?.plan === 'free' && (
                      <div 
                        className="w-full bg-gray-200 rounded-full h-2"
                        role="progressbar"
                        aria-valuenow={Math.min((candidateUsage / planLimits.candidates) * 100, 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div 
                          className="bg-gradient-to-r from-teal-500 to-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min((candidateUsage / planLimits.candidates) * 100, 100)}%` 
                          }} 
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t border-gray-300">
                    {user?.plan === 'free' ? (
                      <>
                        <p className="text-sm text-gray-700 mb-2">
                          🚀 Upgrade to unlock unlimited assessments and advanced features!
                        </p>
                        <Button 
                          size="sm" 
                          className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                          onClick={handleUpgradePlan}
                        >
                          Upgrade Plan
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-700 mb-2">
                          🎉 Great job! You're on the {user?.plan} plan with premium features.
                        </p>
                        <div className="space-y-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleBilling}
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Manage Billing
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleUserProfile}
                          >
                            <User className="mr-2 h-4 w-4" />
                            Edit Profile
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleOrganization}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Organization Settings
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
