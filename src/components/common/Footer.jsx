import React, { useState, useEffect } from 'react';
import { 
  Box,
  Typography,
  Container,
  Grid,
  Link,
  IconButton,
  Fab
} from '@mui/material';
import { 
  Email, 
  ArrowUpward as ArrowUpwardIcon, 
  Facebook, 
  Twitter, 
  LinkedIn
} from '@mui/icons-material';
import { Logo } from '../brand';
import { useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();
  const [showScroll, setShowScroll] = useState(false);
  const contactEmail = "info@assesslyplatform.com";

  const checkScrollTop = () => {
    if (!showScroll && window.pageYOffset > 400) {
      setShowScroll(true);
    } else if (showScroll && window.pageYOffset <= 400) {
      setShowScroll(false);
    }
  };

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    window.addEventListener('scroll', checkScrollTop);
    return () => {
      window.removeEventListener('scroll', checkScrollTop);
    };
  }, [showScroll]);

  return (
    <Box 
      component="footer"
      sx={{ 
        bgcolor: 'background.paper', 
        color: 'text.primary', 
        borderTop: '1px solid divider', 
        mt: 'auto' 
      }}
    >
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Grid container spacing={4}>
          {/* Column 1: Logo and Contact */}
          <Grid item xs={12} md={4}>
            <Logo size={40} withText={true} />
            <Typography variant="body2" sx={{ mt: 2, mb: 1, maxWidth: 300 }}>
              Measure Smarter, Not Harder. Enterprise-grade reliability for modern assessments.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Email fontSize="small" color="primary" />
              <Link href={`mailto:${contactEmail}`} color="text.secondary" underline="hover" variant="body2">
                {contactEmail}
              </Link>
            </Box>
          </Grid>

          {/* Column 2: Quick Links */}
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Company
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Link onClick={() => navigate('/about')} color="text.secondary" variant="body2" sx={{ cursor: 'pointer' }}>About Us</Link>
              <Link onClick={() => navigate('/features')} color="text.secondary" variant="body2" sx={{ cursor: 'pointer' }}>Features</Link>
              <Link onClick={() => navigate('/pricing')} color="text.secondary" variant="body2" sx={{ cursor: 'pointer' }}>Pricing</Link>
            </Box>
          </Grid>

          {/* Column 3: Resources */}
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Resources
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Link onClick={() => navigate('/documentation')} color="text.secondary" variant="body2" sx={{ cursor: 'pointer' }}>Docs</Link>
              <Link onClick={() => navigate('/support')} color="text.secondary" variant="body2" sx={{ cursor: 'pointer' }}>Support</Link>
              <Link onClick={() => navigate('/terms')} color="text.secondary" variant="body2" sx={{ cursor: 'pointer' }}>Terms</Link>
            </Box>
          </Grid>

          {/* Column 4: Social Media */}
          <Grid item xs={12} sm={4} md={4}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Connect
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" color="primary" aria-label="Facebook">
                <Facebook />
              </IconButton>
              <IconButton size="small" color="primary" aria-label="Twitter">
                <Twitter />
              </IconButton>
              <IconButton size="small" color="primary" aria-label="LinkedIn">
                <LinkedIn />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Container>
      
      {/* Copyright and Back to Top */}
      <Box sx={{ py: 3, bgcolor: 'divider', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          &copy; {new Date().getFullYear()} Assessly Platform. All rights reserved.
        </Typography>
      </Box>

      {/* Back to Top Button */}
      <Fab
        color="primary"
        size="small"
        aria-label="scroll back to top"
        onClick={scrollTop}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          transition: 'opacity 0.3s',
          opacity: showScroll ? 1 : 0,
          pointerEvents: showScroll ? 'auto' : 'none'
        }}
      >
        <ArrowUpwardIcon />
      </Fab>
    </Box>
  );
}
