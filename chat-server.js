const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Debug middleware - log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Chat messages storage (in production, use a proper database)
let chatMessages = [];

// Load existing messages from file if exists
const messagesFile = path.join(__dirname, 'chat-messages.json');
if (fs.existsSync(messagesFile)) {
    try {
        const data = fs.readFileSync(messagesFile, 'utf8');
        chatMessages = JSON.parse(data);
        console.log('Loaded', chatMessages.length, 'messages from file');
    } catch (error) {
        console.log('No existing messages file, starting fresh');
    }
}

// Save messages to file periodically
setInterval(() => {
    try {
        fs.writeFileSync(messagesFile, JSON.stringify(chatMessages, null, 2));
        console.log('Saved', chatMessages.length, 'messages to file');
    } catch (error) {
        console.error('Error saving messages:', error);
    }
}, 5000);

// API Routes

// Get all chat messages
app.get('/api/chat-messages', (req, res) => {
    res.json({
        success: true,
        messages: chatMessages,
        count: chatMessages.length
    });
});

// Add new chat message
app.post('/api/chat-messages', (req, res) => {
    try {
        const message = req.body;
        
        // Validate message structure
        if (!message.content || !message.type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: content, type'
            });
        }
        
        // Add timestamp if not provided
        if (!message.timestamp) {
            message.timestamp = new Date().toISOString();
        }
        
        // Add unique ID if not provided
        if (!message.id) {
            message.id = Date.now() + Math.random();
        }
        
        // Add to messages array
        chatMessages.push(message);
        
        console.log('New message:', {
            type: message.type,
            userId: message.userId,
            content: message.content.substring(0, 50) + '...'
        });
        
        res.json({
            success: true,
            message: 'Message saved successfully',
            messageId: message.id
        });
        
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Sync messages (for admin panel)
app.get('/api/chat-messages/sync', (req, res) => {
    res.json({
        success: true,
        messages: chatMessages,
        count: chatMessages.length,
        lastSync: new Date().toISOString()
    });
});

// Get messages for specific user
app.get('/api/chat-messages/user/:userId', (req, res) => {
    const userId = req.params.userId;
    const userMessages = chatMessages.filter(msg => 
        msg.userId === userId || (msg.type === 'admin' && msg.userId === userId)
    );
    
    res.json({
        success: true,
        messages: userMessages,
        count: userMessages.length
    });
});

// Get all unique users
app.get('/api/chat-users', (req, res) => {
    const users = {};
    
    chatMessages.forEach(msg => {
        if (msg.type === 'user' && msg.userId) {
            if (!users[msg.userId]) {
                users[msg.userId] = {
                    id: msg.userId,
                    name: msg.userName || 'Unknown',
                    email: msg.userEmail || 'unknown@example.com',
                    lastMessage: msg.content,
                    lastTime: msg.time || new Date().toLocaleTimeString(),
                    status: 'online',
                    lastSeen: new Date().toISOString()
                };
            } else {
                users[msg.userId].lastMessage = msg.content;
                users[msg.userId].lastTime = msg.time || new Date().toLocaleTimeString();
                users[msg.userId].lastSeen = new Date().toISOString();
            }
        }
    });
    
    const userList = Object.values(users);
    
    res.json({
        success: true,
        users: userList,
        count: userList.length
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'Server is running',
        timestamp: new Date().toISOString(),
        messages: chatMessages.length
    });
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login', 'index.html'));
});

app.get('/admin-live-chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'login', 'admin-live-chat.html'));
});

app.get('/debug', (req, res) => {
    res.sendFile(path.join(__dirname, 'login', 'debug.html'));
});

app.get('/debug.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login', 'debug.html'));
});

// Start server
app.listen(PORT, () => {
    const baseUrl = process.env.NODE_ENV === 'production' 
        ? `https://cnc-auto-design-1.onrender.com` 
        : `http://localhost:${PORT}`;
    
    console.log(`🚀 Chat server running on port ${PORT}`);
    console.log(`📱 Live chat: ${baseUrl}`);
    console.log(`👨‍💻 Admin panel: ${baseUrl}/admin-live-chat`);
    console.log(`📊 API Health: ${baseUrl}/api/health`);
    console.log(`💬 Messages API: ${baseUrl}/api/chat-messages`);
    console.log(`👥 Users API: ${baseUrl}/api/chat-users`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n💾 Saving messages before shutdown...');
    try {
        fs.writeFileSync(messagesFile, JSON.stringify(chatMessages, null, 2));
        console.log('✅ Messages saved successfully');
    } catch (error) {
        console.error('❌ Error saving messages:', error);
    }
    process.exit(0);
});
