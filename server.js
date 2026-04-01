const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Production: Use environment variables directly
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (projectId && clientEmail && privateKey) {
    try {
      console.log('Initializing Firebase with environment variables...');
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
      
      console.log('✅ Firebase initialized successfully!');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error.message);
      process.exit(1);
    }
  } else {
    // Development: Load from file
    try {
      const serviceAccount = require('./cnc-auto-design-firebase-adminsdk.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase initialized from file');
    } catch (error) {
      console.error('❌ Firebase initialization failed. Please set environment variables:');
      console.error('   - FIREBASE_PROJECT_ID');
      console.error('   - FIREBASE_CLIENT_EMAIL');
      console.error('   - FIREBASE_PRIVATE_KEY');
      process.exit(1);
    }
  }
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

// Admin Approval API - Notify desktop app when admin approves user
app.post('/api/admin-approval', async (req, res) => {
  try {
    const { email, user_data } = req.body;
    
    if (!email || !user_data) {
      return res.status(400).json({
        success: false,
        message: 'Email and user_data required'
      });
    }
    
    console.log(`[DEBUG] Admin approval received for: ${email}`);
    
    // Store approval data for desktop app to fetch
    const approvalData = {
      timestamp: new Date().toISOString(),
      email: email,
      user_data: user_data,
      type: 'admin_approval',
      status: 'approved'
    };
    
    // Save to Firestore collection for desktop sync
    await db.collection('desktopNotifications').add({
      ...approvalData,
      created: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`[DEBUG] Approval notification stored for desktop app`);
    
    // Also try to notify desktop app directly if it's listening
    try {
      const desktopResponse = await fetch('http://127.0.0.1:51234/admin-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalData),
        timeout: 5000
      });
      
      if (desktopResponse.ok) {
        console.log(`[DEBUG] Desktop app notified directly`);
      } else {
        console.log(`[DEBUG] Desktop app not responding, using Firestore only`);
      }
    } catch (desktopError) {
      console.log(`[DEBUG] Desktop app communication failed: ${desktopError.message}`);
    }
    
    res.json({
      success: true,
      message: 'Approval notification sent to desktop app'
    });
    
  } catch (error) {
    console.error('Admin approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Web Login API - Forward login data to desktop app
app.post('/api/web-login-forward', async (req, res) => {
  try {
    const { email, user_data } = req.body;
    
    if (!email || !user_data) {
      return res.status(400).json({
        success: false,
        message: 'Email and user_data required'
      });
    }
    
    console.log(`[DEBUG] Web login forward received for: ${email}`);
    
    // Store login data for desktop app to fetch
    const loginData = {
      timestamp: new Date().toISOString(),
      email: email,
      user_data: user_data,
      type: 'web_login',
      status: 'login_success'
    };
    
    // Save to Firestore collection for desktop sync
    await db.collection('desktopNotifications').add({
      ...loginData,
      created: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`[DEBUG] Web login notification stored for desktop app`);
    
    // Also try to notify desktop app directly if it's listening
    try {
      const desktopResponse = await fetch('http://127.0.0.1:51234/web-login-forward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
        timeout: 5000
      });
      
      if (desktopResponse.ok) {
        console.log(`[DEBUG] Desktop app notified directly`);
      } else {
        console.log(`[DEBUG] Desktop app not responding, using Firestore only`);
      }
    } catch (desktopError) {
      console.log(`[DEBUG] Desktop app communication failed: ${desktopError.message}`);
    }
    
    res.json({
      success: true,
      message: 'Login notification sent to desktop app'
    });
    
  } catch (error) {
    console.error('Web login forward error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get desktop notifications API
app.get('/api/desktop-notifications', async (req, res) => {
  try {
    const snapshot = await db.collection('desktopNotifications')
      .orderBy('created', 'desc')
      .limit(10)
      .get();
    
    const notifications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data
      });
    });
    
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

// Mark notification as processed
app.delete('/api/desktop-notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.collection('desktopNotifications').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Notification marked as processed'
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
