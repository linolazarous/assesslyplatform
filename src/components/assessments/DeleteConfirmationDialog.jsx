import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import {
  Warning,
  Delete,
  Cancel,
} from '@mui/icons-material';

const DeleteConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Confirm Delete",
  message = "Are you sure you want to delete this item?",
  confirmText = "Delete",
  cancelText = "Cancel",
  severity = "error"
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning color={severity} />
        {title}
      </DialogTitle>
      
      <DialogContent>
        <Alert severity={severity} sx={{ mb: 2 }}>
          This action cannot be undone.
        </Alert>
        
        <Typography variant="body1">
          {message}
        </Typography>
        
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Deleting this item will permanently remove it from the system.
            Any associated data will also be removed.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button
          onClick={onClose}
          startIcon={<Cancel />}
          variant="outlined"
        >
          {cancelText}
        </Button>
        <Button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          startIcon={<Delete />}
          variant="contained"
          color={severity}
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
