import React, { useState, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Chip,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { useDropzone } from 'react-dropzone'
import { useUploadDocumentMutation } from '../store/api'
import { useAppDispatch } from '../hooks/redux'
import { showNotification } from '../store/slices/uiSlice'

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  response?: any
}

const UploadPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const [uploadDocument] = useUploadDocumentMutation()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    tags: '',
  })
  const [showResultModal, setShowResultModal] = useState(false)
  const [selectedResult, setSelectedResult] = useState<any>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending' as const,
      progress: 0,
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'text/html': ['.html'],
      'text/xml': ['.xml'],
      'application/json': ['.json'],
      'message/rfc822': ['.eml'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/tiff': ['.tiff'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
  })

  const handleUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending')

    for (const uploadFile of pendingFiles) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'uploading', progress: 50 }
            : f
        )
      )

      const formData = new FormData()
      formData.append('file', uploadFile.file)
      if (metadata.title) formData.append('title', metadata.title)
      if (metadata.description) formData.append('description', metadata.description)
      if (metadata.tags) formData.append('tags', metadata.tags)

      try {
        const response = await uploadDocument(formData).unwrap()

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'success', progress: 100, response }
              : f
          )
        )

        setSelectedResult(response)
        setShowResultModal(true)

        dispatch(
          showNotification({
            message: `${uploadFile.file.name} uploaded successfully`,
            severity: 'success',
          })
        )
      } catch (error: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                ...f,
                status: 'error',
                progress: 0,
                error: error.data?.detail || 'Upload failed',
              }
              : f
          )
        )

        dispatch(
          showNotification({
            message: `Failed to upload ${uploadFile.file.name}`,
            severity: 'error',
          })
        )
      }
    }
  }

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const handleViewResult = (result: any) => {
    setSelectedResult(result)
    setShowResultModal(true)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <SuccessIcon color="success" />
      case 'error':
        return <ErrorIcon color="error" />
      default:
        return <FileIcon />
    }
  }

  const hasFiles = files.length > 0
  const hasPendingFiles = files.some((f) => f.status === 'pending')
  const isUploading = files.some((f) => f.status === 'uploading')

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Upload Documents
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive
                  ? 'Drop the files here...'
                  : 'Drag & drop files here, or click to select'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supported formats: PDF, DOCX, XLSX, PPTX, TXT, HTML, XML, JSON, EML, PNG, JPG, TIFF
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Maximum file size: 100MB
              </Typography>
            </Box>

            {hasFiles && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Files to Upload
                </Typography>
                <List>
                  {files.map((uploadFile) => (
                    <ListItem
                      key={uploadFile.id}
                      secondaryAction={
                        uploadFile.status === 'pending' ? (
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveFile(uploadFile.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        ) : uploadFile.status === 'success' ? (
                          <Button
                            size="small"
                            onClick={() => handleViewResult(uploadFile.response)}
                          >
                            View
                          </Button>
                        ) : null
                      }
                    >
                      <ListItemIcon>{getStatusIcon(uploadFile.status)}</ListItemIcon>
                      <ListItemText
                        primary={uploadFile.file.name}
                        secondary={
                          uploadFile.status === 'uploading' ? (
                            <LinearProgress
                              variant="determinate"
                              value={uploadFile.progress}
                              sx={{ mt: 1 }}
                            />
                          ) : uploadFile.error ? (
                            <Typography color="error" variant="caption">
                              {uploadFile.error}
                            </Typography>
                          ) : (
                            `${(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB`
                          )
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Document Metadata
            </Typography>
            <TextField
              fullWidth
              label="Title"
              value={metadata.title}
              onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              margin="normal"
              helperText="Optional: Custom title for the document"
            />
            <TextField
              fullWidth
              label="Description"
              value={metadata.description}
              onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              helperText="Optional: Brief description"
            />
            <TextField
              fullWidth
              label="Tags"
              value={metadata.tags}
              onChange={(e) => setMetadata({ ...metadata, tags: e.target.value })}
              margin="normal"
              helperText="Comma-separated tags"
            />
            {metadata.tags && (
              <Box sx={{ mt: 1 }}>
                {metadata.tags.split(',').map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag.trim()}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            )}
          </Paper>

          <Box sx={{ mt: 3 }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<UploadIcon />}
              onClick={handleUpload}
              disabled={!hasPendingFiles || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              All uploaded documents will be:
            </Typography>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Scanned for viruses</li>
              <li>Processed for text extraction</li>
              <li>Indexed for search</li>
              <li>Encrypted if containing sensitive data</li>
            </ul>
          </Alert>
        </Grid>
      </Grid>

      {/* Result Modal */}
      <Dialog
        open={showResultModal}
        onClose={() => setShowResultModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Upload Successful
          <IconButton
            onClick={() => setShowResultModal(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedResult && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Document ID:</strong> {selectedResult.uuid}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Status:</strong>{' '}
                <Chip
                  label={selectedResult.status}
                  color={selectedResult.status === 'pending' ? 'warning' : 'success'}
                  size="small"
                />
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Virus Scan:</strong>{' '}
                <Chip
                  label={selectedResult.virus_scan_status}
                  color={selectedResult.virus_scan_status === 'clean' ? 'success' : 'error'}
                  size="small"
                />
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResultModal(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedResult) {
                window.location.href = `/document/${selectedResult.uuid}`
              }
            }}
          >
            View Document
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default UploadPage