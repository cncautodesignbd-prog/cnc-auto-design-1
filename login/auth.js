// Authentication State Manager
class AuthManager {
  constructor() {
    this.init();
  }

  init() {
    this.updateAuthUI();
    this.setupEventListeners();
  }

  // Check if user is logged in
  isLoggedIn() {
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    return !!(userName && userEmail);
  }

  // Get current user info
  getCurrentUser() {
    return {
      name: localStorage.getItem('userName') || '',
      email: localStorage.getItem('userEmail') || '',
      photo: localStorage.getItem('userPhoto') || ''
    };
  }

  // Update authentication UI based on login state
  updateAuthUI() {
    const loginBtn = document.getElementById('loginHeadBtn');
    if (!loginBtn) return;

    if (this.isLoggedIn()) {
      // User is logged in - show Account button
      const user = this.getCurrentUser();
      loginBtn.textContent = 'Account';
      loginBtn.href = 'account.html';
      loginBtn.setAttribute('aria-label', `${user.name || 'User'} logged in`);
    } else {
      // User is not logged in - show Sign in button
      loginBtn.textContent = 'Sign in';
      loginBtn.href = 'login.html';
      loginBtn.setAttribute('aria-label', 'Sign in to your account');
    }
  }

  // Setup event listeners for auth state changes
  setupEventListeners() {
    // Listen for storage changes (for multi-tab sync)
    window.addEventListener('storage', (e) => {
      if (e.key === 'userName' || e.key === 'userEmail') {
        this.updateAuthUI();
      }
    });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateAuthUI();
      }
    });
  }

  // Login function
  login(userName, userEmail, userPhoto = null) {
    localStorage.setItem('userName', userName);
    localStorage.setItem('userEmail', userEmail);
    if (userPhoto) {
      localStorage.setItem('userPhoto', userPhoto);
    }
    this.updateAuthUI();
  }

  // Logout function
  logout() {
    if (confirm('Are you sure you want to sign out?')) {
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userPhoto');
      this.updateAuthUI();
      
      // Redirect to home page if not already there
      if (window.location.pathname !== '/login/index.html') {
        window.location.href = 'index.html';
      }
    }
  }
}

// Global auth manager instance
const authManager = new AuthManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}
