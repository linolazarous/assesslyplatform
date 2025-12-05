// src/pages/Contact.jsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Alert,
  useTheme,
  alpha,
  Divider,
  IconButton,
  Link as MuiLink,
} from '@mui/material';
import {
  Send,
  CheckCircle,
  Email,
  Phone,
  LocationOn,
  Business,
  Schedule,
  ArrowBack,
  Download,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../contexts/SnackbarContext';
import contactApi from '../api/contactApi';
import Confetti from 'react-confetti';

/**
 * Contact Page - Get in touch with Assessly Platform support
 * Multi-tenant aware with organization support
 */

// Success Popup Component
const SuccessPopup = ({ success, onClose }) => {
  const theme = useTheme();

  if (!success) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0, y: -50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2000,
          width: '90%',
          maxWidth: 400,
        }}
      >
        <Card
          elevation={24}
          sx={{
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.light, 0.95)} 0%, ${alpha(theme.palette.success.main, 0.1)} 100%)`,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 250 }}
            >
              <CheckCircle
                sx={{
                  fontSize: 80,
                  color: theme.palette.success.main,
                  mb: 3,
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))',
                }}
              />
            </motion.div>
            
            <Typography variant="h5" fontWeight={700} gutterBottom color="success.dark">
              Message Sent Successfully!
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Thank you for reaching out to Assessly Platform. Our team will get back to you within 24 hours.
            </Typography>
            
            <Button
              variant="contained"
              color="success"
              onClick={onClose}
              sx={{
                px: 4,
                py: 1,
                borderRadius: 2,
                fontWeight: 600,
              }}
            >
              Close
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

// Contact Form Component
const ContactForm = ({ formData, loading, errors, onChange, onSubmit, organizationId }) => {
  const theme = useTheme();

  return (
    <form onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={onChange}
            error={!!errors.name}
            helperText={errors.name}
            required
            disabled={loading}
            InputProps={{
              startAdornment: (
                <Business sx={{ mr: 1, color: theme.palette.action.active }} />
              ),
            }}
            sx={{ mb: 2 }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={onChange}
            error={!!errors.email}
            helperText={errors.email}
            required
            disabled={loading}
            InputProps={{
              startAdornment: (
                <Email sx={{ mr: 1, color: theme.palette.action.active }} />
              ),
            }}
            sx={{ mb: 2 }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Organization"
            name="organization"
            value={formData.organization}
            onChange={onChange}
            placeholder={organizationId ? 'Your organization' : 'Company name (optional)'}
            disabled={!!organizationId || loading}
            InputProps={{
              startAdornment: (
                <Business sx={{ mr: 1, color: theme.palette.action.active }} />
              ),
            }}
            sx={{ mb: 2 }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Subject"
            name="subject"
            value={formData.subject}
            onChange={onChange}
            error={!!errors.subject}
            helperText={errors.subject}
            required
            disabled={loading}
            placeholder="What would you like to discuss?"
            sx={{ mb: 2 }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Your Message"
            name="message"
            value={formData.message}
            onChange={onChange}
            error={!!errors.message}
            helperText={errors.message}
            required
            multiline
            rows={6}
            disabled={loading}
            placeholder="Please provide as much detail as possible..."
            sx={{ mb: 3 }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Send />}
            sx={{
              py: 2,
              borderRadius: 2,
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'none',
              background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              '&:hover': {
                background: `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                transform: 'translateY(-2px)',
                boxShadow: theme.shadows[8],
              },
              '&:disabled': {
                background: theme.palette.action.disabledBackground,
              },
              transition: 'all 0.3s ease',
            }}
          >
            {loading ? 'Sending Message...' : 'Send Message'}
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

// Contact Information Card
const ContactInfoCard = () => {
  const theme = useTheme();

  const contactInfo = [
    {
      icon: <Email color="primary" />,
      title: 'Email Support',
      details: 'assesslyinc@gmail.com',
      subtitle: 'For technical issues and account support',
    },
    {
      icon: <Schedule color="primary" />,
      title: 'Response Time',
      details: 'Within 24 hours',
      subtitle: 'For all support inquiries',
    },
    {
      icon: <Download color="primary" />,
      title: 'Documentation',
      details: 'docs.assessly.com',
      subtitle: 'API docs and user guides',
    },
  ];

  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.05)} 0%, transparent 100%)`,
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom color="primary" sx={{ fontWeight: 600, mb: 3 }}>
          Contact Information
        </Typography>
        
        <Grid container spacing={3}>
          {contactInfo.map((item, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.primary" fontWeight={500}>
                    {item.details}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.subtitle}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM EST
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Emergency Support:</strong> Available 24/7 for critical system issues
        </Typography>
      </CardContent>
    </Card>
  );
};

/**
 * Main Contact Page Component
 */
export default function Contact({ organizationId = null }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showSnackbar, showSuccess, showError } = useSnackbar();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    subject: '',
    message: '',
    category: 'general',
    priority: 'normal',
    organizationId,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);

  // Load user information if available
  useEffect(() => {
    const loadUserInfo = () => {
      try {
        const user = localStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          setFormData(prev => ({
            ...prev,
            name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
            email: userData.email || '',
            organization: userData.organizationName || '',
          }));
        }
      } catch (error) {
        console.error('Error loading user info:', error);
      }
    };

    loadUserInfo();
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    } else if (formData.subject.length < 5) {
      newErrors.subject = 'Subject must be at least 5 characters';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.length < 20) {
      newErrors.message = 'Please provide more details (minimum 20 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showSnackbar('Please fix the errors in the form', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await contactApi.sendContactMessage({
        ...formData,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        pageUrl: window.location.href,
      });

      if (response.success) {
        // Show success state
        setSuccess(true);
        setShowConfetti(true);
        setConfettiKey(prev => prev + 1);
        
        // Show success message
        showSuccess('Message sent successfully! We\'ll get back to you soon.');
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          organization: '',
          subject: '',
          message: '',
          category: 'general',
          priority: 'normal',
          organizationId,
        });
        
        // Auto-hide confetti after 5 seconds
        setTimeout(() => {
          setShowConfetti(false);
        }, 5000);
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      showError(error.response?.data?.message || error.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [formData, organizationId, showSnackbar, showSuccess, showError]);

  const handleCloseSuccessPopup = useCallback(() => {
    setSuccess(false);
    setShowConfetti(false);
  }, []);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Confetti effect (client-side only)
  const renderConfetti = () => {
    if (typeof window === 'undefined' || !showConfetti) return null;
    
    return (
      <Confetti
        key={confettiKey}
        recycle={false}
        numberOfPieces={200}
        gravity={0.1}
        wind={0.01}
        colors={[
          theme.palette.primary.main,
          theme.palette.secondary.main,
          theme.palette.success.main,
          theme.palette.warning.main,
          theme.palette.info.main,
        ]}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1000 }}
      />
    );
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${alpha(theme.palette.secondary.light, 0.05)} 100%)`,
        py: { xs: 4, md: 6 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Confetti Effect */}
      {renderConfetti()}
      
      {/* Success Popup */}
      <SuccessPopup success={success} onClose={handleCloseSuccessPopup} />
      
      {/* Background decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(${alpha(theme.palette.primary.light, 0.2)} 0%, transparent 70%)`,
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(${alpha(theme.palette.secondary.light, 0.15)} 0%, transparent 70%)`,
          zIndex: 0,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBack}
            sx={{ mb: 2, textTransform: 'none' }}
          >
            Back
          </Button>
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Typography variant="h3" fontWeight={800} gutterBottom color="primary">
              Contact Us
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              We're here to help you succeed with Assessly Platform
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Whether you have questions about features, need technical support, or want to discuss enterprise solutions, 
              our team is ready to assist you.
            </Typography>
          </motion.div>
        </Box>

        {/* Main Content */}
        <Grid container spacing={4}>
          {/* Contact Form */}
          <Grid item xs={12} lg={8}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card
                elevation={6}
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                  <Typography variant="h5" gutterBottom color="primary" sx={{ fontWeight: 600, mb: 4 }}>
                    Send us a Message
                  </Typography>
                  
                  {organizationId && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        This message will be associated with your organization. 
                        Our support team will have access to your organization context.
                      </Typography>
                    </Alert>
                  )}
                  
                  <ContactForm
                    formData={formData}
                    loading={loading}
                    errors={errors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    organizationId={organizationId}
                  />
                  
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, textAlign: 'center' }}>
                    By submitting this form, you agree to our{' '}
                    <MuiLink href="/privacy" color="primary">
                      Privacy Policy
                    </MuiLink>
                    . We'll never share your information with third parties.
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Contact Information */}
          <Grid item xs={12} lg={4}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <ContactInfoCard />
              
              {/* FAQ/Help Links */}
              <Card sx={{ mt: 3, borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
                    Quick Help
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Check our resources before contacting support:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <MuiLink href="/help/faq" color="primary" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                      Frequently Asked Questions
                    </MuiLink>
                    <MuiLink href="/help/documentation" color="primary" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                      Product Documentation
                    </MuiLink>
                    <MuiLink href="/help/api" color="primary" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                      API Reference
                    </MuiLink>
                    <MuiLink href="/help/troubleshooting" color="primary" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                      Troubleshooting Guide
                    </MuiLink>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* Status Messages */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Average response time: <strong>2 hours</strong> for urgent issues, <strong>24 hours</strong> for general inquiries
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

Contact.propTypes = {
  /** Organization ID for multi-tenant context */
  organizationId: PropTypes.string,
};

Contact.defaultProps = {
  organizationId: null,
};
