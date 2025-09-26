const EventEmitter = require('events');

class MutualExclusion extends EventEmitter {
    constructor(nodeId, logger) {
        super();
        this.nodeId = nodeId;
        this.logger = logger;
        this.locks = new Map(); // resourceId -> { holder, timestamp, queue }
        this.requestQueue = new Map(); // resourceId -> [requests]
        this.requestTimeout = 10000; // 10 seconds timeout
    }

    requestAccess(resourceId, callback) {
        this.logger.info(`Requesting access to resource ${resourceId}`, { 
            nodeId: this.nodeId,
            resourceId 
        });

        const request = {
            id: Date.now() + Math.random(),
            nodeId: this.nodeId,
            resourceId,
            timestamp: Date.now(),
            callback
        };

        // Check if resource is already locked
        if (this.locks.has(resourceId)) {
            const lock = this.locks.get(resourceId);
            
            // If we already hold the lock, grant access immediately
            if (lock.holder === this.nodeId) {
                this.logger.info(`Already holding lock for resource ${resourceId}`, { 
                    nodeId: this.nodeId,
                    resourceId 
                });
                callback(true);
                return;
            }

            // Add to queue
            if (!this.requestQueue.has(resourceId)) {
                this.requestQueue.set(resourceId, []);
            }
            this.requestQueue.get(resourceId).push(request);

            this.logger.info(`Resource ${resourceId} is locked, added to queue`, { 
                nodeId: this.nodeId,
                resourceId,
                queueSize: this.requestQueue.get(resourceId).length
            });

            // Set timeout for request
            setTimeout(() => {
                this.handleRequestTimeout(request);
            }, this.requestTimeout);

        } else {
            // Resource is available, grant access immediately
            this.acquireLock(resourceId, request);
            callback(true);
        }
    }

    acquireLock(resourceId, request) {
        this.locks.set(resourceId, {
            holder: this.nodeId,
            timestamp: Date.now(),
            requestId: request.id
        });

        this.logger.info(`Acquired lock for resource ${resourceId}`, { 
            nodeId: this.nodeId,
            resourceId,
            requestId: request.id
        });

        this.emit('lock_acquired', {
            resourceId,
            nodeId: this.nodeId,
            timestamp: Date.now()
        });
    }

    releaseAccess(resourceId) {
        if (this.locks.has(resourceId)) {
            const lock = this.locks.get(resourceId);
            
            if (lock.holder === this.nodeId) {
                this.locks.delete(resourceId);
                
                this.logger.info(`Released lock for resource ${resourceId}`, { 
                    nodeId: this.nodeId,
                    resourceId
                });

                this.emit('lock_released', {
                    resourceId,
                    nodeId: this.nodeId,
                    timestamp: Date.now()
                });

                // Process next request in queue
                this.processNextRequest(resourceId);
            } else {
                this.logger.warn(`Attempted to release lock not held by this node`, { 
                    nodeId: this.nodeId,
                    resourceId,
                    actualHolder: lock.holder
                });
            }
        }
    }

    processNextRequest(resourceId) {
        if (this.requestQueue.has(resourceId)) {
            const queue = this.requestQueue.get(resourceId);
            if (queue.length > 0) {
                const nextRequest = queue.shift();
                
                this.logger.info(`Processing next request for resource ${resourceId}`, { 
                    nodeId: this.nodeId,
                    resourceId,
                    requestNodeId: nextRequest.nodeId
                });

                // Grant access to next request
                if (nextRequest.callback) {
                    nextRequest.callback(true);
                }

                // Acquire lock for the requesting node
                this.acquireLock(resourceId, nextRequest);
            }

            // Clean up empty queue
            if (queue.length === 0) {
                this.requestQueue.delete(resourceId);
            }
        }
    }

    handleRequestTimeout(request) {
        // Check if request is still in queue
        if (this.requestQueue.has(request.resourceId)) {
            const queue = this.requestQueue.get(request.resourceId);
            const index = queue.findIndex(req => req.id === request.id);
            
            if (index !== -1) {
                queue.splice(index, 1);
                
                this.logger.warn(`Request timeout for resource ${request.resourceId}`, { 
                    nodeId: this.nodeId,
                    resourceId: request.resourceId,
                    requestId: request.id
                });

                // Call callback with false (access denied)
                if (request.callback) {
                    request.callback(false);
                }
            }
        }
    }

    getLockStatus() {
        const status = {};
        this.locks.forEach((lock, resourceId) => {
            status[resourceId] = {
                holder: lock.holder,
                timestamp: lock.timestamp,
                duration: Date.now() - lock.timestamp
            };
        });
        return status;
    }

    getQueueStatus() {
        const status = {};
        this.requestQueue.forEach((queue, resourceId) => {
            status[resourceId] = queue.map(req => ({
                nodeId: req.nodeId,
                timestamp: req.timestamp,
                duration: Date.now() - req.timestamp
            }));
        });
        return status;
    }

    getStatus() {
        return {
            locks: this.getLockStatus(),
            queues: this.getQueueStatus(),
            totalLocks: this.locks.size,
            totalQueuedRequests: Array.from(this.requestQueue.values())
                .reduce((sum, queue) => sum + queue.length, 0)
        };
    }

    // Clean up expired locks (safety mechanism)
    cleanupExpiredLocks() {
        const now = Date.now();
        const maxLockDuration = 60000; // 1 minute max lock duration

        this.locks.forEach((lock, resourceId) => {
            if (now - lock.timestamp > maxLockDuration) {
                this.logger.warn(`Force releasing expired lock for resource ${resourceId}`, { 
                    nodeId: this.nodeId,
                    resourceId,
                    duration: now - lock.timestamp
                });
                
                this.locks.delete(resourceId);
                this.processNextRequest(resourceId);
            }
        });
    }

    startCleanupTimer() {
        // Clean up expired locks every 30 seconds
        setInterval(() => {
            this.cleanupExpiredLocks();
        }, 30000);
    }
}

module.exports = MutualExclusion;
