// src/pages/SearchPage.jsx
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  InputBase,
  IconButton,
  useTheme,
  Divider,
  Container,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowForward,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import searchApi from '../api/searchApi';

// Lazy-loaded components
const SearchResultItem = React.lazy(() => import('../components/SearchResultItem'));
const SearchFilters = React.lazy(() => import('../components/SearchFilters'));
const SearchTabs = React.lazy(() => import('../components/SearchTabs'));
const SearchHistory = React.lazy(() => import('../components/SearchHistory'));
const EmptyState = React.lazy(() => import('../components/EmptyState'));
const ErrorState = React.lazy(() => import('../components/ErrorState'));

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

  // Get search query and tab from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchQuery = params.get('q') || '';
    const tab = params.get('tab') || 'assessments';
    setQuery(searchQuery);
    setActiveTab(tab);
  }, [location.search]);

  // Load search history & bookmarks from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('assessly_search_history');
      const savedBookmarks = localStorage.getItem('assessly_search_bookmarks');
      if (savedHistory) setSearchHistory(JSON.parse(savedHistory));
      if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
    } catch (err) {
      console.error('Error loading storage:', err);
    }
  }, []);

  // Save search to history
  const saveToHistory = useCallback((searchQuery) => {
    if (!searchQuery.trim()) return;
    const newHistory = [
      { query: searchQuery, timestamp: new Date().toISOString() },
      ...searchHistory.filter(item => item.query !== searchQuery),
    ].slice(0, 10);
    setSearchHistory(newHistory);
    try {
      localStorage.setItem('assessly_search_history', JSON.stringify(newHistory));
    } catch (err) {
      console.error('Error saving search history:', err);
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
    } catch (err) {
      console.error('Error saving bookmarks:', err);
    }
  }, [bookmarks, showSnackbar]);

  // Perform search
  const performSearch = useCallback(async (searchQuery, searchFilters, searchTab) => {
    if (!searchQuery.trim() || !currentUser?.id) {
      setResults({ assessments: [], questions: [], templates: [], users: [] });
      setTotalCounts({ assessments: 0, questions: 0, templates: 0, users: 0 });
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
        saveToHistory(searchQuery);
      } else throw new Error(response.message || 'Search failed');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Search failed';
      setError(errorMessage);
      showError(errorMessage);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, organizationId, saveToHistory, showError]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) performSearch(query, filters, activeTab);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [query, filters, activeTab, performSearch]);

  // Handlers
  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery) navigate(`/search?q=${encodeURIComponent(trimmedQuery)}&tab=${activeTab}`);
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
      const response = await searchApi.exportSearchResults({ query, filters, type: activeTab });
      if (response.success && response.data.url) {
        window.open(response.data.url, '_blank');
        showSnackbar('Search results exported successfully', 'success');
      }
    } catch {
      showError('Failed to export search results');
    }
  }, [query, filters, activeTab, showSnackbar, showError]);

  const currentResults = results[activeTab];
  const currentCount = totalCounts[activeTab];
  const hasResults = currentResults.length > 0;

  // Focus search input on mount
  useEffect(() => { if (searchInputRef.current) searchInputRef.current.focus(); }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight={800} gutterBottom color="primary">Search</Typography>
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
          <IconButton onClick={handleClearSearch} aria-label="clear search">
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

      {/* Suspense wrapper for lazy-loaded components */}
      <Suspense fallback={<CircularProgress />}>
        {!query && searchHistory.length > 0 && (
          <SearchHistory history={searchHistory} onSelectQuery={handleHistorySelect} loading={loading} />
        )}

        {query && (
          <SearchFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            organizationId={organizationId}
            loading={loading}
          />
        )}

        {error && <ErrorState error={error} onRetry={() => performSearch(query, filters, activeTab)} />}

        {query && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <SearchTabs activeTab={activeTab} onChange={handleTabChange} counts={totalCounts} loading={loading} />
              {hasResults && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">{currentCount} results found</Typography>
                  <Tooltip title="Export results">
                    <IconButton size="small" onClick={handleExportResults} disabled={loading}>
                      <Download />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>

            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>}

            {!loading && hasResults && currentResults.map((result, index) => (
              <SearchResultItem
                key={result.id || index}
                result={result}
                type={activeTab.slice(0, -1)}
                isBookmarked={bookmarks[`${activeTab.slice(0, -1)}_${result.id}`]}
                onToggleBookmark={toggleBookmark}
              />
            ))}

            {!loading && !hasResults && !error && (
              <EmptyState query={query} activeTab={activeTab} showFilters={Object.values(filters).some(f => f)} />
            )}
          </>
        )}

        {!query && <EmptyState />}
      </Suspense>
    </Container>
  );
}

SearchPage.propTypes = {
  organizationId: PropTypes.string,
};

SearchPage.defaultProps = {
  organizationId: null,
};
