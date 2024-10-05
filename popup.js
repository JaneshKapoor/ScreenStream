let mediaRecorder;
let chunks = [];
let screenStream;
let cameraStream;
let micStream;
let finalStream;

// Disable input fields
const disableInputs = (state) => {
  document.getElementById('audioInput').disabled = state;
  document.getElementById('resolution').disabled = state;
  document.querySelectorAll('input[name="recordMode"]').forEach(input => input.disabled = state);
};

document.getElementById('start').addEventListener('click', async () => {
  const mode = document.querySelector('input[name="recordMode"]:checked').value;
  const audioInput = document.getElementById('audioInput').value;
  const resolution = document.getElementById('resolution').value;

  // Clear previous recording chunks
  chunks = [];

  // Disable Start button, enable Stop button, disable inputs
  document.getElementById('start').disabled = true;
  document.getElementById('stop').disabled = false;
  disableInputs(true);  // Disable inputs during recording

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

    // Capture Camera Stream with higher resolution (1280x720 or more)
    if (mode === 'screen-camera' || mode === 'camera') {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 720, height: 720},  // Increase resolution for the camera
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
      videoElement.play();

      canvas.width = resolution === '1080p' ? 1920 : 1280;
      canvas.height = resolution === '1080p' ? 1080 : 720;

      const drawFrame = () => {
        context.clearRect(0, 0, canvas.width, canvas.height); // Clear previous frame

        // Draw the screen video
        context.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

        // Create a circular path for the camera feed
        const cameraSize = 320; // Diameter of the camera view
        const padding = 60; // Extra padding from the bottom and right sides
        const cameraX = canvas.width - (cameraSize + padding); // Bottom-right position with more padding
        const cameraY = canvas.height - (cameraSize + padding);

        context.save();
        context.beginPath();
        context.arc(cameraX + cameraSize / 2, cameraY + cameraSize / 2, cameraSize / 2, 0, Math.PI * 2);
        context.clip();

        // Draw the camera video within the circular path
        context.drawImage(videoElement, cameraX, cameraY, cameraSize, cameraSize);

        // Restore the canvas and draw the border
        context.restore();
        context.beginPath();
        context.arc(cameraX + cameraSize / 2, cameraY + cameraSize / 2, cameraSize / 2 + 5, 0, Math.PI * 2);
        context.lineWidth = 5; // Thickness of the border
        context.strokeStyle = 'purple'; // Border color
        context.stroke();

        requestAnimationFrame(drawFrame); // Repeat this for every frame
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

      // Re-enable inputs and start button when recording stops
      document.getElementById('start').disabled = false;
      document.getElementById('stop').disabled = true;
      disableInputs(false);  // Re-enable inputs after recording
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

  // Hide preview
  document.getElementById('preview').style.display = 'none';
});
