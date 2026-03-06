const fs = require('fs');
const path = require('path');

// Chat messages file path
const CHAT_MESSAGES_FILE = path.join(__dirname, '..', '..', 'data', 'chat-messages.json');

// Initialize data directory and file
function initializeData() {
  const dataDir = path.dirname(CHAT_MESSAGES_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(CHAT_MESSAGES_FILE)) {
    fs.writeFileSync(CHAT_MESSAGES_FILE, JSON.stringify([], null, 2));
  }
}

// Load chat messages
function loadChatMessages() {
  try {
    const data = fs.readFileSync(CHAT_MESSAGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Save chat messages
function saveChatMessages(messages) {
  try {
    fs.writeFileSync(CHAT_MESSAGES_FILE, JSON.stringify(messages, null, 2));
    return true;
  } catch (error) {
    return false;
  }
}

// Main handler function
exports.handler = async (event, context) => {
  // Initialize data
  initializeData();
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const path = event.path.replace('/.netlify/functions/chat-api', '').replace('/api', '');
    const method = event.httpMethod;
    
    // Load current messages
    let chatMessages = loadChatMessages();
    
    switch (method) {
      case 'GET':
        if (path === '/chat-messages') {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              messages: chatMessages,
              count: chatMessages.length
            })
          };
        }
        
        if (path === '/chat-messages/sync') {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              messages: chatMessages,
              count: chatMessages.length,
              lastSync: new Date().toISOString()
            })
          };
        }
        
        if (path.startsWith('/chat-messages/user/')) {
          const userId = path.split('/chat-messages/user/')[1];
          const userMessages = chatMessages.filter(msg => 
            msg.userId === userId || (msg.type === 'admin' && msg.userId === userId)
          );
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              messages: userMessages,
              count: userMessages.length
            })
          };
        }
        
        if (path === '/chat-users') {
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
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              users: userList,
              count: userList.length
            })
          };
        }
        
        break;
        
      case 'POST':
        if (path === '/chat-messages') {
          const message = JSON.parse(event.body);
          
          // Validate message structure
          if (!message.content || !message.type) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({
                success: false,
                error: 'Missing required fields: content, type'
              })
            };
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
          
          // Save to file
          if (saveChatMessages(chatMessages)) {
            console.log('New chat message:', {
              type: message.type,
              userId: message.userId,
              content: message.content.substring(0, 50) + '...'
            });
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                message: 'Message saved successfully',
                messageId: message.id
              })
            };
          } else {
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({
                success: false,
                error: 'Failed to save message'
              })
            };
          }
        }
        
        break;
    }
    
    // If no matching route
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Not found'
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};
