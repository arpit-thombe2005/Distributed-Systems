// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.socket = null;
        this.autoScroll = true;
        this.logs = [];
        this.systemStatus = {};
        this.lastCoordinatorTime = null;
        this.coordinatorSocket = null;
        this.init();
    }

    init() {
        this.connectSocket();
        this.setupEventListeners();
        this.startStatusUpdates();
    }

    connectSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Admin panel connected to server');
            this.updateSystemStatus();
        });

        this.socket.on('server_status', (status) => {
            this.systemStatus = status;
            this.updateSystemOverview(status);
        });

        this.socket.on('new_log', (logEntry) => {
            this.addLogEntry(logEntry);
        });

        this.socket.on('time_sync_update', (update) => {
            this.updateTimeSyncStatus(update);
        });

        // Show the coordinator's time so all nodes display the same clock
        this.socket.on('coordinator_time', (payload) => {
            const timeStr = new Date(payload.coordinatorTime).toLocaleTimeString();
            this.updateElement('logicalClock', timeStr);
            // Cache last known leader time for manual sync alignment on participants
            this.lastCoordinatorTime = payload.coordinatorTime;
        });

        // If we already know a leader from an earlier status fetch, connect now
        setTimeout(() => {
            const port = this.systemStatus?.leaderPort;
            const currentPort = window.location.port;
            if (port && `${port}` !== `${currentPort}`) {
                this.ensureCoordinatorSocket(port);
            }
        }, 0);

        this.socket.on('election_update', (update) => {
            this.updateElectionStatus(update);
        });

        this.socket.on('heartbeat', (heartbeat) => {
            this.updateNodeStatus(heartbeat);
        });

        this.socket.on('patient_updated', (update) => {
            this.addLogEntry({
                timestamp: new Date().toISOString(),
                level: 'INFO',
                message: `Patient ${update.patientId} updated by ${update.doctorId ? `Doctor ${update.doctorId}` : 'Patient'}`,
                nodeId: update.nodeId
            });
        });
    }

    setupEventListeners() {
        // Auto-scroll toggle
        window.toggleAutoScroll = () => {
            this.autoScroll = !this.autoScroll;
            const button = document.querySelector('button[onclick="toggleAutoScroll()"]');
            if (button) {
                button.textContent = this.autoScroll ? 'Disable Auto Scroll' : 'Enable Auto Scroll';
            }
        };

        // Clear logs
        window.clearLogs = () => {
            this.logs = [];
            this.updateLogDisplay();
        };
    }

    startStatusUpdates() {
        // Update system status every 5 seconds
        setInterval(() => {
            this.updateSystemStatus();
        }, 5000);
    }

    async updateSystemStatus() {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            this.systemStatus = status;
            this.updateSystemOverview(status);
            // If not coordinator, ensure a connection to the leader to receive its time stream
            const currentPort = window.location.port;
            if (!status.isCoordinator && status.leaderPort && `${status.leaderPort}` !== `${currentPort}`) {
                this.ensureCoordinatorSocket(status.leaderPort);
            }
        } catch (error) {
            console.error('Failed to fetch system status:', error);
        }
    }

    updateSystemOverview(status) {
        // Update system overview metrics
        this.updateElement('activeNodes', status.connectedNodes ? status.connectedNodes.length : 0);
        this.updateElement('coordinator', status.isCoordinator ? 'This Node' : 'Other Node');
        this.updateElement('uptime', this.formatDuration(status.uptime * 1000));
        this.updateElement('totalPatients', status.database?.totalPatients || 0);

        // Update time sync status
        if (status.timeSync) {
            const displayTime = this.lastCoordinatorTime || status.timeSync.logicalClock;
            this.updateElement('logicalClock', new Date(displayTime).toLocaleTimeString());
            this.updateElement('timeOffset', `${status.timeSync.offset}ms`);
            this.updateElement('syncStatus', status.timeSync.isCoordinator ? 'Coordinator' : 'Synchronized');
            this.updateElement('lastSync', status.timeSync.lastSync ? new Date(status.timeSync.lastSync).toLocaleString() : 'Never');
        }

        // Update election status
        this.updateElement('currentCoordinator', status.isCoordinator ? 'This Node' : 'Other Node');
        this.updateElement('electionStatus', 'Stable');
        this.updateElement('knownNodes', status.connectedNodes ? status.connectedNodes.length : 1);
        this.updateElement('isCoordinator', status.isCoordinator ? 'Yes' : 'No');

        // Update mutual exclusion status
        if (status.mutualExclusion) {
            this.updateElement('activeLocks', status.mutualExclusion.totalLocks || 0);
            this.updateElement('queuedRequests', status.mutualExclusion.totalQueuedRequests || 0);
            this.updateElement('lockStatus', status.mutualExclusion.totalLocks > 0 ? 'Active' : 'Idle');
        }

        // Update replication status
        if (status.replication) {
            this.updateElement('replicaCount', status.replication.replicas?.length || 0);
            this.updateElement('pendingUpdates', status.replication.pendingUpdates || 0);
            this.updateElement('consistencyLevel', status.replication.consistencyLevel || 'Eventual');
        }

        // Update node info
        this.updateElement('nodeInfo', `Node: ${status.nodeId}`);
    }

    updateTimeSyncStatus(update) {
        if (update.type === 'sync_completed') {
            this.addLogEntry({
                timestamp: new Date().toISOString(),
                level: 'INFO',
                message: `Time synchronization completed. Average time: ${new Date(update.averageTime).toLocaleTimeString()}`,
                nodeId: this.systemStatus.nodeId
            });
        }
    }

    updateElectionStatus(update) {
        let message = '';
        switch (update.type) {
            case 'election_started':
                message = `Election started (ID: ${update.electionId})`;
                break;
            case 'coordinator_elected':
                message = `New coordinator elected: ${update.coordinator}`;
                break;
            case 'coordinator_announced':
                message = `Coordinator announcement from: ${update.coordinator}`;
                break;
        }

        if (message) {
            this.addLogEntry({
                timestamp: new Date().toISOString(),
                level: 'INFO',
                message: message,
                nodeId: this.systemStatus.nodeId
            });
        }
    }

    updateNodeStatus(heartbeat) {
        const nodeList = document.getElementById('nodeStatusList');
        if (!nodeList) return;

        // Find or create node item
        let nodeItem = document.getElementById(`node-${heartbeat.nodeId}`);
        if (!nodeItem) {
            nodeItem = document.createElement('div');
            nodeItem.id = `node-${heartbeat.nodeId}`;
            nodeItem.className = 'node-item';
            nodeList.appendChild(nodeItem);
        }

        // Update node status
        const statusClass = heartbeat.status === 'alive' ? 'online' : 'offline';
        nodeItem.className = `node-item ${statusClass}`;
        nodeItem.innerHTML = `
            <div>
                <div class="node-name">${heartbeat.nodeId}</div>
                <div class="node-status">${heartbeat.isCoordinator ? 'Coordinator' : 'Participant'}</div>
            </div>
            <div class="node-status">
                ${heartbeat.status === 'alive' ? '🟢 Online' : '🔴 Offline'}
            </div>
        `;
    }

    addLogEntry(logEntry) {
        this.logs.push(logEntry);
        
        // Keep only last 1000 logs
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(-1000);
        }

        this.updateLogDisplay();
    }

    updateLogDisplay() {
        const logDisplay = document.getElementById('logDisplay');
        if (!logDisplay) return;

        // Clear and rebuild log display
        logDisplay.innerHTML = '';

        this.logs.slice(-100).forEach(log => {
            const logElement = document.createElement('div');
            logElement.className = 'log-entry';
            
            const timestamp = new Date(log.timestamp).toLocaleTimeString();
            const levelClass = log.level.toLowerCase();
            
            logElement.innerHTML = `
                <span class="log-timestamp">[${timestamp}]</span>
                <span class="log-level ${levelClass}">[${log.level}]</span>
                <span class="log-node">[${log.nodeId}]</span>
                <span class="log-message">${log.message}</span>
            `;
            
            logDisplay.appendChild(logElement);
        });

        // Auto-scroll to bottom
        if (this.autoScroll) {
            logDisplay.scrollTop = logDisplay.scrollHeight;
        }
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    ensureCoordinatorSocket(leaderPort) {
        if (this.coordinatorSocket && this.coordinatorSocket.io?.uri?.includes(`:${leaderPort}`)) {
            return; // already connected
        }
        if (this.coordinatorSocket) {
            try { this.coordinatorSocket.close(); } catch (_) {}
            this.coordinatorSocket = null;
        }
        try {
            this.coordinatorSocket = io(`http://localhost:${leaderPort}`);
            this.coordinatorSocket.on('coordinator_time', (payload) => {
                this.lastCoordinatorTime = payload.coordinatorTime;
                this.updateElement('logicalClock', new Date(payload.coordinatorTime).toLocaleTimeString());
            });
        } catch (e) {
            console.warn('Failed to connect to coordinator socket:', e);
        }
    }
}

// Global functions for admin panel
window.triggerElection = async () => {
    try {
        const response = await fetch('/api/election', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('Election triggered successfully');
        } else {
            console.error('Failed to trigger election');
        }
    } catch (error) {
        console.error('Error triggering election:', error);
    }
};

window.triggerTimeSync = async () => {
    try {
        const response = await fetch('/api/sync-time', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('Time sync triggered successfully');
        } else {
            console.error('Failed to trigger time sync');
        }
    } catch (error) {
        console.error('Error triggering time sync:', error);
    }
};

// Initialize admin panel when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
