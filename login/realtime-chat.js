// Real-time Chat System
class RealtimeChat {
  constructor() {
    this.messages = this.loadMessages();
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

  // Load messages from localStorage
  loadMessages() {
    try {
      return JSON.parse(localStorage.getItem('chatMessages') || '[]');
    } catch (e) {
      return [];
    }
  }

  // Save messages to localStorage
  saveMessages() {
    localStorage.setItem('chatMessages', JSON.stringify(this.messages));
  }

  // Add message to storage
  addMessage(message) {
    this.messages.push(message);
    this.saveMessages();
    this.notifyNewMessage(message);
  }

  // Notify other tabs about new message
  notifyNewMessage(message) {
    // Use storage event to notify other tabs
    const event = new StorageEvent('storage', {
      key: 'chatMessages',
      newValue: JSON.stringify(this.messages),
      oldValue: JSON.stringify(this.messages.slice(0, -1))
    });
    window.dispatchEvent(event);
  }

  // Initialize user chat interface
  initUserChat() {
    // Check for existing user info
    const userInfo = localStorage.getItem('chatUserInfo');
    if (userInfo) {
      this.currentUser = JSON.parse(userInfo);
    }

    // Listen for storage events (messages from admin)
    window.addEventListener('storage', (e) => {
      if (e.key === 'chatMessages') {
        this.messages = JSON.parse(e.newValue || '[]');
        this.updateUserChat();
      }
    });

    // Update existing WhatsApp chat to use this system
    this.updateUserChat();
  }

  // Update user chat interface
  updateUserChat() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    // Clear existing messages
    chatMessages.innerHTML = '';

    // Add all messages
    this.messages.forEach(msg => {
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
  sendUserMessage(text) {
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
        id: Date.now(),
        type: 'user',
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        userEmail: this.currentUser.email,
        content: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      this.addMessage(message);
    }
  }

  // Initialize admin chat interface
  initAdminChat() {
    this.loadAdminUsers();
    this.setupAdminEventListeners();

    // Listen for storage events (messages from users)
    window.addEventListener('storage', (e) => {
      if (e.key === 'chatMessages') {
        this.messages = JSON.parse(e.newValue || '[]');
        this.updateAdminChat();
      }
    });
  }

  // Load admin users list
  loadAdminUsers() {
    const userList = document.getElementById('userList');
    if (!userList) return;

    // Get unique users from messages
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
            status: 'online'
          };
        } else {
          users[msg.userId].lastMessage = msg.content;
          users[msg.userId].lastTime = msg.time;
        }
      }
    });

    // Display users
    userList.innerHTML = '';
    Object.values(users).forEach(user => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item online';
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
        ${this.messages.filter(msg => 
          (msg.type === 'user' && msg.userId === user.id) || 
          (msg.type === 'admin' && msg.userId === user.id)
        ).map(msg => `
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
    // This will be called from the HTML
    window.sendAdminMessage = () => {
      const input = document.getElementById('adminMessageInput');
      const message = input.value.trim();
      
      if (message && this.selectedUser) {
        const adminMessage = {
          id: Date.now(),
          type: 'admin',
          userId: this.selectedUser.id,
          content: message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        this.addMessage(adminMessage);
        input.value = '';
        
        // Update the chat display
        this.addAdminMessageToDisplay(message, adminMessage.time);
      }
    };

    window.handleKeyPress = (event) => {
      if (event.key === 'Enter') {
        window.sendAdminMessage();
      }
    };
  }

  // Add admin message to display
  addAdminMessageToDisplay(message, time) {
    const messagesContainer = document.getElementById('adminChatMessages');
    if (!messagesContainer) return;

    const messageElement = document.createElement('div');
    messageElement.className = 'message admin';
    messageElement.innerHTML = `
      <p class="message-content">${message}</p>
      <span class="message-time">${time}</span>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Update admin chat when new messages arrive
  updateAdminChat() {
    if (this.selectedUser) {
      this.loadAdminChat(this.selectedUser);
    }
    this.loadAdminUsers(); // Refresh user list
  }
}

// Initialize the chat system
const realtimeChat = new RealtimeChat();

// Global functions for HTML
window.sendUserMessage = (text) => {
  realtimeChat.sendUserMessage(text);
};

// Override existing WhatsApp chat functions to use real-time system
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
