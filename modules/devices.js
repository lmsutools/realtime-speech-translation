export async function populateInputDevices(selectElementId) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
        const inputSelect = document.getElementById(selectElementId);
        if (!inputSelect) {
            console.error(`Select element with ID '${selectElementId}' not found.`);
            return;
        }
        inputSelect.innerHTML = ''; // Clear options

        const savedDeviceId = localStorage.getItem('defaultInputDevice'); // Get saved ID here

        audioInputDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Microphone ${inputSelect.length + 1}`;

            // --- Set 'selected' attribute during population ---
            if (savedDeviceId && device.deviceId === savedDeviceId) {
                option.selected = true; // Select the matching device
                console.log(`Device ${device.label} marked as selected because it matches saved ID: ${savedDeviceId}`);
            }

            inputSelect.appendChild(option);
        });
        stream.getTracks().forEach(track => track.stop());

    } catch (error) {
        console.error('Error populating input devices:', error);
    }
}
