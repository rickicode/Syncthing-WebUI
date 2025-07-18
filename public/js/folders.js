// Folder management functions

function showAddFolderModal() {
    const modal = document.getElementById('addFolderModal');
    modal.classList.add('show');
    
    // Reset form
    document.getElementById('addFolderForm').reset();
    document.getElementById('folderType').value = 'sendreceive';
    
    // Populate device checkboxes
    populateDeviceCheckboxes();
}

function hideAddFolderModal() {
    document.getElementById('addFolderModal').classList.remove('show');
}

function populateDeviceCheckboxes() {
    const container = document.getElementById('folderDevices');
    container.innerHTML = '';
    
    if (allDevicesData.length === 0) {
        container.innerHTML = '<p class="text-muted">No devices available</p>';
        return;
    }
    
    allDevicesData.forEach(device => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" name="devices" value="${escapeHtml(device.deviceID)}">
            <span>${escapeHtml(device.name)} (${escapeHtml(device.deviceID.substring(0, 7))}...)</span>
        `;
        container.appendChild(label);
    });
}

function editFolder(folderID) {
    // For simplicity, we'll show a basic edit functionality
    // In a full implementation, you'd want a proper edit modal
    const folder = allFoldersData.find(f => f.id === folderID);
    if (!folder) {
        showError('Folder not found');
        return;
    }
    
    const newLabel = prompt('Enter new label for folder:', folder.label);
    if (newLabel !== null && newLabel.trim() !== folder.label) {
        updateFolder(folderID, { label: newLabel.trim() });
    }
}

async function updateFolder(folderID, updateData) {
    try {
        const response = await fetch(`/api/folders/${encodeURIComponent(folderID)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Folder updated successfully');
            await loadFolders();
        } else {
            showError(result.error || 'Failed to update folder');
        }
    } catch (error) {
        showError('Failed to update folder: ' + error.message);
    }
}

function deleteFolder(folderID, folderLabel) {
    showConfirmModal(
        `Are you sure you want to delete folder "${folderLabel}"? This action cannot be undone.`,
        async () => {
            // Find the delete button for this folder and show loading
            const deleteButton = document.querySelector(`button[onclick*="deleteFolder('${folderID.replace(/'/g, "\\'")}"]`);
            if (deleteButton) {
                deleteButton.classList.add('btn-loading');
                deleteButton.disabled = true;
            }
            
            try {
                const response = await fetch(`/api/folders/${encodeURIComponent(folderID)}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showSuccess('Folder deleted successfully');
                    await loadFolders();
                } else {
                    showError(result.error || 'Failed to delete folder');
                }
            } catch (error) {
                showError('Failed to delete folder: ' + error.message);
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

async function pauseFolder(folderID) {
    // Find the pause button for this folder and show loading
    const pauseButton = document.querySelector(`button[onclick*="pauseFolder('${folderID.replace(/'/g, "\\'")}"]`);
    if (pauseButton) {
        pauseButton.classList.add('btn-loading');
        pauseButton.disabled = true;
    }
    
    try {
        const response = await fetch(`/api/folders/${encodeURIComponent(folderID)}/pause`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Folder paused successfully');
            await loadFolders();
        } else {
            showError(result.error || 'Failed to pause folder');
        }
    } catch (error) {
        showError('Failed to pause folder: ' + error.message);
    } finally {
        // Remove loading state from button
        if (pauseButton) {
            pauseButton.classList.remove('btn-loading');
            pauseButton.disabled = false;
        }
    }
}

async function resumeFolder(folderID) {
    // Find the resume button for this folder and show loading
    const resumeButton = document.querySelector(`button[onclick*="resumeFolder('${folderID.replace(/'/g, "\\'")}"]`);
    if (resumeButton) {
        resumeButton.classList.add('btn-loading');
        resumeButton.disabled = true;
    }
    
    try {
        const response = await fetch(`/api/folders/${encodeURIComponent(folderID)}/resume`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Folder resumed successfully');
            await loadFolders();
        } else {
            showError(result.error || 'Failed to resume folder');
        }
    } catch (error) {
        showError('Failed to resume folder: ' + error.message);
    } finally {
        // Remove loading state from button
        if (resumeButton) {
            resumeButton.classList.remove('btn-loading');
            resumeButton.disabled = false;
        }
    }
}

// Form submission handler
document.getElementById('addFolderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const folderData = {
        id: formData.get('id').trim(),
        label: formData.get('label').trim(),
        path: formData.get('path').trim(),
        type: formData.get('type'),
        devices: []
    };

    // Get selected devices
    const selectedDevices = formData.getAll('devices');
    folderData.devices = selectedDevices.map(deviceID => ({
        deviceID: deviceID,
        introducedBy: ''
    }));

    // Validate required fields
    if (!folderData.id) {
        showError('Folder ID is required');
        return;
    }

    if (!folderData.path) {
        showError('Folder path is required');
        return;
    }

    // Set default label if not provided
    if (!folderData.label) {
        folderData.label = folderData.id;
    }

    // Show loading indicator
    showLoading(true);

    try {
        const response = await fetch('/api/folders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(folderData)
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Folder added successfully');
            hideAddFolderModal();
            await loadFolders();
        } else {
            showError(result.error || 'Failed to add folder');
        }
    } catch (error) {
        showError('Failed to add folder: ' + error.message);
    } finally {
        // Hide loading indicator
        showLoading(false);
    }
});
