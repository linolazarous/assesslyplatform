// src/pages/SearchPage.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Divider,
  Chip,
  InputBase,
  IconButton,
  useTheme,
  Tabs,
  Tab,
  Badge,
  Container,
  Card,
  CardContent,
  Button,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  alpha,
  Tooltip,
  Alert,
  Avatar,
  Grid,
} from '@mui/material';
import {
  Search as SearchIcon,
  Assessment as AssessmentIcon,
  ErrorOutline as ErrorIcon,
  Clear as ClearIcon,
  Quiz as QuizIcon,
  Person as PersonIcon,
  FilterList,
  Sort,
  History,
  ArrowForward,
  Download,
  Share,
  Bookmark,
  BookmarkBorder,
} from '@mui/icons-material';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import searchApi from '../api/searchApi';
import { formatDistanceToNow } from 'date-fns';

/**
 * Search Page Component
 * Unified search across assessments, questions, templates, and users with advanced filtering
 */

// Search Result Item Component
const SearchResultItem = React.memo(({ 
  result, 
  onClick, 
  type = 'assessment',
  isBookmarked,
  onToggleBookmark,
  showOrganization = true,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const handleClick = useCallback((e) => {
    e.preventDefault();
    onClick(result);
  }, [onClick, result]);

  const handleToggleBookmark = useCallback((e) => {
    e.stopPropagation();
    onToggleBookmark(result.id, type);
  }, [onToggleBookmark, result.id, type]);

  const getResultIcon = () => {
    switch (type) {
      case 'question':
        return <QuizIcon color="secondary" />;
      case 'user':
        return <PersonIcon color="info" />;
      case 'template':
        return <AssessmentIcon color="warning" />;
      default:
        return <AssessmentIcon color="primary" />;
    }
  };

  const getResultTypeLabel = () => {
    switch (type) {
      case 'question': return 'Question';
      case 'user': return 'User';
      case 'template': return 'Template';
      default: return result.type || 'Assessment';
    }
  };

  const getResultUrl = () => {
    switch (type) {
      case 'question':
        return `/assessments/${result.assessmentId}#question-${result.questionIndex}`;
      case 'user':
        return `/admin/users/${result.id}`;
      case 'template':
        return `/templates/${result.id}`;
      default:
        return `/assessments/${result.id}`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  return (
    <ListItemButton
      component={RouterLink}
      to={getResultUrl()}
      onClick={handleClick}
      sx={{
        borderRadius: 1,
        mb: 1,
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.04),
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 48 }}>
        <Avatar
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.primary.main,
            width: 40,
            height: 40,
          }}
        >
          {getResultIcon()}
        </Avatar>
      </ListItemIcon>
      
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle1" fontWeight={500}>
              {result.title || result.name || result.text}
            </Typography>
            <IconButton
              size="small"
              onClick={handleToggleBookmark}
              sx={{ ml: 'auto' }}
            >
              {isBookmarked ? (
                <Bookmark color="primary" />
              ) : (
                <BookmarkBorder />
              )}
            </IconButton>
          </Box>
        }
        secondary={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {result.description && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {result.description}
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={getResultTypeLabel()}
                size="small"
                color={type === 'question' ? 'secondary' : 'primary'}
                variant="outlined"
              />
              
              {result.organizationName && showOrganization && (
                <Chip
                  label={result.organizationName}
                  size="small"
                  variant="outlined"
                />
              )}
              
              {result.createdAt && (
                <Typography variant="caption" color="text.secondary">
                  Created {formatDate(result.createdAt)}
                </Typography>
              )}
              
              {result.modifiedAt && (
                <Typography variant="caption" color="text.secondary">
                  Updated {formatDate(result.modifiedAt)}
                </Typography>
              )}
            </Box>
          </Box>
        }
        secondaryTypographyProps={{ component: 'div' }}
      />
      
      <ArrowForward color="action" />
    </ListItemButton>
  );
});

SearchResultItem.displayName = 'SearchResultItem';

// Search Filters Component
const SearchFilters = React.memo(({ 
  filters, 
  onFilterChange, 
  organizationId,
  loading 
}) => {
  const theme = useTheme();

  const handleFilterChange = useCallback((key, value) => {
    onFilterChange(key, value);
  }, [onFilterChange]);

  return (
    <Card elevation={0} sx={{ mb: 3, border: `1px solid ${theme.palette.divider}` }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FilterList fontSize="small" />
          <Typography variant="subtitle2" fontWeight={600}>
            Filters
          </Typography>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type || ''}
                label="Type"
                onChange={(e) => handleFilterChange('type', e.target.value)}
                disabled={loading}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="assessment">Assessments</MenuItem>
                <MenuItem value="question">Questions</MenuItem>
                <MenuItem value="template">Templates</MenuItem>
                <MenuItem value="user">Users</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || ''}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
                disabled={loading}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={filters.sortBy || 'relevance'}
                label="Sort By"
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                disabled={loading}
              >
                <MenuItem value="relevance">Relevance</MenuItem>
                <MenuItem value="newest">Newest</MenuItem>
                <MenuItem value="oldest">Oldest</MenuItem>
                <MenuItem value="name">Name (A-Z)</MenuItem>
                <MenuItem value="modified">Last Modified</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {!organizationId && (
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Organization</InputLabel>
                <Select
                  value={filters.organization || ''}
                  label="Organization"
                  onChange={(e) => handleFilterChange('organization', e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="">All Organizations</MenuItem>
                  {/* Organization options would be populated from API */}
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
});

SearchFilters.displayName = 'SearchFilters';

// Search Tabs Component
const SearchTabs = React.memo(({ 
  activeTab, 
  onChange, 
  counts,
  loading 
}) => {
  const getTabCount = (tab) => counts[tab] || 0;
  
  return (
    <Tabs 
      value={activeTab} 
      onChange={onChange}
      variant="scrollable"
      scrollButtons="auto"
      sx={{ 
        mb: 3,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Tab 
        label={
          <Badge 
            badgeContent={loading ? '...' : getTabCount('assessments')} 
            color="primary" 
            showZero
            max={999}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon fontSize="small" />
              Assessments
            </Box>
          </Badge>
        } 
        value="assessments" 
      />
      <Tab 
        label={
          <Badge 
            badgeContent={loading ? '...' : getTabCount('questions')} 
            color="secondary" 
            showZero
            max={999}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QuizIcon fontSize="small" />
              Questions
            </Box>
          </Badge>
        } 
        value="questions" 
      />
      <Tab 
        label={
          <Badge 
            badgeContent={loading ? '...' : getTabCount('templates')} 
            color="warning" 
            showZero
            max={999}
          >
            Templates
          </Badge>
        } 
        value="templates" 
      />
      <Tab 
        label={
          <Badge 
            badgeContent={loading ? '...' : getTabCount('users')} 
            color="info" 
            showZero
            max={999}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon fontSize="small" />
              Users
            </Box>
          </Badge>
        } 
        value="users" 
      />
    </Tabs>
  );
});

SearchTabs.displayName = 'SearchTabs';

// Empty State Component
const EmptyState = ({ query, activeTab, showFilters = false }) => {
  const theme = useTheme();
  
  if (query) {
    return (
      <Card elevation={0} sx={{ textAlign: 'center', p: 6 }}>
        <SearchIcon 
          sx={{ 
            fontSize: 64, 
            color: theme.palette.text.disabled,
            mb: 3,
          }} 
        />
        <Typography variant="h6" gutterBottom>
          No {activeTab} found for "{query}"
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Try different search terms or adjust your filters
        </Typography>
        {showFilters && (
          <Button 
            variant="outlined" 
            onClick={() => window.history.back()}
          >
            Clear Search
          </Button>
        )}
      </Card>
    );
  }
  
  return (
    <Card elevation={0} sx={{ textAlign: 'center', p: 6 }}>
      <SearchIcon 
        sx={{ 
          fontSize: 64, 
          color: theme.palette.text.disabled,
          mb: 3,
        }} 
      />
      <Typography variant="h6" gutterBottom>
        Search Assessments & Resources
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter keywords to search across assessments, questions, templates, and users
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Try searching for:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Chip label="JavaScript assessment" size="small" />
          <Chip label="Math questions" size="small" />
          <Chip label="Employee evaluation" size="small" />
          <Chip label="Project templates" size="small" />
        </Box>
      </Box>
    </Card>
  );
};

// Error State Component
const ErrorState = ({ error, onRetry }) => (
  <Alert 
    severity="error" 
    sx={{ mb: 3 }}
    action={
      onRetry && (
        <Button color="inherit" size="small" onClick={onRetry}>
          Retry
        </Button>
      )
    }
  >
    <Typography variant="body2">
      {error}
    </Typography>
  </Alert>
);

// Search History Component
const SearchHistory = React.memo(({ history, onSelectQuery, loading }) => {
  const theme = useTheme();
  
  if (!history?.length) return null;
  
  return (
    <Card elevation={0} sx={{ mb: 3, border: `1px solid ${theme.palette.divider}` }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <History fontSize="small" />
          <Typography variant="subtitle2" fontWeight={600}>
            Recent Searches
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {history.slice(0, 8).map((item, index) => (
            <Chip
              key={index}
              label={item.query}
              size="small"
              onClick={() => onSelectQuery(item.query)}
              onDelete={() => {}}
              deleteIcon={<ClearIcon />}
              disabled={loading}
              sx={{ mb: 1 }}
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
});

SearchHistory.displayName = 'SearchHistory';

/**
 * Main Search Page Component
 */
export default function SearchPage({ organizationId = null }) {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showSnackbar, showError } = useSnackbar();
  
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('assessments');
  const [results, setResults] = useState({
    assessments: [],
    questions: [],
    templates: [],
    users: [],
  });
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    sortBy: 'relevance',
    organization: organizationId || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [bookmarks, setBookmarks] = useState({});
  const [totalCounts, setTotalCounts] = useState({
    assessments: 0,
    questions: 0,
    templates: 0,
    users: 0,
  });

  const searchInputRef = useRef(null);

  // Get search query from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchQuery = params.get('q') || '';
    const tab = params.get('tab') || 'assessments';
    
    setQuery(searchQuery);
    setActiveTab(tab);
  }, [location.search]);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('assessly_search_history');
      if (savedHistory) {
        setSearchHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  }, []);

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const savedBookmarks = localStorage.getItem('assessly_search_bookmarks');
      if (savedBookmarks) {
        setBookmarks(JSON.parse(savedBookmarks));
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  }, []);

  // Save search to history
  const saveToHistory = useCallback((searchQuery) => {
    if (!searchQuery.trim()) return;
    
    const newHistory = [
      { query: searchQuery, timestamp: new Date().toISOString() },
      ...searchHistory.filter(item => item.query !== searchQuery),
    ].slice(0, 10); // Keep only last 10 searches
    
    setSearchHistory(newHistory);
    
    try {
      localStorage.setItem('assessly_search_history', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }, [searchHistory]);

  // Toggle bookmark
  const toggleBookmark = useCallback((id, type) => {
    const key = `${type}_${id}`;
    const newBookmarks = { ...bookmarks };
    
    if (newBookmarks[key]) {
      delete newBookmarks[key];
      showSnackbar('Removed from bookmarks', 'info');
    } else {
      newBookmarks[key] = true;
      showSnackbar('Added to bookmarks', 'success');
    }
    
    setBookmarks(newBookmarks);
    
    try {
      localStorage.setItem('assessly_search_bookmarks', JSON.stringify(newBookmarks));
    } catch (error) {
      console.error('Error saving bookmarks:', error);
    }
  }, [bookmarks, showSnackbar]);

  // Perform search
  const performSearch = useCallback(async (searchQuery, searchFilters, searchTab) => {
    if (!searchQuery.trim() || !currentUser?.id) {
      setResults({
        assessments: [],
        questions: [],
        templates: [],
        users: [],
      });
      setTotalCounts({
        assessments: 0,
        questions: 0,
        templates: 0,
        users: 0,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchParams = {
        query: searchQuery.trim(),
        userId: currentUser.id,
        organizationId: organizationId || searchFilters.organization,
        type: searchFilters.type || undefined,
        status: searchFilters.status || undefined,
        sortBy: searchFilters.sortBy,
        limit: 50,
      };

      const response = await searchApi.searchAll(searchParams);
      
      if (response.success) {
        const { results: searchResults, counts } = response.data;
        
        setResults({
          assessments: searchResults.assessments || [],
          questions: searchResults.questions || [],
          templates: searchResults.templates || [],
          users: searchResults.users || [],
        });
        
        setTotalCounts({
          assessments: counts.assessments || 0,
          questions: counts.questions || 0,
          templates: counts.templates || 0,
          users: counts.users || 0,
        });
        
        // Save to history
        saveToHistory(searchQuery);
      } else {
        throw new Error(response.message || 'Search failed');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to perform search';
      setError(errorMessage);
      showError(errorMessage);
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, organizationId, showError, saveToHistory]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) {
        performSearch(query, filters, activeTab);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, filters, activeTab, performSearch]);

  // Handlers
  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      navigate(`/search?q=${encodeURIComponent(trimmedQuery)}&tab=${activeTab}`);
    }
  }, [query, activeTab, navigate]);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    navigate('/search');
  }, [navigate]);

  const handleTabChange = useCallback((_, newValue) => {
    setActiveTab(newValue);
    navigate(`/search?q=${encodeURIComponent(query)}&tab=${newValue}`);
  }, [query, navigate]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleHistorySelect = useCallback((historyQuery) => {
    setQuery(historyQuery);
    navigate(`/search?q=${encodeURIComponent(historyQuery)}`);
  }, [navigate]);

  const handleExportResults = useCallback(async () => {
    try {
      const response = await searchApi.exportSearchResults({
        query,
        filters,
        type: activeTab,
      });
      
      if (response.success && response.data.url) {
        window.open(response.data.url, '_blank');
        showSnackbar('Search results exported successfully', 'success');
      }
    } catch (error) {
      showError('Failed to export search results');
    }
  }, [query, filters, activeTab, showSnackbar, showError]);

  const currentResults = results[activeTab];
  const currentCount = totalCounts[activeTab];
  const hasResults = currentResults.length > 0;

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight={800} gutterBottom color="primary">
          Search
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Search across assessments, questions, templates, and users in your organization
        </Typography>
      </Box>

      {/* Search Bar */}
      <Paper
        component="form"
        onSubmit={handleSearchSubmit}
        elevation={3}
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          '&:focus-within': {
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
          },
        }}
      >
        <IconButton sx={{ p: 1.5 }} aria-label="search">
          <SearchIcon />
        </IconButton>
        
        <InputBase
          inputRef={searchInputRef}
          fullWidth
          placeholder="Search assessments, questions, templates, users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ ml: 1, flex: 1 }}
          inputProps={{ 'aria-label': 'search content' }}
        />
        
        {query && (
          <IconButton 
            onClick={handleClearSearch}
            aria-label="clear search"
          >
            <ClearIcon />
          </IconButton>
        )}
        
        <Divider orientation="vertical" sx={{ height: 28, mx: 1 }} />
        
        <Tooltip title="Search">
          <IconButton 
            type="submit" 
            color="primary" 
            aria-label="perform search"
            disabled={!query.trim() || loading}
            sx={{ p: 1.5 }}
          >
            <ArrowForward />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Search History */}
      {!query && searchHistory.length > 0 && (
        <SearchHistory 
          history={searchHistory}
          onSelectQuery={handleHistorySelect}
          loading={loading}
        />
      )}

      {/* Filters */}
      {query && (
        <SearchFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          organizationId={organizationId}
          loading={loading}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorState 
          error={error}
          onRetry={() => performSearch(query, filters, activeTab)}
        />
      )}

      {/* Results Area */}
      {query && (
        <>
          {/* Tabs and Stats */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}>
            <Box sx={{ flex: 1 }}>
              <SearchTabs
                activeTab={activeTab}
                onChange={handleTabChange}
                counts={totalCounts}
                loading={loading}
              />
            </Box>
            
            {hasResults && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {currentCount} results found
                </Typography>
                <Tooltip title="Export results">
                  <IconButton 
                    size="small" 
                    onClick={handleExportResults}
                    disabled={loading}
                  >
                    <Download />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>

          {/* Loading State */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Results List */}
          {!loading && hasResults && (
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <List disablePadding>
                  {currentResults.map((result, index) => (
                    <React.Fragment key={result.id || index}>
                      <SearchResultItem 
                        result={result}
                        onClick={(result) => {
                          // Navigation is handled by RouterLink
                        }}
                        type={activeTab.slice(0, -1)} // Remove 's' from plural
                        isBookmarked={bookmarks[`${activeTab.slice(0, -1)}_${result.id}`]}
                        onToggleBookmark={toggleBookmark}
                        showOrganization={!organizationId}
                      />
                      {index < currentResults.length - 1 && (
                        <Divider component="li" sx={{ my: 1 }} />
                      )}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!loading && !hasResults && !error && (
            <EmptyState 
              query={query}
              activeTab={activeTab}
              showFilters={Object.values(filters).some(f => f)}
            />
          )}
        </>
      )}

      {/* Initial Empty State */}
      {!query && (
        <EmptyState />
      )}

      {/* Search Tips */}
      {query && hasResults && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Search Tips:</strong> Use quotes for exact phrases, AND/OR for boolean logic, 
            and - to exclude terms. Example: "JavaScript assessment" AND (beginner OR intermediate)
          </Typography>
        </Box>
      )}
    </Container>
  );
}

SearchPage.propTypes = {
  /** Organization ID for multi-tenant context */
  organizationId: PropTypes.string,
};

SearchPage.defaultProps = {
  organizationId: null,
};
