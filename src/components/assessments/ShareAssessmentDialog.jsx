import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Button,
  Typography 
} from '@mui/material';

const ShareAssessmentDialog = ({ open, onClose, assessmentId, assessmentTitle }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Share Assessment</DialogTitle>
      <DialogContent>
        <Typography>
          Share feature for "{assessmentTitle}" coming soon...
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareAssessmentDialog;
