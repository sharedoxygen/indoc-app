import React, { useState } from 'react'
import { Box, Typography } from '@mui/material'
import { DocumentChat } from '../components/DocumentChat'
import { DocumentsList } from '../components/DocumentsList'
import { useGetDocumentsQuery } from '../store/api'

const ChatPage: React.FC = () => {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const { data, isLoading } = useGetDocumentsQuery({ skip: 0, limit: 1000 })
  const indexedDocuments = (data?.documents || []).filter((d:any)=> d.status === 'indexed')

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>Document Chat</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 420px' }, gap: 2 }}>
        <Box>
          <DocumentChat documentIds={selectedDocuments} />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.7 }}>Select documents</Typography>
          <DocumentsList
            documents={indexedDocuments}
            isLoading={isLoading}
            selectedDocuments={selectedDocuments}
            onDocumentSelect={setSelectedDocuments}
          />
        </Box>
      </Box>
    </Box>
  )
}

export default ChatPage


