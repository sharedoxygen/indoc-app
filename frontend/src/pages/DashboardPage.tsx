import React, { useEffect, useState } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  Description as DocumentIcon,
  CloudUpload as UploadIcon,
  Search as SearchIcon,
  Storage as StorageIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../hooks/redux'
import { useGetDocumentsQuery, useGetUsersQuery, useGetDependenciesHealthQuery, useGetAuditLogsQuery } from '../store/api'

interface DashboardStats {
  totalDocuments: number
  uploadedToday: number
  recentSearches: number
  storageUsed: string
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalDocuments: 0,
    uploadedToday: 0,
    recentSearches: 0,
    storageUsed: '0 MB'
  })

  // Fetch documents, users, and health data
  const { data: documentsData, isLoading: documentsLoading, error: documentsError } = useGetDocumentsQuery({ skip: 0, limit: 1000 })
  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery({ skip: 0, limit: 1000 })
  const { data: healthData, isLoading: healthLoading } = useGetDependenciesHealthQuery(undefined as any)
  const { data: auditData, isLoading: auditLoading } = useGetAuditLogsQuery({ skip: 0, limit: 5 })

  // Calculate dashboard statistics
  useEffect(() => {
    if (documentsData) {
      // Handle the API response format: { total, documents }
      const documents = documentsData.documents || []
      const totalDocuments = documentsData.total || documents.length
      const today = new Date().toDateString()

      // Calculate uploaded today
      const uploadedToday = documents.filter((doc: any) => {
        const uploadDate = new Date(doc.created_at || doc.uploaded_at || '').toDateString()
        return uploadDate === today
      }).length

      // Calculate storage used (rough estimate)
      const totalSize = documents.reduce((sum: number, doc: any) => sum + (doc.file_size || 0), 0)
      const storageUsed = totalSize > 0 ? `${(totalSize / (1024 * 1024)).toFixed(1)} MB` : '0 MB'

      setDashboardStats({
        totalDocuments,
        uploadedToday,
        recentSearches: 0, // TODO: Implement search tracking via backend API
        storageUsed
      })
    }
  }, [documentsData])

  const stats = [
    {
      title: 'Total Documents',
      value: dashboardStats.totalDocuments.toString(),
      icon: <DocumentIcon />,
      color: '#1976d2',
      action: '/documents',
      loading: documentsLoading,
    },
    {
      title: 'Uploaded Today',
      value: dashboardStats.uploadedToday.toString(),
      icon: <UploadIcon />,
      color: '#4caf50',
      action: '/upload',
      loading: documentsLoading,
    },
    {
      title: 'Recent Searches',
      value: dashboardStats.recentSearches.toString(),
      icon: <SearchIcon />,
      color: '#ff9800',
      action: '/search',
      loading: false,
    },
    {
      title: 'Storage Used',
      value: dashboardStats.storageUsed,
      icon: <StorageIcon />,
      color: '#9c27b0',
      action: null,
      loading: documentsLoading,
    },
  ]

  if (documentsError) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load dashboard data. Please check your connection and try again.
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
          Welcome back, {user?.full_name || user?.username || 'User'}! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
          Here's an overview of your document management system
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                cursor: stat.action ? 'pointer' : 'default',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': stat.action ? {
                  transform: 'translateY(-8px)',
                  boxShadow: 6,
                } : {},
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: `linear-gradient(90deg, ${stat.color}, ${stat.color}dd)`,
                },
              }}
              onClick={() => stat.action && navigate(stat.action)}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                    {stat.title}
                  </Typography>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: `${stat.color}15`,
                      color: stat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, mb: 1 }}>
                  {stat.loading ? <CircularProgress size={32} /> : stat.value}
                </Typography>
                {stat.action && (
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    Click to explore →
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Recent Activity
            </Typography>
            {auditLoading ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress size={24} />
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Loading recent activity...
                </Typography>
              </Box>
            ) : auditData?.logs && auditData.logs.length > 0 ? (
              <Box>
                {auditData.logs.slice(0, 5).map((log: any, index: number) => (
                  <Box key={index} sx={{ py: 1, borderBottom: index < 4 ? '1px solid #eee' : 'none' }}>
                    <Typography variant="body2">
                      <strong>{log.user_email}</strong> {log.action} {log.resource_type}
                      {log.resource_id && ` (ID: ${log.resource_id})`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(log.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No recent activity to display
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                    borderColor: 'primary.main',
                  }
                }}
                onClick={() => navigate('/upload')}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'success.50',
                      color: 'success.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <UploadIcon />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Upload Documents
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Add new documents to the system
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                    borderColor: 'primary.main',
                  }
                }}
                onClick={() => navigate('/search')}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'warning.50',
                      color: 'warning.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <SearchIcon />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Search Documents
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Find documents using AI-powered search
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          System Status
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {healthData && Object.entries(healthData).map(([service, health]: [string, any]) => (
            <Grid item xs={12} md={3} key={service}>
              <Typography variant="body2" color="text.secondary">
                {service.charAt(0).toUpperCase() + service.slice(1)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={health?.healthy ? 100 : 0}
                color={health?.healthy ? "success" : "error"}
              />
              {health?.status && (
                <Typography variant="caption" color="text.secondary">
                  {health.status}
                </Typography>
              )}
            </Grid>
          ))}
          {healthLoading && (
            <Grid item xs={12}>
              <CircularProgress size={20} />
              <Typography variant="caption" sx={{ ml: 1 }}>Loading system status...</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  )
}

export default DashboardPage