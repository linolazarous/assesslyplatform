// src/pages/Admin/ContactMessages.jsx
import React, { useState, useCallback, useMemo, lazy, Suspense } from "react";
import {
  Box,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Button,
  Stack,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  Tabs,
  Tab,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  CircularProgress,
  Fade,
  Slide,
  Zoom,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Delete,
  MarkEmailRead,
  Autorenew,
  Reply,
  Email,
  Person,
  Business,
  CalendarToday,
  AccessTime,
  MoreVert,
  FilterList,
  Search,
  Sort,
  Refresh,
  Visibility,
  ContentCopy,
  Archive,
  Unarchive,
  Download,
  Print,
  Share,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Info,
  Help,
  Settings,
  ArrowBack,
  ArrowForward,
  FirstPage,
  LastPage,
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  CloudUpload,
  History,
  Schedule,
  Send,
  Drafts,
  Inbox,
  Outbox,
  Star,
  StarBorder,
  Label,
  LabelImportant,
  AttachFile,
  InsertDriveFile,
  Image,
  VideoLibrary,
  Link,
  Lock,
  VpnKey,
  VerifiedUser,
  AdminPanelSettings,
  SupervisedUserCircle,
  Groups,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useSnackbar } from "notistack";
import { useAuth } from "../../contexts/AuthContext";
import { useLoading } from "../../hooks/useLoading";
import RoleGuard from "../../components/RoleGuard";
import LoadingScreen from "../../components/ui/LoadingScreen";
import {
  fetchContactMessages,
  updateMessageStatus,
  deleteMessage,
  bulkUpdateMessages,
  exportMessages,
  sendReply,
} from "../../api/contactApi";

// Lazy load heavy components
const MessageDetailDialog = lazy(() => import("../../components/admin/MessageDetailDialog"));
const ExportDialog = lazy(() => import("../../components/admin/ExportDialog"));
const BulkActionsDialog = lazy(() => import("../../components/admin/BulkActionsDialog"));

// Status configuration
const STATUS_CONFIG = {
  pending: { label: "Pending", color: "warning", icon: <Schedule /> },
  read: { label: "Read", color: "info", icon: <MarkEmailRead /> },
  responded: { label: "Responded", color: "success", icon: <Reply /> },
  archived: { label: "Archived", color: "default", icon: <Archive /> },
  spam: { label: "Spam", color: "error", icon: <Warning /> },
  draft: { label: "Draft", color: "default", icon: <Drafts /> },
  sent: { label: "Sent", color: "success", icon: <Send /> },
};

// Priority configuration
const PRIORITY_CONFIG = {
  high: { label: "High", color: "error" },
  medium: { label: "Medium", color: "warning" },
  low: { label: "Low", color: "info" },
  normal: { label: "Normal", color: "default" },
};

export default function ContactMessages() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));
  const { enqueueSnackbar } = useSnackbar();
  const { currentUser, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  // State management
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    dateRange: "all",
    organization: "all",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBulkActionsDialog, setShowBulkActionsDialog] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [bulkAction, setBulkAction] = useState("");
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'card'

  // Loading hook
  const { startLoading, stopLoading, isLoading: isActionLoading } = useLoading(false);

  // Fetch messages
  const {
    data: messagesData = { messages: [], total: 0, stats: {} },
    isLoading: isMessagesLoading,
    isError: isMessagesError,
    error: messagesError,
    refetch,
  } = useQuery(
    ["contactMessages", page, rowsPerPage, sortBy, sortOrder, filters, searchQuery, activeTab],
    () =>
      fetchContactMessages({
        page: page + 1,
        limit: rowsPerPage,
        sortBy,
        sortOrder,
        search: searchQuery,
        status: activeTab !== "all" ? activeTab : undefined,
        ...filters,
      }),
    {
      refetchInterval: 30000, // Auto-refresh every 30 seconds
      refetchOnWindowFocus: true,
      keepPreviousData: true,
      staleTime: 60000, // Consider data stale after 1 minute
    }
  );

  const { messages = [], total = 0, stats = {} } = messagesData;

  // Mutations
  const markMutation = useMutation(
    ({ id, status }) => updateMessageStatus(id, { status }),
    {
      onMutate: async ({ id, status }) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries(["contactMessages"]);

        // Snapshot the previous value
        const previousData = queryClient.getQueryData(["contactMessages"]);

        // Optimistically update
        queryClient.setQueryData(["contactMessages"], (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((msg) =>
              msg.id === id ? { ...msg, status } : msg
            ),
          };
        });

        return { previousData };
      },
      onError: (err, variables, context) => {
        // Rollback on error
        queryClient.setQueryData(["contactMessages"], context.previousData);
        enqueueSnackbar(`Failed to update message: ${err.message}`, {
          variant: "error",
        });
      },
      onSuccess: () => {
        enqueueSnackbar("Message status updated", {
          variant: "success",
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries(["contactMessages"]);
      },
    }
  );

  const deleteMutation = useMutation(deleteMessage, {
    onSuccess: () => {
      enqueueSnackbar("Message deleted", {
        variant: "success",
      });
      setSelectedMessages([]);
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to delete message: ${error.message}`, {
        variant: "error",
      });
    },
  });

  const bulkUpdateMutation = useMutation(bulkUpdateMessages, {
    onSuccess: (data) => {
      enqueueSnackbar(`Updated ${data.count} messages`, {
        variant: "success",
      });
      setSelectedMessages([]);
      setShowBulkActionsDialog(false);
    },
    onError: (error) => {
      enqueueSnackbar(`Bulk action failed: ${error.message}`, {
        variant: "error",
      });
    },
  });

  const replyMutation = useMutation(sendReply, {
    onSuccess: () => {
      enqueueSnackbar("Reply sent successfully", {
        variant: "success",
      });
      setReplyDialogOpen(false);
      setReplyContent("");
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to send reply: ${error.message}`, {
        variant: "error",
      });
    },
  });

  // Event handlers
  const handleMark = useCallback((id, status) => {
    markMutation.mutate({ id, status });
  }, [markMutation]);

  const handleDelete = useCallback((id) => {
    if (window.confirm("Are you sure you want to delete this message? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  const handleBulkDelete = useCallback(() => {
    if (selectedMessages.length === 0) return;
    
    if (window.confirm(`Delete ${selectedMessages.length} selected messages? This action cannot be undone.`)) {
      startLoading(`Deleting ${selectedMessages.length} messages...`);
      Promise.all(selectedMessages.map(id => deleteMutation.mutateAsync(id)))
        .then(() => {
          enqueueSnackbar(`Deleted ${selectedMessages.length} messages`, {
            variant: "success",
          });
          setSelectedMessages([]);
        })
        .catch(error => {
          enqueueSnackbar(`Failed to delete some messages: ${error.message}`, {
            variant: "error",
          });
        })
        .finally(() => stopLoading());
    }
  }, [selectedMessages, deleteMutation, startLoading, stopLoading, enqueueSnackbar]);

  const handleBulkUpdate = useCallback((status) => {
    if (selectedMessages.length === 0) return;
    
    bulkUpdateMutation.mutate({
      ids: selectedMessages,
      updates: { status },
    });
  }, [selectedMessages, bulkUpdateMutation]);

  const handleSelectAll = useCallback(() => {
    if (selectedMessages.length === messages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(messages.map(msg => msg.id));
    }
  }, [messages, selectedMessages.length]);

  const handleSelectMessage = useCallback((id) => {
    setSelectedMessages(prev =>
      prev.includes(id)
        ? prev.filter(msgId => msgId !== id)
        : [...prev, id]
    );
  }, []);

  const handleSort = useCallback((column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  }, [sortBy, sortOrder]);

  const handleReply = useCallback((message) => {
    setSelectedMessage(message);
    setReplyDialogOpen(true);
  }, []);

  const handleSendReply = useCallback(() => {
    if (!selectedMessage || !replyContent.trim()) return;
    
    replyMutation.mutate({
      messageId: selectedMessage.id,
      content: replyContent,
      userId: currentUser?.id,
    });
  }, [selectedMessage, replyContent, replyMutation, currentUser]);

  const handleExport = useCallback((format) => {
    startLoading(`Exporting as ${format}...`);
    exportMessages({ format, filters })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `contact-messages-${dayjs().format("YYYY-MM-DD")}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        enqueueSnackbar(`Exported as ${format.toUpperCase()}`, {
          variant: "success",
        });
      })
      .catch((error) => {
        enqueueSnackbar(`Export failed: ${error.message}`, {
          variant: "error",
        });
      })
      .finally(() => {
        stopLoading();
        setShowExportDialog(false);
      });
  }, [filters, startLoading, stopLoading, enqueueSnackbar]);

  // Filtered and sorted messages
  const filteredMessages = useMemo(() => {
    let filtered = [...messages];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        msg =>
          msg.name?.toLowerCase().includes(query) ||
          msg.email?.toLowerCase().includes(query) ||
          msg.message?.toLowerCase().includes(query) ||
          msg.organization?.toLowerCase().includes(query)
      );
    }

    // Apply additional filters
    if (filters.priority !== "all") {
      filtered = filtered.filter(msg => msg.priority === filters.priority);
    }

    if (filters.organization !== "all") {
      filtered = filtered.filter(msg => msg.organization === filters.organization);
    }

    // Apply date range filter
    if (filters.dateRange !== "all") {
      const now = dayjs();
      let startDate;

      switch (filters.dateRange) {
        case "today":
          startDate = now.startOf("day");
          break;
        case "week":
          startDate = now.subtract(7, "day");
          break;
        case "month":
          startDate = now.subtract(30, "day");
          break;
        case "year":
          startDate = now.subtract(365, "day");
          break;
        default:
          break;
      }

      if (startDate) {
        filtered = filtered.filter(msg => dayjs(msg.createdAt).isAfter(startDate));
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === "createdAt" || sortBy === "updatedAt") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [messages, searchQuery, filters, sortBy, sortOrder]);

  // Message preview helper
  const getMessagePreview = useCallback((text, maxLength = 100) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }, []);

  // Format date
  const formatDate = useCallback((date) => {
    return dayjs(date).format("MMM D, YYYY h:mm A");
  }, []);

  // Get unique organizations
  const organizations = useMemo(() => {
    const orgs = new Set();
    messages.forEach(msg => {
      if (msg.organization) {
        orgs.add(msg.organization);
      }
    });
    return Array.from(orgs);
  }, [messages]);

  // Tabs configuration
  const tabs = [
    { value: "all", label: "All", count: stats.total || 0 },
    { value: "pending", label: "Pending", count: stats.pending || 0 },
    { value: "read", label: "Read", count: stats.read || 0 },
    { value: "responded", label: "Responded", count: stats.responded || 0 },
    { value: "archived", label: "Archived", count: stats.archived || 0 },
    { value: "spam", label: "Spam", count: stats.spam || 0 },
  ];

  if (isMessagesLoading && messages.length === 0) {
    return <LoadingScreen message="Loading contact messages..." type="messages" />;
  }

  return (
    <RoleGuard requiredRole="super_admin">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Slide direction="down" in={true}>
          <Box sx={{ mb: 4 }}>
            <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} spacing={2}>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Contact Messages
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage incoming messages and support requests
                </Typography>
              </Box>

              <Stack direction="row" spacing={1}>
                <Tooltip title="Refresh">
                  <IconButton onClick={() => refetch()} disabled={isMessagesLoading}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export">
                  <IconButton onClick={() => setShowExportDialog(true)}>
                    <Download />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Settings">
                  <IconButton onClick={() => navigate("/admin/contact-settings")}>
                    <Settings />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Box>
        </Slide>

        {/* Stats Cards */}
        <Fade in={!isMessagesLoading}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {Object.entries(stats).map(([key, value]) => {
              if (key === "total") return null;
              const config = STATUS_CONFIG[key];
              if (!config) return null;

              return (
                <Grid item xs={6} sm={4} md={2} key={key}>
                  <Card>
                    <CardContent sx={{ textAlign: "center", p: 2 }}>
                      <Avatar sx={{ bgcolor: `${config.color}.light`, color: `${config.color}.main`, width: 40, height: 40, mx: "auto", mb: 1 }}>
                        {config.icon}
                      </Avatar>
                      <Typography variant="h5" fontWeight="bold">
                        {value || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {config.label}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Fade>

        {/* Controls */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>

            {/* Tabs */}
            <Grid item xs={12} md={6}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {tabs.map((tab) => (
                  <Tab
                    key={tab.value}
                    value={tab.value}
                    label={
                      <Badge badgeContent={tab.count} color="primary" max={99}>
                        {tab.label}
                      </Badge>
                    }
                  />
                ))}
              </Tabs>
            </Grid>

            {/* View Mode */}
            <Grid item xs={12} md={2}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <IconButton
                  size="small"
                  onClick={() => setViewMode("table")}
                  color={viewMode === "table" ? "primary" : "default"}
                >
                  <ViewList />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => setViewMode("card")}
                  color={viewMode === "card" ? "primary" : "default"}
                >
                  <GridView />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => setShowFilters(!showFilters)}
                  color={showFilters ? "primary" : "default"}
                >
                  <FilterList />
                </IconButton>
              </Stack>
            </Grid>
          </Grid>

          {/* Advanced Filters */}
          {showFilters && (
            <Fade in={showFilters}>
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={filters.priority}
                        label="Priority"
                        onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                      >
                        <MenuItem value="all">All Priorities</MenuItem>
                        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                          <MenuItem key={key} value={key}>
                            {config.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Organization</InputLabel>
                      <Select
                        value={filters.organization}
                        label="Organization"
                        onChange={(e) => setFilters({ ...filters, organization: e.target.value })}
                      >
                        <MenuItem value="all">All Organizations</MenuItem>
                        {organizations.map((org) => (
                          <MenuItem key={org} value={org}>
                            {org}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Date Range</InputLabel>
                      <Select
                        value={filters.dateRange}
                        label="Date Range"
                        onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                      >
                        <MenuItem value="all">All Time</MenuItem>
                        <MenuItem value="today">Today</MenuItem>
                        <MenuItem value="week">Last 7 Days</MenuItem>
                        <MenuItem value="month">Last 30 Days</MenuItem>
                        <MenuItem value="year">Last Year</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Button
                        variant="outlined"
                        onClick={() => setFilters({
                          status: "all",
                          priority: "all",
                          dateRange: "all",
                          organization: "all",
                        })}
                        size="small"
                      >
                        Clear Filters
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            </Fade>
          )}
        </Paper>

        {/* Bulk Actions */}
        {selectedMessages.length > 0 && (
          <Slide direction="up" in={selectedMessages.length > 0}>
            <Paper sx={{ p: 2, mb: 3, bgcolor: "action.selected", borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2">
                  {selectedMessages.length} message{selectedMessages.length !== 1 ? "s" : ""} selected
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    onClick={() => handleBulkUpdate("read")}
                    startIcon={<MarkEmailRead />}
                  >
                    Mark as Read
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleBulkUpdate("responded")}
                    startIcon={<Reply />}
                    color="success"
                  >
                    Mark as Responded
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleBulkUpdate("archived")}
                    startIcon={<Archive />}
                    color="default"
                  >
                    Archive
                  </Button>
                  <Button
                    size="small"
                    onClick={handleBulkDelete}
                    startIcon={<Delete />}
                    color="error"
                  >
                    Delete
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setShowBulkActionsDialog(true)}
                    endIcon={<MoreVert />}
                  >
                    More Actions
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Slide>
        )}

        {/* Error Alert */}
        {isMessagesError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => {}}>
            <Typography variant="body2">
              Failed to load messages: {messagesError?.message}
            </Typography>
            <Button size="small" onClick={() => refetch()} sx={{ mt: 1 }}>
              Retry
            </Button>
          </Alert>
        )}

        {/* Loading Indicator */}
        {isMessagesLoading && <LinearProgress sx={{ mb: 3 }} />}

        {/* Messages Table */}
        {viewMode === "table" ? (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Tooltip title="Select all">
                      <Switch
                        size="small"
                        checked={selectedMessages.length === filteredMessages.length && filteredMessages.length > 0}
                        indeterminate={selectedMessages.length > 0 && selectedMessages.length < filteredMessages.length}
                        onChange={handleSelectAll}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Sort by sender">
                      <Button
                        size="small"
                        onClick={() => handleSort("name")}
                        endIcon={sortBy === "name" ? (sortOrder === "asc" ? <ArrowDropUp /> : <ArrowDropDown />) : null}
                      >
                        Sender
                      </Button>
                    </Tooltip>
                  </TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>
                    <Tooltip title="Sort by status">
                      <Button
                        size="small"
                        onClick={() => handleSort("status")}
                        endIcon={sortBy === "status" ? (sortOrder === "asc" ? <ArrowDropUp /> : <ArrowDropDown />) : null}
                      >
                        Status
                      </Button>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Sort by date">
                      <Button
                        size="small"
                        onClick={() => handleSort("createdAt")}
                        endIcon={sortBy === "createdAt" ? (sortOrder === "asc" ? <ArrowDropUp /> : <ArrowDropDown />) : null}
                      >
                        Received
                      </Button>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredMessages.map((message) => {
                  const statusConfig = STATUS_CONFIG[message.status] || STATUS_CONFIG.pending;
                  const priorityConfig = PRIORITY_CONFIG[message.priority] || PRIORITY_CONFIG.normal;

                  return (
                    <TableRow
                      key={message.id}
                      hover
                      selected={selectedMessages.includes(message.id)}
                      onClick={() => handleSelectMessage(message.id)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell padding="checkbox">
                        <Switch
                          size="small"
                          checked={selectedMessages.includes(message.id)}
                          onChange={() => handleSelectMessage(message.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.light" }}>
                            <Person />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">{message.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {message.organization || "No organization"}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{message.email}</Typography>
                        {message.phone && (
                          <Typography variant="caption" color="text.secondary">
                            {message.phone}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="body2" noWrap>
                          {getMessagePreview(message.message)}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Chip label={priorityConfig.label} size="small" color={priorityConfig.color} variant="outlined" />
                          {message.attachments > 0 && (
                            <Chip
                              icon={<AttachFile />}
                              label={`${message.attachments} file${message.attachments !== 1 ? "s" : ""}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Chip
                          icon={statusConfig.icon}
                          label={statusConfig.label}
                          color={statusConfig.color}
                          size="small"
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(message.createdAt)}
                        </Typography>
                        {message.updatedAt !== message.createdAt && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Updated: {formatDate(message.updatedAt)}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="View details">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedMessage(message);
                                setShowDetailDialog(true);
                              }}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Reply">
                            <IconButton
                              size="small"
                              onClick={() => handleReply(message)}
                              color="primary"
                            >
                              <Reply />
                            </IconButton>
                          </Tooltip>

                          {message.status !== "read" && (
                            <Tooltip title="Mark as read">
                              <IconButton
                                size="small"
                                onClick={() => handleMark(message.id, "read")}
                              >
                                <MarkEmailRead />
                              </IconButton>
                            </Tooltip>
                          )}

                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(message.id)}
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="More actions">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setAnchorEl(e.currentTarget);
                                setSelectedMessage(message);
                              }}
                            >
                              <MoreVert />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredMessages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Email sx={{ fontSize: 48, color: "text.secondary", mb: 2, opacity: 0.5 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No messages found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {searchQuery || Object.values(filters).some(f => f !== "all")
                          ? "Try adjusting your search or filters"
                          : "No messages have been received yet"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          // Card View
          <Grid container spacing={2}>
            {filteredMessages.map((message) => (
              <Grid item xs={12} sm={6} md={4} key={message.id}>
                <Card>
                  <CardContent>
                    {/* Card content similar to table row */}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Pagination */}
        {filteredMessages.length > 0 && (
          <Paper sx={{ p: 2, mt: 3, borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, total)} of {total} messages
              </Typography>
              <Stack direction="row" spacing={1}>
                <IconButton
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  size="small"
                >
                  <FirstPage />
                </IconButton>
                <IconButton
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  size="small"
                >
                  <ChevronLeft />
                </IconButton>
                <IconButton
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(total / rowsPerPage) - 1}
                  size="small"
                >
                  <ChevronRight />
                </IconButton>
                <IconButton
                  onClick={() => setPage(Math.ceil(total / rowsPerPage) - 1)}
                  disabled={page >= Math.ceil(total / rowsPerPage) - 1}
                  size="small"
                >
                  <LastPage />
                </IconButton>
              </Stack>
            </Stack>
          </Paper>
        )}

        {/* More Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          {selectedMessage && (
            <>
              <MenuItem onClick={() => handleMark(selectedMessage.id, "read")}>
                <ListItemIcon><MarkEmailRead fontSize="small" /></ListItemIcon>
                <ListItemText>Mark as Read</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleMark(selectedMessage.id, "responded")}>
                <ListItemIcon><Reply fontSize="small" /></ListItemIcon>
                <ListItemText>Mark as Responded</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleMark(selectedMessage.id, "archived")}>
                <ListItemIcon><Archive fontSize="small" /></ListItemIcon>
                <ListItemText>Archive</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleMark(selectedMessage.id, "spam")}>
                <ListItemIcon><Warning fontSize="small" /></ListItemIcon>
                <ListItemText>Mark as Spam</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => navigator.clipboard.writeText(selectedMessage.email)}>
                <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
                <ListItemText>Copy Email</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => navigator.clipboard.writeText(selectedMessage.message)}>
                <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
                <ListItemText>Copy Message</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => handleDelete(selectedMessage.id)} sx={{ color: "error.main" }}>
                <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
                <ListItemText>Delete Message</ListItemText>
              </MenuItem>
            </>
          )}
        </Menu>

        {/* Dialogs */}
        {/* Message Detail Dialog */}
        <Suspense fallback={<CircularProgress />}>
          {showDetailDialog && selectedMessage && (
            <MessageDetailDialog
              open={showDetailDialog}
              onClose={() => setShowDetailDialog(false)}
              message={selectedMessage}
              onStatusChange={(status) => handleMark(selectedMessage.id, status)}
              onReply={() => handleReply(selectedMessage)}
            />
          )}
        </Suspense>

        {/* Export Dialog */}
        <Suspense fallback={<CircularProgress />}>
          <ExportDialog
            open={showExportDialog}
            onClose={() => setShowExportDialog(false)}
            onExport={handleExport}
            formats={["pdf", "excel", "csv", "json"]}
          />
        </Suspense>

        {/* Bulk Actions Dialog */}
        <Suspense fallback={<CircularProgress />}>
          <BulkActionsDialog
            open={showBulkActionsDialog}
            onClose={() => setShowBulkActionsDialog(false)}
            selectedCount={selectedMessages.length}
            onAction={handleBulkUpdate}
          />
        </Suspense>

        {/* Reply Dialog */}
        <Dialog open={replyDialogOpen} onClose={() => setReplyDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Reply />
              <Typography>Reply to {selectedMessage?.name}</Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={6}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your reply here..."
                variant="outlined"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSendReply}
              disabled={!replyContent.trim() || replyMutation.isLoading}
              startIcon={replyMutation.isLoading ? <CircularProgress size={20} /> : <Send />}
            >
              {replyMutation.isLoading ? "Sending..." : "Send Reply"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </RoleGuard>
  );
  }
