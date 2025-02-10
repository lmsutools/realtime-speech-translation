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
		inputSelect.innerHTML = '';
        audioInputDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Microphone ${inputSelect.length + 1}`;
            inputSelect.appendChild(option);
        });
        stream.getTracks().forEach(track => track.stop());

    } catch (error) {
        console.error('Error populating input devices:', error);
    }
}

//This is not used anymore by recording, but kept if needed.
export async function getCorrectInputDevice() {
    try {
        const inputSelect = document.getElementById('inputDevice');

         //Check for saved
        const defaultInputDevice = localStorage.getItem('defaultInputDevice')
        const deviceId =  defaultInputDevice? defaultInputDevice : inputSelect.value;

        console.log('Using input device:', deviceId);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId } });
        return stream;
    } catch (error) {
        console.error('Error selecting input device:', error);
    }
}
