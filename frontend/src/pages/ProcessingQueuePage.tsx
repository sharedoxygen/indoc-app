import React, { useState } from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemIcon, ListItemText, CircularProgress, Chip, Pagination } from '@mui/material';
import { Description as DocumentIcon, Sync as SyncIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';
import { useGetDocumentsQuery } from '../store/api';

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
    const [limit] = useState(20);
    const { data: documentsData, isLoading } = useGetDocumentsQuery({
        skip: (page - 1) * limit,
        limit: limit,
        sort_by: 'created_at',
        sort_order: 'desc',
    });

    const allDocuments = documentsData?.documents || [];
    const processingDocuments = allDocuments.filter((doc: any) => doc.status !== 'indexed');
    const total = documentsData?.total || 0;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                Document Processing Queue
            </Typography>
            <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                {isLoading && <CircularProgress />}
                {!isLoading && processingDocuments.length === 0 && (
                    <Typography>No documents are currently being processed.</Typography>
                )}
                {!isLoading && processingDocuments.length > 0 && (
                    <List>
                        {processingDocuments.map((doc: any) => {
                            const statusInfo = getStatusInfo(doc.status);
                            return (
                                <ListItem key={doc.uuid} divider>
                                    <ListItemIcon>
                                        <DocumentIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={doc.filename}
                                        secondary={`Status: ${doc.status}`}
                                    />
                                    <Chip
                                        icon={statusInfo.icon}
                                        label={statusInfo.label}
                                        color={statusInfo.color as any}
                                        variant="outlined"
                                        size="small"
                                    />
                                </ListItem>
                            );
                        })}
                    </List>
                )}
                {total > limit && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <Pagination
                            count={Math.ceil(total / limit)}
                            page={page}
                            onChange={(_, newPage) => setPage(newPage)}
                            color="primary"
                        />
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default ProcessingQueuePage;
