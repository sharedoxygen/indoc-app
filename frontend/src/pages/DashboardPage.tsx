import React, { useMemo, useState } from 'react';
import { Box, Grid, Paper, Typography, TextField, InputAdornment } from '@mui/material';
import { useNavigate } from 'react-router-dom'
import { useGetAnalyticsSummaryQuery, useGetAnalyticsTimeseriesQuery, useGetAnalyticsStorageQuery, useGetProcessingAnalyticsQuery } from '../store/api';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
import { Search as SearchIcon } from '@mui/icons-material'

const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data: summary } = useGetAnalyticsSummaryQuery(undefined as any, { pollingInterval: 5000 })
  const { data: timeseries } = useGetAnalyticsTimeseriesQuery({ days: 30 } as any, { pollingInterval: 10000 })
  const { data: storage } = useGetAnalyticsStorageQuery(undefined as any, { pollingInterval: 15000 })
  const { data: processing } = useGetProcessingAnalyticsQuery(undefined as any, { pollingInterval: 10000 })

  const uploads = useMemo(() => (timeseries?.uploads || []).map((d: any) => ({ day: d.day, uploads: d.count })), [timeseries])
  const views = useMemo(() => (timeseries?.views || []).map((d: any) => ({ day: d.day, views: d.count })), [timeseries])
  const searches = useMemo(() => (timeseries?.searches || []).map((d: any) => ({ day: d.day, searches: d.count })), [timeseries])
  const storageByType = useMemo(() => (storage?.by_type || []).map((r: any) => ({ name: (r.file_type || 'UNK').toUpperCase(), value: r.bytes })), [storage])

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>Dashboard</Typography>

      {/* Search removed per request */}

      <Grid container spacing={3}>
        <Grid item xs={12} md={3} onClick={()=>navigate('/documents')} style={{ cursor: 'pointer' }}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <Typography variant="overline">Total Documents</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{summary?.totals?.documents ?? 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'success.main', color: 'success.contrastText' }}>
            <Typography variant="overline">Uploads (30d)</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{summary?.totals?.events?.uploads ?? 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'info.main', color: 'info.contrastText' }}>
            <Typography variant="overline">Views (30d)</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{summary?.totals?.events?.views ?? 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'warning.main', color: 'warning.contrastText' }}>
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
                <Tooltip />
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
                <Tooltip />
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
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Avg Time to Process (sec) by Type</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={(processing?.avg_time_to_process_by_type || []).map((r: any) => ({ type: r.file_type, secs: r.avg_seconds }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
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