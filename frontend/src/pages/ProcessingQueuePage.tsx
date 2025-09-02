import React, { useMemo, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    CircularProgress,
    Chip,
    Pagination,
    IconButton,
    Button,
    Menu,
    MenuItem,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tabs,
    Tab,
    Badge,
    Checkbox,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select
} from '@mui/material';
import {
    Sync as SyncIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    MoreVert as MoreVertIcon,
    Refresh as RetryIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    CleaningServices as CleanupIcon,
    Search as SearchIcon,
    Clear as ClearIcon
} from '@mui/icons-material';
import { useGetDocumentsQuery, useDeleteDocumentMutation, useRetryDocumentMutation } from '../store/api';

const getStatusInfo = (status: string) => {
    switch (status) {
        case 'processing':
            return { icon: <CircularProgress size={20} />, color: 'primary', label: 'Processing' };
        case 'text_extracted':
            return { icon: <SyncIcon color="action" />, color: 'info', label: 'Indexing' };
        case 'uploaded':
            return { icon: <SyncIcon color="action" />, color: 'info', label: 'Queued' };
        case 'indexed':
            return { icon: <CheckCircleIcon color="success" />, color: 'success', label: 'Completed' };
        case 'failed':
            return { icon: <ErrorIcon color="error" />, color: 'error', label: 'Failed' };
        default:
            return { icon: <SyncIcon color="action" />, color: 'default', label: 'Pending' };
    }
};

type StageStatus = 'pending' | 'processing' | 'completed' | 'failed'

// Stage names are derived for UI only

const getStageStatusForDoc = (docStatus: string): StageStatus[] => {
    switch (docStatus) {
        case 'uploaded':
            return ['processing', 'pending', 'pending', 'pending', 'pending']
        case 'processing':
            return ['completed', 'processing', 'pending', 'pending', 'pending']
        case 'text_extracted':
            return ['completed', 'completed', 'processing', 'pending', 'pending']
        case 'indexed':
            return ['completed', 'completed', 'completed', 'completed', 'completed']
        case 'failed':
            // assume failed during active work
            return ['completed', 'failed', 'pending', 'pending', 'pending']
        default:
            return ['pending', 'pending', 'pending', 'pending', 'pending']
    }
}

const ProcessingQueuePage: React.FC = () => {
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [tabValue, setTabValue] = useState(0);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, action: '', docId: '' });
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'uploaded' | 'processing' | 'text_extracted' | 'failed'>('all');

    const { data: documentsData, isLoading, refetch } = useGetDocumentsQuery({
        skip: (page - 1) * limit,
        limit: limit,
        sort_by: 'created_at',
        sort_order: 'desc',
        search: searchTerm || undefined,
        status: filterStatus === 'all' ? undefined : filterStatus,
    });

    const [deleteDocument] = useDeleteDocumentMutation();
    const [retryDocument] = useRetryDocumentMutation();

    const allDocuments = documentsData?.documents || [];
    const processingDocuments = allDocuments.filter((doc: any) => doc.status !== 'indexed');
    const failedDocuments = allDocuments.filter((doc: any) => doc.status === 'failed');
    const activeDocuments = allDocuments.filter((doc: any) =>
        doc.status === 'uploaded' || doc.status === 'processing' || doc.status === 'text_extracted'
    );

    const total = documentsData?.total || 0;

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, doc: any) => {
        setAnchorEl(event.currentTarget);
        setSelectedDoc(doc);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedDoc(null);
    };

    const handleRetryDocument = async (docId: string) => {
        try {
            await retryDocument(docId).unwrap();
            refetch();
        } catch (error) {
            console.error('Failed to retry document:', error);
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        try {
            await deleteDocument(docId).unwrap();
            refetch();
        } catch (error) {
            console.error('Failed to delete document:', error);
        }
    };

    const handleBulkCleanup = async (status: string) => {
        const docs = status === 'failed' ? failedDocuments : processingDocuments;
        if (window.confirm(`Delete all ${docs.length} ${status} documents?`)) {
            for (const doc of docs) {
                try {
                    await deleteDocument(doc.uuid).unwrap();
                } catch (error) {
                    console.error(`Failed to delete ${doc.filename}:`, error);
                }
            }
            refetch();
        }
    };

    const getTabDocuments = () => {
        switch (tabValue) {
            case 0: return activeDocuments;
            case 1: return failedDocuments;
            default: return processingDocuments;
        }
    };

    const currentDocuments = getTabDocuments();

    const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])

    const handleToggleSelect = (uuid: string) => {
        setSelected(prev => ({ ...prev, [uuid]: !prev[uuid] }))
    }

    const handleBulkRetry = async () => {
        const ids = Object.keys(selected).filter(id => selected[id])
        if (ids.length === 0) return;
        if (!window.confirm(`Retry processing for ${ids.length} selected document(s)?`)) return;
        for (const id of ids) {
            try { await retryDocument(id).unwrap() } catch (e) { console.error('Bulk retry failed for', id, e) }
        }
        setSelected({})
        refetch()
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    Document Processing Queue
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="contained" startIcon={<RetryIcon />} onClick={handleBulkRetry} disabled={selectedCount === 0}>
                        Retry Selected ({selectedCount})
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<CleanupIcon />}
                        onClick={() => handleBulkCleanup('failed')}
                        disabled={failedDocuments.length === 0}
                        color="error"
                    >
                        Clean Failed ({failedDocuments.length})
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Filter by filename..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                            endAdornment: searchTerm && (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setSearchTerm('')} size="small">
                                        <ClearIcon />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value as any)}>
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="uploaded">Queued</MenuItem>
                            <MenuItem value="processing">Processing</MenuItem>
                            <MenuItem value="text_extracted">Indexing</MenuItem>
                            <MenuItem value="failed">Failed</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab
                        label={
                            <Badge badgeContent={activeDocuments.length} color="primary">
                                Processing
                            </Badge>
                        }
                    />
                    <Tab
                        label={
                            <Badge badgeContent={failedDocuments.length} color="error">
                                Failed
                            </Badge>
                        }
                    />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {isLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}

                    {!isLoading && currentDocuments.length === 0 && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            {tabValue === 0 ? 'No documents are currently being processed.' : 'No failed documents.'}
                        </Alert>
                    )}

                    {!isLoading && currentDocuments.length > 0 && (
                        <List>
                            {currentDocuments.map((doc: any) => {
                                const statusInfo = getStatusInfo(doc.status);
                                return (
                                    <ListItem key={doc.uuid} divider>
                                        <ListItemIcon onClick={() => handleToggleSelect(doc.uuid)} sx={{ cursor: 'pointer' }}>
                                            <Checkbox checked={!!selected[doc.uuid]} />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={doc.filename}
                                            secondary={
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Status: {doc.status}
                                                    </Typography>
                                                    {doc.error_message && (
                                                        <Typography variant="caption" color="error.main">
                                                            Error: {doc.error_message}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                        />
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 320 }}>
                                            {/* Colorful stage progress based on document status (no hardcoding of numbers) */}
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                {getStageStatusForDoc(doc.status).map((s, i) => (
                                                    <Box key={i} sx={{ width: 40, height: 8, borderRadius: 8, bgcolor: s === 'completed' ? '#22C55E' : s === 'processing' ? 'linear-gradient(90deg, #6366F1, #06B6D4)' : s === 'failed' ? '#EF4444' : 'action.disabledBackground' }} />
                                                ))}
                                            </Box>
                                            <Chip icon={statusInfo.icon} label={statusInfo.label} color={statusInfo.color as any} variant="outlined" size="small" />
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleMenuOpen(e, doc)}
                                            >
                                                <MoreVertIcon />
                                            </IconButton>
                                        </Box>
                                    </ListItem>
                                );
                            })}
                        </List>
                    )}
                </Box>

                {total > limit && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, pt: 0 }}>
                        <Pagination
                            count={Math.ceil(total / limit)}
                            page={page}
                            onChange={(_, newPage) => setPage(newPage)}
                            color="primary"
                        />
                    </Box>
                )}
            </Paper>

            {/* Document Actions Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                {selectedDoc?.status === 'failed' && (
                    <MenuItem
                        onClick={() => {
                            handleRetryDocument(selectedDoc.uuid);
                            handleMenuClose();
                        }}
                    >
                        <RetryIcon sx={{ mr: 1 }} />
                        Retry Processing
                    </MenuItem>
                )}
                <MenuItem
                    onClick={() => {
                        // Navigate to document details
                        window.location.href = `/document/${selectedDoc?.uuid}`;
                        handleMenuClose();
                    }}
                >
                    <ViewIcon sx={{ mr: 1 }} />
                    View Details
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setConfirmDialog({
                            open: true,
                            action: 'delete',
                            docId: selectedDoc?.uuid
                        });
                        handleMenuClose();
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <DeleteIcon sx={{ mr: 1 }} />
                    Delete
                </MenuItem>
            </Menu>

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog({ open: false, action: '', docId: '' })}
            >
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this document? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setConfirmDialog({ open: false, action: '', docId: '' })}
                    >
                        Cancel
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => {
                            handleDeleteDocument(confirmDialog.docId);
                            setConfirmDialog({ open: false, action: '', docId: '' });
                        }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ProcessingQueuePage;
