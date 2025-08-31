import React, { useState } from 'react'
import {
    Box,
    Paper,
    Typography,
    Card,
    CardContent,
    CardActions,
    Button,
    Grid,
    Chip,
    CircularProgress,
    Alert,
    TextField,
    InputAdornment,
    IconButton,
    Menu,
    MenuItem,
    Pagination,
    FormControl,
    InputLabel,
    Select,

} from '@mui/material'
import {
    Description as DocumentIcon,
    Search as SearchIcon,

    Download as DownloadIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    Chat as ChatIcon,
    Schedule as TimeIcon,

    Storage as StorageIcon,
    MoreVert as MoreIcon,
    Clear as ClearIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useGetDocumentsQuery, useDeleteDocumentMutation } from '../store/api'
import { useAppSelector } from '../hooks/redux'
import { EnhancedDocumentChatSelector } from '../components/EnhancedDocumentChatSelector'
import { DocumentChatInterface } from '../components/DocumentChatInterface'

const DocumentsPage: React.FC = () => {
    const navigate = useNavigate()
    // const { user } = useAppSelector((state) => state.auth)

    // State for pagination and filtering
    const [page, setPage] = useState(1)
    const [limit] = useState(12)

    // State for chat functionality
    const [showDocumentSelector, setShowDocumentSelector] = useState(false)
    // const [selectedForChat, setSelectedForChat] = useState<string[]>([])
    const [showChat, setShowChat] = useState(false)
    const [chatDocuments, setChatDocuments] = useState<string[]>([])
    // const [modelSettings, setModelSettings] = useState<any>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('created_at')
    const [sortOrder, setSortOrder] = useState('desc')
    const [filterType, setFilterType] = useState('all')

    // Debounce search term to avoid too many API calls
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm)
            setPage(1) // Reset to first page when search changes
        }, 300)
        return () => clearTimeout(timer)
    }, [searchTerm])

    // Reset page when filters change
    React.useEffect(() => {
        setPage(1)
    }, [filterType, sortBy, sortOrder])

    // Menu state for document actions
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [selectedDoc, setSelectedDoc] = useState<any>(null)

    // API calls
    const { data: documentsData, isLoading, error, refetch } = useGetDocumentsQuery({
        skip: (page - 1) * limit,
        limit: limit,
        search: debouncedSearchTerm || undefined,
        file_type: filterType,
        sort_by: sortBy,
        sort_order: sortOrder
    })

    // Separate query for chat selector - get ALL documents
    const { data: allDocumentsData } = useGetDocumentsQuery({
        skip: 0,
        limit: 5000,  // Get all documents for chat selection
        file_type: 'all',
        sort_by: 'created_at',
        sort_order: 'desc'
    })

    const [deleteDocument] = useDeleteDocumentMutation()

    // Handle document actions
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, doc: any) => {
        setAnchorEl(event.currentTarget)
        setSelectedDoc(doc)
    }

    const handleMenuClose = () => {
        setAnchorEl(null)
        setSelectedDoc(null)
    }

    const handleViewDocument = (doc: any) => {
        navigate(`/document/${doc.uuid}`)
        handleMenuClose()
    }

    const handleStartChat = (documentIds: string[], settings: any) => {
        setChatDocuments(documentIds)
        setModelSettings(settings)
        setShowChat(true)
    }

    const getChatTitle = () => {
        if (chatDocuments.length === 1) {
            const doc = documentsData?.documents?.find((d: any) => d.uuid === chatDocuments[0])
            return doc?.title || doc?.filename || 'Document'
        }
        return `${chatDocuments.length} Documents`
    }

    const handleDeleteDocument = async (doc: any) => {
        if (window.confirm(`Are you sure you want to delete "${doc.filename}"?`)) {
            try {
                await deleteDocument(doc.uuid).unwrap()
                refetch()
            } catch (error) {
                console.error('Failed to delete document:', error)
            }
        }
        handleMenuClose()
    }

    // Use server-filtered documents directly (no client-side filtering needed)
    const filteredDocuments = documentsData?.documents || []

    // Get unique file types for filter
    const fileTypes = React.useMemo(() => {
        if (!documentsData?.documents) return []
        const types = [...new Set(documentsData.documents.map((doc: any) => doc.file_type))]
        return types.sort()
    }, [documentsData?.documents])

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const getFileTypeColor = (fileType: string) => {
        const colors: { [key: string]: string } = {
            'pdf': '#f44336',
            'docx': '#2196f3',
            'doc': '#2196f3',
            'xlsx': '#4caf50',
            'xls': '#4caf50',
            'pptx': '#ff9800',
            'ppt': '#ff9800',
            'txt': '#9e9e9e',
            'jpg': '#e91e63',
            'jpeg': '#e91e63',
            'png': '#e91e63',
            'gif': '#e91e63',
        }
        return colors[fileType.toLowerCase()] || '#757575'
    }

    if (error) {
        return (
            <Box>
                <Alert severity="error" sx={{ mb: 3 }}>
                    Failed to load documents. Please check your connection and try again.
                </Alert>
            </Box>
        )
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
                    Documents 📁
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                    Browse and manage your document library
                </Typography>
            </Box>

            {/* Filters and Search */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            placeholder="Search documents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setSearchTerm('')} size="small">
                                            <ClearIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth>
                            <InputLabel>File Type</InputLabel>
                            <Select
                                value={filterType}
                                label="File Type"
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <MenuItem value="all">All Types</MenuItem>
                                {fileTypes.map(type => (
                                    <MenuItem key={String(type)} value={String(type)}>
                                        {String(type).toUpperCase()}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth>
                            <InputLabel>Sort By</InputLabel>
                            <Select
                                value={sortBy}
                                label="Sort By"
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <MenuItem value="created_at">Date Created</MenuItem>
                                <MenuItem value="updated_at">Date Modified</MenuItem>
                                <MenuItem value="filename">Name</MenuItem>
                                <MenuItem value="file_size">Size</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth>
                            <InputLabel>Order</InputLabel>
                            <Select
                                value={sortOrder}
                                label="Order"
                                onChange={(e) => setSortOrder(e.target.value)}
                            >
                                <MenuItem value="desc">Newest First</MenuItem>
                                <MenuItem value="asc">Oldest First</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={2}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => {
                                setSearchTerm('')
                                setFilterType('all')
                                setSortBy('created_at')
                                setSortOrder('desc')
                            }}
                            startIcon={<ClearIcon />}
                        >
                            Clear Filters
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Loading State */}
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Documents Grid */}
            {!isLoading && (
                <>
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" color="text.secondary">
                            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="outlined"
                                startIcon={<ChatIcon />}
                                onClick={() => setShowDocumentSelector(true)}
                                color="secondary"
                                sx={{ borderRadius: 2 }}
                            >
                                Chat with Documents
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<DocumentIcon />}
                                onClick={() => navigate('/upload')}
                                sx={{ borderRadius: 2 }}
                            >
                                Upload New Document
                            </Button>
                        </Box>
                    </Box>

                    {filteredDocuments.length === 0 ? (
                        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                            <DocumentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                No documents found
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                {searchTerm || filterType !== 'all'
                                    ? 'Try adjusting your search or filters'
                                    : 'Upload your first document to get started'
                                }
                            </Typography>
                            {!searchTerm && filterType === 'all' && (
                                <Button
                                    variant="contained"
                                    onClick={() => navigate('/upload')}
                                    sx={{ borderRadius: 2 }}
                                >
                                    Upload Document
                                </Button>
                            )}
                        </Paper>
                    ) : (
                        <Grid container spacing={3}>
                            {filteredDocuments.map((doc) => (
                                <Grid item xs={12} sm={6} md={4} key={doc.id}>
                                    <Card
                                        sx={{
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            transition: 'all 0.2s ease-in-out',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 4,
                                            },
                                        }}
                                        onClick={() => handleViewDocument(doc)}
                                    >
                                        <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                                            {/* File type indicator */}
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                <Chip
                                                    label={doc.file_type.toUpperCase()}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: getFileTypeColor(doc.file_type) + '20',
                                                        color: getFileTypeColor(doc.file_type),
                                                        fontWeight: 600,
                                                    }}
                                                />
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleMenuOpen(e, doc)
                                                    }}
                                                >
                                                    <MoreIcon />
                                                </IconButton>
                                            </Box>

                                            {/* Document info */}
                                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, lineHeight: 1.3 }}>
                                                {doc.title || doc.filename}
                                            </Typography>

                                            {doc.description && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.4 }}>
                                                    {doc.description.length > 100
                                                        ? `${doc.description.substring(0, 100)}...`
                                                        : doc.description
                                                    }
                                                </Typography>
                                            )}

                                            {/* Metadata */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <StorageIcon fontSize="small" color="action" />
                                                <Typography variant="caption" color="text.secondary">
                                                    {formatFileSize(doc.file_size || 0)}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <TimeIcon fontSize="small" color="action" />
                                                <Typography variant="caption" color="text.secondary">
                                                    {format(new Date(doc.created_at), 'MMM dd, yyyy')}
                                                </Typography>
                                            </Box>

                                            {/* Status */}
                                            <Chip
                                                label={doc.status || 'Ready'}
                                                size="small"
                                                color={doc.status === 'indexed' ? 'success' : 'default'}
                                                sx={{ mt: 1 }}
                                            />
                                        </CardContent>

                                        <CardActions sx={{ p: 2.5, pt: 0 }}>
                                            <Button
                                                size="small"
                                                startIcon={<ViewIcon />}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleViewDocument(doc)
                                                }}
                                            >
                                                View
                                            </Button>
                                        </CardActions>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {/* Pagination */}
                    {documentsData && documentsData.total > limit && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <Pagination
                                count={Math.ceil(documentsData.total / limit)}
                                page={page}
                                onChange={(_, newPage) => setPage(newPage)}
                                color="primary"
                                size="large"
                            />
                        </Box>
                    )}
                </>
            )}

            {/* Document Actions Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => handleViewDocument(selectedDoc)}>
                    <ViewIcon sx={{ mr: 1 }} />
                    View Document
                </MenuItem>
                <MenuItem onClick={() => {
                    // TODO: Implement edit functionality
                    handleMenuClose()
                }}>
                    <EditIcon sx={{ mr: 1 }} />
                    Edit Details
                </MenuItem>
                <MenuItem onClick={() => {
                    // TODO: Implement download functionality
                    handleMenuClose()
                }}>
                    <DownloadIcon sx={{ mr: 1 }} />
                    Download
                </MenuItem>
                <MenuItem
                    onClick={() => handleDeleteDocument(selectedDoc)}
                    sx={{ color: 'error.main' }}
                >
                    <DeleteIcon sx={{ mr: 1 }} />
                    Delete
                </MenuItem>
            </Menu>

            {/* Enhanced Document Chat Selector */}
            <EnhancedDocumentChatSelector
                open={showDocumentSelector}
                onClose={() => setShowDocumentSelector(false)}
                documents={allDocumentsData?.documents || []}
                onStartChat={handleStartChat}
            />

            {/* Chat Interface */}
            {showChat && (
                <DocumentChatInterface
                    documentId={chatDocuments.length === 1 ? chatDocuments[0] : undefined}
                    documentTitle={getChatTitle()}
                    onClose={() => setShowChat(false)}
                />
            )}
        </Box>
    )
}

export default DocumentsPage
