const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin (without service account file for now)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "cnc-auto-design-1",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-xxxxx@cnc-auto-design-1.iam.gserviceaccount.com",
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
    })
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

// Desktop Login API
app.post('/api/desktop-login', async (req, res) => {
  try {
    const { email, user_data } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email required'
      });
    }
    
    // Create desktop login request
    const loginRequest = {
      id: Date.now().toString(),
      email: email,
      user_data: user_data || {},
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    // Store in Firebase
    await db.collection('desktopLoginRequests').add(loginRequest);
    
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

// Desktop Login Requests API
app.get('/api/desktop-login-requests', async (req, res) => {
  try {
    const snapshot = await db.collection('desktopLoginRequests')
      .where('status', '==', 'pending')
      .get();
    
    const requests = [];
    snapshot.forEach(doc => {
      requests.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(requests);
    
  } catch (error) {
    console.error('Get desktop login requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update Desktop Login Request
app.patch('/api/desktop-login-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await db.collection('desktopLoginRequests').doc(id).update({
      status: status || 'processed',
      processed_at: new Date().toISOString()
    });
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Update desktop login request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Desktop Login Approve API
app.post('/api/desktop-login-approve', async (req, res) => {
  try {
    const { email, plan, days } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email required'
      });
    }
    
    // Create desktop login request for approved user
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
    
    // Store in Firebase
    await db.collection('desktopLoginRequests').add(loginRequest);
    
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
