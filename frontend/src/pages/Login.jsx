import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { authAPI, paymentAPI } from '../services/api';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(location.state?.plan || 'professional');

  useEffect(() => {
    const token = localStorage.getItem('assessly_token');
    if (token) navigate('/dashboard');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const userData = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      organization: formData.get('organization'),
      plan,
    };

    try {
      // Register user
      const result = await authAPI.register(userData);

      // Store token & user
      localStorage.setItem('assessly_token', result.access_token);
      localStorage.setItem('assessly_user', JSON.stringify(result.user));
      toast.success('Registration successful!');

      // Redirect to payment for paid plans
      if (plan !== 'free') {
        const session = await paymentAPI.createCheckoutSession(result.user.id, plan);
        window.location.href = session.url; // Stripe Checkout
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const message =
        error?.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>

        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>
              Fill in your details to start your free trial or paid plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Full Name
                </Label>
                <Input id="name" name="name" required placeholder="John Doe" className="mt-1" />
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Label>
                <Input id="email" name="email" type="email" required placeholder="john@company.com" className="mt-1" />
              </div>

              <div>
                <Label htmlFor="password" className="flex items-center">
                  <Lock className="mr-2 h-4 w-4" />
                  Password
                </Label>
                <Input id="password" name="password" type="password" required placeholder="••••••••" className="mt-1" />
              </div>

              <div>
                <Label htmlFor="organization">Organization</Label>
                <Input id="organization" name="organization" required placeholder="Your Company" className="mt-1" />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Register'}
              </Button>

              <p className="text-center text-sm text-gray-600 mt-4">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
