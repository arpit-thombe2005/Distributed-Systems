// Test script for the Distributed EHR System
const http = require('http');

class SystemTester {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
    }

    async makeRequest(path, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => {
                    try {
                        const result = JSON.parse(body);
                        resolve({ status: res.statusCode, data: result });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: body });
                    }
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async testSystemStatus() {
        console.log('🔍 Testing System Status...');
        try {
            const result = await this.makeRequest('/api/status');
            console.log('✅ System Status:', {
                nodeId: result.data.nodeId,
                isCoordinator: result.data.isCoordinator,
                totalPatients: result.data.database?.totalPatients,
                totalDoctors: result.data.database?.totalDoctors
            });
            return true;
        } catch (error) {
            console.log('❌ System Status Test Failed:', error.message);
            return false;
        }
    }

    async testGetPatients() {
        console.log('🔍 Testing Get Patients...');
        try {
            const result = await this.makeRequest('/api/patients');
            console.log('✅ Patients Retrieved:', result.data.length, 'patients found');
            if (result.data.length > 0) {
                console.log('   Sample Patient:', {
                    id: result.data[0].id,
                    name: result.data[0].name,
                    disease: result.data[0].disease
                });
            }
            return true;
        } catch (error) {
            console.log('❌ Get Patients Test Failed:', error.message);
            return false;
        }
    }

    async testUpdatePatient() {
        console.log('🔍 Testing Patient Update...');
        try {
            const updateData = {
                notes: 'Test update from system tester',
                vitalSigns: {
                    bloodPressure: '120/80',
                    heartRate: 75
                }
            };

            const result = await this.makeRequest('/api/patients/1', 'POST', updateData);
            if (result.status === 200 && result.data.success) {
                console.log('✅ Patient Update Successful');
                return true;
            } else {
                console.log('❌ Patient Update Failed:', result.data.message);
                return false;
            }
        } catch (error) {
            console.log('❌ Patient Update Test Failed:', error.message);
            return false;
        }
    }

    async testDoctorUpdate() {
        console.log('🔍 Testing Doctor Update...');
        try {
            const updateData = {
                disease: 'Updated condition',
                medicines: 'Updated medication',
                notes: 'Doctor update test'
            };

            const result = await this.makeRequest('/api/doctor/1/patients/1', 'POST', updateData);
            if (result.status === 200 && result.data.success) {
                console.log('✅ Doctor Update Successful');
                return true;
            } else {
                console.log('❌ Doctor Update Failed:', result.data.message);
                return false;
            }
        } catch (error) {
            console.log('❌ Doctor Update Test Failed:', error.message);
            return false;
        }
    }

    async testElection() {
        console.log('🔍 Testing Election Algorithm...');
        try {
            const result = await this.makeRequest('/api/election', 'POST');
            if (result.status === 200 && result.data.success) {
                console.log('✅ Election Triggered Successfully');
                return true;
            } else {
                console.log('❌ Election Test Failed:', result.data.message);
                return false;
            }
        } catch (error) {
            console.log('❌ Election Test Failed:', error.message);
            return false;
        }
    }

    async testTimeSync() {
        console.log('🔍 Testing Time Synchronization...');
        try {
            const result = await this.makeRequest('/api/sync-time', 'POST');
            if (result.status === 200 && result.data.success) {
                console.log('✅ Time Sync Triggered Successfully');
                return true;
            } else {
                console.log('❌ Time Sync Test Failed:', result.data.message);
                return false;
            }
        } catch (error) {
            console.log('❌ Time Sync Test Failed:', error.message);
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 Starting Distributed EHR System Tests...\n');
        
        const tests = [
            { name: 'System Status', fn: () => this.testSystemStatus() },
            { name: 'Get Patients', fn: () => this.testGetPatients() },
            { name: 'Patient Update', fn: () => this.testUpdatePatient() },
            { name: 'Doctor Update', fn: () => this.testDoctorUpdate() },
            { name: 'Election Algorithm', fn: () => this.testElection() },
            { name: 'Time Synchronization', fn: () => this.testTimeSync() }
        ];

        let passed = 0;
        let total = tests.length;

        for (const test of tests) {
            try {
                const result = await test.fn();
                if (result) passed++;
            } catch (error) {
                console.log(`❌ ${test.name} Test Error:`, error.message);
            }
            console.log(''); // Add spacing
        }

        console.log('📊 Test Results:');
        console.log(`   Passed: ${passed}/${total}`);
        console.log(`   Success Rate: ${Math.round((passed / total) * 100)}%`);

        if (passed === total) {
            console.log('🎉 All tests passed! The system is working correctly.');
        } else {
            console.log('⚠️  Some tests failed. Check the server logs for details.');
        }

        return passed === total;
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const tester = new SystemTester();
    tester.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = SystemTester;
