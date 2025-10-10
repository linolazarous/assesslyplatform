import React, { useState } from 'react';
import { 
  AppBar,
  Toolbar,
  Box,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  useScrollTrigger,
  Slide,
  useMediaQuery,
  useTheme,
  Typography
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Search as SearchIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  AccountCircle as AccountIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Logo from '../brand/logo';
import PropTypes from 'prop-types';

// Moved HideOnScroll outside to prevent re-creation on every render
function HideOnScroll({ children }) {
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

export default function Header({ onDrawerToggle, darkMode, toggleDarkMode }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  // State to control mobile search visibility, separate from searchQuery
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false); 

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  
  const handleLogout = () => {
    handleMenuClose();
    logout();
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return; // Prevent searching empty query
    
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
    // Close mobile search after submission
    if (isMobile) setIsMobileSearchOpen(false); 
  };
  
  const userDisplayName = currentUser?.displayName || currentUser?.email || 'Profile';
  const userPhotoURL = currentUser?.photoURL;

  return (
    <HideOnScroll>
      <AppBar 
        component="header"
        className="no-print"
        sx={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: 'none',
          borderBottom: `1px solid ${theme.palette.divider}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
          {/* Left Section - Logo & Mobile Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={onDrawerToggle}
              >
                <MenuIcon />
              </IconButton>
            )}
            {/* Logo is now wrapped in a button to navigate home */}
            <IconButton onClick={() => navigate('/')} sx={{ p: 0 }} aria-label="Home">
               <Logo size={isMobile ? 40 : 50} />
            </IconButton>
          </Box>

          {/* Middle Section - Search (Desktop) */}
          {!isMobile && (
            <Box 
              component="form" 
              onSubmit={handleSearch}
              sx={{
                flexGrow: 1,
                maxWidth: 600,
                mx: 4,
                display: 'flex',
                alignItems: 'center',
                backgroundColor: theme.palette.action.hover,
                borderRadius: 2,
                px: 2,
                py: 0.5
              }}
            >
              <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <InputBase
                fullWidth
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ color: 'text.primary' }}
              />
            </Box>
          )}

          {/* Right Section - Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Dark Mode Toggle */}
            <IconButton 
              color="inherit" 
              onClick={toggleDarkMode}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>

            {/* Mobile Search Toggle */}
            {isMobile && (
              <IconButton 
                color="inherit" 
                aria-label="Toggle search bar"
                onClick={() => setIsMobileSearchOpen(prev => !prev)}
              >
                <SearchIcon />
              </IconButton>
            )}

            {/* User Menu */}
            {currentUser ? (
              <>
                <IconButton
                  edge="end"
                  aria-label={`Account menu for ${userDisplayName}`}
                  aria-controls="user-menu"
                  aria-haspopup="true"
                  onClick={handleMenuOpen}
                  color="inherit"
                >
                  {userPhotoURL ? (
                    <Avatar 
                      src={userPhotoURL} 
                      alt={userDisplayName}
                      sx={{ width: 32, height: 32 }}
                    />
                  ) : (
                    <AccountIcon fontSize="medium" />
                  )}
                </IconButton>
                <Menu
                  id="user-menu"
                  anchorEl={anchorEl}
                  keepMounted
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    elevation: 0,
                    sx: {
                      mt: 1,
                      minWidth: 200,
                      borderRadius: 2,
                      boxShadow: 3
                    }
                  }}
                >
                  <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
                    {userDisplayName}
                  </Typography>
                  <Divider />
                  <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
                    <AccountIcon sx={{ mr: 1.5 }} fontSize="small" />
                    Profile
                  </MenuItem>
                  <MenuItem onClick={() => { navigate('/settings'); handleMenuClose(); }}>
                    <SettingsIcon sx={{ mr: 1.5 }} fontSize="small" />
                    Settings
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1.5 }} fontSize="small" />
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button 
                variant="outlined" 
                color="inherit"
                onClick={() => navigate('/login')}
                sx={{ ml: 1 }}
              >
                Login
              </Button>
            )}
          </Box>
        </Toolbar>

        {/* Mobile Search Bar (when activated) */}
        {isMobile && isMobileSearchOpen && (
          <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
            <form onSubmit={handleSearch}>
              <InputBase
                fullWidth
                autoFocus
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startAdornment={<SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                sx={{ 
                  color: 'text.primary',
                  backgroundColor: theme.palette.action.hover,
                  borderRadius: 1,
                  px: 2,
                  py: 1
                }}
              />
            </form>
          </Box>
        )}
      </AppBar>
    </HideOnScroll>
  );
}

Header.propTypes = {
  onDrawerToggle: PropTypes.func.isRequired,
  darkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired
};
