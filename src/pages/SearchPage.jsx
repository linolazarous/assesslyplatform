import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  InputBase,
  IconButton,
  useTheme,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import { 
  Search as SearchIcon,
  Assessment as AssessmentIcon,
  ErrorOutline as ErrorIcon,
  Clear as ClearIcon,
  Quiz as QuizIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { debouncedSearch } from '../services/searchService.js'; 

// --- SearchResultItem Component ---
const SearchResultItem = React.memo(({ result, onClick, type = 'assessment' }) => {
  const theme = useTheme();
  
  const handleClick = useCallback(() => {
    onClick(result);
  }, [onClick, result]);
  
  return (
    <ListItem 
      button 
      onClick={handleClick}
      sx={{
        '&:hover': {
          backgroundColor: theme.palette.action.hover
        }
      }}
    >
      <ListItemIcon>
        {type === 'question' ? (
          <QuizIcon color="secondary" />
        ) : (
          <AssessmentIcon color="primary" />
        )}
      </ListItemIcon>
      <ListItemText
        primary={result.title || result.text}
        secondary={
          type === 'question' 
            ? `Source: ${result.assessmentTitle}`
            : result.description || 'No description available'
        }
        secondaryTypographyProps={{ noWrap: true }}
      />
      <Chip 
        label={type === 'question' ? 'Question' : (result.type || 'Assessment')} 
        size="small" 
        variant="outlined"
        sx={{ ml: 2 }}
      />
    </ListItem>
  );
});

// --- SearchTabs Component ---
const SearchTabs = React.memo(({ activeTab, onChange, assessmentCount, questionCount }) => {
  return (
    <Tabs 
      value={activeTab} 
      onChange={onChange}
      variant="fullWidth"
      sx={{ mb: 3 }}
    >
      <Tab 
        label={
          <Badge badgeContent={assessmentCount} color="primary" showZero>
            Assessments
          </Badge>
        } 
        value="assessments" 
      />
      <Tab 
        label={
          <Badge badgeContent={questionCount} color="secondary" showZero>
            Questions
          </Badge>
        } 
        value="questions" 
      />
    </Tabs>
  );
});

// --- EmptyState Component ---
const EmptyState = React.memo(({ query, activeTab, currentResults }) => {
  const theme = useTheme();
  
  if (query && currentResults.length === 0) {
    return (
      <Typography variant="body1" sx={{ textAlign: 'center', p: 4 }}>
        No {activeTab} found for "{query}"
      </Typography>
    );
  }
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      p: 4,
      textAlign: 'center'
    }}>
      <SearchIcon fontSize="large" color="action" />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Search for assessments, questions, or templates
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Enter a search term in the field above to get started
      </Typography>
    </Box>
  );
});

// --- ErrorState Component ---
const ErrorState = React.memo(({ error }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      p: 4,
      color: theme.palette.error.main
    }}>
      <ErrorIcon fontSize="large" />
      <Typography variant="h6" sx={{ mt: 2 }}>
        {error}
      </Typography>
    </Box>
  );
});

// --- SearchPage Component ---
export default function SearchPage() {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('assessments');
  const [assessmentResults, setAssessmentResults] = useState([]);
  const [questionResults, setQuestionResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get search query from URL
  const searchQuery = useMemo(() => {
    return new URLSearchParams(location.search).get('q') || '';
  }, [location.search]);

  // Memoized current results based on active tab
  const currentResults = useMemo(() => 
    activeTab === 'assessments' ? assessmentResults : questionResults,
    [activeTab, assessmentResults, questionResults]
  );

  // Memoized search execution
  const executeSearch = useCallback((searchQuery, userId, tab) => {
    if (!searchQuery?.trim() || !userId) {
      setAssessmentResults([]);
      setQuestionResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    const setter = tab === 'assessments' ? setAssessmentResults : setQuestionResults;

    debouncedSearch(
      searchQuery.trim(), 
      userId,
      (results, err) => {
        if (err) {
          setError(err.message || 'An unknown error occurred during search.');
          setter([]);
        } else {
          setter(Array.isArray(results) ? results : []);
        }
        setLoading(false);
      },
      tab
    );
  }, []);

  // Effect to handle search when query or tab changes
  useEffect(() => {
    setQuery(searchQuery);
    
    if (searchQuery && currentUser?.id) {
      executeSearch(searchQuery, currentUser.id, activeTab);
    } else {
      setAssessmentResults([]);
      setQuestionResults([]);
      setLoading(false);
      setError(null);
    }
  }, [searchQuery, currentUser?.id, activeTab, executeSearch]);

  // Handlers
  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }
  }, [query, navigate]);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    navigate('/search');
  }, [navigate]);

  const handleResultClick = useCallback((result) => {
    if (activeTab === 'questions') {
      navigate(`/assessments/${result.assessmentId}#question-${result.questionIndex}`);
    } else {
      navigate(`/assessments/${result.id}`);
    }
  }, [activeTab, navigate]);

  const handleTabChange = useCallback((_, newValue) => {
    setActiveTab(newValue);
  }, []);

  // Memoized search form
  const searchForm = useMemo(() => (
    <Paper
      component="form"
      onSubmit={handleSearchSubmit}
      sx={{
        p: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        mb: 3,
        borderRadius: 2,
        boxShadow: theme.shadows[1]
      }}
    >
      <InputBase
        fullWidth
        placeholder="Search assessments, questions, or templates..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ ml: 2, flex: 1 }}
        inputProps={{ 'aria-label': 'search assessments' }}
      />
      <IconButton 
        type="button" 
        onClick={handleClearSearch}
        disabled={!query}
        aria-label="clear search"
      >
        <ClearIcon />
      </IconButton>
      <Divider orientation="vertical" sx={{ height: 28, m: 0.5 }} />
      <IconButton 
        type="submit" 
        color="primary" 
        aria-label="search"
        disabled={!query.trim()}
      >
        <SearchIcon />
      </IconButton>
    </Paper>
  ), [query, handleSearchSubmit, handleClearSearch, theme]);

  // Memoized results list
  const resultsList = useMemo(() => {
    if (currentResults.length === 0) return null;
    
    return (
      <>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {currentResults.length} {activeTab}{currentResults.length !== 1 ? 's' : ''} found for "{query}"
        </Typography>
        <Paper elevation={0} sx={{ borderRadius: 2 }}>
          <List disablePadding>
            {currentResults.map((result, index) => (
              <React.Fragment key={result.id || `${result.assessmentId}-${index}`}>
                <SearchResultItem 
                  result={result} 
                  onClick={handleResultClick}
                  type={activeTab === 'questions' ? 'question' : 'assessment'}
                />
                {index < currentResults.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </>
    );
  }, [currentResults, activeTab, query, handleResultClick]);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Search Bar */}
      {searchForm}

      {/* Search Tabs */}
      {query && (
        <SearchTabs
          activeTab={activeTab}
          onChange={handleTabChange}
          assessmentCount={assessmentResults.length}
          questionCount={questionResults.length}
        />
      )}

      {/* Results Section */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <ErrorState error={error} />
      ) : resultsList || (
        <EmptyState 
          query={query}
          activeTab={activeTab}
          currentResults={currentResults}
        />
      )}
    </Box>
  );
}
