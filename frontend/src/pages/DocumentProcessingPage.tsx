import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    Chip,
    IconButton,
    Tooltip,
    Alert,
    AlertTitle,
    Tabs,
    Tab,
    Badge,
    Button,
    LinearProgress,
    Fade,
    Zoom,
    Slide,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    InputAdornment,
    Snackbar,
    Alert as MuiAlert,
    Stepper,
    Step,
    StepLabel,
    StepConnector,
    StepIconProps
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Timeline as TimelineIcon,
    Speed as SpeedIcon,
    CheckCircle as CompleteIcon,
    Error as ErrorIcon,
    PlayArrow as ProcessingIcon,
    Queue as QueueIcon,
    Assessment as StatsIcon,
    FilterList as FilterIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    MoreVert as MoreVertIcon,
    Refresh as RetryIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    Upload as UploadIcon,
    Security as VirusIcon,
    TextSnippet as ExtractIcon,
    Psychology as WeaviateIcon,
    Storage as PostgresIcon,
    CloudUpload,
    TrendingUp as TrendingUpIcon,
    Schedule as ScheduleIcon
} from '@mui/icons-material';
import { keyframes } from '@mui/system';
import { styled } from '@mui/system';

import DocumentProcessingPipeline from '../components/DocumentProcessingPipeline';
import PipelineTimeline from '../components/PipelineTimeline';
import { useDocumentProcessing } from '../hooks/useDocumentProcessing';
import { createDefaultPipelineSteps } from '../components/DocumentProcessingPipeline';
import {
    useGetDocumentsQuery,
    useDeleteDocumentMutation,
    useRetryDocumentMutation
} from '../store/api';

// Enhanced animations
const flowAnimation = keyframes`
    0% { transform: translateX(-100%); opacity: 0; }
    50% { transform: translateX(0); opacity: 1; }
    100% { transform: translateX(100%); opacity: 0; }
`;

const pulseGlow = keyframes`
    0% { box-shadow: 0 0 8px rgba(25, 118, 210, 0.4) inset, 0 0 15px rgba(25, 118, 210, 0.2); }
    50% { box-shadow: 0 0 15px rgba(25, 118, 210, 0.8) inset, 0 0 25px rgba(25, 118, 210, 0.4); }
    100% { box-shadow: 0 0 8px rgba(25, 118, 210, 0.4) inset, 0 0 15px rgba(25, 118, 210, 0.2); }
`;

const shimmer = keyframes`
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
`;

const countUp = keyframes`
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
`;

const pulse = keyframes`
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
    100% { transform: scale(1); opacity: 1; }
`;

// Styled connector
const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
    alternativeLabel: { top: 22 },
    active: { '& .MuiStepConnector-line': { backgroundColor: theme.palette.primary.main, transition: 'background-color 0.6s ease' } },
    completed: { '& .MuiStepConnector-line': { backgroundColor: theme.palette.success.main } },
    line: { height: 4, border: 0, backgroundColor: theme.palette.grey[300], borderRadius: 2 }
}));

// Custom step icon root
const ColorlibStepIconRoot = styled('div')<StepIconProps & { status: string }>(({ theme, ownerState }) => ({
    backgroundColor:
        ownerState.status === 'completed' ? theme.palette.success.main :
            ownerState.status === 'processing' ? theme.palette.primary.main : theme.palette.grey[400],
    zIndex: 1,
    color: theme.palette.common.white,
    width: 40,
    height: 40,
    display: 'flex',
    borderRadius: '50%',
    justifyContent: 'center',
    alignItems: 'center',
    ...(ownerState.active && { boxShadow: `0 0 10px rgba(66, 165, 245, 0.6)` })
}));

function ColorlibStepIcon(props: StepIconProps & { status: string }) {
    const { active, completed, className, status } = props;
    return (
        <ColorlibStepIconRoot ownerState={{ completed, active, status }}>
            {/* You can render icons based on status */}
            {completed ? <CompleteIcon /> : <ProcessingIcon />}
        </ColorlibStepIconRoot>
    );
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`document-processing-tabpanel-${index}`}
            aria-labelledby={`document-processing-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

const DocumentProcessingPage: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'uploaded' | 'processing' | 'text_extracted' | 'failed'>('all');
    const [refreshKey, setRefreshKey] = useState(0);
    const [showStats, setShowStats] = useState(true);
    // Document processing hook
    const {
        processingDocuments,
        retryProcessing,
        cancelProcessing,
        getProcessingStats,
        isConnected
    } = useDocumentProcessing();

    // API queries
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

    // Derived state
    const allDocuments = documentsData?.documents || [];
    const queueDocuments = allDocuments.filter((doc: any) => doc.status !== 'indexed');
    const failedDocuments = allDocuments.filter((doc: any) => doc.status === 'failed');
    const activeDocuments = allDocuments.filter((doc: any) =>
        doc.status === 'uploaded' || doc.status === 'processing' || doc.status === 'text_extracted'
    );

    const stats = useMemo(() => {
        if (processingDocuments.length > 0) {
            return getProcessingStats();
        }

        return {
            total: allDocuments.length,
            processing: activeDocuments.length,
            completed: allDocuments.filter((doc: any) => doc.status === 'indexed').length,
            failed: failedDocuments.length
        };
    }, [processingDocuments, allDocuments, activeDocuments, failedDocuments, getProcessingStats]);

    // Use real processing documents from WebSocket, with fallback to processing documents from API
    const pipelineDocuments = useMemo(() => {
        // Priority 1: Real-time processing documents from WebSocket
        if (processingDocuments.length > 0) {
            return processingDocuments;
        }

        // Priority 2: Documents that are currently processing (from API)
        const processingFromApi = allDocuments.filter((doc: any) =>
            doc.status === 'processing' || doc.status === 'uploaded' || doc.status === 'text_extracted'
        );

        if (processingFromApi.length > 0) {
            return processingFromApi.map((doc: any) => {
                try {
                    // Determine current step based on status
                    let currentStep = 'upload';
                    let stepStatuses: { index: number; status: string; progress?: number }[] = [];

                    if (doc.status === 'uploaded') {
                        currentStep = 'virus_scan';
                        stepStatuses = [
                            { index: 0, status: 'completed' },
                            { index: 1, status: 'processing', progress: 25 }
                        ];
                    } else if (doc.status === 'processing') {
                        currentStep = 'text_extraction';
                        stepStatuses = [
                            { index: 0, status: 'completed' },
                            { index: 1, status: 'completed' },
                            { index: 2, status: 'processing', progress: 60 }
                        ];
                    } else if (doc.status === 'text_extracted') {
                        currentStep = 'elasticsearch_index';
                        stepStatuses = [
                            { index: 0, status: 'completed' },
                            { index: 1, status: 'completed' },
                            { index: 2, status: 'completed' },
                            { index: 3, status: 'processing', progress: 80 }
                        ];
                    }

                    return {
                        documentId: doc.uuid || doc.id,
                        filename: doc.filename || `document.pdf`,
                        fileType: doc.filename?.split('.').pop() || 'pdf',
                        fileSize: doc.file_size || 1024000,
                        status: doc.status,
                        currentStep: currentStep,
                        steps: createDefaultPipelineSteps(doc.filename || 'document.pdf').map((step, stepIndex) => {
                            const stepStatus = stepStatuses.find(s => s.index === stepIndex);
                            if (stepStatus) {
                                return {
                                    ...step,
                                    status: stepStatus.status,
                                    progress: stepStatus.progress
                                };
                            }
                            return { ...step, status: 'pending' };
                        }),
                        startTime: new Date(doc.created_at),
                    };
                } catch (error) {
                    console.error('Error creating pipeline document:', error);
                    return null;
                }
            }).filter(Boolean);
        }

        return [];
    }, [processingDocuments, allDocuments]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
        refetch();
    };

    // Replace manual fetch with RTK Query retryDocument mutation
    const handleStartProcessing = async () => {
        const uploadedDocs = allDocuments.filter((doc: any) => doc.status === 'uploaded');
        if (!uploadedDocs.length) return;

        console.log(`🚀 Enqueueing ${uploadedDocs.length} uploaded document(s) for processing`);
        for (const doc of uploadedDocs) {
            const docId = doc.uuid || doc.id;
            try {
                await retryDocument(docId).unwrap();
                console.log(`✅ Processing retried for document: ${doc.filename}`);
            } catch (error) {
                console.error(`❌ Failed to trigger processing for ${doc.filename}:`, error);
            }
        }
        // Refresh after queuing
        setTimeout(refetch, 1000);
    };

    // Add automatic processing trigger for uploaded documents
    useEffect(() => {
        if (allDocuments.some((doc: any) => doc.status === 'uploaded')) {
            console.log('🚀 Auto-triggering processing for uploaded documents');
            handleStartProcessing();
        }
    }, [allDocuments]);

    useEffect(() => {
        // Periodically check for uploaded documents and trigger processing
        const interval = setInterval(() => {
            const pendingCount = allDocuments.filter((doc: any) => doc.status === 'uploaded').length;
            if (pendingCount > 0) {
                console.log(`⏱️ Auto-triggering processing for ${pendingCount} pending document(s)`);
                handleStartProcessing();
            }
        }, 30000); // every 30 seconds

        return () => clearInterval(interval);
    }, [allDocuments]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'indexed': return 'success';
            case 'processing': return 'primary';
            case 'text_extracted': return 'info';
            case 'uploaded': return 'warning';
            case 'failed': return 'error';
            default: return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'indexed': return <CompleteIcon />;
            case 'processing': return <ProcessingIcon />;
            case 'text_extracted': return <ExtractIcon />;
            case 'uploaded': return <UploadIcon />;
            case 'failed': return <ErrorIcon />;
            default: return <ScheduleIcon />;
        }
    };

    const steps = pipelineDocuments[0]?.steps || [];
    const currentStepIdx = steps.findIndex(s => s.status === 'processing');
    const totalSteps = steps.length || 1;
    const markerPositions = steps.map((_, i) => 10 + (i / (totalSteps - 1)) * 80);

    return (
        <Box sx={{ width: '100%', maxWidth: '1400px', mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                <Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2
                        }}
                    >
                        <TimelineIcon sx={{ fontSize: 40, color: '#1976d2' }} />
                        Document Processing Center
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
                        Real-time document processing pipeline and queue management
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Refresh Data">
                        <IconButton
                            onClick={handleRefresh}
                            sx={{
                                bgcolor: 'background.paper',
                                boxShadow: 1,
                                '&:hover': { transform: 'rotate(180deg)', transition: 'transform 0.3s' }
                            }}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Chip
                        icon={isConnected ? <CompleteIcon /> : <ErrorIcon />}
                        label={isConnected ? 'Connected' : 'Disconnected'}
                        color={isConnected ? 'success' : 'error'}
                        variant="outlined"
                    />
                </Box>
            </Box>

            {/* Stats Dashboard */}
            <Fade in={showStats}>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                position: 'relative',
                                overflow: 'hidden',
                                transform: 'perspective(1000px) rotateX(0deg)',
                                transition: 'transform 0.3s ease',
                                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
                                '&:hover': {
                                    transform: 'perspective(1000px) rotateX(5deg) scale(1.02)',
                                    boxShadow: '0 12px 40px rgba(102, 126, 234, 0.6)'
                                },
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '4px',
                                    backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                                    backgroundSize: '200px 100%',
                                    animation: `${shimmer} 2s infinite`
                                }
                            }}
                        >
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="h3" sx={{ fontWeight: 700, animation: `${countUp} 0.6s ease-out` }}>
                                            {stats.total}
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                            Total Documents
                                        </Typography>
                                    </Box>
                                    <StatsIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card
                            sx={{
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                color: 'white',
                                animation: stats.processing > 0 ? `${pulseGlow} 2s infinite` : 'none',
                                transform: 'perspective(1000px) rotateX(0deg)',
                                transition: 'transform 0.3s ease',
                                boxShadow: stats.processing > 0
                                    ? '0 8px 32px rgba(240, 147, 251, 0.6)'
                                    : '0 8px 32px rgba(240, 147, 251, 0.3)',
                                '&:hover': {
                                    transform: 'perspective(1000px) rotateX(5deg) scale(1.02)',
                                    boxShadow: '0 12px 40px rgba(240, 147, 251, 0.8)'
                                }
                            }}
                        >
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="h3" sx={{ fontWeight: 700, animation: `${countUp} 0.8s ease-out` }}>
                                            {stats.processing}
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                            Processing
                                        </Typography>
                                    </Box>
                                    <ProcessingIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card
                            sx={{
                                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                color: 'white',
                                transform: 'perspective(1000px) rotateX(0deg)',
                                transition: 'transform 0.3s ease',
                                boxShadow: '0 8px 32px rgba(79, 172, 254, 0.4)',
                                '&:hover': {
                                    transform: 'perspective(1000px) rotateX(5deg) scale(1.02)',
                                    boxShadow: '0 12px 40px rgba(79, 172, 254, 0.6)'
                                }
                            }}
                        >
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="h3" sx={{ fontWeight: 700, animation: `${countUp} 1s ease-out` }}>
                                            {stats.completed}
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                            Completed
                                        </Typography>
                                    </Box>
                                    <CompleteIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card
                            sx={{
                                background: stats.failed > 0
                                    ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)'
                                    : 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)',
                                color: 'white',
                                transform: 'perspective(1000px) rotateX(0deg)',
                                transition: 'transform 0.3s ease',
                                boxShadow: stats.failed > 0
                                    ? '0 8px 32px rgba(255, 107, 107, 0.4)'
                                    : '0 8px 32px rgba(81, 207, 102, 0.4)',
                                animation: stats.failed > 0 ? `${pulseGlow} 3s infinite` : 'none',
                                '&:hover': {
                                    transform: 'perspective(1000px) rotateX(5deg) scale(1.02)',
                                    boxShadow: stats.failed > 0
                                        ? '0 12px 40px rgba(255, 107, 107, 0.6)'
                                        : '0 12px 40px rgba(81, 207, 102, 0.6)'
                                }
                            }}
                        >
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="h3" sx={{ fontWeight: 700, animation: `${countUp} 1.2s ease-out` }}>
                                            {stats.failed}
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                            Failed
                                        </Typography>
                                    </Box>
                                    <ErrorIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Fade>

            {/* Main Content with Tabs */}
            <Paper sx={{ width: '100%', bgcolor: 'background.paper' }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontSize: '1rem',
                            fontWeight: 600
                        }
                    }}
                >
                    <Tab
                        icon={<TimelineIcon />}
                        iconPosition="start"
                        label={
                            <Badge badgeContent={stats.processing} color="primary" showZero={false}>
                                Pipeline Visualization
                            </Badge>
                        }
                    />
                    <Tab
                        icon={<QueueIcon />}
                        iconPosition="start"
                        label={
                            <Badge badgeContent={queueDocuments.length} color="secondary" showZero={false}>
                                Processing Queue
                            </Badge>
                        }
                    />
                </Tabs>

                {/* Pipeline Visualization Tab */}
                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ p: 2 }}>
                        {/* Pipeline Timeline Visualization */}
                        <PipelineTimeline steps={steps.map(s => ({ id: s.id, label: s.label.replace(/[^A-Za-z]/g, ''), status: s.status }))} />

                        <DocumentProcessingPipeline
                            documents={pipelineDocuments}
                            onRetry={retryProcessing}
                            onCancel={cancelProcessing}
                        />

                        {pipelineDocuments.length === 0 && (
                            <Zoom in={true} timeout={1000}>
                                <Paper
                                    sx={{
                                        p: 6,
                                        textAlign: 'center',
                                        bgcolor: 'grey.50',
                                        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                                        borderRadius: 3
                                    }}
                                >
                                    <CloudUpload sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                                        No Active Processing
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                        Upload documents to see the real-time processing pipeline in action
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        onClick={() => window.location.href = '/upload'}
                                        sx={{
                                            borderRadius: 3,
                                            textTransform: 'none',
                                            px: 4,
                                            py: 1.5
                                        }}
                                    >
                                        Upload Documents
                                    </Button>
                                </Paper>
                            </Zoom>
                        )}
                    </Box>
                </TabPanel>

                {/* Processing Queue Tab */}
                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ p: 2 }}>
                        {/* Queue Filters */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                            <TextField
                                placeholder="Search documents..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                size="small"
                                sx={{ minWidth: 250 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchTerm && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearchTerm('')}>
                                                <ClearIcon />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />

                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Status Filter</InputLabel>
                                <Select
                                    value={filterStatus}
                                    label="Status Filter"
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                >
                                    <MenuItem value="all">All Status</MenuItem>
                                    <MenuItem value="uploaded">Uploaded</MenuItem>
                                    <MenuItem value="processing">Processing</MenuItem>
                                    <MenuItem value="text_extracted">Text Extracted</MenuItem>
                                    <MenuItem value="failed">Failed</MenuItem>
                                </Select>
                            </FormControl>

                            <Button
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={handleRefresh}
                                sx={{ textTransform: 'none' }}
                            >
                                Refresh
                            </Button>
                        </Box>

                        {/* Queue List */}
                        <Paper variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                            {isLoading ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <CircularProgress />
                                    <Typography variant="body2" sx={{ mt: 2 }}>
                                        Loading documents...
                                    </Typography>
                                </Box>
                            ) : queueDocuments.length > 0 ? (
                                <List>
                                    {queueDocuments.map((doc: any, index: number) => (
                                        <Slide
                                            in={true}
                                            timeout={300 + index * 100}
                                            direction="right"
                                            key={doc.id}
                                        >
                                            <ListItem
                                                sx={{
                                                    borderBottom: index < queueDocuments.length - 1 ? 1 : 0,
                                                    borderColor: 'divider',
                                                    '&:hover': {
                                                        bgcolor: 'action.hover'
                                                    }
                                                }}
                                            >
                                                <ListItemIcon>
                                                    {getStatusIcon(doc.status)}
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                            {doc.filename}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Box>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {((doc.file_size || 0) / 1024 / 1024).toFixed(2)} MB •
                                                                {new Date(doc.created_at).toLocaleString()}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                                                <Chip
                                                                    label={doc.status.replace('_', ' ').toUpperCase()}
                                                                    color={getStatusColor(doc.status) as any}
                                                                    size="small"
                                                                />
                                                                {doc.status === 'processing' && (
                                                                    <LinearProgress
                                                                        sx={{
                                                                            flexGrow: 1,
                                                                            maxWidth: 200,
                                                                            height: 6,
                                                                            borderRadius: 3
                                                                        }}
                                                                    />
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    }
                                                />
                                                <ListItemSecondaryAction>
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        {doc.status === 'failed' && (
                                                            <Tooltip title="Retry Processing">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => retryDocument({ id: doc.uuid || doc.id })}
                                                                >
                                                                    <RetryIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip title="View Details">
                                                            <IconButton size="small">
                                                                <ViewIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="More Options">
                                                            <IconButton size="small">
                                                                <MoreVertIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        </Slide>
                                    ))}
                                </List>
                            ) : (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <QueueIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                                    <Typography variant="h6" color="text.secondary">
                                        No documents in queue
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        All documents have been processed successfully
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    </Box>
                </TabPanel>
            </Paper>
        </Box>
    );
};

export default DocumentProcessingPage;
