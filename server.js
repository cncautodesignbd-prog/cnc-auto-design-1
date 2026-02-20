const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// File-based storage (Render persistent storage)
const DATA_FILE = './data.json';

// API Key validation
const API_KEY = 'cnc_auto_design_2025_online';

function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  
  // Return default data if file doesn't exist
  return {
    pendingRequests: [],
    activeUsers: [],
    approvedRequests: [],
    rejectedRequests: []
  };
}

// Save data to file
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
}

// Generate unique ID
function generateId(prefix) {
  return prefix + '-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
}

// Admin login
app.post('/api/admin/login', validateApiKey, async (req, res) => {
  try {
    const { email } = req.body;
    const ADMIN_EMAILS = ['mdmarufcon84@gmail.com', 'your-admin@gmail.com'];
    
    if (!ADMIN_EMAILS.includes(email)) {
      return res.json({ success: false });
    }

    // Create simple token
    const token = 'admin-token-' + Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    
    res.json({
      success: true,
      token: token,
      email: email
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get pending requests
app.get('/api/admin/pending-requests', validateApiKey, async (req, res) => {
  try {
    const data = loadData();
    res.json({ success: true, requests: data.pendingRequests });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get active users
app.get('/api/admin/active-users', validateApiKey, async (req, res) => {
  try {
    const data = loadData();
    const users = data.activeUsers.map(user => ({
      email: user.email,
      name: user.name,
      plan: user.plan,
      expiry_timestamp: user.expiry,
      days_remaining: calculateDaysRemaining(user.expiry),
      created: user.created,
      phone: user.phone
    }));
    
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching active users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get system stats
app.get('/api/admin/stats', validateApiKey, async (req, res) => {
  try {
    const data = loadData();
    const stats = {
      total_requests: data.pendingRequests.length + data.approvedRequests.length + data.rejectedRequests.length,
      pending_requests: data.pendingRequests.length,
      approved_requests: data.approvedRequests.length,
      active_users: data.activeUsers.length,
      expired_users: data.activeUsers.filter(user => {
        const expiry = new Date(user.expiry);
        return expiry < new Date();
      }).length
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Approve request
app.post('/api/admin/approve', validateApiKey, async (req, res) => {
  try {
    const { request_id, plan, days_valid } = req.body;
    const data = loadData();
    
    // Find the request
    const requestIndex = data.pendingRequests.findIndex(req => req.request_id === request_id);
    if (requestIndex === -1) {
      return res.json({ success: false, error: 'Request not found' });
    }
    
    const requestData = data.pendingRequests[requestIndex];
    
    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days_valid);
    
    // Add to active users
    const activeUser = {
      email: requestData.email,
      name: requestData.name,
      phone: requestData.phone || '',
      plan: plan,
      created: requestData.created,
      expiry: expiryDate.toISOString().split('T')[0],
      approved_at: new Date().toISOString(),
      status: 'active'
    };
    
    // Remove from pending and add to active
    data.activeUsers.push(activeUser);
    data.pendingRequests.splice(requestIndex, 1);
    
    // Add to approved requests
    data.approvedRequests.push({
      ...requestData,
      status: 'approved',
      approved_at: new Date().toISOString(),
      plan: plan,
      days_valid: days_valid
    });
    
    // Save data
    if (saveData(data)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save data' });
    }
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// Reject request
app.post('/api/admin/reject', validateApiKey, async (req, res) => {
  try {
    const { request_id, reason } = req.body;
    const data = loadData();
    
    // Find and remove the request
    const requestIndex = data.pendingRequests.findIndex(req => req.request_id === request_id);
    if (requestIndex === -1) {
      return res.json({ success: false, error: 'Request not found' });
    }
    
    const requestData = data.pendingRequests[requestIndex];
    
    // Remove from pending
    data.pendingRequests.splice(requestIndex, 1);
    
    // Add to rejected requests
    data.rejectedRequests.push({
      ...requestData,
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      reason: reason
    });
    
    // Save data
    if (saveData(data)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save data' });
    }
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Extend license
app.post('/api/admin/extend', validateApiKey, async (req, res) => {
  try {
    const { email, days, reason } = req.body;
    const data = loadData();
    
    const userIndex = data.activeUsers.findIndex(u => u.email === email);
    if (userIndex === -1) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    const userData = data.activeUsers[userIndex];
    const currentExpiry = new Date(userData.expiry);
    currentExpiry.setDate(currentExpiry.getDate() + days);
    
    data.activeUsers[userIndex].expiry = currentExpiry.toISOString().split('T')[0];
    data.activeUsers[userIndex].extended_at = new Date().toISOString();
    data.activeUsers[userIndex].extension_reason = reason;
    
    // Save data
    if (saveData(data)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save data' });
    }
  } catch (error) {
    console.error('Error extending license:', error);
    res.status(500).json({ error: 'Failed to extend license' });
  }
});

// Revoke license
app.post('/api/admin/revoke', validateApiKey, async (req, res) => {
  try {
    const { email, reason } = req.body;
    const data = loadData();
    
    const userIndex = data.activeUsers.findIndex(u => u.email === email);
    if (userIndex === -1) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    data.activeUsers[userIndex].status = 'revoked';
    data.activeUsers[userIndex].revoked_at = new Date().toISOString();
    data.activeUsers[userIndex].revocation_reason = reason;
    
    // Save data
    if (saveData(data)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save data' });
    }
  } catch (error) {
    console.error('Error revoking license:', error);
    res.status(500).json({ error: 'Failed to revoke license' });
  }
});

// User submit request
app.post('/api/user/request', validateApiKey, async (req, res) => {
  try {
    const { name, email, phone, plan, method, trx, device_info } = req.body;
    const data = loadData();
    
    const requestData = {
      request_id: generateId('req'),
      name,
      email,
      phone: phone || '',
      plan,
      method: method || '',
      trx: trx || '',
      device_info: device_info || {},
      status: 'pending',
      created: new Date().toISOString()
    };
    
    data.pendingRequests.push(requestData);
    
    // Save data
    if (saveData(data)) {
      res.json({ success: true, message: 'Request submitted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to save request' });
    }
  } catch (error) {
    console.error('Error submitting request:', error);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// User login verification
app.post('/api/user/login', validateApiKey, async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = loadData();
    
    const user = data.activeUsers.find(u => u.email === email);
    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    // Check if account is active and not expired
    if (user.status !== 'active') {
      return res.json({ success: false, error: 'Account not active' });
    }
    
    const expiryDate = new Date(user.expiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    
    if (expiryDate < today) {
      return res.json({ success: false, error: 'Account expired' });
    }
    
    res.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        plan: user.plan,
        expiry: user.expiry
      }
    });
  } catch (error) {
    console.error('Error verifying login:', error);
    res.status(500).json({ error: 'Login verification failed' });
  }
});

// Helper function
function calculateDaysRemaining(expiry) {
  if (!expiry) return 0;
  
  const expiryDate = new Date(expiry);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);
  
  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Initialize with sample data if needed
function initializeSampleData() {
  const data = loadData();
  
  if (data.pendingRequests.length === 0) {
    data.pendingRequests = [
      {
        request_id: generateId('req'),
        name: 'Test User 1',
        email: 'test1@example.com',
        phone: '01712345678',
        plan: 'basic',
        method: 'bkash',
        trx: 'TRX123456',
        status: 'pending',
        created: new Date().toISOString()
      },
      {
        request_id: generateId('req'),
        name: 'Test User 2',
        email: 'test2@example.com',
        phone: '01887654321',
        plan: 'premium',
        method: 'nagad',
        trx: 'TRX789012',
        status: 'pending',
        created: new Date().toISOString()
      }
    ];
    
    saveData(data);
    console.log('📝 Sample data initialized');
  }
}

// Serve static files
app.use(express.static(path.join(__dirname, 'web')));

const PORT = process.env.PORT || 5000;

// Initialize and start server
initializeSampleData();

app.listen(PORT, () => {
  console.log(`🚀 CNC Admin Server (Render Storage) running on port ${PORT}`);
  console.log(`📊 Admin Panel: https://cnc-auto-design-1.onrender.com/login/admin.html`);
  console.log(`💾 Data stored in: ${DATA_FILE}`);
  console.log(`🔥 No Firebase - Using Render file storage`);
});
