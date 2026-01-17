import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Alert, AlertDescription } from '../components/ui/alert';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

// Constants for better maintainability
const LOCAL_STORAGE_KEYS = {
  TOKEN: 'assessly_token',
  USER: 'assessly_user'
};

const STATS_COLORS = {
  blue: 'text-blue-600',
  teal: 'text-teal-600',
  green: 'text-green-600',
  purple: 'text-purple-600'
} as const;

const ASSESSMENT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed'
} as const;

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState([]);
  const [recentAssessments, setRecentAssessments] = useState([]);

  // Memoized stats configuration
  const statsConfig = useMemo(() => [
    {
      id: 'total-assessments',
      label: 'Total Assessments',
      value: 24,
      change: '+12%',
      icon: FileText,
      color: 'blue'
    },
    {
      id: 'active-candidates',
      label: 'Active Candidates',
      value: 487,
      change: '+8%',
      icon: Users,
      color: 'teal'
    },
    {
      id: 'completion-rate',
      label: 'Completion Rate',
      value: '94.2%',
      change: '+2.1%',
      icon: Target,
      color: 'green'
    },
    {
      id: 'avg-response-time',
      label: 'Avg. Response Time',
      value: '12m',
      change: '-5%',
      icon: Clock,
      color: 'purple'
    }
  ], []);

  // Memoized recent assessments data
  const assessmentsConfig = useMemo(() => [
    {
      id: 1,
      title: 'JavaScript Fundamentals',
      candidates: 45,
      completion: 88,
      status: ASSESSMENT_STATUS.ACTIVE
    },
    {
      id: 2,
      title: 'Python for Data Science',
      candidates: 32,
      completion: 76,
      status: ASSESSMENT_STATUS.ACTIVE
    },
    {
      id: 3,
      title: 'Cloud Architecture Basics',
      candidates: 28,
      completion: 92,
      status: ASSESSMENT_STATUS.COMPLETED
    },
    {
      id: 4,
      title: 'Product Management Skills',
      candidates: 18,
      completion: 65,
      status: ASSESSMENT_STATUS.ACTIVE
    }
  ], []);

  // Fetch user data and initialize stats
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
          throw new Error('User data not found');
        }

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // In production, you would fetch these from an API
        // const [statsData, assessmentsData] = await Promise.all([
        //   fetchStats(token),
        //   fetchRecentAssessments(token)
        // ]);

        // Simulate API delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));

        setStats(statsConfig);
        setRecentAssessments(assessmentsConfig);
      } catch (err) {
        console.error('Dashboard initialization error:', err);
        setError(err.message || 'Failed to load dashboard data');
        
        // Only redirect on auth errors
        if (err.message.includes('User data not found')) {
          localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
          localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
          navigate('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, [navigate, statsConfig, assessmentsConfig]);

  // Navigation handlers
  const handleCreateAssessment = useCallback(() => {
    navigate('/assessments/create');
  }, [navigate]);

  const handleViewAllAssessments = useCallback(() => {
    navigate('/assessments');
  }, [navigate]);

  const handleAssessmentClick = useCallback((id) => {
    navigate(`/assessments/${id}`);
  }, [navigate]);

  const handleUpgradePlan = useCallback(() => {
    navigate('/billing/upgrade');
  }, [navigate]);

  const handleQuickAction = useCallback((action) => {
    switch (action) {
      case 'new-assessment':
        navigate('/assessments/create');
        break;
      case 'invite-candidates':
        navigate('/candidates/invite');
        break;
      case 'view-analytics':
        navigate('/analytics');
        break;
      case 'export-reports':
        navigate('/reports/export');
        break;
      default:
        break;
    }
  }, [navigate]);

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
          </div>
        </div>
        <Footer />
      </div>
    );
  }

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
                  Welcome back, {user.name}!
                </h1>
                <p className="text-gray-600 mt-1">{user.organization}</p>
              </div>
              <div className="mt-4 md:mt-0 flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/settings')}
                  aria-label="Settings"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 transition-all"
                  onClick={handleCreateAssessment}
                  aria-label="Create new assessment"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assessment
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
            {stats.map((stat) => (
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
                      </CardTitle>
                      <CardDescription>Your latest assessment activities</CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleViewAllAssessments}
                      aria-label="View all assessments"
                    >
                      View All
                      <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentAssessments.map((assessment) => (
                      <button
                        key={assessment.id}
                        onClick={() => handleAssessmentClick(assessment.id)}
                        className="w-full text-left flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label={`View ${assessment.title} assessment`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <h4 className="font-semibold text-gray-900 truncate">{assessment.title}</h4>
                            <Badge
                              className={`ml-3 shrink-0 ${
                                assessment.status === ASSESSMENT_STATUS.ACTIVE
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {assessment.status}
                            </Badge>
                          </div>
                          <div className="flex items-center mt-2 text-sm text-gray-600">
                            <Users className="h-4 w-4 mr-1 shrink-0" aria-hidden="true" />
                            <span>{assessment.candidates} candidates</span>
                            <span className="mx-2" aria-hidden="true">•</span>
                            <Target className="h-4 w-4 mr-1 shrink-0" aria-hidden="true" />
                            <span>{assessment.completion}% completion</span>
                          </div>
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
                                strokeDashoffset={`${2 * Math.PI * 28 * (1 - assessment.completion / 100)}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-bold text-gray-700">
                                {assessment.completion}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
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
                    onClick={() => handleQuickAction('new-assessment')}
                  >
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    New Assessment
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => handleQuickAction('invite-candidates')}
                  >
                    <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                    Invite Candidates
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => handleQuickAction('view-analytics')}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />
                    View Analytics
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => handleQuickAction('export-reports')}
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
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-700">Assessments Created</span>
                      <span className="font-semibold text-gray-900">8 / 10</span>
                    </div>
                    <div 
                      className="w-full bg-gray-200 rounded-full h-2"
                      role="progressbar"
                      aria-valuenow={80}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: '80%' }} 
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-700">Candidates Assessed</span>
                      <span className="font-semibold text-gray-900">487 / 500</span>
                    </div>
                    <div 
                      className="w-full bg-gray-200 rounded-full h-2"
                      role="progressbar"
                      aria-valuenow={97.4}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div 
                        className="bg-gradient-to-r from-teal-500 to-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: '97.4%' }} 
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-300">
                    <p className="text-sm text-gray-700 mb-2">
                      🎉 Great job! You're on track to exceed your monthly goals.
                    </p>
                    <Button 
                      size="sm" 
                      className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                      onClick={handleUpgradePlan}
                    >
                      Upgrade Plan
                    </Button>
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
