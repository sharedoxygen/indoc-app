import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  MenuItem,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '../hooks/redux'
import { register } from '../store/slices/authSlice'

const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector((state) => state.auth)
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    confirmPassword: '',
    role: 'Viewer',
  })
  const [validationError, setValidationError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setValidationError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match')
      return
    }
    
    if (formData.password.length < 8) {
      setValidationError('Password must be at least 8 characters')
      return
    }
    
    const result = await dispatch(register({
      email: formData.email,
      username: formData.username,
      full_name: formData.full_name,
      password: formData.password,
      role: formData.role,
    }))
    
    if (register.fulfilled.match(result)) {
      navigate('/login')
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom align="center">
        Create Account
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
        Join inDoc to manage your documents
      </Typography>

      {(error || validationError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || validationError}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          name="email"
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          margin="normal"
          required
        />
        
        <TextField
          fullWidth
          name="username"
          label="Username"
          value={formData.username}
          onChange={handleChange}
          margin="normal"
          required
        />
        
        <TextField
          fullWidth
          name="full_name"
          label="Full Name"
          value={formData.full_name}
          onChange={handleChange}
          margin="normal"
          required
        />
        
        <TextField
          fullWidth
          name="password"
          label="Password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          margin="normal"
          required
        />
        
        <TextField
          fullWidth
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          margin="normal"
          required
        />
        
        <TextField
          fullWidth
          select
          name="role"
          label="Role"
          value={formData.role}
          onChange={handleChange}
          margin="normal"
        >
          <MenuItem value="Viewer">Viewer</MenuItem>
          <MenuItem value="Uploader">Uploader</MenuItem>
        </TextField>

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          sx={{ mt: 3, mb: 2 }}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2">
            Already have an account?{' '}
            <Link to="/login" style={{ textDecoration: 'none', color: '#1976d2' }}>
              Sign in
            </Link>
          </Typography>
        </Box>
      </form>
    </Box>
  )
}

export default RegisterPage