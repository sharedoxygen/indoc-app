import React, { useState } from 'react'
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  CardActions,
  Chip,
  Grid,
  InputAdornment,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,

  CircularProgress,
  Alert,
  Pagination,
} from '@mui/material'
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandIcon,
  Description as DocumentIcon,
  Schedule as TimeIcon,
  Person as PersonIcon,
  LocalOffer as TagIcon,
  Clear as ClearIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useSearchDocumentsMutation, useFindSimilarDocumentsQuery } from '../store/api'
import { skipToken } from '@reduxjs/toolkit/query'
import { format } from 'date-fns'

interface SearchResult {
  id: string
  filename: string
  title: string
  snippet: string
  score: number
  file_type: string
  tags: string[]
  created_at: string
  uploaded_by: string
  provenance?: any[]
}

interface SearchFilters {
  file_type: string[]
  date_range: { start: Date | null; end: Date | null }
  tags: string[]
  uploaded_by: string
  min_score: number
}

const SearchPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchDocuments, { isLoading }] = useSearchDocumentsMutation()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [executionTime, setExecutionTime] = useState(0)
  const [page, setPage] = useState(1)
  const [resultsPerPage] = useState(10)
  const [searchType, setSearchType] = useState('hybrid')
  const [showFilters, setShowFilters] = useState(false)
  const [similarFor, setSimilarFor] = useState<string | null>(null)
  const { data: similarData } = useFindSimilarDocumentsQuery(
    similarFor ? { id: similarFor, limit: 5 } : skipToken as any,
  ) as any
  const [filters, setFilters] = useState<SearchFilters>({
    file_type: [],
    date_range: { start: null, end: null },
    tags: [],
    uploaded_by: '',
    min_score: 0,
  })

  const handleSearch = async () => {
    if (!query.trim()) return

    try {
      const filterObj: any = {}

      if (filters.file_type.length > 0) {
        filterObj.file_type = filters.file_type
      }
      if (filters.tags.length > 0) {
        filterObj.tags = filters.tags
      }
      if (filters.uploaded_by) {
        filterObj.uploaded_by = filters.uploaded_by
      }
      if (filters.date_range.start || filters.date_range.end) {
        filterObj.date_range = {
          start: filters.date_range.start?.toISOString(),
          end: filters.date_range.end?.toISOString(),
        }
      }

      const response = await searchDocuments({
        query,
        filters: Object.keys(filterObj).length > 0 ? filterObj : undefined,
        limit: resultsPerPage,
        offset: (page - 1) * resultsPerPage,
        search_type: searchType,
      }).unwrap()

      setResults(response.results)
      setTotalResults(response.total_results)
      setExecutionTime(response.execution_time_ms)
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleClearFilters = () => {
    setFilters({
      file_type: [],
      date_range: { start: null, end: null },
      tags: [],
      uploaded_by: '',
      min_score: 0,
    })
  }

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text

    const parts = text.split(new RegExp(`(${highlight})`, 'gi'))
    return parts.map((part, index) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark key={index} style={{ backgroundColor: '#ffeb3b' }}>
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  const getFileTypeColor = (fileType: string) => {
    const colors: Record<string, string> = {
      pdf: '#d32f2f',
      docx: '#1976d2',
      xlsx: '#388e3c',
      pptx: '#f57c00',
      txt: '#616161',
      html: '#7b1fa2',
      json: '#00796b',
      xml: '#5d4037',
    }
    return colors[fileType] || '#757575'
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Search Documents
      </Typography>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <TextField
              fullWidth
              placeholder="Search for documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: query && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setQuery('')}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Search Type</InputLabel>
              <Select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                label="Search Type"
                size="small"
              >
                <MenuItem value="hybrid">Hybrid</MenuItem>
                <MenuItem value="keyword">Keyword</MenuItem>
                <MenuItem value="semantic">Semantic</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={isLoading || !query.trim()}
            >
              Search
            </Button>
          </Grid>
        </Grid>

        {/* Filters */}
        {showFilters && (
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Typography>Advanced Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>File Types</InputLabel>
                    <Select
                      multiple
                      value={filters.file_type}
                      onChange={(e) =>
                        setFilters({ ...filters, file_type: e.target.value as string[] })
                      }
                      label="File Types"
                    >
                      {['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'html', 'json', 'xml'].map(
                        (type) => (
                          <MenuItem key={type} value={type}>
                            {type.toUpperCase()}
                          </MenuItem>
                        )
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Tags"
                    placeholder="Comma-separated tags"
                    value={filters.tags.join(', ')}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Uploaded By"
                    value={filters.uploaded_by}
                    onChange={(e) =>
                      setFilters({ ...filters, uploaded_by: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography gutterBottom>Minimum Relevance Score</Typography>
                  <Slider
                    value={filters.min_score}
                    onChange={(_e, value) =>
                      setFilters({ ...filters, min_score: value as number })
                    }
                    valueLabelDisplay="auto"
                    step={0.1}
                    marks
                    min={0}
                    max={1}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button onClick={handleClearFilters}>Clear Filters</Button>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}
      </Paper>

      {/* Search Results */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && results.length > 0 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Found {totalResults} results in {executionTime.toFixed(0)}ms
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {results.map((result) => (
              <Grid item xs={12} key={result.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'start', mb: 1 }}>
                      <DocumentIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="div">
                          {highlightText(result.title || result.filename, query)}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 2 }}>
                          <Chip
                            label={result.file_type.toUpperCase()}
                            size="small"
                            sx={{
                              bgcolor: getFileTypeColor(result.file_type),
                              color: 'white',
                            }}
                          />
                          <Chip
                            label={`Score: ${(result.score * 100).toFixed(1)}%`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          {result.tags?.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              icon={<TagIcon />}
                              variant="outlined"
                            />
                          ))}
                        </Box>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {highlightText(result.snippet, query)}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            <TimeIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                            {format(new Date(result.created_at), 'MMM dd, yyyy')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                            {result.uploaded_by}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => navigate(`/document/${result.id}`)}
                    >
                      View Document
                    </Button>
                    <Button size="small" onClick={() => setSimilarFor(result.id)}>Find Similar</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {totalResults > resultsPerPage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={Math.ceil(totalResults / resultsPerPage)}
                page={page}
                onChange={(_e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {!isLoading && query && results.length === 0 && (
        <Alert severity="info">
          No documents found matching your search criteria. Try adjusting your query or filters.
        </Alert>
      )}

      {/* Similar Documents Dialog */}
      {similarFor && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Similar Documents</Typography>
            <Button onClick={() => setSimilarFor(null)}>Close</Button>
          </Box>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {(similarData?.similar_documents || []).map((doc: any) => (
              <Grid key={doc.id} item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1">{doc.title || doc.filename || doc.id}</Typography>
                    <Typography variant="body2" color="text.secondary">{doc.snippet || ''}</Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => navigate(`/document/${doc.id}`)}>View</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
            {(!similarData || (similarData?.similar_documents || []).length === 0) && (
              <Grid item xs={12}>
                <Alert severity="info">No similar documents found.</Alert>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Box>
  )
}

export default SearchPage