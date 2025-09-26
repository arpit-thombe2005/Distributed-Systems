const EventEmitter = require('events');

class Database extends EventEmitter {
    constructor(nodeId, logger) {
        super();
        this.nodeId = nodeId;
        this.logger = logger;
        this.patients = new Map();
        this.doctors = new Map();
        this.initializeSampleData();
    }

    initializeSampleData() {
        // Initialize sample doctors
        this.doctors.set(1, {
            id: 1,
            name: 'Dr. Sarah Johnson',
            specialization: 'Cardiology',
            patients: [1, 2, 3]
        });

        this.doctors.set(2, {
            id: 2,
            name: 'Dr. Michael Chen',
            specialization: 'Neurology',
            patients: [4, 5]
        });

        this.doctors.set(3, {
            id: 3,
            name: 'Dr. Emily Rodriguez',
            specialization: 'Pediatrics',
            patients: [6, 7, 8]
        });

        // Initialize sample patients
        this.patients.set(1, {
            id: 1,
            name: 'Alice Johnson',
            age: 30,
            gender: 'F',
            bloodType: 'A+',
            disease: 'Hypertension',
            medicines: 'Lisinopril 10mg',
            allergies: 'Penicillin',
            doctorId: 1,
            doctorName: 'Dr. Sarah Johnson',
            lastVisit: new Date().toISOString(),
            notes: 'Regular checkup scheduled',
            vitalSigns: {
                bloodPressure: '120/80',
                heartRate: 72,
                temperature: 98.6,
                weight: 65
            }
        });

        this.patients.set(2, {
            id: 2,
            name: 'Bob Smith',
            age: 45,
            gender: 'M',
            bloodType: 'O+',
            disease: 'Diabetes Type 2',
            medicines: 'Metformin 500mg',
            allergies: 'None',
            doctorId: 1,
            doctorName: 'Dr. Sarah Johnson',
            lastVisit: new Date().toISOString(),
            notes: 'Blood sugar monitoring required',
            vitalSigns: {
                bloodPressure: '130/85',
                heartRate: 78,
                temperature: 98.4,
                weight: 80
            }
        });

        this.patients.set(3, {
            id: 3,
            name: 'Carol Davis',
            age: 28,
            gender: 'F',
            bloodType: 'B+',
            disease: 'Migraine',
            medicines: 'Sumatriptan 50mg',
            allergies: 'Aspirin',
            doctorId: 1,
            doctorName: 'Dr. Sarah Johnson',
            lastVisit: new Date().toISOString(),
            notes: 'Trigger factors identified',
            vitalSigns: {
                bloodPressure: '110/70',
                heartRate: 68,
                temperature: 98.2,
                weight: 55
            }
        });

        this.patients.set(4, {
            id: 4,
            name: 'David Wilson',
            age: 52,
            gender: 'M',
            bloodType: 'AB+',
            disease: 'Epilepsy',
            medicines: 'Carbamazepine 200mg',
            allergies: 'None',
            doctorId: 2,
            doctorName: 'Dr. Michael Chen',
            lastVisit: new Date().toISOString(),
            notes: 'Seizure frequency reduced',
            vitalSigns: {
                bloodPressure: '125/80',
                heartRate: 75,
                temperature: 98.5,
                weight: 85
            }
        });

        this.patients.set(5, {
            id: 5,
            name: 'Eva Martinez',
            age: 35,
            gender: 'F',
            bloodType: 'A-',
            disease: 'Multiple Sclerosis',
            medicines: 'Interferon beta-1a',
            allergies: 'Latex',
            doctorId: 2,
            doctorName: 'Dr. Michael Chen',
            lastVisit: new Date().toISOString(),
            notes: 'MRI scheduled for next month',
            vitalSigns: {
                bloodPressure: '115/75',
                heartRate: 70,
                temperature: 98.3,
                weight: 60
            }
        });

        this.patients.set(6, {
            id: 6,
            name: 'Frank Thompson',
            age: 8,
            gender: 'M',
            bloodType: 'O+',
            disease: 'Asthma',
            medicines: 'Albuterol inhaler',
            allergies: 'Dust mites',
            doctorId: 3,
            doctorName: 'Dr. Emily Rodriguez',
            lastVisit: new Date().toISOString(),
            notes: 'Peak flow monitoring',
            vitalSigns: {
                bloodPressure: '95/60',
                heartRate: 85,
                temperature: 98.7,
                weight: 25
            }
        });

        this.patients.set(7, {
            id: 7,
            name: 'Grace Lee',
            age: 12,
            gender: 'F',
            bloodType: 'B+',
            disease: 'ADHD',
            medicines: 'Methylphenidate 20mg',
            allergies: 'None',
            doctorId: 3,
            doctorName: 'Dr. Emily Rodriguez',
            lastVisit: new Date().toISOString(),
            notes: 'Behavioral therapy recommended',
            vitalSigns: {
                bloodPressure: '100/65',
                heartRate: 80,
                temperature: 98.4,
                weight: 40
            }
        });

        this.patients.set(8, {
            id: 8,
            name: 'Henry Brown',
            age: 15,
            gender: 'M',
            bloodType: 'A+',
            disease: 'Type 1 Diabetes',
            medicines: 'Insulin glargine',
            allergies: 'None',
            doctorId: 3,
            doctorName: 'Dr. Emily Rodriguez',
            lastVisit: new Date().toISOString(),
            notes: 'Continuous glucose monitoring',
            vitalSigns: {
                bloodPressure: '105/70',
                heartRate: 75,
                temperature: 98.5,
                weight: 55
            }
        });

        this.logger.info(`Initialized database with ${this.patients.size} patients and ${this.doctors.size} doctors`, {
            nodeId: this.nodeId,
            patientCount: this.patients.size,
            doctorCount: this.doctors.size
        });
    }

    getAllPatients() {
        return Array.from(this.patients.values());
    }

    getPatient(patientId) {
        return this.patients.get(patientId) || null;
    }

    getPatientsByDoctor(doctorId) {
        const doctor = this.doctors.get(doctorId);
        if (!doctor) return [];

        return doctor.patients.map(patientId => this.patients.get(patientId)).filter(Boolean);
    }

    getAllDoctors() {
        return Array.from(this.doctors.values());
    }

    getDoctor(doctorId) {
        return this.doctors.get(doctorId) || null;
    }

    updatePatient(patientId, updates) {
        const patient = this.patients.get(patientId);
        if (!patient) {
            this.logger.warn(`Patient ${patientId} not found for update`, { 
                nodeId: this.nodeId,
                patientId
            });
            return { success: false, message: 'Patient not found' };
        }

        // Apply updates
        Object.assign(patient, updates);
        patient.lastModified = new Date().toISOString();
        patient.modifiedBy = 'patient';

        this.patients.set(patientId, patient);

        this.logger.info(`Patient ${patientId} updated by patient`, { 
            nodeId: this.nodeId,
            patientId,
            updates
        });

        this.emit('patient_updated', {
            patientId,
            updates,
            timestamp: Date.now(),
            nodeId: this.nodeId
        });

        return { success: true, patient };
    }

    updatePatientByDoctor(patientId, updates, doctorId) {
        const patient = this.patients.get(patientId);
        if (!patient) {
            this.logger.warn(`Patient ${patientId} not found for doctor update`, { 
                nodeId: this.nodeId,
                patientId,
                doctorId
            });
            return { success: false, message: 'Patient not found' };
        }

        // Verify doctor has access to this patient
        if (patient.doctorId !== doctorId) {
            this.logger.warn(`Doctor ${doctorId} attempted to update patient ${patientId} without access`, { 
                nodeId: this.nodeId,
                patientId,
                doctorId,
                assignedDoctor: patient.doctorId
            });
            return { success: false, message: 'Access denied - patient not assigned to this doctor' };
        }

        // Apply updates
        Object.assign(patient, updates);
        patient.lastModified = new Date().toISOString();
        patient.modifiedBy = `doctor-${doctorId}`;

        this.patients.set(patientId, patient);

        this.logger.info(`Patient ${patientId} updated by doctor ${doctorId}`, { 
            nodeId: this.nodeId,
            patientId,
            doctorId,
            updates
        });

        this.emit('patient_updated', {
            patientId,
            updates,
            doctorId,
            timestamp: Date.now(),
            nodeId: this.nodeId
        });

        return { success: true, patient };
    }

    addPatient(patientData) {
        const patientId = Date.now(); // Simple ID generation
        const patient = {
            id: patientId,
            ...patientData,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            modifiedBy: 'system'
        };

        this.patients.set(patientId, patient);

        this.logger.info(`New patient added`, { 
            nodeId: this.nodeId,
            patientId,
            patientName: patient.name
        });

        this.emit('patient_added', {
            patientId,
            patient,
            timestamp: Date.now(),
            nodeId: this.nodeId
        });

        return { success: true, patient };
    }

    addDoctor(doctorData) {
        const doctorId = Date.now(); // Simple ID generation
        const doctor = {
            id: doctorId,
            ...doctorData,
            patients: [],
            createdAt: new Date().toISOString()
        };

        this.doctors.set(doctorId, doctor);

        this.logger.info(`New doctor added`, { 
            nodeId: this.nodeId,
            doctorId,
            doctorName: doctor.name
        });

        this.emit('doctor_added', {
            doctorId,
            doctor,
            timestamp: Date.now(),
            nodeId: this.nodeId
        });

        return { success: true, doctor };
    }

    getStatistics() {
        const stats = {
            totalPatients: this.patients.size,
            totalDoctors: this.doctors.size,
            patientsByGender: {},
            patientsByAgeGroup: {
                '0-18': 0,
                '19-35': 0,
                '36-50': 0,
                '51-65': 0,
                '65+': 0
            },
            patientsByDoctor: {},
            commonDiseases: {},
            lastUpdated: new Date().toISOString()
        };

        // Calculate statistics
        this.patients.forEach(patient => {
            // Gender distribution
            stats.patientsByGender[patient.gender] = (stats.patientsByGender[patient.gender] || 0) + 1;

            // Age group distribution
            if (patient.age <= 18) stats.patientsByAgeGroup['0-18']++;
            else if (patient.age <= 35) stats.patientsByAgeGroup['19-35']++;
            else if (patient.age <= 50) stats.patientsByAgeGroup['36-50']++;
            else if (patient.age <= 65) stats.patientsByAgeGroup['51-65']++;
            else stats.patientsByAgeGroup['65+']++;

            // Patients by doctor
            const doctorName = patient.doctorName || 'Unknown';
            stats.patientsByDoctor[doctorName] = (stats.patientsByDoctor[doctorName] || 0) + 1;

            // Common diseases
            stats.commonDiseases[patient.disease] = (stats.commonDiseases[patient.disease] || 0) + 1;
        });

        return stats;
    }

    getStatus() {
        return {
            nodeId: this.nodeId,
            totalPatients: this.patients.size,
            totalDoctors: this.doctors.size,
            lastUpdate: new Date().toISOString(),
            statistics: this.getStatistics()
        };
    }

    // Search functionality
    searchPatients(query) {
        const results = [];
        const searchTerm = query.toLowerCase();

        this.patients.forEach(patient => {
            if (
                patient.name.toLowerCase().includes(searchTerm) ||
                patient.disease.toLowerCase().includes(searchTerm) ||
                patient.medicines.toLowerCase().includes(searchTerm) ||
                patient.allergies.toLowerCase().includes(searchTerm)
            ) {
                results.push(patient);
            }
        });

        return results;
    }

    // Backup and restore functionality
    createBackup() {
        const backup = {
            timestamp: new Date().toISOString(),
            nodeId: this.nodeId,
            patients: Object.fromEntries(this.patients),
            doctors: Object.fromEntries(this.doctors)
        };

        this.logger.info(`Database backup created`, { 
            nodeId: this.nodeId,
            patientCount: this.patients.size,
            doctorCount: this.doctors.size
        });

        return backup;
    }

    restoreFromBackup(backup) {
        if (backup.patients) {
            this.patients = new Map(Object.entries(backup.patients));
        }
        if (backup.doctors) {
            this.doctors = new Map(Object.entries(backup.doctors));
        }

        this.logger.info(`Database restored from backup`, { 
            nodeId: this.nodeId,
            backupTimestamp: backup.timestamp,
            patientCount: this.patients.size,
            doctorCount: this.doctors.size
        });
    }
}

module.exports = Database;
