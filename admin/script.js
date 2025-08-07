// Global variables
let adminKey = '';
let currentPage = 1;
let logsCurrentPage = 1;
let totalPages = 1;
let logsTotalPages = 1;
const PAGE_SIZE = 20;
let selectedUsers = new Set(); // Track selected user IDs

// API Base URL
const API_BASE = window.location.origin;

// DOM Elements
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loadingOverlay = document.getElementById('loading-overlay');

// Initialize the admin panel
document.addEventListener('DOMContentLoaded', function() {
    // Check if admin key is stored
    const storedKey = localStorage.getItem('tic-tac-dojo-admin-key');
    if (storedKey) {
        adminKey = storedKey;
        hideLoginModal();
        loadDashboard();
    } else {
        showLoginModal();
    }
    
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', refreshCurrentTab);
    
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // User search and filters
    document.getElementById('search-btn').addEventListener('click', searchUsers);
    document.getElementById('user-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchUsers();
    });
    document.getElementById('sort-by').addEventListener('change', searchUsers);
    document.getElementById('sort-order').addEventListener('change', searchUsers);
    
    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => navigatePage(-1));
    document.getElementById('next-page').addEventListener('click', () => navigatePage(1));
    document.getElementById('logs-prev-page').addEventListener('click', () => navigateLogsPage(-1));
    document.getElementById('logs-next-page').addEventListener('click', () => navigateLogsPage(1));
    
    // Bulk actions
    document.getElementById('select-all-checkbox').addEventListener('change', handleSelectAllCheckbox);
    document.getElementById('select-all-btn').addEventListener('click', selectAllUsers);
    document.getElementById('clear-selection-btn').addEventListener('click', clearSelection);
    document.getElementById('bulk-delete-btn').addEventListener('click', handleBulkDelete);
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    // Form submissions
    document.getElementById('user-edit-form').addEventListener('submit', window.handleUserEdit);
    document.getElementById('points-form').addEventListener('submit', window.handlePointsAdjustment);
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    const key = document.getElementById('admin-key').value;
    
    if (!key) {
        showError('Please enter admin key');
        return;
    }
    
    showLoading();
    
    try {
        // Test the admin key by making a request to the stats endpoint
        const response = await fetch(`${API_BASE}/api/admin?action=stats`, {
            headers: {
                'x-admin-key': key
            }
        });
        
        if (response.ok) {
            adminKey = key;
            localStorage.setItem('tic-tac-dojo-admin-key', key);
            hideLoginModal();
            loadDashboard();
            clearError();
        } else {
            throw new Error('Invalid admin key');
        }
    } catch (error) {
        showError('Invalid admin key. Please try again.');
    } finally {
        hideLoading();
    }
}

function handleLogout() {
    adminKey = '';
    localStorage.removeItem('tic-tac-dojo-admin-key');
    showLoginModal();
    document.getElementById('admin-key').value = '';
    clearError();
}

// UI Functions
function showLoginModal() {
    loginModal.classList.add('active');
}

function hideLoginModal() {
    loginModal.classList.remove('active');
}

function showLoading() {
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

function showError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

function clearError() {
    loginError.textContent = '';
    loginError.style.display = 'none';
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Tab Navigation
function switchTab(tabName) {
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load content for the tab
    switch (tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'logs':
            loadAdminLogs();
            break;
    }
}

function refreshCurrentTab() {
    const activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) {
        switchTab(activeTab.dataset.tab);
    }
}

// Dashboard Functions
async function loadDashboard() {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/api/admin?action=stats`, {
            headers: {
                'x-admin-key': adminKey
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load dashboard');
        }
        
        const data = await response.json();
        displayDashboardStats(data.stats);
    } catch (error) {
        console.error('Dashboard error:', error);
        showNotification('Failed to load dashboard data', 'error');
    } finally {
        hideLoading();
    }
}

function displayDashboardStats(stats) {
    // Update stat cards
    document.getElementById('total-players').textContent = stats.players.total.toLocaleString();
    document.getElementById('active-players').textContent = `${stats.players.active} active this week`;
    document.getElementById('total-games').textContent = stats.games.total.toLocaleString();
    document.getElementById('active-games').textContent = `${stats.games.active} currently active`;
    document.getElementById('average-score').textContent = stats.players.averageScore.toLocaleString();
    document.getElementById('total-score').textContent = `${stats.players.totalScore.toLocaleString()} total points`;
    document.getElementById('new-today').textContent = stats.players.newToday.toLocaleString();
    document.getElementById('games-today').textContent = `${stats.games.newToday} games today`;
    
    // Update level distribution chart
    updateLevelChart(stats.players.byLevel);
    
    // Update win rates chart
    updateWinRateChart(stats.games.winRatesByLevel);
}

function updateLevelChart(levelData) {
    const chartContainer = document.getElementById('level-chart');
    const maxCount = Math.max(...Object.values(levelData));
    
    chartContainer.innerHTML = '';
    
    for (let level = 1; level <= 5; level++) {
        const count = levelData[level] || 0;
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
        
        const barElement = document.createElement('div');
        barElement.className = 'chart-bar';
        barElement.innerHTML = `
            <div class="chart-label">Level ${level}</div>
            <div class="chart-bar-container">
                <div class="chart-bar-fill" style="width: ${percentage}%">${count}</div>
            </div>
        `;
        
        chartContainer.appendChild(barElement);
    }
}

function updateWinRateChart(winRateData) {
    const chartContainer = document.getElementById('winrate-chart');
    
    chartContainer.innerHTML = '';
    
    for (let level = 1; level <= 5; level++) {
        const winRate = winRateData[level] || 0;
        
        const barElement = document.createElement('div');
        barElement.className = 'chart-bar';
        barElement.innerHTML = `
            <div class="chart-label">Level ${level}</div>
            <div class="chart-bar-container">
                <div class="chart-bar-fill" style="width: ${winRate}%">${winRate}%</div>
            </div>
        `;
        
        chartContainer.appendChild(barElement);
    }
}

// Users Management Functions
async function loadUsers() {
    const search = document.getElementById('user-search').value;
    const sortBy = document.getElementById('sort-by').value;
    const sortOrder = document.getElementById('sort-order').value;
    
    showLoading();
    
    try {
        const params = new URLSearchParams({
            limit: PAGE_SIZE,
            offset: (currentPage - 1) * PAGE_SIZE,
            sortBy,
            sortOrder
        });
        
        if (search) {
            params.append('search', search);
        }
        
        const response = await fetch(`${API_BASE}/api/admin?action=users&${params}`, {
            headers: {
                'x-admin-key': adminKey
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        
        const data = await response.json();
        displayUsers(data.users);
        updatePagination(data.page, data.totalPages);
    } catch (error) {
        console.error('Users error:', error);
        showNotification('Failed to load users', 'error');
    } finally {
        hideLoading();
    }
}

function displayUsers(users) {
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const winRate = user.gamesPlayed > 0 ? 
            Math.round((user.wins / user.gamesPlayed) * 100) : 0;
        
        const lastActive = user.lastActive ? 
            new Date(user.lastActive).toLocaleDateString() : 'Never';
        
        const isSelected = selectedUsers.has(user.id);
        
        const row = document.createElement('tr');
        if (isSelected) {
            row.classList.add('selected');
        }
        
        row.innerHTML = `
            <td class="checkbox-column">
                <input type="checkbox" class="user-checkbox" data-user-id="${user.id}" ${isSelected ? 'checked' : ''}>
            </td>
            <td>${user.id}</td>
            <td>${user.playerName || 'Anonymous'}</td>
            <td>Level ${user.currentLevel} (${user.levelName})</td>
            <td>${user.totalScore?.toLocaleString() || 0}</td>
            <td>${user.gamesPlayed || 0}</td>
            <td>${winRate}%</td>
            <td>${lastActive}</td>
            <td class="user-actions">
                <button class="btn btn-primary" onclick="editUser('${user.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-warning" onclick="adjustPoints('${user.id}')">
                    <i class="fas fa-coins"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteUser('${user.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Add event listeners to checkboxes
    document.querySelectorAll('.user-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleUserCheckboxChange);
    });
    
    // Update bulk actions toolbar
    updateBulkActionsToolbar();
    updateSelectAllCheckbox();
}

function searchUsers() {
    currentPage = 1;
    selectedUsers.clear(); // Clear selection when searching
    loadUsers();
}

function updatePagination(page, total) {
    currentPage = page;
    totalPages = total;
    
    document.getElementById('page-info').textContent = `Page ${page} of ${total}`;
    document.getElementById('prev-page').disabled = page <= 1;
    document.getElementById('next-page').disabled = page >= total;
}

function navigatePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        selectedUsers.clear(); // Clear selection when changing pages
        loadUsers();
    }
}

// User Actions
window.editUser = async function(userId) {
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE}/api/admin?action=user&userId=${userId}`, {
            headers: {
                'x-admin-key': adminKey
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load user details');
        }
        
        const data = await response.json();
        const user = data.user;
        
        // Populate form
        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('edit-player-name').value = user.playerName || '';
        document.getElementById('edit-total-score').value = user.totalScore || 0;
        document.getElementById('edit-current-level').value = user.currentLevel || 1;
        
        // Show modal
        document.getElementById('user-edit-modal').classList.add('active');
        
    } catch (error) {
        console.error('Edit user error:', error);
        showNotification('Failed to load user details', 'error');
    } finally {
        hideLoading();
    }
}

window.handleUserEdit = async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('edit-user-id').value;
    const formData = {
        playerName: document.getElementById('edit-player-name').value,
        totalScore: parseInt(document.getElementById('edit-total-score').value),
        currentLevel: parseInt(document.getElementById('edit-current-level').value)
    };
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/api/admin?action=user&userId=${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminKey
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update user');
        }
        
        closeModals();
        loadUsers();
        showNotification('User updated successfully', 'success');
        
    } catch (error) {
        console.error('Update user error:', error);
        showNotification('Failed to update user', 'error');
    } finally {
        hideLoading();
    }
}

window.adjustPoints = function(userId) {
    document.getElementById('points-user-id').value = userId;
    document.getElementById('points-adjustment').value = '';
    document.getElementById('points-reason').value = '';
    document.getElementById('points-modal').classList.add('active');
}

window.handlePointsAdjustment = async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('points-user-id').value;
    const points = parseInt(document.getElementById('points-adjustment').value);
    const reason = document.getElementById('points-reason').value;
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/api/admin?action=adjust-points&userId=${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminKey
            },
            body: JSON.stringify({ points, reason })
        });
        
        if (!response.ok) {
            throw new Error('Failed to adjust points');
        }
        
        const data = await response.json();
        closeModals();
        loadUsers();
        showNotification(`Points adjusted: ${data.oldScore} → ${data.newScore}`, 'success');
        
    } catch (error) {
        console.error('Adjust points error:', error);
        showNotification('Failed to adjust points', 'error');
    } finally {
        hideLoading();
    }
}

window.deleteUser = async function(userId) {
    console.log('Delete user called with userId:', userId);
    
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    showLoading();
    
    try {
        console.log('Making DELETE request to:', `${API_BASE}/api/admin/users/${userId}`);
        
        const response = await fetch(`${API_BASE}/api/admin?action=user&userId=${userId}`, {
            method: 'DELETE',
            headers: {
                'x-admin-key': adminKey
            }
        });
        
        console.log('Delete response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Delete error response:', errorData);
            throw new Error(errorData.error || 'Failed to delete user');
        }
        
        const result = await response.json();
        console.log('Delete success:', result);
        
        loadUsers();
        showNotification('User deleted successfully', 'success');
        
    } catch (error) {
        console.error('Delete user error:', error);
        showNotification(`Failed to delete user: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// Admin Logs Functions
async function loadAdminLogs() {
    showLoading();
    
    try {
        const params = new URLSearchParams({
            limit: PAGE_SIZE,
            offset: (logsCurrentPage - 1) * PAGE_SIZE
        });
        
        const response = await fetch(`${API_BASE}/api/admin?action=logs&${params}`, {
            headers: {
                'x-admin-key': adminKey
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load admin logs');
        }
        
        const data = await response.json();
        displayAdminLogs(data.logs);
        updateLogsPagination(data.page, data.totalPages);
    } catch (error) {
        console.error('Admin logs error:', error);
        showNotification('Failed to load admin logs', 'error');
    } finally {
        hideLoading();
    }
}

function displayAdminLogs(logs) {
    const container = document.getElementById('logs-list');
    container.innerHTML = '';
    
    if (logs.length === 0) {
        container.innerHTML = '<p>No admin actions recorded yet.</p>';
        return;
    }
    
    logs.forEach(log => {
        const logElement = document.createElement('div');
        logElement.className = 'log-entry';
        
        const timestamp = new Date(log.timestamp).toLocaleString();
        
        let details = '';
        switch (log.type) {
            case 'points_adjustment':
                details = `Adjusted points for user ${log.userId} by ${log.pointsAdjusted} (${log.oldScore} → ${log.newScore}). Reason: ${log.reason}`;
                break;
            default:
                details = JSON.stringify(log, null, 2);
        }
        
        logElement.innerHTML = `
            <div class="log-header">
                <span class="log-type">${log.type.replace('_', ' ')}</span>
                <span class="log-time">${timestamp}</span>
            </div>
            <div class="log-details">${details}</div>
        `;
        
        container.appendChild(logElement);
    });
}

function updateLogsPagination(page, total) {
    logsCurrentPage = page;
    logsTotalPages = total;
    
    document.getElementById('logs-page-info').textContent = `Page ${page} of ${total}`;
    document.getElementById('logs-prev-page').disabled = page <= 1;
    document.getElementById('logs-next-page').disabled = page >= total;
}

function navigateLogsPage(direction) {
    const newPage = logsCurrentPage + direction;
    if (newPage >= 1 && newPage <= logsTotalPages) {
        logsCurrentPage = newPage;
        loadAdminLogs();
    }
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let backgroundColor;
    switch (type) {
        case 'error':
            backgroundColor = '#e53e3e';
            break;
        case 'success':
            backgroundColor = '#38a169';
            break;
        case 'warning':
            backgroundColor = '#dd6b20';
            break;
        default:
            backgroundColor = '#667eea';
    }
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 3000;
        max-width: 300px;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Bulk Actions Functions
function handleUserCheckboxChange(e) {
    const userId = e.target.dataset.userId;
    const row = e.target.closest('tr');
    
    if (e.target.checked) {
        selectedUsers.add(userId);
        row.classList.add('selected');
    } else {
        selectedUsers.delete(userId);
        row.classList.remove('selected');
    }
    
    updateBulkActionsToolbar();
    updateSelectAllCheckbox();
}

function handleSelectAllCheckbox(e) {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    
    checkboxes.forEach(checkbox => {
        const userId = checkbox.dataset.userId;
        const row = checkbox.closest('tr');
        
        if (e.target.checked) {
            checkbox.checked = true;
            selectedUsers.add(userId);
            row.classList.add('selected');
        } else {
            checkbox.checked = false;
            selectedUsers.delete(userId);
            row.classList.remove('selected');
        }
    });
    
    updateBulkActionsToolbar();
}

function selectAllUsers() {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    
    checkboxes.forEach(checkbox => {
        const userId = checkbox.dataset.userId;
        const row = checkbox.closest('tr');
        
        checkbox.checked = true;
        selectedUsers.add(userId);
        row.classList.add('selected');
    });
    
    updateBulkActionsToolbar();
    updateSelectAllCheckbox();
}

function clearSelection() {
    selectedUsers.clear();
    
    document.querySelectorAll('.user-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('tr').classList.remove('selected');
    });
    
    updateBulkActionsToolbar();
    updateSelectAllCheckbox();
}

function updateBulkActionsToolbar() {
    const toolbar = document.getElementById('bulk-actions-toolbar');
    const selectedCount = document.getElementById('selected-count');
    
    selectedCount.textContent = selectedUsers.size;
    
    if (selectedUsers.size > 0) {
        toolbar.style.display = 'flex';
    } else {
        toolbar.style.display = 'none';
    }
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const checkboxes = document.querySelectorAll('.user-checkbox');
    const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
    
    if (checkboxes.length === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (checkedBoxes.length === checkboxes.length) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else if (checkedBoxes.length > 0) {
        selectAllCheckbox.indeterminate = true;
    } else {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    }
}

async function handleBulkDelete() {
    if (selectedUsers.size === 0) {
        showNotification('No users selected for deletion', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedUsers.size} selected users? This action cannot be undone.`)) {
        return;
    }
    
    showLoading();
    
    try {
        const userIds = Array.from(selectedUsers);
        let successCount = 0;
        let errorCount = 0;
        
        // Delete users one by one (could be optimized with bulk endpoint)
        for (const userId of userIds) {
            try {
                const response = await fetch(`${API_BASE}/api/admin?action=user&userId=${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'x-admin-key': adminKey
                    }
                });
                
                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                    console.error(`Failed to delete user ${userId}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`Error deleting user ${userId}:`, error);
            }
        }
        
        // Clear selection and reload users
        clearSelection();
        loadUsers();
        
        if (successCount > 0 && errorCount === 0) {
            showNotification(`Successfully deleted ${successCount} users`, 'success');
        } else if (successCount > 0 && errorCount > 0) {
            showNotification(`Deleted ${successCount} users, ${errorCount} failed`, 'warning');
        } else {
            showNotification(`Failed to delete users`, 'error');
        }
        
    } catch (error) {
        console.error('Bulk delete error:', error);
        showNotification('Failed to delete selected users', 'error');
    } finally {
        hideLoading();
    }
}

// Add CSS for notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
