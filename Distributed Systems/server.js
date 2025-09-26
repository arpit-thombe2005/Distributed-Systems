const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Import our distributed system modules
const Logger = require('./modules/logger');
const TimeSync = require('./modules/timeSync');
const MutualExclusion = require('./modules/mutualExclusion');
const Election = require('./modules/election');
const Replication = require('./modules/replication');
const Database = require('./modules/database');

class DistributedEHRServer {
    constructor(port = 3000, nodeId = 'node-1', knownNodePorts = [3000, 3001, 3002]) {
        this.port = port;
        this.nodeId = nodeId;
        this.knownNodePorts = knownNodePorts;
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        // Initialize modules
        this.logger = new Logger(this.nodeId);
        this.timeSync = new TimeSync(this.nodeId, this.logger);
        this.mutualExclusion = new MutualExclusion(this.nodeId, this.logger);
        this.election = new Election(this.nodeId, this.logger);
        this.replication = new Replication(this.nodeId, this.logger);
        this.database = new Database(this.nodeId, this.logger);
        
        // Node configuration
        this.isCoordinator = false;
        this.connectedNodes = new Map();
        this.heartbeatInterval = null;
        this.coordinatorMonitor = null;
        this.leaderPort = null;
        this.awaitingCoordinator = false;
        this.awaitingOk = false;
        this.knownPeerPorts = (knownNodePorts || [])
            .filter(p => p !== port)
            .sort((a,b) => a-b);
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.startHeartbeat();

        // Configure replication peers
        this.replication.setPeers(this.knownPeerPorts);

        // Start bully election on boot
        setTimeout(() => this.startBullyElection(), 1000);
        // Start monitoring the current coordinator
        this.startCoordinatorMonitor();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    setupRoutes() {
        // API Routes
        this.app.get('/api/status', (req, res) => {
            res.json({
                nodeId: this.nodeId,
                isCoordinator: this.isCoordinator,
                connectedNodes: Array.from(this.connectedNodes.keys()),
                timeSync: this.timeSync.getStatus(),
                mutualExclusion: this.mutualExclusion.getStatus(),
                replication: this.replication.getStatus(),
                database: this.database.getStatus(),
                uptime: process.uptime(),
                leaderPort: this.leaderPort || null,
                peers: this.knownPeerPorts
            });
        });

        this.app.get('/api/patients', (req, res) => {
            res.json(this.database.getAllPatients());
        });

        this.app.post('/api/patients/:id', (req, res) => {
            const patientId = parseInt(req.params.id);
            const updates = req.body;
            
            this.logger.log(`Patient ${patientId} update requested`, 'INFO');
            
            // Use mutual exclusion for updates
            this.mutualExclusion.requestAccess(patientId, (hasAccess) => {
                if (hasAccess) {
                    const result = this.database.updatePatient(patientId, updates);
                    this.replication.replicateUpdate(patientId, updates);
                    this.mutualExclusion.releaseAccess(patientId);
                    
                    // Notify all connected clients
                    this.io.emit('patient_updated', {
                        patientId,
                        updates,
                        timestamp: Date.now(),
                        nodeId: this.nodeId
                    });
                    
                    res.json({ success: true, result });
                } else {
                    res.json({ success: false, message: 'Access denied - resource locked' });
                }
            });
        });

        this.app.post('/api/doctor/:doctorId/patients/:patientId', (req, res) => {
            const doctorId = parseInt(req.params.doctorId);
            const patientId = parseInt(req.params.patientId);
            const updates = req.body;
            
            this.logger.log(`Doctor ${doctorId} updating patient ${patientId}`, 'INFO');
            
            // Use mutual exclusion for doctor updates
            this.mutualExclusion.requestAccess(patientId, (hasAccess) => {
                if (hasAccess) {
                    const result = this.database.updatePatientByDoctor(patientId, updates, doctorId);
                    this.replication.replicateUpdate(patientId, updates);
                    this.mutualExclusion.releaseAccess(patientId);
                    
                    // Notify all connected clients
                    this.io.emit('patient_updated', {
                        patientId,
                        updates,
                        doctorId,
                        timestamp: Date.now(),
                        nodeId: this.nodeId
                    });
                    
                    res.json({ success: true, result });
                } else {
                    res.json({ success: false, message: 'Access denied - resource locked' });
                }
            });
        });

        this.app.post('/api/election', async (req, res) => {
            this.logger.log('Manual election triggered (bully)', 'INFO');
            this.startBullyElection();
            res.json({ success: true, message: 'Election started' });
        });

        this.app.post('/api/sync-time', (req, res) => {
            this.logger.log('Manual time sync triggered', 'INFO');
            this.timeSync.syncTime();
            res.json({ success: true, message: 'Time sync initiated' });
        });

        // Serve HTML pages
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        this.app.get('/admin', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'admin.html'));
        });

        this.app.get('/doctor', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'doctor.html'));
        });

        this.app.get('/patient', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'patient.html'));
        });

        // Cluster internal routes (Bully algorithm over HTTP)
        this.app.get('/cluster/ping', (req, res) => {
            res.json({ ok: true, port: this.port, isCoordinator: this.isCoordinator });
        });

        this.app.post('/cluster/election', async (req, res) => {
            // A lower-priority node is asking if we're alive
            res.json({ ok: true, port: this.port });
            // If we have higher priority, we should start our own election
            setTimeout(() => this.startBullyElection(), 0);
        });

        this.app.post('/cluster/announce', (req, res) => {
            const { coordinatorPort } = req.body || {};
            this.applyCoordinator(coordinatorPort);
            res.json({ ok: true });
        });

        // Receive replication from peers
        this.app.post('/cluster/replicate', (req, res) => {
            const { resourceId, updates, timestamp, origin } = req.body || {};
            if (typeof resourceId === 'number' && updates && typeof updates === 'object') {
                const result = this.database.updatePatient(resourceId, updates);
                this.logger.log(`Applied replicated update for patient ${resourceId} from ${origin || 'peer'}`, 'INFO');
                // Notify connected clients
                this.io.emit('patient_updated', { patientId: resourceId, updates, timestamp: timestamp || Date.now(), nodeId: this.nodeId });
                res.json({ ok: true, result });
            } else {
                res.status(400).json({ ok: false, error: 'invalid payload' });
            }
        });
    }

    setupWebSocket() {
        this.io.on('connection', (socket) => {
            this.logger.log(`Client connected: ${socket.id}`, 'INFO');
            
            // Send initial data
            socket.emit('server_status', {
                nodeId: this.nodeId,
                isCoordinator: this.isCoordinator,
                connectedNodes: Array.from(this.connectedNodes.keys()),
                timeSync: this.timeSync.getStatus(),
                database: this.database.getStatus()
            });

            // Handle client authentication
            socket.on('authenticate', (data) => {
                const { type, credentials } = data;
                
                if (type === 'doctor') {
                    const { doctorId, password } = credentials;
                    if (this.authenticateDoctor(doctorId, password)) {
                        socket.emit('auth_success', { type: 'doctor', doctorId });
                        this.logger.log(`Doctor ${doctorId} authenticated`, 'INFO');
                    } else {
                        socket.emit('auth_error', { message: 'Invalid doctor credentials' });
                    }
                } else if (type === 'patient') {
                    const { patientId } = credentials;
                    if (this.authenticatePatient(patientId)) {
                        socket.emit('auth_success', { type: 'patient', patientId });
                        this.logger.log(`Patient ${patientId} authenticated`, 'INFO');
                    } else {
                        socket.emit('auth_error', { message: 'Invalid patient ID' });
                    }
                }
            });

            // Handle patient data requests
            socket.on('get_patient_data', (data) => {
                const { patientId } = data;
                const patient = this.database.getPatient(patientId);
                socket.emit('patient_data', { patientId, data: patient });
            });

            // Handle doctor patient list requests
            socket.on('get_doctor_patients', (data) => {
                const { doctorId } = data;
                const patients = this.database.getPatientsByDoctor(doctorId);
                socket.emit('doctor_patients', { doctorId, patients });
            });

            socket.on('disconnect', () => {
                this.logger.log(`Client disconnected: ${socket.id}`, 'INFO');
            });
        });

        // Broadcast logs to admin clients
        this.logger.on('log', (logEntry) => {
            this.io.emit('new_log', logEntry);
        });

        // Broadcast time sync updates
        this.timeSync.on('sync_update', (update) => {
            this.io.emit('time_sync_update', update);
        });

        // Broadcast coordinator time so all UIs can render the same clock
        this.timeSync.on('coordinator_time', (payload) => {
            this.io.emit('coordinator_time', payload);
        });

        // Broadcast election updates
        this.election.on('election_update', (update) => {
            this.io.emit('election_update', update);
            if (update.type === 'coordinator_elected' && update.coordinator === this.nodeId) {
                this.isCoordinator = true;
                this.timeSync.setCoordinator(true);
                this.logger.log(`This node is now the coordinator`, 'INFO');
                
                // Auto-start time sync when becoming coordinator
                setTimeout(() => {
                    this.timeSync.syncTime();
                }, 1000);
            } else if (update.type === 'coordinator_elected') {
                this.isCoordinator = false;
                this.timeSync.setCoordinator(false);
            }
        });
    }

    async startBullyElection() {
        // Bully: higher port = higher priority
        const higher = this.knownPeerPorts.filter(p => p > this.port);
        if (higher.length === 0) {
            this.becomeCoordinator();
            return;
        }
        this.logger.log(`Bully election: contacting higher nodes ${higher.join(',')}`, 'INFO');
        this.awaitingOk = true;
        let gotOk = false;
        await Promise.all(higher.map(async (p) => {
            try {
                await fetch(`http://localhost:${p}/cluster/election`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: this.port }) });
                gotOk = true;
            } catch (_) {}
        }));

        if (!gotOk) {
            // No higher nodes responded => we are coordinator
            this.becomeCoordinator();
            return;
        }
        // Wait for coordinator announcement for a short while
        this.awaitingCoordinator = true;
        setTimeout(() => {
            if (this.awaitingCoordinator) {
                // No announcement came, take over
                this.becomeCoordinator();
            }
        }, 4000);
    }

    async becomeCoordinator() {
        this.applyCoordinator(this.port);
        // Announce to all peers
        await Promise.all(this.knownPeerPorts.map(async (p) => {
            try {
                await fetch(`http://localhost:${p}/cluster/announce`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coordinatorPort: this.port }) });
            } catch (_) {}
        }));
    }

    applyCoordinator(coordinatorPort) {
        this.leaderPort = coordinatorPort;
        const iAmLeader = coordinatorPort === this.port;
        this.isCoordinator = iAmLeader;
        this.timeSync.setCoordinator(iAmLeader);
        this.awaitingCoordinator = false;
        this.logger.log(iAmLeader ? 'This node became coordinator' : `Coordinator set to port ${coordinatorPort}`, 'INFO');
        this.io.emit('election_update', {
            type: 'coordinator_elected',
            coordinator: iAmLeader ? this.nodeId : `port-${coordinatorPort}`
        });
        if (iAmLeader) {
            setTimeout(() => this.timeSync.syncTime(), 1000);
        }
    }

    startCoordinatorMonitor() {
        if (this.coordinatorMonitor) return;
        this.coordinatorMonitor = setInterval(async () => {
            if (!this.leaderPort || this.leaderPort === this.port) return;
            try {
                const res = await fetch(`http://localhost:${this.leaderPort}/cluster/ping`);
                if (!res.ok) throw new Error('bad');
            } catch (_) {
                this.logger.warn('Coordinator unreachable, starting election');
                this.startBullyElection();
            }
        }, 5000);
    }

    authenticateDoctor(doctorId, password) {
        // Simple authentication - in real system, use proper auth
        const doctors = {
            1: 'doctor1',
            2: 'doctor2',
            3: 'doctor3'
        };
        return doctors[doctorId] === password;
    }

    authenticatePatient(patientId) {
        // Simple authentication - check if patient exists
        return this.database.getPatient(patientId) !== null;
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.io.emit('heartbeat', {
                nodeId: this.nodeId,
                timestamp: Date.now(),
                isCoordinator: this.isCoordinator,
                status: 'alive'
            });
        }, 5000);
    }

    start() {
        this.server.listen(this.port, () => {
            this.logger.log(`Distributed EHR Server started on port ${this.port}`, 'INFO');
            this.logger.log(`Node ID: ${this.nodeId}`, 'INFO');
            this.logger.log(`Admin panel: http://localhost:${this.port}/admin`, 'INFO');
            this.logger.log(`Doctor panel: http://localhost:${this.port}/doctor`, 'INFO');
            this.logger.log(`Patient panel: http://localhost:${this.port}/patient`, 'INFO');
        });
    }

    stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.server.close();
        this.logger.log('Server stopped', 'INFO');
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
let port = 3000;
let nodeId = 'node-1';
let nodesList = [3000, 3001, 3002]; // default known nodes by port

for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Handle --port=3001 format
    if (arg.startsWith('--port=')) {
        port = parseInt(arg.split('=')[1]);
    }
    // Handle --port 3001 format
    else if (arg === '--port' && i + 1 < args.length) {
        port = parseInt(args[i + 1]);
    }
    // Handle --node-id=node-2 format
    else if (arg.startsWith('--node-id=')) {
        nodeId = arg.split('=')[1];
    }
    // Handle --node-id node-2 format
    else if (arg === '--node-id' && i + 1 < args.length) {
        nodeId = args[i + 1];
    }
    // Handle --nodes=3000,3001,3002 format
    else if (arg.startsWith('--nodes=')) {
        const list = arg.split('=')[1];
        nodesList = list.split(',').map(v => parseInt(v)).filter(v => !isNaN(v));
    }
    // Handle --nodes 3000,3001,3002 format
    else if (arg === '--nodes' && i + 1 < args.length) {
        nodesList = args[i + 1].split(',').map(v => parseInt(v)).filter(v => !isNaN(v));
    }
}

// Start the server
const server = new DistributedEHRServer(port, nodeId, nodesList);
server.start();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.stop();
    process.exit(0);
});

module.exports = DistributedEHRServer;
