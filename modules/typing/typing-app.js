const { ipcRenderer } = require('electron');

const stateMachine = {
    states: {
        Idle: { width: 90, height: 90, textVisible: false },
        Active: { width: 400, height: 200, textVisible: true }
    },
    currentState: 'Idle',
    transitionTo(newState) {
        console.log(`[TypingApp] Transitioning to ${newState}`);
        const config = this.states[newState];
        this.currentState = newState;
        const container = document.querySelector('.container');
        container.classList.toggle('idle', newState === 'Idle');
        container.classList.toggle('active', newState === 'Active');

        const controls = document.querySelector('.controls');
        const textContainer = document.querySelector('.text-container');
        if (newState === 'Idle') {
            if (controls && controls.parentNode) controls.parentNode.removeChild(controls);
            if (textContainer && textContainer.parentNode) textContainer.parentNode.removeChild(textContainer);
            const micContainer = document.querySelector('.mic-container');
            if (micContainer) {
                micContainer.style.cursor = 'pointer';
                micContainer.removeEventListener('click', handleMicClick);
                micContainer.addEventListener('click', handleMicClick, { once: false });
                console.log('[TypingApp] Mic click listener reattached in Idle state');
            }
        } else if (newState === 'Active') {
            if (!document.querySelector('.controls')) {
                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'controls';
                controlsDiv.innerHTML = `
                    <div class="left-controls">
                        <img id="recordingIndicator" src="../../assets/icons/mic-off.png" alt="Recording Indicator">
                        <img id="typingToggleIcon" src="../../assets/icons/typing-inactive.png" alt="Typing Toggle">
                    </div>
                    <img id="closeButton" src="../../assets/icons/close.png" alt="Close">
                `;
                container.insertBefore(controlsDiv, container.lastChild);
                const textDiv = document.createElement('div');
                textDiv.className = 'text-container';
                textDiv.id = 'typingAppTextContainer';
                textDiv.innerHTML = '<div id="typingAppText"></div>';
                container.appendChild(textDiv);
                document.getElementById('recordingIndicator').addEventListener('click', handleRecordingClick);
                document.getElementById('typingToggleIcon').addEventListener('click', handleTypingToggle);
                document.getElementById('closeButton').addEventListener('click', handleClose);
            }
        }
        // Fetch custom sizes for Active state
        if (newState === 'Active') {
            Promise.all([
                ipcRenderer.invoke('store-get', 'typingAppActiveWidth', 400),
                ipcRenderer.invoke('store-get', 'typingAppActiveHeight', 200)
            ]).then(([width, height]) => {
                ipcRenderer.send('typing-app-resize', { width, height });
                console.log(`[TypingApp] Resize sent: ${width}x${height}`);
            });
        } else {
            ipcRenderer.send('typing-app-resize', { width: config.width, height: config.height });
            console.log(`[TypingApp] Resize sent: ${config.width}x${config.height}`);
        }
    }
};

let typingActive = false;
const ACTIVE_ICON_PATH = '../../assets/icons/typing-active.png';
const INACTIVE_ICON_PATH = '../../assets/icons/typing-inactive.png';
const MIC_ON_PATH = '../../assets/icons/mic-on.png';
const MIC_OFF_PATH = '../../assets/icons/mic-off.png';

function updateRecordingIndicator(isRecording) {
    const micContainer = document.querySelector('.mic-container');
    if (micContainer) {
        micContainer.style.backgroundImage = `url(${isRecording ? MIC_ON_PATH : MIC_OFF_PATH})`;
    }
    if (stateMachine.currentState === 'Active') {
        document.getElementById('recordingIndicator').src = isRecording ? MIC_ON_PATH : MIC_OFF_PATH;
    }
}

function updateTypingIcon() {
    const toggleIcon = document.getElementById('typingToggleIcon');
    if (toggleIcon) {
        toggleIcon.src = typingActive ? ACTIVE_ICON_PATH : INACTIVE_ICON_PATH;
    }
}

function handleMicClick(e) {
    e.stopPropagation();
    console.log('[TypingApp] Mic clicked, sending global-toggle-recording');
    ipcRenderer.send('global-toggle-recording');
}

function handleRecordingClick(e) {
    e.stopPropagation();
    ipcRenderer.send('global-toggle-recording');
}

function handleTypingToggle(e) {
    e.stopPropagation();
    typingActive = !typingActive;
    updateTypingIcon();
    ipcRenderer.send('typing-app-typing-mode-changed', typingActive);
}

function handleClose(e) {
    e.stopPropagation();
    window.close();
}

ipcRenderer.on('typing-app-update-text', (event, fullText) => {
    const typingAppText = document.getElementById('typingAppText');
    if (typingAppText) {
        typingAppText.textContent = fullText || '(Waiting for transcript...)';
        const textContainer = document.getElementById('typingAppTextContainer');
        if (textContainer) {
            textContainer.scrollTop = textContainer.scrollHeight;
        }
    }
});

ipcRenderer.on('typing-app-recording-state', (event, isRecording) => {
    console.log(`[TypingApp] Received recording state: ${isRecording}`);
    updateRecordingIndicator(isRecording);
    stateMachine.transitionTo(isRecording ? 'Active' : 'Idle');
});

document.querySelector('.container').addEventListener('click', (e) => {
    if (stateMachine.currentState === 'Idle') {
        console.log('[TypingApp] Container clicked in Idle state (fallback)');
        ipcRenderer.send('global-toggle-recording');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('[TypingApp] DOMContentLoaded, initializing');
    updateTypingIcon();
    updateRecordingIndicator(false);
    const micContainer = document.querySelector('.mic-container');
    if (micContainer) {
        micContainer.addEventListener('click', handleMicClick, { once: false });
        console.log('[TypingApp] Initial mic click listener attached');
    }
    stateMachine.transitionTo('Idle');
});
