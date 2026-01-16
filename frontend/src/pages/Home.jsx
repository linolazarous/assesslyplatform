import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Building2, Shield, FileEdit, BarChart3, Lock, Plug, 
  ArrowRight, CheckCircle2, TrendingUp, Users, Target,
  Zap, Globe, Clock, Award, FileCheck, Mail
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { 
  mockFeatures, 
  mockCapabilities, 
  mockAssessmentTypes, 
  mockPricingPlans
} from '../utils/mock';
import { contactAPI, demoAPI, paymentAPI } from '../services/api';
import { toast } from 'sonner';

// Stripe initialization (publishable key from .env)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const iconMap = { Building2, Shield, FileEdit, BarChart3, Lock, Plug };

const Home = () => {
  const navigate = useNavigate();
  const [videoError, setVideoError] = useState(false);
  const [metrics, setMetrics] = useState({ orgs: 0, candidates: 0, questions: 0, uptime: 0 });
  const [selectedPlan, setSelectedPlan] = useState('professional');
  const videoRef = useRef(null);

  // Animated counter for metrics
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    const targets = { orgs: 500, candidates: 85000, questions: 250000, uptime: 99.9 };
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
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, []);

  // Contact form submission
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      await contactAPI.submitContactForm(data);
      toast.success("Message sent successfully! We'll get back to you soon.");
      e.target.reset();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message. Try again later.");
    }
  };

  // Demo request submission
  const handleDemoRequest = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      await demoAPI.submitDemoRequest(data);
      toast.success("Demo request received! We'll contact you within 24 hours.");
      e.target.reset();
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit demo request.");
    }
  };

  // Plan selection
  const handlePlanSelect = async (planId) => {
    setSelectedPlan(planId);
    const plan = mockPricingPlans.find(p => p.id === planId);
    if (plan.price === null) {
      // Custom / Enterprise → scroll to contact
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    try {
      // Create payment session
      const session = await paymentAPI.createPaymentIntent(plan.price * 100); // amount in cents
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId: session.id });
      if (error) toast.error(error.message);
    } catch (err) {
      console.error(err);
      toast.error("Payment initiation failed. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {!videoError ? (
          <video
            ref={videoRef}
            autoPlay loop muted playsInline
            onError={() => setVideoError(true)}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
          </video>
        ) : (
          <div className="absolute inset-0 w-full h-full bg-cover bg-center" style={{ backgroundImage: 'url(/images/hero-fallback.webp)' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-teal-900/70 to-green-900/60 backdrop-blur-sm" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 bg-white/20 text-white border-white/30 px-6 py-2 text-sm">
            Trusted by 500+ Organizations Worldwide
          </Badge>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Measure Smarter,<br />
            <span className="bg-gradient-to-r from-teal-300 to-green-300 bg-clip-text text-transparent">Not Harder</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-200 mb-10 max-w-3xl mx-auto">
            Enterprise-grade assessment platform with multi-tenant architecture, 
            real-time analytics, and AI-powered insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold shadow-xl"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-6 text-lg font-semibold"
            >
              Request Enterprise Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
              Simple Pricing
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Plans That Scale With You
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From startups to enterprises, we have a plan that fits your needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockPricingPlans.map(plan => (
              <Card 
                key={plan.id}
                className={`relative border-2 transition-all duration-300 hover:shadow-2xl ${plan.popular ? 'border-blue-500 shadow-xl scale-105' : 'border-gray-200 hover:border-blue-300'} ${selectedPlan === plan.id ? 'ring-4 ring-blue-200' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    {plan.price !== null ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                        <span className="text-gray-600">/{plan.period}</span>
                      </>
                    ) : <span className="text-4xl font-bold text-gray-900">Custom</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    className={`w-full mb-6 ${plan.popular ? 'bg-gradient-to-r from-blue-600 to-teal-600 hover:opacity-90' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    {plan.cta}
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start text-sm">
                        <CheckCircle2 className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-gradient-to-br from-blue-600 via-teal-600 to-green-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Get In Touch
            </h2>
            <p className="text-xl text-blue-100">Have questions? We're here to help.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Form */}
            <Card className="border-0 shadow-2xl">
              <CardHeader>
                <CardTitle>Send Us a Message</CardTitle>
                <CardDescription>We'll get back to you within 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="contact-name">Name</Label>
                    <Input id="contact-name" name="name" required placeholder="John Doe" />
                  </div>
                  <div>
                    <Label htmlFor="contact-email">Email</Label>
                    <Input id="contact-email" name="email" type="email" required placeholder="john@company.com" />
                  </div>
                  <div>
                    <Label htmlFor="contact-company">Company</Label>
                    <Input id="contact-company" name="company" placeholder="Your Company" />
                  </div>
                  <div>
                    <Label htmlFor="contact-message">Message</Label>
                    <Textarea id="contact-message" name="message" required placeholder="Tell us about your needs..." rows={4} />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-teal-600">Send Message</Button>
                </form>
              </CardContent>
            </Card>

            {/* Demo Request Form */}
            <Card className="border-0 shadow-2xl">
              <CardHeader>
                <CardTitle>Request Enterprise Demo</CardTitle>
                <CardDescription>Personalized demo of Assessly</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDemoRequest} className="space-y-4">
                  <div>
                    <Label htmlFor="demo-name">Name</Label>
                    <Input id="demo-name" name="name" required placeholder="John Doe" />
                  </div>
                  <div>
                    <Label htmlFor="demo-email">Work Email</Label>
                    <Input id="demo-email" name="email" type="email" required placeholder="john@company.com" />
                  </div>
                  <div>
                    <Label htmlFor="demo-company">Company</Label>
                    <Input id="demo-company" name="company" required placeholder="Your Company" />
                  </div>
                  <div>
                    <Label htmlFor="demo-size">Company Size</Label>
                    <Input id="demo-size" name="size" placeholder="e.g., 50-200 employees" />
                  </div>
                  <div>
                    <Label htmlFor="demo-notes">Additional Notes</Label>
                    <Textarea id="demo-notes" name="notes" placeholder="Any specific requirements?" rows={2} />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-teal-600 to-green-600">Request Demo</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
