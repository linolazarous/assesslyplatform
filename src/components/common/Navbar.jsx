import React, { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Logo } from '../brand'; 
import { 
  AppBar, 
  Toolbar, 
  Button, 
  Box, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemText,
  useScrollTrigger,
  Slide,
  Link
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import PropTypes from 'prop-types';

// Hide AppBar on scroll
function HideOnScroll(props) {
  const { children } = props;
  const trigger = useScrollTrigger();
  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

HideOnScroll.propTypes = {
  children: PropTypes.element.isRequired,
};

// Function to handle smooth scrolling to sections
const scrollToSection = (id) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    return true;
  }
  return false;
};

const Navbar = ({ showNavigation = true, onDrawerToggle }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleLinkClick = (path, targetId) => {
    if (location.pathname !== path) {
      // If navigating to a different page, use RouterLink
      return true; // Let the router handle it
    } else if (targetId && scrollToSection(targetId)) {
      // If on the landing page, handle smooth scroll
      return false; 
    }
    return true;
  };

  const handleMobileLinkClick = (path, targetId) => {
    setMobileOpen(false);
    if (location.pathname !== path) {
      navigate(path);
    } else if (targetId) {
      scrollToSection(targetId);
    }
  };

  const navigationItems = [
    { path: '/', label: 'Home', targetId: 'top' },
    { path: '/', label: 'Features', targetId: 'features-section' },
    { path: '/pricing', label: 'Pricing', targetId: null },
    { path: '/about', label: 'About', targetId: null },
    { path: '/contact', label: 'Contact', targetId: null }
  ];

  const drawer = (
    <Box sx={{ textAlign: 'center' }} role="presentation">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Logo size={32} />
        <IconButton color="inherit" aria-label="close drawer" onClick={onDrawerToggle || handleDrawerToggle}>
          <CloseIcon />
        </IconButton>
      </Box>
      <List>
        {navigationItems.map((item) => (
          <ListItem 
            key={item.label} 
            component={RouterLink}
            to={item.path}
            onClick={() => handleMobileLinkClick(item.path, item.targetId)}
            sx={{
              backgroundColor: location.pathname === item.path && !item.targetId ? 'primary.light' : 'transparent',
              color: 'text.primary',
              '&:hover': { backgroundColor: 'primary.main', color: 'primary.contrastText' }
            }}
          >
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
        <ListItem key="drawer-get-started"> 
          <Button 
            variant="contained" 
            color="primary" 
            fullWidth
            component={RouterLink}
            to="/auth?tab=signup"
          >
            Get Started
          </Button>
        </ListItem>
      </List>
    </Box>
  );

  // If currentUser exists (handled in Header), Navbar is typically hidden or simplified.
  if (!showNavigation) { 
    return null; // Header now handles logged-in navigation
  }

  return (
    <>
      <HideOnScroll>
        <AppBar position="sticky" color="default" elevation={2} sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              <Logo size={40} />
              
              {/* Desktop Navigation */}
              <Box sx={{ display: { xs: 'none', md: 'flex' }, ml: 4, gap: 2 }}>
                {navigationItems.map((item) => (
                  <Link
                    key={item.path + item.label}
                    component={RouterLink}
                    to={item.path}
                    onClick={(e) => {
                      if (!handleLinkClick(item.path, item.targetId)) {
                        e.preventDefault();
                      }
                    }}
                    color={location.pathname === item.path ? 'primary' : 'inherit'}
                    sx={{
                      fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                      textDecoration: 'none',
                      p: 1,
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText'
                      }
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </Box>
            </Box>

            {/* Desktop Auth Buttons */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/auth?tab=login"
              >
                Login
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                component={RouterLink}
                to="/auth?tab=signup"
              >
                Sign Up
              </Button>
            </Box>

            {/* Mobile menu button */}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="end"
              onClick={handleDrawerToggle}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      </HideOnScroll>

      {/* Mobile Navigation Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

Navbar.propTypes = {
  showNavigation: PropTypes.bool,
  onDrawerToggle: PropTypes.func, // Added this prop, although primarily used by MainLayout for the Header
};

export default Navbar;

