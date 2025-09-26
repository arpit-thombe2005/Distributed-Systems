const EventEmitter = require('events');

class TimeSync extends EventEmitter {
    constructor(nodeId, logger) {
        super();
        this.nodeId = nodeId;
        this.logger = logger;
        // Start each node with a small random skew so clocks are visibly different
        const initialSkew = Math.floor(Math.random() * 8000) - 4000; // ±4s
        this.logicalClock = Date.now() + initialSkew;
        this.offset = 0;
        this.syncInterval = null;
        this.isCoordinator = false;
        this.connectedNodes = new Map();
        this.broadcastInterval = null;
        
        // Start periodic sync
        this.startPeriodicSync();
    }

    startPeriodicSync() {
        // Sync every 30 seconds
        this.syncInterval = setInterval(() => {
            if (this.isCoordinator) {
                this.performBerkeleySync();
            }
        }, 30000);
    }

    performBerkeleySync() {
        this.logger.info('Starting Berkeley time synchronization', { 
            nodeId: this.nodeId,
            logicalClock: this.logicalClock 
        });

        // Simulate collecting time from connected nodes
        const nodeTimes = new Map();
        nodeTimes.set(this.nodeId, this.logicalClock);

        // Add some simulated node times with small variations
        this.connectedNodes.forEach((nodeInfo, nodeId) => {
            const variation = Math.random() * 1000 - 500; // ±500ms variation
            nodeTimes.set(nodeId, this.logicalClock + variation);
        });

        // Calculate average time
        const times = Array.from(nodeTimes.values());
        const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;

        // Calculate adjustments for each node
        const adjustments = new Map();
        nodeTimes.forEach((time, nodeId) => {
            const adjustment = averageTime - time;
            adjustments.set(nodeId, adjustment);
        });

        // Apply adjustment to this node
        const myAdjustment = adjustments.get(this.nodeId) || 0;
        this.offset += myAdjustment;
        this.logicalClock += myAdjustment;

        this.lastSyncTime = Date.now();
        this.logger.info('Berkeley sync completed', {
            averageTime,
            myAdjustment,
            totalOffset: this.offset,
            nodeCount: nodeTimes.size
        });

        // Emit sync update
        this.emit('sync_update', {
            type: 'sync_completed',
            averageTime,
            adjustments: Object.fromEntries(adjustments),
            timestamp: this.lastSyncTime
        });
    }

    syncTime() {
        // For demo UX: when non-coordinator requests sync, immediately align to coordinator time
        if (!this.isCoordinator && this.lastKnownCoordinatorTime) {
            const adjustment = this.lastKnownCoordinatorTime - this.logicalClock;
            this.offset += adjustment;
            this.logicalClock += adjustment;
            this.lastSyncTime = Date.now();
            this.emit('sync_update', {
                type: 'sync_completed',
                averageTime: this.logicalClock,
                adjustments: {},
                timestamp: this.lastSyncTime
            });
            this.logger.info('Aligned to coordinator time on manual sync', { adjustment });
            return;
        }
        if (this.isCoordinator) this.performBerkeleySync();
    }

    setCoordinator(isCoordinator) {
        this.isCoordinator = isCoordinator;
        this.logger.info(`Time sync coordinator status changed: ${isCoordinator}`);
        // Start/stop coordinator time broadcast
        if (this.broadcastInterval) {
            clearInterval(this.broadcastInterval);
            this.broadcastInterval = null;
        }
        if (isCoordinator) {
            this.broadcastInterval = setInterval(() => {
                const coordinatorTime = Date.now() + this.offset;
                this.emit('coordinator_time', {
                    coordinatorTime,
                    timestamp: Date.now(),
                    nodeId: this.nodeId
                });
            }, 1000);
        }
    }

    addNode(nodeId, nodeInfo) {
        this.connectedNodes.set(nodeId, nodeInfo);
        this.logger.info(`Added node to time sync: ${nodeId}`);
    }

    removeNode(nodeId) {
        this.connectedNodes.delete(nodeId);
        this.logger.info(`Removed node from time sync: ${nodeId}`);
    }

    getLogicalTime() {
        return this.logicalClock + (Date.now() - this.logicalClock);
    }

    getStatus() {
        return {
            logicalClock: this.logicalClock,
            offset: this.offset,
            isCoordinator: this.isCoordinator,
            connectedNodes: Array.from(this.connectedNodes.keys()),
            lastSync: this.lastSyncTime || null
        };
    }

    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        if (this.broadcastInterval) {
            clearInterval(this.broadcastInterval);
        }
    }
}

module.exports = TimeSync;
