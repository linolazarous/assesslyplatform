// src/pages/Users/index.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  Search,
  FilterList,
  Add,
  MoreVert,
  Edit,
  Delete,
  PersonAdd,
  Mail,
  Phone,
  Person,
  AdminPanelSettings,
  GppGood,
  PersonOff,
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

// Enhanced Table Components
const EnhancedTableHead = ({ 
  columns, 
  order, 
  orderBy, 
  onRequestSort,
  selectedCount,
  rowCount,
  onSelectAllClick,
  selectionEnabled,
}) => {
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {selectionEnabled && (
          <TableCell padding="checkbox">
            <Checkbox
              indeterminate={selectedCount > 0 && selectedCount < rowCount}
              checked={rowCount > 0 && selectedCount === rowCount}
              onChange={onSelectAllClick}
            />
          </TableCell>
        )}
        {columns.map((column) => (
          <TableCell
            key={column.id}
            align={column.align || 'left'}
            sortDirection={orderBy === column.id ? order : false}
            sx={{ fontWeight: 600 }}
          >
            {column.sortable ? (
              <TableSortLabel
                active={orderBy === column.id}
                direction={orderBy === column.id ? order : 'asc'}
                onClick={createSortHandler(column.id)}
              >
                {column.label}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </TableCell>
        ))}
        <TableCell align="right">Actions</TableCell>
      </TableRow>
    </TableHead>
  );
};

const UserStatusChip = ({ status }) => {
  const statusConfig = {
    active: { color: 'success', label: 'Active', icon: <GppGood fontSize="small" /> },
    pending: { color: 'warning', label: 'Pending', icon: <Person fontSize="small" /> },
    inactive: { color: 'default', label: 'Inactive', icon: <PersonOff fontSize="small" /> },
    suspended: { color: 'error', label: 'Suspended', icon: <PersonOff fontSize="small" /> },
  };

  const config = statusConfig[status] || statusConfig.inactive;

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size="small"
      variant="outlined"
    />
  );
};

const RoleChip = ({ role }) => {
  const roleConfig = {
    super_admin: { color: 'error', label: 'Super Admin', icon: <AdminPanelSettings /> },
    organization_admin: { color: 'info', label: 'Org Admin', icon: <AdminPanelSettings /> },
    assessor: { color: 'primary', label: 'Assessor', icon: <Person /> },
    candidate: { color: 'default', label: 'Candidate', icon: <Person /> },
  };

  const config = roleConfig[role] || roleConfig.candidate;

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size="small"
    />
  );
};

// Invite User Dialog
const InviteUserDialog = ({ open, onClose, onInvite }) => {
  const [formData, setFormData] = useState({
    email: '',
    role: 'candidate',
    organizationId: '',
  });
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch organizations for selection
    const fetchOrganizations = async () => {
      try {
        const response = await fetch('/api/organizations', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setOrganizations(data);
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      }
    };

    if (open) {
      fetchOrganizations();
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onInvite(formData);
      setFormData({ email: '', role: 'candidate', organizationId: '' });
      onClose();
    } catch (error) {
      console.error('Failed to invite user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Invite New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <MenuItem value="organization_admin">Organization Admin</MenuItem>
                  <MenuItem value="assessor">Assessor</MenuItem>
                  <MenuItem value="candidate">Candidate</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Organization</InputLabel>
                <Select
                  value={formData.organizationId}
                  label="Organization"
                  onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                >
                  {organizations.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PersonAdd />}
          >
            Send Invitation
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Users = () => {
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      showSnackbar('Failed to load users', 'error');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.organization?.name?.toLowerCase().includes(term)
      );
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(u => u.status === filterStatus);
    }

    setFilteredUsers(filtered);
    setPage(0);
    setSelected([]);
  }, [users, searchTerm, filterRole, filterStatus]);

  // Table columns
  const columns = [
    { id: 'name', label: 'User', sortable: true },
    { id: 'email', label: 'Email', sortable: true },
    { id: 'role', label: 'Role', sortable: true },
    { id: 'organization', label: 'Organization', sortable: true },
    { id: 'status', label: 'Status', sortable: true },
    { id: 'lastActive', label: 'Last Active', sortable: true },
  ];

  // Sorting
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Selection
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = filteredUsers.map((n) => n.id);
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

  // Pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Actions
  const handleMenuOpen = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleEdit = () => {
    if (selectedUser) {
      // Navigate to edit user page
      console.log('Edit user:', selectedUser.id);
      handleMenuClose();
    }
  };

  const handleDelete = async () => {
    if (selectedUser) {
      try {
        const response = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (response.ok) {
          showSnackbar('User deleted successfully', 'success');
          fetchUsers();
        }
      } catch (error) {
        showSnackbar('Failed to delete user', 'error');
      }
      handleMenuClose();
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    
    try {
      const response = await fetch('/api/users/bulk-delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: selected }),
      });
      
      if (response.ok) {
        showSnackbar(`${selected.length} users deleted successfully`, 'success');
        fetchUsers();
        setSelected([]);
      }
    } catch (error) {
      showSnackbar('Failed to delete users', 'error');
    }
  };

  const handleInvite = async (inviteData) => {
    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteData),
      });
      
      if (response.ok) {
        showSnackbar('Invitation sent successfully', 'success');
        fetchUsers();
        return true;
      }
    } catch (error) {
      showSnackbar('Failed to send invitation', 'error');
      throw error;
    }
  };

  const handleStatusUpdate = async (userId, status) => {
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (response.ok) {
        showSnackbar('User status updated', 'success');
        fetchUsers();
      }
    } catch (error) {
      showSnackbar('Failed to update status', 'error');
    }
  };

  // Check permissions
  const canInvite = useMemo(() => {
    return user?.role === 'super_admin' || user?.role === 'organization_admin';
  }, [user]);

  const canDelete = useMemo(() => {
    return user?.role === 'super_admin';
  }, [user]);

  // Sort users
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];

      // Handle nested properties
      if (orderBy === 'organization') {
        aValue = a.organization?.name;
        bValue = b.organization?.name;
      }

      if (order === 'asc') {
        return aValue < bValue ? -1 : 1;
      }
      return bValue < aValue ? -1 : 1;
    });
  }, [filteredUsers, order, orderBy]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedUsers.slice(start, start + rowsPerPage);
  }, [sortedUsers, page, rowsPerPage]);

  return (
    <>
      <Helmet>
        <title>Users - Assessly Platform</title>
      </Helmet>

      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1">
              User Management
            </Typography>
            
            {canInvite && (
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => setInviteDialogOpen(true)}
              >
                Invite User
              </Button>
            )}
          </Box>
          
          <Typography variant="body1" color="text.secondary">
            Manage users across your organization. Invite new users, update roles, and monitor activity.
          </Typography>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select
                  value={filterRole}
                  label="Role"
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <MenuItem value="all">All Roles</MenuItem>
                  <MenuItem value="super_admin">Super Admin</MenuItem>
                  <MenuItem value="organization_admin">Organization Admin</MenuItem>
                  <MenuItem value="assessor">Assessor</MenuItem>
                  <MenuItem value="candidate">Candidate</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                {selected.length > 0 && (
                  <>
                    <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                      {selected.length} selected
                    </Typography>
                    {canDelete && (
                      <Button
                        color="error"
                        startIcon={<Delete />}
                        onClick={handleBulkDelete}
                        size="small"
                      >
                        Delete Selected
                      </Button>
                    )}
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Users Table */}
        <Paper>
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <EnhancedTableHead
                    columns={columns}
                    order={order}
                    orderBy={orderBy}
                    onRequestSort={handleRequestSort}
                    selectedCount={selected.length}
                    rowCount={filteredUsers.length}
                    onSelectAllClick={handleSelectAllClick}
                    selectionEnabled={canDelete}
                  />
                  <TableBody>
                    {paginatedUsers.map((user) => {
                      const isSelected = selected.includes(user.id);
                      
                      return (
                        <TableRow
                          hover
                          key={user.id}
                          selected={isSelected}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          {canDelete && (
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleSelect(user.id)}
                              />
                            </TableCell>
                          )}
                          
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar src={user.avatar}>
                                {user.name?.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {user.name || 'Unnamed User'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ID: {user.id.substring(0, 8)}...
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Mail fontSize="small" color="action" />
                              <Typography variant="body2">
                                {user.email}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <RoleChip role={user.role} />
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2">
                              {user.organization?.name || 'No Organization'}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <UserStatusChip status={user.status} />
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2">
                              {user.lastActive 
                                ? format(new Date(user.lastActive), 'MMM d, yyyy')
                                : 'Never'
                              }
                            </Typography>
                          </TableCell>
                          
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, user)}
                            >
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {paginatedUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No users found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredUsers.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </Paper>

        {/* Stats */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" color="primary">
                {users.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" color="success.main">
                {users.filter(u => u.status === 'active').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Users
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" color="warning.main">
                {users.filter(u => u.role === 'assessor').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Assessors
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" color="info.main">
                {users.filter(u => u.role === 'candidate').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Candidates
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* User Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit User
        </MenuItem>
        
        {selectedUser?.status === 'active' ? (
          <MenuItem onClick={() => handleStatusUpdate(selectedUser.id, 'inactive')}>
            <PersonOff fontSize="small" sx={{ mr: 1 }} />
            Deactivate
          </MenuItem>
        ) : (
          <MenuItem onClick={() => handleStatusUpdate(selectedUser.id, 'active')}>
            <GppGood fontSize="small" sx={{ mr: 1 }} />
            Activate
          </MenuItem>
        )}
        
        {canDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Invite Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        onInvite={handleInvite}
      />
    </>
  );
};

export default React.memo(Users);
