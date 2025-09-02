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
  MenuItem
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Psychology as ModelIcon
} from '@mui/icons-material';
import { useWebSocket } from '../hooks/useWebSocket';
import { formatDistanceToNow } from 'date-fns';
import { ollamaService, OllamaModel } from '../services/ollamaService';

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    conversationId ? `/api/v1/chat/ws/chat/${conversationId}` : null
  );

  // Load conversation history
  useEffect(() => {
    if (conversationId) {
      loadConversationHistory();
    }
  }, [conversationId]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
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
    }
  }, [lastMessage]);

  // Load available models on component mount
  useEffect(() => {
    const loadModels = async () => {
      setModelsLoading(true);
      try {
        const models = await ollamaService.getAvailableModels();
        setAvailableModels(models);

        // Set default model to first available model
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

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationHistory = async () => {
    try {
      const response = await fetch(`/api/v1/chat/conversations/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
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

    try {
      if (readyState === WebSocket.OPEN) {
        // Send via WebSocket for real-time response
        sendMessage(JSON.stringify({
          type: 'message',
          content: inputMessage
        }));
      } else {
        // Fallback to HTTP API
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
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Paper elevation={3} sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">
            {documentIds && documentIds.length > 0
              ? `Chat with ${documentIds.length} document(s)`
              : 'AI Assistant'}
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
                <MenuItem disabled>
                  No models available
                </MenuItem>
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
          <Chip
            icon={<AttachFileIcon />}
            label={`${documentIds.length} document(s) attached`}
            size="small"
            color="primary"
          />
        )}
      </Box>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <List>
          {messages.map((message) => (
            <ListItem
              key={message.id}
              sx={{
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                gap: 1
              }}
            >
              <Avatar sx={{
                bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main'
              }}>
                {message.role === 'user' ? <PersonIcon /> : <BotIcon />}
              </Avatar>

              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  maxWidth: '70%',
                  bgcolor: message.role === 'user' ? 'primary.light' : 'grey.100',
                  color: message.role === 'user' ? 'primary.contrastText' : 'text.primary'
                }}
              >
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {message.content}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </Typography>
              </Paper>
            </ListItem>
          ))}

          {isTyping && (
            <ListItem>
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                <BotIcon />
              </Avatar>
              <Box sx={{ ml: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" sx={{ ml: 1, display: 'inline' }}>
                  Typing...
                </Typography>
              </Box>
            </ListItem>
          )}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Input */}
      <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Type your message..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={isLoading || !inputMessage.trim()}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};