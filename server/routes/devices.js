const express = require('express');
const router = express.Router();
const SyncthingService = require('../services/syncthing');

const syncthingService = new SyncthingService();

// GET /api/devices - Get all devices
router.get('/', async (req, res) => {
  try {
    const devices = await syncthingService.getDevices();
    res.json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/devices - Add new device
router.post('/', async (req, res) => {
  try {
    const { deviceID, name, addresses, compression, introducer, paused } = req.body;
    
    if (!deviceID) {
      return res.status(400).json({ success: false, error: 'Device ID is required' });
    }

    const deviceData = {
      deviceID,
      name,
      addresses,
      compression,
      introducer,
      paused
    };

    const newDevice = await syncthingService.addDevice(deviceData);
    res.json({ success: true, data: newDevice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/devices/:deviceID - Update device
router.put('/:deviceID', async (req, res) => {
  try {
    const { deviceID } = req.params;
    const deviceData = req.body;
    
    const updatedDevice = await syncthingService.updateDevice(deviceID, deviceData);
    res.json({ success: true, data: updatedDevice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/devices/:deviceID - Delete device
router.delete('/:deviceID', async (req, res) => {
  try {
    const { deviceID } = req.params;
    
    const result = await syncthingService.deleteDevice(deviceID);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/devices/bulk - Bulk add devices with shared folders
router.post('/bulk', async (req, res) => {
  try {
    const { bulkData } = req.body;
    
    if (!bulkData || !Array.isArray(bulkData)) {
      return res.status(400).json({ success: false, error: 'Bulk data array is required' });
    }

    const results = await syncthingService.bulkAddDevices(bulkData);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
