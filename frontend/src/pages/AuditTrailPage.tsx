import React from 'react'
import { Box, Paper, Typography } from '@mui/material'

const AuditTrailPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Audit Trail
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Audit logs will be displayed here
        </Typography>
      </Paper>
    </Box>
  )
}

export default AuditTrailPage