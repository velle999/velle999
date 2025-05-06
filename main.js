// ===== VELLEVERSE BACKGROUND ANIMATION + AUDIO VISUALIZER + MUTE =====

document.addEventListener('DOMContentLoaded', () => {
  const bgMusic = document.getElementById('bg-music');
  const hoverSound = document.getElementById('hover-sound');
  const muteBtn = document.getElementById('mute-toggle');

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioCtx.createAnalyser();
  const source = audioCtx.createMediaElementSource(bgMusic);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  analyser.fftSize = 128;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  // Unlock music + context on user click
  let unlocked = false;
  window.addEventListener('click', () => {
    if (!unlocked) {
      bgMusic.play().catch(err => console.warn('Music play failed:', err));
      audioCtx.resume().catch(err => console.warn('Audio context resume failed:', err));
      unlocked = true;
    }
  }, { once: true });

  // Mute toggle logic
  muteBtn.addEventListener('click', () => {
    bgMusic.muted = !bgMusic.muted;
    muteBtn.textContent = bgMusic.muted ? '🔇' : '🔊';
  });

  // Hover sound
  if (hoverSound) {
    document.querySelectorAll('.orbital-links a').forEach(link => {
      link.addEventListener('mouseenter', () => {
        hoverSound.currentTime = 0;
        hoverSound.play().catch(e => {
          console.warn('Hover sound error:', e);
        });
      });
    });
  }

  // RGB Visualizer Setup
  const visualizerCanvas = document.getElementById('audio-visualizer');
  const vctx = visualizerCanvas.getContext('2d');
  function resizeVisualizer() {
    visualizerCanvas.width = window.innerWidth;
    visualizerCanvas.height = window.innerHeight;
  }
  resizeVisualizer();
  window.addEventListener('resize', resizeVisualizer);

  function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    analyser.getByteFrequencyData(dataArray);
    vctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

    const barWidth = (visualizerCanvas.width / bufferLength) * 2.5;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i];
const r = Math.floor(128 + 127 * Math.sin(i * 0.3));
const g = Math.floor(128 + 127 * Math.sin(i * 0.3 + 2));
const b = Math.floor(128 + 127 * Math.sin(i * 0.3 + 4));
vctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      vctx.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }

  bgMusic.addEventListener('play', drawVisualizer);

  // Starfield Background
  const canvas = document.getElementById('warp-bg');
  const ctx = canvas.getContext('2d');
  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;
  let stars = [];
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random() * w
    });
  }

  function animateStarfield() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0ff";

    for (let star of stars) {
      star.z -= 2;
      if (star.z <= 0) star.z = w;
      const k = 128.0 / star.z;
      const x = (star.x - w / 2) * k + w / 2;
      const y = (star.y - h / 2) * k + h / 2;
      const size = (1 - star.z / w) * 3;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(animateStarfield);
  }

  animateStarfield();
  window.addEventListener('resize', () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    resizeVisualizer();
  });
});
