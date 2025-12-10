// src/pages/Assessments/index.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  useTheme,
  alpha,
  LinearProgress,
  Badge,
} from '@mui/material';
import {
  Search,
  FilterList,
  MoreVert,
  Edit,
  Delete,
  Share,
  CopyAll,
  Archive,
  Visibility,
  Assessment as AssessmentIcon,
  Schedule,
  CheckCircle,
  Error as ErrorIcon,
  Add,
  Download,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

const Assessments = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentOrganization } = useOrganization();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAssessments();
  }, [currentOrganization?.id]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      const mockAssessments = Array.from({ length: 25 }, (_, i) => ({
        id: `assess-${i + 1}`,
        title: `Assessment ${i + 1}: ${['JavaScript', 'React', 'Node.js', 'Python', 'UI/UX', 'DevOps'][i % 6]}`,
        description: `Test knowledge in ${['JavaScript', 'React', 'Node.js', 'Python', 'UI/UX', 'DevOps'][i % 6]}`,
        status: ['draft', 'published', 'archived', 'completed'][i % 4],
        questionCount: Math.floor(Math.random() * 50) + 10,
        candidateCount: Math.floor(Math.random() * 500) + 50,
        averageScore: Math.floor(Math.random() * 30) + 70,
        lastModified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: `User ${(i % 5) + 1}`,
      }));

      setAssessments(mockAssessments);
      setTimeout(() => setLoading(false), 500);
    } catch (error) {
      showSnackbar({ message: 'Failed to load assessments', severity: 'error' });
      setLoading(false);
    }
  };

  const filteredAssessments = useMemo(() => {
    return assessments.filter(assessment => {
      const matchesSearch = assessment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           assessment.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || assessment.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [assessments, searchQuery, statusFilter]);

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const newSelected = filteredAssessments.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleSelect = (id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'default';
      case 'published': return 'primary';
      case 'archived': return 'secondary';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft': return <Edit />;
      case 'published': return <Visibility />;
      case 'archived': return <Archive />;
      case 'completed': return <CheckCircle />;
      default: return null;
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this assessment?')) {
      setAssessments(prev => prev.filter(a => a.id !== id));
      showSnackbar({ message: 'Assessment deleted', severity: 'success' });
    }
  };

  const handleDuplicate = (assessment) => {
    const duplicate = {
      ...assessment,
      id: `assess-${Date.now()}`,
      title: `${assessment.title} (Copy)`,
      status: 'draft',
      lastModified: new Date().toISOString(),
    };
    setAssessments(prev => [duplicate, ...prev]);
    showSnackbar({ message: 'Assessment duplicated', severity: 'success' });
  };

  return (
    <>
      <Helmet>
        <title>Assessments | Assessly Platform</title>
      </Helmet>

      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Assessments
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create and manage assessments for your organization
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/assessments/create')}
          >
            Create Assessment
          </Button>
        </Box>

        {/* Filters and Search */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search assessments by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  startIcon={<FilterList />}
                  onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
                  variant="outlined"
                >
                  Filter
                </Button>
                <Menu
                  anchorEl={filterMenuAnchor}
                  open={Boolean(filterMenuAnchor)}
                  onClose={() => setFilterMenuAnchor(null)}
                >
                  <MenuItem onClick={() => { setStatusFilter('all'); setFilterMenuAnchor(null); }}>
                    All Status
                  </MenuItem>
                  <MenuItem onClick={() => { setStatusFilter('draft'); setFilterMenuAnchor(null); }}>
                    Draft
                  </MenuItem>
                  <MenuItem onClick={() => { setStatusFilter('published'); setFilterMenuAnchor(null); }}>
                    Published
                  </MenuItem>
                  <MenuItem onClick={() => { setStatusFilter('archived'); setFilterMenuAnchor(null); }}>
                    Archived
                  </MenuItem>
                  <MenuItem onClick={() => { setStatusFilter('completed'); setFilterMenuAnchor(null); }}>
                    Completed
                  </MenuItem>
                </Menu>
                {selected.length > 0 && (
                  <>
                    <Button
                      startIcon={<Delete />}
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        if (window.confirm(`Delete ${selected.length} selected assessments?`)) {
                          setAssessments(prev => prev.filter(a => !selected.includes(a.id)));
                          setSelected([]);
                          showSnackbar({ message: `${selected.length} assessments deleted`, severity: 'success' });
                        }
                      }}
                    >
                      Delete Selected
                    </Button>
                    <Button
                      startIcon={<Archive />}
                      variant="outlined"
                      onClick={() => {
                        setAssessments(prev => prev.map(a => 
                          selected.includes(a.id) ? { ...a, status: 'archived' } : a
                        ));
                        setSelected([]);
                        showSnackbar({ message: `${selected.length} assessments archived`, severity: 'success' });
                      }}
                    >
                      Archive Selected
                    </Button>
                  </>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {loading ? (
          <LinearProgress />
        ) : (
          <>
            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Total Assessments
                    </Typography>
                    <Typography variant="h4">
                      {filteredAssessments.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Published
                    </Typography>
                    <Typography variant="h4">
                      {filteredAssessments.filter(a => a.status === 'published').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Total Candidates
                    </Typography>
                    <Typography variant="h4">
                      {filteredAssessments.reduce((sum, a) => sum + a.candidateCount, 0).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Avg Score
                    </Typography>
                    <Typography variant="h4">
                      {filteredAssessments.length > 0 
                        ? Math.round(filteredAssessments.reduce((sum, a) => sum + a.averageScore, 0) / filteredAssessments.length)
                        : 0}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Assessments Table */}
            <Card>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selected.length > 0 && selected.length < filteredAssessments.length}
                          checked={filteredAssessments.length > 0 && selected.length === filteredAssessments.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Questions</TableCell>
                      <TableCell>Candidates</TableCell>
                      <TableCell>Avg Score</TableCell>
                      <TableCell>Last Modified</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAssessments
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((assessment) => (
                        <TableRow
                          key={assessment.id}
                          hover
                          selected={selected.indexOf(assessment.id) !== -1}
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/assessments/${assessment.id}`)}
                        >
                          <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selected.indexOf(assessment.id) !== -1}
                              onChange={(e) => handleSelect(assessment.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <AssessmentIcon sx={{ mr: 2, color: 'primary.main' }} />
                              <Box>
                                <Typography variant="body1">{assessment.title}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {assessment.description}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(assessment.status)}
                              label={assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                              color={getStatusColor(assessment.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{assessment.questionCount}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{assessment.candidateCount.toLocaleString()}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LinearProgress
                                variant="determinate"
                                value={assessment.averageScore}
                                sx={{ flex: 1, mr: 1, height: 8, borderRadius: 4 }}
                              />
                              <Typography variant="body2">{assessment.averageScore}%</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(assessment.lastModified).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/assessments/${assessment.id}/edit`);
                                }}
                                title="Edit"
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicate(assessment);
                                }}
                                title="Duplicate"
                              >
                                <CopyAll fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(assessment.id);
                                }}
                                title="Delete"
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredAssessments.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Card>
          </>
        )}
      </Box>
    </>
  );
};

export default Assessments;
