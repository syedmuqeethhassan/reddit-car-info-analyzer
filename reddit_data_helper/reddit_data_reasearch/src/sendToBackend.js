import fs from 'fs';
import path from 'path';
import http from 'http';
import FormData from 'form-data';

/**
 * Sends the result.json file to Python backend for processing, 
 * waits for the summary response, and returns it
 * 
 * @returns {Promise} - Promise that resolves with the summary data
 */
export async function sendFile() {
    try {
        // Path to the file
        const filePath = path.join('../output', 'result.json');
        
        console.log('Sending file to Python backend for processing...');
        
        // Create a form with the file
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        
        // Get form headers
        const formHeaders = form.getHeaders();
        
        // Send the file to Python backend
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/initialize',
            method: 'POST',
            headers: formHeaders
        };
        
        // Return a promise that will resolve when Python responds
        return new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let responseData = '';
                
                // Collect data chunks
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                // When all data is received
                res.on('end', () => {
                    try {
                        const data = JSON.parse(responseData);
                        
                        if (data.success) {
                            console.log('✅ Received summary from Python backend');
                            // Make the summary data available globally
                            global.summaryData = data;
                            resolve(data);
                        } else {
                            console.error('❌ Error receiving summary from Python:', data.error);
                            reject(new Error(data.error));
                        }
                    } catch (error) {
                        console.error('❌ Error parsing Python response:', error.message);
                        reject(error);
                    }
                });
            });
            
            // Handle request errors
            req.on('error', (error) => {
                console.error('❌ Error sending file to Python backend:', error.message);
                reject(error);
            });
            
            // Pipe the form data to the request
            form.pipe(req);
        });
    } catch (error) {
        console.error('❌ Error in sendFile function:', error.message);
        throw error;
    }
}

