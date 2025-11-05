import React, { useMemo, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Check as CheckIcon,
  Star as StarIcon,
  Business as BusinessIcon,
  Groups as GroupsIcon,
  Diamond as DiamondIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar.jsx';
import Footer from '../components/layout/Footer.jsx';

// Memoized Pricing Card Component
const PricingCard = React.memo(({ plan, onPlanSelect, isMobile }) => {
  const theme = useTheme();
  
  const handleClick = useCallback(() => {
    onPlanSelect(plan.name);
  }, [onPlanSelect, plan.name]);

  return (
    <Card 
      elevation={plan.popular ? 8 : 2}
      sx={{
        height: '100%',
        position: 'relative',
        border: plan.popular ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
        transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: plan.popular ? 'scale(1.08)' : 'scale(1.03)',
          boxShadow: 12
        }
      }}
    >
      {plan.popular && (
        <Chip
          label="Most Popular"
          color="primary"
          sx={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            fontWeight: 600
          }}
        />
      )}
      
      <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Plan Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {plan.icon}
          <Typography variant="h4" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>
            {plan.name}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {plan.description}
          </Typography>
          
          {/* Price */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="h2" 
              fontWeight="bold" 
              color="primary"
              sx={{ fontSize: { xs: '2.5rem', md: '3rem' } }}
            >
              {plan.price}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {plan.period}
            </Typography>
          </Box>
        </Box>

        {/* Features List */}
        <List sx={{ flexGrow: 1, mb: 3 }}>
          {plan.features.map((feature, featureIndex) => (
            <ListItem key={featureIndex} sx={{ px: 0, py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckIcon color="primary" sx={{ fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText 
                primary={feature}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ))}
        </List>

        {/* CTA Button */}
        <Button
          variant={plan.buttonVariant}
          size="large"
          fullWidth
          onClick={handleClick}
          sx={{
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 600,
            mt: 'auto'
          }}
        >
          {plan.buttonText}
        </Button>
      </CardContent>
    </Card>
  );
});

// Memoized FAQ Item Component
const FAQItem = React.memo(({ question, answer }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h6" gutterBottom>
      {question}
    </Typography>
    <Typography color="text.secondary">
      {answer}
    </Typography>
  </Box>
));

export default function Pricing() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const NAVBAR_LINKS = useMemo(() => [
    { label: 'Features', href: '/#features-section' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
    { label: 'Documentation', href: 'https://docs.assessly.com', external: true },
  ], []);

  const pricingPlans = useMemo(() => [
    {
      name: 'Basic',
      price: '$0',
      period: 'free trial - 14 days',
      description: 'Perfect for small teams and individual assessors',
      icon: <StarIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      popular: false,
      features: [
        'Up to 100 assessments per month',
        'Basic question types',
        'Standard analytics',
        'Email support',
        '1 GB storage',
        'Up to 5 team members',
        'Basic reporting',
        'Mobile responsive'
      ],
      buttonText: 'Start Free Trial',
      buttonVariant: 'outlined'
    },
    {
      name: 'Professional',
      price: '$50',
      period: 'per month',
      description: 'Ideal for growing organizations and educational institutions',
      icon: <BusinessIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      popular: true,
      features: [
        'Up to 1,000 assessments per month',
        'All question types',
        'Advanced analytics & insights',
        'Priority email & chat support',
        '10 GB storage',
        'Up to 25 team members',
        'Advanced reporting',
        'Custom branding',
        'API access',
        'Bulk candidate management'
      ],
      buttonText: 'Get Started',
      buttonVariant: 'contained'
    },
    {
      name: 'Enterprise',
      price: '$100',
      period: 'per month',
      description: 'For large organizations with advanced requirements',
      icon: <DiamondIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      popular: false,
      features: [
        'Unlimited assessments',
        'All question types + custom types',
        'AI-powered analytics & predictions',
        '24/7 phone & dedicated support',
        '100 GB storage',
        'Unlimited team members',
        'Custom reporting & dashboards',
        'White-label solution',
        'Advanced API access',
        'Single Sign-On (SSO)',
        'Custom integrations',
        'Dedicated account manager'
      ],
      buttonText: 'Contact Sales',
      buttonVariant: 'outlined'
    }
  ], []);

  const faqItems = useMemo(() => [
    {
      question: 'Can I change plans later?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.'
    },
    {
      question: 'Is there a setup fee?',
      answer: 'No, there are no setup fees for any of our plans. What you see is what you pay.'
    },
    {
      question: 'Do you offer discounts for nonprofits?',
      answer: 'Yes, we offer a 50% discount for registered nonprofit organizations.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, PayPal, and bank transfers for annual plans.'
    },
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes, you can cancel your subscription at any time with no cancellation fees.'
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes, all new users get a 14-day free trial of our Professional plan features.'
    }
  ], []);

  const handlePlanSelect = useCallback((planName) => {
    if (planName === 'Basic' || planName === 'Professional') {
      navigate('/auth?tab=signup');
    } else {
      navigate('/contact');
    }
  }, [navigate]);

  const handleStartTrial = useCallback(() => {
    navigate('/auth?tab=signup');
  }, [navigate]);

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Navigation */}
      <Navbar links={NAVBAR_LINKS} />

      {/* Hero Section */}
      <Box
        sx={{
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)'
            : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          textAlign: 'center'
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h1"
            sx={{
              fontWeight: 800,
              mb: 3,
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              lineHeight: 1.1
            }}
          >
            Simple, Transparent Pricing
          </Typography>
          <Typography
            variant="h5"
            sx={{
              opacity: 0.9,
              mb: 4,
              maxWidth: 600,
              mx: 'auto',
              fontWeight: 400
            }}
          >
            Choose the perfect plan for your assessment needs. All plans include our core features with no hidden fees.
          </Typography>
        </Container>
      </Box>

      {/* Pricing Plans */}
      <Container 
        maxWidth="lg" 
        sx={{ 
          py: { xs: 8, md: 12 },
          position: 'relative',
          top: isMobile ? 0 : -50
        }}
      >
        <Grid container spacing={4} alignItems="stretch">
          {pricingPlans.map((plan) => (
            <Grid item xs={12} md={4} key={plan.name}>
              <PricingCard 
                plan={plan}
                onPlanSelect={handlePlanSelect}
                isMobile={isMobile}
              />
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* FAQ Section */}
      <Box sx={{ py: 8, bgcolor: 'background.paper' }}>
        <Container maxWidth="md">
          <Typography variant="h3" align="center" sx={{ mb: 2, fontWeight: 700 }}>
            Frequently Asked Questions
          </Typography>
          <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6 }}>
            Everything you need to know about our pricing
          </Typography>

          <Grid container spacing={4}>
            {faqItems.slice(0, 3).map((item, index) => (
              <Grid item xs={12} md={6} key={index}>
                <FAQItem question={item.question} answer={item.answer} />
              </Grid>
            ))}
            {faqItems.slice(3).map((item, index) => (
              <Grid item xs={12} md={6} key={index + 3}>
                <FAQItem question={item.question} answer={item.answer} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Final CTA */}
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
            Ready to Get Started?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Join thousands of organizations using Assessly to transform their assessment process.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleStartTrial}
            sx={{
              px: 6,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600
            }}
          >
            Start Your Free Trial
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
}
