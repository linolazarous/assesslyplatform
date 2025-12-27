// src/components/billing/BillingHistory.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Stack,
} from "@mui/material";
import {
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { fetchBillingHistory, downloadInvoice } from "../../api/subscriptionApi";
import { useSnackbar } from "notistack";

function BillingHistory({ organizationId, customerId, limit = 10 }) {
  const { enqueueSnackbar } = useSnackbar();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");

  useEffect(() => {
    loadBillingHistory();
  }, [organizationId, customerId, page, rowsPerPage, orderBy, order]);

  const loadBillingHistory = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        sortBy: orderBy,
        sortOrder: order,
        organizationId,
        customerId,
      };
      
      const data = await fetchBillingHistory(params);
      setRecords(data.data || data);
      setTotalRecords(data.pagination?.total || data.length || 0);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Failed to load billing history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId, invoiceNumber) => {
    try {
      const blob = await downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      enqueueSnackbar("Invoice downloaded successfully", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(`Failed to download invoice: ${err.message}`, { variant: "error" });
    }
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "succeeded":
        return "success";
      case "pending":
      case "processing":
        return "warning";
      case "failed":
      case "refunded":
        return "error";
      default:
        return "default";
    }
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount / 100); // Assuming amount is in cents
  };

  if (loading && records.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && records.length === 0) {
    return (
      <Alert 
        severity="error" 
        sx={{ mt: 2 }}
        action={
          <Button size="small" onClick={loadBillingHistory}>
            Retry
          </Button>
        }
      >
        Failed to load billing history: {error}
      </Alert>
    );
  }

  if (!loading && records.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No billing records found for this account.
      </Alert>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: "divider", borderRadius: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" color="primary">
          <ReceiptIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Billing History
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={loadBillingHistory} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={orderBy === "date"}
                direction={orderBy === "date" ? order : "asc"}
                onClick={() => handleRequestSort("date")}
              >
                Date
              </TableSortLabel>
            </TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Plan</TableCell>
            <TableCell align="center">Invoice</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id} hover>
              <TableCell>
                {format(new Date(record.date || record.createdAt), "MMM dd, yyyy")}
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {record.description || "Subscription Payment"}
                </Typography>
                {record.invoiceNumber && (
                  <Typography variant="caption" color="text.secondary">
                    Invoice #{record.invoiceNumber}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Chip 
                  label={record.planName || record.plan} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="center">
                {record.invoiceUrl ? (
                  <Typography variant="caption" color="primary">
                    Available
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    -
                  </Typography>
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 500 }}>
                {formatCurrency(record.amount, record.currency)}
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={record.status || "Paid"}
                  size="small"
                  color={getStatusColor(record.status)}
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="center">
                <Stack direction="row" spacing={1} justifyContent="center">
                  {record.invoiceUrl && (
                    <Tooltip title="View Invoice">
                      <IconButton
                        size="small"
                        onClick={() => window.open(record.invoiceUrl, "_blank")}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {record.id && (
                    <Tooltip title="Download PDF">
                      <IconButton
                        size="small"
                        onClick={() => handleDownloadInvoice(record.id, record.invoiceNumber)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={totalRecords}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}

BillingHistory.propTypes = {
  organizationId: PropTypes.string,
  customerId: PropTypes.string,
  limit: PropTypes.number,
};

export default React.memo(BillingHistory);
