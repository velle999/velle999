document.addEventListener('DOMContentLoaded', () => {
  // ===== Audio Setup =====
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

  let unlocked = false;
  window.addEventListener('click', () => {
    if (!unlocked) {
      bgMusic.play().catch(err => console.warn('Music play failed:', err));
      audioCtx.resume().catch(err => console.warn('Audio context resume failed:', err));
      unlocked = true;
    }
  }, { once: true });

  muteBtn.addEventListener('click', () => {
    bgMusic.muted = !bgMusic.muted;
    muteBtn.textContent = bgMusic.muted ? '🔇' : '🔊';
  });

  if (hoverSound) {
    document.querySelectorAll('.orbital-links a').forEach(link => {
      link.addEventListener('mouseenter', () => {
        hoverSound.currentTime = 0;
        hoverSound.play().catch(e => console.warn('Hover sound error:', e));
      });
    });
  }

  // ===== RGB Visualizer =====
  const visualizerCanvas = document.getElementById('audio-visualizer');
  const vctx = visualizerCanvas.getContext('2d');

  function resizeVisualizer() {
    visualizerCanvas.width = window.innerWidth;
    visualizerCanvas.height = window.innerHeight;
  }

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

  resizeVisualizer();
  bgMusic.addEventListener('play', drawVisualizer);

  // ===== Starfield Background =====
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

  // ===== RGB Floating Orbs =====
  const orbCanvas = document.getElementById('orb-canvas');
  const octx = orbCanvas.getContext('2d');
  orbCanvas.width = window.innerWidth;
  orbCanvas.height = window.innerHeight;

  const orbs = [];
  const orbCount = 25;

  for (let i = 0; i < orbCount; i++) {
    orbs.push({
      x: Math.random() * orbCanvas.width,
      y: Math.random() * orbCanvas.height,
      radius: 30 + Math.random() * 50,
      dx: (Math.random() - 0.5) * 0.5,
      dy: (Math.random() - 0.5) * 0.5,
      hue: Math.random() * 360
    });
  }

  function animateOrbs() {
    octx.clearRect(0, 0, orbCanvas.width, orbCanvas.height);
    for (let orb of orbs) {
      orb.x += orb.dx;
      orb.y += orb.dy;
      orb.hue += 0.5;

      if (orb.x < -orb.radius) orb.x = orbCanvas.width + orb.radius;
      if (orb.x > orbCanvas.width + orb.radius) orb.x = -orb.radius;
      if (orb.y < -orb.radius) orb.y = orbCanvas.height + orb.radius;
      if (orb.y > orbCanvas.height + orb.radius) orb.y = -orb.radius;

      octx.beginPath();
      octx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      octx.fillStyle = `hsla(${orb.hue}, 100%, 60%, 0.15)`;
      octx.shadowColor = `hsla(${orb.hue}, 100%, 60%, 0.5)`;
      octx.shadowBlur = 25;
      octx.fill();
    }
    requestAnimationFrame(animateOrbs);
  }

  animateOrbs();

  // ===== GLSL Fractal Shader =====
  const shaderCanvas = document.getElementById('shader-canvas');
  const gl = shaderCanvas.getContext('webgl');
  shaderCanvas.width = window.innerWidth;
  shaderCanvas.height = window.innerHeight;
  gl.viewport(0, 0, shaderCanvas.width, shaderCanvas.height);

  const vertex = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragment = `
    precision highp float;
    uniform float time;
    uniform vec2 resolution;

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec2 p = uv - 0.5;
      p.x *= resolution.x / resolution.y;

      float color = 0.0;
      float t = time * 0.1;

      for (float i = 1.0; i < 5.0; i++) {
        p = vec2(
          cos(t - p.x) + sin(p.y),
          sin(t + p.y) + cos(p.x)
        );
        color += 1.0 / length(p);
      }

      color = smoothstep(0.0, 1.0, color);
      gl_FragColor = vec4(vec3(color, color * 0.3, sin(time * 0.1)), 1.0);
    }
  `;

  function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  const program = gl.createProgram();
  gl.attachShader(program, compileShader(vertex, gl.VERTEX_SHADER));
  gl.attachShader(program, compileShader(fragment, gl.FRAGMENT_SHADER));
  gl.linkProgram(program);
  gl.useProgram(program);

  const position = gl.getAttribLocation(program, "position");
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const timeUniform = gl.getUniformLocation(program, "time");
  const resolutionUniform = gl.getUniformLocation(program, "resolution");

  function renderShader(t) {
    gl.viewport(0, 0, shaderCanvas.width, shaderCanvas.height);
    gl.uniform1f(timeUniform, t * 0.001);
    gl.uniform2f(resolutionUniform, shaderCanvas.width, shaderCanvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(renderShader);
  }

  renderShader(0);

  // ===== Responsive Resizing =====
  window.addEventListener('resize', () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;

    orbCanvas.width = window.innerWidth;
    orbCanvas.height = window.innerHeight;

    visualizerCanvas.width = window.innerWidth;
    visualizerCanvas.height = window.innerHeight;

    shaderCanvas.width = window.innerWidth;
    shaderCanvas.height = window.innerHeight;
    gl.viewport(0, 0, shaderCanvas.width, shaderCanvas.height);
  });
});
