import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Box,
  Button,
  Chip,
  Alert
} from '@mui/material';
import { Description as InvoiceIcon, Download as DownloadIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import PropTypes from 'prop-types';

export default function BillingHistory({ orgId }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  const fetchBillingHistory = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      // API endpoint to fetch a list of invoices for the organization
      const response = await fetch(`/api/billing/invoices?orgId=${orgId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch billing history');
      }

      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Billing history error:', error);
      enqueueSnackbar('Failed to load billing history.', { variant: 'error' });
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, enqueueSnackbar]);

  useEffect(() => {
    fetchBillingHistory();
  }, [fetchBillingHistory]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100); // Assuming API returns amount in cents
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString(); // Assuming Stripe timestamp (seconds)
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Paper elevation={1} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom fontWeight="bold">
        Billing History
      </Typography>
      
      {invoices.length === 0 ? (
        <Alert severity="info">No billing history found for this organization.</Alert>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Invoice</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id} hover>
                  <TableCell>{formatDate(invoice.created)}</TableCell>
                  <TableCell>{formatCurrency(invoice.total)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={invoice.status.replace('_', ' ')}
                      color={invoice.status === 'paid' ? 'success' : 'warning'}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    {invoice.invoice_pdf ? (
                      <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<DownloadIcon />}
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener"
                      >
                        PDF
                      </Button>
                    ) : (
                      <Chip label="N/A" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

BillingHistory.propTypes = {
  orgId: PropTypes.string.isRequired
};
