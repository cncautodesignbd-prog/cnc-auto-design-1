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

// Desktop Login Requests API (mock)
app.get('/api/desktop-login-requests', async (req, res) => {
  try {
    // Return empty array for now (mock)
    res.json([]);
    
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
