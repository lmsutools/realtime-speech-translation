const electronAPI = window.electronAPI;

export async function pasteText(text) {
    try {
        const result = await electronAPI.invoke('paste-text', text);
        if (!result.success) {
            throw new Error(result.error || "Paste operation failed in main process.");
        }
    } catch (error) {
        console.error('Error simulating auto paste:', error);
    }
}
