// Online Chat System - Works on Netlify and other hosting
class OnlineChat {
  constructor() {
    this.baseUrl = window.location.origin;
    this.messages = [];
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

    // Load existing messages
    this.loadMessages();
    
    // Set up periodic sync
    setInterval(() => {
      this.syncMessages();
    }, 3000); // Sync every 3 seconds
  }

  // Load messages from localStorage
  loadMessages() {
    try {
      const stored = localStorage.getItem('onlineChatMessages');
      this.messages = stored ? JSON.parse(stored) : [];
      console.log('Loaded messages:', this.messages);
    } catch (e) {
      console.error('Failed to load messages:', e);
      this.messages = [];
    }
  }

  // Save messages to localStorage
  saveMessages() {
    try {
      localStorage.setItem('onlineChatMessages', JSON.stringify(this.messages));
      console.log('Saved messages:', this.messages);
    } catch (e) {
      console.error('Failed to save messages:', e);
    }
  }

  // Sync messages across tabs
  syncMessages() {
    const currentStored = localStorage.getItem('onlineChatMessages');
    if (currentStored) {
      try {
        const currentMessages = JSON.parse(currentStored);
        if (JSON.stringify(currentMessages) !== JSON.stringify(this.messages)) {
          this.messages = currentMessages;
          this.updateChat();
          console.log('Synced messages from storage');
        }
      } catch (e) {
        console.error('Failed to sync messages:', e);
      }
    }
  }

  // Notify other tabs
  notifyUpdate() {
    // Force storage event
    const timestamp = Date.now();
    localStorage.setItem('chatSync', timestamp.toString());
    localStorage.removeItem('chatSync');
  }

  // Add message
  addMessage(messageData) {
    const message = {
      ...messageData,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      deviceInfo: this.getDeviceInfo(),
      locationInfo: this.getLocationInfo(),
      userAgent: navigator.userAgent,
      ipInfo: null // Will be filled if available
    };

    this.messages.push(message);
    this.saveMessages();
    this.notifyUpdate();
    this.updateChat();

    console.log('Added message:', message);
    return message;
  }

  // Get device information
  getDeviceInfo() {
    const deviceInfo = {
      device: 'Unknown',
      os: 'Unknown',
      browser: 'Unknown',
      screen: `${screen.width}x${screen.height}`,
      language: navigator.language || 'Unknown'
    };

    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      deviceInfo.device = userAgent.includes('tablet') ? 'Tablet' : 'Mobile';
    } else {
      deviceInfo.device = 'Desktop';
    }

    // Detect OS
    if (userAgent.includes('windows')) deviceInfo.os = 'Windows';
    else if (userAgent.includes('mac')) deviceInfo.os = 'macOS';
    else if (userAgent.includes('linux')) deviceInfo.os = 'Linux';
    else if (userAgent.includes('android')) deviceInfo.os = 'Android';
    else if (userAgent.includes('ios') || userAgent.includes('iphone') || userAgent.includes('ipad')) deviceInfo.os = 'iOS';

    // Detect browser
    if (userAgent.includes('chrome')) deviceInfo.browser = 'Chrome';
    else if (userAgent.includes('firefox')) deviceInfo.browser = 'Firefox';
    else if (userAgent.includes('safari')) deviceInfo.browser = 'Safari';
    else if (userAgent.includes('edge')) deviceInfo.browser = 'Edge';

    return deviceInfo;
  }

  // Get location information
  getLocationInfo() {
    const locationInfo = {
      country: 'Unknown',
      city: 'Unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
      timestamp: new Date().toISOString()
    };

    // Try to get location from timezone
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone) {
        // Simple timezone to country mapping
        const timezoneMap = {
          'Asia/Dhaka': { country: 'Bangladesh', city: 'Dhaka' },
          'Asia/Kolkata': { country: 'India', city: 'Kolkata' },
          'Asia/Karachi': { country: 'Pakistan', city: 'Karachi' },
          'Asia/Dubai': { country: 'UAE', city: 'Dubai' },
          'Asia/Singapore': { country: 'Singapore', city: 'Singapore' },
          'Asia/Tokyo': { country: 'Japan', city: 'Tokyo' },
          'America/New_York': { country: 'USA', city: 'New York' },
          'America/Los_Angeles': { country: 'USA', city: 'Los Angeles' },
          'Europe/London': { country: 'UK', city: 'London' },
          'Europe/Paris': { country: 'France', city: 'Paris' },
          'Europe/Berlin': { country: 'Germany', city: 'Berlin' }
        };

        if (timezoneMap[timezone]) {
          locationInfo.country = timezoneMap[timezone].country;
          locationInfo.city = timezoneMap[timezone].city;
        }
      }
    } catch (e) {
      console.log('Could not detect location:', e);
    }

    return locationInfo;
  }

  // Initialize user chat
  initUserChat() {
    console.log('Initializing user chat...');
    
    // Check for existing user info
    const userInfo = localStorage.getItem('chatUserInfo');
    if (userInfo) {
      this.currentUser = JSON.parse(userInfo);
    }

    // Listen for storage events
    window.addEventListener('storage', (e) => {
      if (e.key === 'chatSync' || e.key === 'onlineChatMessages') {
        console.log('Storage event detected in user chat');
        this.syncMessages();
      }
    });

    // Override WhatsApp chat functions
    this.overrideWhatsAppChat();
    
    // Update display
    this.updateUserChat();
  }

  // Override WhatsApp chat functions
  overrideWhatsAppChat() {
    // Wait for WhatsApp chat to be ready
    setTimeout(() => {
      const originalSendMessage = window.sendMessage;
      if (originalSendMessage) {
        window.sendMessage = () => {
          const input = document.getElementById('whatsappInput');
          const message = input.value.trim();
          
          if (message) {
            this.sendUserMessage(message);
            input.value = '';
            
            // Show message immediately
            this.addMessageToChat(message, 'sent');
          }
        };
        console.log('Overridden WhatsApp chat functions');
      }
    }, 1000);
  }

  // Send user message
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
        console.log('Created user:', this.currentUser);
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

      this.addMessage(message);
    }
  }

  // Update user chat display
  updateUserChat() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    // Clear existing messages
    chatMessages.innerHTML = '';

    // Add messages
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

  // Initialize admin chat
  initAdminChat() {
    console.log('Initializing admin chat...');
    this.loadAdminUsers();
    this.setupAdminEventListeners();

    // Listen for storage events
    window.addEventListener('storage', (e) => {
      if (e.key === 'chatSync' || e.key === 'onlineChatMessages') {
        console.log('Storage event detected in admin chat');
        this.syncMessages();
      }
    });

    // Initial load
    setTimeout(() => {
      console.log('Initial admin messages:', this.messages);
      this.loadAdminUsers();
    }, 500);
  }

  // Load admin users
  loadAdminUsers() {
    const userList = document.getElementById('userList');
    if (!userList) {
      console.log('User list element not found');
      return;
    }

    console.log('Loading admin users...');
    
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

    const usersArray = Object.values(users);
    console.log('Active users found:', usersArray);

    // Display users
    userList.innerHTML = '';
    usersArray.forEach(user => {
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

    if (usersArray.length === 0) {
      userList.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No active users found</p>';
    }
  }

  // Select user in admin chat
  selectAdminUser(user) {
    this.selectedUser = user;
    console.log('Selected user:', user);
    
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
    
    const userMessages = this.messages.filter(msg => 
      (msg.type === 'user' && msg.userId === user.id) || 
      (msg.type === 'admin' && msg.userId === user.id)
    );
    
    console.log('Messages for user', user.name, ':', userMessages);
    
    // Get device and location info from last user message
    const lastUserMessage = userMessages.filter(msg => msg.type === 'user').pop();
    const deviceInfo = lastUserMessage?.deviceInfo || {};
    const locationInfo = lastUserMessage?.locationInfo || {};
    
    chatArea.innerHTML = `
      <div class="chat-header">
        <div class="user-avatar">${user.name.split(' ').map(n => n[0]).join('').toUpperCase()}</div>
        <div class="chat-header-info">
          <p class="chat-header-name">${user.name}</p>
          <p class="chat-header-email">${user.email}</p>
          <div class="user-meta" style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
            <span>🖥️ ${deviceInfo.device || 'Unknown'}</span> • 
            <span>🌍 ${locationInfo.country || 'Unknown'}</span> • 
            <span>📍 ${locationInfo.city || 'Unknown'}</span>
          </div>
        </div>
        <div class="user-status"></div>
      </div>
      
      <div class="device-details" style="background: #1e293b; padding: 12px; margin: 10px 0; border-radius: 8px; font-size: 12px; color: #cbd5e1;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <strong>Device:</strong> ${deviceInfo.device || 'Unknown'}<br>
            <strong>OS:</strong> ${deviceInfo.os || 'Unknown'}<br>
            <strong>Browser:</strong> ${deviceInfo.browser || 'Unknown'}
          </div>
          <div>
            <strong>Screen:</strong> ${deviceInfo.screen || 'Unknown'}<br>
            <strong>Country:</strong> ${locationInfo.country || 'Unknown'}<br>
            <strong>City:</strong> ${locationInfo.city || 'Unknown'}
          </div>
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #334155;">
          <strong>Language:</strong> ${deviceInfo.language || 'Unknown'} • 
          <strong>Timezone:</strong> ${locationInfo.timezone || 'Unknown'}
        </div>
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
    window.sendAdminMessage = () => {
      const input = document.getElementById('adminMessageInput');
      const message = input.value.trim();
      
      if (message && this.selectedUser) {
        console.log('Sending admin message:', message);
        
        const adminMessage = {
          type: 'admin',
          userId: this.selectedUser.id,
          content: message
        };

        this.addMessage(adminMessage);
        input.value = '';
      }
    };

    window.handleKeyPress = (event) => {
      if (event.key === 'Enter') {
        window.sendAdminMessage();
      }
    };

    window.testMessage = () => {
      const testUserMessage = {
        type: 'user',
        userId: 'test@example.com',
        userName: 'Test User',
        userEmail: 'test@example.com',
        content: 'This is a test message from user'
      };
      
      this.addMessage(testUserMessage);
      alert('Test message sent! Check console for details.');
    };
  }

  // Update chat display
  updateChat() {
    if (this.isAdmin) {
      if (this.selectedUser) {
        this.loadAdminChat(this.selectedUser);
      }
      this.loadAdminUsers();
    } else {
      this.updateUserChat();
    }
  }
}

// Initialize online chat system
const onlineChat = new OnlineChat();

// Global functions for HTML
window.sendUserMessage = (text) => {
  onlineChat.sendUserMessage(text);
};

console.log('Online chat system initialized');
