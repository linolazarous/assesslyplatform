// src/components/AssessmentDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  CircularProgress,
  Box,
  TablePagination,
  Grid,
  Card,
  CardContent,
  Alert,
  Tabs,
  Tab,
  Stack,
  IconButton,
  Tooltip,
  Avatar,
  LinearProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  Badge,
} from "@mui/material";
import {
  CheckCircle,
  HourglassEmpty,
  DoneAll,
  Add,
  FilterList,
  Search,
  Refresh,
  MoreVert,
  Visibility,
  Edit,
  Delete,
  Share,
  Download,
  CalendarToday,
  People,
  BarChart,
  Timer,
  Assessment as AssessmentIcon,
  PlayArrow,
  Pause,
  Stop,
  Archive,
  Unarchive,
  ContentCopy,
  Sort,
  TrendingUp,
  TrendingDown,
  Business,
  AdminPanelSettings,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";
import { fetchAssessments, deleteAssessment, duplicateAssessment, updateAssessmentStatus } from "../api/assessmentApi";
import LoadingScreen from "./ui/LoadingScreen";
import AnimatedCounter from "./ui/AnimatedCounter";

const STATUS_CONFIG = {
  draft: { color: "default", icon: <HourglassEmpty />, label: "Draft", badgeColor: "#9e9e9e" },
  active: { color: "success", icon: <CheckCircle />, label: "Active", badgeColor: "#4caf50" },
  paused: { color: "warning", icon: <Pause />, label: "Paused", badgeColor: "#ff9800" },
  completed: { color: "primary", icon: <DoneAll />, label: "Completed", badgeColor: "#2196f3" },
  archived: { color: "secondary", icon: <Archive />, label: "Archived", badgeColor: "#9c27b0" },
  scheduled: { color: "info", icon: <CalendarToday />, label: "Scheduled", badgeColor: "#00bcd4" },
};

const TYPE_CONFIG = {
  quiz: { color: "primary", label: "Quiz", icon: "❓" },
  exam: { color: "secondary", label: "Exam", icon: "📝" },
  survey: { color: "info", label: "Survey", icon: "📊" },
  evaluation: { color: "warning", label: "Evaluation", icon: "⭐" },
  certification: { color: "success", label: "Certification", icon: "🏆" },
  skills: { color: "error", label: "Skills", icon: "🎯" },
};

export default function AssessmentDashboard({ 
  organizationId = null,
  showCreateButton = true,
  showFilters = true,
  showStats = true,
  limit = 10,
  autoRefresh = false,
  refreshInterval = 30000,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { isSuperAdmin, currentOrganization } = useAuth();
  
  // State management
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(limit);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [totalAssessments, setTotalAssessments] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkActions, setBulkActions] = useState([]);
  const [selectedAssessments, setSelectedAssessments] = useState(new Set());
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);

  // Fetch assessments with filters
  const fetchAssessmentsData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        sortBy,
        sortOrder,
        organizationId: organizationId || currentOrganization?.id,
        status: activeTab !== "all" ? activeTab : undefined,
        search: searchQuery || undefined,
        types: selectedTypes.length > 0 ? selectedTypes.join(",") : undefined,
        statuses: selectedStatuses.length > 0 ? selectedStatuses.join(",") : undefined,
      };

      const data = await fetchAssessments(params);
      
      setAssessments(data.data || data.items || []);
      setTotalAssessments(data.pagination?.total || data.total || 0);
      
      // Calculate stats if not provided
      if (data.stats) {
        setStats(data.stats);
      } else {
        // Calculate basic stats from data
        const statsData = {
          total: data.pagination?.total || data.total || 0,
          active: data.data?.filter(a => a.status === 'active').length || 0,
          draft: data.data?.filter(a => a.status === 'draft').length || 0,
          completed: data.data?.filter(a => a.status === 'completed').length || 0,
          responses: data.data?.reduce((sum, a) => sum + (a.responseCount || 0), 0) || 0,
          averageScore: data.data?.reduce((sum, a) => sum + (a.averageScore || 0), 0) / data.data.length || 0,
        };
        setStats(statsData);
      }
      
    } catch (error) {
      console.error("Error fetching assessments:", error);
      enqueueSnackbar(`Failed to load assessments: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [
    page, 
    rowsPerPage, 
    sortBy, 
    sortOrder, 
    organizationId, 
    currentOrganization, 
    activeTab, 
    searchQuery, 
    selectedTypes, 
    selectedStatuses,
    enqueueSnackbar
  ]);

  // Auto-refresh
  useEffect(() => {
    fetchAssessmentsData();
    
    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(fetchAssessmentsData, refreshInterval);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchAssessmentsData, autoRefresh, refreshInterval]);

  // Assessment actions
  const handleStartAssessment = async (assessmentId) => {
    try {
      navigate(`/assessments/${assessmentId}/take`);
    } catch (error) {
      enqueueSnackbar(`Failed to start assessment: ${error.message}`, {
        variant: "error",
      });
    }
  };

  const handleEditAssessment = (assessmentId) => {
    navigate(`/assessments/${assessmentId}/edit`);
  };

  const handleViewResults = (assessmentId) => {
    navigate(`/assessments/${assessmentId}/results`);
  };

  const handleDuplicateAssessment = async (assessmentId) => {
    try {
      await duplicateAssessment(assessmentId);
      enqueueSnackbar("Assessment duplicated successfully", { variant: "success" });
      fetchAssessmentsData();
    } catch (error) {
      enqueueSnackbar(`Failed to duplicate assessment: ${error.message}`, {
        variant: "error",
      });
    }
  };

  const handleDeleteAssessment = async (assessmentId) => {
    try {
      await deleteAssessment(assessmentId);
      enqueueSnackbar("Assessment deleted successfully", { variant: "success" });
      fetchAssessmentsData();
      setDeleteDialogOpen(false);
    } catch (error) {
      enqueueSnackbar(`Failed to delete assessment: ${error.message}`, {
        variant: "error",
      });
    }
  };

  const handleUpdateStatus = async (assessmentId, status) => {
    try {
      await updateAssessmentStatus(assessmentId, { status });
      enqueueSnackbar(`Assessment ${status} successfully`, { variant: "success" });
      fetchAssessmentsData();
    } catch (error) {
      enqueueSnackbar(`Failed to update status: ${error.message}`, {
        variant: "error",
      });
    }
  };

  const handleShareAssessment = (assessmentId) => {
    // Implement share logic (copy link, email, etc.)
    const shareUrl = `${window.location.origin}/assessments/${assessmentId}/invite`;
    navigator.clipboard.writeText(shareUrl);
    enqueueSnackbar("Assessment link copied to clipboard", { variant: "success" });
  };

  // Bulk actions
  const handleBulkAction = async (action) => {
    try {
      const assessmentIds = Array.from(selectedAssessments);
      switch (action) {
        case 'delete':
          // Implement bulk delete
          break;
        case 'archive':
          // Implement bulk archive
          break;
        case 'duplicate':
          // Implement bulk duplicate
          break;
      }
      enqueueSnackbar(`Bulk ${action} completed successfully`, { variant: "success" });
      setSelectedAssessments(new Set());
      fetchAssessmentsData();
    } catch (error) {
      enqueueSnackbar(`Bulk action failed: ${error.message}`, { variant: "error" });
    }
  };

  // Filtered and sorted assessments
  const filteredAssessments = useMemo(() => {
    let filtered = [...assessments];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(assessment => 
        assessment.title?.toLowerCase().includes(query) ||
        assessment.description?.toLowerCase().includes(query) ||
        assessment.code?.toLowerCase().includes(query)
      );
    }
    
    // Apply type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(assessment => 
        selectedTypes.includes(assessment.type)
      );
    }
    
    // Apply status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(assessment => 
        selectedStatuses.includes(assessment.status)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  }, [assessments, searchQuery, selectedTypes, selectedStatuses, sortBy, sortOrder]);

  const renderStats = () => {
    if (!showStats || !stats) return null;

    return (
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AnimatedCounter
                value={stats.total}
                label="Total Assessments"
                icon={<AssessmentIcon />}
                size="medium"
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AnimatedCounter
                value={stats.active}
                label="Active"
                icon={<PlayArrow />}
                color="success"
                size="medium"
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AnimatedCounter
                value={stats.responses}
                label="Total Responses"
                icon={<People />}
                color="info"
                size="medium"
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AnimatedCounter
                value={stats.averageScore || 0}
                label="Avg Score"
                format="percentage"
                suffix="%"
                icon={<BarChart />}
                color="warning"
                size="medium"
                precision={1}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderAssessmentCard = (assessment) => {
    const statusConfig = STATUS_CONFIG[assessment.status] || STATUS_CONFIG.draft;
    const typeConfig = TYPE_CONFIG[assessment.type] || TYPE_CONFIG.quiz;
    
    return (
      <Card key={assessment.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6" fontWeight="bold">
                  {assessment.title}
                </Typography>
                <Chip 
                  icon={statusConfig.icon}
                  label={statusConfig.label}
                  size="small"
                  color={statusConfig.color}
                  variant="outlined"
                />
                <Chip 
                  label={typeConfig.label}
                  size="small"
                  variant="outlined"
                  avatar={<Avatar sx={{ bgcolor: 'transparent' }}>{typeConfig.icon}</Avatar>}
                />
              </Box>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                {assessment.description || "No description provided"}
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <People fontSize="small" />
                    <Typography variant="caption">
                      {assessment.responseCount || 0} responses
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Timer fontSize="small" />
                    <Typography variant="caption">
                      {assessment.duration || 'Untimed'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BarChart fontSize="small" />
                    <Typography variant="caption">
                      Avg: {assessment.averageScore || 0}%
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday fontSize="small" />
                    <Typography variant="caption">
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
            
            <IconButton
              onClick={(e) => {
                setAnchorEl(e.currentTarget);
                setSelectedAssessment(assessment);
              }}
            >
              <MoreVert />
            </IconButton>
          </Box>
          
          {/* Progress bar for active assessments */}
          {assessment.status === 'active' && assessment.responseCount > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Completion: {assessment.completionRate || 0}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={assessment.completionRate || 0} 
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          )}
          
          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1, mt: 3, flexWrap: 'wrap' }}>
            {assessment.status === 'draft' && (
              <Button
                variant="contained"
                size="small"
                startIcon={<Edit />}
                onClick={() => handleEditAssessment(assessment.id)}
              >
                Edit
              </Button>
            )}
            
            {assessment.status === 'active' && (
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<PlayArrow />}
                onClick={() => handleStartAssessment(assessment.id)}
              >
                Start
              </Button>
            )}
            
            {assessment.status === 'completed' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<BarChart />}
                onClick={() => handleViewResults(assessment.id)}
              >
                View Results
              </Button>
            )}
            
            <Button
              variant="text"
              size="small"
              startIcon={<Visibility />}
              onClick={() => navigate(`/assessments/${assessment.id}`)}
            >
              Preview
            </Button>
            
            <Button
              variant="text"
              size="small"
              startIcon={<Share />}
              onClick={() => handleShareAssessment(assessment.id)}
            >
              Share
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search assessments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ flexGrow: 1, maxWidth: 300 }}
          />
          
          <Tooltip title="Filter options">
            <IconButton
              onClick={(e) => setFilterAnchorEl(e.currentTarget)}
              sx={{ border: 1, borderColor: 'divider' }}
            >
              <FilterList />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Sort by">
            <IconButton
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              sx={{ border: 1, borderColor: 'divider' }}
            >
              <Sort sx={{ transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none' }} />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh">
            <IconButton
              onClick={fetchAssessmentsData}
              sx={{ border: 1, borderColor: 'divider' }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
          
          {showCreateButton && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/assessments/create')}
              sx={{ ml: 'auto' }}
            >
              Create Assessment
            </Button>
          )}
        </Box>
        
        {/* Active filters */}
        {(selectedTypes.length > 0 || selectedStatuses.length > 0) && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedTypes.map(type => (
              <Chip
                key={type}
                label={TYPE_CONFIG[type]?.label || type}
                size="small"
                onDelete={() => setSelectedTypes(prev => prev.filter(t => t !== type))}
              />
            ))}
            {selectedStatuses.map(status => (
              <Chip
                key={status}
                label={STATUS_CONFIG[status]?.label || status}
                size="small"
                onDelete={() => setSelectedStatuses(prev => prev.filter(s => s !== status))}
              />
            ))}
          </Box>
        )}
      </Paper>
    );
  };

  if (loading && assessments.length === 0) {
    return <LoadingScreen message="Loading assessments..." type="assessment" />;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Assessment Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage and monitor all assessments in your organization
        </Typography>
        
        {/* Organization context */}
        {currentOrganization && (
          <Alert 
            severity="info" 
            icon={<Business />}
            sx={{ mb: 2, maxWidth: 600 }}
          >
            <Typography variant="body2">
              Viewing assessments for <strong>{currentOrganization.name}</strong>
            </Typography>
          </Alert>
        )}
        
        {/* Super admin note */}
        {isSuperAdmin && organizationId && (
          <Alert 
            severity="warning" 
            icon={<AdminPanelSettings />}
            sx={{ mb: 2, maxWidth: 600 }}
          >
            <Typography variant="body2">
              <strong>Super Admin View:</strong> Viewing assessments across all organizations
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Stats */}
      {renderStats()}

      {/* Filters */}
      {renderFilters()}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => {
            setActiveTab(newValue);
            setPage(0);
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            label={
              <Badge badgeContent={stats?.total} color="primary" sx={{ mr: 1 }}>
                All
              </Badge>
            } 
            value="all" 
          />
          <Tab 
            label={
              <Badge badgeContent={stats?.active} color="success" sx={{ mr: 1 }}>
                Active
              </Badge>
            } 
            value="active" 
          />
          <Tab 
            label={
              <Badge badgeContent={stats?.draft} color="default" sx={{ mr: 1 }}>
                Draft
              </Badge>
            } 
            value="draft" 
          />
          <Tab 
            label={
              <Badge badgeContent={stats?.completed} color="primary" sx={{ mr: 1 }}>
                Completed
              </Badge>
            } 
            value="completed" 
          />
          <Tab label="Archived" value="archived" />
          <Tab label="Scheduled" value="scheduled" />
        </Tabs>
      </Paper>

      {/* Assessments List */}
      {filteredAssessments.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <AssessmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No assessments found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {searchQuery || selectedTypes.length > 0 || selectedStatuses.length > 0
              ? "Try adjusting your filters or search query"
              : "Create your first assessment to get started"}
          </Typography>
          {showCreateButton && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/assessments/create')}
              sx={{ mt: 2 }}
            >
              Create Assessment
            </Button>
          )}
        </Paper>
      ) : (
        <>
          {/* Bulk actions */}
          {selectedAssessments.size > 0 && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2">
                  {selectedAssessments.size} selected
                </Typography>
                <Divider orientation="vertical" flexItem />
                {bulkActions.map(action => (
                  <Button
                    key={action}
                    size="small"
                    onClick={() => handleBulkAction(action)}
                  >
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </Button>
                ))}
                <Button
                  size="small"
                  onClick={() => setSelectedAssessments(new Set())}
                  sx={{ ml: 'auto' }}
                >
                  Clear
                </Button>
              </Stack>
            </Paper>
          )}

          {/* Assessments grid */}
          <Grid container spacing={2}>
            {filteredAssessments
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map(assessment => (
                <Grid item xs={12} key={assessment.id}>
                  {renderAssessmentCard(assessment)}
                </Grid>
              ))}
          </Grid>

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredAssessments.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            sx={{ mt: 3 }}
          />
        </>
      )}

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
      >
        <MenuItem dense>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Assessment Type
          </Typography>
        </MenuItem>
        {Object.entries(TYPE_CONFIG).map(([type, config]) => (
          <MenuItem key={type}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={selectedTypes.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTypes(prev => [...prev, type]);
                    } else {
                      setSelectedTypes(prev => prev.filter(t => t !== type));
                    }
                  }}
                />
              }
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography>{config.icon}</Typography>
                  <Typography>{config.label}</Typography>
                </Stack>
              }
            />
          </MenuItem>
        ))}
        
        <Divider />
        
        <MenuItem dense>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Status
          </Typography>
        </MenuItem>
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <MenuItem key={status}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={selectedStatuses.includes(status)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStatuses(prev => [...prev, status]);
                    } else {
                      setSelectedStatuses(prev => prev.filter(s => s !== status));
                    }
                  }}
                />
              }
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  {config.icon}
                  <Typography>{config.label}</Typography>
                </Stack>
              }
            />
          </MenuItem>
        ))}
      </Menu>

      {/* Assessment Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {selectedAssessment && (
          <>
            <MenuItem onClick={() => {
              handleEditAssessment(selectedAssessment.id);
              setAnchorEl(null);
            }}>
              <ListItemText primary="Edit" secondary="Modify assessment details" />
            </MenuItem>
            
            <MenuItem onClick={() => {
              handleDuplicateAssessment(selectedAssessment.id);
              setAnchorEl(null);
            }}>
              <ListItemText primary="Duplicate" secondary="Create a copy" />
            </MenuItem>
            
            <MenuItem onClick={() => {
              handleShareAssessment(selectedAssessment.id);
              setAnchorEl(null);
            }}>
              <ListItemText primary="Share" secondary="Share with candidates" />
            </MenuItem>
            
            <MenuItem onClick={() => {
              handleViewResults(selectedAssessment.id);
              setAnchorEl(null);
            }}>
              <ListItemText primary="View Results" secondary="See candidate responses" />
            </MenuItem>
            
            <Divider />
            
            {selectedAssessment.status !== 'archived' ? (
              <MenuItem onClick={() => {
                handleUpdateStatus(selectedAssessment.id, 'archived');
                setAnchorEl(null);
              }}>
                <ListItemText primary="Archive" secondary="Move to archive" />
              </MenuItem>
            ) : (
              <MenuItem onClick={() => {
                handleUpdateStatus(selectedAssessment.id, 'draft');
                setAnchorEl(null);
              }}>
                <ListItemText primary="Unarchive" secondary="Restore from archive" />
              </MenuItem>
            )}
            
            <MenuItem onClick={() => {
              setDeleteDialogOpen(true);
              setAnchorEl(null);
            }}>
              <ListItemText 
                primary="Delete" 
                secondary="Permanently remove" 
                primaryTypographyProps={{ color: 'error' }}
              />
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Assessment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedAssessment?.title}"? 
            This action cannot be undone and will also delete all associated responses.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => handleDeleteAssessment(selectedAssessment?.id)} 
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

AssessmentDashboard.propTypes = {
  organizationId: PropTypes.string,
  showCreateButton: PropTypes.bool,
  showFilters: PropTypes.bool,
  showStats: PropTypes.bool,
  limit: PropTypes.number,
  autoRefresh: PropTypes.bool,
  refreshInterval: PropTypes.number,
};

AssessmentDashboard.defaultProps = {
  showCreateButton: true,
  showFilters: true,
  showStats: true,
  limit: 10,
  autoRefresh: false,
  refreshInterval: 30000,
};
