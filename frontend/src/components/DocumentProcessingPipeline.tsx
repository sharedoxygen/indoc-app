import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    LinearProgress,
    Chip,
    Avatar,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Card,
    CardContent,
    IconButton,
    Collapse,
    Badge,
    Tooltip,
    CircularProgress
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Security as VirusIcon,
    TextSnippet as ExtractIcon,
    Search as ElasticsearchIcon,
    Psychology as WeaviateIcon,
    Storage as PostgresIcon,
    CheckCircle as CompleteIcon,
    Error as ErrorIcon,
    ExpandMore as ExpandIcon,
    ExpandLess as CollapseIcon,
    PlayArrow as ProcessingIcon
} from '@mui/icons-material';
import { keyframes } from '@mui/system';

// Animation for processing steps
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
`;

const slideIn = keyframes`
  0% { transform: translateX(-20px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
`;

interface ProcessingStep {
    id: string;
    label: string;
    icon: React.ReactElement;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    message?: string;
    duration?: number;
    details?: string[];
}

interface DocumentProcessingState {
    documentId: string;
    filename: string;
    fileType: string;
    fileSize: number;
    status: 'uploaded' | 'processing' | 'indexed' | 'failed';
    currentStep: string;
    steps: ProcessingStep[];
    startTime: Date;
    estimatedCompletion?: Date;
    errorMessage?: string;
}

interface DocumentProcessingPipelineProps {
    documents: DocumentProcessingState[];
    onRetry?: (documentId: string) => void;
    onCancel?: (documentId: string) => void;
}

const DocumentProcessingPipeline: React.FC<DocumentProcessingPipelineProps> = ({
    documents,
    onRetry,
    onCancel
}) => {
    const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

    const toggleExpanded = (docId: string) => {
        const newExpanded = new Set(expandedDocs);
        if (newExpanded.has(docId)) {
            newExpanded.delete(docId);
        } else {
            newExpanded.add(docId);
        }
        setExpandedDocs(newExpanded);
    };

    const getStepIcon = (step: ProcessingStep) => {
        if (step.status === 'completed') {
            return <CompleteIcon sx={{ color: 'success.main' }} />;
        }
        if (step.status === 'failed') {
            return <ErrorIcon sx={{ color: 'error.main' }} />;
        }
        if (step.status === 'processing') {
            return (
                <Box sx={{ animation: `${pulse} 2s infinite` }}>
                    {step.icon}
                </Box>
            );
        }
        return step.icon;
    };

    const getOverallProgress = (doc: DocumentProcessingState) => {
        const completedSteps = doc.steps.filter(s => s.status === 'completed').length;
        return (completedSteps / doc.steps.length) * 100;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'success';
            case 'processing': return 'primary';
            case 'failed': return 'error';
            default: return 'default';
        }
    };

    const formatDuration = (startTime: Date) => {
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);

        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 2 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                📊 Document Processing Pipeline
            </Typography>

            {documents.map((doc) => {
                const isExpanded = expandedDocs.has(doc.documentId);
                const overallProgress = getOverallProgress(doc);
                const currentStepIndex = doc.steps.findIndex(s => s.status === 'processing');

                return (
                    <Card
                        key={doc.documentId}
                        sx={{
                            mb: 2,
                            animation: `${slideIn} 0.5s ease-out`,
                            border: doc.status === 'processing' ? '2px solid' : '1px solid',
                            borderColor: doc.status === 'processing' ? 'primary.main' : 'divider',
                            overflow: 'hidden', // Prevent animation bleeding
                            position: 'relative'
                        }}
                    >
                        <CardContent>
                            {/* Document Header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                                    {doc.fileType.toUpperCase().slice(0, 2)}
                                </Avatar>

                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        {doc.filename}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {(doc.fileSize / 1024 / 1024).toFixed(2)} MB • {formatDuration(doc.startTime)}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip
                                        label={doc.status.toUpperCase()}
                                        color={getStatusColor(doc.status) as any}
                                        size="small"
                                        icon={doc.status === 'processing' ? <ProcessingIcon /> : undefined}
                                    />

                                    <IconButton onClick={() => toggleExpanded(doc.documentId)}>
                                        {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                                    </IconButton>
                                </Box>
                            </Box>

                            {/* Overall Progress */}
                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        Overall Progress
                                    </Typography>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700,
                                            color: overallProgress === 100 ? 'success.main' : 'primary.main',
                                            textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                            fontSize: '1.1rem'
                                        }}
                                    >
                                        {Math.round(overallProgress)}%
                                    </Typography>
                                </Box>
                                <Box sx={{ position: 'relative' }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={overallProgress}
                                        sx={{
                                            height: 12,
                                            borderRadius: 6,
                                            bgcolor: 'grey.300',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 6,
                                                background: overallProgress === 100
                                                    ? 'linear-gradient(90deg, #4CAF50, #81C784)'
                                                    : 'linear-gradient(90deg, #1976d2, #42a5f5, #64b5f6)',
                                                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.4)'
                                            }
                                        }}
                                    />
                                    {/* Progress Glow Effect */}
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: '100%',
                                            borderRadius: 6,
                                            background: `linear-gradient(90deg, transparent ${Math.max(0, overallProgress - 10)}%, rgba(255,255,255,0.3) ${overallProgress}%, transparent ${Math.min(100, overallProgress + 10)}%)`,
                                            pointerEvents: 'none'
                                        }}
                                    />
                                </Box>
                            </Box>

                            {/* Current Step Highlight */}
                            {currentStepIndex >= 0 && (
                                <Paper
                                    sx={{
                                        p: 2,
                                        mb: 2,
                                        bgcolor: 'primary.50',
                                        border: '1px solid',
                                        borderColor: 'primary.200',
                                        animation: `${pulse} 3s infinite`,
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <CircularProgress size={24} />
                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                Currently: {doc.steps[currentStepIndex].label}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            size="small"
                                            color="primary"
                                            variant="filled"
                                            label="Auto Processing"
                                            sx={{
                                                fontSize: '0.75rem',
                                                opacity: 0.9,
                                                '&:hover': {
                                                    opacity: 1,
                                                    transition: 'opacity 0.3s ease',
                                                }
                                            }}
                                        />
                                    </Box>
                                    {doc.steps[currentStepIndex].message && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                            {doc.steps[currentStepIndex].message}
                                        </Typography>
                                    )}
                                </Paper>
                            )}

                            {/* Detailed Steps */}
                            <Collapse in={isExpanded}>
                                <Stepper orientation="vertical" sx={{ mt: 2 }}>
                                    {doc.steps.map((step, index) => (
                                        <Step key={step.id} active={step.status !== 'pending'} completed={step.status === 'completed'}>
                                            <StepLabel
                                                icon={
                                                    <Badge
                                                        badgeContent={step.status === 'processing' ? <CircularProgress size={12} /> : null}
                                                        overlap="circular"
                                                    >
                                                        {getStepIcon(step)}
                                                    </Badge>
                                                }
                                                error={step.status === 'failed'}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            fontWeight: step.status === 'processing' ? 600 : 400,
                                                            color: step.status === 'failed' ? 'error.main' : 'text.primary'
                                                        }}
                                                    >
                                                        {step.label}
                                                    </Typography>

                                                    {step.status === 'processing' && step.progress !== undefined && (
                                                        <Chip
                                                            label={`${step.progress}%`}
                                                            size="small"
                                                            color="primary"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                </Box>
                                            </StepLabel>

                                            <StepContent>
                                                {step.message && (
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                        {step.message}
                                                    </Typography>
                                                )}

                                                {step.details && step.details.length > 0 && (
                                                    <Box sx={{ ml: 2 }}>
                                                        {step.details.map((detail, idx) => (
                                                            <Typography
                                                                key={idx}
                                                                variant="caption"
                                                                display="block"
                                                                color="text.secondary"
                                                            >
                                                                • {detail}
                                                            </Typography>
                                                        ))}
                                                    </Box>
                                                )}

                                                {step.status === 'processing' && step.progress !== undefined && (
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={step.progress}
                                                        sx={{ mt: 1, width: 200 }}
                                                    />
                                                )}
                                            </StepContent>
                                        </Step>
                                    ))}
                                </Stepper>
                            </Collapse>

                            {/* Error Message */}
                            {doc.status === 'failed' && doc.errorMessage && (
                                <Paper sx={{ p: 2, mt: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
                                    <Typography variant="body2" color="error.main">
                                        <strong>Error:</strong> {doc.errorMessage}
                                    </Typography>
                                </Paper>
                            )}
                        </CardContent>
                    </Card>
                );
            })}

            {documents.length === 0 && (
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="h6" color="text.secondary">
                        No documents currently processing
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Upload documents to see the real-time processing pipeline
                    </Typography>
                </Paper>
            )}
        </Box>
    );
};

// Default pipeline steps template
export const createDefaultPipelineSteps = (filename: string): ProcessingStep[] => [
    {
        id: 'upload',
        label: '📁 File Upload',
        icon: <UploadIcon />,
        status: 'completed',
        message: `${filename} uploaded successfully`,
        details: ['File saved to storage', 'Metadata recorded']
    },
    {
        id: 'virus_scan',
        label: '🦠 Virus Scan',
        icon: <VirusIcon />,
        status: 'processing',
        progress: 0,
        message: 'Scanning for malware and threats...',
        details: ['ClamAV engine', 'Signature database check']
    },
    {
        id: 'text_extraction',
        label: '📝 Text Extraction',
        icon: <ExtractIcon />,
        status: 'pending',
        message: 'Extract text content from document',
        details: ['OCR processing', 'Content parsing', 'Metadata extraction']
    },
    {
        id: 'elasticsearch_index',
        label: '🔍 Elasticsearch Indexing',
        icon: <ElasticsearchIcon />,
        status: 'pending',
        message: 'Creating keyword search index',
        details: ['Field boosting', 'Analyzer configuration', 'Index optimization']
    },
    {
        id: 'weaviate_index',
        label: '🧠 Weaviate Vector Index',
        icon: <WeaviateIcon />,
        status: 'pending',
        message: 'Generating semantic embeddings',
        details: ['BERT transformers', 'Vector generation', 'Similarity indexing']
    },
    {
        id: 'postgresql_update',
        label: '🐘 PostgreSQL Update',
        icon: <PostgresIcon />,
        status: 'pending',
        message: 'Updating database indexes',
        details: ['GIN indexes', 'Trigram indexes', 'Full-text search']
    }
];

export default DocumentProcessingPipeline;
