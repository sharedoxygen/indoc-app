import React, { useMemo, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { DocumentChat } from '../components/DocumentChat'
import { DocumentsList } from '../components/DocumentsList'
import { useGetDocumentsQuery } from '../store/api'

const ChatPage: React.FC = () => {
    const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
    const { data, isLoading } = useGetDocumentsQuery({ skip: 0, limit: 1000 })
    const indexedDocuments = useMemo(() => (data?.documents || []).filter((d: any) => d.status === 'indexed'), [data])

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>Document Chat</Typography>
            <Box>
                <DocumentChat documentIds={selectedDocuments} />
            </Box>
            <Box sx={{ mt: 3, overflow: 'auto' }}>
                <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.7 }}>Select documents</Typography>
                <DocumentsList
                    documents={indexedDocuments}
                    isLoading={isLoading}
                    selectedDocuments={selectedDocuments}
                    onDocumentSelect={setSelectedDocuments}
                />
            </Box>
        </Box>
    )
}

export default ChatPage


