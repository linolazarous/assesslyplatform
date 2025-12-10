import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  ContentCopy,
  Link,
  Email,
  PersonAdd,
} from '@mui/icons-material';

const ShareAssessmentDialog = ({ open, onClose, assessmentId, assessmentTitle }) => {
  const [email, setEmail] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  
  const shareLink = `https://assessly-gedp.onrender.com/assessment/${assessmentId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleSendInvite = () => {
    if (!email.trim()) return;
    alert(`Invite sent to ${email}`);
    setEmail('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Share "{assessmentTitle}"
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Link /> Shareable Link
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              value={shareLink}
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <Link />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
            <Button
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={handleCopyLink}
              color={linkCopied ? 'success' : 'primary'}
            >
              {linkCopied ? 'Copied!' : 'Copy'}
            </Button>
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Anyone with this link can access the assessment
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Email /> Invite by Email
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Enter email addresses"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={handleSendInvite}
              disabled={!email.trim()}
            >
              Invite
            </Button>
          </Box>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Access Settings
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label="Require Sign-in" color="primary" variant="outlined" />
            <Chip label="One-time Access" color="primary" variant="outlined" />
            <Chip label="Time Limited" color="primary" variant="outlined" />
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareAssessmentDialog;
