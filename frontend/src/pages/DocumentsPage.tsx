import React, { useMemo, useState } from 'react'
import { Box, Typography, TextField, InputAdornment, Paper, Chip, CircularProgress } from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useGetDocumentsQuery } from '../store/api'
import { DocumentsList } from '../components/DocumentsList'

const DocumentsPage: React.FC = () => {
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const { data, isLoading } = useGetDocumentsQuery({ skip: 0, limit: 1000 })
    const indexedDocuments = useMemo(() => (data?.documents || []).filter((d: any) => d.status === 'indexed'), [data])

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
                    <Chip label={`${indexedDocuments.length} processed`} color="success" size="small" />
                    <Chip label={`${(data?.documents || []).length} total`} size="small" />
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
                />
            )}
        </Box>
    )
}

export default DocumentsPage


