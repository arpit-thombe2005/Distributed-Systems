// Main JavaScript for the Distributed EHR System
class EHRSystem {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.init();
    }

    init() {
        this.connectSocket();
        this.setupEventListeners();
    }

    connectSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.isConnected = true;
            console.log('Connected to server');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus(false);
        });
    }

    setupEventListeners() {
        // Add any global event listeners here
        window.addEventListener('beforeunload', () => {
            if (this.socket) {
                this.socket.disconnect();
            }
        });
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('systemStatus');
        if (statusElement) {
            statusElement.textContent = connected ? '🟢 Online' : '🔴 Offline';
            statusElement.className = connected ? 'status-indicator online' : 'status-indicator offline';
        }
    }

    // Utility methods
    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div>${message}</div>
            <div class="notification-time">${this.formatTimestamp(Date.now())}</div>
        `;

        // Add to page if notification container exists
        const container = document.getElementById('notifications') || document.getElementById('realTimeUpdates');
        if (container) {
            container.insertBefore(notification, container.firstChild);
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 5000);
        }
    }

    // API methods
    async makeRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Request failed:', error);
            this.showNotification(`Request failed: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Initialize the system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.ehrSystem = new EHRSystem();
});

// Global utility functions
function clearNotifications() {
    const container = document.getElementById('notifications');
    if (container) {
        container.innerHTML = '';
    }
}

function clearUpdates() {
    const container = document.getElementById('realTimeUpdates');
    if (container) {
        container.innerHTML = '';
    }
}

function clearLogs() {
    const container = document.getElementById('logDisplay');
    if (container) {
        container.innerHTML = '';
    }
}

function toggleAutoScroll() {
    // This would be implemented in the specific page scripts
    console.log('Auto scroll toggle requested');
}

// Common form handling
function handleFormSubmit(form, callback) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            await callback(data);
        } catch (error) {
            console.error('Form submission error:', error);
        }
    });
}

// Common data display helpers
function createInfoItem(label, value) {
    const item = document.createElement('div');
    item.className = 'info-item';
    item.innerHTML = `
        <span class="info-label">${label}:</span>
        <span class="info-value">${value || '-'}</span>
    `;
    return item;
}

function createMetricItem(label, value) {
    const item = document.createElement('div');
    item.className = 'metric';
    item.innerHTML = `
        <span class="metric-label">${label}:</span>
        <span class="metric-value">${value || '-'}</span>
    `;
    return item;
}

function createStatusItem(label, value) {
    const item = document.createElement('div');
    item.className = 'status-item';
    item.innerHTML = `
        <span class="status-label">${label}:</span>
        <span class="status-value">${value || '-'}</span>
    `;
    return item;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EHRSystem };
}
