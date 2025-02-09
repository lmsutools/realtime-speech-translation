
import dotenv from 'dotenv';
dotenv.config();

import { initializeUI } from './modules/ui.js';
import { startRecording, stopRecording } from './modules/recording.js';

// Initialize UI when DOM is ready
initializeUI();

// Attach event listeners for recording controls
document.getElementById('start').addEventListener('click', startRecording);
document.getElementById('stop').addEventListener('click', stopRecording);
