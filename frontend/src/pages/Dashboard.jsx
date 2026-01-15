import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, BarChart3, Settings,
  Plus, TrendingUp, Target, Clock, Award, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('assessly_token');
    if (!token) {
      navigate('/login');
      return;
    }

    const userData = localStorage.getItem('assessly_user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [navigate]);

  if (!user) return null;

  const stats = [
    { label: 'Total Assessments', value: 24, change: '+12%', icon: FileText, color: 'blue' },
    { label: 'Active Candidates', value: 487, change: '+8%', icon: Users, color: 'teal' },
    { label: 'Completion Rate', value: '94.2%', change: '+2.1%', icon: Target, color: 'green' },
    { label: 'Avg. Response Time', value: '12m', change: '-5%', icon: Clock, color: 'purple' }
  ];

  const recentAssessments = [
    { id: 1, title: 'JavaScript Fundamentals', candidates: 45, completion: 88, status: 'active' },
    { id: 2, title: 'Python for Data Science', candidates: 32, completion: 76, status: 'active' },
    { id: 3, title: 'Cloud Architecture Basics', candidates: 28, completion: 92, status: 'completed' },
    { id: 4, title: 'Product Management Skills', candidates: 18, completion: 65, status: 'active' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="pt-16">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {user.name}!
                </h1>
                <p className="text-gray-600 mt-1">{user.organization}</p>
              </div>
              <div className="mt-4 md:mt-0 flex items-center space-x-3">
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
                <Button className="bg-gradient-to-r from-blue-600 to-teal-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assessment
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, idx) => (
              <Card key={idx} className="border-2 hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.label}
                  </CardTitle>
                  <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
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
                    />
                    <span className={stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                      {stat.change}
                    </span>
                    <span className="text-gray-500 ml-1">vs last month</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Assessments */}
            <div className="lg:col-span-2">
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <LayoutDashboard className="mr-2 h-5 w-5 text-blue-600" />
                        Recent Assessments
                      </CardTitle>
                      <CardDescription>Your latest assessment activities</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm">
                      View All
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentAssessments.map((assessment) => (
                      <div
                        key={assessment.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h4 className="font-semibold text-gray-900">{assessment.title}</h4>
                            <Badge
                              className={`ml-3 ${
                                assessment.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {assessment.status}
                            </Badge>
                          </div>
                          <div className="flex items-center mt-2 text-sm text-gray-600">
                            <Users className="h-4 w-4 mr-1" />
                            <span>{assessment.candidates} candidates</span>
                            <span className="mx-2">•</span>
                            <Target className="h-4 w-4 mr-1" />
                            <span>{assessment.completion}% completion</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="w-16 h-16 relative">
                            <svg className="w-16 h-16 transform -rotate-90">
                              <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="4" fill="none" />
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
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Insights */}
            <div className="space-y-6">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="mr-2 h-5 w-5 text-teal-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    New Assessment
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Invite Candidates
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Export Reports
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 bg-gradient-to-br from-blue-50 to-teal-50">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="mr-2 h-5 w-5 text-blue-600" />
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-700">Assessments Created</span>
                      <span className="font-semibold text-gray-900">8 / 10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full" style={{ width: '80%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-700">Candidates Assessed</span>
                      <span className="font-semibold text-gray-900">487 / 500</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-teal-500 to-green-500 h-2 rounded-full" style={{ width: '97.4%' }} />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-300">
                    <p className="text-sm text-gray-700 mb-2">
                      🎉 Great job! You're on track to exceed your monthly goals.
                    </p>
                    <Button size="sm" className="w-full bg-gradient-to-r from-blue-600 to-teal-600">
                      Upgrade Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

const Zap = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export default Dashboard;
