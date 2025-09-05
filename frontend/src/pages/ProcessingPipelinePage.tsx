import React, { useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Chip,
    IconButton,
    Tooltip,
    Alert,
    AlertTitle
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Timeline as TimelineIcon,
    Speed as SpeedIcon,
    CheckCircle as CompleteIcon,
    Error as ErrorIcon,
    PlayArrow as ProcessingIcon
} from '@mui/icons-material';
import DocumentProcessingPipeline from '../components/DocumentProcessingPipeline';
import { useDocumentProcessing } from '../hooks/useDocumentProcessing';

const ProcessingPipelinePage: React.FC = () => {
    const {
        processingDocuments,
        retryProcessing,
        cancelProcessing,
        getProcessingStats,
        isConnected
    } = useDocumentProcessing();

    const stats = getProcessingStats();

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            // Trigger a refresh if needed
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TimelineIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Processing Pipeline
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                        icon={isConnected ? <CheckCircle /> : <ErrorIcon />}
                        label={isConnected ? 'Connected' : 'Disconnected'}
                        color={isConnected ? 'success' : 'error'}
                        size="small"
                    />
                    <Tooltip title="Refresh">
                        <IconButton>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Connection Status Alert */}
            {!isConnected && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    <AlertTitle>Real-time Updates Unavailable</AlertTitle>
                    WebSocket connection lost. Processing status may not update automatically.
                </Alert>
            )}

            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: 'primary.50', borderLeft: '4px solid', borderColor: 'primary.main' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                        {stats.total}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Documents
                                    </Typography>
                                </Box>
                                <SpeedIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: 'warning.50', borderLeft: '4px solid', borderColor: 'warning.main' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                                        {stats.processing}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Processing
                                    </Typography>
                                </Box>
                                <ProcessingIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: 'success.50', borderLeft: '4px solid', borderColor: 'success.main' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                                        {stats.completed}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Completed
                                    </Typography>
                                </Box>
                                <CompleteIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: 'error.50', borderLeft: '4px solid', borderColor: 'error.main' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                                        {stats.failed}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Failed
                                    </Typography>
                                </Box>
                                <ErrorIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.7 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Pipeline Visualization */}
            <Paper sx={{ p: 2, borderRadius: 3 }}>
                <DocumentProcessingPipeline
                    documents={processingDocuments}
                    onRetry={retryProcessing}
                    onCancel={cancelProcessing}
                />
            </Paper>

            {/* Processing Tips */}
            {processingDocuments.length > 0 && (
                <Paper sx={{ p: 3, mt: 3, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'info.main' }}>
                        💡 Processing Tips
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">
                                • Large documents may take several minutes to process completely
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                • Vector embedding generation (Weaviate) is the most time-intensive step
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">
                                • Failed documents can be retried by expanding and using the retry button
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                • Processing continues in the background even if you navigate away
                            </Typography>
                        </Grid>
                    </Grid>
                </Paper>
            )}
        </Box>
    );
};

export default ProcessingPipelinePage;
