const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object.
contextBridge.exposeInMainWorld('electronAPI', {
    // IPC Renderer
    send: (channel, data) => {
        // Whitelist channels
        const validChannels = [
            'open-settings',
            'open-typing-app',
            'translation-setting-changed',
            'model-setting-changed',
            'typing-app-transcript-updated',
            'typing-app-recording-state-changed',
            'typing-app-typing-mode-changed',
            'global-toggle-recording',
            'typing-app-resize',
            'update-global-shortcut',
            'reset-typing-app',
            'recording-state-update',
            'setting-changed'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    
    invoke: (channel, ...args) => {
        // Whitelist channels
        const validChannels = [
            'store-get',
            'store-set',
            'store-delete',
            'store-info',
            'paste-text',
            'test-translation'
        ];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
    },
    
    on: (channel, func) => {
        // Whitelist channels
        const validChannels = [
            'global-toggle-recording',
            'typing-app-typing-mode-changed',
            'update-app-state',
            'update-translation-ui',
            'update-source-languages',
            'typing-app-window-closed',
            'typing-app-recording-state',
            'typing-app-update-text',
            'recording-state-update-from-typing-app',
            'recording-state-update'
        ];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            const subscription = (event, ...args) => func(...args);
            ipcRenderer.on(channel, subscription);
            
            // Return a cleanup function
            return () => ipcRenderer.removeListener(channel, subscription);
        }
    },
    
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    },
    
    // Platform info
    getPlatform: () => process.platform,
    
    // App version (if needed)
    getAppVersion: () => {
        try {
            const { app } = require('electron');
            return app.getVersion();
        } catch {
            return '1.0.0';
        }
    }
});

console.log('[Preload] electronAPI exposed to renderer.');
