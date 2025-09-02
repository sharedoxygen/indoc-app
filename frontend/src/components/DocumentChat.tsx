import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  Avatar,
  CircularProgress,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Psychology as ModelIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { useWebSocket } from '../hooks/useWebSocket';
import { formatDistanceToNow } from 'date-fns';
import { ollamaService, OllamaModel } from '../services/ollamaService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import { jsPDF } from 'jspdf';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface DocumentChatProps {
  documentIds?: string[];
  conversationId?: string;
  onNewConversation?: (conversationId: string) => void;
}

export const DocumentChat: React.FC<DocumentChatProps> = ({
  documentIds,
  conversationId: initialConversationId,
  onNewConversation
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAssistantRef = useRef<HTMLDivElement>(null);
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    conversationId ? `/api/v1/chat/ws/chat/${conversationId}` : null
  );

  useEffect(() => { if (conversationId) { loadConversationHistory(); } }, [conversationId]);

  useEffect(() => {
    if (!lastMessage) return;
    const data = JSON.parse(lastMessage.data);
    switch (data.type) {
      case 'message':
        setMessages(prev => [...prev, data.message]);
        setIsTyping(false);
        break;
      case 'typing':
        setIsTyping(true);
        break;
      case 'error':
        console.error('Chat error:', data.message);
        setIsTyping(false);
        break;
    }
  }, [lastMessage]);

  useEffect(() => {
    const loadModels = async () => {
      setModelsLoading(true);
      try {
        const models = await ollamaService.getAvailableModels();
        setAvailableModels(models);
        if (models.length > 0 && !selectedModel) {
          setSelectedModel(models[0].name);
        }
      } catch (error) {
        console.error('Failed to load Ollama models:', error);
      } finally {
        setModelsLoading(false);
      }
    };
    loadModels();
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  const loadConversationHistory = async () => {
    try {
      const response = await fetch(`/api/v1/chat/conversations/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) { console.error('Failed to load conversation history:', error); }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (readyState === WebSocket.OPEN && conversationId) {
        sendMessage(JSON.stringify({ type: 'message', content: inputMessage }));
      } else {
        const response = await fetch('/api/v1/chat/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            message: inputMessage,
            conversation_id: conversationId,
            document_ids: documentIds,
            model: selectedModel,
            stream: false
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (!conversationId && data.conversation_id) {
            setConversationId(data.conversation_id);
            onNewConversation?.(data.conversation_id);
          }
          setMessages(prev => [...prev, data.response]);
        } else {
          const text = await response.text();
          setErrorMessage(text || 'The assistant failed to respond.');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setErrorMessage('Network error while sending message.');
    } finally { setIsLoading(false); }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const getLastAssistantMarkdown = (): string | null => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i].content;
    }
    return null;
  };

  const downloadLastAssistantAsMarkdown = () => {
    const md = getLastAssistantMarkdown();
    if (!md) return;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-response-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadLastAssistantAsPdf = async () => {
    if (!lastAssistantRef.current) return;
    const element = lastAssistantRef.current;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    await pdf.html(element, {
      margin: 40,
      autoPaging: 'text',
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      callback: (doc) => doc.save(`chat-response-${Date.now()}.pdf`),
    });
  };

  return (
    <Paper elevation={3} sx={{ height: { xs: '58vh', md: '60vh' }, display: 'flex', flexDirection: 'column', maxWidth: 1100, mx: 'auto', borderRadius: 3 }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">
            {documentIds && documentIds.length > 0 ? `Chat with ${documentIds.length} document(s)` : 'AI Assistant'}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel>AI Model</InputLabel>
            <Select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              label="AI Model"
              disabled={modelsLoading || availableModels.length === 0}
              startAdornment={<ModelIcon fontSize="small" />}
            >
              {modelsLoading ? (
                <MenuItem disabled>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Loading models...
                </MenuItem>
              ) : availableModels.length === 0 ? (
                <MenuItem disabled> No models available </MenuItem>
              ) : (
                availableModels.map((model) => (
                  <MenuItem key={model.name} value={model.name}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {ollamaService.formatModelName(model)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ollamaService.getModelDescription(model)}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Box>
        {documentIds && documentIds.length > 0 && (
          <Chip icon={<AttachFileIcon />} label={`${documentIds.length} document(s) attached`} size="small" color="primary" />
        )}
        {/* Connection indicator (subtle) + progress */}
        <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
          {(() => {
            let color: string = 'warning.main'
            let label: string = 'HTTP fallback'
            // If no conversation yet, we haven't opened WS; treat as ready via HTTP
            if (!conversationId) { color = 'info.main'; label = 'Ready' }
            else if (readyState === WebSocket.OPEN) { color = 'success.main'; label = 'Realtime' }
            else if (readyState === WebSocket.CONNECTING) { color = 'info.main'; label = 'Connecting…' }
            else if (readyState === WebSocket.CLOSING || readyState === WebSocket.CLOSED) { color = 'error.main'; label = 'Offline' }
            return (
              <Tooltip title={label}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box aria-label={`connection-${label}`} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, '@keyframes pulse': { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.25)' }, '100%': { transform: 'scale(1)' } }, animation: (!conversationId || readyState === WebSocket.OPEN) ? 'none' : 'pulse 1.6s ease-in-out infinite' }} />
                  <Typography variant="caption" sx={{ color, fontWeight: 600, opacity: 0.9 }}>{label}</Typography>
                </Box>
              </Tooltip>
            )
          })()}
          {(isLoading || isTyping) && (
            <LinearProgress sx={{ flex: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #6366F1, #22C55E, #06B6D4, #F59E0B)' } }} />
          )}
        </Box>
      </Box>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <List>
          {messages.map((message) => (
            <ListItem key={message.id} sx={{ flexDirection: message.role === 'user' ? 'row-reverse' : 'row', gap: 1, alignItems: 'flex-start' }}>
              <Avatar sx={{ bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main' }}>
                {message.role === 'user' ? <PersonIcon /> : <BotIcon />}
              </Avatar>
              <Paper elevation={1} sx={{ p: 2, maxWidth: '78%', bgcolor: message.role === 'user' ? 'primary.light' : 'background.paper', color: message.role === 'user' ? 'primary.contrastText' : 'text.primary', border: message.role === 'assistant' ? 1 : 0, borderColor: 'divider', borderRadius: 2 }}>
                <Box sx={{ '& table': { width: '100%', borderCollapse: 'collapse', my: 1 }, '& th, & td': { border: '1px solid', borderColor: 'divider', p: 1, verticalAlign: 'top' }, '& pre': { p: 1.5, overflowX: 'auto', bgcolor: 'background.default', borderRadius: 1, border: 1, borderColor: 'divider' }, '& code': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' } }} ref={message.role === 'assistant' ? lastAssistantRef : undefined}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw as any, rehypeHighlight as any]}>
                    {message.content}
                  </ReactMarkdown>
                </Box>
                <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </Typography>
              </Paper>
            </ListItem>
          ))}

          {isTyping && (
            <ListItem>
              <Avatar sx={{ bgcolor: 'secondary.main' }}><BotIcon /></Avatar>
              <Box sx={{ ml: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" sx={{ ml: 1, display: 'inline' }}>Typing...</Typography>
              </Box>
            </ListItem>
          )}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Input */}
      <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField fullWidth multiline maxRows={4} placeholder="Type your message..." value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={handleKeyPress} disabled={isLoading} />
        <IconButton color="primary" onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()}>
          <SendIcon />
        </IconButton>
        <Tooltip title="Download last answer as Markdown"><IconButton onClick={downloadLastAssistantAsMarkdown}><DownloadIcon /></IconButton></Tooltip>
        <Tooltip title="Download last answer as PDF"><IconButton onClick={downloadLastAssistantAsPdf}><PdfIcon /></IconButton></Tooltip>
      </Box>
      {errorMessage && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderColor: 'error.light', bgcolor: 'error.lighter', color: 'error.dark' as any }}>
            <Typography variant="body2">{errorMessage}</Typography>
          </Paper>
        </Box>
      )}
    </Paper>
  );
};