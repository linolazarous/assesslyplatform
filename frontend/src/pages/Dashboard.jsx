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

import { toast } from 'sonner';

/* ---------------------------------- */
/* Constants                           */
/* ---------------------------------- */

const STATS_COLORS = {
  blue: 'text-blue-600',
  teal: 'text-teal-600',
  green: 'text-green-600',
  purple: 'text-purple-600'
};

const PLAN_LIMITS = {
  free: { assessments: 5, candidates: 50 },
  basic: { assessments: 50, candidates: 500 },
  professional: { assessments: 1000, candidates: 100000 },
  enterprise: { assessments: 10000, candidates: 1000000 }
};

/* ---------------------------------- */
/* Component                           */
/* ---------------------------------- */

const Dashboard = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);

  const [dashboardData, setDashboardData] = useState(null);
  const [stats, setStats] = useState([]);
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [recentCandidates, setRecentCandidates] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  /* ---------------------------------- */
  /* Helpers                            */
  /* ---------------------------------- */

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

  const getPlanLimits = (plan = 'free') =>
    PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  /* ---------------------------------- */
  /* Data Fetch                         */
  /* ---------------------------------- */

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      /* ---------- User ---------- */
      const currentUser = await authAPI.getCurrentUser();
      if (!currentUser || currentUser.error) {
        throw new Error('Session expired');
      }
      setUser(currentUser);

      /* ---------- Subscription ---------- */
      try {
        const sub = await subscriptionAPI.getCurrentSubscription();
        setSubscription(sub);
      } catch {
        setSubscription({
          plan: 'free',
          status: 'active',
          is_free: true
        });
      }

      /* ---------- Dashboard Stats ---------- */
      const statsResponse = await dashboardAPI.getStats();
      setDashboardData(statsResponse);

      /* ---------- Recent Assessments ---------- */
      setRecentAssessments(statsResponse?.recent_assessments || []);

      /* ---------- Recent Candidates ---------- */
      setRecentCandidates(statsResponse?.recent_candidates || []);

      /* ---------- Stat Cards ---------- */
      setStats([
        {
          id: 'assessments',
          label: 'Total Assessments',
          value: statsResponse?.assessments?.total || 0,
          icon: FileText,
          color: 'blue',
          description: 'All created assessments'
        },
        {
          id: 'candidates',
          label: 'Active Candidates',
          value: statsResponse?.candidates?.invited || 0,
          icon: Users,
          color: 'teal',
          description: 'Invited candidates'
        },
        {
          id: 'completion',
          label: 'Completion Rate',
          value: `${Math.round(statsResponse?.completion_rate || 0)}%`,
          icon: Target,
          color: 'green',
          description: 'Assessment completion'
        },
        {
          id: 'completed',
          label: 'Completed',
          value: statsResponse?.candidates?.completed || 0,
          icon: CheckCircle,
          color: 'purple',
          description: 'Finished assessments'
        }
      ]);
    } catch (err) {
      console.error(err);

      if (err.message.includes('Session')) {
        navigate('/login', {
          state: { message: 'Session expired. Please login again.' }
        });
        return;
      }

      setError('Failed to load dashboard data');
      toast.error('Unable to load dashboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /* ---------------------------------- */
  /* Actions                            */
  /* ---------------------------------- */

  const handleCreateAssessment = async () => {
    try {
      const plan = subscription?.plan || 'free';
      const limits = getPlanLimits(plan);
      const used = dashboardData?.assessments?.total || 0;

      if (plan === 'free' && used >= limits.assessments) {
        toast.error('Assessment limit reached. Upgrade your plan.');
        navigate('/pricing');
        return;
      }

      const assessment = await assessmentAPI.create({
        title: 'New Assessment',
        description: '',
        assessment_type: 'multiple_choice',
        duration_minutes: 30
      });

      toast.success('Assessment created');
      navigate(`/assessments/${assessment.id}`);
    } catch {
      toast.error('Failed to create assessment');
    }
  };

  /* ---------------------------------- */
  /* Loading                            */
  /* ---------------------------------- */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20 max-w-7xl mx-auto px-6">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-32 w-full mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  /* ---------------------------------- */
  /* Render                             */
  /* ---------------------------------- */

  const plan = subscription?.plan || 'free';
  const limits = getPlanLimits(plan);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="pt-16 max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <LayoutDashboard className="mr-2 text-blue-600" />
              Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back, <strong>{user?.name}</strong>
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchDashboardData}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button onClick={handleCreateAssessment}>
              <Plus className="h-4 w-4 mr-1" />
              New Assessment
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((s) => (
            <Card key={s.id}>
              <CardHeader className="flex justify-between">
                <CardTitle className="text-sm">{s.label}</CardTitle>
                <s.icon className={`h-5 w-5 ${STATS_COLORS[s.color]}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
                <p className="text-xs text-gray-500">{s.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Assessments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Assessments</CardTitle>
            <CardDescription>Latest created assessments</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAssessments.length === 0 ? (
              <p className="text-gray-500">No assessments yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentAssessments.map((a) => (
                  <li
                    key={a.id}
                    className="p-4 bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
                    onClick={() => navigate(`/assessments/${a.id}`)}
                  >
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-sm text-gray-600 flex gap-4">
                      <span>{a.duration_minutes} min</span>
                      <span>{formatDate(a.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Usage */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Assessments: {dashboardData?.assessments?.total} /{' '}
              {plan === 'free' ? limits.assessments : '∞'}
            </p>
            <p className="text-sm">
              Candidates: {dashboardData?.candidates?.total} /{' '}
              {plan === 'free' ? limits.candidates : '∞'}
            </p>

            {plan === 'free' && (
              <Button
                className="mt-4"
                onClick={() => navigate('/pricing')}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Upgrade Plan
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
