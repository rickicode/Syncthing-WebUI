const axios = require('axios');

class SyncthingService {
  constructor() {
    this.baseURL = `${process.env.SYNCTHING_HTTPS === 'true' ? 'https' : 'http'}://${process.env.SYNCTHING_HOST}:${process.env.SYNCTHING_PORT}`;
    this.apiKey = process.env.SYNCTHING_API_KEY;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  // System methods
  async getSystemConfig() {
    try {
      const response = await this.client.get('/rest/system/config');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get system config: ${error.message}`);
    }
  }

  async getSystemStatus() {
    try {
      const response = await this.client.get('/rest/system/status');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get system status: ${error.message}`);
    }
  }

  async getSystemConnections() {
    try {
      const response = await this.client.get('/rest/system/connections');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get system connections: ${error.message}`);
    }
  }

  // Device methods
  async getDevices() {
    try {
      const config = await this.getSystemConfig();
      const connections = await this.getSystemConnections();
      
      return config.devices.map(device => ({
        deviceID: device.deviceID,
        name: device.name,
        addresses: device.addresses,
        compression: device.compression,
        introducer: device.introducer,
        paused: device.paused,
        connected: connections.connections[device.deviceID] ? connections.connections[device.deviceID].connected : false,
        lastSeen: connections.connections[device.deviceID] ? connections.connections[device.deviceID].at : null
      }));
    } catch (error) {
      throw new Error(`Failed to get devices: ${error.message}`);
    }
  }

  async addDevice(deviceData) {
    try {
      const config = await this.getSystemConfig();
      
      const newDevice = {
        deviceID: deviceData.deviceID,
        name: deviceData.name || deviceData.deviceID.substring(0, 7),
        addresses: deviceData.addresses || ['dynamic'],
        compression: deviceData.compression || 'metadata',
        certName: "",
        introducer: deviceData.introducer || false,
        skipIntroductionRemovals: false,
        introducedBy: "",
        paused: deviceData.paused || false,
        allowedNetworks: [],
        autoAcceptFolders: false,
        maxSendKbps: 0,
        maxRecvKbps: 0,
        ignoredFolders: [],
        maxRequestKiB: 0,
        untrusted: false,
        remoteGUIPort: 0,
        numConnections: 0
      };

      config.devices.push(newDevice);
      
      // Handle shared folders if provided
      if (deviceData.sharedFolders && deviceData.sharedFolders.length > 0) {
        this.updateFolderDeviceSharing(config, deviceData.deviceID, deviceData.sharedFolders);
      }
      
      await this.client.post('/rest/system/config', config);
      return newDevice;
    } catch (error) {
      throw new Error(`Failed to add device: ${error.message}`);
    }
  }

  async updateDevice(deviceID, deviceData) {
    try {
      const config = await this.getSystemConfig();
      const deviceIndex = config.devices.findIndex(d => d.deviceID === deviceID);
      
      if (deviceIndex === -1) {
        throw new Error('Device not found');
      }

      // Handle shared folders update if provided
      if (deviceData.sharedFolders !== undefined) {
        this.updateFolderDeviceSharing(config, deviceID, deviceData.sharedFolders);
        // Remove sharedFolders from deviceData to avoid updating device config with it
        delete deviceData.sharedFolders;
      }

      config.devices[deviceIndex] = { ...config.devices[deviceIndex], ...deviceData };
      
      await this.client.post('/rest/system/config', config);
      return config.devices[deviceIndex];
    } catch (error) {
      throw new Error(`Failed to update device: ${error.message}`);
    }
  }

  // Helper method to update folder device sharing
  updateFolderDeviceSharing(config, deviceID, sharedFolderIds) {
    // First, remove device from all folders
    config.folders.forEach(folder => {
      folder.devices = folder.devices.filter(d => d.deviceID !== deviceID);
    });

    // Then, add device to selected folders
    sharedFolderIds.forEach(folderId => {
      const folder = config.folders.find(f => f.id === folderId);
      if (folder) {
        // Check if device is not already in the folder
        const deviceExists = folder.devices.some(d => d.deviceID === deviceID);
        if (!deviceExists) {
          folder.devices.push({
            deviceID: deviceID,
            introducedBy: '',
            encryptionPassword: ''
          });
        }
      }
    });
  }

  async deleteDevice(deviceID) {
    try {
      const config = await this.getSystemConfig();
      
      // Add debugging
      console.log('Delete device request for ID:', deviceID);
      console.log('Available devices:', config.devices.map(d => ({ id: d.deviceID, name: d.name })));
      
      // Try to find device with exact match first
      let deviceIndex = config.devices.findIndex(d => d.deviceID === deviceID);
      
      // If not found, try URL decoded version
      if (deviceIndex === -1) {
        const decodedDeviceID = decodeURIComponent(deviceID);
        console.log('Trying decoded device ID:', decodedDeviceID);
        deviceIndex = config.devices.findIndex(d => d.deviceID === decodedDeviceID);
      }
      
      // If still not found, try case-insensitive search
      if (deviceIndex === -1) {
        console.log('Trying case-insensitive search');
        deviceIndex = config.devices.findIndex(d => d.deviceID.toLowerCase() === deviceID.toLowerCase());
      }
      
      if (deviceIndex === -1) {
        console.log('Device not found after all attempts');
        throw new Error(`Device not found. Searched for: ${deviceID}`);
      }

      const deviceToDelete = config.devices[deviceIndex];
      console.log('Found device to delete:', deviceToDelete.name, deviceToDelete.deviceID);
      
      config.devices.splice(deviceIndex, 1);
      
      // Also remove device from all folders
      config.folders.forEach(folder => {
        folder.devices = folder.devices.filter(d => d.deviceID !== deviceToDelete.deviceID);
      });
      
      await this.client.post('/rest/system/config', config);
      return { success: true };
    } catch (error) {
      console.error('Delete device error:', error);
      throw new Error(`Failed to delete device: ${error.message}`);
    }
  }

  // Bulk add devices with shared folders
  async bulkAddDevices(bulkData) {
    try {
      const config = await this.getSystemConfig();
      const results = [];
      
      for (const item of bulkData) {
        const result = {
          deviceID: item.deviceID,
          success: false,
          error: null,
          device: null
        };
        
        try {
          // Validate device ID
          if (!item.deviceID || item.deviceID.length < 50) {
            throw new Error('Device ID must be at least 50 characters long');
          }
          
          // Check if device already exists
          const deviceExists = config.devices.some(d => d.deviceID === item.deviceID);
          if (deviceExists) {
            throw new Error('Device already exists');
          }
          
          // Validate shared folders exist
          if (item.sharedFolders && item.sharedFolders.length > 0) {
            for (const folderId of item.sharedFolders) {
              const folderExists = config.folders.some(f => f.id === folderId);
              if (!folderExists) {
                throw new Error(`Folder '${folderId}' not found`);
              }
            }
          }
          
          // Create new device
          const newDevice = {
            deviceID: item.deviceID,
            name: item.name || item.deviceID.substring(0, 7),
            addresses: item.addresses || ['dynamic'],
            compression: item.compression || 'metadata',
            certName: "",
            introducer: item.introducer || false,
            skipIntroductionRemovals: false,
            introducedBy: "",
            paused: item.paused || false,
            allowedNetworks: [],
            autoAcceptFolders: false,
            maxSendKbps: 0,
            maxRecvKbps: 0,
            ignoredFolders: [],
            maxRequestKiB: 0,
            untrusted: false,
            remoteGUIPort: 0,
            numConnections: 0
          };
          
          // Add device to config
          config.devices.push(newDevice);
          
          // Handle shared folders if provided
          if (item.sharedFolders && item.sharedFolders.length > 0) {
            this.updateFolderDeviceSharing(config, item.deviceID, item.sharedFolders);
          }
          
          result.success = true;
          result.device = newDevice;
          
        } catch (error) {
          result.error = error.message;
        }
        
        results.push(result);
      }
      
      // Only save config if there were successful additions
      const successfulDevices = results.filter(r => r.success);
      if (successfulDevices.length > 0) {
        await this.client.post('/rest/system/config', config);
      }
      
      return {
        total: bulkData.length,
        successful: successfulDevices.length,
        failed: results.length - successfulDevices.length,
        results: results
      };
      
    } catch (error) {
      throw new Error(`Failed to bulk add devices: ${error.message}`);
    }
  }

  // Bulk add folders with shared devices
  async bulkAddFolders(bulkData) {
    try {
      const config = await this.getSystemConfig();
      const results = [];
      
      for (const item of bulkData) {
        const result = {
          folderID: item.id,
          success: false,
          error: null,
          folder: null
        };
        
        try {
          // Validate required fields
          if (!item.id || !item.path) {
            throw new Error('Folder ID and path are required');
          }
          
          // Check if folder already exists
          const folderExists = config.folders.some(f => f.id === item.id);
          if (folderExists) {
            throw new Error('Folder already exists');
          }
          
          // Validate shared devices exist (only if devices are specified)
          let validatedDevices = [];
          if (item.sharedDevices && item.sharedDevices.length > 0) {
            for (const deviceId of item.sharedDevices) {
              const deviceExists = config.devices.some(d => d.deviceID === deviceId);
              if (!deviceExists) {
                throw new Error(`Device '${deviceId}' not found`);
              }
            }
            
            // Format devices
            validatedDevices = item.sharedDevices.map(deviceID => ({
              deviceID: deviceID,
              introducedBy: "",
              encryptionPassword: ""
            }));
          }
          
          // Create new folder
          const newFolder = {
            id: item.id,
            label: item.label || item.id,
            filesystemType: "basic",
            path: item.path,
            type: item.type || 'sendreceive',
            devices: validatedDevices,
            rescanIntervalS: item.rescanIntervalS || 3600,
            fsWatcherEnabled: true,
            fsWatcherDelayS: 10,
            fsWatcherTimeoutS: 0,
            ignorePerms: false,
            autoNormalize: true,
            minDiskFree: { value: 1, unit: '%' },
            versioning: {
              type: "",
              params: {},
              cleanupIntervalS: 3600,
              fsPath: "",
              fsType: "basic"
            },
            copiers: 0,
            pullerMaxPendingKiB: 0,
            hashers: 0,
            order: 'random',
            ignoreDelete: false,
            scanProgressIntervalS: 0,
            pullerPauseS: 0,
            maxConflicts: 10,
            disableSparseFiles: false,
            disableTempIndexes: false,
            paused: false,
            weakHashThresholdPct: 25,
            markerName: '.stfolder',
            copyOwnershipFromParent: false,
            modTimeWindowS: 0,
            maxConcurrentWrites: 2,
            disableFsync: false,
            blockPullOrder: "standard",
            copyRangeMethod: "standard",
            caseSensitiveFS: false,
            junctionsAsDirs: false,
            syncOwnership: false,
            sendOwnership: false,
            syncXattrs: false,
            sendXattrs: false,
            xattrFilter: {
              entries: [],
              maxSingleEntrySize: 1024,
              maxTotalSize: 4096
            }
          };
          
          // Add folder to config
          config.folders.push(newFolder);
          
          result.success = true;
          result.folder = newFolder;
          
        } catch (error) {
          result.error = error.message;
        }
        
        results.push(result);
      }
      
      // Only save config if there were successful additions
      const successfulFolders = results.filter(r => r.success);
      if (successfulFolders.length > 0) {
        await this.client.post('/rest/system/config', config);
      }
      
      return {
        total: bulkData.length,
        successful: successfulFolders.length,
        failed: results.length - successfulFolders.length,
        results: results
      };
      
    } catch (error) {
      throw new Error(`Failed to bulk add folders: ${error.message}`);
    }
  }

  // Folder methods
  async getFolders() {
    try {
      const config = await this.getSystemConfig();
      const folderPromises = config.folders.map(async folder => {
        try {
          const status = await this.client.get(`/rest/db/status?folder=${folder.id}`);
          return {
            id: folder.id,
            label: folder.label,
            path: folder.path,
            type: folder.type,
            devices: folder.devices,
            paused: folder.paused,
            status: status.data
          };
        } catch (error) {
          return {
            id: folder.id,
            label: folder.label,
            path: folder.path,
            type: folder.type,
            devices: folder.devices,
            paused: folder.paused,
            status: { error: 'Failed to get status' }
          };
        }
      });

      return await Promise.all(folderPromises);
    } catch (error) {
      throw new Error(`Failed to get folders: ${error.message}`);
    }
  }

  async addFolder(folderData) {
    try {
      const config = await this.getSystemConfig();
      
      // Validate and format devices
      let validatedDevices = [];
      if (folderData.devices && folderData.devices.length > 0) {
        validatedDevices = folderData.devices
          .map(device => {
            // Handle both string deviceID and object format
            const deviceID = typeof device === 'string' ? device : device.deviceID;
            
            // Validate that device exists in config
            const deviceExists = config.devices.some(d => d.deviceID === deviceID);
            if (!deviceExists) {
              throw new Error(`Device ${deviceID} not found`);
            }
            
            return {
              deviceID: deviceID,
              introducedBy: device.introducedBy || ''
            };
          });
      }
      
      // Check if folder ID already exists
      const folderExists = config.folders.some(f => f.id === folderData.id);
      if (folderExists) {
        throw new Error(`Folder with ID '${folderData.id}' already exists`);
      }
      
      const newFolder = {
        id: folderData.id,
        label: folderData.label || folderData.id,
        filesystemType: "basic",
        path: folderData.path,
        type: folderData.type || 'sendreceive',
        devices: validatedDevices.map(device => ({
          deviceID: device.deviceID,
          introducedBy: device.introducedBy || "",
          encryptionPassword: ""
        })),
        rescanIntervalS: folderData.rescanIntervalS || 3600,
        fsWatcherEnabled: true,
        fsWatcherDelayS: 10,
        fsWatcherTimeoutS: 0,
        ignorePerms: false,
        autoNormalize: true,
        minDiskFree: { value: 1, unit: '%' },
        versioning: {
          type: "",
          params: {},
          cleanupIntervalS: 3600,
          fsPath: "",
          fsType: "basic"
        },
        copiers: 0,
        pullerMaxPendingKiB: 0,
        hashers: 0,
        order: 'random',
        ignoreDelete: false,
        scanProgressIntervalS: 0,
        pullerPauseS: 0,
        maxConflicts: 10,
        disableSparseFiles: false,
        disableTempIndexes: false,
        paused: false,
        weakHashThresholdPct: 25,
        markerName: '.stfolder',
        copyOwnershipFromParent: false,
        modTimeWindowS: 0,
        maxConcurrentWrites: 2,
        disableFsync: false,
        blockPullOrder: "standard",
        copyRangeMethod: "standard",
        caseSensitiveFS: false,
        junctionsAsDirs: false,
        syncOwnership: false,
        sendOwnership: false,
        syncXattrs: false,
        sendXattrs: false,
        xattrFilter: {
          entries: [],
          maxSingleEntrySize: 1024,
          maxTotalSize: 4096
        }
      };

      config.folders.push(newFolder);
      
      await this.client.post('/rest/system/config', config);
      
      return newFolder;
    } catch (error) {
      throw new Error(`Failed to add folder: ${error.message}`);
    }
  }

  async updateFolder(folderID, folderData) {
    try {
      const config = await this.getSystemConfig();
      const folderIndex = config.folders.findIndex(f => f.id === folderID);
      
      if (folderIndex === -1) {
        throw new Error('Folder not found');
      }

      config.folders[folderIndex] = { ...config.folders[folderIndex], ...folderData };
      
      await this.client.post('/rest/system/config', config);
      return config.folders[folderIndex];
    } catch (error) {
      throw new Error(`Failed to update folder: ${error.message}`);
    }
  }

  async deleteFolder(folderID) {
    try {
      const config = await this.getSystemConfig();
      const folderIndex = config.folders.findIndex(f => f.id === folderID);
      
      if (folderIndex === -1) {
        throw new Error('Folder not found');
      }

      config.folders.splice(folderIndex, 1);
      
      await this.client.post('/rest/system/config', config);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete folder: ${error.message}`);
    }
  }

  async pauseFolder(folderID) {
    try {
      await this.client.post(`/rest/db/pause?folder=${folderID}`);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to pause folder: ${error.message}`);
    }
  }

  async resumeFolder(folderID) {
    try {
      await this.client.post(`/rest/db/resume?folder=${folderID}`);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to resume folder: ${error.message}`);
    }
  }
}

module.exports = SyncthingService;
