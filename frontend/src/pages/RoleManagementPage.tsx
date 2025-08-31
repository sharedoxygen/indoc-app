import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Avatar,
  Stack,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { useGetUsersQuery, useUpdateUserMutation, useDeleteUserMutation } from '../store/api'

interface User {
  id: number
  email: string
  username: string
  full_name: string
  role: string
  is_active: boolean
  is_verified: boolean
}

const RoleManagementPage: React.FC = () => {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [roleFilter, setRoleFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)

  // API hooks
  const { data, isLoading, error, refetch } = useGetUsersQuery({
    skip: page * rowsPerPage,
    limit: rowsPerPage
  })
  const [updateUser] = useUpdateUserMutation()
  const [deleteUserMutation] = useDeleteUserMutation()

  const users = data || []
  const total = users.length // Note: Backend should return total count

  // Filter users based on search and role
  const filteredUsers = users.filter((user: User) => {
    const matchesSearch = !searchTerm ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = !roleFilter || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleEditUser = async (updatedUser: Partial<User>) => {
    if (!editUser) return

    try {
      await updateUser({ id: editUser.id, ...updatedUser }).unwrap()
      setEditUser(null)
      refetch()
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteUser) return

    try {
      await deleteUserMutation(deleteUser.id).unwrap()
      setDeleteUser(null)
      refetch()
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
      'Admin': 'error',
      'Reviewer': 'warning',
      'Uploader': 'info',
      'Viewer': 'default',
      'Compliance': 'secondary'
    }
    return colors[role] || 'default'
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          Failed to load users. Please check your permissions and try again.
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="between" mb={3}>
        <Typography variant="h4" gutterBottom>
          User Management
        </Typography>
        <Stack direction="row" spacing={2}>
          <IconButton onClick={() => refetch()} color="primary">
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => {/* TODO: Implement add user */ }}
          >
            Add User
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Search users..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Role Filter</InputLabel>
            <Select
              value={roleFilter}
              label="Role Filter"
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <MenuItem value="">All Roles</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Reviewer">Reviewer</MenuItem>
              <MenuItem value="Uploader">Uploader</MenuItem>
              <MenuItem value="Viewer">Viewer</MenuItem>
              <MenuItem value="Compliance">Compliance</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            {filteredUsers.length} of {users.length} users
          </Typography>
        </Stack>
      </Paper>

      {/* Users Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Verification</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((user: User) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar sx={{ bgcolor: getRoleColor(user.role) }}>
                        {getInitials(user.full_name)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {user.full_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          @{user.username}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={getRoleColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_active ? 'Active' : 'Inactive'}
                      color={user.is_active ? 'success' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_verified ? 'Verified' : 'Pending'}
                      color={user.is_verified ? 'success' : 'warning'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={() => setEditUser(user)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setDeleteUser(user)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {editUser && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Full Name"
                defaultValue={editUser.full_name}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select defaultValue={editUser.role} label="Role">
                  <MenuItem value="Admin">Admin</MenuItem>
                  <MenuItem value="Reviewer">Reviewer</MenuItem>
                  <MenuItem value="Uploader">Uploader</MenuItem>
                  <MenuItem value="Viewer">Viewer</MenuItem>
                  <MenuItem value="Compliance">Compliance</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select defaultValue={editUser.is_active ? 'active' : 'inactive'} label="Status">
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>Cancel</Button>
          <Button onClick={() => handleEditUser({})} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={!!deleteUser} onClose={() => setDeleteUser(null)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {deleteUser?.full_name}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUser(null)}>Cancel</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default RoleManagementPage