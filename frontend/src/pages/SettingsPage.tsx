import React from 'react'
import { Box, Paper, Typography } from '@mui/material'

const SettingsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          System settings will be displayed here
        </Typography>
      </Paper>
    </Box>
  )
}

export default SettingsPage