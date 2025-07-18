require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const devicesRouter = require('./routes/devices');
const foldersRouter = require('./routes/folders');
const systemRouter = require('./routes/system');

const app = express();
const PORT = process.env.APP_PORT || 4567;
const HOST = process.env.APP_HOST || 'localhost';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/devices', devicesRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/system', systemRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Syncthing Web UI API is running',
    timestamp: new Date().toISOString()
  });
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
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
