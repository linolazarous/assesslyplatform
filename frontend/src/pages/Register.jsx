import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { authAPI } from '../services/api';
import { toast } from 'sonner';
import { Building2, Mail, Lock, User, ArrowLeft } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedPlan = location.state?.plan || 'free';
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      organization: formData.get('organization'),
      password: formData.get('password'),
      role: 'admin',
      plan: selectedPlan
    };

    try {
      const result = await authAPI.register(data);
      localStorage.setItem('assessly_token', result.access_token);
      localStorage.setItem('assessly_user', JSON.stringify(result.user));
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.detail || 'Registration failed. Please try again.';
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
          <p className="text-gray-600">Start your 14-day free trial. No credit card required.</p>
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Sign Up</CardTitle>
            <CardDescription>
              {selectedPlan !== 'free' && (
                <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mt-2">
                  Selected Plan: {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Full Name
                </Label>
                <Input 
                  id="name" 
                  name="name" 
                  type="text" 
                  required 
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="mr-2 h-4 w-4" />
                  Work Email
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
                <Label htmlFor="organization" className="flex items-center">
                  <Building2 className="mr-2 h-4 w-4" />
                  Organization Name
                </Label>
                <Input 
                  id="organization" 
                  name="organization" 
                  type="text" 
                  required 
                  placeholder="Your Company"
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
                  minLength={8}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <p className="text-center text-sm text-gray-600 mt-4">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>

              <p className="text-xs text-gray-500 text-center mt-4">
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
