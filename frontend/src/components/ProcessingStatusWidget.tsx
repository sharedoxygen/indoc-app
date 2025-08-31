import React, { useState } from 'react';
import {
    Fab,
    Paper,
    Box,
    Typography,
    IconButton,
    Badge,
    Slide,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    LinearProgress,
    Chip,
    Avatar,
    Tooltip,
    Divider,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Security as VirusIcon,
    TextFields as ExtractIcon,
    Search as IndexIcon,
    CheckCircle as CompleteIcon,
    Error as ErrorIcon,
    Close as CloseIcon,
    Visibility as ShowIcon,
    VisibilityOff as HideIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useDocumentProcessing } from '../hooks/useDocumentProcessing';

const getStatusColor = (status: string) => {
    switch (status) {
        case 'completed': return 'success';
        case 'processing': return 'primary';
        case 'failed': return 'error';
        default: return 'default';
    }
};

const getStageIcon = (stageId: string, status: string) => {
    const baseProps = { fontSize: 'small' as const };

    if (status === 'failed') return <ErrorIcon {...baseProps} color="error" />;
    if (status === 'completed') return <CompleteIcon {...baseProps} color="success" />;

    switch (stageId) {
        case 'upload': return <UploadIcon {...baseProps} color="primary" />;
        case 'virus_scan': return <VirusIcon {...baseProps} color="warning" />;
        case 'text_extraction': return <ExtractIcon {...baseProps} color="info" />;
        case 'indexing': return <IndexIcon {...baseProps} color="secondary" />;
        default: return <UploadIcon {...baseProps} />;
    }
};

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const ProcessingStatusWidget: React.FC = () => {
    const { processingDocuments, removeDocument, summary, isActive } = useDocumentProcessing();
    const [isExpanded, setIsExpanded] = useState(false);

    if (!isActive) return null;

    const handleToggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <>
            {/* Floating Action Button */}
            <Fab
                color="primary"
                onClick={handleToggleExpanded}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1000,
                }}
            >
                <Badge
                    badgeContent={summary.processing}
                    color="secondary"
                    invisible={summary.processing === 0}
                >
                    {isExpanded ? <HideIcon /> : <ShowIcon />}
                </Badge>
            </Fab>

            {/* Expanded Status Panel */}
            <Slide direction="up" in={isExpanded} mountOnEnter unmountOnExit>
                <Paper
                    elevation={8}
                    sx={{
                        position: 'fixed',
                        bottom: 100,
                        right: 24,
                        width: 420,
                        maxHeight: '60vh',
                        zIndex: 999,
                        borderRadius: 3,
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <Box
                        sx={{
                            p: 2,
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <UploadIcon />
                            <Typography variant="h6">
                                Document Processing
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                                label={`${summary.processing} active`}
                                size="small"
                                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }}
                            />
                            <IconButton
                                size="small"
                                onClick={handleToggleExpanded}
                                sx={{ color: 'inherit' }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>

                    {/* Summary Stats */}
                    <Box sx={{ p: 2, bgcolor: 'grey.50', display: 'flex', gap: 2 }}>
                        <Chip
                            icon={<RefreshIcon />}
                            label={`${summary.processing} Processing`}
                            color="primary"
                            variant={summary.processing > 0 ? 'filled' : 'outlined'}
                            size="small"
                        />
                        <Chip
                            icon={<CompleteIcon />}
                            label={`${summary.completed} Completed`}
                            color="success"
                            variant={summary.completed > 0 ? 'filled' : 'outlined'}
                            size="small"
                        />
                        {summary.failed > 0 && (
                            <Chip
                                icon={<ErrorIcon />}
                                label={`${summary.failed} Failed`}
                                color="error"
                                variant="filled"
                                size="small"
                            />
                        )}
                    </Box>

                    <Divider />

                    {/* Document List */}
                    <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
                        <List dense>
                            {processingDocuments.map((doc) => {
                                const stages = ['upload', 'virus_scan', 'text_extraction', 'indexing'];
                                const currentIndex = stages.indexOf(doc.currentStage);
                                const progress = ((currentIndex + 1) / stages.length) * 100;

                                return (
                                    <ListItem
                                        key={doc.id}
                                        sx={{
                                            borderBottom: '1px solid #f0f0f0',
                                            '&:last-child': { borderBottom: 'none' }
                                        }}
                                    >
                                        <ListItemIcon>
                                            <Avatar
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    bgcolor: doc.overallStatus === 'completed' ? 'success.main'
                                                        : doc.overallStatus === 'failed' ? 'error.main'
                                                            : 'primary.main'
                                                }}
                                            >
                                                {doc.overallStatus === 'completed' ? (
                                                    <CompleteIcon fontSize="small" />
                                                ) : doc.overallStatus === 'failed' ? (
                                                    <ErrorIcon fontSize="small" />
                                                ) : (
                                                    getStageIcon(doc.currentStage, 'processing')
                                                )}
                                            </Avatar>
                                        </ListItemIcon>

                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {doc.filename}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {formatFileSize(doc.fileSize)}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <Box sx={{ mt: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {doc.status === 'indexed' ? 'Ready for search & chat'
                                                            : doc.status === 'processing' ? 'Extracting content...'
                                                                : doc.virusScanStatus === 'pending' ? 'Scanning for viruses...'
                                                                    : 'Processing...'}
                                                    </Typography>
                                                    {doc.overallStatus === 'processing' && (
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={progress}
                                                            sx={{
                                                                mt: 0.5,
                                                                height: 3,
                                                                borderRadius: 1.5,
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            }
                                        />

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip
                                                label={doc.status === 'indexed' ? 'Ready'
                                                    : doc.status === 'processing' ? 'Processing'
                                                        : doc.virusScanStatus === 'pending' ? 'Scanning'
                                                            : 'Uploaded'}
                                                size="small"
                                                color={getStatusColor(doc.overallStatus)}
                                                variant={doc.overallStatus === 'processing' ? 'filled' : 'outlined'}
                                            />

                                            {doc.overallStatus !== 'processing' && (
                                                <Tooltip title="Remove from list">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => removeDocument(doc.id)}
                                                    >
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Box>
                </Paper>
            </Slide>
        </>
    );
};
