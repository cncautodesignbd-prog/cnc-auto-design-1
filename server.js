const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Data files
const REQUESTS_FILE = path.join(__dirname, 'data', 'requests.json');
const ACTIVE_USERS_FILE = path.join(__dirname, 'data', 'activeUsers.json');
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize data files if they don't exist
if (!fs.existsSync(REQUESTS_FILE)) {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(ACTIVE_USERS_FILE)) {
    fs.writeFileSync(ACTIVE_USERS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
        price6: 999,
        price12: 1699,
        bkash: "017XXXXXXXX",
        nagad: "017XXXXXXXX",
        debitCard: "4111 1111 1111 1111",
        masterCard: "5111 1111 1111 1111"
    }, null, 2));
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Helper functions to read/write data
function readData(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error('Error reading data:', error);
        return [];
    }
}

function writeData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing data:', error);
        return false;
    }
}

// API Routes

// Get all requests
app.get('/api/requests', (req, res) => {
    const requests = readData(REQUESTS_FILE);
    res.json(requests);
});

// Add new request
app.post('/api/requests', (req, res) => {
    const requests = readData(REQUESTS_FILE);
    const newRequest = {
        ...req.body,
        id: Date.now().toString(), // Add unique ID
        created: new Date().toISOString()
    };
    requests.push(newRequest);
    
    if (writeData(REQUESTS_FILE, requests)) {
        res.json({ success: true, message: 'Request added successfully' });
    } else {
        res.status(500).json({ success: false, message: 'Failed to add request' });
    }
});

// Delete request
app.delete('/api/requests/:id', (req, res) => {
    const requests = readData(REQUESTS_FILE);
    const filteredRequests = requests.filter(r => r.id !== req.params.id);
    
    if (writeData(REQUESTS_FILE, filteredRequests)) {
        res.json({ success: true, message: 'Request deleted successfully' });
    } else {
        res.status(500).json({ success: false, message: 'Failed to delete request' });
    }
});

// Get all active users
app.get('/api/active-users', (req, res) => {
    const activeUsers = readData(ACTIVE_USERS_FILE);
    res.json(activeUsers);
});

// Add active user
app.post('/api/active-users', (req, res) => {
    const activeUsers = readData(ACTIVE_USERS_FILE);
    const newUser = {
        ...req.body,
        id: Date.now().toString(), // Add unique ID
        created: new Date().toISOString()
    };
    activeUsers.push(newUser);
    
    if (writeData(ACTIVE_USERS_FILE, activeUsers)) {
        res.json({ success: true, message: 'User added successfully' });
    } else {
        res.status(500).json({ success: false, message: 'Failed to add user' });
    }
});

// Update active user
app.put('/api/active-users/:id', (req, res) => {
    const activeUsers = readData(ACTIVE_USERS_FILE);
    const userIndex = activeUsers.findIndex(u => u.id === req.params.id);
    
    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    activeUsers[userIndex] = { ...activeUsers[userIndex], ...req.body };
    
    if (writeData(ACTIVE_USERS_FILE, activeUsers)) {
        res.json({ success: true, message: 'User updated successfully' });
    } else {
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
});

// Delete active user
app.delete('/api/active-users/:id', (req, res) => {
    const activeUsers = readData(ACTIVE_USERS_FILE);
    const filteredUsers = activeUsers.filter(u => u.id !== req.params.id);
    
    if (writeData(ACTIVE_USERS_FILE, filteredUsers)) {
        res.json({ success: true, message: 'User deleted successfully' });
    } else {
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
});

// Get settings
app.get('/api/settings', (req, res) => {
    const settings = readData(SETTINGS_FILE);
    res.json(settings);
});

// Update settings
app.put('/api/settings', (req, res) => {
    const settings = { ...readData(SETTINGS_FILE), ...req.body };
    
    if (writeData(SETTINGS_FILE, settings)) {
        res.json({ success: true, message: 'Settings updated successfully' });
    } else {
        res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
});

// Check license status endpoint for Windows software
app.post('/api/check-license', (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    // Get active users (approved users)
    const activeUsers = readData(ACTIVE_USERS_FILE);
    const user = activeUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
        // User not found - likely rejected or removed
        return res.status(404).json({ 
            success: false, 
            status: "rejected",
            message: 'Account not found or removed by admin' 
        });
    }
    
    // Check if user account is still valid (not expired)
    if (user.expiry) {
        const expiryDate = new Date(user.expiry);
        const now = new Date();
        if (now > expiryDate) {
            // Delete expired user
            const filteredUsers = activeUsers.filter(u => u.id !== user.id);
            writeData(ACTIVE_USERS_FILE, filteredUsers);
            return res.status(404).json({ 
                success: false, 
                status: "rejected",
                message: 'Account has expired' 
            });
        }
    }
    
    // User is active, return status
    res.json({
        success: true,
        status: "active",
        plan: user.plan || 'trial',
        expiry: user.expiry || (Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
        features: user.features || ["ai_processing", "advanced_tools"],
        email: user.email
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Authentication endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    // Get active users (approved users)
    const activeUsers = readData(ACTIVE_USERS_FILE);
    
    // Find user by email and password (case-insensitive email)
    const user = activeUsers.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && 
        u.password === password
    );
    
    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    
    // Check if user account is still valid (not expired)
    if (user.expiry) {
        const expiryDate = new Date(user.expiry);
        const now = new Date();
        if (now > expiryDate) {
            // Delete expired user
            const filteredUsers = activeUsers.filter(u => u.id !== user.id);
            writeData(ACTIVE_USERS_FILE, filteredUsers);
            return res.status(401).json({ success: false, message: 'Account has expired' });
        }
    }
    
    // Update last login time
    const userIndex = activeUsers.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
        activeUsers[userIndex].lastLogin = new Date().toISOString();
        writeData(ACTIVE_USERS_FILE, activeUsers);
    }
    
    // Return success with user info (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
        success: true, 
        message: 'Login successful',
        user: userWithoutPassword
    });
});

// Check session endpoint
app.get('/api/auth/check', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    // For simplicity, using token as user ID (in production, use JWT)
    const activeUsers = readData(ACTIVE_USERS_FILE);
    const user = activeUsers.find(u => u.id === token);
    
    if (!user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token',
            redirect: '/login/login.html' // Redirect to login page
        });
    }
    
    // Check if account is still valid
    if (user.expiry) {
        const expiryDate = new Date(user.expiry);
        const now = new Date();
        if (now > expiryDate) {
            // Delete expired user
            const filteredUsers = activeUsers.filter(u => u.id !== token);
            writeData(ACTIVE_USERS_FILE, filteredUsers);
            return res.status(401).json({ 
                success: false, 
                message: 'Account has expired',
                redirect: '/login/login.html' // Redirect to login page
            });
        }
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
        success: true, 
        user: userWithoutPassword
    });
});

// Middleware to check if user account is expired
function checkExpiry(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return next(); // No token, continue
    }
    
    const activeUsers = readData(ACTIVE_USERS_FILE);
    const user = activeUsers.find(u => u.id === token);
    
    if (user && user.expiry) {
        const expiryDate = new Date(user.expiry);
        const now = new Date();
        if (now > expiryDate) {
            // Delete expired user
            const filteredUsers = activeUsers.filter(u => u.id !== token);
            writeData(ACTIVE_USERS_FILE, filteredUsers);
            return res.status(401).json({ 
                success: false, 
                message: 'Account has expired',
                redirect: '/login/login.html' // Redirect to login page
            });
        }
    }
    
    next();
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        dataDir: path.join(__dirname, 'data'),
        files: {
            requests: fs.existsSync(REQUESTS_FILE),
            activeUsers: fs.existsSync(ACTIVE_USERS_FILE),
            settings: fs.existsSync(SETTINGS_FILE)
        }
    });
});

// Serve main website
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Data directory: ${path.join(__dirname, 'data')}`);
    console.log(`🌐 Admin panel: /login/admin.html`);
    console.log(`🏠 Main site: /login/index.html`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});
