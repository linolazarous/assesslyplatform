import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { authAPI } from '../services/api';
import { toast } from 'sonner';
import { Mail, Lock, ArrowLeft } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const credentials = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    try {
      const result = await authAPI.login(credentials);
      localStorage.setItem('assessly_token', result.access_token);
      localStorage.setItem('assessly_user', JSON.stringify(result.user));
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage =
        error.response?.data?.detail || 'Invalid credentials. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>

          <img
            src="/images/logo.png"
            alt="Assessly Platform"
            className="h-12 w-auto mx-auto mb-4"
          />

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your Assessly account</p>
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="john@company.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password" className="flex items-center">
                  <Lock className="mr-2 h-4 w-4" />
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="mt-1"
                />
                <div className="text-right mt-1">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              <p className="text-center text-sm text-gray-600 mt-4">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign up for free
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Demo credentials for testing:</p>
          <p className="font-mono text-xs mt-1">
            demo@assesslyplatform.com / password123
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
