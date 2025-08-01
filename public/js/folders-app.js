// Global variables for folders page
let foldersData = [];
let allFoldersData = [];
let allDevicesData = [];
let currentFoldersPage = 1;
let itemsPerPage = 20;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    initializeApp();
    updateCurrentYear();
});

// Check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (data.authEnabled && !data.authenticated) {
            window.location.href = '/login';
            return;
        }
        
        // Hide logout button if auth is disabled
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn && !data.authEnabled) {
            logoutBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        } else {
            showError('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showError('Logout failed');
    }
}

// Update current year in footer
function updateCurrentYear() {
    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }
    
    // Add GitHub source code information
    const footerContent = document.querySelector('.footer-content p');
    if (footerContent) {
        const githubLink = document.createElement('a');
        githubLink.href = 'https://github.com/rickicode/Syncthing-WebUI';
        githubLink.target = '_blank';
        githubLink.rel = 'noopener noreferrer';
        githubLink.textContent = 'GitHub';
        githubLink.style.color = '#3498db';
        githubLink.style.textDecoration = 'none';
        githubLink.style.marginLeft = '10px';
        githubLink.style.fontWeight = '500';
        
        githubLink.addEventListener('mouseover', function() {
            this.style.textDecoration = 'underline';
        });
        
        githubLink.addEventListener('mouseout', function() {
            this.style.textDecoration = 'none';
        });
        
        const separator = document.createTextNode(' | ');
        footerContent.appendChild(separator);
        footerContent.appendChild(githubLink);
    }
}

async function initializeApp() {
    setupEventListeners();
    await checkConnection();
    await loadData();
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        applyFilters();
    });

    // Status filter functionality
    const statusFilter = document.getElementById('statusFilter');
    statusFilter.addEventListener('change', function() {
        applyFilters();
    });

    // Modal close on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });

    // Pagination
    setupPagination();
}

function setupPagination() {
    // Folders pagination
    document.getElementById('foldersPrevBtn').addEventListener('click', () => {
        if (currentFoldersPage > 1) {
            currentFoldersPage--;
            renderFoldersTable();
        }
    });

    document.getElementById('foldersNextBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(foldersData.length / itemsPerPage);
        if (currentFoldersPage < totalPages) {
            currentFoldersPage++;
            renderFoldersTable();
        }
    });
}

async function checkConnection() {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('.status-text');

    try {
        const response = await fetch('/api/system/status');
        if (response.ok) {
            statusDot.classList.add('connected');
            statusText.textContent = 'Connected';
        } else {
            throw new Error('Connection failed');
        }
    } catch (error) {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        showError('Failed to connect to Syncthing server');
    }
}

async function loadData() {
    showLoading(true);
    try {
        await Promise.all([loadFolders(), loadDevices()]);
    } catch (error) {
        showError('Failed to load data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function loadFolders() {
    try {
        const response = await fetch('/api/folders');
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // If we get HTML instead of JSON, it's likely a login redirect
            if (response.status === 401 || response.url.includes('/login')) {
                window.location.href = '/login';
                return;
            }
            throw new Error('Invalid response format - expected JSON');
        }
        
        const result = await response.json();
        
        // Handle session expiration
        if (!result.success && result.requiresLogin) {
            window.location.href = '/login';
            return;
        }
        
        if (result.success) {
            // Sort folders by label (name) using natural sorting
            allFoldersData = result.data.sort((a, b) => naturalSort(a.label, b.label));
            foldersData = [...allFoldersData];
            renderFoldersTable();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error loading folders:', error);
        // Check if it's a session expiration error
        if (error.message.includes('Session expired') || error.message.includes('Unauthorized')) {
            window.location.href = '/login';
            return;
        }
        throw error;
    }
}

async function loadDevices() {
    try {
        const response = await fetch('/api/devices');
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // If we get HTML instead of JSON, it's likely a login redirect
            if (response.status === 401 || response.url.includes('/login')) {
                window.location.href = '/login';
                return;
            }
            throw new Error('Invalid response format - expected JSON');
        }
        
        const result = await response.json();
        
        // Handle session expiration
        if (!result.success && result.requiresLogin) {
            window.location.href = '/login';
            return;
        }
        
        if (result.success) {
            allDevicesData = result.data.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error loading devices:', error);
        // Check if it's a session expiration error
        if (error.message.includes('Session expired') || error.message.includes('Unauthorized')) {
            window.location.href = '/login';
            return;
        }
        throw error;
    }
}

function renderFoldersTable() {
    const tbody = document.getElementById('foldersTableBody');
    const startIndex = (currentFoldersPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = foldersData.slice(startIndex, endIndex);

    tbody.innerHTML = '';

    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">No folders found</td>
            </tr>
        `;
        updateFoldersPagination();
        return;
    }

    pageData.forEach(folder => {
        const status = getFolderStatus(folder);
        const deviceNames = folder.devices.map(d => d.deviceID.substring(0, 7)).join(', ');
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="folder-checkbox" value="${escapeHtml(folder.id)}" onchange="updateBulkDeleteFoldersButton()"></td>
            <td>${escapeHtml(folder.label)}</td>
            <td>${escapeHtml(folder.id)}</td>
            <td title="${escapeHtml(folder.path)}">${escapeHtml(folder.path.length > 30 ? folder.path.substring(0, 30) + '...' : folder.path)}</td>
            <td>${escapeHtml(folder.type)}</td>
            <td><span class="status-badge ${status.class}">${status.text}</span></td>
            <td><div class="devices-list" title="${escapeHtml(deviceNames)}">${escapeHtml(deviceNames)}</div></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-small btn-primary" onclick="editFolder('${escapeHtml(folder.id)}')">Edit</button>
                    ${folder.paused ? 
                        `<button class="btn btn-small btn-success" onclick="resumeFolder('${escapeHtml(folder.id)}')">Resume</button>` :
                        `<button class="btn btn-small btn-secondary" onclick="pauseFolder('${escapeHtml(folder.id)}')">Pause</button>`
                    }
                    <button class="btn btn-small btn-danger" onclick="deleteFolder('${escapeHtml(folder.id)}', '${escapeHtml(folder.label)}')">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    updateFoldersPagination();
}

function getFolderStatus(folder) {
    if (folder.paused) {
        return { class: 'paused', text: 'Paused' };
    }
    
    if (folder.status && folder.status.state) {
        switch (folder.status.state) {
            case 'idle':
                return { class: 'idle', text: 'Up to Date' };
            case 'syncing':
                return { class: 'syncing', text: 'Syncing' };
            case 'scanning':
                return { class: 'syncing', text: 'Scanning' };
            case 'error':
                return { class: 'disconnected', text: 'Error' };
            default:
                return { class: 'idle', text: folder.status.state };
        }
    }
    
    return { class: 'idle', text: 'Unknown' };
}

function updateFoldersPagination() {
    const totalPages = Math.ceil(foldersData.length / itemsPerPage);
    const prevBtn = document.getElementById('foldersPrevBtn');
    const nextBtn = document.getElementById('foldersNextBtn');
    const pageInfo = document.getElementById('foldersPageInfo');
    const pageNumbers = document.getElementById('foldersPageNumbers');

    prevBtn.disabled = currentFoldersPage <= 1;
    nextBtn.disabled = currentFoldersPage >= totalPages;
    pageInfo.textContent = `Page ${currentFoldersPage} of ${totalPages || 1} (${foldersData.length} folders)`;

    // Generate page numbers
    generatePageNumbers(pageNumbers, currentFoldersPage, totalPages, (page) => {
        currentFoldersPage = page;
        renderFoldersTable();
    });
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const statusFilter = document.getElementById('statusFilter').value.toLowerCase();
    
    let filteredFolders = [...allFoldersData];
    
    // Apply search filter
    if (searchTerm !== '') {
        filteredFolders = filteredFolders.filter(folder => 
            folder.label.toLowerCase().includes(searchTerm) ||
            folder.id.toLowerCase().includes(searchTerm) ||
            folder.path.toLowerCase().includes(searchTerm) ||
            folder.type.toLowerCase().includes(searchTerm) ||
            folder.devices.some(d => d.deviceID.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply status filter
    if (statusFilter !== '') {
        filteredFolders = filteredFolders.filter(folder => {
            const status = getFolderStatus(folder);
            const folderStatus = status.class;
            
            // Map filter values to folder status classes
            switch (statusFilter) {
                case 'idle':
                    return folderStatus === 'idle';
                case 'syncing':
                    return folderStatus === 'syncing';
                case 'paused':
                    return folderStatus === 'paused';
                case 'error':
                    return folderStatus === 'disconnected';
                default:
                    return true;
            }
        });
    }
    
    foldersData = filteredFolders;
    currentFoldersPage = 1;
    renderFoldersTable();
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    const content = document.getElementById('foldersContent');
    
    if (show) {
        loading.style.display = 'flex';
        content.style.display = 'none';
    } else {
        loading.style.display = 'none';
        content.style.display = 'block';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = errorDiv.querySelector('.error-text');
    errorText.textContent = message;
    errorDiv.style.display = 'flex';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideError();
    }, 5000);
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    const successText = successDiv.querySelector('.success-text');
    successText.textContent = message;
    successDiv.style.display = 'flex';
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        hideSuccess();
    }, 3000);
}

function hideSuccess() {
    document.getElementById('successMessage').style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Natural sorting function that handles numbers correctly
// This will sort RDP1, RDP2, RDP3, ..., RDP10, RDP11, etc. properly
function naturalSort(a, b) {
    const reA = /[^a-zA-Z]/g;
    const reN = /[^0-9]/g;
    
    const aA = a.replace(reA, "");
    const bA = b.replace(reA, "");
    
    if (aA === bA) {
        const aN = parseInt(a.replace(reN, ""), 10);
        const bN = parseInt(b.replace(reN, ""), 10);
        return aN === bN ? 0 : aN > bN ? 1 : -1;
    } else {
        return aA > bA ? 1 : -1;
    }
}

// Generate pagination numbers with ellipsis for large number of pages
function generatePageNumbers(container, currentPage, totalPages, onPageClick) {
    container.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    const maxVisible = 7; // Maximum number of page buttons to show
    const halfVisible = Math.floor(maxVisible / 2);
    
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);
    
    // Adjust if we're near the beginning or end
    if (endPage - startPage + 1 < maxVisible) {
        if (startPage === 1) {
            endPage = Math.min(totalPages, startPage + maxVisible - 1);
        } else if (endPage === totalPages) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
    }
    
    // Add first page and ellipsis if needed
    if (startPage > 1) {
        addPageButton(container, 1, currentPage, onPageClick);
        if (startPage > 2) {
            addEllipsis(container);
        }
    }
    
    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
        addPageButton(container, i, currentPage, onPageClick);
    }
    
    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            addEllipsis(container);
        }
        addPageButton(container, totalPages, currentPage, onPageClick);
    }
}

function addPageButton(container, pageNumber, currentPage, onPageClick) {
    const button = document.createElement('button');
    button.className = `pagination-number ${pageNumber === currentPage ? 'active' : ''}`;
    button.textContent = pageNumber;
    button.addEventListener('click', () => onPageClick(pageNumber));
    container.appendChild(button);
}

function addEllipsis(container) {
    const ellipsis = document.createElement('span');
    ellipsis.className = 'pagination-ellipsis';
    ellipsis.textContent = '...';
    container.appendChild(ellipsis);
}

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

// Bulk delete functions for folders
function toggleAllFolderSelection() {
    const selectAll = document.getElementById('selectAllFolders');
    const checkboxes = document.querySelectorAll('.folder-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateBulkDeleteFoldersButton();
}

function updateBulkDeleteFoldersButton() {
    const checkboxes = document.querySelectorAll('.folder-checkbox:checked');
    const bulkDeleteBtn = document.getElementById('bulkDeleteFoldersBtn');
    const selectAll = document.getElementById('selectAllFolders');
    
    if (checkboxes.length > 0) {
        bulkDeleteBtn.style.display = 'inline-block';
        bulkDeleteBtn.textContent = `Delete Selected (${checkboxes.length})`;
    } else {
        bulkDeleteBtn.style.display = 'none';
    }
    
    // Update select all checkbox state
    const allCheckboxes = document.querySelectorAll('.folder-checkbox');
    if (allCheckboxes.length > 0) {
        selectAll.checked = checkboxes.length === allCheckboxes.length;
        selectAll.indeterminate = checkboxes.length > 0 && checkboxes.length < allCheckboxes.length;
    }
}

function showBulkDeleteFoldersModal() {
    const checkboxes = document.querySelectorAll('.folder-checkbox:checked');
    if (checkboxes.length === 0) {
        showError('No folders selected');
        return;
    }
    
    const modal = document.getElementById('bulkDeleteFoldersModal');
    const listContainer = document.getElementById('bulkDeleteFoldersList');
    
    // Get selected folder data
    const selectedFolders = [];
    checkboxes.forEach(checkbox => {
        const folderID = checkbox.value;
        const folder = allFoldersData.find(f => f.id === folderID);
        if (folder) {
            selectedFolders.push(folder);
        }
    });
    
    // Populate the list
    listContainer.innerHTML = '';
    selectedFolders.forEach(folder => {
        const item = document.createElement('div');
        item.className = 'bulk-delete-item';
        item.innerHTML = `
            <strong>${escapeHtml(folder.label)}</strong><br>
            <small>ID: ${escapeHtml(folder.id)} | Path: ${escapeHtml(folder.path)}</small>
        `;
        listContainer.appendChild(item);
    });
    
    modal.classList.add('show');
}

function hideBulkDeleteFoldersModal() {
    document.getElementById('bulkDeleteFoldersModal').classList.remove('show');
}

async function confirmBulkDeleteFolders() {
    const checkboxes = document.querySelectorAll('.folder-checkbox:checked');
    if (checkboxes.length === 0) {
        showError('No folders selected');
        return;
    }
    
    const folderIDs = Array.from(checkboxes).map(cb => cb.value);
    
    hideBulkDeleteFoldersModal();
    showLoading(true);
    
    try {
        let successful = 0;
        let failed = 0;
        const errors = [];
        
        // Delete folders one by one
        for (const folderID of folderIDs) {
            try {
                const response = await fetch(`/api/folders/${encodeURIComponent(folderID)}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    successful++;
                } else {
                    failed++;
                    errors.push(`${folderID}: ${result.error || 'Failed to delete'}`);
                }
            } catch (error) {
                failed++;
                errors.push(`${folderID}: ${error.message}`);
            }
        }
        
        // Show results
        if (successful > 0) {
            showSuccess(`Successfully deleted ${successful} folder(s). ${failed > 0 ? `${failed} failed.` : ''}`);
        }
        
        if (failed > 0) {
            console.error('Bulk delete errors:', errors);
            showError(`Failed to delete ${failed} folder(s). Check console for details.`);
        }
        
        // Reload data
        await loadFolders();
        
        // Reset checkboxes
        document.getElementById('selectAllFolders').checked = false;
        updateBulkDeleteFoldersButton();
        
    } catch (error) {
        showError('Bulk delete failed: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Page size change function for folders
function changeFoldersPageSize() {
    const pageSizeSelect = document.getElementById('foldersPageSize');
    itemsPerPage = parseInt(pageSizeSelect.value);
    currentFoldersPage = 1; // Reset to first page
    renderFoldersTable();
}

// Refresh data periodically
setInterval(async () => {
    await checkConnection();
    await loadFolders();
}, 30000); // Refresh every 30 seconds
