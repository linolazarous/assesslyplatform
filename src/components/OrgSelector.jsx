import React, { useState, useEffect, useCallback } from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
  Typography,
  Box,
  Alert
} from '@mui/material';
import { useSnackbar } from 'notistack';
import PropTypes from 'prop-types';

export default function OrgSelector({ currentOrg, setCurrentOrg, size = 'medium' }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  // ✅ Fixed: Add API base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform.onrender.com/api';

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');
      
      // ✅ Fixed: Use correct API URL
      const response = await fetch(`${API_BASE_URL}/organizations`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      }); 
      
      const data = await response.json(); 
      
      if (!response.ok) { 
        throw new Error(data.message || 'Failed to load organizations'); 
      } 
      
      setOrgs(data); 
      if (data.length > 0 && (!currentOrg || !data.some(org => org.id === currentOrg))) { 
        setCurrentOrg(data[0].id); 
      } 
    } catch (err) { 
      console.error('Error loading organizations:', err); 
      enqueueSnackbar(`Failed to load organizations: ${err.message}`, { variant: 'error' }); 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    } 
  }, [currentOrg, setCurrentOrg, enqueueSnackbar, API_BASE_URL]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleChange = (event) => {
    setCurrentOrg(event.target.value);
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ p: 2, m: 2 }}>
        Error: Failed to load organizations ({error})
      </Alert>
    );
  }

  if (loading) {
    return (
      <Skeleton
        variant="rounded"
        width={size === 'small' ? 180 : 200}
        height={size === 'small' ? 40 : 56}
        sx={{ m: 2 }}
      />
    );
  }

  if (orgs.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">
          No organizations available.
        </Typography>
      </Box>
    );
  }

  return (
    <FormControl sx={{ m: 1, minWidth: 120 }} size={size}>
      <InputLabel id="organization-select-label">Organization</InputLabel>
      <Select
        labelId="organization-select-label"
        value={currentOrg || ''}
        label="Organization"
        onChange={handleChange}
      >
        {orgs.map(org => (
          <MenuItem key={org.id} value={org.id}>
            {org.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

OrgSelector.propTypes = {
  currentOrg: PropTypes.string,
  setCurrentOrg: PropTypes.func.isRequired,
  size: PropTypes.oneOf(['small', 'medium'])
};
