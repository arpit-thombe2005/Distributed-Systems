// Doctor Portal JavaScript
class DoctorPortal {
    constructor() {
        this.socket = null;
        this.currentDoctor = null;
        this.patients = [];
        this.selectedPatient = null;
        this.updateBtnResetTimer = null;
        this.init();
    }

    init() {
        this.connectSocket();
        this.setupEventListeners();
    }

    connectSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Doctor portal connected to server');
        });

        this.socket.on('auth_success', (data) => {
            this.handleAuthSuccess(data);
        });

        this.socket.on('auth_error', (data) => {
            this.handleAuthError(data);
        });

        this.socket.on('doctor_patients', (data) => {
            this.updatePatientList(data.patients);
        });

        this.socket.on('patient_data', (data) => {
            this.updatePatientDetails(data.data);
        });

        this.socket.on('patient_updated', (update) => {
            this.handlePatientUpdate(update);
            // If this update is for the patient we just edited, ensure the button resets
            if (this.selectedPatient && update.patientId === this.selectedPatient.id) {
                this.setUpdateButtonLoading(false);
            }
        });

        this.socket.on('server_status', (status) => {
            this.updateSystemStatus(status);
        });
    }

    getUpdateButton() {
        return document.getElementById('updateButton');
    }

    setUpdateButtonLoading(isLoading) {
        const btn = this.getUpdateButton();
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading-spinner"></span> Updating...';
            // Safety fallback: force reset after 6s in case of UI race
            clearTimeout(this.updateBtnResetTimer);
            this.updateBtnResetTimer = setTimeout(() => {
                this.setUpdateButtonLoading(false);
            }, 6000);
        } else {
            clearTimeout(this.updateBtnResetTimer);
            btn.disabled = false;
            btn.textContent = 'Update Record';
        }
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
        
        const doctorId = document.getElementById('doctorId').value;
        const password = document.getElementById('password').value;

        if (!doctorId || !password) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        // Authenticate with server
        this.socket.emit('authenticate', {
            type: 'doctor',
            credentials: {
                doctorId: parseInt(doctorId),
                password: password
            }
        });
    }

    handleAuthSuccess(data) {
        this.currentDoctor = data;
        this.showDoctorDashboard();
        this.loadDoctorPatients();
        this.showNotification(`Welcome, Doctor ${data.doctorId}!`, 'success');
    }

    handleAuthError(data) {
        this.showNotification(data.message, 'error');
    }

    showDoctorDashboard() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('doctorDashboard').style.display = 'block';
        
        // Update doctor info
        this.updateDoctorInfo();
    }

    updateDoctorInfo() {
        if (!this.currentDoctor) return;

        // Get doctor details from sample data
        const doctorDetails = {
            1: { name: 'Dr. Sarah Johnson', specialization: 'Cardiology' },
            2: { name: 'Dr. Michael Chen', specialization: 'Neurology' },
            3: { name: 'Dr. Emily Rodriguez', specialization: 'Pediatrics' }
        };

        const details = doctorDetails[this.currentDoctor.doctorId];
        if (details) {
            document.getElementById('doctorName').textContent = details.name;
            document.getElementById('doctorSpecialization').textContent = details.specialization;
        }
    }

    async loadDoctorPatients() {
        if (!this.currentDoctor) return;

        this.socket.emit('get_doctor_patients', {
            doctorId: this.currentDoctor.doctorId
        });
    }

    updatePatientList(patients) {
        this.patients = patients;
        const patientList = document.getElementById('patientList');
        const patientCount = document.getElementById('patientCount');
        
        if (patientCount) {
            patientCount.textContent = `${patients.length} patients`;
        }

        if (patientList) {
            patientList.innerHTML = '';

            if (patients.length === 0) {
                patientList.innerHTML = '<p class="no-selection">No patients assigned</p>';
                return;
            }

            patients.forEach(patient => {
                const patientItem = document.createElement('div');
                patientItem.className = 'patient-item';
                patientItem.onclick = () => this.selectPatient(patient);
                
                patientItem.innerHTML = `
                    <h4>${patient.name}</h4>
                    <p>ID: ${patient.id} | Age: ${patient.age} | ${patient.disease}</p>
                    <p>Last Visit: ${new Date(patient.lastVisit).toLocaleDateString()}</p>
                `;
                
                patientList.appendChild(patientItem);
            });
        }
    }

    selectPatient(patient) {
        this.selectedPatient = patient;
        
        // Update UI
        document.querySelectorAll('.patient-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        event.currentTarget.classList.add('selected');
        
        // Update patient details
        this.updatePatientDetails(patient);
        
        // Update form
        this.populateUpdateForm(patient);
        
        // Enable update button
        document.getElementById('updateButton').disabled = false;
        document.getElementById('selectedPatientId').textContent = `Patient ID: ${patient.id}`;
    }

    updatePatientDetails(patient) {
        const patientDetails = document.getElementById('patientDetails');
        if (!patientDetails || !patient) return;

        patientDetails.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${patient.name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Age:</span>
                    <span class="info-value">${patient.age}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Gender:</span>
                    <span class="info-value">${patient.gender}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Blood Type:</span>
                    <span class="info-value">${patient.bloodType}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Current Condition:</span>
                    <span class="info-value">${patient.disease}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Medications:</span>
                    <span class="info-value">${patient.medicines}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Allergies:</span>
                    <span class="info-value">${patient.allergies}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Notes:</span>
                    <span class="info-value">${patient.notes}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Last Visit:</span>
                    <span class="info-value">${new Date(patient.lastVisit).toLocaleDateString()}</span>
                </div>
            </div>
            
            <div class="vitals-section">
                <h4>Vital Signs</h4>
                <div class="vitals-grid">
                    <div class="vital-item">
                        <div class="vital-icon">🩸</div>
                        <div class="vital-info">
                            <span class="vital-label">Blood Pressure</span>
                            <span class="vital-value">${patient.vitalSigns?.bloodPressure || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="vital-item">
                        <div class="vital-icon">💗</div>
                        <div class="vital-info">
                            <span class="vital-label">Heart Rate</span>
                            <span class="vital-value">${patient.vitalSigns?.heartRate || 'N/A'} bpm</span>
                        </div>
                    </div>
                    <div class="vital-item">
                        <div class="vital-icon">🌡️</div>
                        <div class="vital-info">
                            <span class="vital-label">Temperature</span>
                            <span class="vital-value">${patient.vitalSigns?.temperature || 'N/A'} °F</span>
                        </div>
                    </div>
                    <div class="vital-item">
                        <div class="vital-icon">⚖️</div>
                        <div class="vital-info">
                            <span class="vital-label">Weight</span>
                            <span class="vital-value">${patient.vitalSigns?.weight || 'N/A'} kg</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    populateUpdateForm(patient) {
        if (!patient) return;

        document.getElementById('updateDisease').value = patient.disease || '';
        document.getElementById('updateMedicines').value = patient.medicines || '';
        document.getElementById('updateNotes').value = patient.notes || '';
        document.getElementById('updateBloodPressure').value = patient.vitalSigns?.bloodPressure || '';
        document.getElementById('updateHeartRate').value = patient.vitalSigns?.heartRate || '';
        document.getElementById('updateTemperature').value = patient.vitalSigns?.temperature || '';
        document.getElementById('updateWeight').value = patient.vitalSigns?.weight || '';
    }

    async handleUpdate(event) {
        event.preventDefault();
        
        if (!this.selectedPatient || !this.currentDoctor) {
            this.showNotification('Please select a patient first', 'error');
            return;
        }

        // Show loading state on the button
        this.setUpdateButtonLoading(true);

        const updates = {
            disease: document.getElementById('updateDisease').value,
            medicines: document.getElementById('updateMedicines').value,
            notes: document.getElementById('updateNotes').value,
            vitalSigns: {
                bloodPressure: document.getElementById('updateBloodPressure').value,
                heartRate: parseInt(document.getElementById('updateHeartRate').value) || null,
                temperature: parseFloat(document.getElementById('updateTemperature').value) || null,
                weight: parseFloat(document.getElementById('updateWeight').value) || null
            }
        };

        // Remove empty values
        Object.keys(updates.vitalSigns).forEach(key => {
            if (updates.vitalSigns[key] === null || updates.vitalSigns[key] === '') {
                delete updates.vitalSigns[key];
            }
        });

        if (Object.keys(updates.vitalSigns).length === 0) {
            delete updates.vitalSigns;
        }

        try {
            const response = await fetch(`/api/doctor/${this.currentDoctor.doctorId}/patients/${this.selectedPatient.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Patient record updated successfully', 'success');
                this.loadDoctorPatients(); // Refresh patient list
            } else {
                this.showNotification(result.message || 'Failed to update patient record', 'error');
            }
        } catch (error) {
            console.error('Update error:', error);
            this.showNotification('Failed to update patient record', 'error');
        } finally {
            // Reset button state
            this.setUpdateButtonLoading(false);
        }
    }

    handlePatientUpdate(update) {
        // Show notification for real-time updates
        if (update.doctorId && update.doctorId !== this.currentDoctor?.doctorId) {
            this.showNotification(`Patient ${update.patientId} updated by another doctor`, 'info');
        }
    }

    updateSystemStatus(status) {
        // Update system status indicators
        const nodeStatus = document.getElementById('nodeStatus');
        const dataConsistency = document.getElementById('dataConsistency');
        const lastUpdate = document.getElementById('lastUpdate');

        if (nodeStatus) {
            nodeStatus.textContent = '🟢 Online';
        }

        if (dataConsistency) {
            dataConsistency.textContent = '✅ Consistent';
        }

        if (lastUpdate) {
            lastUpdate.textContent = new Date().toLocaleTimeString();
        }
    }

    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        if (!notifications) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div>${message}</div>
            <div class="notification-time">${new Date().toLocaleTimeString()}</div>
        `;

        notifications.insertBefore(notification, notifications.firstChild);

        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    logout() {
        this.currentDoctor = null;
        this.selectedPatient = null;
        this.patients = [];
        
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('doctorDashboard').style.display = 'none';
        
        // Clear forms
        document.getElementById('loginForm').reset();
        document.getElementById('updateForm').reset();
        
        this.showNotification('Logged out successfully', 'info');
    }
}

// Global functions
window.loginDoctor = (event) => {
    if (window.doctorPortal) {
        window.doctorPortal.handleLogin(event);
    }
};

window.updatePatient = (event) => {
    if (window.doctorPortal) {
        window.doctorPortal.handleUpdate(event);
    }
};

window.logout = () => {
    if (window.doctorPortal) {
        window.doctorPortal.logout();
    }
};

window.clearNotifications = () => {
    const notifications = document.getElementById('notifications');
    if (notifications) {
        notifications.innerHTML = '';
    }
};

// Initialize doctor portal when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.doctorPortal = new DoctorPortal();
});
