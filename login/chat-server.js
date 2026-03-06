// Chat Server Integration - Real-time messaging with server storage
class ChatServer {
  constructor() {
    this.serverUrl = 'https://cnc-auto-design-1.onrender.com';
    this.messages = [];
    this.init();
  }

  init() {
    // Load existing messages from server
    this.loadMessagesFromServer();
    
    // Set up periodic sync
    setInterval(() => {
      this.syncMessages();
    }, 5000); // Sync every 5 seconds
  }

  // Load messages from server
  async loadMessagesFromServer() {
    try {
      const response = await fetch(`${this.serverUrl}/api/chat-messages`);
      if (response.ok) {
        const data = await response.json();
        this.messages = data.messages || [];
        this.updateLocalStorage();
        this.notifyUpdate();
      }
    } catch (error) {
      console.error('Failed to load messages from server:', error);
      // Fallback to localStorage
      this.loadFromLocalStorage();
    }
  }

  // Load from localStorage as fallback
  loadFromLocalStorage() {
    try {
      this.messages = JSON.parse(localStorage.getItem('chatMessages') || '[]');
    } catch (e) {
      this.messages = [];
    }
  }

  // Save messages to server
  async saveMessageToServer(message) {
    try {
      const response = await fetch(`${this.serverUrl}/api/chat-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Message saved to server:', data);
        return true;
      }
    } catch (error) {
      console.error('Failed to save message to server:', error);
      // Fallback to localStorage
      this.saveToLocalStorage(message);
      return false;
    }
  }

  // Save to localStorage as fallback
  saveToLocalStorage(message) {
    this.messages.push(message);
    localStorage.setItem('chatMessages', JSON.stringify(this.messages));
    this.notifyUpdate();
  }

  // Update localStorage
  updateLocalStorage() {
    localStorage.setItem('chatMessages', JSON.stringify(this.messages));
  }

  // Notify all tabs about update
  notifyUpdate() {
    const event = new StorageEvent('storage', {
      key: 'chatMessages',
      newValue: JSON.stringify(this.messages)
    });
    window.dispatchEvent(event);
  }

  // Sync messages with server
  async syncMessages() {
    try {
      const response = await fetch(`${this.serverUrl}/api/chat-messages/sync`);
      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > this.messages.length) {
          this.messages = data.messages;
          this.updateLocalStorage();
          this.notifyUpdate();
          console.log('Synced new messages from server');
        }
      }
    } catch (error) {
      console.error('Failed to sync messages:', error);
    }
  }

  // Send message (user or admin)
  async sendMessage(messageData) {
    const message = {
      ...messageData,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    console.log('Sending message:', message);

    // Save to server first
    const saved = await this.saveMessageToServer(message);
    
    // Also save locally for immediate display
    if (!saved) {
      this.saveToLocalStorage(message);
    }

    // Force update immediately
    this.notifyUpdate();

    return message;
  }

  // Get messages for specific user
  getUserMessages(userId) {
    return this.messages.filter(msg => 
      (msg.type === 'user' && msg.userId === userId) || 
      (msg.type === 'admin' && msg.userId === userId)
    );
  }

  // Get all unique users
  getActiveUsers() {
    const users = {};
    this.messages.forEach(msg => {
      if (msg.type === 'user' && msg.userId) {
        if (!users[msg.userId]) {
          users[msg.userId] = {
            id: msg.userId,
            name: msg.userName,
            email: msg.userEmail,
            lastMessage: msg.content,
            lastTime: msg.time,
            status: 'online',
            lastSeen: new Date()
          };
        } else {
          users[msg.userId].lastMessage = msg.content;
          users[msg.userId].lastTime = msg.time;
          users[msg.userId].lastSeen = new Date();
        }
      }
    });
    return Object.values(users);
  }
}

// Enhanced Real-time Chat System with Server Integration
class EnhancedRealtimeChat {
  constructor() {
    this.chatServer = new ChatServer();
    this.currentUser = null;
    this.isAdmin = false;
    this.init();
  }

  init() {
    // Check if admin page
    if (window.location.pathname.includes('admin-live-chat.html')) {
      this.isAdmin = true;
      this.initAdminChat();
    } else if (window.location.pathname.includes('index.html')) {
      this.initUserChat();
    }
  }

  // Initialize user chat
  initUserChat() {
    // Check for existing user info
    const userInfo = localStorage.getItem('chatUserInfo');
    if (userInfo) {
      this.currentUser = JSON.parse(userInfo);
    }

    // Listen for storage events
    window.addEventListener('storage', (e) => {
      if (e.key === 'chatMessages') {
        this.updateUserChat();
      }
    });

    this.updateUserChat();
  }

  // Initialize admin chat
  initAdminChat() {
    console.log('Initializing admin chat...');
    this.loadAdminUsers();
    this.setupAdminEventListeners();

    // Listen for storage events
    window.addEventListener('storage', (e) => {
      if (e.key === 'chatMessages') {
        console.log('Storage event detected in admin chat');
        this.updateAdminChat();
      }
    });

    // Initial load
    setTimeout(() => {
      console.log('Initial admin messages:', this.chatServer.messages);
      this.loadAdminUsers();
    }, 1000);
  }

  // Update user chat display
  updateUserChat() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    // Clear existing messages
    chatMessages.innerHTML = '';

    // Get messages from server
    const messages = this.chatServer.messages;

    // Add all messages
    messages.forEach(msg => {
      if (msg.type === 'user' && msg.userId === this.currentUser?.id) {
        this.addMessageToChat(msg.content, 'sent', msg.time);
      } else if (msg.type === 'admin') {
        this.addMessageToChat(msg.content, 'received', msg.time);
      }
    });
  }

  // Add message to chat UI
  addMessageToChat(text, type, time) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const messageTime = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
      <div class="message-content">
        <p>${text}</p>
        <span class="message-time">${messageTime}</span>
      </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Send message from user
  async sendUserMessage(text) {
    if (!this.currentUser) {
      // Get user info from WhatsApp chat form
      const name = document.getElementById('chatName')?.value;
      const email = document.getElementById('chatEmail')?.value;
      
      if (name && email) {
        this.currentUser = {
          id: email,
          name: name,
          email: email
        };
        localStorage.setItem('chatUserInfo', JSON.stringify(this.currentUser));
      }
    }

    if (this.currentUser) {
      const message = {
        type: 'user',
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        userEmail: this.currentUser.email,
        content: text
      };

      await this.chatServer.sendMessage(message);
    }
  }

  // Load admin users
  loadAdminUsers() {
    const userList = document.getElementById('userList');
    if (!userList) {
      console.log('User list element not found');
      return;
    }

    console.log('Loading admin users...');
    
    // Get active users from server
    const users = this.chatServer.getActiveUsers();
    console.log('Active users found:', users);

    // Display users
    userList.innerHTML = '';
    users.forEach(user => {
      const userItem = document.createElement('div');
      userItem.className = `user-item online`;
      userItem.onclick = () => this.selectAdminUser(user);
      
      const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
      
      userItem.innerHTML = `
        <div class="user-avatar">${initials}</div>
        <div class="user-info">
          <p class="user-name">${user.name}</p>
          <p class="user-email">${user.email}</p>
        </div>
        <div class="user-status"></div>
      `;
      
      userList.appendChild(userItem);
    });

    if (users.length === 0) {
      userList.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No active users found</p>';
    }
  }

  // Select user in admin chat
  selectAdminUser(user) {
    this.selectedUser = user;
    
    // Update active state
    document.querySelectorAll('.user-item').forEach(item => {
      item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Load user chat
    this.loadAdminChat(user);
  }

  // Load admin chat for specific user
  loadAdminChat(user) {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;
    
    const userMessages = this.chatServer.getUserMessages(user.id);
    
    chatArea.innerHTML = `
      <div class="chat-header">
        <div class="user-avatar">${user.name.split(' ').map(n => n[0]).join('').toUpperCase()}</div>
        <div class="chat-header-info">
          <p class="chat-header-name">${user.name}</p>
          <p class="chat-header-email">${user.email}</p>
        </div>
        <div class="user-status"></div>
      </div>
      
      <div class="chat-messages" id="adminChatMessages">
        ${userMessages.map(msg => `
          <div class="message ${msg.type === 'admin' ? 'admin' : 'user'}">
            <p class="message-content">${msg.content}</p>
            <span class="message-time">${msg.time}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="chat-input-container">
        <input type="text" class="chat-input" id="adminMessageInput" placeholder="Type your message..." onkeypress="handleKeyPress(event)">
        <button class="send-btn" onclick="sendAdminMessage()">Send</button>
      </div>
    `;
    
    // Scroll to bottom
    const messagesContainer = document.getElementById('adminChatMessages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Setup admin event listeners
  setupAdminEventListeners() {
    window.sendAdminMessage = async () => {
      const input = document.getElementById('adminMessageInput');
      const message = input.value.trim();
      
      if (message && this.selectedUser) {
        const adminMessage = {
          type: 'admin',
          userId: this.selectedUser.id,
          content: message
        };

        await this.chatServer.sendMessage(adminMessage);
        input.value = '';
      }
    };

    window.handleKeyPress = (event) => {
      if (event.key === 'Enter') {
        window.sendAdminMessage();
      }
    };
  }

  // Update admin chat
  updateAdminChat() {
    if (this.selectedUser) {
      this.loadAdminChat(this.selectedUser);
    }
    this.loadAdminUsers();
  }
}

// Initialize the enhanced chat system
const enhancedChat = new EnhancedRealtimeChat();

// Global functions for HTML
window.sendUserMessage = (text) => {
  enhancedChat.sendUserMessage(text);
};

// Override existing WhatsApp chat functions
if (typeof window.sendMessage === 'function') {
  const originalSendMessage = window.sendMessage;
  window.sendMessage = function() {
    const message = document.getElementById('whatsappInput').value.trim();
    if (message) {
      window.sendUserMessage(message);
      originalSendMessage();
    }
  };
}
