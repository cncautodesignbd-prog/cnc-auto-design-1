const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Verify Login API - Mock response for testing
app.post('/api/verify-login', async (req, res) => {
  try {
    const { email, password, device_info } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }
    
    // Mock user data for testing
    const mockUserData = {
      email: email,
      name: 'Test User',
      plan: 'premium',
      expiry: '2024-12-31T23:59:59.999Z',
      expiry_timestamp: Math.floor(new Date('2024-12-31').getTime() / 1000),
      phone: '+1234567890',
      created: '2024-01-01T00:00:00.000Z',
      amount: '99.99'
    };
    
    console.log(`[DEBUG] Mock login for: ${email}`);
    
    return res.json({
      success: true,
      message: 'Login successful (mock)',
      user_data: mockUserData
    });
    
  } catch (error) {
    console.error('Login verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Admin Approval API - Mock response
app.post('/api/admin-approval', async (req, res) => {
  try {
    const { email, user_data } = req.body;
    
    if (!email || !user_data) {
      return res.status(400).json({
        success: false,
        message: 'Email and user_data required'
      });
    }
    
    console.log(`[DEBUG] Mock admin approval received for: ${email}`);
    
    // Mock approval response
    res.json({
      success: true,
      message: 'Approval notification sent to desktop app (mock)'
    });
    
  } catch (error) {
    console.error('Admin approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Web Login API - Mock response
app.post('/api/web-login-forward', async (req, res) => {
  try {
    const { email, user_data } = req.body;
    
    if (!email || !user_data) {
      return res.status(400).json({
        success: false,
        message: 'Email and user_data required'
      });
    }
    
    console.log(`[DEBUG] Mock web login forward received for: ${email}`);
    
    // Mock login forward response
    res.json({
      success: true,
      message: 'Login notification sent to desktop app (mock)'
    });
    
  } catch (error) {
    console.error('Web login forward error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get desktop notifications API - Mock response
app.get('/api/desktop-notifications', async (req, res) => {
  try {
    // Mock empty notifications array
    const notifications = [];
    
    res.json({
      success: true,
      notifications: notifications
    });
    
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark notification as processed - Mock response
app.delete('/api/desktop-notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`[DEBUG] Mock delete notification: ${id}`);
    
    res.json({
      success: true,
      message: 'Notification marked as processed (mock)'
    });
    
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
