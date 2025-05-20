// This file connects the webpack bundle functions to the global window object
import { startRecording, stopRecording, resetRecordingData, preserveCurrentContent } from './modules/recording.js';
import { appState } from './stores/appState.js';

// Make sure window.recording exists
if (!window.recording) {
    window.recording = {};
}

// Connect the actual recording functions to the global window object
window.recording.startRecording = startRecording;
window.recording.stopRecording = stopRecording;
window.recording.resetRecordingData = resetRecordingData;
window.recording.preserveCurrentContent = preserveCurrentContent;

// Connect the app state
window.appState = appState;

console.log('Bridge connector initialized - recording functions connected to global window object');