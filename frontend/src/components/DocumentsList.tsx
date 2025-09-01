import React, { useState } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Chip,
    Checkbox,
    TextField,
    InputAdornment,
    IconButton,
    Button,
    CardActions,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon, Visibility as ViewIcon } from '@mui/icons-material';
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
}

export const DocumentsList: React.FC<DocumentsListProps> = ({ documents, isLoading, selectedDocuments, onDocumentSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
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

    const filteredDocuments = documents.filter(doc =>
        doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Box>
            <TextField
                fullWidth
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                        <InputAdornment position="end">
                            <IconButton onClick={() => setSearchTerm('')}>
                                <ClearIcon />
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
                sx={{ mb: 3 }}
            />
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
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <Checkbox
                                                checked={isSelected}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDocumentToggle(doc.uuid);
                                                }}
                                                sx={{ p: 0, mr: 1 }}
                                            />
                                            <Typography variant="h6" sx={{ flexGrow: 1 }}>{doc.title || doc.filename}</Typography>
                                            <Chip label={doc.file_type} size="small" />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" sx={{
                                            mb: 2,
                                            display: '-webkit-box',
                                            '-webkit-line-clamp': '3',
                                            '-webkit-box-orient': 'vertical',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            height: '4.5em',
                                        }}>
                                            {doc.description || 'No description available.'}
                                        </Typography>
                                    </CardContent>
                                    <CardActions sx={{ display: 'flex', justifyContent: 'space-between', px: 2, pb: 2 }}>
                                        <Typography variant="caption">
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
