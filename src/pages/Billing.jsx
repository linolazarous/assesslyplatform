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
      showError(error.message || 'Failed
