// src/components/layout/PricingSection.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Grid,
  Container,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  Alert,
  Stack,
  Fade,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Business as BusinessIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Storage as StorageIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  Api as ApiIcon,
  Security as SecurityIcon,
  Support as SupportIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as EmojiEventsIcon,
  CompareArrows as CompareArrowsIcon,
  Info as InfoIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const PricingSection = ({ 
  organization, 
  currentSubscription, 
  onPlanSelect,
  isAdmin = false,
  isLoading = false 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [showAnnualSavings, setShowAnnualSavings] = useState(true);

  // Define plan templates matching the backend schema
  const planTemplates = {
    free: {
      name: 'Free',
      description: 'Perfect for individuals and small teams getting started',
      price: { monthly: 0, yearly: 0 },
      color: theme.palette.primary.main,
      icon: <PersonIcon />,
      features: {
        maxUsers: 3,
        maxAssessments: 10,
        maxStorage: 100,
        maxResponses: 100,
        questionTypes: ['Multiple Choice', 'Single Choice', 'True/False', 'Short Answer'],
        analytics: 'Basic',
        support: 'Community',
        apiRateLimit: 100,
        customBranding: false,
        apiAccess: false,
        prioritySupport: false,
        ssoIntegration: false,
        whiteLabeling: false,
        proctoring: false
      },
      ctaText: 'Get Started Free',
      ctaVariant: 'outlined'
    },
    starter: {
      name: 'Starter',
      description: 'For growing teams needing more assessments and features',
      price: { monthly: 29, yearly: 290 }, // 2 months free
      color: theme.palette.success.main,
      icon: <SchoolIcon />,
      features: {
        maxUsers: 25,
        maxAssessments: 100,
        maxStorage: 1000,
        maxResponses: 1000,
        questionTypes: ['Multiple Choice', 'Single Choice', 'True/False', 'Short Answer', 'Essay'],
        analytics: 'Advanced',
        support: 'Email',
        apiRateLimit: 1000,
        customBranding: true,
        apiAccess: false,
        prioritySupport: false,
        ssoIntegration: false,
        whiteLabeling: false,
        proctoring: 'Basic'
      },
      ctaText: 'Start Trial',
      ctaVariant: 'contained',
      popular: true
    },
    professional: {
      name: 'Professional',
      description: 'For organizations requiring advanced features and integrations',
      price: { monthly: 99, yearly: 950 }, // 2 months free
      color: theme.palette.info.main,
      icon: <BusinessIcon />,
      features: {
        maxUsers: 100,
        maxAssessments: 500,
        maxStorage: 5000,
        maxResponses: 5000,
        questionTypes: ['Multiple Choice', 'Single Choice', 'True/False', 'Short Answer', 'Essay', 'Code'],
        analytics: 'Advanced',
        support: 'Priority',
        apiRateLimit: 5000,
        customBranding: true,
        apiAccess: true,
        prioritySupport: true,
        ssoIntegration: true,
        whiteLabeling: false,
        proctoring: 'Advanced'
      },
      ctaText: 'Get Started',
      ctaVariant: 'contained'
    },
    enterprise: {
      name: 'Enterprise',
      description: 'For large organizations with custom requirements and compliance needs',
      price: { monthly: 299, yearly: 2990 }, // Annual only, includes discount
      color: theme.palette.warning.main,
      icon: <EmojiEventsIcon />,
      features: {
        maxUsers: 1000,
        maxAssessments: 5000,
        maxStorage: 50000,
        maxResponses: 50000,
        questionTypes: ['All Types', '+ File Upload'],
        analytics: 'Enterprise',
        support: '24/7 Premium',
        apiRateLimit: 50000,
        customBranding: true,
        apiAccess: true,
        prioritySupport: true,
        ssoIntegration: true,
        whiteLabeling: true,
        proctoring: 'AI Monitoring',
        compliance: ['GDPR', 'HIPAA', 'SOC2'],
        security: ['MFA Enforcement', 'IP Restrictions', 'Audit Logs']
      },
      ctaText: 'Contact Sales',
      ctaVariant: 'contained',
      custom: true
    }
  };

  // Current organization's subscription info
  const currentPlan = currentSubscription?.plan || 'free';
  const isCurrentPlan = (planKey) => planKey === currentPlan;

  const handlePlanSelect = (planKey) => {
    if (!isAdmin && planKey !== 'free') {
      // Show upgrade modal or redirect
      return;
    }

    setSelectedPlan(planKey);
    
    if (onPlanSelect) {
      const selectedPlanData = planTemplates[planKey];
      onPlanSelect({
        plan: planKey,
        planName: selectedPlanData.name,
        price: {
          amount: selectedPlanData.price[billingCycle],
          currency: 'USD',
          billingPeriod: billingCycle === 'yearly' ? 'yearly' : 'monthly'
        },
        features: selectedPlanData.features
      });
    }
  };

  const renderFeatureIcon = (available, isHighlight = false) => (
    <ListItemIcon sx={{ minWidth: 36 }}>
      {available ? (
        <CheckIcon color={isHighlight ? 'primary' : 'success'} />
      ) : (
        <CloseIcon color="disabled" />
      )}
    </ListItemIcon>
  );

  const renderPlanCard = (planKey) => {
    const plan = planTemplates[planKey];
    const price = plan.price[billingCycle];
    const isCurrent = isCurrentPlan(planKey);
    const annualSavings = planKey !== 'free' && billingCycle === 'yearly' 
      ? Math.round(((plan.price.monthly * 12 - plan.price.yearly) / (plan.price.monthly * 12)) * 100)
      : 0;

    return (
      <motion.div
        whileHover={{ y: -8 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            border: isCurrent ? `2px solid ${theme.palette.primary.main}` : 
                   plan.popular ? `2px solid ${theme.palette.success.main}` : '1px solid',
            borderColor: plan.popular ? theme.palette.success.main : 'divider',
            boxShadow: plan.popular ? theme.shadows[8] : theme.shadows[1],
            position: 'relative',
            overflow: 'visible'
          }}
        >
          {/* Popular badge */}
          {plan.popular && (
            <Box
              sx={{
                position: 'absolute',
                top: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: theme.palette.success.main,
                color: 'white',
                px: 2,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.75rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <StarIcon fontSize="small" />
              Most Popular
            </Box>
          )}

          {/* Current plan badge */}
          {isCurrent && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.7rem',
                fontWeight: 'bold'
              }}
            >
              Current Plan
            </Box>
          )}

          <CardContent sx={{ flexGrow: 1, pt: plan.popular ? 4 : 2 }}>
            {/* Plan header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
              <Box sx={{ color: plan.color }}>
                {plan.icon}
              </Box>
              <Typography variant="h5" component="h3" fontWeight="bold">
                {plan.name}
              </Typography>
            </Box>

            <Typography color="text.secondary" paragraph>
              {plan.description}
            </Typography>

            {/* Price display */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography variant="h3" component="div" fontWeight="bold">
                  ${price}
                </Typography>
                <Typography color="text.secondary">
                  /{billingCycle === 'yearly' ? 'year' : 'month'}
                </Typography>
              </Box>
              
              {planKey !== 'free' && billingCycle === 'yearly' && annualSavings > 0 && (
                <Chip
                  label={`Save ${annualSavings}%`}
                  color="success"
                  size="small"
                  sx={{ mt: 1 }}
                  icon={<TrendingUpIcon />}
                />
              )}
            </Box>

            {/* Key features list */}
            <List dense sx={{ mb: 2 }}>
              <ListItem>
                {renderFeatureIcon(true, true)}
                <ListItemText 
                  primary={`${plan.features.maxUsers} users`}
                  secondary="Maximum team members"
                />
              </ListItem>
              <ListItem>
                {renderFeatureIcon(true, true)}
                <ListItemText 
                  primary={`${plan.features.maxAssessments} assessments`}
                  secondary="Active assessments"
                />
              </ListItem>
              <ListItem>
                {renderFeatureIcon(true, true)}
                <ListItemText 
                  primary={`${plan.features.maxStorage} MB storage`}
                  secondary="File and media storage"
                />
              </ListItem>
              <ListItem>
                {renderFeatureIcon(plan.features.customBranding)}
                <ListItemText 
                  primary="Custom branding"
                  secondary={plan.features.customBranding ? "Your logo and colors" : "Not included"}
                />
              </ListItem>
              <ListItem>
                {renderFeatureIcon(plan.features.apiAccess)}
                <ListItemText 
                  primary="API Access"
                  secondary={plan.features.apiAccess ? `${plan.features.apiRateLimit} calls/hour` : "Not included"}
                />
              </ListItem>
            </List>

            {/* Compliance badges for enterprise */}
            {plan.features.compliance && (
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {plan.features.compliance.map((item) => (
                  <Chip
                    key={item}
                    label={item}
                    size="small"
                    variant="outlined"
                    color="info"
                  />
                ))}
              </Box>
            )}
          </CardContent>

          <CardActions sx={{ p: 2, pt: 0 }}>
            <Button
              fullWidth
              variant={isCurrent ? 'outlined' : plan.ctaVariant}
              color={plan.popular ? 'success' : 'primary'}
              size="large"
              onClick={() => handlePlanSelect(planKey)}
              disabled={isLoading || (isCurrent && !plan.custom)}
              startIcon={isCurrent ? null : <ArrowForwardIcon />}
            >
              {isCurrent ? (plan.custom ? 'Contact for Changes' : 'Current Plan') : plan.ctaText}
            </Button>
          </CardActions>
        </Card>
      </motion.div>
    );
  };

  const renderFeatureComparison = () => {
    const features = [
      { label: 'Maximum Users', key: 'maxUsers', format: (v) => v },
      { label: 'Maximum Assessments', key: 'maxAssessments', format: (v) => v },
      { label: 'Storage Limit (MB)', key: 'maxStorage', format: (v) => v },
      { label: 'Maximum Responses', key: 'maxResponses', format: (v) => v },
      { label: 'Custom Branding', key: 'customBranding', format: (v) => v ? '✓' : '✗' },
      { label: 'API Access', key: 'apiAccess', format: (v) => v ? '✓' : '✗' },
      { label: 'Priority Support', key: 'prioritySupport', format: (v) => v ? '✓' : '✗' },
      { label: 'SSO Integration', key: 'ssoIntegration', format: (v) => v ? '✓' : '✗' },
      { label: 'White Labeling', key: 'whiteLabeling', format: (v) => v ? '✓' : '✗' },
      { label: 'Proctoring Features', key: 'proctoring', format: (v) => v || 'None' },
    ];

    return (
      <Paper elevation={2} sx={{ overflow: 'auto' }}>
        <Box sx={{ minWidth: isMobile ? 800 : 'auto' }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', position: 'sticky', left: 0, bgcolor: 'background.paper' }}>
                  Feature
                </TableCell>
                {Object.keys(planTemplates).map((planKey) => (
                  <TableCell key={planKey} align="center" sx={{ fontWeight: 'bold' }}>
                    {planTemplates[planKey].name}
                    {isCurrentPlan(planKey) && (
                      <Chip label="Current" size="small" color="primary" sx={{ ml: 1 }} />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {features.map((feature) => (
                <TableRow key={feature.key}>
                  <TableCell 
                    component="th" 
                    scope="row"
                    sx={{ 
                      fontWeight: 'medium',
                      position: 'sticky',
                      left: 0,
                      bgcolor: 'background.paper'
                    }}
                  >
                    {feature.label}
                  </TableCell>
                  {Object.keys(planTemplates).map((planKey) => (
                    <TableCell key={planKey} align="center">
                      <Typography variant="body2">
                        {feature.format(planTemplates[planKey].features[feature.key])}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
          Choose the Right Plan for Your Organization
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Scale from individual assessments to enterprise-wide evaluation platforms
        </Typography>
        
        {/* Billing toggle */}
        <Paper
          elevation={0}
          sx={{
            display: 'inline-flex',
            p: 0.5,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.default'
          }}
        >
          <Button
            variant={billingCycle === 'monthly' ? 'contained' : 'text'}
            onClick={() => setBillingCycle('monthly')}
            sx={{ borderRadius: 1 }}
          >
            Monthly Billing
          </Button>
          <Button
            variant={billingCycle === 'yearly' ? 'contained' : 'text'}
            onClick={() => setBillingCycle('yearly')}
            sx={{ borderRadius: 1 }}
          >
            Yearly Billing
            {showAnnualSavings && (
              <Chip
                label="Save up to 20%"
                size="small"
                color="success"
                sx={{ ml: 1, height: 20 }}
              />
            )}
          </Button>
        </Paper>

        {/* Comparison mode toggle */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={comparisonMode}
                onChange={(e) => setComparisonMode(e.target.checked)}
                color="primary"
              />
            }
            label="Detailed Feature Comparison"
          />
          <Tooltip title="Compare all features side by side">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Current subscription info */}
      {currentSubscription && (
        <Fade in>
          <Alert 
            severity="info" 
            sx={{ mb: 4 }}
            action={
              <Button 
                color="inherit" 
                size="small"
                onClick={() => {/* Navigate to subscription management */}}
              >
                Manage Subscription
              </Button>
            }
          >
            <Typography variant="body2">
              Your organization is currently on the{' '}
              <strong>{currentSubscription.planName}</strong> plan.
              {currentSubscription.daysRemaining && (
                <> Renewal in <strong>{currentSubscription.daysRemaining} days</strong>.</>
              )}
            </Typography>
          </Alert>
        </Fade>
      )}

      {/* Plan cards or comparison table */}
      {comparisonMode ? (
        renderFeatureComparison()
      ) : (
        <Grid container spacing={3} alignItems="stretch">
          {Object.keys(planTemplates).map((planKey) => (
            <Grid item xs={12} sm={6} md={3} key={planKey}>
              {renderPlanCard(planKey)}
            </Grid>
          ))}
        </Grid>
      )}

      {/* FAQ/Additional Info */}
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Frequently Asked Questions
        </Typography>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                <SupportIcon color="primary" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Support
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All paid plans include email support. Professional and Enterprise plans get priority support with faster response times.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                <CompareArrowsIcon color="primary" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Plan Changes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You can upgrade or downgrade your plan at any time. Changes take effect immediately with prorated billing.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                <SecurityIcon color="primary" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Security & Compliance
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enterprise plan includes GDPR, HIPAA, and SOC2 compliance. All data is encrypted at rest and in transit.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Call to action */}
      <Box sx={{ textAlign: 'center', mt: 6 }}>
        <Typography variant="body1" color="text.secondary" paragraph>
          Need a custom plan or have specific requirements?
        </Typography>
        <Button
          variant="outlined"
          size="large"
          href="/contact"
          endIcon={<ArrowForwardIcon />}
        >
          Contact Sales for Custom Solutions
        </Button>
      </Box>
    </Container>
  );
};

// Import Table components if comparison mode is used
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';

export default PricingSection;
