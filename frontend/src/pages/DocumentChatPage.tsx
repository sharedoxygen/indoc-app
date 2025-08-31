import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Chip,
    IconButton,
    Toolbar,
    AppBar,
    Button,
    Card,
    CardContent,
    Divider,
    Alert,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Download as DownloadIcon,
    Share as ShareIcon,
    Visibility as ViewIcon,
    Chat as ChatIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { DocumentChatInterface } from '../components/DocumentChatInterface';

interface DocumentInfo {
    id: string;
    uuid: string;
    filename: string;
    title: string;
    description: string;
    file_type: string;
    file_size: number;
    status: string;
    virus_scan_status: string;
    tags: string[];
    created_at: string;
    updated_at: string;
    full_text?: string;
    metadata?: any;
}

export const DocumentChatPage: React.FC = () => {
    const { documentId } = useParams<{ documentId: string }>();
    const navigate = useNavigate();
    const [document, setDocument] = useState<DocumentInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showChat, setShowChat] = useState(true);

    useEffect(() => {
        if (documentId) {
            fetchDocument();
        }
    }, [documentId]);

    const fetchDocument = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/v1/files/${documentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setDocument(data);
            } else {
                setError('Failed to load document');
            }
        } catch (error) {
            console.error('Error fetching document:', error);
            setError('Error loading document');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/documents');
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'indexed': return 'success';
            case 'processing': return 'warning';
            case 'failed': return 'error';
            default: return 'default';
        }
    };

    const getVirusStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'clean': return 'success';
            case 'infected': return 'error';
            case 'scanning': return 'warning';
            default: return 'default';
        }
    };

    if (loading) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>Loading document...</Typography>
            </Box>
        );
    }

    if (error || !document) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    {error || 'Document not found'}
                </Alert>
                <Button onClick={handleBack} sx={{ mt: 2 }}>
                    Back to Documents
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <AppBar position="static" color="default" elevation={1}>
                <Toolbar>
                    <IconButton onClick={handleBack} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>

                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" noWrap>
                            {document.title || document.filename}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {document.file_type.toUpperCase()} • {formatFileSize(document.file_size)}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip
                            label={document.status}
                            color={getStatusColor(document.status)}
                            size="small"
                        />
                        <Chip
                            label={`Virus: ${document.virus_scan_status}`}
                            color={getVirusStatusColor(document.virus_scan_status)}
                            size="small"
                        />

                        <IconButton>
                            <ViewIcon />
                        </IconButton>
                        <IconButton>
                            <DownloadIcon />
                        </IconButton>
                        <IconButton>
                            <ShareIcon />
                        </IconButton>

                        <Button
                            variant={showChat ? "contained" : "outlined"}
                            startIcon={<ChatIcon />}
                            onClick={() => setShowChat(!showChat)}
                            sx={{ ml: 2 }}
                        >
                            Chat
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Main Content */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Document Content */}
                <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
                    <Grid container spacing={3}>
                        {/* Document Info */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Document Information
                                    </Typography>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Filename
                                            </Typography>
                                            <Typography variant="body1">
                                                {document.filename}
                                            </Typography>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                File Type
                                            </Typography>
                                            <Typography variant="body1">
                                                {document.file_type.toUpperCase()}
                                            </Typography>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Size
                                            </Typography>
                                            <Typography variant="body1">
                                                {formatFileSize(document.file_size)}
                                            </Typography>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Created
                                            </Typography>
                                            <Typography variant="body1">
                                                {new Date(document.created_at).toLocaleString()}
                                            </Typography>
                                        </Grid>

                                        {document.description && (
                                            <Grid item xs={12}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Description
                                                </Typography>
                                                <Typography variant="body1">
                                                    {document.description}
                                                </Typography>
                                            </Grid>
                                        )}

                                        {document.tags && document.tags.length > 0 && (
                                            <Grid item xs={12}>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    Tags
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                    {document.tags.map((tag, index) => (
                                                        <Chip key={index} label={tag} size="small" />
                                                    ))}
                                                </Box>
                                            </Grid>
                                        )}
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Document Content Preview */}
                        {document.full_text && (
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Content Preview
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                        <Paper
                                            sx={{
                                                p: 2,
                                                bgcolor: 'grey.50',
                                                maxHeight: 400,
                                                overflow: 'auto',
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                component="pre"
                                                sx={{
                                                    whiteSpace: 'pre-wrap',
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.875rem',
                                                    lineHeight: 1.6,
                                                }}
                                            >
                                                {document.full_text.substring(0, 2000)}
                                                {document.full_text.length > 2000 && '\n\n... (truncated)'}
                                            </Typography>
                                        </Paper>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}

                        {/* AI Analysis Suggestions */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        AI Analysis
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        Start a conversation with this document to get insights, summaries, and answers to your questions.
                                    </Typography>

                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip
                                            label="📋 Get Summary"
                                            clickable
                                            onClick={() => setShowChat(true)}
                                        />
                                        <Chip
                                            label="😊 Analyze Sentiment"
                                            clickable
                                            onClick={() => setShowChat(true)}
                                        />
                                        <Chip
                                            label="🔍 Extract Key Points"
                                            clickable
                                            onClick={() => setShowChat(true)}
                                        />
                                        <Chip
                                            label="👥 Find Entities"
                                            clickable
                                            onClick={() => setShowChat(true)}
                                        />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            </Box>

            {/* Chat Interface */}
            {showChat && (
                <DocumentChatInterface
                    documentId={document.uuid}
                    documentTitle={document.title || document.filename}
                    onClose={() => setShowChat(false)}
                />
            )}
        </Box>
    );
};

export default DocumentChatPage;
