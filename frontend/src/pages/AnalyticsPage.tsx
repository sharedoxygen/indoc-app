import React, { useMemo } from 'react'
import { Box, Paper, Typography, Grid, Chip, LinearProgress } from '@mui/material'
import { useGetAnalyticsSummaryQuery, useGetAnalyticsStorageQuery, useGetAnalyticsTimeseriesQuery } from '../store/api'
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const bytesToSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

const AnalyticsPage: React.FC = () => {
    const { data: summary, isLoading: loadingSummary } = useGetAnalyticsSummaryQuery(undefined as any, { pollingInterval: 5000 })
    const { data: storage, isLoading: loadingStorage } = useGetAnalyticsStorageQuery(undefined as any, { pollingInterval: 15000 })
    const { data: timeseries, isLoading: loadingSeries } = useGetAnalyticsTimeseriesQuery({ days: 30 } as any, { pollingInterval: 10000 })

    const documentsByTypeChart = useMemo(() => {
        return (summary?.documents_by_type || []).map((r: any) => ({
            type: (r.file_type || 'unknown').toUpperCase(),
            count: r.count,
        }))
    }, [summary])

    const storageByTypeChart = useMemo(() => {
        return (storage?.by_type || []).map((r: any) => ({
            type: (r.file_type || 'unknown').toUpperCase?.() || (r.file_type || 'unknown'),
            bytes: r.bytes,
        }))
    }, [storage])

    const activitySeries = useMemo(() => {
        const uploads = (timeseries?.uploads || []).map((d: any) => ({ day: d.day, uploads: d.count }))
        const views = (timeseries?.views || []).map((d: any) => ({ day: d.day, views: d.count }))
        const searches = (timeseries?.searches || []).map((d: any) => ({ day: d.day, searches: d.count }))
        const map: Record<string, any> = {}
        ;[...uploads, ...views, ...searches].forEach(p => {
            map[p.day] = { day: p.day, ...(map[p.day] || {}), ...p }
        })
        return Object.values(map)
    }, [timeseries])

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
                Analytics 📈
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.1rem' }}>
                Business insights across documents, storage, and activity
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Total Documents</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 700 }}>
                            {loadingSummary ? '…' : summary?.totals?.documents ?? 0}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Total Storage</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 700 }}>
                            {loadingSummary ? '…' : bytesToSize(summary?.totals?.storage_bytes ?? 0)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Events (30d)</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {['uploads', 'views', 'downloads', 'searches'].map((k) => (
                                <Chip key={k} label={`${k}: ${summary?.totals?.events?.[k] ?? 0}`} />
                            ))}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Documents by Type</Typography>
                        {loadingSummary ? (
                            <LinearProgress />
                        ) : (
                            <Box sx={{ height: 260 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={documentsByTypeChart}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="type" />
                                        <YAxis />
                                        <RechartsTooltip />
                                        <Legend />
                                        <Bar dataKey="count" fill="#4F46E5" radius={[6,6,0,0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Activity (30d)</Typography>
                        {loadingSeries ? (
                            <LinearProgress />
                        ) : (
                            <Box sx={{ height: 260 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={activitySeries}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="day" hide />
                                        <YAxis />
                                        <RechartsTooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="uploads" stroke="#22C55E" dot={false} strokeWidth={2} />
                                        <Line type="monotone" dataKey="views" stroke="#06B6D4" dot={false} strokeWidth={2} />
                                        <Line type="monotone" dataKey="searches" stroke="#F59E0B" dot={false} strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    )
}

export default AnalyticsPage


