let mediaRecorder;
let chunks = [];
let screenStream;
let cameraStream;

document.getElementById('start').addEventListener('click', async () => {
  const mode = document.querySelector('input[name="recordMode"]:checked').value;

  // Capture Screen
  screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: { mediaSource: 'screen' }
  });

  // Optionally capture webcam
  if (mode === 'screen-camera' || mode === 'camera') {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
  }

  let finalStream;
  if (mode === 'screen-camera') {
    const combinedStream = new MediaStream([...screenStream.getTracks(), ...cameraStream.getTracks()]);
    finalStream = combinedStream;
  } else if (mode === 'camera') {
    finalStream = cameraStream;
  } else {
    finalStream = screenStream;
  }

  // Show live preview
  const preview = document.getElementById('preview');
  preview.srcObject = finalStream;

  mediaRecorder = new MediaRecorder(finalStream, {
    mimeType: 'video/webm; codecs=vp9'
  });

  mediaRecorder.ondataavailable = (event) => {
    chunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'recording.webm';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
  };

  mediaRecorder.start();
});

document.getElementById('stop').addEventListener('click', () => {
  mediaRecorder.stop();
  screenStream.getTracks().forEach(track => track.stop());
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
});
