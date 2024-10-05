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

  // Clear previous recording chunks
  chunks = [];

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
        audio: audioInput === 'system-audio' || audioInput === 'both' // Enable system audio if selected
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

    // Combine streams based on mode
    let combinedStreamTracks = [];
    if (mode === 'screen-camera') {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screenStream;
      screenVideo.play();

      const videoElement = document.createElement('video');
      videoElement.srcObject = cameraStream;
      videoElement.style.position = 'absolute';
      videoElement.style.width = '200px';
      videoElement.style.height = '200px';
      videoElement.style.borderRadius = '50%';
      videoElement.style.bottom = '10px';
      videoElement.style.right = '10px';
      videoElement.style.border = '5px solid purple';
      videoElement.style.zIndex = '1000';
      document.body.appendChild(videoElement);
      videoElement.play();

      canvas.width = resolution === '1080p' ? 1920 : 1280;
      canvas.height = resolution === '1080p' ? 1080 : 720;

      const drawFrame = () => {
        context.clearRect(0, 0, canvas.width, canvas.height); // Clear previous frame
        context.drawImage(screenVideo, 0, 0, canvas.width, canvas.height); // Draw screen
        context.drawImage(videoElement, canvas.width - 210, canvas.height - 210, 200, 200); // Draw camera feed
        requestAnimationFrame(drawFrame);
      };
      drawFrame();

      const canvasStream = canvas.captureStream();
      combinedStreamTracks = [...canvasStream.getTracks()];
    } else if (mode === 'camera') {
      combinedStreamTracks = [...cameraStream.getTracks()];
    } else {
      combinedStreamTracks = [...screenStream.getTracks()];
    }

    // Add microphone audio tracks if they exist
    if (micStream) {
      combinedStreamTracks = [...combinedStreamTracks, ...micStream.getAudioTracks()];
    }

    // Create the final combined stream
    finalStream = new MediaStream(combinedStreamTracks);

    // Preview the stream
    const preview = document.getElementById('preview');
    preview.srcObject = finalStream;
    preview.style.display = 'block';

    // Initialize MediaRecorder for WebM format
    const mimeType = 'video/webm; codecs=vp9';
    mediaRecorder = new MediaRecorder(finalStream, {
      mimeType
    });

    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
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
