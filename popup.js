let mediaRecorder;
let chunks = [];
let screenStream;
let cameraStream;
let micStream;
let finalStream;

document.getElementById('start').addEventListener('click', async () => {
  const mode = document.querySelector('input[name="recordMode"]:checked').value;
  const audioInput = document.getElementById('audioInput').value;
  const resolution = document.getElementById('resolution').value;

  // Disable Start button, enable Stop button
  document.getElementById('start').disabled = true;
  document.getElementById('stop').disabled = false;

  try {
    // Capture Screen Stream with or without system audio
    if (mode !== 'camera') {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: resolution === '1080p' ? 1920 : 1280,
          height: resolution === '1080p' ? 1080 : 720
        },
        audio: audioInput !== 'microphone' // Enable system audio if selected
      });
    }

    // Capture Microphone stream if required
    if (audioInput === 'microphone' || audioInput === 'both') {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
    }

    // Capture Camera Stream if required
    if (mode === 'screen-camera' || mode === 'camera') {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false // We manage audio separately
      });
    }

    let combinedStream;
    if (mode === 'screen-camera') {
      // Combine screen stream and camera stream
      const videoElement = document.createElement('video');
      videoElement.srcObject = cameraStream;
      videoElement.style.position = 'absolute';
      videoElement.style.width = '150px';
      videoElement.style.height = '150px';
      videoElement.style.borderRadius = '50%';
      videoElement.style.bottom = '10px';
      videoElement.style.right = '10px';
      videoElement.style.zIndex = '1000';

      document.body.appendChild(videoElement);
      videoElement.play();

      // Overlay camera stream on screen stream
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screenStream;
      screenVideo.play();

      // Set up canvas size according to screen resolution
      canvas.width = resolution === '1080p' ? 1920 : 1280;
      canvas.height = resolution === '1080p' ? 1080 : 720;

      // Draw screen recording and camera view in a loop
      const drawFrame = () => {
        context.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        context.drawImage(videoElement, canvas.width - 160, canvas.height - 160, 150, 150);
        requestAnimationFrame(drawFrame);
      };
      drawFrame();

      combinedStream = canvas.captureStream();
      finalStream = new MediaStream([...combinedStream.getTracks(), ...(micStream ? micStream.getTracks() : [])]);
    } else if (mode === 'camera') {
      // Only camera stream
      finalStream = cameraStream;
    } else {
      // Only screen stream
      finalStream = new MediaStream([...screenStream.getTracks(), ...(micStream ? micStream.getTracks() : [])]);
    }

    // Preview the stream
    const preview = document.getElementById('preview');
    preview.srcObject = finalStream;
    preview.style.display = 'block';

    // Initialize MediaRecorder
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
      a.download = 'screenstream_recording.webm';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
    };

    mediaRecorder.start();
  } catch (err) {
    console.error("Error starting recording: ", err);
  }
});

document.getElementById('stop').addEventListener('click', () => {
  mediaRecorder.stop();
  
  // Stop all tracks
  if (screenStream) screenStream.getTracks().forEach(track => track.stop());
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
  if (micStream) micStream.getTracks().forEach(track => track.stop());

  // Enable Start button, disable Stop button
  document.getElementById('start').disabled = false;
  document.getElementById('stop').disabled = true;

  // Hide preview
  document.getElementById('preview').style.display = 'none';
});
