// Search and filter functionality

// This file contains additional search utilities if needed
// The main search functionality is already implemented in app.js

// Advanced search filters (can be expanded in the future)
function createAdvancedSearchFilters() {
    // Future implementation for advanced filtering options
    // such as filtering by status, device type, folder type, etc.
}

// Search highlighting function
function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Quick search shortcuts
function setupSearchShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + F to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
        
        // Escape to clear search
        if (e.key === 'Escape' && document.activeElement === document.getElementById('searchInput')) {
            document.getElementById('searchInput').value = '';
            filterData('');
        }
    });
}

// Search suggestions (future enhancement)
function showSearchSuggestions(query) {
    // Future implementation for search suggestions
    // based on device names, folder names, etc.
}

// Initialize search enhancements
document.addEventListener('DOMContentLoaded', function() {
    setupSearchShortcuts();
});

// Export functions for use in other modules
window.searchUtils = {
    highlightSearchTerm,
    escapeRegex,
    showSearchSuggestions
};
