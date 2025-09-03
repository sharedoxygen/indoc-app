import React, { useMemo, useState } from 'react'
import { Box, Typography, Grid, Paper, Chip, Card, CardContent, Checkbox, Avatar, Button } from '@mui/material'
import { DocumentChat } from '../components/DocumentChat'
import { useGetDocumentsQuery } from '../store/api'
import { format } from 'date-fns'
import { Chat as ChatIcon } from '@mui/icons-material'

const ChatPage: React.FC = () => {
    const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
    const { data, isLoading } = useGetDocumentsQuery({ skip: 0, limit: 1000 })
    // Only show documents that are searchable (indexed)
    const availableDocuments = useMemo(
        () => (data?.documents || []).filter((d: any) => d.status === 'indexed'),
        [data]
    )

    const handleDocumentToggle = (docId: string) => {
        const newSelection = selectedDocuments.includes(docId)
            ? selectedDocuments.filter(id => id !== docId)
            : [...selectedDocuments, docId]
        setSelectedDocuments(newSelection)
    }

    const handleSelectAll = () => {
        if (selectedDocuments.length === availableDocuments.length) {
            setSelectedDocuments([])
        } else {
            setSelectedDocuments(availableDocuments.map((doc: any) => doc.uuid))
        }
    }

    return (
        <Box sx={{ p: 3, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Document Chat</Typography>

            <Grid container spacing={3} sx={{ flexGrow: 1, height: 'calc(100% - 60px)' }}>
                {/* Chat Panel - Fixed on Left */}
                <Grid item xs={12} md={8} sx={{ height: '100%', minHeight: 0, display: 'flex' }}>
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        <DocumentChat documentIds={selectedDocuments} />
                    </Box>
                </Grid>

                {/* Document Selection Panel - Fixed Header, Scrollable List on Right */}
                <Grid item xs={12} md={4} sx={{ height: '100%' }}>
                    <Paper sx={{
                        p: 3,
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Fixed Header Section */}
                        <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Select Documents</Typography>
                                <Button
                                    size="small"
                                    onClick={handleSelectAll}
                                    disabled={availableDocuments.length === 0}
                                >
                                    {selectedDocuments.length === availableDocuments.length ? 'Clear All' : 'Select All'}
                                </Button>
                            </Box>

                            <Chip
                                icon={<ChatIcon />}
                                label={`${selectedDocuments.length} document(s) selected`}
                                color={selectedDocuments.length > 0 ? 'primary' : 'default'}
                            />
                        </Box>

                        {/* Scrollable Documents List - Only this part scrolls */}
                        <Box sx={{
                            flexGrow: 1,
                            overflow: 'auto',
                            pr: 1,
                            '&::-webkit-scrollbar': {
                                width: '8px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: 'rgba(0,0,0,0.05)',
                                borderRadius: '4px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '4px',
                                '&:hover': {
                                    background: 'rgba(0,0,0,0.3)',
                                }
                            }
                        }}>
                            {isLoading ? (
                                <Typography color="text.secondary">Loading documents...</Typography>
                            ) : availableDocuments.length === 0 ? (
                                <Typography color="text.secondary">No documents available for chat.</Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {availableDocuments.map((doc: any) => {
                                        const isSelected = selectedDocuments.includes(doc.uuid)
                                        return (
                                            <Card
                                                sx={{
                                                    cursor: 'pointer',
                                                    border: isSelected ? 2 : 1,
                                                    borderColor: isSelected ? 'primary.main' : 'divider',
                                                    bgcolor: isSelected ? 'primary.lighter' : 'background.paper',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        borderColor: 'primary.main',
                                                        transform: 'translateY(-1px)',
                                                        boxShadow: 2
                                                    }
                                                }}
                                                onClick={() => handleDocumentToggle(doc.uuid)}
                                            >
                                                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                                        <Checkbox
                                                            checked={isSelected}
                                                            size="small"
                                                            sx={{ p: 0, mt: 0.5 }}
                                                        />
                                                        <Avatar
                                                            sx={{
                                                                width: 32,
                                                                height: 32,
                                                                bgcolor: 'primary.main',
                                                                fontSize: '0.75rem'
                                                            }}
                                                        >
                                                            {doc.file_type?.toUpperCase() || 'DOC'}
                                                        </Avatar>
                                                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                            <Typography
                                                                variant="subtitle2"
                                                                sx={{
                                                                    fontWeight: 600,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                {doc.title || doc.filename}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                sx={{
                                                                    display: 'block',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                {doc.description || 'No description'}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                                                                <Chip
                                                                    label={doc.status}
                                                                    size="small"
                                                                    color={doc.status === 'indexed' ? 'success' : 'warning'}
                                                                    variant="outlined"
                                                                />
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {format(new Date(doc.created_at), 'MMM dd')}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    )
}

export default ChatPage


