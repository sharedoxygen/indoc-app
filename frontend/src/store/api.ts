import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from './index'

const baseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    return headers
  },
})

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['User', 'Document', 'Audit', 'Settings'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: new URLSearchParams(credentials),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    getCurrentUser: builder.query({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),

    // Document endpoints
    getDocuments: builder.query({
      query: ({ skip = 0, limit = 100 }) => `/files?skip=${skip}&limit=${limit}`,
      providesTags: ['Document'],
    }),
    getDocument: builder.query({
      query: (id) => `/files/${id}`,
      providesTags: (result, error, id) => [{ type: 'Document', id }],
    }),
    uploadDocument: builder.mutation({
      query: (formData) => ({
        url: '/files',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Document'],
    }),
    updateDocument: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/files/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Document', id }],
    }),
    deleteDocument: builder.mutation({
      query: (id) => ({
        url: `/files/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Document'],
    }),

    // Search endpoints
    searchDocuments: builder.mutation({
      query: (searchQuery) => ({
        url: '/search/query',
        method: 'POST',
        body: searchQuery,
      }),
    }),
    findSimilarDocuments: builder.query({
      query: ({ id, limit = 5 }) => `/search/documents/${id}/similar?limit=${limit}`,
    }),

    // User management endpoints
    getUsers: builder.query({
      query: ({ skip = 0, limit = 100 }) => `/users?skip=${skip}&limit=${limit}`,
      providesTags: ['User'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    // Audit endpoints
    getAuditLogs: builder.query({
      query: (params) => ({
        url: '/audit/logs',
        params,
      }),
      providesTags: ['Audit'],
    }),
    exportAuditLogs: builder.mutation({
      query: (params) => ({
        url: '/audit/export',
        method: 'POST',
        body: params,
      }),
    }),

    // Settings endpoints
    getSettings: builder.query({
      query: (key) => `/settings/${key}`,
      providesTags: (result, error, key) => [{ type: 'Settings', id: key }],
    }),
    updateSettings: builder.mutation({
      query: ({ key, value }) => ({
        url: `/settings/${key}`,
        method: 'PUT',
        body: { value },
      }),
      invalidatesTags: (result, error, { key }) => [{ type: 'Settings', id: key }],
    }),

    // MCP endpoints
    executeTool: builder.mutation({
      query: (toolRequest) => ({
        url: '/mcp/tools/execute',
        method: 'POST',
        body: toolRequest,
      }),
    }),
    getToolMetrics: builder.query({
      query: () => '/mcp/metrics',
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetCurrentUserQuery,
  useGetDocumentsQuery,
  useGetDocumentQuery,
  useUploadDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useSearchDocumentsMutation,
  useFindSimilarDocumentsQuery,
  useGetUsersQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetAuditLogsQuery,
  useExportAuditLogsMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useExecuteToolMutation,
  useGetToolMetricsQuery,
} = api