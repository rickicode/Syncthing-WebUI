const bcrypt = require('bcryptjs');

// Authentication middleware
const requireAuth = (req, res, next) => {
  // Check if authentication is enabled
  if (process.env.AUTH_ENABLED !== 'true') {
    return next();
  }

  // Check if user is authenticated
  if (req.session && req.session.authenticated) {
    return next();
  }

  // If it's an API request, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      error: 'Session expired',
      message: 'Please login again',
      requiresLogin: true
    });
  }

  // For regular requests, redirect to login
  res.redirect('/login');
};

// Login handler
const handleLogin = async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Password required'
    });
  }

  // Check password
  const authPassword = process.env.AUTH_PASSWORD || 'admin123';
  
  if (password === authPassword) {
    req.session.authenticated = true;
    return res.json({
      success: true,
      message: 'Login successful'
    });
  } else {
    return res.status(401).json({
      success: false,
      error: 'Invalid password'
    });
  }
};

// Logout handler
const handleLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Failed to logout'
      });
    }
    res.json({
      success: true,
      message: 'Logout successful'
    });
  });
};

// Check auth status
const checkAuth = (req, res) => {
  const isAuthenticated = req.session && req.session.authenticated;
  const authEnabled = process.env.AUTH_ENABLED === 'true';
  
  res.json({
    success: true,
    authenticated: !authEnabled || isAuthenticated,
    authEnabled: authEnabled
  });
};

module.exports = {
  requireAuth,
  handleLogin,
  handleLogout,
  checkAuth
};
