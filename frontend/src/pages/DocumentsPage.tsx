import React, { useMemo, useState } from 'react'
import { Box, Typography, TextField, InputAdornment, Paper, Chip, CircularProgress, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { useGetDocumentsQuery } from '../store/api'
import { DocumentsList } from '../components/DocumentsList'
import { useDebounce } from '../hooks/useDebounce'

const DocumentsPage: React.FC = () => {
    const [search, setSearch] = useState('')
    const [fileType, setFileType] = useState<'all' | string>('all')
    const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'filename' | 'file_type' | 'file_size'>('created_at')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    // Debounce the search term to reduce API calls
    const debouncedSearch = useDebounce(search, 300)

    const { data, isLoading } = useGetDocumentsQuery({
        skip: 0,
        limit: 1000,
        search: debouncedSearch || undefined,
        status: 'indexed',
        file_type: fileType,
        sort_by: sortBy,
        sort_order: sortOrder
    }, {
        // Force cache invalidation to ensure fresh data
        refetchOnMountOrArgChange: true
    })
    const indexedDocuments = useMemo(() => {
        const docs = data?.documents || []
        // Debug: log what we're getting from the API
        if (docs.length > 0) {
            console.log('Documents received:', docs.map(d => ({ name: d.filename, status: d.status })))
        }
        // Extra filter on frontend as safety net
        return docs.filter((d: any) => d.status === 'indexed')
    }, [data])

    return (
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>Documents</Typography>
            <Paper sx={{ p: 2, borderRadius: 3, mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder="Search documents..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                />
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Type</InputLabel>
                        <Select label="Type" value={fileType} onChange={(e) => setFileType(e.target.value as any)}>
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="pdf">PDF</MenuItem>
                            <MenuItem value="txt">TXT</MenuItem>
                            <MenuItem value="docx">DOCX</MenuItem>
                            <MenuItem value="pptx">PPTX</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Sort By</InputLabel>
                        <Select label="Sort By" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                            <MenuItem value="created_at">Created</MenuItem>
                            <MenuItem value="updated_at">Updated</MenuItem>
                            <MenuItem value="filename">Filename</MenuItem>
                            <MenuItem value="file_type">File Type</MenuItem>
                            <MenuItem value="file_size">File Size</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Order</InputLabel>
                        <Select label="Order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)}>
                            <MenuItem value="desc">Desc</MenuItem>
                            <MenuItem value="asc">Asc</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip label={`${data?.total ?? indexedDocuments.length} results`} size="small" />
                    <Chip label={`${indexedDocuments.length} processed`} color="success" size="small" />
                    <Chip label={`${(data?.documents || []).length} page`} size="small" />
                </Box>
            </Paper>

            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <DocumentsList
                    documents={indexedDocuments}
                    isLoading={isLoading}
                    selectedDocuments={[]}
                    onDocumentSelect={() => { }}
                    searchTerm={search}
                />
            )}
        </Box>
    )
}

export default DocumentsPage


