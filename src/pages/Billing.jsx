// src/pages/Billing.jsx
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Grid,
  Container,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import {
  ArrowBack,
  Receipt,
  CreditCard,
  Refresh,
  Upgrade,
  Business,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Download,
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useSnackbar } from '../contexts/SnackbarContext';
import { billingApi } from '../api/billingApi';
import { organizationApi } from '../api/organizationApi';

// Lazy-loaded billing components
const BillingHistory = React.lazy(() => import('../components/billing/BillingHistory'));
const PaymentMethods = React.lazy(() => import('../components/billing/PaymentMethods'));
const PlanComparison = React.lazy(() => import('../components/billing/PlanComparison'));

// Small loader for suspense
const ComponentLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
    <CircularProgress />
  </Box>
);

// PlanCard Component
const PlanCard = ({ plan, subscription, onUpgrade, loading, organizationId }) => {
  const theme = useTheme();
  const { showSnackbar, showError } = useSnackbar();
  const navigate = useNavigate();

  const isActive = subscription?.status === 'active';
  const isCanceled = subscription?.status === 'canceled';
  const isPastDue = subscription?.status === 'past_due';
  const isTrialing = subscription?.status === 'trialing';

  const getStatusColor = () => {
    switch (subscription?.status) {
      case 'active': return 'success';
      case 'trialing': return 'info';
      case 'past_due': return 'warning';
      case 'canceled': return 'error';
      case 'incomplete': return 'warning';
      case 'incomplete_expired': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (subscription?.status) {
      case 'active': return <CheckCircle fontSize="small" />;
      case 'trialing': return <Warning fontSize="small" />;
      case 'past_due': return <Warning fontSize="small" />;
      case 'canceled': return <ErrorIcon fontSize="small" />;
      default: return null;
    }
  };

  const handleUpgrade = async (priceId) => {
    try {
      const response = await billingApi.createCheckoutSession({
        organizationId,
        priceId,
        successUrl: `${window.location.origin}/organizations/${organizationId}/billing?success=true`,
        cancelUrl: `${window.location.origin}/organizations/${organizationId}/billing?canceled=true`,
      });

      if (response.success) {
        window.location.href = response.data.url;
      } else {
        throw new Error(response.message || 'Failed to create checkout session');
      }
    } catch (error) {
      showError(error.message || 'Failed to start checkout process');
      console.error('Checkout error:', error);
    }
  };

  const handleContactSales = () => {
    window.open('mailto:assesslyinc@gmail.com?subject=Enterprise+Plan+Inquiry', '_blank');
  };

  const handleManageSubscription = () => {
    navigate(`/organizations/${organizationId}/billing/subscription`);
  };

  const handleDownloadInvoice = async () => {
    try {
      const response = await billingApi.downloadLatestInvoice(organizationId);
      if (response.success && response.data.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (error) {
      showError('Failed to download invoice');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount, currency = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(amount / 100); // Convert from cents
  };

  return (
    <Card 
      elevation={2}
      sx={{
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        '&:hover': {
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Current Plan
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your subscription and billing details
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={subscription?.status?.replace('_', ' ') || 'inactive'}
              color={getStatusColor()}
              icon={getStatusIcon()}
              size="small"
              sx={{ textTransform: 'capitalize' }}
            />
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Plan
              </Typography>
              <Typography variant="h5" color="primary">
                {plan?.name || 'Free Tier'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Current Period
              </Typography>
              <Typography variant="body1">
                {subscription?.currentPeriodStart ? formatDate(subscription.currentPeriodStart) : 'N/A'} -{' '}
                {subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A'}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {subscription?.amount && (
          <Box sx={{ mb: 3, p: 2, bgcolor: alpha(theme.palette.primary.light, 0.1), borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Billing Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Amount
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatCurrency(subscription.amount, subscription.currency)}
                  <Typography component="span" variant="caption" color="text.secondary">
                    {' '}/ {subscription.interval}
                  </Typography>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Next Billing
                </Typography>
                <Typography variant="body1">
                  {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {isActive && (
            <>
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                onClick={handleManageSubscription}
                startIcon={<Upgrade />}
              >
                Manage Subscription
              </Button>
              
              <Button
                variant="outlined"
                color="secondary"
                fullWidth
                onClick={handleDownloadInvoice}
                startIcon={<Download />}
                disabled={loading}
              >
                Download Latest Invoice
              </Button>
            </>
          )}

          {!isActive && (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => handleUpgrade('price_premium_monthly')}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Upgrade />}
              sx={{ py: 1.5 }}
            >
              {loading ? 'Processing...' : 'Upgrade to Premium'}
            </Button>
          )}

          <Button
            variant="outlined"
            color="inherit"
            fullWidth
            onClick={handleContactSales}
            startIcon={<Business />}
          >
            Contact Sales (Enterprise)
          </Button>
        </Box>

        {subscription?.trialEnd && isTrialing && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              Trial ends on {formatDate(subscription.trialEnd)}. Upgrade to continue using premium features.
            </Typography>
          </Alert>
        )}

        {isPastDue && (
          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="body2">
              Your payment is past due. Please update your payment method to avoid service interruption.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

PlanCard.propTypes = {
  plan: PropTypes.object,
  subscription: PropTypes.object,
  onUpgrade: PropTypes.func,
  loading: PropTypes.bool,
  organizationId: PropTypes.string.isRequired,
};

/**
 * Billing Page Component
 * Manage subscriptions, billing history, and payment methods for organizations
 */
export default function Billing({ organizationId, compact = false }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showSnackbar, showSuccess, showError } = useSnackbar();
  
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [error, setError] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [billingInfo, setBillingInfo] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [orgResponse, billingResponse] = await Promise.all([
        organizationApi.getOrganization(organizationId),
        billingApi.getBillingInfo(organizationId),
      ]);

      if (orgResponse.success) {
        setOrganization(orgResponse.data);
      } else {
        throw new Error(orgResponse.message || 'Failed to load organization');
      }

      if (billingResponse.success) {
        setBillingInfo(billingResponse.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load billing information';
      setError(errorMessage);
      showError(errorMessage);
      console.error('Load billing data error:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, showError]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    showSnackbar('Refreshing billing data...', 'info');
  };

  const handleBack = () => {
    navigate(`/organizations/${organizationId}`);
  };

  const handleUpgrade = useCallback(async (priceId) => {
    setUpgradeLoading(true);
    try {
      const response = await billingApi.createCheckoutSession({
        organizationId,
        priceId,
        successUrl: `${window.location.origin}/organizations/${organizationId}/billing?success=true&refresh=${Date.now()}`,
        cancelUrl: `${window.location.origin}/organizations/${organizationId}/billing?canceled=true`,
      });

      if (response.success) {
        window.location.href = response.data.url;
      } else {
        throw new Error(response.message || 'Failed to create checkout session');
      }
    } catch (error) {
      showError(error.message || 'Failed to start checkout process');
      console.error('Checkout error:', error);
    } finally {
      setUpgradeLoading(false);
    }
  }, [organizationId, showError]);

  // Handle URL success/cancel parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const canceled = params.get('canceled');

    if (success === 'true') {
      showSuccess('Subscription updated successfully!');
      // Remove query parameters
      navigate(window.location.pathname, { replace: true });
      // Refresh data
      setRefreshKey(prev => prev + 1);
    } else if (canceled === 'true') {
      showSnackbar('Checkout was canceled', 'info');
      navigate(window.location.pathname, { replace: true });
    }
  }, [navigate, showSuccess, showSnackbar]);

  if (loading && !organization) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !organization) {
    return (
      <Container maxWidth="lg">
        <Alert 
          severity="error" 
          sx={{ mt: 3 }}
          action={
            <Button color="inherit" size="small" onClick={loadData}>
              Retry
            </Button>
          }
        >
          <Typography variant="body1" gutterBottom>
            Failed to load billing information
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: compact ? 2 : 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink
          component={RouterLink}
          to="/organizations"
          color="inherit"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          Organizations
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={`/organizations/${organizationId}`}
          color="inherit"
        >
          {organization?.name || 'Organization'}
        </MuiLink>
        <Typography color="text.primary">Billing</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: compact ? 2 : 4,
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title="Back to organization">
            <IconButton onClick={handleBack} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              <ArrowBack />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography variant={compact ? "h5" : "h4"} color="primary" gutterBottom>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CreditCard />
                Billing & Subscription
              </Box>
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your subscription, view billing history, and update payment methods
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh billing data">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column - Plan & Billing History */}
        <Grid item xs={12} lg={8}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <PlanCard
                plan={billingInfo?.plan}
                subscription={billingInfo?.subscription}
                onUpgrade={handleUpgrade}
                loading={upgradeLoading || loading}
                organizationId={organizationId}
              />
            </Grid>

            <Grid item xs={12}>
              <Card elevation={1}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Receipt />
                    Billing History
                  </Typography>
                  <Suspense fallback={<ComponentLoader />}>
                    <BillingHistory organizationId={organizationId} />
                  </Suspense>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Right Column - Payment Methods & Plan Comparison */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={3} direction="column">
            <Grid item xs={12}>
              <Card elevation={1}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CreditCard />
                    Payment Methods
                  </Typography>
                  <Suspense fallback={<ComponentLoader />}>
                    <PaymentMethods organizationId={organizationId} />
                  </Suspense>
                </CardContent>
              </Card>
            </Grid>

            {!compact && (
              <Grid item xs={12}>
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Plan Comparison
                    </Typography>
                    <Suspense fallback={<ComponentLoader />}>
                      <PlanComparison organizationId={organizationId} currentPlan={billingInfo?.plan?.id} />
                    </Suspense>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>

      {/* Usage Information */}
      {billingInfo?.usage && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Usage Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" color="primary">
                    {billingInfo.usage.assessments || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Assessments Created
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" color="primary">
                    {billingInfo.usage.responses || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Responses
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" color="primary">
                    {billingInfo.usage.users || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active Users
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" color="primary">
                    {billingInfo.usage.storage || '0GB'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Storage Used
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Support Information */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          Need help with billing? Contact our support team at{' '}
          <MuiLink href="mailto:support@assessly.com" color="primary">
            support@assessly.com
          </MuiLink>
          {' '}or visit our{' '}
          <MuiLink component={RouterLink} to="/help/billing" color="primary">
            Billing Help Center
          </MuiLink>
        </Typography>
      </Alert>
    </Container>
  );
}

Billing.propTypes = {
  /** Organization ID for multi-tenant billing */
  organizationId: PropTypes.string.isRequired,
  /** Compact mode for dashboard widgets */
  compact: PropTypes.bool,
};

Billing.defaultProps = {
  compact: false,
};

