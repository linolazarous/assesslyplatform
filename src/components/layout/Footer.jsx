// src/components/layout/Footer.jsx
import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { 
  Box, 
  Typography, 
  Container, 
  Grid, 
  Link, 
  Divider, 
  IconButton, 
  Stack,
  Chip,
  useTheme,
  alpha,
  Collapse,
  Alert,
  Button,
  TextField,
} from "@mui/material";
import {
  Email,
  Phone,
  LocationOn,
  Business,
  Security,
  Cloud,
  Support,
  AdminPanelSettings,
  ExpandMore,
  ExpandLess,
  LinkedIn,
  Twitter,
  GitHub,
  ArrowForward,
  CheckCircle,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Logo from "../brand/Logo";
import Wordmark from "../brand/Wordmark";

const Footer = React.memo(function Footer({ showSuperAdminInfo }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [expandedSection, setExpandedSection] = useState(null);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const platformLinks = [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Use Cases", href: "/use-cases" },
    { label: "Customer Stories", href: "/testimonials" },
    { label: "API Documentation", href: "/api-docs" },
    { label: "Status", href: "/status" },
  ];

  const resourceLinks = [
    { label: "Documentation", href: "/docs" },
    { label: "Help Center", href: "/help" },
    { label: "Blog", href: "/blog" },
    { label: "Community", href: "/community" },
    { label: "Partners", href: "/partners" },
    { label: "Webinars", href: "/webinars" },
  ];

  const legalLinks = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "GDPR", href: "/gdpr" },
    { label: "CCPA", href: "/ccpa" },
    { label: "Security", href: "/security" },
  ];

  const companyLinks = [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
    { label: "Press", href: "/press" },
    { label: "Brand", href: "/brand" },
    { label: "Sitemap", href: "/sitemap" },
  ];

  const platformStats = [
    { value: "99.9%", label: "Uptime", icon: <Cloud fontSize="small" /> },
    { value: "500+", label: "Organizations", icon: <Business fontSize="small" /> },
    { value: "1M+", label: "Assessments", icon: <CheckCircle fontSize="small" /> },
    { value: "SOC 2", label: "Compliant", icon: <Security fontSize="small" /> },
  ];

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      // await subscribeToNewsletter(email);
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 5000);
    } catch (error) {
      console.error("Subscription failed:", error);
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderLinkColumn = (title, links) => (
    <Box>
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: 'text.primary' }}>
        {title}
      </Typography>
      <Stack spacing={1}>
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            color="text.secondary"
            sx={{
              textDecoration: 'none',
              fontSize: '0.875rem',
              '&:hover': { color: 'primary.main', textDecoration: 'underline' },
            }}
          >
            {link.label}
          </Link>
        ))}
      </Stack>
    </Box>
  );

  const renderMobileSection = (title, links, sectionKey) => (
    <Box sx={{ mb: 2 }}>
      <Button
        fullWidth
        onClick={() => toggleSection(sectionKey)}
        sx={{ justifyContent: 'space-between', color: 'text.primary', textTransform: 'none', py: 1 }}
        endIcon={expandedSection === sectionKey ? <ExpandLess /> : <ExpandMore />}
      >
        <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
      </Button>
      <Collapse in={expandedSection === sectionKey}>
        <Stack spacing={1} sx={{ pl: 2, pt: 1 }}>
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              color="text.secondary"
              sx={{
                textDecoration: 'none',
                fontSize: '0.875rem',
                py: 0.5,
                display: 'block',
                '&:hover': { color: 'primary.main', textDecoration: 'underline' },
              }}
            >
              {link.label}
            </Link>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );

  return (
    <Box component="footer" sx={{ bgcolor: 'background.paper', borderTop: `1px solid ${theme.palette.divider}`, pt: 6, pb: 3, mt: 'auto' }}>
      {/* Platform Stats */}
      <Container maxWidth="xl" sx={{ mb: 6 }}>
        <Grid container spacing={3} justifyContent="center">
          {platformStats.map((stat, index) => (
            <Grid item xs={6} sm={3} key={index}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main', mb: 1 }}>
                  {stat.icon}
                </Box>
                <Typography variant="h5" fontWeight="bold" color="primary.main">{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Divider sx={{ mb: 6 }} />

      <Container maxWidth="xl">
        <Grid container spacing={4}>
          {/* Brand & Description */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Logo size={40} />
                <Wordmark variant="h6" />
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                A modern, enterprise-ready multitenant assessment platform 
                that enables organizations to create, deliver, and analyze 
                assessments with powerful analytics and seamless user experiences.
              </Typography>

              {showSuperAdminInfo && isSuperAdmin && (
                <Alert severity="info" icon={<AdminPanelSettings />} sx={{ mb: 3, '& .MuiAlert-message': { fontSize: '0.875rem' } }}>
                  <Typography variant="body2">
                    <strong>Super Admin View:</strong> You manage all organizations and subscriptions centrally.
                  </Typography>
                </Alert>
              )}

              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <IconButton size="small" href="https://twitter.com/assessly" target="_blank" sx={{ color: 'text.secondary', '&:hover': { color: '#1DA1F2' } }}><Twitter /></IconButton>
                <IconButton size="small" href="https://linkedin.com/company/assessly" target="_blank" sx={{ color: 'text.secondary', '&:hover': { color: '#0077B5' } }}><LinkedIn /></IconButton>
                <IconButton size="small" href="https://github.com/assessly" target="_blank" sx={{ color: 'text.secondary', '&:hover': { color: '#333' } }}><GitHub /></IconButton>
              </Stack>
            </Box>
          </Grid>

          {/* Desktop Links */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={4}>
              <Grid item xs={6} sm={3} sx={{ display: { xs: 'none', md: 'block' } }}>{renderLinkColumn("Platform", platformLinks)}</Grid>
              <Grid item xs={6} sm={3} sx={{ display: { xs: 'none', md: 'block' } }}>{renderLinkColumn("Resources", resourceLinks)}</Grid>
              <Grid item xs={6} sm={3} sx={{ display: { xs: 'none', md: 'block' } }}>{renderLinkColumn("Legal", legalLinks)}</Grid>
              <Grid item xs={6} sm={3} sx={{ display: { xs: 'none', md: 'block' } }}>{renderLinkColumn("Company", companyLinks)}</Grid>
            </Grid>

            {/* Mobile Links */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              {renderMobileSection("Platform", platformLinks, "platform")}
              {renderMobileSection("Resources", resourceLinks, "resources")}
              {renderMobileSection("Legal", legalLinks, "legal")}
              {renderMobileSection("Company", companyLinks, "company")}
            </Box>
          </Grid>
        </Grid>

        {/* Newsletter Subscription */}
        <Box sx={{ mt: 6, p: 4, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
          <Grid container alignItems="center" spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Stay Updated</Typography>
              <Typography variant="body2" color="text.secondary">
                Subscribe to our newsletter for platform updates, new features, and assessment best practices.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <form onSubmit={handleSubscribe}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    size="small"
                    type="email"
                    placeholder="Your work email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
                  />
                  <Button type="submit" variant="contained" endIcon={<ArrowForward />} disabled={subscribed}>
                    {subscribed ? 'Subscribed!' : 'Subscribe'}
                  </Button>
                </Stack>
                {subscribed && <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>🎉 Thanks for subscribing! Check your email for confirmation.</Typography>}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  By subscribing, you agree to our Privacy Policy and consent to receive updates.
                </Typography>
              </form>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Bottom Footer */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">&copy; {currentYear} Assessly Platform. All rights reserved.</Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Chip label="SOC 2 Compliant" size="small" icon={<Security />} variant="outlined" />
              <Chip label="GDPR Ready" size="small" icon={<Security />} variant="outlined" />
              <Chip label="HIPAA Compliant" size="small" icon={<Security />} variant="outlined" />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, gap: 2, alignItems: 'center' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Email fontSize="small" /><Typography variant="caption" color="text.secondary">assesslyinc@gmail.com</Typography></Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Support fontSize="small" /><Typography variant="caption" color="text.secondary">24/7 Support</Typography></Box>
              </Stack>
              {/* FIXED LINE: Changed process.env.REACT_APP_VERSION to import.meta.env.VITE_APP_VERSION */}
              <Typography variant="caption" color="text.secondary">v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</Typography>
            </Box>
          </Grid>
        </Grid>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block', fontSize: '0.75rem', lineHeight: 1.5 }}>
          Assessly is a registered trademark. All other trademarks are property of their respective owners.
          The platform is provided "as is" without warranty of any kind. Use of this platform is subject to our Terms of Service.
          For enterprise inquiries, contact assesslyinc@gmail.com.
        </Typography>
      </Container>

      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Button variant="text" size="small" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} sx={{ color: 'text.secondary' }}>
          ↑ Back to top
        </Button>
      </Box>
    </Box>
  );
});

Footer.propTypes = {
  showSuperAdminInfo: PropTypes.bool,
};

Footer.defaultProps = {
  showSuperAdminInfo: false,
};

export default Footer;
