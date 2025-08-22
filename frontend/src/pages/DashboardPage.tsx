import React from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material'
import {
  Description as DocumentIcon,
  CloudUpload as UploadIcon,
  Search as SearchIcon,
  Storage as StorageIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../hooks/redux'

const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)

  const stats = [
    {
      title: 'Total Documents',
      value: '0',
      icon: <DocumentIcon />,
      color: '#1976d2',
      action: '/search',
    },
    {
      title: 'Uploaded Today',
      value: '0',
      icon: <UploadIcon />,
      color: '#4caf50',
      action: '/upload',
    },
    {
      title: 'Recent Searches',
      value: '0',
      icon: <SearchIcon />,
      color: '#ff9800',
      action: '/search',
    },
    {
      title: 'Storage Used',
      value: '0 MB',
      icon: <StorageIcon />,
      color: '#9c27b0',
      action: null,
    },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.full_name || user?.username || 'User'}!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Here's an overview of your document management system
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                cursor: stat.action ? 'pointer' : 'default',
                transition: 'transform 0.2s',
                '&:hover': stat.action ? {
                  transform: 'translateY(-4px)',
                } : {},
              }}
              onClick={() => stat.action && navigate(stat.action)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: `${stat.color}20`,
                      color: stat.color,
                      mr: 2,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Typography color="text.secondary" variant="body2">
                    {stat.title}
                  </Typography>
                </Box>
                <Typography variant="h4" component="div">
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No recent activity to display
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Card
                sx={{ mb: 2, cursor: 'pointer' }}
                onClick={() => navigate('/upload')}
              >
                <CardContent>
                  <Typography variant="subtitle1">
                    📤 Upload Documents
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add new documents to the system
                  </Typography>
                </CardContent>
              </Card>
              <Card
                sx={{ mb: 2, cursor: 'pointer' }}
                onClick={() => navigate('/search')}
              >
                <CardContent>
                  <Typography variant="subtitle1">
                    🔍 Search Documents
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Find documents using AI-powered search
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          System Status
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary">
              Elasticsearch
            </Typography>
            <LinearProgress variant="determinate" value={100} color="success" />
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary">
              Weaviate
            </Typography>
            <LinearProgress variant="determinate" value={100} color="success" />
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary">
              PostgreSQL
            </Typography>
            <LinearProgress variant="determinate" value={100} color="success" />
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary">
              Ollama LLM
            </Typography>
            <LinearProgress variant="determinate" value={100} color="success" />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}

export default DashboardPage