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
        introducer: deviceData.introducer || false,
        paused: deviceData.paused || false,
        skipIntroductionRemovals: false,
        autoAcceptFolders: false
      };

      config.devices.push(newDevice);
      
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

      config.devices[deviceIndex] = { ...config.devices[deviceIndex], ...deviceData };
      
      await this.client.post('/rest/system/config', config);
      return config.devices[deviceIndex];
    } catch (error) {
      throw new Error(`Failed to update device: ${error.message}`);
    }
  }

  async deleteDevice(deviceID) {
    try {
      const config = await this.getSystemConfig();
      const deviceIndex = config.devices.findIndex(d => d.deviceID === deviceID);
      
      if (deviceIndex === -1) {
        throw new Error('Device not found');
      }

      config.devices.splice(deviceIndex, 1);
      
      // Also remove device from all folders
      config.folders.forEach(folder => {
        folder.devices = folder.devices.filter(d => d.deviceID !== deviceID);
      });
      
      await this.client.post('/rest/system/config', config);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete device: ${error.message}`);
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
      
      const newFolder = {
        id: folderData.id,
        label: folderData.label || folderData.id,
        path: folderData.path,
        type: folderData.type || 'sendreceive',
        devices: folderData.devices || [],
        rescanIntervalS: folderData.rescanIntervalS || 3600,
        fsWatcherEnabled: true,
        fsWatcherDelayS: 10,
        ignorePerms: false,
        autoNormalize: true,
        minDiskFree: { value: 1, unit: '%' },
        versioning: { type: 'none' },
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
        markerName: '.stfolder'
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
