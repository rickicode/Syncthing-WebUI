// Device management functions

function showAddDeviceModal() {
    const modal = document.getElementById('addDeviceModal');
    modal.classList.add('show');
    
    // Reset form
    document.getElementById('addDeviceForm').reset();
    document.getElementById('deviceCompression').value = 'metadata';
    
    // Populate folder checkboxes
    populateFolderCheckboxes('deviceFolders');
}

function hideAddDeviceModal() {
    document.getElementById('addDeviceModal').classList.remove('show');
}

function showEditDeviceModal() {
    const modal = document.getElementById('editDeviceModal');
    modal.classList.add('show');
}

function hideEditDeviceModal() {
    document.getElementById('editDeviceModal').classList.remove('show');
}

function editDevice(deviceID) {
    const device = allDevicesData.find(d => d.deviceID === deviceID);
    if (!device) {
        showError('Device not found');
        return;
    }

    // Populate edit form
    document.getElementById('editDeviceIDHidden').value = device.deviceID;
    document.getElementById('editDeviceIDDisplay').value = device.deviceID;
    document.getElementById('editDeviceName').value = device.name;
    document.getElementById('editDeviceAddresses').value = device.addresses.join(', ');
    document.getElementById('editDeviceCompression').value = device.compression;
    document.getElementById('editDeviceIntroducer').checked = device.introducer;
    document.getElementById('editDevicePaused').checked = device.paused;

    // Populate folder checkboxes with current device's shared folders
    populateFolderCheckboxes('editDeviceFolders', deviceID);

    showEditDeviceModal();
}

function deleteDevice(deviceID, deviceName) {
    showConfirmModal(
        `Are you sure you want to delete device "${deviceName}"? This action cannot be undone.`,
        async () => {
            // Find the delete button for this device and show loading
            const deleteButton = document.querySelector(`button[onclick*="deleteDevice('${deviceID.replace(/'/g, "\\'")}"]`);
            if (deleteButton) {
                deleteButton.classList.add('btn-loading');
                deleteButton.disabled = true;
            }
            
            try {
                const response = await fetch(`/api/devices/${encodeURIComponent(deviceID)}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showSuccess('Device deleted successfully');
                    await loadDevices();
                } else {
                    showError(result.error || 'Failed to delete device');
                }
            } catch (error) {
                showError('Failed to delete device: ' + error.message);
            } finally {
                // Remove loading state from button
                if (deleteButton) {
                    deleteButton.classList.remove('btn-loading');
                    deleteButton.disabled = false;
                }
            }
        }
    );
}

// Form submission handlers
document.getElementById('addDeviceForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const deviceData = {
        deviceID: formData.get('deviceID').trim(),
        name: formData.get('name').trim(),
        compression: formData.get('compression'),
        introducer: formData.has('introducer'),
        paused: formData.has('paused')
    };

    // Parse addresses
    const addressesInput = formData.get('addresses').trim();
    if (addressesInput) {
        deviceData.addresses = addressesInput.split(',').map(addr => addr.trim()).filter(addr => addr);
    }

    // Get selected folders for sharing
    const selectedFolders = formData.getAll('folders');
    deviceData.sharedFolders = selectedFolders;

    // Validate required fields
    if (!deviceData.deviceID) {
        showError('Device ID is required');
        return;
    }

    if (deviceData.deviceID.length < 50) {
        showError('Device ID must be at least 50 characters long');
        return;
    }

    // Show loading indicator
    showLoading(true);

    try {
        const response = await fetch('/api/devices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(deviceData)
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Device added successfully');
            hideAddDeviceModal();
            await loadDevices();
        } else {
            showError(result.error || 'Failed to add device');
        }
    } catch (error) {
        showError('Failed to add device: ' + error.message);
    } finally {
        // Hide loading indicator
        showLoading(false);
    }
});

document.getElementById('editDeviceForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const deviceID = formData.get('deviceID');
    const deviceData = {
        name: formData.get('name').trim(),
        compression: formData.get('compression'),
        introducer: formData.has('introducer'),
        paused: formData.has('paused')
    };

    // Parse addresses
    const addressesInput = formData.get('addresses').trim();
    if (addressesInput) {
        deviceData.addresses = addressesInput.split(',').map(addr => addr.trim()).filter(addr => addr);
    }

    // Get selected folders for sharing
    const selectedFolders = formData.getAll('folders');
    deviceData.sharedFolders = selectedFolders;

    // Show loading indicator
    showLoading(true);

    try {
        const response = await fetch(`/api/devices/${encodeURIComponent(deviceID)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(deviceData)
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Device updated successfully');
            hideEditDeviceModal();
            await loadDevices();
        } else {
            showError(result.error || 'Failed to update device');
        }
    } catch (error) {
        showError('Failed to update device: ' + error.message);
    } finally {
        // Hide loading indicator
        showLoading(false);
    }
});

// Confirmation modal functions
function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const messageElement = document.getElementById('confirmMessage');
    const confirmButton = document.getElementById('confirmButton');

    messageElement.textContent = message;
    modal.classList.add('show');

    // Remove existing event listeners
    const newConfirmButton = confirmButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    // Add new event listener
    newConfirmButton.addEventListener('click', () => {
        hideConfirmModal();
        if (onConfirm) {
            onConfirm();
        }
    });
}

function hideConfirmModal() {
    document.getElementById('confirmModal').classList.remove('show');
}

// Populate folder checkboxes for device sharing
async function populateFolderCheckboxes(containerId, deviceID = null) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    try {
        // Load folders data if not already loaded
        const response = await fetch('/api/folders');
        const result = await response.json();
        
        if (!result.success) {
            container.innerHTML = '<p class="text-muted">Failed to load folders</p>';
            return;
        }
        
        const folders = result.data;
        
        if (folders.length === 0) {
            container.innerHTML = '<p class="text-muted">No folders available</p>';
            return;
        }
        
        folders.forEach(folder => {
            const label = document.createElement('label');
            const isShared = deviceID ? folder.devices.some(d => d.deviceID === deviceID) : false;
            
            label.innerHTML = `
                <input type="checkbox" name="folders" value="${escapeHtml(folder.id)}" ${isShared ? 'checked' : ''}>
                <span>${escapeHtml(folder.label)} (${escapeHtml(folder.id)})</span>
            `;
            container.appendChild(label);
        });
    } catch (error) {
        console.error('Error loading folders:', error);
        container.innerHTML = '<p class="text-muted">Error loading folders</p>';
    }
}

// New Device Modal Functions
function showNewDeviceModal() {
    const modal = document.getElementById('newDeviceModal');
    modal.classList.add('show');
    
    // Load current device ID
    loadCurrentDeviceID();
}

function hideNewDeviceModal() {
    document.getElementById('newDeviceModal').classList.remove('show');
    
    // Reset modal state
    document.getElementById('generatedDeviceID').value = '';
    document.getElementById('useGeneratedBtn').disabled = true;
}

async function loadCurrentDeviceID() {
    try {
        const response = await fetch('/api/system/status');
        const result = await response.json();
        
        if (result.success && result.data.myID) {
            document.getElementById('currentDeviceID').value = result.data.myID;
        } else {
            document.getElementById('currentDeviceID').value = 'Failed to load device ID';
        }
    } catch (error) {
        console.error('Error loading current device ID:', error);
        document.getElementById('currentDeviceID').value = 'Error loading device ID';
    }
}

function generateNewDeviceID() {
    // Generate a random device ID similar to Syncthing format
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let deviceID = '';
    
    for (let i = 0; i < 7; i++) {
        if (i > 0) deviceID += '-';
        for (let j = 0; j < 7; j++) {
            deviceID += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    
    document.getElementById('generatedDeviceID').value = deviceID;
    document.getElementById('useGeneratedBtn').disabled = false;
}

function copyDeviceID(inputId) {
    const input = document.getElementById(inputId);
    if (input.value && input.value !== 'Loading...' && !input.value.includes('Error') && !input.value.includes('Failed')) {
        navigator.clipboard.writeText(input.value).then(() => {
            showSuccess('Device ID copied to clipboard');
        }).catch(() => {
            // Fallback for older browsers
            input.select();
            document.execCommand('copy');
            showSuccess('Device ID copied to clipboard');
        });
    } else {
        showError('No valid device ID to copy');
    }
}

function useGeneratedID() {
    const generatedID = document.getElementById('generatedDeviceID').value;
    if (generatedID) {
        hideNewDeviceModal();
        
        // Pre-fill the add device modal with generated ID
        document.getElementById('deviceID').value = generatedID;
        showAddDeviceModal();
    }
}
