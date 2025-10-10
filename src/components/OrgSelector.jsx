import React, { useState, useEffect } from 'react';
import { 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Skeleton, // Removed CircularProgress as it's not used in the final render block
  Typography,
  Box
} from '@mui/material';
import { useSnackbar } from 'notistack';
import PropTypes from 'prop-types';

// Destructure props with default values where appropriate
export default function OrgSelector({ currentOrg, setCurrentOrg, size = 'medium' }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  // Memoize the fetch function using useCallback if it were passed down, 
  // but keeping it inside is fine for a dependency of []
  const fetchOrganizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      // Use an environment variable for the API base path if in a real app
      const response = await fetch('/api/organizations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load organizations');
      }

      setOrgs(data);
      // Only set a default if currentOrg is explicitly falsy (null/undefined)
      if (data.length > 0 && !currentOrg) {
        setCurrentOrg(data[0].id);
      }
    } catch (err) {
      console.error('Error loading organizations:', err);
      // Use the error message from the caught error for better context
      enqueueSnackbar(`Failed to load organizations: ${err.message}`, { variant: 'error' });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add fetchOrganizations to a dependency array of [] to run once on mount
  useEffect(() => {
    fetchOrganizations();
  }, []); // Eslint will be happy if fetchOrganizations is stable (not recreated on every render)

  const handleChange = (event) => {
    setCurrentOrg(event.target.value);
  };

  if (error) {
    return (
      <Typography color="error" sx={{ p: 2 }}> {/* Added some padding for presentation */}
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
        labelId="organization-select-label" // Added labelId for accessibility
        value={currentOrg || ''} // Handle null/undefined currentOrg
        label="Organization"
        onChange={handleChange}
        disabled={orgs.length <= 1} // Disabling if only one org is available is good UX
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
  // Updated to indicate currentOrg is optional
  currentOrg: PropTypes.string, 
  setCurrentOrg: PropTypes.func.isRequired,
  size: PropTypes.oneOf(['small', 'medium'])
};
