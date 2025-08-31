import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Paper,
    TextField,
    IconButton,
    Typography,
    List,
    ListItem,
    Avatar,
    Chip,
    Menu,
    MenuItem,
    Collapse,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Send as SendIcon,
    Chat as ChatIcon,
    Close as CloseIcon,
    MoreVert as MoreVertIcon,
    SmartToy as AIIcon,
    Person as PersonIcon,
    Summarize as SummarizeIcon,
    Psychology as AnalyzeIcon,
    List as ListIcon,
    Business as EntitiesIcon,
} from '@mui/icons-material';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    type?: 'summary' | 'sentiment' | 'keypoints' | 'entities' | 'general';
}

interface DocumentChatInterfaceProps {
    documentId?: string;
    documentTitle?: string;
    onClose?: () => void;
    className?: string;
}

const SUGGESTED_PROMPTS = [
    { text: "Summarize this document", icon: <SummarizeIcon />, type: 'summary' },
    { text: "What's the sentiment?", icon: <AnalyzeIcon />, type: 'sentiment' },
    { text: "Extract key points", icon: <ListIcon />, type: 'keypoints' },
    { text: "Find entities", icon: <EntitiesIcon />, type: 'entities' },
];

export const DocumentChatInterface: React.FC<DocumentChatInterfaceProps> = ({
    documentId,
    documentTitle = "Document",
    onClose,
    className,
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (documentId && !conversationId) {
            initializeConversation();
        }
    }, [documentId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const initializeConversation = async () => {
        try {
            const response = await fetch('/api/v1/chat/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    document_id: documentId,
                    title: `Chat with ${documentTitle}`,
                }),
            });

            if (response.ok) {
                const conversation = await response.json();
                setConversationId(conversation.id);

                // Add welcome message
                setMessages([{
                    id: 'welcome',
                    role: 'assistant',
                    content: `Hi! I'm ready to help you analyze "${documentTitle}". You can ask me questions about the content, request summaries, analyze sentiment, or extract key information. What would you like to know?`,
                    timestamp: new Date(),
                    type: 'general',
                }]);
            }
        } catch (error) {
            console.error('Failed to initialize conversation:', error);
            setError('Failed to start conversation. Please try again.');
        }
    };

    const sendMessage = async (content: string, type: string = 'general') => {
        if (!content.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: new Date(),
            type: type as any,
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/v1/chat/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    message: content,
                    conversation_id: conversationId,
                    document_id: documentId,
                    stream: false,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                const assistantMessage: Message = {
                    id: result.response.id || Date.now().toString(),
                    role: 'assistant',
                    content: result.response.content,
                    timestamp: new Date(result.response.created_at || Date.now()),
                    type: type as any,
                };

                setMessages(prev => [...prev, assistantMessage]);
            } else {
                throw new Error('Failed to get response');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message. Please try again.');

            // Add error message
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'I apologize, but I encountered an error processing your request. Please try again.',
                timestamp: new Date(),
                type: 'general',
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(inputValue);
    };

    const handleSuggestedPrompt = (prompt: typeof SUGGESTED_PROMPTS[0]) => {
        sendMessage(prompt.text, prompt.type);
    };

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const clearConversation = () => {
        setMessages([]);
        setConversationId(null);
        if (documentId) {
            initializeConversation();
        }
        handleMenuClose();
    };

    const getMessageIcon = (message: Message) => {
        if (message.role === 'user') {
            return <PersonIcon />;
        }

        switch (message.type) {
            case 'summary': return <SummarizeIcon />;
            case 'sentiment': return <AnalyzeIcon />;
            case 'keypoints': return <ListIcon />;
            case 'entities': return <EntitiesIcon />;
            default: return <AIIcon />;
        }
    };

    const getMessageColor = (message: Message) => {
        if (message.role === 'user') return 'primary';

        switch (message.type) {
            case 'summary': return 'info';
            case 'sentiment': return 'success';
            case 'keypoints': return 'warning';
            case 'entities': return 'secondary';
            default: return 'primary';
        }
    };

    return (
        <Box className={className}>
            <Paper
                elevation={8}
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    width: isExpanded ? 400 : 56,
                    height: isExpanded ? 600 : 56,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    overflow: 'hidden',
                    transition: 'all 0.3s ease-in-out',
                    zIndex: 1300,
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        p: 2,
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                    }}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ChatIcon />
                        {isExpanded && (
                            <Typography variant="subtitle1" noWrap>
                                Chat with {documentTitle}
                            </Typography>
                        )}
                    </Box>

                    {isExpanded && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconButton
                                size="small"
                                sx={{ color: 'white' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMenuClick(e);
                                }}
                            >
                                <MoreVertIcon />
                            </IconButton>
                            {onClose && (
                                <IconButton
                                    size="small"
                                    sx={{ color: 'white', ml: 0.5 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose();
                                    }}
                                >
                                    <CloseIcon />
                                </IconButton>
                            )}
                        </Box>
                    )}
                </Box>

                <Collapse in={isExpanded}>
                    {/* Error Alert */}
                    {error && (
                        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 1 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Messages */}
                    <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                        <List sx={{ py: 0 }}>
                            {messages.map((message) => (
                                <ListItem
                                    key={message.id}
                                    sx={{
                                        flexDirection: 'column',
                                        alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                                        py: 1,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 1,
                                            maxWidth: '85%',
                                            flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                                        }}
                                    >
                                        <Avatar
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                bgcolor: `${getMessageColor(message)}.main`,
                                            }}
                                        >
                                            {getMessageIcon(message)}
                                        </Avatar>

                                        <Paper
                                            elevation={1}
                                            sx={{
                                                p: 1.5,
                                                bgcolor: message.role === 'user' ? 'primary.light' : 'grey.100',
                                                color: message.role === 'user' ? 'white' : 'text.primary',
                                                borderRadius: 2,
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                {message.content}
                                            </Typography>

                                            {message.type && message.type !== 'general' && (
                                                <Chip
                                                    label={message.type}
                                                    size="small"
                                                    sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                                                    color={getMessageColor(message) as any}
                                                />
                                            )}
                                        </Paper>
                                    </Box>

                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ mt: 0.5, alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start' }}
                                    >
                                        {message.timestamp.toLocaleTimeString()}
                                    </Typography>
                                </ListItem>
                            ))}

                            {isLoading && (
                                <ListItem sx={{ justifyContent: 'center', py: 2 }}>
                                    <CircularProgress size={24} />
                                    <Typography variant="body2" sx={{ ml: 1 }}>
                                        Thinking...
                                    </Typography>
                                </ListItem>
                            )}
                        </List>
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Suggested Prompts */}
                    {messages.length <= 1 && !isLoading && (
                        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                Try asking:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {SUGGESTED_PROMPTS.map((prompt, index) => (
                                    <Chip
                                        key={index}
                                        label={prompt.text}
                                        size="small"
                                        icon={prompt.icon}
                                        onClick={() => handleSuggestedPrompt(prompt)}
                                        clickable
                                        sx={{ fontSize: '0.7rem' }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* Input */}
                    <Box component="form" onSubmit={handleSubmit} sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                ref={inputRef}
                                fullWidth
                                size="small"
                                placeholder="Ask about this document..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                disabled={isLoading}
                                multiline
                                maxRows={3}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    },
                                }}
                            />
                            <IconButton
                                type="submit"
                                color="primary"
                                disabled={!inputValue.trim() || isLoading}
                                sx={{ alignSelf: 'flex-end' }}
                            >
                                <SendIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </Collapse>
            </Paper>

            {/* Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={clearConversation}>
                    Clear Conversation
                </MenuItem>
            </Menu>
        </Box>
    );
};
