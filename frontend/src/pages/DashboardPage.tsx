import React, { useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { DocumentChat } from '../components/DocumentChat';
import { DocumentsList } from '../components/DocumentsList';
import { useGetDocumentsQuery, useGetAnalyticsSummaryQuery, useGetAnalyticsTimeseriesQuery } from '../store/api';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts'

const DashboardPage: React.FC = () => {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const { data: documentsData, isLoading } = useGetDocumentsQuery({
    skip: 0,
    limit: 1000, // Fetch more for client-side filtering
  });
  const { data: summary } = useGetAnalyticsSummaryQuery(undefined as any, { pollingInterval: 5000 })
  const { data: timeseries } = useGetAnalyticsTimeseriesQuery({ days: 30 } as any, { pollingInterval: 10000 })

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
            <Typography variant="h6" sx={{ mb: 2 }}>Key Metrics</Typography>
            <Box sx={{ mb: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="overline">Documents</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{summary?.totals?.documents ?? 0}</Typography>
              </Paper>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="overline">Uploads (30d)</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{summary?.totals?.events?.uploads ?? 0}</Typography>
              </Paper>
            </Box>
            <Box sx={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(timeseries?.uploads||[]).map((d:any)=>({day:d.day, uploads:d.count}))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" hide />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="uploads" stroke="#22C55E" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Document Chat</Typography>
            <DocumentChat documentIds={selectedDocuments} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;