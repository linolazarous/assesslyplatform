import React, { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Shield, FileEdit, BarChart3, Lock, Plug, 
  ArrowRight, CheckCircle2, TrendingUp, Users, Target,
  Zap, Globe, Clock, Award, FileCheck, Mail,
  AlertCircle, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { 
  mockFeatures, 
  mockCapabilities, 
  mockAssessmentTypes, 
  mockPricingPlans
} from '../utils/mock';
import { contactAPI, demoAPI } from '../services/api';
import { toast } from 'sonner';

// Lazy load heavy components
const VideoBackground = lazy(() => import('../components/VideoBackground'));

const iconMap = {
  Building2,
  Shield,
  FileEdit,
  BarChart3,
  Lock,
  Plug
}; // Removed: as const

const Home = () => {
  const navigate = useNavigate();
  const [videoError, setVideoError] = useState(false);
  const [metrics, setMetrics] = useState({ orgs: 0, candidates: 0, questions: 0, uptime: 0 });
  const [selectedPlan, setSelectedPlan] = useState('professional');
  const [isLoading, setIsLoading] = useState({
    contact: false,
    demo: false
  });
  const [formErrors, setFormErrors] = useState({});
  const videoRef = useRef(null);
  const observerRef = useRef(null);

  // Animated counter for trust metrics with intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          startCounterAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.5, rootMargin: '50px' }
    );

    const heroSection = document.querySelector('[data-hero-section]');
    if (heroSection) {
      observer.observe(heroSection);
    }

    return () => observer.disconnect();
  }, []);

  const startCounterAnimation = useCallback(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    const targets = {
      orgs: 500,
      candidates: 85000,
      questions: 250000,
      uptime: 99.9
    };

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      
      setMetrics({
        orgs: Math.floor(targets.orgs * progress),
        candidates: Math.floor(targets.candidates * progress),
        questions: Math.floor(targets.questions * progress),
        uptime: parseFloat((targets.uptime * progress).toFixed(1))
      });

      if (step >= steps) {
        clearInterval(timer);
        setMetrics(targets);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  // Form validation
  const validateForm = useCallback((formData, formType) => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.name?.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (formType === 'contact' && !formData.message?.trim()) {
      errors.message = 'Message is required';
    }

    if (formType === 'demo' && !formData.company?.trim()) {
      errors.company = 'Company name is required';
    }

    return errors;
  }, []);

  // Contact form handler
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    const errors = validateForm(data, 'contact');
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(prev => ({ ...prev, contact: true }));
    setFormErrors({});

    try {
      await contactAPI.submitContactForm(data);
      toast.success('Message sent successfully! We\'ll get back to you within 24 hours.');
      e.target.reset();
      
      // Track conversion
      if (window.gtag) {
        window.gtag('event', 'contact_form_submit');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error(error.message || 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(prev => ({ ...prev, contact: false }));
    }
  };

  // Demo request handler
  const handleDemoRequest = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    const errors = validateForm(data, 'demo');
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(prev => ({ ...prev, demo: true }));
    setFormErrors({});

    try {
      await demoAPI.submitDemoRequest(data);
      toast.success('Demo request received! Our team will contact you within 24 hours.');
      e.target.reset();
      
      // Track conversion
      if (window.gtag) {
        window.gtag('event', 'demo_request');
      }
    } catch (error) {
      console.error('Demo request error:', error);
      toast.error(error.message || 'Failed to submit demo request. Please try again.');
    } finally {
      setIsLoading(prev => ({ ...prev, demo: false }));
    }
  };

  const handlePlanSelect = useCallback((planId) => {
    setSelectedPlan(planId);
    
    // Track plan selection
    if (window.gtag) {
      window.gtag('event', 'select_plan', {
        plan_id: planId
      });
    }
    
    if (planId === 'enterprise') {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        contactSection.focus();
      }
    } else {
      navigate('/register', { state: { plan: planId } });
    }
  }, [navigate]);

  const handleScrollToContact = useCallback(() => {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
      contactSection.focus();
    }
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoError(true);
    // Log to monitoring service
    console.error('Hero video failed to load');
  }, []);

  // Loading state
  if (!metrics) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="pt-16">
          <Skeleton className="h-screen w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section 
        className="relative h-screen flex items-center justify-center overflow-hidden"
        data-hero-section
        aria-label="Hero section with platform introduction"
      >
        {/* Video Background */}
        <Suspense fallback={
          <div 
            className="absolute inset-0 bg-gradient-to-br from-blue-900 via-teal-900 to-green-900"
            role="img"
            aria-label="Team collaboration background"
          />
        }>
          {!videoError ? (
            <VideoBackground
              src="/videos/hero-bg.mp4"
              fallbackSrc="/videos/hero-bg.webm"
              alt="Team collaborating on assessment platform"
            />
          ) : (
            <div 
              className="absolute inset-0 w-full h-full bg-cover bg-center"
              style={{ 
                backgroundImage: 'url(/images/hero-fallback.webp)',
                backgroundPosition: 'center'
              }}
              role="img"
              aria-label="Team collaboration background"
            />
          )}
        </Suspense>

        {/* Glassmorphism Overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-teal-900/70 to-green-900/60 backdrop-blur-sm"
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge 
            className="mb-6 bg-white/20 backdrop-blur-md text-white border-white/30 px-6 py-2 text-sm"
            aria-label="Trust badge: Trusted by 500+ Organizations Worldwide"
          >
            Trusted by 500+ Organizations Worldwide
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight">
            Measure Smarter,
            <br />
            <span className="bg-gradient-to-r from-teal-300 to-green-300 bg-clip-text text-transparent">
              Not Harder
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-200 mb-6 max-w-3xl mx-auto">
            From Questions to Insights, Anywhere.
          </p>

          <p className="text-base sm:text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
            Enterprise-grade assessment platform with multi-tenant architecture, 
            real-time analytics, and AI-powered insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="bg-white text-blue-600 hover:bg-gray-100 px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-semibold shadow-xl transition-all hover:scale-105"
              aria-label="Start free trial"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={handleScrollToContact}
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-semibold transition-all hover:scale-105"
              aria-label="Request enterprise demo"
            >
              Request Enterprise Demo
            </Button>
          </div>

          {/* Trust Indicators */}
          <div 
            className="mt-8 sm:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto"
            aria-label="Platform metrics"
          >
            {[
              { label: 'Organizations', value: `${metrics.orgs}+` },
              { label: 'Candidates', value: `${(metrics.candidates / 1000).toFixed(0)}K+` },
              { label: 'Questions', value: `${(metrics.questions / 1000).toFixed(0)}K+` },
              { label: 'Uptime', value: `${metrics.uptime}%` }
            ].map((metric, idx) => (
              <div key={idx} className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">
                  {metric.value}
                </div>
                <div className="text-xs sm:text-sm text-gray-300">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <button
          onClick={() => {
            document.getElementById('platform')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded-full"
          aria-label="Scroll to next section"
        >
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2"></div>
          </div>
        </button>
      </section>

      {/* Platform Features */}
      <section id="platform" className="py-16 sm:py-20 lg:py-24 bg-gray-50" aria-label="Platform features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
              Platform Capabilities
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Enterprise-Grade Assessment Platform
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Built for scale, security, and intelligence. Everything you need to create, 
              deliver, and analyze assessments across your organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {mockFeatures.map((feature) => {
              const Icon = iconMap[feature.icon];
              return (
                <Card 
                  key={feature.id} 
                  className="border-2 hover:border-teal-500 hover:shadow-xl transition-all duration-300 group focus-within:ring-2 focus-within:ring-teal-500"
                  tabIndex={0}
                >
                  <CardHeader>
                    <div className="mb-4 inline-flex p-3 bg-gradient-to-br from-blue-100 to-teal-100 rounded-lg group-hover:scale-110 transition-transform">
                      <Icon className="h-8 w-8 text-blue-600" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Assessment Lifecycle */}
      <section className="py-16 sm:py-20 lg:py-24 bg-white" aria-label="Assessment lifecycle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <Badge className="mb-4 bg-teal-100 text-teal-700 border-teal-200">
              Assessment Lifecycle
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              From Creation to Action
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              A seamless workflow that takes you from assessment design to data-driven decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockCapabilities.map((capability) => (
              <div 
                key={capability.id}
                className="relative p-6 sm:p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 hover:border-teal-400 transition-all duration-300 hover:shadow-lg group focus-within:ring-2 focus-within:ring-teal-500"
                tabIndex={0}
              >
                <div className="absolute top-4 right-4 text-5xl sm:text-6xl font-bold text-gray-200 group-hover:text-teal-200 transition-colors">
                  {capability.step}
                </div>
                <div className="relative">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                    {capability.title}
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    {capability.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assessment Types */}
      <section id="solutions" className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-blue-50 via-teal-50 to-green-50" aria-label="Assessment types">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700 border-green-200">
              Versatile Solutions
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Support for Every Assessment Type
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              From exams to 360° feedback, our platform handles all your evaluation needs.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {mockAssessmentTypes.map((type, idx) => (
              <div 
                key={idx}
                className="p-4 sm:p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 text-center group focus-within:ring-2 focus-within:ring-blue-500"
                tabIndex={0}
              >
                <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600 mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform" aria-hidden="true" />
                <p className="font-semibold text-gray-800 text-sm sm:text-base">{type}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gray-900 text-white" aria-label="Dashboard preview">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <Badge className="mb-4 bg-blue-600 text-white border-blue-500">
              Platform Preview
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Powerful Analytics Dashboard
            </h2>
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto">
              Real-time insights, predictive analytics, and AI-powered reports at your fingertips.
            </p>
          </div>

          <div className="relative max-w-6xl mx-auto">
            {/* Mock Dashboard */}
            <div className="bg-gray-800 rounded-2xl border-2 border-gray-700 p-6 sm:p-8 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 sm:p-6 rounded-xl">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 mb-3" aria-hidden="true" />
                  <div className="text-2xl sm:text-3xl font-bold mb-1">2,847</div>
                  <div className="text-blue-200 text-sm">Active Candidates</div>
                  <div className="flex items-center mt-2 text-green-300 text-xs sm:text-sm">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" aria-hidden="true" />
                    <span>+12.5% this month</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-teal-600 to-teal-700 p-4 sm:p-6 rounded-xl">
                  <Target className="h-6 w-6 sm:h-8 sm:w-8 mb-3" aria-hidden="true" />
                  <div className="text-2xl sm:text-3xl font-bold mb-1">156</div>
                  <div className="text-teal-200 text-sm">Active Assessments</div>
                  <div className="flex items-center mt-2 text-green-300 text-xs sm:text-sm">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" aria-hidden="true" />
                    <span>+8.3% this week</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-600 to-green-700 p-4 sm:p-6 rounded-xl">
                  <Zap className="h-6 w-6 sm:h-8 sm:w-8 mb-3" aria-hidden="true" />
                  <div className="text-2xl sm:text-3xl font-bold mb-1">94.2%</div>
                  <div className="text-green-200 text-sm">Completion Rate</div>
                  <div className="flex items-center mt-2 text-green-300 text-xs sm:text-sm">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" aria-hidden="true" />
                    <span>+2.1% this month</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 rounded-xl p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center">
                  <BarChart3 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-teal-500" aria-hidden="true" />
                  Performance Analytics
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {['JavaScript Fundamentals', 'Python for Data Science', 'Cloud Architecture'].map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1 sm:mb-2">
                        <span className="truncate mr-2">{item}</span>
                        <span className="text-teal-400 flex-shrink-0">{85 - idx * 5}%</span>
                      </div>
                      <div 
                        className="w-full bg-gray-600 rounded-full h-2"
                        role="progressbar"
                        aria-valuenow={85 - idx * 5}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${85 - idx * 5}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 sm:w-24 sm:h-24 bg-blue-500/20 rounded-full blur-2xl" aria-hidden="true" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 sm:w-32 sm:h-32 bg-teal-500/20 rounded-full blur-2xl" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-20 lg:py-24 bg-white" aria-label="Pricing plans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
              Simple Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Plans That Scale With You
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              From startups to enterprises, we have a plan that fits your needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockPricingPlans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isPopular = plan.popular;
              
              return (
                <Card 
                  key={plan.id}
                  className={`relative border-2 transition-all duration-300 hover:shadow-xl ${
                    isPopular 
                      ? 'border-blue-500 shadow-lg md:scale-[1.02]' 
                      : 'border-gray-200 hover:border-blue-300'
                  } ${
                    isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                  }`}
                  aria-labelledby={`plan-${plan.id}-title`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader>
                    <CardTitle id={`plan-${plan.id}-title`} className="text-xl lg:text-2xl">
                      {plan.name}
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      {plan.price !== null ? (
                        <>
                          <span className="text-3xl lg:text-4xl font-bold text-gray-900">
                            ${plan.price}
                          </span>
                          <span className="text-gray-600">/{plan.period}</span>
                        </>
                      ) : (
                        <span className="text-3xl lg:text-4xl font-bold text-gray-900">
                          Custom
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <Button 
                      className={`w-full mb-6 ${
                        isPopular 
                          ? 'bg-gradient-to-r from-blue-600 to-teal-600 hover:opacity-90' 
                          : ''
                      }`}
                      variant={isPopular ? 'default' : 'outline'}
                      onClick={() => handlePlanSelect(plan.id)}
                      aria-label={`Select ${plan.name} plan`}
                    >
                      {plan.cta}
                    </Button>
                    
                    <ul className="space-y-3" aria-label={`${plan.name} features`}>
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          <CheckCircle2 
                            className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0 mt-0.5" 
                            aria-hidden="true"
                          />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 sm:mt-12 text-center">
            <p className="text-gray-600 mb-4">All plans include a 14-day free trial. No credit card required.</p>
            <p className="text-sm text-gray-500">
              Enterprise plans include custom SLAs, dedicated support, and on-premise deployment options.
            </p>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-16 sm:py-20 lg:py-24 bg-gray-50" aria-label="Security features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700 border-green-200">
              Enterprise Security
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Built With Security First
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Enterprise-grade security measures to protect your data and ensure compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Lock, title: 'End-to-End Encryption', desc: 'All data encrypted at rest and in transit' },
              { icon: Shield, title: 'SOC-2 Compliant', desc: 'Independently audited security controls' },
              { icon: FileCheck, title: 'GDPR & HIPAA Ready', desc: 'Full compliance with global regulations' },
              { icon: Award, title: '99.9% Uptime SLA', desc: 'Enterprise-grade reliability guarantee' }
            ].map((item, idx) => (
              <Card 
                key={idx} 
                className="border-2 hover:border-green-400 hover:shadow-lg transition-all duration-300 focus-within:ring-2 focus-within:ring-green-500"
                tabIndex={0}
              >
                <CardHeader>
                  <item.icon className="h-8 w-8 sm:h-10 sm:w-10 text-green-600 mb-4" aria-hidden="true" />
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm sm:text-base">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section 
        id="contact" 
        className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-blue-600 via-teal-600 to-green-600"
        aria-label="Contact section"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Get In Touch
            </h2>
            <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto">
              Have questions? We're here to help. Reach out to discuss your assessment needs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Contact Form */}
            <Card className="border-0 shadow-2xl" aria-labelledby="contact-form-title">
              <CardHeader>
                <CardTitle id="contact-form-title">Send Us a Message</CardTitle>
                <CardDescription>We'll get back to you within 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleContactSubmit} className="space-y-4" noValidate>
                  <div>
                    <Label htmlFor="contact-name" className="required">
                      Name
                    </Label>
                    <Input 
                      id="contact-name" 
                      name="name" 
                      required 
                      placeholder="John Doe"
                      aria-describedby={formErrors.name ? "name-error" : undefined}
                      aria-invalid={!!formErrors.name}
                    />
                    {formErrors.name && (
                      <Alert variant="destructive" className="mt-2 py-1 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription>{formErrors.name}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="contact-email" className="required">
                      Email
                    </Label>
                    <Input 
                      id="contact-email" 
                      name="email" 
                      type="email" 
                      required 
                      placeholder="john@company.com"
                      aria-describedby={formErrors.email ? "email-error" : undefined}
                      aria-invalid={!!formErrors.email}
                    />
                    {formErrors.email && (
                      <Alert variant="destructive" className="mt-2 py-1 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription>{formErrors.email}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="contact-company">Company</Label>
                    <Input 
                      id="contact-company" 
                      name="company" 
                      placeholder="Your Company" 
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="contact-message" className="required">
                      Message
                    </Label>
                    <Textarea 
                      id="contact-message" 
                      name="message" 
                      required 
                      placeholder="Tell us about your needs..."
                      rows={4}
                      aria-describedby={formErrors.message ? "message-error" : undefined}
                      aria-invalid={!!formErrors.message}
                    />
                    {formErrors.message && (
                      <Alert variant="destructive" className="mt-2 py-1 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription>{formErrors.message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-600 to-teal-600"
                    disabled={isLoading.contact}
                  >
                    {isLoading.contact ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Demo Request Form */}
            <Card className="border-0 shadow-2xl" aria-labelledby="demo-form-title">
              <CardHeader>
                <CardTitle id="demo-form-title">Request Enterprise Demo</CardTitle>
                <CardDescription>See Assessly in action with a personalized demo</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDemoRequest} className="space-y-4" noValidate>
                  <div>
                    <Label htmlFor="demo-name" className="required">
                      Name
                    </Label>
                    <Input 
                      id="demo-name" 
                      name="name" 
                      required 
                      placeholder="John Doe"
                      aria-describedby={formErrors.name ? "demo-name-error" : undefined}
                      aria-invalid={!!formErrors.name}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="demo-email" className="required">
                      Work Email
                    </Label>
                    <Input 
                      id="demo-email" 
                      name="email" 
                      type="email" 
                      required 
                      placeholder="john@company.com"
                      aria-describedby={formErrors.email ? "demo-email-error" : undefined}
                      aria-invalid={!!formErrors.email}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="demo-company" className="required">
                      Company
                    </Label>
                    <Input 
                      id="demo-company" 
                      name="company" 
                      required 
                      placeholder="Your Company"
                      aria-describedby={formErrors.company ? "demo-company-error" : undefined}
                      aria-invalid={!!formErrors.company}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="demo-size">Company Size</Label>
                    <Input 
                      id="demo-size" 
                      name="size" 
                      placeholder="e.g., 50-200 employees" 
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="demo-notes">Additional Notes</Label>
                    <Textarea 
                      id="demo-notes" 
                      name="notes" 
                      placeholder="Any specific requirements?"
                      rows={2}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-teal-600 to-green-600"
                    disabled={isLoading.demo}
                  >
                    {isLoading.demo ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Request Demo'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 sm:mt-12 text-center text-white">
            <p className="mb-4 text-base sm:text-lg">Or reach us directly:</p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-6 text-sm">
              <a 
                href="mailto:info@assesslyplatform.com" 
                className="hover:underline flex items-center justify-center"
                aria-label="Email info at assesslyplatform.com"
              >
                <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                info@assesslyplatform.com
              </a>
              <a 
                href="mailto:support@assesslyplatform.com" 
                className="hover:underline flex items-center justify-center"
                aria-label="Email support at assesslyplatform.com"
              >
                <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                support@assesslyplatform.com
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
