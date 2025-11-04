import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Grid
} from '@mui/material';
import { useSnackbar } from 'notistack';

// Memoized components
const BillingHistory = React.lazy(() => import('../components/billing/BillingHistory.jsx'));
const PaymentMethods = React.lazy(() => import('../components/billing/PaymentMethods.jsx'));

// Loading fallback
const ComponentLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
    <CircularProgress size={32} />
  </Box>
);

// Memoized PlanCard Component
const PlanCard = React.memo(({ 
  plan, 
  subscriptionStatus, 
  subscriptionEndDate, 
  onUpgrade, 
  loading 
}) => {
  const isActive = subscriptionStatus === 'active';
  
  return (
    <Card elevation={2} sx={{ borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Current Plan
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2 
        }}>
          <Typography variant="body1" component="span">
            {plan || 'Free Tier'}
          </Typography>
          <Chip 
            label={subscriptionStatus} 
            color={isActive ? 'success' : 'default'}
            variant="outlined"
            size="small"
            sx={{ textTransform: 'capitalize' }}
          />
        </Box>

        {subscriptionEndDate && (
          <Typography variant="body2" color="text.secondary">
            {isActive ? 'Renews' : 'Expires'} on: {subscriptionEndDate.toLocaleDateString()}
          </Typography>
        )}
        {!plan && (
          <Typography variant="body2" color="text.secondary">
            No active subscription found.
          </Typography>
        )}

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => onUpgrade('price_premium_monthly')}
            disabled={loading || isActive}
            sx={{ minWidth: 180 }}
          >
            {isActive ? 'Current Plan' : 'Upgrade to Premium'}
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => onUpgrade('price_enterprise')}
            disabled={loading}
            sx={{ minWidth: 180 }}
          >
            Contact Sales
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
});

export default function Billing({ orgId }) {
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  // Memoized handleUpgrade
  const handleUpgrade = useCallback(async (priceId) => {
    setUpgradeLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orgId,
          priceId,
          successUrl: `${window.location.origin}/organization/${orgId}/billing?success=true`,
          cancelUrl: `${window.location.origin}/organization/${orgId}/billing?canceled=true`
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;

    } catch (error) {
      console.error('Checkout error:', error);
      enqueueSnackbar(error.message || 'Failed to start checkout process.', { 
        variant: 'error',
        autoHideDuration: 5000,
      });
    } finally {
      setUpgradeLoading(false);
    }
  }, [orgId, enqueueSnackbar]);

  // Memoized fetchOrgData
  const fetchOrgData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch(`/api/organizations/${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch organization data');
      }

      const data = await response.json();
      setOrgData(data);
    } catch (err) {
      console.error('Fetch organization data error:', err);
      setError(err.message);
      enqueueSnackbar('Failed to load billing information', { 
        variant: 'error',
        autoHideDuration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [orgId, enqueueSnackbar]);

  useEffect(() => {
    fetchOrgData();
  }, [fetchOrgData]);

  // Memoized computed values
  const { subscriptionStatus, subscriptionEndDate, plan } = useMemo(() => ({
    subscriptionStatus: orgData?.subscription?.status || 'inactive',
    subscriptionEndDate: orgData?.subscription?.currentPeriodEnd ? 
      new Date(orgData.subscription.currentPeriodEnd) : null,
    plan: orgData?.subscription?.plan || null
  }), [orgData]);

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading organization data: {error}
      </Alert>
    );
  }

  if (loading || !orgData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '100%', overflowX: 'hidden' }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Billing & Subscription
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <PlanCard
            plan={plan}
            subscriptionStatus={subscriptionStatus}
            subscriptionEndDate={subscriptionEndDate}
            onUpgrade={handleUpgrade}
            loading={upgradeLoading}
          />

          <Box sx={{ mt: 3 }}>
            <React.Suspense fallback={<ComponentLoader />}>
              <BillingHistory orgId={orgId} />
            </React.Suspense>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <React.Suspense fallback={<ComponentLoader />}>
            <PaymentMethods orgId={orgId} />
          </React.Suspense>
        </Grid>
      </Grid>
    </Box>
  );
}

Billing.propTypes = {
  orgId: PropTypes.string.isRequired
};
