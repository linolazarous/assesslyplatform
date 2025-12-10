import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Search,
  Email,
  Person,
  CheckCircle,
  Pending,
} from '@mui/icons-material';

const CandidateList = ({ assessmentId }) => {
  const [search, setSearch] = useState('');
  
  const candidates = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'completed', score: 85, time: 45 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'in-progress', score: null, time: 25 },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'not-started', score: null, time: 0 },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'completed', score: 92, time: 38 },
  ];

  const getStatusChip = (status) => {
    const config = {
      'completed': { color: 'success', label: 'Completed', icon: <CheckCircle /> },
      'in-progress': { color: 'warning', label: 'In Progress', icon: <Pending /> },
      'not-started': { color: 'default', label: 'Not Started', icon: <Person /> },
    };
    return config[status] || config['not-started'];
  };

  const filteredCandidates = candidates.filter(candidate =>
    candidate.name.toLowerCase().includes(search.toLowerCase()) ||
    candidate.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Candidates ({candidates.length})
        </Typography>
        <TextField
          size="small"
          placeholder="Search candidates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Score</TableCell>
              <TableCell align="right">Time (min)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCandidates.map((candidate) => {
              const statusConfig = getStatusChip(candidate.status);
              return (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person fontSize="small" />
                      {candidate.name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email fontSize="small" />
                      {candidate.email}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={statusConfig.icon}
                      label={statusConfig.label}
                      color={statusConfig.color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {candidate.score ? `${candidate.score}%` : '-'}
                  </TableCell>
                  <TableCell align="right">
                    {candidate.time}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CandidateList;
