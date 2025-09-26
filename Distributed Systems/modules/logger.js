const EventEmitter = require('events');

class Logger extends EventEmitter {
    constructor(nodeId) {
        super();
        this.nodeId = nodeId;
        this.logs = [];
        this.maxLogs = 1000; // Keep last 1000 logs
    }

    log(message, level = 'INFO', metadata = {}) {
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            nodeId: this.nodeId,
            level: level.toUpperCase(),
            message: message,
            metadata: metadata
        };

        this.logs.push(logEntry);
        
        // Keep only the last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Emit the log event for real-time updates
        this.emit('log', logEntry);

        // Also log to console
        console.log(`[${logEntry.timestamp}] [${logEntry.level}] [${this.nodeId}] ${message}`);
    }

    getLogs(limit = 100) {
        return this.logs.slice(-limit);
    }

    clearLogs() {
        this.logs = [];
        this.log('Logs cleared', 'INFO');
    }

    // Log levels
    info(message, metadata = {}) {
        this.log(message, 'INFO', metadata);
    }

    warn(message, metadata = {}) {
        this.log(message, 'WARN', metadata);
    }

    error(message, metadata = {}) {
        this.log(message, 'ERROR', metadata);
    }

    debug(message, metadata = {}) {
        this.log(message, 'DEBUG', metadata);
    }
}

module.exports = Logger;
