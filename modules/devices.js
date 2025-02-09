
export async function populateInputDevices() {
  try {
    // Request a temporary audio stream so device labels become available.
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
    const inputSelect = document.getElementById('inputDevice');
    inputSelect.innerHTML = '';
    audioInputDevices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Microphone ${inputSelect.length + 1}`;
      inputSelect.appendChild(option);
    });
    // Stop the temporary stream.
    stream.getTracks().forEach(track => track.stop());
  } catch (error) {
    console.error('Error populating input devices:', error);
  }
}

export async function getCorrectInputDevice() {
  try {
    const inputSelect = document.getElementById('inputDevice');
    const selectedDeviceId = inputSelect.value;
    console.log('Using input device:', selectedDeviceId);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedDeviceId } });
    return stream;
  } catch (error) {
    console.error('Error selecting input device:', error);
  }
}
