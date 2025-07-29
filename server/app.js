require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');

// Import routes
const devicesRouter = require('./routes/devices');
const foldersRouter = require('./routes/folders');
const systemRouter = require('./routes/system');

// Import auth middleware
const { requireAuth, handleLogin, handleLogout, checkAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.APP_PORT || 4567;
const HOST = process.env.APP_HOST || '0.0.0.0';

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication routes (before static files)
app.post('/api/auth/login', handleLogin);
app.post('/api/auth/logout', handleLogout);
app.get('/api/auth/status', checkAuth);

// Login page route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes (protected by authentication)
app.use('/api/devices', requireAuth, devicesRouter);
app.use('/api/folders', requireAuth, foldersRouter);
app.use('/api/system', requireAuth, systemRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Syncthing Web UI API is running',
    timestamp: new Date().toISOString()
  });
});

// Protected routes
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/folders.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/folders.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Not found',
    message: `Route ${req.originalUrl} not found` 
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Syncthing Web UI server running at http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Syncthing server: ${process.env.SYNCTHING_HTTPS === 'true' ? 'https' : 'http'}://${process.env.SYNCTHING_HOST}:${process.env.SYNCTHING_PORT}`);
});

module.exports = app;
