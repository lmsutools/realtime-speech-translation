import { ipcRenderer } from 'electron';

export async function pasteText(text) {
    try {
        await ipcRenderer.invoke('paste-text', text);
    } catch (error) {
        console.error('Error simulating auto paste:', error);
    }
}
