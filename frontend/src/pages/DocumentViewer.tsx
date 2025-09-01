import React from 'react'
import { Box, Paper, Typography, Button, Chip, Stack, TextField, Divider, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import { ArrowBack, Delete } from '@mui/icons-material'
import { useNavigate, useParams } from 'react-router-dom'
import { useGetDocumentQuery, useUpdateDocumentMutation, useDeleteDocumentMutation } from '../store/api'

const DocumentViewer: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  const { data: doc, refetch } = useGetDocumentQuery(id as string, { skip: !id })
  const [updateDocument, { isLoading: isSaving }] = useUpdateDocumentMutation()
  const [deleteDocument, { isLoading: isDeleting }] = useDeleteDocumentMutation()

  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [tags, setTags] = React.useState('')
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  React.useEffect(() => {
    if (doc) {
      setTitle(doc.title || '')
      setDescription(doc.description || '')
      setTags((doc.tags || []).join(', '))
    }
  }, [doc])

  const handleSave = async () => {
    if (!id) return
    await updateDocument({ id, title, description, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }).unwrap()
    await refetch()
  }

  const handleDelete = async () => {
    if (!id) return
    await deleteDocument(id).unwrap()
    navigate('/search')
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
        <Button
          color="error"
          startIcon={<Delete />}
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting}
        >
          Delete
        </Button>
      </Stack>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          {doc?.filename || 'Document'}
        </Typography>

        <Stack spacing={2} sx={{ mb: 2 }}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={3} />
          <TextField label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} helperText="Comma-separated" fullWidth />
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>Save</Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Chip label={`Type: ${doc?.file_type || '-'}`} size="small" />
          <Chip label={`Size: ${doc ? (doc.file_size / 1024).toFixed(1) + ' KB' : '-'}`} size="small" />
          <Chip label={`Status: ${doc?.status || '-'}`} size="small" color={doc?.status === 'failed' ? 'error' : 'default'} />
          <Chip label={`Virus: ${doc?.virus_scan_status || '-'}`} size="small" color={doc?.virus_scan_status === 'clean' ? 'success' : 'warning'} />
        </Stack>

        <Box sx={{ mt: 2, p: 3, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Preview</Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              lineHeight: 1.7,
              fontSize: '1rem',
            }}
          >
            {doc?.full_text || 'No preview available.'}
          </Typography>
        </Box>
      </Paper>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this document?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDelete} disabled={isDeleting}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DocumentViewer