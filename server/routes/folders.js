const express = require('express');
const router = express.Router();
const SyncthingService = require('../services/syncthing');

const syncthingService = new SyncthingService();

// GET /api/folders - Get all folders
router.get('/', async (req, res) => {
  try {
    const folders = await syncthingService.getFolders();
    res.json({ success: true, data: folders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/folders - Add new folder
router.post('/', async (req, res) => {
  try {
    const { id, label, path, type, devices, rescanIntervalS } = req.body;
    
    if (!id || !path) {
      return res.status(400).json({ success: false, error: 'Folder ID and path are required' });
    }

    const folderData = {
      id,
      label,
      path,
      type,
      devices,
      rescanIntervalS
    };

    const newFolder = await syncthingService.addFolder(folderData);
    res.json({ success: true, data: newFolder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/folders/:folderID - Update folder
router.put('/:folderID', async (req, res) => {
  try {
    const { folderID } = req.params;
    const folderData = req.body;
    
    const updatedFolder = await syncthingService.updateFolder(folderID, folderData);
    res.json({ success: true, data: updatedFolder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/folders/:folderID - Delete folder
router.delete('/:folderID', async (req, res) => {
  try {
    const { folderID } = req.params;
    
    const result = await syncthingService.deleteFolder(folderID);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/folders/:folderID/pause - Pause folder
router.post('/:folderID/pause', async (req, res) => {
  try {
    const { folderID } = req.params;
    
    const result = await syncthingService.pauseFolder(folderID);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/folders/:folderID/resume - Resume folder
router.post('/:folderID/resume', async (req, res) => {
  try {
    const { folderID } = req.params;
    
    const result = await syncthingService.resumeFolder(folderID);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
