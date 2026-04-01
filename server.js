const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Firebase Admin SDK
const admin = require('firebase-admin');
const serviceAccount = require('./firebase_config.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Verify Login API
app.post('/api/verify-login', async (req, res) => {
  try {
    const { email, password, device_info } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }
    
    // Get latest active users backup from Firebase
    const snapshot = await db.collection('activeUsersBackup')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'No users found'
      });
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    const users = data.users || [];
    
    // Find user by email
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
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
          phone: user.phone,
          created: user.created,
          amount: user.amount
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
