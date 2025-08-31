import React, { useState } from 'react';
import {
    Fab,
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
} from '@mui/material';
import {
    Chat as ChatIcon,
    Close as CloseIcon,
    Description as DocumentIcon,
    SelectAll as SelectAllIcon,
    Clear as ClearIcon,
} from '@mui/icons-material';
import { DocumentChatInterface } from './DocumentChatInterface';

interface Document {
    id: string;
    uuid: string;
    filename: string;
    title: string;
    file_type: string;
    status: string;
}

export const GlobalChatFab: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleOpen = async () => {
        setOpen(true);
        await fetchDocuments();
    };

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/v1/files/list?limit=50', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setDocuments(data.documents || []);
            }
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            setLoading(false);
        }
    };

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
            // Deselect all filtered documents
            setSelectedDocuments(prev =>
                prev.filter(id => !filteredDocs.some(doc => doc.uuid === id))
            );
        } else {
            // Select all filtered documents
            const newSelections = filteredDocs
                .filter(doc => !selectedDocuments.includes(doc.uuid))
                .map(doc => doc.uuid);
            setSelectedDocuments(prev => [...prev, ...newSelections]);
        }
    };

    const getFilteredDocuments = () => {
        return documents.filter(doc =>
            doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.title?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const handleStartChat = () => {
        if (selectedDocuments.length === 0) {
            return;
        }

        setOpen(false);
        setChatOpen(true);
    };

    const getSelectedDocumentTitles = () => {
        return documents
            .filter(doc => selectedDocuments.includes(doc.uuid))
            .map(doc => doc.title || doc.filename)
            .join(', ');
    };

    const filteredDocuments = getFilteredDocuments();

    return (
        <>
            {/* Floating Action Button */}
            <Fab
                color="secondary"
                aria-label="chat"
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    left: 16,
                    zIndex: 1000,
                }}
                onClick={handleOpen}
            >
                <ChatIcon />
            </Fab>

            {/* Document Selection Dialog */}
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { height: '80vh' }
                }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6">
                            Start Document Conversation
                        </Typography>
                        <IconButton onClick={() => setOpen(false)}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Select one or more documents to chat with. You can ask questions, get summaries,
                        analyze sentiment, or compare multiple documents.
                    </Typography>

                    {/* Search */}
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ mb: 2 }}
                    />

                    {/* Selection Controls */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Button
                            size="small"
                            startIcon={<SelectAllIcon />}
                            onClick={handleSelectAll}
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
                            Clear Selection
                        </Button>

                        <Typography variant="body2" color="text.secondary">
                            {selectedDocuments.length} selected
                        </Typography>
                    </Box>

                    {/* Document List */}
                    <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {loading ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography>Loading documents...</Typography>
                            </Box>
                        ) : filteredDocuments.length === 0 ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography color="text.secondary">
                                    {searchTerm ? 'No documents match your search' : 'No documents available'}
                                </Typography>
                            </Box>
                        ) : (
                            <List>
                                {filteredDocuments.map((doc, index) => (
                                    <React.Fragment key={doc.uuid}>
                                        <ListItem
                                            button
                                            onClick={() => handleDocumentToggle(doc.uuid)}
                                            sx={{ pl: 1 }}
                                        >
                                            <ListItemIcon>
                                                <Checkbox
                                                    checked={selectedDocuments.includes(doc.uuid)}
                                                    tabIndex={-1}
                                                    disableRipple
                                                />
                                            </ListItemIcon>
                                            <ListItemIcon>
                                                <DocumentIcon color="primary" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={doc.title || doc.filename}
                                                secondary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                        <Chip
                                                            label={doc.file_type.toUpperCase()}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                        <Chip
                                                            label={doc.status}
                                                            size="small"
                                                            color={doc.status === 'indexed' ? 'success' : 'default'}
                                                        />
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
                                <strong>Selected:</strong> {getSelectedDocumentTitles()}
                            </Typography>
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleStartChat}
                        disabled={selectedDocuments.length === 0}
                        startIcon={<ChatIcon />}
                    >
                        Start Chat ({selectedDocuments.length})
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Multi-Document Chat Interface */}
            {chatOpen && (
                <DocumentChatInterface
                    documentId={selectedDocuments.length === 1 ? selectedDocuments[0] : undefined}
                    documentTitle={
                        selectedDocuments.length === 1
                            ? documents.find(d => d.uuid === selectedDocuments[0])?.title || 'Document'
                            : `${selectedDocuments.length} Documents`
                    }
                    onClose={() => setChatOpen(false)}
                />
            )}
        </>
    );
};
