import React from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Chip,
    Checkbox,
    CardActions,
} from '@mui/material';

import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Document {
    uuid: string;
    filename: string;
    title: string;
    description: string;
    file_type: string;
    file_size: number;
    created_at: string;
}

interface DocumentsListProps {
    documents: Document[];
    isLoading: boolean;
    selectedDocuments: string[];
    onDocumentSelect: (selected: string[]) => void;
    searchTerm?: string;
}

export const DocumentsList: React.FC<DocumentsListProps> = ({ documents, isLoading, selectedDocuments, onDocumentSelect, searchTerm }) => {
    const navigate = useNavigate();

    const handleDocumentToggle = (docId: string) => {
        const newSelection = selectedDocuments.includes(docId)
            ? selectedDocuments.filter(id => id !== docId)
            : [...selectedDocuments, docId];
        onDocumentSelect(newSelection);
    };

    const handleViewDocument = (docId: string) => {
        navigate(`/document/${docId}`);
    };

    // Server-side search already applied; show the provided documents
    const filteredDocuments = documents;

    return (
        <Box>
            <Grid container spacing={2}>
                {isLoading ? (
                    <Typography>Loading...</Typography>
                ) : (
                    filteredDocuments.map(doc => {
                        const isSelected = selectedDocuments.includes(doc.uuid);
                        return (
                            <Grid item xs={12} sm={6} key={doc.uuid}>
                                <Card
                                    onClick={() => handleViewDocument(doc.uuid)}
                                    sx={{
                                        cursor: 'pointer',
                                        border: isSelected ? 2 : 1,
                                        borderColor: isSelected ? 'primary.main' : 'divider',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        height: '100%',
                                    }}
                                >
                                    <CardContent sx={{ p: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                            <Checkbox
                                                checked={isSelected}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDocumentToggle(doc.uuid);
                                                }}
                                                size="small"
                                                sx={{ p: 0, mr: 1 }}
                                            />
                                            <Typography variant="subtitle1" sx={{ flexGrow: 1, fontSize: '0.875rem', fontWeight: 600 }}>{doc.title || doc.filename}</Typography>
                                            <Chip label={doc.file_type} size="small" variant="outlined" sx={{ fontSize: '0.6875rem' }} />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" sx={{
                                            mb: 1.5,
                                            fontSize: '0.75rem',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            lineHeight: 1.4,
                                            maxHeight: '2.8em'
                                        }}>
                                            {doc.description || 'No description available.'}
                                        </Typography>
                                    </CardContent>
                                    <CardActions sx={{ display: 'flex', justifyContent: 'space-between', px: 2, pb: 1.5 }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.6875rem' }}>
                                            {format(new Date(doc.created_at), 'MMM dd, yyyy')}
                                        </Typography>
                                    </CardActions>
                                </Card>
                            </Grid>
                        );
                    })
                )}
            </Grid>
        </Box>
    );
};
