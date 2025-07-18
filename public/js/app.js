// Global variables for devices page
let devicesData = [];
let allDevicesData = [];
let currentDevicesPage = 1;
const itemsPerPage = 20;

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
        const result = await response.json();
        
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

// Refresh data periodically
setInterval(async () => {
    await checkConnection();
    await loadDevices();
}, 30000); // Refresh every 30 seconds
