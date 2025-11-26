import React from 'react';
import {
Box, Container, Typography, Table, TableBody, TableCell,
TableContainer, TableHead, TableRow, Paper, IconButton, Tooltip,
Chip, Button, Stack
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ReplyIcon from '@mui/icons-material/Reply';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchMessages, updateMessageStatus, deleteMessage } from '../../api/contactApi';

export default function ContactMessages() {
const qc = useQueryClient();

const { data: messages = [], isLoading, isError, error } = useQuery(
['contactMessages'],
fetchMessages,
{ refetchInterval: 8000, refetchOnWindowFocus: true }
);

const markMutation = useMutation(({ id, status }) => updateMessageStatus(id, { status }), {
onSuccess: () => qc.invalidateQueries(['contactMessages'])
});

const deleteMutation = useMutation((id) => deleteMessage(id), {
onSuccess: () => qc.invalidateQueries(['contactMessages'])
});

const handleMark = (id, status) => markMutation.mutate({ id, status });
const handleDelete = (id) => {
if (!confirm('Delete this message? This action cannot be undone.')) return;
deleteMutation.mutate(id);
};

const statusColor = (s) => {
if (s === 'pending') return 'warning';
if (['sent', 'read', 'responded'].includes(s)) return 'success';
if (s === 'failed') return 'error';
return 'default';
};

const preview = (text) => text.length > 120 ? text.slice(0, 120) + '…' : text;

return (
<Container sx={{ py: 4 }}>
<Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
Contact Messages
</Typography>

  <Paper>
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>From</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Message</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Received</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={6} align="center">Loading...</TableCell>
            </TableRow>
          )}

          {isError && (
            <TableRow>
              <TableCell colSpan={6} align="center">
                Error: {error.message}
              </TableCell>
            </TableRow>
          )}

          {(!isLoading && messages.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} align="center">No messages yet</TableCell>
            </TableRow>
          )}

          {messages.map((m) => (
            <TableRow key={m._id}>
              <TableCell sx={{ width: 180 }}>
                <Typography variant="subtitle2">{m.name}</Typography>
                <Typography variant="caption" color="text.secondary">{m.organization || ''}</Typography>
              </TableCell>

              <TableCell>
                <Typography variant="body2">{m.email}</Typography>
              </TableCell>

              <TableCell sx={{ maxWidth: 480 }}>
                <Typography variant="body2">{preview(m.message)}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    onClick={() => navigator.clipboard?.writeText(m.message)}
                    tabIndex={0}
                  >
                    Copy
                  </Button>
                  <Button
                    size="small"
                    onClick={() => alert(m.message)}
                    tabIndex={0}
                  >
                    View
                  </Button>
                </Stack>
              </TableCell>

              <TableCell>
                <Chip label={m.status} color={statusColor(m.status)} />
              </TableCell>

              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {dayjs(m.createdAt).format('MMM D, YYYY h:mm A')}
                </Typography>
              </TableCell>

              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  {m.status !== 'read' && (
                    <Tooltip title="Mark as read">
                      <IconButton
                        onClick={() => handleMark(m._id, 'read')}
                        size="small"
                        tabIndex={0} // ensures focus is managed safely
                      >
                        <MarkEmailReadIcon />
                      </IconButton>
                    </Tooltip>
                  )}

                  {m.status === 'failed' && (
                    <Tooltip title="Retry send">
                      <IconButton
                        onClick={() => handleMark(m._id, 'pending')}
                        size="small"
                        tabIndex={0}
                      >
                        <AutorenewIcon />
                      </IconButton>
                    </Tooltip>
                  )}

                  <Tooltip title="Mark as responded">
                    <IconButton
                      onClick={() => handleMark(m._id, 'responded')}
                      size="small"
                      tabIndex={0}
                    >
                      <ReplyIcon />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Delete">
                    <IconButton
                      onClick={() => handleDelete(m._id)}
                      size="small"
                      color="error"
                      tabIndex={0}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}

        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
</Container>

);
}
