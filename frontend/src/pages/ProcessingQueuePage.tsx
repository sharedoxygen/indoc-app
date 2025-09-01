import React, { useState } from 'react';
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
    Badge
} from '@mui/material';
import {
    Description as DocumentIcon,
    Sync as SyncIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    MoreVert as MoreVertIcon,
    Refresh as RetryIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    CleaningServices as CleanupIcon
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

const ProcessingQueuePage: React.FC = () => {
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [limit] = useState(20);
    const [tabValue, setTabValue] = useState(0);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, action: '', docId: '' });

    const { data: documentsData, isLoading, refetch } = useGetDocumentsQuery({
        skip: (page - 1) * limit,
        limit: limit,
        sort_by: 'created_at',
        sort_order: 'desc',
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

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    Document Processing Queue
                </Typography>
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

            <Paper sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
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
                                const isSelected = !!selected[doc.uuid];
                                return (
                                    <ListItem key={doc.uuid} divider secondaryAction={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip icon={statusInfo.icon} label={statusInfo.label} color={statusInfo.color as any} variant="outlined" size="small" />
                                            <IconButton size="small" onClick={(e)=>handleMenuOpen(e, doc)}>
                                                <MoreVertIcon />
                                            </IconButton>
                                        </Box>
                                    }>
                                        <ListItemIcon onClick={()=>setSelected(prev=>({...prev, [doc.uuid]: !prev[doc.uuid]}))} sx={{ cursor: 'pointer' }}>
                                            <Badge color="primary" variant={isSelected ? 'dot' : 'standard'}>
                                                <DocumentIcon />
                                            </Badge>
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={doc.filename}
                                            secondary={
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">Status: {doc.status}</Typography>
                                                    {doc.error_message && (
                                                        <Typography variant="caption" color="error.main">Error: {doc.error_message}</Typography>
                                                    )}
                                                </Box>
                                            }
                                        />
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
