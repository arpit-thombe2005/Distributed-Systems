// Patient Portal JavaScript
class PatientPortal {
    constructor() {
        this.socket = null;
        this.currentPatient = null;
        this.init();
    }

    init() {
        this.connectSocket();
        this.setupEventListeners();
    }

    connectSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Patient portal connected to server');
        });

        this.socket.on('auth_success', (data) => {
            this.handleAuthSuccess(data);
        });

        this.socket.on('auth_error', (data) => {
            this.handleAuthError(data);
        });

        this.socket.on('patient_data', (data) => {
            this.updatePatientData(data.data);
        });

        this.socket.on('patient_updated', (update) => {
            this.handlePatientUpdate(update);
        });

        this.socket.on('server_status', (status) => {
            this.updateSystemStatus(status);
        });
    }

    setupEventListeners() {
        // Form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const updateForm = document.getElementById('updateForm');
        if (updateForm) {
            updateForm.addEventListener('submit', (e) => this.handleUpdate(e));
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const patientId = document.getElementById('patientId').value;

        if (!patientId) {
            this.showNotification('Please select a patient', 'error');
            return;
        }

        // Authenticate with server
        this.socket.emit('authenticate', {
            type: 'patient',
            credentials: {
                patientId: parseInt(patientId)
            }
        });
    }

    handleAuthSuccess(data) {
        this.currentPatient = data;
        this.showPatientDashboard();
        this.loadPatientData();
        this.showNotification(`Welcome, Patient ${data.patientId}!`, 'success');
    }

    handleAuthError(data) {
        this.showNotification(data.message, 'error');
    }

    showPatientDashboard() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('patientDashboard').style.display = 'block';
        
        // Update patient info
        this.updatePatientInfo();
    }

    updatePatientInfo() {
        if (!this.currentPatient) return;

        document.getElementById('patientIdDisplay').textContent = `ID: ${this.currentPatient.patientId}`;
    }

    async loadPatientData() {
        if (!this.currentPatient) return;

        this.socket.emit('get_patient_data', {
            patientId: this.currentPatient.patientId
        });
    }

    updatePatientData(patient) {
        if (!patient) return;

        this.currentPatient.data = patient;
        
        // Update personal information
        document.getElementById('infoName').textContent = patient.name || '-';
        document.getElementById('infoAge').textContent = patient.age || '-';
        document.getElementById('infoGender').textContent = patient.gender || '-';
        document.getElementById('infoBloodType').textContent = patient.bloodType || '-';
        document.getElementById('infoDoctor').textContent = patient.doctorName || '-';
        document.getElementById('infoLastVisit').textContent = patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : '-';

        // Update medical information
        document.getElementById('medicalCondition').textContent = patient.disease || '-';
        document.getElementById('medicalMedications').textContent = patient.medicines || '-';
        document.getElementById('medicalAllergies').textContent = patient.allergies || '-';
        document.getElementById('medicalNotes').textContent = patient.notes || '-';

        // Update vital signs
        if (patient.vitalSigns) {
            document.getElementById('vitalBloodPressure').textContent = patient.vitalSigns.bloodPressure || '-';
            document.getElementById('vitalHeartRate').textContent = patient.vitalSigns.heartRate ? `${patient.vitalSigns.heartRate} bpm` : '-';
            document.getElementById('vitalTemperature').textContent = patient.vitalSigns.temperature ? `${patient.vitalSigns.temperature} °F` : '-';
            document.getElementById('vitalWeight').textContent = patient.vitalSigns.weight ? `${patient.vitalSigns.weight} kg` : '-';
        }

        // Update patient name in header
        document.getElementById('patientName').textContent = patient.name || 'Patient';

        // Populate update form
        this.populateUpdateForm(patient);

        // Update last updated timestamp
        document.getElementById('vitalsLastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }

    populateUpdateForm(patient) {
        if (!patient) return;

        document.getElementById('updateName').value = patient.name || '';
        document.getElementById('updateAge').value = patient.age || '';
        document.getElementById('updateGender').value = patient.gender || '';
    }

    async handleUpdate(event) {
        event.preventDefault();
        
        if (!this.currentPatient) {
            this.showNotification('Please login first', 'error');
            return;
        }

        // Get update button and show loading state
        const updateButton = event.target.querySelector('button[type="submit"]');
        const originalText = updateButton.textContent;
        
        // Set loading state
        updateButton.disabled = true;
        updateButton.innerHTML = '<span class="loading-spinner"></span> Updating...';

        const updates = {
            name: document.getElementById('updateName').value,
            age: parseInt(document.getElementById('updateAge').value) || null,
            gender: document.getElementById('updateGender').value
        };

        // Remove empty values
        Object.keys(updates).forEach(key => {
            if (updates[key] === null || updates[key] === '') {
                delete updates[key];
            }
        });

        if (Object.keys(updates).length === 0) {
            this.showNotification('Please fill in at least one field', 'error');
            // Reset button state
            updateButton.disabled = false;
            updateButton.textContent = originalText;
            return;
        }

        try {
            const response = await fetch(`/api/patients/${this.currentPatient.patientId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Personal information updated successfully', 'success');
                this.loadPatientData(); // Refresh patient data
            } else {
                this.showNotification(result.message || 'Failed to update information', 'error');
            }
        } catch (error) {
            console.error('Update error:', error);
            this.showNotification('Failed to update information', 'error');
        } finally {
            // Reset button state
            updateButton.disabled = false;
            updateButton.textContent = originalText;
        }
    }

    handlePatientUpdate(update) {
        // Show notification for real-time updates
        if (update.patientId === this.currentPatient?.patientId) {
            this.showNotification('Your record has been updated by your doctor', 'info');
            this.loadPatientData(); // Refresh data
        }
    }

    updateSystemStatus(status) {
        // Update system status indicators
        const dataStatus = document.getElementById('dataStatus');
        const lastSync = document.getElementById('lastSync');
        const nodeStatus = document.getElementById('nodeStatus');

        if (dataStatus) {
            dataStatus.textContent = '✅ Up to date';
        }

        if (lastSync) {
            lastSync.textContent = new Date().toLocaleTimeString();
        }

        if (nodeStatus) {
            nodeStatus.textContent = '🟢 Online';
        }
    }

    showNotification(message, type = 'info') {
        const notifications = document.getElementById('realTimeUpdates');
        if (!notifications) return;

        const notification = document.createElement('div');
        notification.className = `update-item`;
        notification.innerHTML = `
            <div>${message}</div>
            <div class="update-time">${new Date().toLocaleTimeString()}</div>
        `;

        notifications.insertBefore(notification, notifications.firstChild);

        // Remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 10000);
    }

    logout() {
        this.currentPatient = null;
        
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('patientDashboard').style.display = 'none';
        
        // Clear forms
        document.getElementById('loginForm').reset();
        document.getElementById('updateForm').reset();
        
        this.showNotification('Logged out successfully', 'info');
    }
}

// Global functions
window.loginPatient = (event) => {
    if (window.patientPortal) {
        window.patientPortal.handleLogin(event);
    }
};

window.updatePersonalInfo = (event) => {
    if (window.patientPortal) {
        window.patientPortal.handleUpdate(event);
    }
};

window.logout = () => {
    if (window.patientPortal) {
        window.patientPortal.logout();
    }
};

window.clearUpdates = () => {
    const updates = document.getElementById('realTimeUpdates');
    if (updates) {
        updates.innerHTML = '';
    }
};

// Initialize patient portal when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.patientPortal = new PatientPortal();
});
