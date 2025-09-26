const EventEmitter = require('events');

class Replication extends EventEmitter {
    constructor(nodeId, logger) {
        super();
        this.nodeId = nodeId;
        this.logger = logger;
        this.replicas = new Map(); // replicaId -> replica data
        this.replicationFactor = 3;
        this.consistencyLevel = 'eventual'; // eventual, strong
        this.pendingUpdates = new Map(); // updateId -> update info
        this.acknowledgments = new Map(); // updateId -> Set of acknowledged nodes
        this.peerPorts = [];
        
        this.initializeReplicas();
    }

    initializeReplicas() {
        // Initialize replica data structure
        for (let i = 0; i < this.replicationFactor; i++) {
            const replicaId = `replica-${i}`;
            this.replicas.set(replicaId, {
                id: replicaId,
                data: new Map(),
                lastUpdate: null,
                status: 'active',
                nodeId: this.nodeId
            });
        }

        this.logger.info(`Initialized ${this.replicationFactor} replicas`, { 
            nodeId: this.nodeId,
            replicas: Array.from(this.replicas.keys())
        });
    }

    replicateUpdate(resourceId, updates) {
        const updateId = Date.now() + Math.random();
        const update = {
            id: updateId,
            resourceId,
            updates,
            timestamp: Date.now(),
            nodeId: this.nodeId,
            status: 'pending'
        };

        this.pendingUpdates.set(updateId, update);
        this.acknowledgments.set(updateId, new Set());

        this.logger.info(`Starting replication for update ${updateId}`, { 
            nodeId: this.nodeId,
            resourceId,
            updateId,
            updates
        });

        // Apply update to local replicas
        this.applyUpdateToReplicas(update);

        // Replicate to real peers if configured; otherwise simulate
        if (this.peerPorts && this.peerPorts.length > 0) {
            this.replicateToPeers(update);
        } else {
            this.simulateReplication(update);
        }

        this.emit('replication_update', {
            type: 'update_initiated',
            updateId,
            resourceId,
            updates,
            timestamp: Date.now()
        });
    }

    setPeers(ports) {
        this.peerPorts = Array.isArray(ports) ? ports : [];
        this.logger.info('Replication peers set', { nodeId: this.nodeId, peers: this.peerPorts });
    }

    replicateToPeers(update) {
        const promises = this.peerPorts.map(async (port) => {
            try {
                const res = await fetch(`http://localhost:${port}/cluster/replicate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        resourceId: update.resourceId,
                        updates: update.updates,
                        timestamp: update.timestamp,
                        origin: this.nodeId
                    })
                });
                if (res.ok) {
                    if (this.acknowledgments.has(update.id)) {
                        this.acknowledgments.get(update.id).add(`port-${port}`);
                    }
                    this.checkReplicationCompletion(update);
                } else {
                    this.logger.warn('Peer replication failed', { targetPort: port, updateId: update.id });
                }
            } catch (e) {
                this.logger.warn('Peer replication error', { targetPort: port, error: e.message });
            }
        });
        Promise.all(promises).catch(() => {});
    }

    applyUpdateToReplicas(update) {
        this.replicas.forEach((replica, replicaId) => {
            if (replica.status === 'active') {
                // Apply update to replica data
                if (!replica.data.has(update.resourceId)) {
                    replica.data.set(update.resourceId, {});
                }
                
                const resourceData = replica.data.get(update.resourceId);
                Object.assign(resourceData, update.updates);
                
                replica.lastUpdate = update.timestamp;
                
                this.logger.info(`Applied update to replica ${replicaId}`, { 
                    nodeId: this.nodeId,
                    replicaId,
                    resourceId: update.resourceId,
                    updateId: update.id
                });
            }
        });
    }

    simulateReplication(update) {
        // Simulate replication to other nodes with different latencies
        const replicationNodes = this.getReplicationNodes();
        
        replicationNodes.forEach((nodeId, index) => {
            const delay = 500 + (index * 200) + Math.random() * 1000; // 500ms to 2.5s delay
            
            setTimeout(() => {
                this.simulateNodeReplication(nodeId, update);
            }, delay);
        });
    }

    getReplicationNodes() {
        // Simulate other nodes in the system
        const nodes = [];
        for (let i = 1; i <= 5; i++) {
            const nodeId = `node-${i}`;
            if (nodeId !== this.nodeId) {
                nodes.push(nodeId);
            }
        }
        return nodes;
    }

    simulateNodeReplication(nodeId, update) {
        // Simulate successful replication with some failures
        const success = Math.random() > 0.1; // 90% success rate
        
        if (success) {
            this.logger.info(`Replication successful to node ${nodeId}`, { 
                nodeId: this.nodeId,
                targetNode: nodeId,
                updateId: update.id,
                resourceId: update.resourceId
            });

            // Add acknowledgment
            if (this.acknowledgments.has(update.id)) {
                this.acknowledgments.get(update.id).add(nodeId);
            }

            // Check if we have enough acknowledgments
            this.checkReplicationCompletion(update);
        } else {
            this.logger.warn(`Replication failed to node ${nodeId}`, { 
                nodeId: this.nodeId,
                targetNode: nodeId,
                updateId: update.id,
                resourceId: update.resourceId
            });

            // Simulate retry after delay
            setTimeout(() => {
                this.simulateNodeReplication(nodeId, update);
            }, 2000);
        }
    }

    checkReplicationCompletion(update) {
        const acknowledgments = this.acknowledgments.get(update.id);
        const requiredAcks = Math.ceil(this.replicationFactor / 2); // Majority

        if (acknowledgments && acknowledgments.size >= requiredAcks) {
            // Mark update as completed
            update.status = 'completed';
            this.pendingUpdates.set(update.id, update);

            this.logger.info(`Replication completed for update ${update.id}`, { 
                nodeId: this.nodeId,
                updateId: update.id,
                acknowledgments: acknowledgments.size,
                required: requiredAcks
            });

            this.emit('replication_update', {
                type: 'update_completed',
                updateId: update.id,
                resourceId: update.resourceId,
                acknowledgments: Array.from(acknowledgments),
                timestamp: Date.now()
            });

            // Clean up after some time
            setTimeout(() => {
                this.cleanupUpdate(update.id);
            }, 30000);
        }
    }

    cleanupUpdate(updateId) {
        this.pendingUpdates.delete(updateId);
        this.acknowledgments.delete(updateId);
        
        this.logger.info(`Cleaned up completed update ${updateId}`, { 
            nodeId: this.nodeId,
            updateId
        });
    }

    getReplicaData(resourceId) {
        const replicaData = new Map();
        
        this.replicas.forEach((replica, replicaId) => {
            if (replica.data.has(resourceId)) {
                replicaData.set(replicaId, {
                    data: replica.data.get(resourceId),
                    lastUpdate: replica.lastUpdate,
                    status: replica.status
                });
            }
        });

        return replicaData;
    }

    checkConsistency(resourceId) {
        const replicaData = this.getReplicaData(resourceId);
        
        if (replicaData.size === 0) {
            return { consistent: true, message: 'No data found' };
        }

        // Check if all replicas have the same data
        const firstReplica = Array.from(replicaData.values())[0];
        let consistent = true;
        const inconsistencies = [];

        replicaData.forEach((data, replicaId) => {
            if (JSON.stringify(data.data) !== JSON.stringify(firstReplica.data)) {
                consistent = false;
                inconsistencies.push({
                    replicaId,
                    data: data.data,
                    lastUpdate: data.lastUpdate
                });
            }
        });

        return {
            consistent,
            inconsistencies,
            replicaCount: replicaData.size,
            lastUpdate: firstReplica.lastUpdate
        };
    }

    getStatus() {
        const status = {
            nodeId: this.nodeId,
            replicationFactor: this.replicationFactor,
            consistencyLevel: this.consistencyLevel,
            replicas: Array.from(this.replicas.entries()).map(([id, replica]) => ({
                id,
                status: replica.status,
                lastUpdate: replica.lastUpdate,
                dataSize: replica.data.size
            })),
            pendingUpdates: this.pendingUpdates.size,
            totalUpdates: this.pendingUpdates.size + this.acknowledgments.size
        };

        return status;
    }

    // Simulate replica failure
    simulateReplicaFailure(replicaId) {
        if (this.replicas.has(replicaId)) {
            const replica = this.replicas.get(replicaId);
            replica.status = 'failed';
            
            this.logger.warn(`Replica ${replicaId} failed`, { 
                nodeId: this.nodeId,
                replicaId
            });

            // Simulate recovery after some time
            setTimeout(() => {
                this.recoverReplica(replicaId);
            }, 10000 + Math.random() * 20000); // 10-30 seconds
        }
    }

    recoverReplica(replicaId) {
        if (this.replicas.has(replicaId)) {
            const replica = this.replicas.get(replicaId);
            replica.status = 'active';
            
            this.logger.info(`Replica ${replicaId} recovered`, { 
                nodeId: this.nodeId,
                replicaId
            });

            // Trigger consistency check
            this.performConsistencyCheck();
        }
    }

    performConsistencyCheck() {
        this.logger.info('Performing consistency check across all replicas', { 
            nodeId: this.nodeId
        });

        // Check consistency for all resources
        const allResources = new Set();
        this.replicas.forEach(replica => {
            replica.data.forEach((data, resourceId) => {
                allResources.add(resourceId);
            });
        });

        allResources.forEach(resourceId => {
            const consistency = this.checkConsistency(resourceId);
            if (!consistency.consistent) {
                this.logger.warn(`Inconsistency detected for resource ${resourceId}`, { 
                    nodeId: this.nodeId,
                    resourceId,
                    inconsistencies: consistency.inconsistencies
                });
            }
        });
    }

    // Start periodic consistency checks
    startConsistencyChecks() {
        setInterval(() => {
            this.performConsistencyCheck();
        }, 60000); // Check every minute
    }

    // Start periodic replica failure simulation
    startFailureSimulation() {
        setInterval(() => {
            if (Math.random() < 0.02) { // 2% chance of replica failure
                const replicaIds = Array.from(this.replicas.keys());
                const randomReplica = replicaIds[Math.floor(Math.random() * replicaIds.length)];
                this.simulateReplicaFailure(randomReplica);
            }
        }, 30000); // Check every 30 seconds
    }
}

module.exports = Replication;
