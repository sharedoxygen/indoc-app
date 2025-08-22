import React from 'react'
import { Box, Paper, Typography, Button } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useNavigate, useParams } from 'react-router-dom'

const DocumentViewer: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back
      </Button>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Document Viewer
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Document ID: {id}
        </Typography>
        <Box sx={{ mt: 4, p: 4, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Document content will be displayed here
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}

export default DocumentViewer