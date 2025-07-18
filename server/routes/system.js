const express = require('express');
const router = express.Router();
const SyncthingService = require('../services/syncthing');

const syncthingService = new SyncthingService();

// GET /api/system/status - Get system status
router.get('/status', async (req, res) => {
  try {
    const status = await syncthingService.getSystemStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/system/config - Get system configuration
router.get('/config', async (req, res) => {
  try {
    const config = await syncthingService.getSystemConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/system/connections - Get system connections
router.get('/connections', async (req, res) => {
  try {
    const connections = await syncthingService.getSystemConnections();
    res.json({ success: true, data: connections });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
