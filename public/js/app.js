// Global variables for devices page
let devicesData = [];
let allDevicesData = [];
let currentDevicesPage = 1;
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
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            applyFilters();
        });
    }

    // Status filter functionality
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            applyFilters();
        });
    }

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
    // Devices pagination - only if elements exist
    const devicesPrevBtn = document.getElementById('devicesPrevBtn');
    const devicesNextBtn = document.getElementById('devicesNextBtn');
    
    if (devicesPrevBtn) {
        devicesPrevBtn.addEventListener('click', () => {
            if (currentDevicesPage > 1) {
                currentDevicesPage--;
                renderDevicesTable();
            }
        });
    }

    if (devicesNextBtn) {
        devicesNextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(devicesData.length / itemsPerPage);
            if (currentDevicesPage < totalPages) {
                currentDevicesPage++;
                renderDevicesTable();
            }
        });
    }
}

// Remove switchTab function as it's not needed for devices-only page

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
        await loadDevices();
    } catch (error) {
        showError('Failed to load data: ' + error.message);
    } finally {
        showLoading(false);
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
            // Sort devices by name using natural sorting (handles numbers correctly)
            allDevicesData = result.data.sort((a, b) => naturalSort(a.name, b.name));
            devicesData = [...allDevicesData];
            renderDevicesTable();
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

function renderDevicesTable() {
    const tbody = document.getElementById('devicesTableBody');
    const startIndex = (currentDevicesPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = devicesData.slice(startIndex, endIndex);

    tbody.innerHTML = '';

    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">No devices found</td>
            </tr>
        `;
        updateDevicesPagination();
        return;
    }

    pageData.forEach(device => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="device-checkbox" value="${escapeHtml(device.deviceID)}" onchange="updateBulkDeleteButton()"></td>
            <td>${escapeHtml(device.name)}</td>
            <td><div class="device-id" title="${escapeHtml(device.deviceID)}">${escapeHtml(device.deviceID.substring(0, 7))}...</div></td>
            <td><span class="status-badge ${device.connected ? 'connected' : 'disconnected'}">${device.connected ? 'Connected' : 'Disconnected'}</span></td>
            <td><div class="addresses" title="${escapeHtml(device.addresses.join(', '))}">${escapeHtml(device.addresses.join(', '))}</div></td>
            <td>${escapeHtml(device.compression)}</td>
            <td>${device.introducer ? 'Yes' : 'No'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-small btn-primary" onclick="editDevice('${escapeHtml(device.deviceID)}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteDevice('${escapeHtml(device.deviceID)}', '${escapeHtml(device.name)}')">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    updateDevicesPagination();
}

function updateDevicesPagination() {
    const totalPages = Math.ceil(devicesData.length / itemsPerPage);
    const prevBtn = document.getElementById('devicesPrevBtn');
    const nextBtn = document.getElementById('devicesNextBtn');
    const pageInfo = document.getElementById('devicesPageInfo');
    const pageNumbers = document.getElementById('devicesPageNumbers');

    prevBtn.disabled = currentDevicesPage <= 1;
    nextBtn.disabled = currentDevicesPage >= totalPages;
    pageInfo.textContent = `Page ${currentDevicesPage} of ${totalPages || 1} (${devicesData.length} devices)`;

    // Generate page numbers
    generatePageNumbers(pageNumbers, currentDevicesPage, totalPages, (page) => {
        currentDevicesPage = page;
        renderDevicesTable();
    });
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const statusFilter = document.getElementById('statusFilter').value.toLowerCase();
    
    let filteredDevices = [...allDevicesData];
    
    // Apply search filter
    if (searchTerm !== '') {
        filteredDevices = filteredDevices.filter(device => 
            device.name.toLowerCase().includes(searchTerm) ||
            device.deviceID.toLowerCase().includes(searchTerm) ||
            device.addresses.some(addr => addr.toLowerCase().includes(searchTerm)) ||
            device.compression.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply status filter
    if (statusFilter !== '') {
        filteredDevices = filteredDevices.filter(device => {
            const deviceStatus = device.connected ? 'connected' : 'disconnected';
            return deviceStatus === statusFilter;
        });
    }
    
    devicesData = filteredDevices;
    currentDevicesPage = 1;
    renderDevicesTable();
}

// Keep the old function for backward compatibility
function filterData(searchTerm) {
    document.getElementById('searchInput').value = searchTerm;
    applyFilters();
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    const content = document.getElementById('devicesContent');
    
    if (show) {
        loading.style.display = 'flex';
        if (content) content.style.display = 'none';
    } else {
        loading.style.display = 'none';
        if (content) content.style.display = 'block';
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

// Bulk delete functions
function toggleAllDeviceSelection() {
    const selectAll = document.getElementById('selectAllDevices');
    const checkboxes = document.querySelectorAll('.device-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateBulkDeleteButton();
}

function updateBulkDeleteButton() {
    const checkboxes = document.querySelectorAll('.device-checkbox:checked');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const selectAll = document.getElementById('selectAllDevices');
    
    if (checkboxes.length > 0) {
        bulkDeleteBtn.style.display = 'inline-block';
        bulkDeleteBtn.textContent = `Delete Selected (${checkboxes.length})`;
    } else {
        bulkDeleteBtn.style.display = 'none';
    }
    
    // Update select all checkbox state
    const allCheckboxes = document.querySelectorAll('.device-checkbox');
    if (allCheckboxes.length > 0) {
        selectAll.checked = checkboxes.length === allCheckboxes.length;
        selectAll.indeterminate = checkboxes.length > 0 && checkboxes.length < allCheckboxes.length;
    }
}

function showBulkDeleteModal() {
    const checkboxes = document.querySelectorAll('.device-checkbox:checked');
    if (checkboxes.length === 0) {
        showError('No devices selected');
        return;
    }
    
    const modal = document.getElementById('bulkDeleteModal');
    const listContainer = document.getElementById('bulkDeleteList');
    
    // Get selected device data
    const selectedDevices = [];
    checkboxes.forEach(checkbox => {
        const deviceID = checkbox.value;
        const device = allDevicesData.find(d => d.deviceID === deviceID);
        if (device) {
            selectedDevices.push(device);
        }
    });
    
    // Populate the list
    listContainer.innerHTML = '';
    selectedDevices.forEach(device => {
        const item = document.createElement('div');
        item.className = 'bulk-delete-item';
        item.innerHTML = `
            <strong>${escapeHtml(device.name)}</strong><br>
            <small>${escapeHtml(device.deviceID.substring(0, 20))}...</small>
        `;
        listContainer.appendChild(item);
    });
    
    modal.classList.add('show');
}

function hideBulkDeleteModal() {
    document.getElementById('bulkDeleteModal').classList.remove('show');
}

async function confirmBulkDelete() {
    const checkboxes = document.querySelectorAll('.device-checkbox:checked');
    if (checkboxes.length === 0) {
        showError('No devices selected');
        return;
    }
    
    const deviceIDs = Array.from(checkboxes).map(cb => cb.value);
    
    hideBulkDeleteModal();
    showLoading(true);
    
    try {
        let successful = 0;
        let failed = 0;
        const errors = [];
        
        // Delete devices one by one
        for (const deviceID of deviceIDs) {
            try {
                const response = await fetch(`/api/devices/${encodeURIComponent(deviceID)}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    successful++;
                } else {
                    failed++;
                    errors.push(`${deviceID}: ${result.error || 'Failed to delete'}`);
                }
            } catch (error) {
                failed++;
                errors.push(`${deviceID}: ${error.message}`);
            }
        }
        
        // Show results
        if (successful > 0) {
            showSuccess(`Successfully deleted ${successful} device(s). ${failed > 0 ? `${failed} failed.` : ''}`);
        }
        
        if (failed > 0) {
            console.error('Bulk delete errors:', errors);
            showError(`Failed to delete ${failed} device(s). Check console for details.`);
        }
        
        // Reload data
        await loadDevices();
        
        // Reset checkboxes
        document.getElementById('selectAllDevices').checked = false;
        updateBulkDeleteButton();
        
    } catch (error) {
        showError('Bulk delete failed: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Page size change function for devices
function changeDevicesPageSize() {
    const pageSizeSelect = document.getElementById('devicesPageSize');
    itemsPerPage = parseInt(pageSizeSelect.value);
    currentDevicesPage = 1; // Reset to first page
    renderDevicesTable();
}

// Refresh data periodically
setInterval(async () => {
    await checkConnection();
    await loadDevices();
}, 30000); // Refresh every 30 seconds
