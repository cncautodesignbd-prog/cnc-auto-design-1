const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock database for testing (without Firebase)
const mockUsers = [
  {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    plan: 'basic',
    expiry: '2024-12-31',
    created: '2024-01-01'
  }
];

// Mock pending requests (for admin panel)
const mockPendingRequests = [];

// Mock active users (for admin panel)
const mockActiveUsers = [];

// Verify Login API (without Firebase)
app.post('/api/verify-login', async (req, res) => {
  try {
    const { email, password, device_info } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }
    
    // Find user in mock database
    const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check password
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }
    
    // Check expiry
    if (user.expiry) {
      const expiryDate = new Date(user.expiry);
      const now = new Date();
      
      if (expiryDate <= now) {
        return res.status(401).json({
          success: false,
          message: 'Account expired'
        });
      }
      
      // Calculate expiry timestamp
      const expiryTimestamp = Math.floor(expiryDate.getTime() / 1000);
      
      return res.json({
        success: true,
        message: 'Login successful',
        user_data: {
          email: user.email,
          name: user.name,
          plan: user.plan,
          expiry: user.expiry,
          expiry_timestamp: expiryTimestamp,
          phone: user.phone || '',
          created: user.created,
          amount: 0
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'No expiry date found'
      });
    }
    
  } catch (error) {
    console.error('Login verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Desktop Login API (without Firebase)
app.post('/api/desktop-login', async (req, res) => {
  try {
    const { email, user_data } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email required'
      });
    }
    
    // Create desktop login request (mock)
    const loginRequest = {
      id: Date.now().toString(),
      email: email,
      user_data: user_data || {},
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    console.log('Desktop login request created:', loginRequest);
    
    res.json({
      success: true,
      message: 'Desktop login request created',
      request_id: loginRequest.id
    });
    
  } catch (error) {
    console.error('Desktop login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Web Login API (receives login data from website)
app.post('/api/web-login', async (req, res) => {
  try {
    const { email, user_data } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email required'
      });
    }
    
    // Create web login request for desktop app to pick up
    const webLoginRequest = {
      id: Date.now().toString(),
      email: email,
      user_data: user_data || {},
      type: 'web_login',
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    // Store in mock desktop login requests array
    mockDesktopLoginRequests.push(webLoginRequest);
    
    console.log('Web login request created:', webLoginRequest);
    
    res.json({
      success: true,
      message: 'Web login data received successfully',
      request_id: webLoginRequest.id
    });
    
  } catch (error) {
    console.error('Web login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mock desktop login requests (for web login)
const mockDesktopLoginRequests = [];

// Desktop Login Requests API (mock)
app.get('/api/desktop-login-requests', async (req, res) => {
  try {
    // Return pending desktop login requests and mark them as processed
    const pendingRequests = mockDesktopLoginRequests.filter(req => req.status === 'pending');
    
    // Mark returned requests as processed
    pendingRequests.forEach(req => {
      req.status = 'processed';
      req.processed_at = new Date().toISOString();
    });
    
    res.json(pendingRequests);
    
  } catch (error) {
    console.error('Get desktop login requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update Desktop Login Request (mock)
app.patch('/api/desktop-login-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`Update request ${id} to status: ${status}`);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Update desktop login request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Desktop Login Approve API (mock)
app.post('/api/desktop-login-approve', async (req, res) => {
  try {
    const { email, plan, days } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email required'
      });
    }
    
    // Create desktop login request for approved user (mock)
    const loginRequest = {
      id: Date.now().toString(),
      email: email,
      user_data: {
        plan: plan || 'basic',
        expiry: new Date(Date.now() + (days || 180) * 24 * 60 * 60 * 1000).toISOString(),
        approved: true
      },
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    console.log('Desktop login approval created:', loginRequest);
    
    res.json({
      success: true,
      message: 'Desktop login approval created'
    });
    
  } catch (error) {
    console.error('Desktop login approve error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Firebase Sync API (sync users from Firebase to Render server)
app.post('/api/sync-firebase-users', async (req, res) => {
  try {
    const { users } = req.body;
    
    if (!users || !Array.isArray(users)) {
      return res.status(400).json({
        success: false,
        message: 'Users array required'
      });
    }
    
    let syncedCount = 0;
    let updatedCount = 0;
    
    for (const firebaseUser of users) {
      const existingUserIndex = mockActiveUsers.findIndex(u => u.email.toLowerCase() === firebaseUser.email.toLowerCase());
      
      if (existingUserIndex === -1) {
        // Add new user from Firebase
        const newUser = {
          id: firebaseUser.id || Date.now().toString(),
          email: firebaseUser.email.toLowerCase(),
          name: firebaseUser.name || firebaseUser.email.split('@')[0],
          phone: firebaseUser.phone || '',
          trx: firebaseUser.trx || '',
          plan: firebaseUser.plan || 'basic',
          method: firebaseUser.method || 'firebase',
          created: firebaseUser.created || new Date().toISOString(),
          expiry: firebaseUser.expiry || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active'
        };
        
        mockActiveUsers.push(newUser);
        syncedCount++;
      } else {
        // Update existing user with Firebase data
        const existingUser = mockActiveUsers[existingUserIndex];
        if (firebaseUser.name) existingUser.name = firebaseUser.name;
        if (firebaseUser.phone) existingUser.phone = firebaseUser.phone;
        if (firebaseUser.trx) existingUser.trx = firebaseUser.trx;
        if (firebaseUser.plan) existingUser.plan = firebaseUser.plan;
        if (firebaseUser.method) existingUser.method = firebaseUser.method;
        if (firebaseUser.created) existingUser.created = firebaseUser.created;
        if (firebaseUser.expiry) existingUser.expiry = firebaseUser.expiry;
        
        updatedCount++;
      }
    }
    
    console.log(`Firebase sync completed: ${syncedCount} new users, ${updatedCount} updated users`);
    
    res.json({
      success: true,
      message: `Firebase sync completed: ${syncedCount} new users, ${updatedCount} updated users`,
      synced: syncedCount,
      updated: updatedCount,
      total: mockActiveUsers.length
    });
    
  } catch (error) {
    console.error('Firebase sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// User Update API (for admin panel)
app.post('/api/user/update', async (req, res) => {
  try {
    const { email, name, phone, trx, plan, method, created, expiry } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email required'
      });
    }
    
    // Find user in active users
    let userIndex = mockActiveUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    // If user not found, create new user (for new registrations)
    if (userIndex === -1) {
      const newUser = {
        id: Date.now().toString(),
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        phone: phone || '',
        trx: trx || '',
        plan: plan || 'basic',
        method: method || 'unknown',
        created: created || new Date().toISOString(),
        expiry: expiry || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      };
      
      mockActiveUsers.push(newUser);
      console.log('New user created:', { email, name, plan });
      
      return res.json({
        success: true,
        message: 'User created successfully',
        user: newUser
      });
    }
    
    // Update existing user data
    if (name) mockActiveUsers[userIndex].name = name;
    if (phone) mockActiveUsers[userIndex].phone = phone;
    if (trx) mockActiveUsers[userIndex].trx = trx;
    if (plan) mockActiveUsers[userIndex].plan = plan;
    if (method) mockActiveUsers[userIndex].method = method;
    if (created) mockActiveUsers[userIndex].created = created;
    if (expiry) mockActiveUsers[userIndex].expiry = expiry;
    
    console.log('User updated:', { email, name, plan });
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: mockActiveUsers[userIndex]
    });
    
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Active Users Update API (for admin panel)
app.put('/api/active-users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { manualRank, manualRankColor } = req.body;
    
    // Find user by ID
    const userIndex = mockActiveUsers.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update user data
    if (manualRank !== undefined) mockActiveUsers[userIndex].manualRank = manualRank;
    if (manualRankColor) mockActiveUsers[userIndex].manualRankColor = manualRankColor;
    
    console.log('Active user updated:', { id, manualRank, manualRankColor });
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: mockActiveUsers[userIndex]
    });
    
  } catch (error) {
    console.error('Active user update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete Active User API
app.delete('/api/active-users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find user by ID
    const userIndex = mockActiveUsers.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Remove user
    const deletedUser = mockActiveUsers.splice(userIndex, 1)[0];
    
    console.log('Active user deleted:', { id, email: deletedUser.email });
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Chat Messages API
app.get('/api/chat-messages', (req, res) => {
  res.json([]);
});

app.get('/api/chat-messages/sync', (req, res) => {
  res.json({ success: true, message: 'Sync completed' });
});

// Exchange Rates API
app.get('/data/exchange_rates.json', (req, res) => {
  res.json({
    USD: 1.0,
    EUR: 0.85,
    GBP: 0.73,
    JPY: 110.5,
    BDT: 110.0
  });
});

// Auth Check API
app.post('/api/auth/check', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Token required'
    });
  }
  
  // Mock token validation (in real implementation, verify with database)
  res.json({
    success: true,
    valid: true,
    user: {
      id: '123',
      email: 'user@example.com',
      name: 'Test User',
      plan: 'basic'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Status endpoint for desktop app sync
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    logged_in: false,
    user_email: null,
    user_plan: null,
    license_expiry: null
  });
});

// Admin Panel APIs (mock)
app.get('/api/settings', (req, res) => {
  res.json({
    success: true,
    settings: {
      auto_approve: false,
      default_plan: 'basic',
      default_days: 180,
      max_requests_per_day: 50,
      notification_email: '',
      maintenance_mode: false
    }
  });
});

app.get('/api/requests', (req, res) => {
  res.json(mockPendingRequests);
});

app.post('/api/requests', (req, res) => {
  const { email, phone, plan, days, amount } = req.body;
  const newRequest = {
    id: Date.now().toString(),
    email,
    phone: phone || '',
    plan: plan || 'basic',
    days: days || 180,
    amount: amount || 0,
    status: 'pending',
    timestamp: new Date().toISOString()
  };
  mockPendingRequests.push(newRequest);
  res.json({ success: true, request: newRequest });
});

app.delete('/api/requests/:id', (req, res) => {
  const { id } = req.params;
  const index = mockPendingRequests.findIndex(req => req.id === id);
  if (index !== -1) {
    mockPendingRequests.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'Request not found' });
  }
});

app.get('/api/active-users', (req, res) => {
  res.json(mockActiveUsers);
});

app.post('/api/active-users', (req, res) => {
  const { email, name, phone, plan, days, amount } = req.body;
  const newUser = {
    id: Date.now().toString(),
    email,
    name,
    phone: phone || '',
    plan: plan || 'basic',
    expiry: new Date(Date.now() + (days || 180) * 24 * 60 * 60 * 1000).toISOString(),
    created: new Date().toISOString(),
    amount: amount || 0,
    status: 'active'
  };
  mockActiveUsers.push(newUser);
  res.json({ success: true, user: newUser });
});

// Approve request endpoint
app.post('/api/approve-request', (req, res) => {
  try {
    const { requestId, email, plan, days } = req.body;
    
    if (!requestId || !email) {
      return res.status(400).json({
        success: false,
        message: 'Request ID and email required'
      });
    }
    
    // Find and update the request
    const requestIndex = mockPendingRequests.findIndex(req => req.id === requestId);
    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Update request status
    mockPendingRequests[requestIndex].status = 'approved';
    mockPendingRequests[requestIndex].approved_at = new Date().toISOString();
    
    // Add to active users
    const approvedUser = {
      id: Date.now().toString(),
      email,
      name: mockPendingRequests[requestIndex].name || email,
      phone: mockPendingRequests[requestIndex].phone || '',
      plan: plan || 'basic',
      expiry: new Date(Date.now() + (days || 180) * 24 * 60 * 60 * 1000).toISOString(),
      created: new Date().toISOString(),
      amount: mockPendingRequests[requestIndex].amount || 0,
      status: 'active',
      approved_by: 'admin',
      original_request_id: requestId
    };
    
    mockActiveUsers.push(approvedUser);
    
    console.log('Request approved:', { requestId, email, plan, days });
    
    res.json({
      success: true,
      message: 'Request approved successfully',
      user: approvedUser
    });
    
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Direct approve endpoint (for admin panel)
app.post('/approve', (req, res) => {
  try {
    const { email, plan, days } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email required'
      });
    }
    
    console.log('Desktop approve request:', { email, plan, days });
    
    res.json({
      success: true,
      message: 'Desktop approval successful'
    });
    
  } catch (error) {
    console.error('Desktop approve error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
