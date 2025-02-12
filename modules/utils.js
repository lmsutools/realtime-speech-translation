import { ipcRenderer } from 'electron';

export async function pasteText(text) {
    try {
        const result = await ipcRenderer.invoke('paste-text', text); // Await the result
        if (!result) { // Check for failure from main process
            throw new Error("Paste operation failed in main process.");
        }
    } catch (error) {
        console.error('Error simulating auto paste:', error);
    }
}
