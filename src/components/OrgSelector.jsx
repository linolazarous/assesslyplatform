import React, { useState, useEffect, useCallback } from 'react';
import { 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Skeleton,
  Typography,
  Box
} from '@mui/material';
import { useSnackbar } from 'notistack';
import PropTypes from 'prop-types';

export default function OrgSelector({ currentOrg, setCurrentOrg, size = 'medium' }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch('/api/organizations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load organizations');
      }

      setOrgs(data);
      if (data.length > 0 && !currentOrg) {
        setCurrentOrg(data[0].id);
      }
    } catch (err) {
      console.error('Error loading organizations:', err);
      enqueueSnackbar(`Failed to load organizations: ${err.message}`, { variant: 'error' });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentOrg, setCurrentOrg, enqueueSnackbar]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleChange = (event) => {
    setCurrentOrg(event.target.value);
  };

  if (error) {
    return (
      <Typography color="error" sx={{ p: 2 }}>
        Error: Failed to load organizations
      </Typography>
    );
  }

  if (loading) {
    return (
      <Skeleton 
        variant="rounded" 
        width={size === 'small' ? 180 : 200} 
        height={size === 'small' ? 40 : 56} 
      />
    );
  }

  if (orgs.length === 0) {
    return (
      <Box sx={{ p: 1 }}>
        <Typography variant="body2" color="text.secondary">
          No organizations available
        </Typography>
      </Box>
    );
  }

  return (
    <FormControl fullWidth size={size}>
      <InputLabel id="organization-select-label">Organization</InputLabel>
      <Select
        labelId="organization-select-label"
        value={currentOrg || ''}
        label="Organization"
        onChange={handleChange}
        disabled={orgs.length <= 1}
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
