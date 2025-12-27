// src/components/billing/PaymentMethods.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
  Stack,
} from "@mui/material";
import {
  CreditCard as CreditCardIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { fetchPaymentMethods, deletePaymentMethod, setDefaultPaymentMethod } from "../../api/subscriptionApi";
import { useSnackbar } from "notistack";
import AddPaymentMethodDialog from "./AddPaymentMethodDialog";

function PaymentMethods({ customerId, organizationId, canEdit = true }) {
  const { enqueueSnackbar } = useSnackbar();
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(null);

  useEffect(() => {
    if (customerId) {
      loadPaymentMethods();
    } else {
      setLoading(false);
    }
  }, [customerId, organizationId]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const data = await fetchPaymentMethods(customerId, organizationId);
      setMethods(data.data || data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Failed to load payment methods:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paymentMethodId) => {
    try {
      await deletePaymentMethod(paymentMethodId);
      setMethods(methods.filter(m => m.id !== paymentMethodId));
      enqueueSnackbar("Payment method deleted", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(`Failed to delete payment method: ${err.message}`, { variant: "error" });
    } finally {
      setOpenDeleteDialog(null);
    }
  };

  const handleSetDefault = async (paymentMethodId) => {
    try {
      await setDefaultPaymentMethod(paymentMethodId);
      setMethods(methods.map(method => ({
        ...method,
        isDefault: method.id === paymentMethodId,
      })));
      enqueueSnackbar("Default payment method updated", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(`Failed to update default payment method: ${err.message}`, { variant: "error" });
    }
  };

  const handleAddMethod = (newMethod) => {
    setMethods([...methods, newMethod]);
    enqueueSnackbar("Payment method added", { variant: "success" });
  };

  const getCardIcon = (brand) => {
    switch (brand?.toLowerCase()) {
      case "visa":
        return "💳"; // Or use an actual icon library
      case "mastercard":
        return "💳";
      case "amex":
        return "💳";
      case "discover":
        return "💳";
      default:
        return <CreditCardIcon />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && methods.length === 0) {
    return (
      <Alert 
        severity="error" 
        sx={{ mt: 2 }}
        action={
          <Button size="small" onClick={loadPaymentMethods}>
            Retry
          </Button>
        }
      >
        Failed to load payment methods: {error}
      </Alert>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: "divider", borderRadius: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" color="primary">
          <CreditCardIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Payment Methods
        </Typography>
        {canEdit && customerId && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setOpenAddDialog(true)}
          >
            Add Payment Method
          </Button>
        )}
      </Box>

      {methods.length === 0 ? (
        <Alert severity="info">
          {customerId 
            ? "No payment methods saved. Add one to get started."
            : "No customer account found. Subscribe to a plan first."}
        </Alert>
      ) : (
        <List>
          {methods.map((method) => (
            <ListItem
              key={method.id}
              divider
              sx={{
                borderRadius: 1,
                mb: 1,
                bgcolor: method.isDefault ? "action.selected" : "transparent",
                border: method.isDefault ? 1 : 0,
                borderColor: "primary.main",
              }}
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="h6">
                      {getCardIcon(method.brand)}
                    </Typography>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {method.brand?.toUpperCase() || "Card"} •••• {method.last4}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Expires {method.exp_month}/{method.exp_year}
                      </Typography>
                    </Box>
                  </Stack>
                }
                secondary={
                  method.isDefault && (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Default"
                      size="small"
                      color="success"
                      sx={{ mt: 1 }}
                    />
                  )
                }
              />
              {canEdit && (
                <ListItemSecondaryAction>
                  <Stack direction="row" spacing={1}>
                    {!method.isDefault && (
                      <Tooltip title="Set as default">
                        <IconButton
                          size="small"
                          onClick={() => handleSetDefault(method.id)}
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => setOpenDeleteDialog(method.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          ))}
        </List>
      )}

      <AddPaymentMethodDialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        customerId={customerId}
        organizationId={organizationId}
        onSuccess={handleAddMethod}
      />

      <Dialog open={!!openDeleteDialog} onClose={() => setOpenDeleteDialog(null)}>
        <DialogTitle>Delete Payment Method</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this payment method? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(null)}>Cancel</Button>
          <Button
            onClick={() => handleDelete(openDeleteDialog)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

PaymentMethods.propTypes = {
  customerId: PropTypes.string,
  organizationId: PropTypes.string,
  canEdit: PropTypes.bool,
};

PaymentMethods.defaultProps = {
  canEdit: true,
};

export default React.memo(PaymentMethods);
