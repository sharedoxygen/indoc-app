import React, { useMemo } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom'
import { useGetAnalyticsSummaryQuery, useGetAnalyticsTimeseriesQuery, useGetAnalyticsStorageQuery, useGetProcessingAnalyticsQuery, useGetDocumentsQuery } from '../store/api';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'

const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { data: summary } = useGetAnalyticsSummaryQuery(undefined as any, { pollingInterval: 5000 })
  const { data: timeseries } = useGetAnalyticsTimeseriesQuery({ days: 30 } as any, { pollingInterval: 10000 })
  const { data: storage } = useGetAnalyticsStorageQuery(undefined as any, { pollingInterval: 15000 })
  const { data: processing } = useGetProcessingAnalyticsQuery(undefined as any, { pollingInterval: 10000 })

  // Get real document counts for accurate queue metrics
  const { data: documentsData } = useGetDocumentsQuery({ skip: 0, limit: 1000 }, { pollingInterval: 5000 })

  const uploads = useMemo(() => (timeseries?.uploads || []).map((d: any) => ({ day: d.day, uploads: d.count })), [timeseries])
  const views = useMemo(() => (timeseries?.views || []).map((d: any) => ({ day: d.day, views: d.count })), [timeseries])
  const searches = useMemo(() => (timeseries?.searches || []).map((d: any) => ({ day: d.day, searches: d.count })), [timeseries])
  const storageByType = useMemo(() => (storage?.by_type || []).map((r: any) => ({ name: (r.file_type || 'UNK').toUpperCase(), value: r.bytes })), [storage])

  // Calculate real queue KPIs from documents data (no hard-coding)
  const realStatusCounts = useMemo(() => {
    const docs = documentsData?.documents || []
    const counts: Record<string, number> = {}
    docs.forEach((doc: any) => {
      counts[doc.status] = (counts[doc.status] || 0) + 1
    })
    return counts
  }, [documentsData])

  const inQueueNow = (realStatusCounts['uploaded'] || 0) + (realStatusCounts['processing'] || 0) + (realStatusCounts['text_extracted'] || 0)
  const processingNow = realStatusCounts['processing'] || 0
  const failedNow = realStatusCounts['failed'] || 0
  const indexedCount = realStatusCounts['indexed'] || 0
  const avgProcessSecs = useMemo(() => {
    const rows = processing?.avg_time_to_process_by_type || []
    if (!rows.length) return 0
    const total = rows.reduce((acc: number, r: any) => acc + (Number(r.avg_seconds) || 0), 0)
    return total / rows.length
  }, [processing])

  const formatSeconds = (totalSeconds: number) => {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0:00'
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.round(totalSeconds % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    const value = bytes / Math.pow(1024, idx)
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[idx]}`
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>Executive Dashboard</Typography>

      {/* Key Performance Indicators */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>Key Metrics</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3} onClick={() => navigate('/documents')} style={{ cursor: 'pointer' }}>
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'primary.main', color: 'primary.contrastText', transition: 'transform .15s ease, box-shadow .15s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: 8 } }}>
            <Typography variant="overline" sx={{ fontWeight: 600 }}>Total Documents</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, my: 1 }}>{summary?.totals?.documents ?? 0}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Click to view all</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'success.main', color: 'success.contrastText', transition: 'transform .15s ease, box-shadow .15s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: 8 } }}>
            <Typography variant="overline" sx={{ fontWeight: 600 }}>Successfully Indexed</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, my: 1 }}>{indexedCount}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Ready for search & chat</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'warning.main', color: 'warning.contrastText', transition: 'transform .15s ease, box-shadow .15s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: 8 } }}>
            <Typography variant="overline" sx={{ fontWeight: 600 }}>In Processing Queue</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, my: 1 }}>{inQueueNow}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Being processed</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'error.main', color: 'error.contrastText', transition: 'transform .15s ease, box-shadow .15s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: 8 } }}>
            <Typography variant="overline" sx={{ fontWeight: 600 }}>Processing Failures</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, my: 1 }}>{failedNow}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Require attention</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Operational Metrics */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>Operational Status</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={2.4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'info.main', color: 'info.contrastText', textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{processingNow}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.9 }}>Processing Now</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={2.4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'warning.main', color: 'warning.contrastText', textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{inQueueNow}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.9 }}>In Queue</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={2.4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'error.main', color: 'error.contrastText', textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{failedNow}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.9 }}>Failed</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={2.4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'secondary.main', color: 'secondary.contrastText', textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{formatSeconds(Number(avgProcessSecs) || 0)}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.9 }}>Avg Process Time</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={2.4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'success.dark', color: 'success.contrastText', textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{formatBytes(summary?.totals?.storage_bytes ?? 0)}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.9 }}>Storage Used</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Analytics Charts */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>Performance Analytics</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 380 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>User Activity Trends (30 days)</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={uploads.map((u: any, i: number) => ({ day: u.day, uploads: u.uploads, views: (views[i]?.views || 0), searches: (searches[i]?.searches || 0) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" hide />
                <YAxis stroke="#888" />
                <Tooltip labelFormatter={(label) => `Day ${label}`} formatter={(value: any, name) => [value, name]} />
                <Legend />
                <Line type="monotone" dataKey="uploads" stroke="#22C55E" dot={false} strokeWidth={3} />
                <Line type="monotone" dataKey="views" stroke="#06B6D4" dot={false} strokeWidth={3} />
                <Line type="monotone" dataKey="searches" stroke="#F59E0B" dot={false} strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 380 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Storage by File Type</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <Pie
                  dataKey="value"
                  data={storageByType}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }: any) => `${name}: ${formatBytes(value)}`}
                  labelLine={true}
                  fontSize={12}
                >
                  {storageByType.map((_: any, i: number) => (
                    <Cell key={i} fill={["#6366F1", "#22C55E", "#06B6D4", "#F59E0B", "#EF4444"][i % 5]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, _name: any, props: any) => [
                    formatBytes(Number(value)),
                    `${props.payload.name} Files`
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Secondary Metrics */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>System Health</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'primary.dark', color: 'primary.contrastText', textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{summary?.totals?.events?.uploads ?? 0}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.9 }}>Uploads (30d)</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'info.dark', color: 'info.contrastText', textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{summary?.totals?.events?.views ?? 0}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.9 }}>Views (30d)</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'warning.dark', color: 'warning.contrastText', textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{summary?.totals?.events?.searches ?? 0}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.9 }}>Searches (30d)</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'success.dark', color: 'success.contrastText', textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{summary?.documents_by_type?.length ?? 0}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.9 }}>File Types</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;