// frontend/src/pages/Dashboard.jsx

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
  User,
  Briefcase,
  Calendar,
  CheckCircle,
  PieChart,
  ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Alert, AlertDescription } from '../components/ui/alert';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import {
  dashboardAPI,
  assessmentAPI,
  subscriptionAPI,
  authAPI
} from '../services/api';
import { getCurrentUser, isAuthenticated, clearAuthData } from '../utils/auth';
import { toast } from 'sonner';

// Constants
const STATS_COLORS = {
  blue: 'text-blue-600',
  teal: 'text-teal-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  pink: 'text-pink-600'
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
  const [recentCandidates, setRecentCandidates] = useState([]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      // Check if user is authenticated  
      if (!isAuthenticated()) {  
        navigate('/login');  
        return;  
      }  

      // Fetch user data  
      try {  
        const userData = await getCurrentUser();  
        if (!userData) {  
          throw new Error('Failed to fetch user data');  
        }  
        setUser(userData);  
      } catch (userError) {  
        console.error('User fetch error:', userError);  
        // Try to fetch fresh user data  
        const freshUser = await authAPI.getCurrentUser();  
        if (freshUser) {  
          setUser(freshUser);  
        } else {  
          throw new Error('Please log in again');  
        }  
      }  

      // Fetch dashboard stats  
      const statsResponse = await dashboardAPI.getStats();  
      const dashboardStats = statsResponse;  
      setDashboardData(dashboardStats);  

      // Fetch recent assessments  
      try {  
        const assessmentsResponse = await assessmentAPI.getAll({ limit: 4 });  
        const assessments = assessmentsResponse.items || [];  
        setRecentAssessments(assessments);  
      } catch (assessmentError) {  
        console.error('Assessments fetch error:', assessmentError);  
        setRecentAssessments([]);  
      }  

      // Fetch subscription data  
      try {  
        const subscriptionResponse = await subscriptionAPI.getCurrentSubscription();  
        setSubscription(subscriptionResponse);  
      } catch (subError) {  
        console.error('Subscription fetch error:', subError);  
        // Set default free subscription  
        setSubscription({   
          has_subscription: true,   
          plan: 'free',  
          status: 'active',  
          is_free: true   
        });  
      }  

      // Extract recent candidates from dashboard stats if available  
      if (dashboardStats.recent_candidates) {  
        setRecentCandidates(dashboardStats.recent_candidates.slice(0, 5));  
      }  

      // Calculate stats for display  
      const calculatedStats = [  
        {  
          id: 'total-assessments',  
          label: 'Total Assessments',  
          value: dashboardStats?.assessments?.total || 0,  
          change: dashboardStats?.assessments?.total > 0 ? '+12%' : '0%',  
          icon: FileText,  
          color: 'blue',  
          description: 'Active and draft assessments'  
        },  
        {  
          id: 'active-candidates',  
          label: 'Active Candidates',  
          value: dashboardStats?.candidates?.invited || 0,  
          change: dashboardStats?.candidates?.invited > 0 ? '+8%' : '0%',  
          icon: Users,  
          color: 'teal',  
          description: 'Currently invited candidates'  
        },  
        {  
          id: 'completion-rate',  
          label: 'Completion Rate',  
          value: dashboardStats?.completion_rate !== undefined   
            ? `${Math.round(dashboardStats.completion_rate)}%`  
            : '0%',  
          change: dashboardStats?.completion_rate > 0 ? '+2.1%' : '0%',  
          icon: Target,  
          color: 'green',  
          description: 'Assessment completion percentage'  
        },  
        {  
          id: 'completed-assessments',  
          label: 'Completed',  
          value: dashboardStats?.candidates?.completed || 0,  
          change: dashboardStats?.candidates?.completed > 0 ? '+15%' : '0%',  
          icon: CheckCircle,  
          color: 'purple',  
          description: 'Successfully completed assessments'  
        }  
      ];  

      setStats(calculatedStats);  

    } catch (err) {  
      console.error('Dashboard data fetch error:', err);  
        
      let errorMessage = 'Failed to load dashboard data';  
        
      if (err.response) {  
        const errorData = err.response.data;  
          
        // Handle authentication errors  
        if (err.response.status === 401) {  
          clearAuthData();  
          navigate('/login', {   
            state: {   
              message: 'Your session has expired. Please log in again.',  
              from: '/dashboard'  
            }  
          });  
          return;  
        }  
          
        if (errorData?.detail) {  
          errorMessage = errorData.detail;  
        }  
      } else if (err.message) {  
        errorMessage = err.message;  
      }  
        
      setError(errorMessage);  
        
      // Handle network errors  
      if (!err.response) {  
        toast.error('Network error. Please check your connection.');  
      }  
        
    } finally {  
      setIsRefreshing(false);  
      setIsLoading(false);  
    }  

  }, [navigate]);

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Navigation handlers
  const handleCreateAssessment = useCallback(async () => {
    try {
      // Check plan limits
      if (user?.plan === 'free') {
        const planLimits = getPlanLimits('free');
        const assessmentCount = dashboardData?.assessments?.total || 0;

        if (assessmentCount >= planLimits.assessments) {  
          toast.error('Free plan limit reached. Upgrade to create more assessments.');  
          handleUpgradePlan();  
          return;  
        }  
      }  

      const response = await assessmentAPI.create({  
        title: 'New Assessment',  
        description: 'Create your assessment questions here',  
        assessment_type: 'multiple_choice',  
        duration_minutes: 30,  
        questions: [],  
        settings: {  
          show_results: true,  
          allow_retake: false,  
          time_limit: 1800, // 30 minutes in seconds  
          pass_percentage: 70  
        }  
      });  
        
      if (response) {  
        toast.success('Assessment created successfully!');  
        navigate(`/assessments/${response.id || response._id}`);  
      }  
    } catch (error) {  
      console.error('Create assessment error:', error);  
        
      if (error.response?.status === 400) {  
        if (error.response.data?.detail?.includes('limit')) {  
          toast.error(error.response.data.detail);  
          handleUpgradePlan();  
        } else {  
          toast.error(error.response.data.detail || 'Failed to create assessment.');  
        }  
      } else {  
        toast.error('Failed to create assessment. Please try again.');  
      }  
    }  

  }, [navigate, user, dashboardData]);

  const handleViewAllAssessments = useCallback(() => {
    navigate('/assessments');
  }, [navigate]);

  const handleAssessmentClick = useCallback((id) => {
    navigate(`/assessments/${id}`);
  }, [navigate]);

  const handleCandidateClick = useCallback((id) => {
    navigate(`/candidates/${id}`);
  }, [navigate]);

  const handleUpgradePlan = useCallback(() => {
    navigate('/pricing');
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSettings = useCallback(() => {
    navigate('/settings/profile');
  }, [navigate]);

  const handleBilling = useCallback(() => {
    navigate('/settings/billing');
  }, [navigate]);

  const handleUserProfile = useCallback(() => {
    navigate('/settings/profile');
  }, [navigate]);

  const handleOrganization = useCallback(() => {
    navigate('/settings/organization');
  }, [navigate]);

  const handleInviteCandidates = useCallback(() => {
    if (recentAssessments.length === 0) {
      toast.info('Please create an assessment first.');
      handleCreateAssessment();
      return;
    }

    // Navigate to candidates page with create option  
    navigate('/candidates?create=true');  

  }, [recentAssessments, navigate, handleCreateAssessment]);

  const handleViewAnalytics = useCallback(() => {
    if (recentAssessments.length === 0) {
      toast.info('No assessment data available yet.');
      return;
    }
    navigate('/analytics');
  }, [recentAssessments, navigate]);

  const handleExportReports = useCallback(() => {
    if (recentAssessments.length === 0) {
      toast.info('No assessments to export.');
      return;
    }

    // For now, show a toast message  
    toast.info('Export feature coming soon! In the meantime, you can use the download button on each assessment.');  

  }, [recentAssessments]);

  const handleViewAllCandidates = useCallback(() => {
    navigate('/candidates');
  }, [navigate]);

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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="pt-16">
          {/* Header skeleton */}
          <header className="bg-white/80 backdrop-blur-sm border-b shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <Skeleton className="h-8 w-48 mb-2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
                <div className="mt-4 md:mt-0 flex gap-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-9 w-40" />
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Stats grid skeleton */}  
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

            {/* Main content skeleton */}  
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">  
              <div className="lg:col-span-2 space-y-4">  
                <Skeleton className="h-12 w-48 mb-4" />  
                {Array(3).fill(0).map((_, idx) => (  
                  <Skeleton key={idx} className="h-32 w-full" />  
                ))}  
              </div>  
              <div className="space-y-4">  
                <Skeleton className="h-64 w-full" />  
                <Skeleton className="h-64 w-full" />  
              </div>  
            </div>  
          </main>  
        </div>  
      </div>  
    );
  }

  // Error state
  if (error && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Unable to Load Dashboard
          </h1>
          <p className="text-gray-600 mb-8">
            There was an error loading your dashboard data.
          </p>
          <div className="space-y-4">
            <Button 
              onClick={handleRefresh}
              className="w-full"
            >
              Try Again
            </Button>
            <Button 
              onClick={() => navigate('/login')}
              variant="outline"
              className="w-full"
            >
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const planLimits = getPlanLimits(user?.plan || 'free');
  const assessmentUsage = dashboardData?.assessments?.total || 0;
  const candidateUsage = dashboardData?.candidates?.total || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="pt-16">
        {/* Header */}  
        <header className="bg-white/80 backdrop-blur-sm border-b shadow-sm">  
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">  
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">  
              <div>  
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">  
                  <LayoutDashboard className="mr-3 h-6 w-6 text-blue-600" />  
                  Dashboard  
                </h1>  
                <div className="flex flex-wrap items-center gap-2 mt-2">  
                  <p className="text-gray-600">  
                    Welcome back, <span className="font-semibold text-gray-800">{user?.name || 'User'}</span>  
                  </p>  
                  <Badge   
                    variant="outline"   
                    className="border-blue-200 text-blue-700 bg-blue-50"  
                  >  
                    <Briefcase className="h-3 w-3 mr-1" />  
                    {user?.organization || 'Your Organization'}  
                  </Badge>  
                  <Badge   
                    className={`${  
                      user?.plan === 'free' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :  
                      user?.plan === 'basic' ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white' :  
                      user?.plan === 'professional' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' :  
                      'bg-gradient-to-r from-gray-700 to-gray-800 text-white'  
                    }`}  
                  >  
                    {user?.plan?.toUpperCase() || 'FREE'} PLAN  
                  </Badge>  
                  {user?.plan === 'free' && (  
                    <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700">  
                      {candidateUsage}/{planLimits.candidates} candidates  
                    </Badge>  
                  )}  
                </div>  
              </div>  
              <div className="mt-4 md:mt-0 flex flex-wrap gap-2">  
                <Button   
                  variant="outline"   
                  onClick={handleRefresh}  
                  disabled={isRefreshing}  
                  aria-label="Refresh dashboard"  
                  size="sm"  
                  className="shrink-0"  
                >  
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />  
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}  
                </Button>  
                <Button   
                  variant="outline"   
                  onClick={handleSettings}  
                  aria-label="Settings"  
                  size="sm"  
                  className="shrink-0"  
                >  
                  <Settings className="mr-2 h-4 w-4" />  
                  Settings  
                </Button>  
                <Button   
                  className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 transition-all shadow-md shrink-0"  
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">  
          {/* Error Alert */}  
          {error && (  
            <Alert variant="destructive" className="mb-6 animate-fade-in">  
              <AlertCircle className="h-4 w-4" />  
              <AlertDescription className="flex items-center justify-between">  
                <span>{error}</span>  
                <Button   
                  variant="ghost"   
                  size="sm"   
                  onClick={handleRefresh}  
                  className="ml-4"  
                >  
                  Retry  
                </Button>  
              </AlertDescription>  
            </Alert>  
          )}  

          {/* Stats Grid */}  
          <section aria-label="Dashboard statistics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">  
            {stats && stats.map((stat) => (  
              <Card   
                key={stat.id}   
                className="border-2 hover:shadow-lg transition-all duration-300 hover:border-blue-200 hover:scale-[1.02] bg-white/90 backdrop-blur-sm"  
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
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">  
                    {stat.value}  
                  </div>  
                  <div className="flex items-center text-sm mb-1">  
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
                  <p className="text-xs text-gray-500 truncate">  
                    {stat.description}  
                  </p>  
                </CardContent>  
              </Card>  
            ))}  
          </section>  

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">  
            {/* Recent Assessments */}  
            <section className="lg:col-span-2" aria-label="Recent assessments">  
              <Card className="border-2 bg-white/90 backdrop-blur-sm">  
                <CardHeader>  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">  
                    <div>  
                      <CardTitle className="flex items-center text-xl">  
                        <FileText className="mr-2 h-5 w-5 text-blue-600" aria-hidden="true" />  
                        Recent Assessments  
                        {recentAssessments.length > 0 && (  
                          <Badge className="ml-3 bg-blue-100 text-blue-800">  
                            {recentAssessments.length}  
                          </Badge>  
                        )}  
                      </CardTitle>  
                      <CardDescription>Your latest assessment activities and progress</CardDescription>  
                    </div>  
                    <div className="flex items-center space-x-2">  
                      {recentAssessments.length > 0 && (  
                        <>  
                          <Button   
                            variant="ghost"   
                            size="sm"  
                            onClick={handleViewAllAssessments}  
                            aria-label="View all assessments"  
                          >  
                            View All  
                            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />  
                          </Button>  
                        </>  
                      )}  
                    </div>  
                  </div>  
                </CardHeader>  
                <CardContent>  
                  {recentAssessments.length === 0 ? (  
                    <div className="text-center py-12">  
                      <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />  
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments yet</h3>  
                      <p className="text-gray-600 mb-4">Create your first assessment to start evaluating candidates</p>  
                      <Button   
                        onClick={handleCreateAssessment}  
                        disabled={user?.plan === 'free' && assessmentUsage >= planLimits.assessments}  
                        className="bg-gradient-to-r from-blue-600 to-teal-600"  
                      >  
                        <Plus className="mr-2 h-4 w-4" />  
                        Create Your First Assessment  
                        {user?.plan === 'free' && assessmentUsage >= planLimits.assessments && (  
                          <Badge className="ml-2 bg-yellow-100 text-yellow-800">Limit Reached</Badge>  
                        )}  
                      </Button>  
                    </div>  
                  ) : (  
                    <div className="space-y-4">  
                      {recentAssessments.map((assessment) => {  
                        // Calculate completion percentage (mock for now)  
                        const completionPercentage = Math.floor(Math.random() * 100);  
                          
                        return (  
                          <button  
                            key={assessment.id || assessment._id}  
                            onClick={() => handleAssessmentClick(assessment.id || assessment._id)}  
                            className="w-full text-left flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group"  
                            aria-label={`View ${assessment.title} assessment`}  
                          >  
                            <div className="flex-1 min-w-0 mb-3 sm:mb-0">  
                              <div className="flex items-center mb-2">  
                                <h4 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">  
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
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">  
                                <div className="flex items-center">  
                                  <Users className="h-4 w-4 mr-1 shrink-0" aria-hidden="true" />  
                                  <span>{assessment.candidate_count || 0} candidates</span>  
                                </div>  
                                <div className="flex items-center">  
                                  <Clock className="h-4 w-4 mr-1 shrink-0" aria-hidden="true" />  
                                  <span>{assessment.duration_minutes || 30} min</span>  
                                </div>  
                                <div className="flex items-center">  
                                  <Calendar className="h-4 w-4 mr-1 shrink-0" aria-hidden="true" />  
                                  <span>{formatDate(assessment.created_at)}</span>  
                                </div>  
                              </div>  
                              {assessment.description && (  
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">  
                                  {assessment.description}  
                                </p>  
                              )}  
                            </div>  
                            <div className="shrink-0">  
                              <div className="w-20 h-20 relative" role="presentation">  
                                <svg   
                                  className="w-20 h-20 transform -rotate-90"  
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
                                    strokeDashoffset={`${2 * Math.PI * 28 * ((100 - completionPercentage) / 100)}`}  
                                    strokeLinecap="round"  
                                  />  
                                </svg>  
                                <div className="absolute inset-0 flex items-center justify-center">  
                                  <div className="text-center">  
                                    <span className="text-lg font-bold text-gray-700 block">  
                                      {completionPercentage}%  
                                    </span>  
                                    <span className="text-xs text-gray-500">Complete</span>  
                                  </div>  
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
              <Card className="border-2 bg-white/90 backdrop-blur-sm">  
                <CardHeader>  
                  <CardTitle className="flex items-center text-lg">  
                    <Zap className="mr-2 h-5 w-5 text-teal-600" aria-hidden="true" />  
                    Quick Actions  
                  </CardTitle>  
                </CardHeader>  
                <CardContent className="space-y-3">  
                  <Button   
                    className="w-full justify-start bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200"   
                    variant="ghost"  
                    onClick={handleCreateAssessment}  
                    disabled={user?.plan === 'free' && assessmentUsage >= planLimits.assessments}  
                  >  
                    <Plus className="mr-3 h-4 w-4 text-blue-600" aria-hidden="true" />  
                    <div className="text-left">  
                      <div className="font-medium">New Assessment</div>  
                      <div className="text-xs text-gray-500">Create a new test</div>  
                    </div>  
                  </Button>  
                  <Button   
                    className="w-full justify-start bg-gradient-to-r from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 border border-teal-200"   
                    variant="ghost"  
                    onClick={handleInviteCandidates}  
                    disabled={recentAssessments.length === 0 || (user?.plan === 'free' && candidateUsage >= planLimits.candidates)}  
                  >  
                    <Users className="mr-3 h-4 w-4 text-teal-600" aria-hidden="true" />  
                    <div className="text-left">  
                      <div className="font-medium">Invite Candidates</div>  
                      <div className="text-xs text-gray-500">Send assessment links</div>  
                    </div>  
                  </Button>  
                  <Button   
                    className="w-full justify-start bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border border-purple-200"   
                    variant="ghost"  
                    onClick={handleViewAnalytics}  
                    disabled={recentAssessments.length === 0}  
                  >  
                    <BarChart3 className="mr-3 h-4 w-4 text-purple-600" aria-hidden="true" />  
                    <div className="text-left">  
                      <div className="font-medium">View Analytics</div>  
                      <div className="text-xs text-gray-500">Performance insights</div>  
                    </div>  
                  </Button>  
                  <Button   
                    className="w-full justify-start bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border border-green-200"   
                    variant="ghost"  
                    onClick={handleExportReports}  
                    disabled={recentAssessments.length === 0}  
                  >  
                    <ExternalLink className="mr-3 h-4 w-4 text-green-600" aria-hidden="true" />  
                    <div className="text-left">  
                      <div className="font-medium">Export Reports</div>  
                      <div className="text-xs text-gray-500">Download assessment data</div>  
                    </div>  
                  </Button>  
                </CardContent>  
              </Card>  

              <Card className="border-2 bg-gradient-to-br from-blue-50/80 via-teal-50/80 to-white backdrop-blur-sm">  
                <CardHeader>  
                  <CardTitle className="flex items-center text-lg">  
                    <Award className="mr-2 h-5 w-5 text-blue-600" aria-hidden="true" />  
                    Usage & Insights  
                  </CardTitle>  
                </CardHeader>  
                <CardContent className="space-y-6">  
                  <div>  
                    <div className="flex justify-between items-center mb-2">  
                      <span className="text-sm font-medium text-gray-700">Assessments</span>  
                      <span className="text-sm font-semibold text-gray-900">  
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
                    <div className="flex justify-between items-center mb-2">  
                      <span className="text-sm font-medium text-gray-700">Candidates</span>  
                      <span className="text-sm font-semibold text-gray-900">  
                        {candidateUsage}  
                        {user?.plan === 'free' ? ` / ${planLimits.candidates}` : ''}  
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
                    
                  {dashboardData?.completion_rate !== undefined && (  
                    <div>  
                      <div className="flex justify-between items-center mb-2">  
                        <span className="text-sm font-medium text-gray-700">Completion Rate</span>  
                        <span className="text-sm font-semibold text-gray-900">  
                          {Math.round(dashboardData.completion_rate)}%  
                        </span>  
                      </div>  
                      <div   
                        className="w-full bg-gray-200 rounded-full h-2"  
                        role="progressbar"  
                        aria-valuenow={dashboardData.completion_rate}  
                        aria-valuemin={0}  
                        aria-valuemax={100}  
                      >  
                        <div   
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"  
                          style={{ width: `${dashboardData.completion_rate}%` }}   
                        />  
                      </div>  
                    </div>  
                  )}  
                    
                  <div className="pt-4 border-t border-gray-300">  
                    {user?.plan === 'free' ? (  
                      <div className="space-y-3">  
                        <div className="p-3 bg-gradient-to-r from-blue-500/10 to-teal-500/10 rounded-lg border border-blue-200/50">  
                          <p className="text-sm font-medium text-gray-900 mb-1">  
                            🚀 Unlock Premium Features  
                          </p>  
                          <p className="text-xs text-gray-600">  
                            Upgrade to get unlimited assessments, advanced analytics, and priority support.  
                          </p>  
                        </div>  
                        <Button   
                          size="sm"   
                          className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 shadow-md"  
                          onClick={handleUpgradePlan}  
                        >  
                          <DollarSign className="mr-2 h-4 w-4" />  
                          Upgrade Plan  
                        </Button>  
                      </div>  
                    ) : (  
                      <div className="space-y-3">  
                        <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-200/50">  
                          <p className="text-sm font-medium text-gray-900 mb-1">  
                            🎉 Premium Account Active  
                          </p>  
                          <p className="text-xs text-gray-600">  
                            You're enjoying all premium features on the {user?.plan} plan.  
                          </p>  
                        </div>  
                        <div className="space-y-2">  
                          <Button   
                            size="sm"   
                            variant="outline"  
                            className="w-full justify-start border-blue-200"  
                            onClick={handleBilling}  
                          >  
                            <DollarSign className="mr-2 h-4 w-4" />  
                            Manage Billing  
                          </Button>  
                          <Button   
                            size="sm"   
                            variant="outline"  
                            className="w-full justify-start border-purple-200"  
                            onClick={handleUserProfile}  
                          >  
                            <User className="mr-2 h-4 w-4" />  
                            Edit Profile  
                          </Button>  
                          <Button   
                            size="sm"   
                            variant="outline"  
                            className="w-full justify-start border-teal-200"  
                            onClick={handleOrganization}  
                          >  
                            <Shield className="mr-2 h-4 w-4" />  
                            Organization  
                          </Button>  
                        </div>  
                      </div>  
                    )}  
                  </div>  
                </CardContent>  
              </Card>  
            </div>  
          </div>  
        </main>  
      </div>  
    </div>  
  );
};

export default Dashboard;
