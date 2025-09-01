import React, { useMemo } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom'
import { useGetAnalyticsSummaryQuery, useGetAnalyticsTimeseriesQuery, useGetAnalyticsStorageQuery, useGetProcessingAnalyticsQuery } from '../store/api';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'

const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { data: summary } = useGetAnalyticsSummaryQuery(undefined as any, { pollingInterval: 5000 })
  const { data: timeseries } = useGetAnalyticsTimeseriesQuery({ days: 30 } as any, { pollingInterval: 10000 })
  const { data: storage } = useGetAnalyticsStorageQuery(undefined as any, { pollingInterval: 15000 })
  const { data: processing } = useGetProcessingAnalyticsQuery(undefined as any, { pollingInterval: 10000 })

  const uploads = useMemo(() => (timeseries?.uploads || []).map((d: any) => ({ day: d.day, uploads: d.count })), [timeseries])
  const views = useMemo(() => (timeseries?.views || []).map((d: any) => ({ day: d.day, views: d.count })), [timeseries])
  const searches = useMemo(() => (timeseries?.searches || []).map((d: any) => ({ day: d.day, searches: d.count })), [timeseries])
  const storageByType = useMemo(() => (storage?.by_type || []).map((r: any) => ({ name: (r.file_type || 'UNK').toUpperCase(), value: r.bytes })), [storage])

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
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>Dashboard</Typography>

      {/* Search removed per request */}

      <Grid container spacing={3}>
        <Grid item xs={12} md={3} onClick={() => navigate('/documents')} style={{ cursor: 'pointer' }}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'primary.main', color: 'primary.contrastText', transition: 'transform .12s ease, box-shadow .12s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 } }}>
            <Typography variant="overline">Total Documents</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{summary?.totals?.documents ?? 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'success.main', color: 'success.contrastText', transition: 'transform .12s ease, box-shadow .12s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 } }}>
            <Typography variant="overline">Uploads (30d)</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{summary?.totals?.events?.uploads ?? 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'info.main', color: 'info.contrastText', transition: 'transform .12s ease, box-shadow .12s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 } }}>
            <Typography variant="overline">Views (30d)</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{summary?.totals?.events?.views ?? 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'warning.main', color: 'warning.contrastText', transition: 'transform .12s ease, box-shadow .12s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 } }}>
            <Typography variant="overline">Processed (total)</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{processing?.processed_total ?? 0}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, borderRadius: 3, height: 340 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Activity (30d)</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={uploads.map((u: any, i: number) => ({ day: u.day, uploads: u.uploads, views: (views[i]?.views || 0), searches: (searches[i]?.searches || 0) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" hide />
                <YAxis />
                <Tooltip labelFormatter={(label) => `Day ${label}`} formatter={(value: any, name) => [value, name]} />
                <Legend />
                <Line type="monotone" dataKey="uploads" stroke="#22C55E" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="views" stroke="#06B6D4" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="searches" stroke="#F59E0B" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, borderRadius: 3, height: 340 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Storage by Type</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie dataKey="value" data={storageByType} cx="50%" cy="50%" outerRadius={110} label>
                  {storageByType.map((_: any, i: number) => (
                    <Cell key={i} fill={["#6366F1", "#22C55E", "#06B6D4", "#F59E0B", "#EF4444"][i % 5]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [formatBytes(Number(v)), 'Size']} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Processing metrics */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, borderRadius: 3, height: 260 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Queue by Status</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={Object.entries(processing?.status_counts || {}).map(([k, v]) => ({ status: k, count: v as number }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#6366F1" dot />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, borderRadius: 3, height: 260 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Avg Time to Process (mm:ss) by Type</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={(processing?.avg_time_to_process_by_type || []).map((r: any) => ({ type: r.file_type, secs: r.avg_seconds }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis tickFormatter={(v: any) => formatSeconds(Number(v))} />
                <Tooltip formatter={(v: any) => [formatSeconds(Number(v)), 'Avg Time']} />
                <Legend />
                <Line type="monotone" dataKey="secs" stroke="#EF4444" dot />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;