import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Checkbox,
    Paper,
    Chip,
    IconButton,
    Alert,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tabs,
    Tab,
    Grid,
} from '@mui/material';
import {
    Chat as ChatIcon,
    Close as CloseIcon,
    Description as DocumentIcon,
    SelectAll as SelectAllIcon,
    Clear as ClearIcon,

    SmartToy as AIIcon,
} from '@mui/icons-material';

interface Document {
    id: string;
    uuid: string;
    filename: string;
    title: string;
    file_type: string;
    status: string;
    file_size: number;
    created_at: string;
}

interface EnhancedDocumentChatSelectorProps {
    open: boolean;
    onClose: () => void;
    documents: Document[];
    onStartChat: (documentIds: string[], modelSettings: ModelSettings) => void;
}

interface ModelSettings {
    model: string;
    temperature: number;
    maxTokens: number;
}

const AVAILABLE_MODELS = [
    { value: 'gpt-oss:120b', label: 'GPT-OSS 120B (Best Quality)', description: 'Large model for complex reasoning' },
    { value: 'deepseek-r1:70b', label: 'DeepSeek R1 70B (Fast)', description: 'Advanced reasoning and code' },
    { value: 'kimi-k2:72b', label: 'Kimi K2 72B (Multilingual)', description: 'Strong context understanding' },
    { value: 'qwen2.5vl:72b', label: 'Qwen2.5VL 72B (Vision)', description: 'Document understanding with OCR' },
    { value: 'gpt-oss:20b', label: 'GPT-OSS 20B (Balanced)', description: 'Good balance of speed and quality' },
];

export const EnhancedDocumentChatSelector: React.FC<EnhancedDocumentChatSelectorProps> = ({
    open,
    onClose,
    documents,
    onStartChat,
}) => {
    const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [modelSettings, setModelSettings] = useState<ModelSettings>({
        model: 'gpt-oss:20b',
        temperature: 0.7,
        maxTokens: 1000,
    });

    useEffect(() => {
        if (!open) {
            setSelectedDocuments([]);
            setSearchTerm('');
            setTabValue(0);
        } else {
            console.log('Dialog opened with documents:', documents);
        }
    }, [open, documents]);

    const handleDocumentToggle = (documentId: string) => {
        setSelectedDocuments(prev =>
            prev.includes(documentId)
                ? prev.filter(id => id !== documentId)
                : [...prev, documentId]
        );
    };

    const handleSelectAll = () => {
        const filteredDocs = getFilteredDocuments();
        const allSelected = filteredDocs.every(doc => selectedDocuments.includes(doc.uuid));

        if (allSelected) {
            setSelectedDocuments(prev =>
                prev.filter(id => !filteredDocs.some(doc => doc.uuid === id))
            );
        } else {
            const newSelections = filteredDocs
                .filter(doc => !selectedDocuments.includes(doc.uuid))
                .map(doc => doc.uuid);
            setSelectedDocuments(prev => [...prev, ...newSelections]);
        }
    };

    const getFilteredDocuments = () => {
        // If no search term, return all indexed documents
        if (!searchTerm) {
            return documents.filter(doc => doc.status === 'indexed');
        }

        // If there's a search term, filter the passed documents
        // (The parent should pass pre-filtered documents from the API)
        return documents.filter(doc => {
            const isIndexed = doc.status === 'indexed';
            const matchesSearch =
                doc.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.title?.toLowerCase().includes(searchTerm.toLowerCase());
            return isIndexed && matchesSearch;
        });
    };

    const handleStartChat = () => {
        if (selectedDocuments.length === 0) return;
        onStartChat(selectedDocuments, modelSettings);
        onClose();
    };

    const getSelectedDocumentTitles = () => {
        return documents
            .filter(doc => selectedDocuments.includes(doc.uuid))
            .map(doc => doc.title || doc.filename)
            .slice(0, 3)
            .join(', ') + (selectedDocuments.length > 3 ? '...' : '');
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const filteredDocuments = getFilteredDocuments();
    const indexedDocuments = documents.filter(doc => doc.status === 'indexed');

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { height: '85vh', maxHeight: '800px' }
            }}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AIIcon color="primary" />
                        <Typography variant="h6">
                            AI Document Chat
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label={`Documents (${indexedDocuments.length})`} />
                    <Tab label="AI Settings" />
                </Tabs>

                {/* Documents Tab */}
                {tabValue === 0 && (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Select documents to chat with. You can ask questions, get summaries, analyze sentiment,
                            or compare multiple documents using AI.
                        </Typography>

                        {/* Search */}
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search documents..."
                            value={searchTerm}
                            onChange={(e) => {
                                console.log('Search term changed:', e.target.value);
                                setSearchTerm(e.target.value);
                            }}
                            sx={{ mb: 2 }}
                        />

                        {/* Selection Controls */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Button
                                size="small"
                                startIcon={<SelectAllIcon />}
                                onClick={handleSelectAll}
                                disabled={filteredDocuments.length === 0}
                            >
                                {filteredDocuments.every(doc => selectedDocuments.includes(doc.uuid))
                                    ? 'Deselect All'
                                    : 'Select All'
                                }
                            </Button>

                            <Button
                                size="small"
                                startIcon={<ClearIcon />}
                                onClick={() => setSelectedDocuments([])}
                                disabled={selectedDocuments.length === 0}
                            >
                                Clear
                            </Button>

                            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                                {selectedDocuments.length} selected
                            </Typography>
                        </Box>

                        {/* Document List */}
                        <Paper variant="outlined" sx={{ maxHeight: 350, overflow: 'auto' }}>
                            {filteredDocuments.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <DocumentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                    <Typography color="text.secondary">
                                        {searchTerm ? 'No documents match your search' : 'No indexed documents available'}
                                    </Typography>
                                    {!searchTerm && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                            Documents must be indexed before they can be used for chat
                                        </Typography>
                                    )}
                                </Box>
                            ) : (
                                <List sx={{ py: 0 }}>
                                    {filteredDocuments.map((doc, index) => (
                                        <React.Fragment key={doc.uuid}>
                                            <ListItem
                                                button
                                                onClick={() => handleDocumentToggle(doc.uuid)}
                                                sx={{
                                                    py: 1.5,
                                                    '&:hover': { bgcolor: 'action.hover' }
                                                }}
                                            >
                                                <ListItemIcon>
                                                    <Checkbox
                                                        checked={selectedDocuments.includes(doc.uuid)}
                                                        tabIndex={-1}
                                                        disableRipple
                                                        color="primary"
                                                    />
                                                </ListItemIcon>
                                                <ListItemIcon>
                                                    <DocumentIcon color="primary" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                            {doc.title || doc.filename}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                            <Chip
                                                                label={doc.file_type.toUpperCase()}
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{ height: 20, fontSize: '0.7rem' }}
                                                            />
                                                            <Chip
                                                                label={formatFileSize(doc.file_size)}
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{ height: 20, fontSize: '0.7rem' }}
                                                            />
                                                            <Typography variant="caption" color="text.secondary">
                                                                {new Date(doc.created_at).toLocaleDateString()}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                            {index < filteredDocuments.length - 1 && <Divider />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            )}
                        </Paper>

                        {/* Selected Documents Summary */}
                        {selectedDocuments.length > 0 && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                <Typography variant="body2">
                                    <strong>Ready to chat with:</strong> {getSelectedDocumentTitles()}
                                    {selectedDocuments.length > 1 && (
                                        <span> • You can compare and analyze multiple documents together</span>
                                    )}
                                </Typography>
                            </Alert>
                        )}
                    </Box>
                )}

                {/* AI Settings Tab */}
                {tabValue === 1 && (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            AI Model Configuration
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Choose the AI model and settings for your conversation. Different models have different strengths.
                        </Typography>

                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>AI Model</InputLabel>
                                    <Select
                                        value={modelSettings.model}
                                        label="AI Model"
                                        onChange={(e) => setModelSettings(prev => ({ ...prev, model: e.target.value }))}
                                    >
                                        {AVAILABLE_MODELS.map((model) => (
                                            <MenuItem key={model.value} value={model.value}>
                                                <Box>
                                                    <Typography variant="body1">{model.label}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {model.description}
                                                    </Typography>
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Temperature"
                                    type="number"
                                    value={modelSettings.temperature}
                                    onChange={(e) => setModelSettings(prev => ({
                                        ...prev,
                                        temperature: Math.max(0, Math.min(1, parseFloat(e.target.value) || 0))
                                    }))}
                                    inputProps={{ min: 0, max: 1, step: 0.1 }}
                                    helperText="0 = focused, 1 = creative"
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Max Tokens"
                                    type="number"
                                    value={modelSettings.maxTokens}
                                    onChange={(e) => setModelSettings(prev => ({
                                        ...prev,
                                        maxTokens: Math.max(100, Math.min(4000, parseInt(e.target.value) || 1000))
                                    }))}
                                    inputProps={{ min: 100, max: 4000, step: 100 }}
                                    helperText="Response length limit"
                                />
                            </Grid>
                        </Grid>

                        <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                                <strong>Model Recommendations:</strong>
                                <br />• <strong>GPT-OSS 120B:</strong> Best for complex analysis and reasoning
                                <br />• <strong>Qwen2.5VL 72B:</strong> Best for document understanding and OCR
                                <br />• <strong>DeepSeek R1 70B:</strong> Fast and efficient for most tasks
                            </Typography>
                        </Alert>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
                <Button onClick={onClose} sx={{ mr: 1 }}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleStartChat}
                    disabled={selectedDocuments.length === 0}
                    startIcon={<ChatIcon />}
                    sx={{ minWidth: 200 }}
                >
                    Start AI Chat
                    {selectedDocuments.length > 0 && ` (${selectedDocuments.length})`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
