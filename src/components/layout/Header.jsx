import React, { useState, useCallback, useMemo } from 'react';
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
  Typography,
  Button,
  Badge,
  Tooltip
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Search as SearchIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  AccountCircle as AccountIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '../brand';
import PropTypes from 'prop-types';
import { debounce } from '../../utils/performance';

// Performance-optimized scroll handler
function HideOnScroll({ children, threshold = 100 }) {
  const trigger = useScrollTrigger({
    threshold,
    disableHysteresis: true
  });
  
  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

HideOnScroll.propTypes = { 
  children: PropTypes.element.isRequired,
  threshold: PropTypes.number 
};

export default function Header({ onDrawerToggle, darkMode, toggleDarkMode }) {
  const { currentUser, logout, notifications = [] } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Memoized handlers
  const handleMenuOpen = useCallback((e) => setAnchorEl(e.currentTarget), []);
  const handleMenuClose = useCallback(() => setAnchorEl(null), []);
  const handleNotificationsOpen = useCallback((e) => setNotificationsAnchorEl(e.currentTarget), []);
  const handleNotificationsClose = useCallback(() => setNotificationsAnchorEl(null), []);

  const handleLogout = useCallback(() => {
    handleMenuClose();
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate, handleMenuClose]);

  // Debounced search for performance
  const debouncedSearch = useMemo(
    () => debounce((query) => {
      if (query.trim()) {
        navigate(`/search?q=${encodeURIComponent(query.trim())}`, { 
          state: { from: location.pathname }
        });
      }
    }, 300),
    [navigate, location.pathname]
  );

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchQuery('');
    if (isMobile) setIsMobileSearchOpen(false);
  }, [searchQuery, navigate, isMobile]);

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Memoized user data
  const userData = useMemo(() => ({
    displayName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User',
    email: currentUser?.email,
    photoURL: currentUser?.photoURL,
    role: currentUser?.role
  }), [currentUser]);

  const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.read).length,
    [notifications]
  );

  const menuItems = useMemo(() => [
    { label: 'Profile', icon: AccountIcon, path: '/profile' },
    { label: 'Settings', icon: SettingsIcon, path: '/settings' },
  ], []);

  return (
    <HideOnScroll threshold={50}>
      <AppBar
        component="header"
        position="sticky"
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          backdropFilter: 'blur(20px)',
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(18, 18, 18, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          transition: 'all 0.3s ease',
        }}
      >
        <Toolbar sx={{ 
          justifyContent: 'space-between', 
          gap: 2,
          minHeight: { xs: 64, md: 72 }
        }}>
          {/* Left Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isMobile && currentUser && (
              <Tooltip title="Toggle menu">
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={onDrawerToggle}
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: theme.palette.action.hover 
                    } 
                  }}
                >
                  <MenuIcon />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="Go to homepage">
              <IconButton 
                onClick={() => navigate('/')} 
                sx={{ p: 0.5 }} 
                aria-label="Home"
              >
                <Logo size={isMobile ? 32 : 36} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Center Section: Search */}
          {currentUser && !isMobile && (
            <Box
              component="form"
              onSubmit={handleSearch}
              sx={{
                flexGrow: 1,
                maxWidth: 500,
                mx: 4,
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'action.hover',
                borderRadius: 3,
                px: 2,
                py: 0.75,
                transition: 'all 0.2s ease',
                '&:focus-within': {
                  bgcolor: 'action.selected',
                  boxShadow: `0 0 0 2px ${theme.palette.primary.main}20`
                }
              }}
            >
              <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
              <InputBase
                fullWidth
                placeholder="Search assessments, candidates..."
                value={searchQuery}
                onChange={handleSearchChange}
                sx={{ 
                  color: 'text.primary',
                  '& .MuiInputBase-input': {
                    py: 0.5
                  }
                }}
              />
            </Box>
          )}

          {/* Right Section: Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={darkMode ? "Light mode" : "Dark mode"}>
              <IconButton
                color="inherit"
                onClick={toggleDarkMode}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                sx={{ 
                  borderRadius: 2,
                  '&:hover': { 
                    backgroundColor: theme.palette.action.hover 
                  } 
                }}
              >
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {currentUser && (
              <>
                <Tooltip title="Notifications">
                  <IconButton
                    color="inherit"
                    onClick={handleNotificationsOpen}
                    sx={{ 
                      borderRadius: 2,
                      '&:hover': { 
                        backgroundColor: theme.palette.action.hover 
                      } 
                    }}
                  >
                    <Badge 
                      badgeContent={unreadNotifications} 
                      color="error" 
                      max={9}
                    >
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>

                {isMobile && (
                  <Tooltip title="Search">
                    <IconButton
                      color="inherit"
                      onClick={() => setIsMobileSearchOpen(prev => !prev)}
                      sx={{ 
                        borderRadius: 2,
                        '&:hover': { 
                          backgroundColor: theme.palette.action.hover 
                        } 
                      }}
                    >
                      <SearchIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}

            {currentUser ? (
              <>
                <Tooltip title="Account menu">
                  <IconButton
                    edge="end"
                    aria-label={`Account menu for ${userData.displayName}`}
                    aria-controls="user-menu"
                    aria-haspopup="true"
                    onClick={handleMenuOpen}
                    color="inherit"
                    sx={{ 
                      borderRadius: 2,
                      '&:hover': { 
                        backgroundColor: theme.palette.action.hover 
                      } 
                    }}
                  >
                    {userData.photoURL ? (
                      <Avatar 
                        src={userData.photoURL} 
                        alt={userData.displayName} 
                        sx={{ width: 32, height: 32 }}
                      />
                    ) : (
                      <Avatar 
                        sx={{ 
                          width: 32, 
                          height: 32, 
                          bgcolor: 'primary.main',
                          fontSize: '0.875rem',
                          fontWeight: 600
                        }}
                      >
                        {userData.displayName.charAt(0).toUpperCase()}
                      </Avatar>
                    )}
                  </IconButton>
                </Tooltip>

                {/* User Menu */}
                <Menu
                  id="user-menu"
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{ 
                    elevation: 8, 
                    sx: { 
                      mt: 1.5, 
                      minWidth: 220, 
                      borderRadius: 2,
                      '& .MuiMenuItem-root': {
                        borderRadius: 1,
                        mx: 1,
                        my: 0.25
                      }
                    } 
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {userData.displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {userData.email}
                    </Typography>
                    {userData.role && (
                      <Typography variant="caption" color="primary" sx={{ mt: 0.5 }}>
                        {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                      </Typography>
                    )}
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  {menuItems.map((item) => (
                    <MenuItem 
                      key={item.label}
                      onClick={() => { 
                        navigate(item.path); 
                        handleMenuClose(); 
                      }}
                    >
                      <item.icon sx={{ mr: 1.5, fontSize: 20 }} />
                      {item.label}
                    </MenuItem>
                  ))}
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                    Logout
                  </MenuItem>
                </Menu>

                {/* Notifications Menu */}
                <Menu
                  anchorEl={notificationsAnchorEl}
                  open={Boolean(notificationsAnchorEl)}
                  onClose={handleNotificationsClose}
                  PaperProps={{ 
                    elevation: 8, 
                    sx: { 
                      mt: 1.5, 
                      width: 320, 
                      maxHeight: 400,
                      borderRadius: 2
                    } 
                  }}
                >
                  <Box sx={{ p: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                      Notifications
                      {unreadNotifications > 0 && (
                        <Typography 
                          component="span" 
                          color="primary" 
                          sx={{ ml: 1 }}
                        >
                          ({unreadNotifications})
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                  
                  <Divider />
                  
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {notifications.length > 0 ? (
                      notifications.slice(0, 5).map((notification) => (
                        <MenuItem key={notification.id} sx={{ py: 1.5 }}>
                          <Box>
                            <Typography variant="body2" fontWeight={notification.read ? 400 : 600}>
                              {notification.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {notification.message}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                        No notifications
                      </Typography>
                    )}
                  </Box>
                </Menu>
              </>
            ) : (
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => navigate('/login')} 
                sx={{ 
                  ml: 1,
                  borderRadius: 2,
                  px: 3,
                  fontWeight: 600
                }}
              >
                Sign In
              </Button>
            )}
          </Box>
        </Toolbar>

        {/* Mobile Search */}
        {isMobile && currentUser && isMobileSearchOpen && (
          <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <form onSubmit={handleSearch}>
              <InputBase
                fullWidth
                autoFocus
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={handleSearchChange}
                startAdornment={<SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                sx={{ 
                  bgcolor: 'action.hover', 
                  borderRadius: 2, 
                  px: 2, 
                  py: 1,
                  '&:focus-within': {
                    bgcolor: 'action.selected',
                  }
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
