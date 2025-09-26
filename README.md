# Distributed Electronic Health Record (EHR) System

A comprehensive Node.js-based distributed system that demonstrates various distributed algorithms in a healthcare environment. This system integrates components from multiple distributed systems tasks including time synchronization, mutual exclusion, election algorithms, and data replication.

## 🏥 System Overview

The Distributed EHR System simulates a real-world healthcare environment where multiple nodes work together to maintain patient records with consistency, fault tolerance, and real-time updates.

### Key Features

- **🕐 Berkeley Time Synchronization**: Ensures all nodes maintain synchronized logical clocks
- **🔒 Distributed Mutual Exclusion**: Prevents race conditions during patient record updates
- **👑 Election Algorithm**: Automatically selects coordinator nodes for system management
- **📋 Data Replication**: Maintains multiple copies of patient data for fault tolerance
- **📊 Real-time Monitoring**: Live system logs and performance metrics
- **🔐 Role-based Authentication**: Secure access for doctors, patients, and administrators

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. **Clone or download the project files**
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the main server**:
   ```bash
   npm start
   ```

4. **Access the system**:
   - Open your browser and go to `http://localhost:3000`
   - The system will be running on the main page

### Running Multiple Nodes (Distributed Simulation)

To simulate a truly distributed system, run multiple instances on different ports:

```bash
# Terminal 1 - Node 1 (Coordinator)
node server.js --port=3000 --node-id=node-1

# Terminal 2 - Node 2
node server.js --port=3001 --node-id=node-2

# Terminal 3 - Node 3
node server.js --port=3002 --node-id=node-3
```

Each node will run independently and communicate with others to demonstrate distributed algorithms.

## 🎯 System Components

### 1. Admin Panel (`/admin`)
- **Real-time System Logs**: Live monitoring of all system events
- **Node Status**: Monitor active nodes and their health
- **Time Synchronization**: View and trigger Berkeley algorithm
- **Election Controls**: Manually trigger coordinator elections
- **System Metrics**: Performance and consistency monitoring

### 2. Doctor Portal (`/doctor`)
- **Authentication**: Login with doctor credentials
- **Patient Management**: View assigned patients
- **Record Updates**: Update patient medical records
- **Real-time Notifications**: Receive updates about patient changes
- **Consistency Monitoring**: View data replication status

**Demo Credentials**:
- Doctor 1: ID `1`, Password `doctor1` (Cardiology)
- Doctor 2: ID `2`, Password `doctor2` (Neurology)  
- Doctor 3: ID `3`, Password `doctor3` (Pediatrics)

### 3. Patient Portal (`/patient`)
- **Patient Login**: Access using patient ID
- **Personal Records**: View complete health information
- **Real-time Updates**: Receive notifications when doctors update records
- **Personal Info Updates**: Update basic personal information
- **Vital Signs**: View current vital signs and medical data

**Demo Patients**: Select any patient ID from 1-8 from the dropdown

## 🔧 Technical Architecture

### Backend Components

- **`server.js`**: Main Express server with WebSocket support
- **`modules/logger.js`**: Real-time logging system
- **`modules/timeSync.js`**: Berkeley time synchronization algorithm
- **`modules/mutualExclusion.js`**: Distributed mutual exclusion implementation
- **`modules/election.js`**: Election algorithm for coordinator selection
- **`modules/replication.js`**: Data replication and consistency management
- **`modules/database.js`**: Patient and doctor data management

### Frontend Components

- **`public/index.html`**: Main landing page
- **`public/admin.html`**: Admin monitoring dashboard
- **`public/doctor.html`**: Doctor portal interface
- **`public/patient.html`**: Patient portal interface
- **`public/styles.css`**: Modern, responsive CSS styling
- **`public/js/`**: JavaScript modules for each interface

### Distributed Algorithms Implemented

#### 1. Berkeley Time Synchronization
- **Purpose**: Maintains synchronized logical clocks across all nodes
- **Implementation**: Server collects time from all nodes, calculates average, and distributes adjustments
- **Trigger**: Automatic every 30 seconds or manual via admin panel

#### 2. Distributed Mutual Exclusion
- **Purpose**: Prevents race conditions when multiple nodes update the same patient record
- **Implementation**: Request-grant-release mechanism with timeout handling
- **Features**: Queue management, lock expiration, and deadlock prevention

#### 3. Election Algorithm
- **Purpose**: Selects a coordinator node to manage system-wide operations
- **Implementation**: Ring-based election with priority-based selection
- **Features**: Automatic failure detection and coordinator replacement

#### 4. Data Replication
- **Purpose**: Maintains multiple copies of patient data for fault tolerance
- **Implementation**: Eventual consistency with acknowledgment-based updates
- **Features**: Replica management, consistency checking, and failure recovery

## 📊 Sample Data

The system comes pre-loaded with sample data:

### Doctors
- **Dr. Sarah Johnson** (Cardiology) - Patients: Alice, Bob, Carol
- **Dr. Michael Chen** (Neurology) - Patients: David, Eva
- **Dr. Emily Rodriguez** (Pediatrics) - Patients: Frank, Grace, Henry

### Patients
- **Alice Johnson** (30, F) - Hypertension
- **Bob Smith** (45, M) - Diabetes Type 2
- **Carol Davis** (28, F) - Migraine
- **David Wilson** (52, M) - Epilepsy
- **Eva Martinez** (35, F) - Multiple Sclerosis
- **Frank Thompson** (8, M) - Asthma
- **Grace Lee** (12, F) - ADHD
- **Henry Brown** (15, M) - Type 1 Diabetes

## 🔍 Monitoring and Logs

### Real-time Logging
- All system events are logged with timestamps and node information
- Logs include: authentication, updates, synchronization, elections, and errors
- Admin panel shows live log stream with filtering capabilities

### System Metrics
- Node status and health monitoring
- Data consistency indicators
- Performance metrics and uptime tracking
- Replication status and pending updates

## 🧪 Testing the System

### 1. Basic Functionality Test
1. Start a single node: `node server.js`
2. Access admin panel and verify system status
3. Login as a doctor and update a patient record
4. Login as the patient and verify the update appears

### 2. Distributed System Test
1. Start multiple nodes on different ports
2. Trigger an election from the admin panel
3. Update a patient record and observe replication
4. Monitor logs across all nodes

### 3. Fault Tolerance Test
1. Start multiple nodes
2. Stop one node and observe failover
3. Restart the node and verify recovery
4. Check data consistency after recovery

## 🛠️ Development

### Project Structure
```
distributed-ehr-system/
├── server.js                 # Main server file
├── package.json             # Dependencies and scripts
├── modules/                 # Distributed system modules
│   ├── logger.js           # Logging system
│   ├── timeSync.js         # Time synchronization
│   ├── mutualExclusion.js  # Mutual exclusion
│   ├── election.js         # Election algorithm
│   ├── replication.js      # Data replication
│   └── database.js         # Data management
├── public/                 # Frontend files
│   ├── index.html         # Landing page
│   ├── admin.html         # Admin panel
│   ├── doctor.html        # Doctor portal
│   ├── patient.html       # Patient portal
│   ├── styles.css         # CSS styling
│   └── js/               # JavaScript modules
│       ├── main.js       # Common utilities
│       ├── admin.js      # Admin functionality
│       ├── doctor.js     # Doctor functionality
│       └── patient.js    # Patient functionality
└── README.md             # This file
```

### Adding New Features

1. **New Distributed Algorithm**: Add a new module in `modules/`
2. **New UI Component**: Add HTML/CSS/JS in `public/`
3. **New API Endpoint**: Add routes in `server.js`
4. **New WebSocket Event**: Add handlers in the appropriate JS file

### Configuration

- **Port**: Change default port by setting `--port` argument
- **Node ID**: Set custom node ID with `--node-id` argument
- **Log Level**: Modify logging in `modules/logger.js`
- **Sync Interval**: Adjust timing in `modules/timeSync.js`

## 🔒 Security Considerations

This is a demonstration system. For production use, consider:

- **Authentication**: Implement proper JWT or session-based auth
- **Encryption**: Use HTTPS and encrypt sensitive data
- **Input Validation**: Add comprehensive input sanitization
- **Access Control**: Implement proper role-based permissions
- **Audit Logging**: Add comprehensive audit trails

## 📝 API Documentation

### REST Endpoints

- `GET /api/status` - Get system status
- `GET /api/patients` - Get all patients
- `POST /api/patients/:id` - Update patient record
- `POST /api/doctor/:doctorId/patients/:patientId` - Doctor update patient
- `POST /api/election` - Trigger election
- `POST /api/sync-time` - Trigger time sync

### WebSocket Events

- `authenticate` - Client authentication
- `get_patient_data` - Request patient data
- `get_doctor_patients` - Request doctor's patients
- `new_log` - New log entry
- `patient_updated` - Patient record updated
- `time_sync_update` - Time sync status
- `election_update` - Election status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

This system integrates concepts and algorithms from:
- Berkeley Time Synchronization Algorithm
- Distributed Mutual Exclusion (Ricart-Agrawala)
- Ring-based Election Algorithm
- Eventual Consistency Models
- Real-time Web Applications

---

**Built with ❤️ using Node.js, Express, Socket.IO, and modern web technologies**
