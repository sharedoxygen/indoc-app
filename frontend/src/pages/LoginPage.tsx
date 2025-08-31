import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  Paper,
  Divider,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
} from '@mui/icons-material'
import { useAppDispatch, useAppSelector } from '../hooks/redux'
import { login, clearError } from '../store/slices/authSlice'
import Logo from '../components/Logo'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector((state) => state.auth)

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    if (error) {
      dispatch(clearError())
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await dispatch(login(formData))
    if (login.fulfilled.match(result)) {
      navigate('/dashboard')
    }
  }

  return (
    <Box>
      {/* Logo and branding */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <Logo size="large" />
      </Box>

      <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 700, mb: 1 }}>
        Welcome Back
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4, fontSize: '1.1rem' }}>
        Sign in to access your intelligent document management system
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          name="username"
          label="Email or Username"
          value={formData.username}
          onChange={handleChange}
          margin="normal"
          required
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleChange}
          margin="normal"
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          sx={{
            mt: 3,
            mb: 3,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
              transform: 'translateY(-1px)',
              boxShadow: 4,
            },
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>

        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            or
          </Typography>
        </Divider>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2">
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{
                textDecoration: 'none',
                color: '#1976d2',
                fontWeight: 500,
              }}
            >
              Sign up here
            </Link>
          </Typography>
        </Box>
      </form>
    </Box>
  )
}

export default LoginPage