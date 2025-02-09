
import { ipcRenderer } from 'electron';

export async function pasteText(text) {
  try {
    await ipcRenderer.invoke('type-text', text);
  } catch (error) {
    console.error('Error simulating auto paste:', error);
  }
}
