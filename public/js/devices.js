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

// Initialize form event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Form submission handlers
    const addDeviceForm = document.getElementById('addDeviceForm');
    if (addDeviceForm) {
        addDeviceForm.addEventListener('submit', async function(e) {
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
    }

    const editDeviceForm = document.getElementById('editDeviceForm');
    if (editDeviceForm) {
        editDeviceForm.addEventListener('submit', async function(e) {
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
            // Check if device is shared with this folder
            let isShared = false;
            if (deviceID && folder.devices && Array.isArray(folder.devices)) {
                isShared = folder.devices.some(d => d.deviceID === deviceID);
            }
            
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

// Bulk Add Device Functions
function showBulkAddModal() {
    const modal = document.getElementById('bulkAddModal');
    modal.classList.add('show');
    
    // Reset form and state
    document.getElementById('bulkAddForm').reset();
    document.getElementById('bulkPreview').innerHTML = '<p class="text-muted">Enter device data above to see preview</p>';
    document.getElementById('bulkSubmitBtn').disabled = true;
    document.getElementById('bulkProgress').style.display = 'none';
    document.getElementById('bulkResults').style.display = 'none';
}

function hideBulkAddModal() {
    document.getElementById('bulkAddModal').classList.remove('show');
}

function parseBulkData() {
    const input = document.getElementById('bulkInput').value.trim();
    const previewContainer = document.getElementById('bulkPreview');
    const submitBtn = document.getElementById('bulkSubmitBtn');
    
    if (!input) {
        previewContainer.innerHTML = '<p class="text-muted">Enter device data above to see preview</p>';
        submitBtn.disabled = true;
        return;
    }
    
    const lines = input.split('\n').filter(line => line.trim());
    const parsedData = [];
    const errors = [];
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;
        
        const parts = trimmedLine.split('|');
        if (parts.length < 2 || parts.length > 3) {
            errors.push(`Line ${index + 1}: Invalid format - expected "DEVICE-ID|folder1,folder2" or "DEVICE-ID|folder1,folder2|DeviceName"`);
            return;
        }
        
        const deviceID = parts[0].trim();
        const foldersStr = parts[1].trim();
        const deviceName = parts.length === 3 ? parts[2].trim() : '';
        
        // Validate device ID
        if (!deviceID || deviceID.length < 50) {
            errors.push(`Line ${index + 1}: Device ID must be at least 50 characters long`);
            return;
        }
        
        // Parse folders
        const folders = foldersStr ? foldersStr.split(',').map(f => f.trim()).filter(f => f) : [];
        
        // Use provided name or default to first 7 characters of device ID
        const finalDeviceName = deviceName || deviceID.substring(0, 7);
        
        parsedData.push({
            deviceID: deviceID,
            name: finalDeviceName,
            sharedFolders: folders,
            lineNumber: index + 1
        });
    });
    
    // Display preview
    let previewHTML = '';
    
    if (errors.length > 0) {
        previewHTML += '<div class="bulk-errors"><h4>Errors:</h4><ul>';
        errors.forEach(error => {
            previewHTML += `<li class="error-item">${escapeHtml(error)}</li>`;
        });
        previewHTML += '</ul></div>';
    }
    
    if (parsedData.length > 0) {
        previewHTML += '<div class="bulk-success"><h4>Valid Devices:</h4><ul>';
        parsedData.forEach(device => {
            previewHTML += `<li class="success-item">
                <strong>Device:</strong> ${escapeHtml(device.name)} (${escapeHtml(device.deviceID.substring(0, 20))}...)
                <br><strong>Folders:</strong> ${device.sharedFolders.length > 0 ? escapeHtml(device.sharedFolders.join(', ')) : 'None'}
            </li>`;
        });
        previewHTML += '</ul></div>';
    }
    
    if (parsedData.length === 0) {
        previewHTML += '<p class="text-muted">No valid devices found</p>';
        submitBtn.disabled = true;
    } else {
        submitBtn.disabled = false;
        // Store parsed data for submission
        window.bulkParsedData = parsedData;
    }
    
    previewContainer.innerHTML = previewHTML;
}

// Initialize additional form event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Form submission handler for bulk add
    const bulkAddForm = document.getElementById('bulkAddForm');
    if (bulkAddForm) {
        bulkAddForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!window.bulkParsedData || window.bulkParsedData.length === 0) {
                showError('No valid devices to add. Please check your input and try again.');
                return;
            }
            
            const progressContainer = document.getElementById('bulkProgress');
            const resultsContainer = document.getElementById('bulkResults');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            const submitBtn = document.getElementById('bulkSubmitBtn');
            
            // Show progress
            progressContainer.style.display = 'block';
            resultsContainer.style.display = 'none';
            submitBtn.disabled = true;
            
            try {
                progressText.textContent = 'Preparing bulk add...';
                progressFill.style.width = '10%';
                
                const response = await fetch('/api/devices/bulk', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        bulkData: window.bulkParsedData
                    })
                });
                
                progressFill.style.width = '90%';
                progressText.textContent = 'Processing response...';
                
                const result = await response.json();
                
                progressFill.style.width = '100%';
                progressText.textContent = 'Complete!';
                
                // Hide progress after a brief delay
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                }, 1000);
                
                // Show results
                displayBulkResults(result);
                
                if (result.success) {
                    // Reload devices table
                    await loadDevices();
                    
                    if (result.data.successful > 0) {
                        showSuccess(`Successfully added ${result.data.successful} device(s). ${result.data.failed > 0 ? `${result.data.failed} failed.` : ''}`);
                    }
                } else {
                    showError(result.error || 'Failed to process bulk add');
                }
                
            } catch (error) {
                progressContainer.style.display = 'none';
                showError('Failed to bulk add devices: ' + error.message);
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // Auto-parse as user types
    const bulkInput = document.getElementById('bulkInput');
    if (bulkInput) {
        bulkInput.addEventListener('input', function() {
            // Debounce the parsing to avoid too many calls
            clearTimeout(this.parseTimeout);
            this.parseTimeout = setTimeout(() => {
                parseBulkData();
            }, 500);
        });
    }
});

function displayBulkResults(result) {
    const resultsContainer = document.getElementById('bulkResults');
    
    if (!result.success) {
        resultsContainer.innerHTML = `<div class="bulk-error"><h4>Error:</h4><p>${escapeHtml(result.error)}</p></div>`;
        resultsContainer.style.display = 'block';
        return;
    }
    
    const data = result.data;
    let resultsHTML = `
        <div class="bulk-summary">
            <h4>Bulk Add Results</h4>
            <p><strong>Total:</strong> ${data.total} | <strong>Successful:</strong> ${data.successful} | <strong>Failed:</strong> ${data.failed}</p>
        </div>
    `;
    
    if (data.results && data.results.length > 0) {
        resultsHTML += '<div class="bulk-details">';
        
        // Successful devices
        const successful = data.results.filter(r => r.success);
        if (successful.length > 0) {
            resultsHTML += '<div class="bulk-success"><h5>Successfully Added:</h5><ul>';
            successful.forEach(device => {
                resultsHTML += `<li class="success-item">${escapeHtml(device.device.name)} (${escapeHtml(device.deviceID.substring(0, 20))}...)</li>`;
            });
            resultsHTML += '</ul></div>';
        }
        
        // Failed devices
        const failed = data.results.filter(r => !r.success);
        if (failed.length > 0) {
            resultsHTML += '<div class="bulk-errors"><h5>Failed:</h5><ul>';
            failed.forEach(device => {
                resultsHTML += `<li class="error-item">${escapeHtml(device.deviceID.substring(0, 20))}... - ${escapeHtml(device.error)}</li>`;
            });
            resultsHTML += '</ul></div>';
        }
        
        resultsHTML += '</div>';
    }
    
    resultsContainer.innerHTML = resultsHTML;
    resultsContainer.style.display = 'block';
}
