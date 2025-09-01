import React, { useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { DocumentChat } from '../components/DocumentChat';
import { DocumentsList } from '../components/DocumentsList';
import { useGetDocumentsQuery } from '../store/api';

const DashboardPage: React.FC = () => {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const { data: documentsData, isLoading } = useGetDocumentsQuery({
    skip: 0,
    limit: 1000, // Fetch more for client-side filtering
  });

  const allDocuments = documentsData?.documents || [];
  const indexedDocuments = allDocuments.filter((doc: any) => doc.status === 'indexed');
  const processingDocuments = allDocuments.filter((doc: any) => doc.status !== 'indexed');

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <DocumentsList
            documents={indexedDocuments}
            isLoading={isLoading}
            selectedDocuments={selectedDocuments}
            onDocumentSelect={setSelectedDocuments}
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Document Chat
            </Typography>
            {selectedDocuments.length > 0 ? (
              <DocumentChat documentIds={selectedDocuments} />
            ) : (
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  Select one or more documents to start a chat.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;