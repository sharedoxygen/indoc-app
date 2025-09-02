import React, { useMemo, useState } from 'react';
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
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Stack,
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
    const [fileType, setFileType] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'created_at' | 'title' | 'file_size'>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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

    const filteredDocuments = useMemo(() => {
        const term = searchTerm.toLowerCase();
        const byText = documents.filter(doc =>
            doc.title?.toLowerCase().includes(term) ||
            doc.filename.toLowerCase().includes(term) ||
            doc.description?.toLowerCase().includes(term)
        );
        const byType = fileType === 'all' ? byText : byText.filter(d => (d.file_type || '').toLowerCase() === fileType.toLowerCase());
        const sorted = [...byType].sort((a, b) => {
            const direction = sortOrder === 'asc' ? 1 : -1;
            if (sortBy === 'created_at') return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
            if (sortBy === 'file_size') return ((a.file_size || 0) - (b.file_size || 0)) * direction;
            return (a.title || a.filename).localeCompare(b.title || b.filename) * direction;
        });
        return sorted;
    }, [documents, searchTerm, fileType, sortBy, sortOrder]);

    return (
        <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
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
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Type</InputLabel>
                    <Select value={fileType} label="Type" onChange={(e) => setFileType(e.target.value)}>
                        <MenuItem value="all">All Types</MenuItem>
                        <MenuItem value="pdf">PDF</MenuItem>
                        <MenuItem value="docx">DOCX</MenuItem>
                        <MenuItem value="pptx">PPTX</MenuItem>
                        <MenuItem value="xlsx">XLSX</MenuItem>
                        <MenuItem value="txt">TXT</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value as any)}>
                        <MenuItem value="created_at">Date</MenuItem>
                        <MenuItem value="title">Title</MenuItem>
                        <MenuItem value="file_size">File Size</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Order</InputLabel>
                    <Select value={sortOrder} label="Order" onChange={(e) => setSortOrder(e.target.value as any)}>
                        <MenuItem value="desc">Desc</MenuItem>
                        <MenuItem value="asc">Asc</MenuItem>
                    </Select>
                </FormControl>
            </Stack>
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
