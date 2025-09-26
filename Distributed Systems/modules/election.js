const EventEmitter = require('events');

class Election extends EventEmitter {
    constructor(nodeId, logger) {
        super();
        this.nodeId = nodeId;
        this.logger = logger;
        this.isParticipating = false;
        this.electionTimeout = null;
        this.knownNodes = new Set();
        this.coordinator = null;
        this.electionId = null;
        
        // Add this node to known nodes
        this.knownNodes.add(this.nodeId);
    }

    startElection() {
        if (this.isParticipating) {
            this.logger.warn('Election already in progress', { nodeId: this.nodeId });
            return;
        }

        this.electionId = Date.now() + Math.random();
        this.isParticipating = true;
        
        this.logger.info('Starting election algorithm', { 
            nodeId: this.nodeId,
            electionId: this.electionId,
            knownNodes: Array.from(this.knownNodes)
        });

        this.emit('election_update', {
            type: 'election_started',
            nodeId: this.nodeId,
            electionId: this.electionId,
            timestamp: Date.now()
        });

        // Simulate election process
        this.simulateElection();
    }

    simulateElection() {
        // Simulate sending election messages to higher priority nodes
        const higherPriorityNodes = this.getHigherPriorityNodes();
        
        if (higherPriorityNodes.length === 0) {
            // This node has the highest priority, become coordinator
            this.becomeCoordinator();
        } else {
            // Send election messages to higher priority nodes
            this.logger.info(`Sending election messages to higher priority nodes`, { 
                nodeId: this.nodeId,
                targetNodes: higherPriorityNodes
            });

            // Simulate waiting for responses
            setTimeout(() => {
                this.handleElectionResponse();
            }, 2000 + Math.random() * 3000); // 2-5 seconds
        }
    }

    getHigherPriorityNodes() {
        // Simple priority based on node ID (higher ID = higher priority)
        const myPriority = this.getNodePriority(this.nodeId);
        return Array.from(this.knownNodes).filter(nodeId => {
            return this.getNodePriority(nodeId) > myPriority;
        });
    }

    getNodePriority(nodeId) {
        // Extract numeric part from node ID (e.g., "node-1" -> 1)
        const match = nodeId.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
    }

    handleElectionResponse() {
        // Simulate receiving responses from higher priority nodes
        const higherPriorityNodes = this.getHigherPriorityNodes();
        const responses = this.simulateResponses(higherPriorityNodes);

        const aliveHigherNodes = responses.filter(r => r.alive).map(r => r.nodeId);
        
        if (aliveHigherNodes.length === 0) {
            // No higher priority nodes are alive, become coordinator
            this.becomeCoordinator();
        } else {
            // Wait for coordinator announcement from higher priority nodes
            this.logger.info(`Waiting for coordinator announcement from higher priority nodes`, { 
                nodeId: this.nodeId,
                aliveNodes: aliveHigherNodes
            });

            // Simulate receiving coordinator announcement
            setTimeout(() => {
                this.receiveCoordinatorAnnouncement(aliveHigherNodes[0]);
            }, 1000 + Math.random() * 2000);
        }
    }

    simulateResponses(nodeIds) {
        // Simulate some nodes being alive and some being dead
        return nodeIds.map(nodeId => ({
            nodeId,
            alive: Math.random() > 0.3 // 70% chance of being alive
        }));
    }

    becomeCoordinator() {
        this.coordinator = this.nodeId;
        this.isParticipating = false;
        
        this.logger.info(`Elected as coordinator`, { 
            nodeId: this.nodeId,
            electionId: this.electionId
        });

        this.emit('election_update', {
            type: 'coordinator_elected',
            coordinator: this.nodeId,
            electionId: this.electionId,
            timestamp: Date.now()
        });

        // Announce coordinator status to all nodes
        this.announceCoordinator();
    }

    announceCoordinator() {
        this.logger.info(`Announcing coordinator status to all nodes`, { 
            nodeId: this.nodeId,
            coordinator: this.coordinator
        });

        this.emit('election_update', {
            type: 'coordinator_announced',
            coordinator: this.nodeId,
            timestamp: Date.now()
        });
    }

    receiveCoordinatorAnnouncement(coordinatorNodeId) {
        this.coordinator = coordinatorNodeId;
        this.isParticipating = false;
        
        this.logger.info(`Received coordinator announcement`, { 
            nodeId: this.nodeId,
            coordinator: coordinatorNodeId,
            electionId: this.electionId
        });

        this.emit('election_update', {
            type: 'coordinator_elected',
            coordinator: coordinatorNodeId,
            electionId: this.electionId,
            timestamp: Date.now()
        });
    }

    addNode(nodeId) {
        this.knownNodes.add(nodeId);
        this.logger.info(`Added node to election system`, { 
            nodeId: this.nodeId,
            addedNode: nodeId,
            totalNodes: this.knownNodes.size
        });
    }

    removeNode(nodeId) {
        this.knownNodes.delete(nodeId);
        this.logger.info(`Removed node from election system`, { 
            nodeId: this.nodeId,
            removedNode: nodeId,
            totalNodes: this.knownNodes.size
        });

        // If the coordinator was removed, start a new election
        if (this.coordinator === nodeId) {
            this.logger.info(`Coordinator node removed, starting new election`, { 
                nodeId: this.nodeId,
                removedCoordinator: nodeId
            });
            setTimeout(() => {
                this.startElection();
            }, 1000);
        }
    }

    getStatus() {
        return {
            nodeId: this.nodeId,
            isParticipating: this.isParticipating,
            coordinator: this.coordinator,
            knownNodes: Array.from(this.knownNodes),
            electionId: this.electionId,
            isCoordinator: this.coordinator === this.nodeId
        };
    }

    // Simulate node failure detection
    detectNodeFailure(nodeId) {
        this.logger.warn(`Detected node failure`, { 
            nodeId: this.nodeId,
            failedNode: nodeId
        });

        this.removeNode(nodeId);
    }

    // Simulate periodic health checks
    startHealthChecks() {
        setInterval(() => {
            this.performHealthCheck();
        }, 15000); // Check every 15 seconds
    }

    performHealthCheck() {
        // Simulate random node failures
        if (Math.random() < 0.05) { // 5% chance of detecting a failure
            const nodes = Array.from(this.knownNodes);
            if (nodes.length > 1) {
                const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
                if (randomNode !== this.nodeId) {
                    this.detectNodeFailure(randomNode);
                }
            }
        }
    }
}

module.exports = Election;
