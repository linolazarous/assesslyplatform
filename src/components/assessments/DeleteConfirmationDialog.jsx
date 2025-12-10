import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Button,
  Typography 
} from '@mui/material';

const DeleteConfirmationDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  message 
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="error">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
