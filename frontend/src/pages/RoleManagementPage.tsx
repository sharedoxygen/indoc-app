import React from 'react'
import { Box, Paper, Typography } from '@mui/material'

const RoleManagementPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          User management interface will be displayed here
        </Typography>
      </Paper>
    </Box>
  )
}

export default RoleManagementPage