import { sendFile } from './sendToBackend.js';

// Call the function
sendFile()
  .then(result => console.log('Function completed successfully:', result))
  .catch(error => console.error('Function failed:', error));