// src/pages/Pricing.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  useMediaQuery,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Star as StarIcon,
  Business as BusinessIcon,
  Groups as GroupsIcon,
  Diamond as DiamondIcon,
  Refresh,
  HelpOutline,
  Download,
  ArrowBack,
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useSnackbar } from '../contexts/SnackbarContext';
import { pricingApi } from '../api/pricingApi';
import { authApi } from '../api/authApi';

/**
 * Pricing Page Component
 * Displays plans, pricing, and features with organization context
 */

// Plan Comparison Table Component
const PlanComparisonTable = ({ plans, billingCycle, organizationId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const features = [
    { name: 'Assessments per Month', key: 'assessmentsLimit' },
    { name: 'Question Types', key: 'questionTypes' },
    { name: 'Advanced Analytics', key: 'analytics' },
    { name: 'Storage', key: 'storage' },
    { name: 'Team Members', key: 'teamMembers' },
    { name: 'API Access', key: 'apiAccess' },
    { name: 'Custom Branding', key: 'customBranding' },
    { name: 'Priority Support', key: 'prioritySupport' },
    { name: 'SSO Integration', key: 'ssoIntegration' },
    { name: 'Dedicated Manager', key: 'dedicatedManager' },
    { name: 'Custom Integrations', key: 'customIntegrations' },
    { name: 'SLA Guarantee', key: 'sla' },
  ];

  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {plans.map((plan) => (
          <Card key={plan.id} elevation={2} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                {plan.name}
              </Typography>
              {features.slice(0, 6).map((feature) => (
                <Box key={feature.key} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="body2">{feature.name}</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {plan.features[feature.key] || '—'}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: theme.palette.action.hover }}>
            <TableCell sx={{ fontWeight: 600 }}>Features</TableCell>
            {plans.map((plan) => (
              <TableCell key={plan.id} align="center" sx={{ fontWeight: 600 }}>
                {plan.name}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {features.map((feature) => (
            <TableRow key={feature.key} hover>
              <TableCell component="th" scope="row" sx={{ borderRight: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="body2" fontWeight={500}>
                  {feature.name}
                </Typography>
              </TableCell>
              {plans.map((plan) => (
                <TableCell key={`${plan.id}-${feature.key}`} align="center">
                  {typeof plan.features[feature.key] === 'boolean' ? (
                    plan.features[feature.key] ? (
                      <CheckIcon color="success" fontSize="small" />
                    ) : (
                      <CloseIcon color="disabled" fontSize="small" />
                    )
                  ) : (
                    <Typography variant="body2">
                      {plan.features[feature.key] || '—'}
                    </Typography>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Pricing Card Component
const PricingCard = React.memo(({ 
  plan, 
  billingCycle, 
  isPopular, 
  currentPlanId, 
  organizationId, 
  onPlanSelect, 
  isLoading 
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showSnackbar, showError } = useSnackbar();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  const period = billingCycle === 'annual' ? '/year' : '/month';
  const savings = billingCycle === 'annual' ? plan.annualSavings : null;

  const isCurrentPlan = currentPlanId === plan.id;
  const isUpgrade = currentPlanId && plan.level > plans.find(p => p.id === currentPlanId)?.level;
  const isDowngrade = currentPlanId && plan.level < plans.find(p => p.id === currentPlanId)?.level;

  const getPlanIcon = () => {
    switch (plan.id) {
      case 'basic': return <StarIcon sx={{ fontSize: 32, color: 'primary.main' }} />;
      case 'professional': return <BusinessIcon sx={{ fontSize: 32, color: 'secondary.main' }} />;
      case 'enterprise': return <DiamondIcon sx={{ fontSize: 32, color: 'warning.main' }} />;
      default: return <GroupsIcon sx={{ fontSize: 32, color: 'primary.main' }} />;
    }
  };

  const handleSelectPlan = useCallback(async () => {
    if (plan.id === 'enterprise') {
      navigate('/contact?subject=Enterprise%20Plan%20Inquiry');
      return;
    }

    if (isCurrentPlan) {
      showSnackbar(`You're already on the ${plan.name} plan`, 'info');
      return;
    }

    try {
      if (!organizationId) {
        // Redirect to signup for new users
        navigate(`/auth?mode=signup&plan=${plan.id}&billing=${billingCycle}`);
        return;
      }

      // For existing organizations, create checkout session
      const response = await pricingApi.createCheckoutSession({
        organizationId,
        priceId: billingCycle === 'annual' ? plan.annualPriceId : plan.monthlyPriceId,
        successUrl: `${window.location.origin}/organizations/${organizationId}/billing?success=true`,
        cancelUrl: `${window.location.origin}/organizations/${organizationId}/billing?canceled=true`,
      });

      if (response.success) {
        window.location.href = response.data.url;
      } else {
        throw new Error(response.message || 'Failed to create checkout session');
      }
    } catch (error) {
      showError(error.message || 'Failed to process plan selection');
      console.error('Plan selection error:', error);
    }
  }, [plan, billingCycle, organizationId, isCurrentPlan, navigate, showSnackbar, showError]);

  const getButtonText = () => {
    if (isCurrentPlan) return 'Current Plan';
    if (!organizationId) return 'Get Started';
    if (isUpgrade) return 'Upgrade Now';
    if (isDowngrade) return 'Downgrade';
    return 'Select Plan';
  };

  return (
    <Card
      elevation={isPopular ? 8 : 2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        border: isPopular ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
        transform: isPopular ? 'translateY(-8px)' : 'none',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: isPopular ? 'translateY(-12px)' : 'translateY(-4px)',
          boxShadow: theme.shadows[12],
        },
      }}
    >
      {isPopular && (
        <Chip
          label="Most Popular"
          color="primary"
          size="small"
          sx={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            fontWeight: 600,
            boxShadow: theme.shadows[2],
          }}
        />
      )}

      {savings && billingCycle === 'annual' && (
        <Chip
          label={`Save ${savings}%`}
          color="success"
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            fontWeight: 600,
          }}
        />
      )}

      <CardContent sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Plan Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            {getPlanIcon()}
          </Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            {plan.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 48 }}>
            {plan.description}
          </Typography>

          {/* Price */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h2"
              fontWeight="bold"
              color="primary"
              sx={{
                fontSize: { xs: '2.5rem', md: '3rem' },
                lineHeight: 1,
              }}
            >
              {price}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {period}
              {billingCycle === 'annual' && (
                <Typography component="span" variant="caption" color="success.main" sx={{ ml: 1 }}>
                  (billed annually)
                </Typography>
              )}
            </Typography>
          </Box>
        </Box>

        {/* Features List */}
        <List sx={{ flexGrow: 1, mb: 3 }}>
          {plan.featuresList?.slice(0, 8).map((feature, index) => (
            <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
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
          variant={isCurrentPlan ? 'outlined' : isPopular ? 'contained' : 'outlined'}
          color={isCurrentPlan ? 'inherit' : 'primary'}
          size="large"
          fullWidth
          onClick={handleSelectPlan}
          disabled={isLoading || isCurrentPlan}
          sx={{
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            mt: 'auto',
            position: 'relative',
          }}
        >
          {isLoading ? (
            <CircularProgress size={24} sx={{ color: 'inherit' }} />
          ) : (
            getButtonText()
          )}
        </Button>

        {isCurrentPlan && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
            Your current subscription
          </Typography>
        )}
      </CardContent>
    </Card>
  );
});

PricingCard.displayName = 'PricingCard';

// FAQ Item Component
const FAQItem = React.memo(({ question, answer, isOpen, onClick }) => (
  <Card 
    elevation={0} 
    sx={{ 
      mb: 2, 
      border: `1px solid ${theme => theme.palette.divider}`,
      '&:hover': {
        borderColor: theme => theme.palette.primary.main,
      },
      transition: 'border-color 0.2s ease',
    }}
  >
    <Button
      fullWidth
      onClick={onClick}
      sx={{
        p: 3,
        textAlign: 'left',
        justifyContent: 'space-between',
        textTransform: 'none',
        color: 'text.primary',
        '&:hover': {
          backgroundColor: 'transparent',
        },
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mr: 2 }}>
        {question}
      </Typography>
      <Typography variant="h6" color="primary">
        {isOpen ? '−' : '+'}
      </Typography>
    </Button>
    {isOpen && (
      <Box sx={{ px: 3, pb: 3 }}>
        <Divider sx={{ mb: 2 }} />
        <Typography color="text.secondary">
          {answer}
        </Typography>
      </Box>
    )}
  </Card>
));

FAQItem.displayName = 'FAQItem';

/**
 * Main Pricing Page Component
 */
export default function Pricing({ organizationId = null }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSnackbar, showSuccess, showError } = useSnackbar();

  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openFAQ, setOpenFAQ] = useState(null);
  const [user, setUser] = useState(null);

  // Load pricing data and user info
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [plansResponse, userResponse] = await Promise.all([
          pricingApi.getPlans(),
          authApi.getProfile().catch(() => ({ success: false, data: null })),
        ]);

        if (plansResponse.success) {
          setPlans(plansResponse.data.plans);
        } else {
          throw new Error(plansResponse.message || 'Failed to load pricing plans');
        }

        if (userResponse.success) {
          setUser(userResponse.data);
        }

        if (organizationId) {
          const subscriptionResponse = await pricingApi.getOrganizationSubscription(organizationId);
          if (subscriptionResponse.success) {
            setCurrentPlan(subscriptionResponse.data.planId);
          }
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load pricing information';
        setError(errorMessage);
        showError(errorMessage);
        console.error('Load pricing data error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId, showError]);

  const handleBillingCycleChange = useCallback((event, newCycle) => {
    if (newCycle !== null) {
      setBillingCycle(newCycle);
    }
  }, []);

  const handleFAQToggle = useCallback((index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  }, [openFAQ]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleExportComparison = useCallback(async () => {
    try {
      const response = await pricingApi.exportPlanComparison(billingCycle);
      if (response.success && response.data.url) {
        window.open(response.data.url, '_blank');
        showSuccess('Plan comparison exported successfully');
      }
    } catch (error) {
      showError('Failed to export plan comparison');
    }
  }, [billingCycle, showSuccess, showError]);

  const faqItems = useMemo(() => [
    {
      question: 'Can I change plans at any time?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Upgrades take effect immediately, while downgrades take effect at the end of your current billing cycle.'
    },
    {
      question: 'Is there a free trial available?',
      answer: 'Yes! All new users get a 14-day free trial of our Professional plan with full access to all features. No credit card required.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for annual plans. All payments are processed securely through Stripe.'
    },
    {
      question: 'Do you offer discounts for educational institutions or nonprofits?',
      answer: 'Yes, we offer special pricing for educational institutions, nonprofits, and startups. Please contact our sales team for more information.'
    },
    {
      question: 'Can I cancel my subscription?',
      answer: 'Yes, you can cancel your subscription at any time. If you cancel, you\'ll continue to have access to your plan until the end of your current billing period.'
    },
    {
      question: 'What happens if I exceed my plan limits?',
      answer: 'If you exceed your plan limits, we\'ll notify you and give you the option to upgrade. Your service will continue uninterrupted during this period.'
    },
  ], []);

  const popularPlanId = useMemo(() => {
    return plans.find(plan => plan.popular)?.id || 'professional';
  }, [plans]);

  if (loading && plans.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && plans.length === 0) {
    return (
      <Container maxWidth="lg">
        <Alert 
          severity="error" 
          sx={{ mt: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        >
          <Typography variant="body1" gutterBottom>
            Failed to load pricing information
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        pt: isMobile ? 2 : 4,
        pb: 8,
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: isMobile ? 4 : 6 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBack}
            sx={{ mb: 2, textTransform: 'none' }}
          >
            Back
          </Button>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h3" fontWeight={800} gutterBottom color="primary">
                Pricing Plans
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600 }}>
                Choose the perfect plan for your organization. All plans include our core features with transparent pricing.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Tooltip title="Export plan comparison">
                <IconButton onClick={handleExportComparison} disabled={loading}>
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {user && organizationId && (
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                You're viewing pricing for <strong>{user.organizationName || 'your organization'}</strong>. 
                {' '}
                <Button 
                  component={RouterLink} 
                  to={`/organizations/${organizationId}/billing`}
                  size="small" 
                  sx={{ ml: 1 }}
                >
                  View Current Subscription
                </Button>
              </Typography>
            </Alert>
          )}
        </Box>

        {/* Billing Cycle Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 6 }}>
          <ToggleButtonGroup
            value={billingCycle}
            exclusive
            onChange={handleBillingCycleChange}
            aria-label="billing cycle"
            size={isMobile ? 'small' : 'medium'}
          >
            <ToggleButton value="monthly" sx={{ px: 4 }}>
              Monthly Billing
            </ToggleButton>
            <ToggleButton value="annual" sx={{ px: 4 }}>
              Annual Billing (Save up to 20%)
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Pricing Cards */}
        <Grid container spacing={3} justifyContent="center" sx={{ mb: 8 }}>
          {plans.map((plan) => (
            <Grid item xs={12} md={4} key={plan.id}>
              <PricingCard
                plan={plan}
                billingCycle={billingCycle}
                isPopular={plan.id === popularPlanId}
                currentPlanId={currentPlan}
                organizationId={organizationId}
                onPlanSelect={() => {}}
                isLoading={loading}
              />
            </Grid>
          ))}
        </Grid>

        {/* Plan Comparison Table */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
            Feature Comparison
          </Typography>
          <PlanComparisonTable 
            plans={plans} 
            billingCycle={billingCycle} 
            organizationId={organizationId}
          />
        </Box>

        {/* FAQ Section */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
            Frequently Asked Questions
          </Typography>
          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {faqItems.map((item, index) => (
              <FAQItem
                key={index}
                question={item.question}
                answer={item.answer}
                isOpen={openFAQ === index}
                onClick={() => handleFAQToggle(index)}
              />
            ))}
          </Box>
        </Box>

        {/* Final CTA */}
        <Card
          elevation={8}
          sx={{
            p: { xs: 4, md: 6 },
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Ready to Get Started?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            Join thousands of organizations using Assessly Platform to transform their assessment process.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/auth?mode=signup')}
              sx={{
                px: 6,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
              }}
            >
              Start Free Trial
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/contact')}
              sx={{
                px: 6,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
              }}
            >
              Schedule Demo
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
            Need help choosing a plan?{' '}
            <Button 
              component={RouterLink} 
              to="/contact" 
              size="small" 
              sx={{ textTransform: 'none' }}
            >
              Contact our sales team
            </Button>
          </Typography>
        </Card>

        {/* Additional Information */}
        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            All prices are in USD. Additional taxes may apply.
            {' '}
            <Button 
              component={RouterLink} 
              to="/terms" 
              size="small" 
              sx={{ textTransform: 'none' }}
            >
              View Terms of Service
            </Button>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

Pricing.propTypes = {
  /** Organization ID for multi-tenant context */
  organizationId: PropTypes.string,
};

Pricing.defaultProps = {
  organizationId: null,
};
