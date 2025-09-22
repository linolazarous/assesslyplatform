import React, { useState, useEffect } from 'react';
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
import PropTypes from 'prop-types';
import BillingHistory from '../../components/billing/BillingHistory';
import PaymentMethods from '../../components/billing/PaymentMethods';

export default function Billing({ orgId }) {
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  // New function to fetch organization data from your Vercel API
  const fetchOrgData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch(`/api/organizations/${orgId}`, {
        method: 'GET',
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgData();
  }, [orgId]);

  const handleUpgrade = async (priceId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orgId,
          priceId,
          successUrl: `${window.location.origin}/dashboard/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create checkout session');
      }

      // Redirect to the Stripe checkout page
      window.location.href = data.url;

    } catch (error) {
      console.error('Checkout error:', error);
      enqueueSnackbar(error.message, { 
        variant: 'error',
        autoHideDuration: 5000,
        anchorOrigin: { vertical: 'top', horizontal: 'right' }
      });
    } finally {
      setLoading(false);
    }
  };

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

  const isActive = orgData.subscription.status === 'active';
  const subscriptionEndDate = orgData.subscription.currentPeriodEnd ? new Date(orgData.subscription.currentPeriodEnd) : null;

  return (
    <Box sx={{ p: 3, maxWidth: '100%', overflowX: 'hidden' }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Billing & Subscription
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
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
                  {orgData.subscription.plan || 'Free Tier'}
                </Typography>
                <Chip 
                  label={orgData.subscription.status || 'inactive'} 
                  color={isActive ? 'success' : 'default'}
                  variant="outlined"
                  size="small"
                />
              </Box>

              {subscriptionEndDate && (
                <Typography variant="body2" color="text.secondary">
                  {isActive ? 'Renews' : 'Expires'} on: {subscriptionEndDate.toLocaleDateString()}
                </Typography>
              )}

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleUpgrade('price_premium')}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                  sx={{ minWidth: 180 }}
                >
                  {loading ? 'Processing...' : 'Upgrade Plan'}
                </Button>

                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => handleUpgrade('price_enterprise')}
                  disabled={loading}
                  sx={{ minWidth: 180 }}
                >
                  Contact Sales
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ mt: 3 }}>
            <BillingHistory orgId={orgId} />
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <PaymentMethods orgId={orgId} />
        </Grid>
      </Grid>
    </Box>
  );
}

Billing.propTypes = {
  orgId: PropTypes.string.isRequired
};
