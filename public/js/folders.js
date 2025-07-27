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

// Bulk Add Folder Functions
function showBulkAddFolderModal() {
    const modal = document.getElementById('bulkAddFolderModal');
    modal.classList.add('show');
    
    // Reset form and state
    document.getElementById('bulkAddFolderForm').reset();
    document.getElementById('bulkFolderPreview').innerHTML = '<p class="text-muted">Enter folder data above to see preview</p>';
    document.getElementById('bulkFolderSubmitBtn').disabled = true;
    document.getElementById('bulkFolderProgress').style.display = 'none';
    document.getElementById('bulkFolderResults').style.display = 'none';
}

function hideBulkAddFolderModal() {
    document.getElementById('bulkAddFolderModal').classList.remove('show');
}

function parseBulkFolderData() {
    const input = document.getElementById('bulkFolderInput').value.trim();
    const previewContainer = document.getElementById('bulkFolderPreview');
    const submitBtn = document.getElementById('bulkFolderSubmitBtn');
    
    if (!input) {
        previewContainer.innerHTML = '<p class="text-muted">Enter folder data above to see preview</p>';
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
            errors.push(`Line ${index + 1}: Invalid format - expected "FOLDER-ID|FOLDER-PATH" or "FOLDER-ID|FOLDER-PATH|device1,device2"`);
            return;
        }
        
        const folderID = parts[0].trim();
        const folderPath = parts[1].trim();
        const devicesStr = parts.length === 3 ? parts[2].trim() : '';
        
        // Validate folder ID and path
        if (!folderID) {
            errors.push(`Line ${index + 1}: Folder ID is required`);
            return;
        }
        
        if (!folderPath) {
            errors.push(`Line ${index + 1}: Folder path is required`);
            return;
        }
        
        // Parse devices (optional)
        const devices = devicesStr ? devicesStr.split(',').map(d => d.trim()).filter(d => d) : [];
        
        parsedData.push({
            id: folderID,
            label: folderID,
            path: folderPath,
            type: 'sendreceive',
            sharedDevices: devices,
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
        previewHTML += '<div class="bulk-success"><h4>Valid Folders:</h4><ul>';
        parsedData.forEach(folder => {
            previewHTML += `<li class="success-item">
                <strong>Folder:</strong> ${escapeHtml(folder.id)} → ${escapeHtml(folder.path)}
                <br><strong>Devices:</strong> ${folder.sharedDevices.length > 0 ? escapeHtml(folder.sharedDevices.join(', ')) : 'None'}
            </li>`;
        });
        previewHTML += '</ul></div>';
    }
    
    if (parsedData.length === 0) {
        previewHTML += '<p class="text-muted">No valid folders found</p>';
        submitBtn.disabled = true;
    } else {
        submitBtn.disabled = false;
        // Store parsed data for submission
        window.bulkFolderParsedData = parsedData;
    }
    
    previewContainer.innerHTML = previewHTML;
}

// Form submission handler for bulk add folders
document.getElementById('bulkAddFolderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!window.bulkFolderParsedData || window.bulkFolderParsedData.length === 0) {
        showError('No valid folders to add. Please check your input and try again.');
        return;
    }
    
    const progressContainer = document.getElementById('bulkFolderProgress');
    const resultsContainer = document.getElementById('bulkFolderResults');
    const progressFill = document.getElementById('folderProgressFill');
    const progressText = document.getElementById('folderProgressText');
    const submitBtn = document.getElementById('bulkFolderSubmitBtn');
    
    // Show progress
    progressContainer.style.display = 'block';
    resultsContainer.style.display = 'none';
    submitBtn.disabled = true;
    
    try {
        progressText.textContent = 'Preparing bulk folder add...';
        progressFill.style.width = '10%';
        
        const response = await fetch('/api/folders/bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bulkData: window.bulkFolderParsedData
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
        displayBulkFolderResults(result);
        
        if (result.success) {
            // Reload folders table
            await loadFolders();
            
            if (result.data.successful > 0) {
                showSuccess(`Successfully added ${result.data.successful} folder(s). ${result.data.failed > 0 ? `${result.data.failed} failed.` : ''}`);
            }
        } else {
            showError(result.error || 'Failed to process bulk folder add');
        }
        
    } catch (error) {
        progressContainer.style.display = 'none';
        showError('Failed to bulk add folders: ' + error.message);
    } finally {
        submitBtn.disabled = false;
    }
});

function displayBulkFolderResults(result) {
    const resultsContainer = document.getElementById('bulkFolderResults');
    
    if (!result.success) {
        resultsContainer.innerHTML = `<div class="bulk-error"><h4>Error:</h4><p>${escapeHtml(result.error)}</p></div>`;
        resultsContainer.style.display = 'block';
        return;
    }
    
    const data = result.data;
    let resultsHTML = `
        <div class="bulk-summary">
            <h4>Bulk Folder Add Results</h4>
            <p><strong>Total:</strong> ${data.total} | <strong>Successful:</strong> ${data.successful} | <strong>Failed:</strong> ${data.failed}</p>
        </div>
    `;
    
    if (data.results && data.results.length > 0) {
        resultsHTML += '<div class="bulk-details">';
        
        // Successful folders
        const successful = data.results.filter(r => r.success);
        if (successful.length > 0) {
            resultsHTML += '<div class="bulk-success"><h5>Successfully Added:</h5><ul>';
            successful.forEach(folder => {
                resultsHTML += `<li class="success-item">${escapeHtml(folder.folder.label)} (${escapeHtml(folder.folderID)})</li>`;
            });
            resultsHTML += '</ul></div>';
        }
        
        // Failed folders
        const failed = data.results.filter(r => !r.success);
        if (failed.length > 0) {
            resultsHTML += '<div class="bulk-errors"><h5>Failed:</h5><ul>';
            failed.forEach(folder => {
                resultsHTML += `<li class="error-item">${escapeHtml(folder.folderID)} - ${escapeHtml(folder.error)}</li>`;
            });
            resultsHTML += '</ul></div>';
        }
        
        resultsHTML += '</div>';
    }
    
    resultsContainer.innerHTML = resultsHTML;
    resultsContainer.style.display = 'block';
}

// Auto-parse as user types
document.getElementById('bulkFolderInput').addEventListener('input', function() {
    // Debounce the parsing to avoid too many calls
    clearTimeout(this.parseTimeout);
    this.parseTimeout = setTimeout(() => {
        parseBulkFolderData();
    }, 500);
});
