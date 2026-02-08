document.addEventListener('DOMContentLoaded', () => {
  // ===== Audio Setup =====
  const bgMusic = document.getElementById('bg-music');
  const hoverSound = document.getElementById('hover-sound');
  const muteBtn = document.getElementById('mute-toggle');

  const playlist = [
    'assets/ambientspace.mp3',
    'assets/ambient.mp3'
  ];

  let currentTrack = Math.floor(Math.random() * playlist.length);

  function playCurrentTrack() {
    bgMusic.src = playlist[currentTrack];
    bgMusic.load();
    bgMusic.play().catch(err => console.warn('🎧 Music play failed:', err));
  }

  bgMusic.addEventListener('ended', () => {
    let nextTrack;
    do {
      nextTrack = Math.floor(Math.random() * playlist.length);
    } while (nextTrack === currentTrack && playlist.length > 1);
    currentTrack = nextTrack;
    playCurrentTrack();
  });

  // Audio Context Setup
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioCtx.createAnalyser();
  const source = audioCtx.createMediaElementSource(bgMusic);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  analyser.fftSize = 256;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  // User Interaction Unlock
  let unlocked = false;
  window.addEventListener('click', () => {
    if (!unlocked) {
      playCurrentTrack();
      audioCtx.resume().catch(err => console.warn('Audio context resume failed:', err));
      unlocked = true;
    }
  }, { once: true });

  // Mute Toggle
  muteBtn?.addEventListener('click', () => {
    bgMusic.muted = !bgMusic.muted;
    muteBtn.querySelector('.icon').textContent = bgMusic.muted ? '🔇' : '🔊';
  });

  // Hover Sound Effects
  if (hoverSound) {
    document.querySelectorAll('.orbital-links a').forEach(link => {
      link.addEventListener('mouseenter', () => {
        hoverSound.currentTime = 0;
        hoverSound.volume = 0.3;
        hoverSound.play().catch(e => console.warn('Hover sound error:', e));
      });
    });
  }

  // ===== Enhanced Audio Visualizer =====
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
    const centerY = visualizerCanvas.height;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * (visualizerCanvas.height * 0.4);
      
      // Create gradient for each bar
      const gradient = vctx.createLinearGradient(x, centerY, x, centerY - barHeight);
      
      const hue = (i / bufferLength) * 360;
      gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
      gradient.addColorStop(0.5, `hsla(${hue + 60}, 100%, 60%, 0.6)`);
      gradient.addColorStop(1, `hsla(${hue + 120}, 100%, 70%, 0.4)`);
      
      vctx.fillStyle = gradient;
      vctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight);
      
      // Add glow effect
      vctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.5)`;
      vctx.shadowBlur = 15;
      
      x += barWidth;
    }
    
    vctx.shadowBlur = 0;
  }

  resizeVisualizer();
  bgMusic.addEventListener('play', drawVisualizer);

  // ===== Enhanced Shader Canvas =====
  const shaderCanvas = document.getElementById('shader-canvas');
  const gl = shaderCanvas.getContext('webgl', { alpha: true, antialias: true });
  if (!gl) return console.warn('WebGL not supported');

  function resizeShader() {
    shaderCanvas.width = window.innerWidth;
    shaderCanvas.height = window.innerHeight;
    gl.viewport(0, 0, shaderCanvas.width, shaderCanvas.height);
  }

  resizeShader();
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

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
      vec2 p = (uv - 0.5) * 2.0;
      p.x *= resolution.x / resolution.y;

      float color = 0.0;
      float t = time * 0.08;

      for (float i = 1.0; i < 6.0; i++) {
        vec2 offset = vec2(
          cos(t * 0.7 + i) * 0.3,
          sin(t * 0.5 + i) * 0.3
        );
        
        vec2 q = p - offset;
        q = vec2(
          cos(t - q.x * 2.0) + sin(q.y * 2.0),
          sin(t + q.y * 2.0) + cos(q.x * 2.0)
        );
        
        color += 0.5 / length(q);
      }

      color = smoothstep(0.0, 1.0, color * 0.15);
      
      vec3 finalColor = vec3(
        color * 0.3,
        color * 0.8,
        color
      );
      
      finalColor += vec3(
        sin(time * 0.1) * 0.1,
        cos(time * 0.15) * 0.1,
        sin(time * 0.2) * 0.1
      );

      gl_FragColor = vec4(finalColor, color * 0.5);
    }
  `;

  function compileShader(src, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  const program = gl.createProgram();
  gl.attachShader(program, compileShader(vertex, gl.VERTEX_SHADER));
  gl.attachShader(program, compileShader(fragment, gl.FRAGMENT_SHADER));
  gl.linkProgram(program);
  gl.useProgram(program);

  const pos = gl.getAttribLocation(program, 'position');
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const tUni = gl.getUniformLocation(program, 'time');
  const resUni = gl.getUniformLocation(program, 'resolution');

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  function renderShader(t) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(tUni, t * 0.001);
    gl.uniform2f(resUni, shaderCanvas.width, shaderCanvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(renderShader);
  }
  renderShader(0);

  // ===== Enhanced Starfield =====
  const canvas = document.getElementById('warp-bg');
  const ctx = canvas.getContext('2d');
  
  function resizeStarfield() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  resizeStarfield();

  let stars = Array.from({ length: 300 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    z: Math.random() * canvas.width,
    opacity: Math.random()
  }));

  function animateStarfield() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let star of stars) {
      star.z -= 3;
      if (star.z <= 0) {
        star.z = canvas.width;
        star.x = Math.random() * canvas.width;
        star.y = Math.random() * canvas.height;
      }

      const k = 128.0 / star.z;
      const x = (star.x - canvas.width / 2) * k + canvas.width / 2;
      const y = (star.y - canvas.height / 2) * k + canvas.height / 2;
      const size = (1 - star.z / canvas.width) * 4;
      const opacity = (1 - star.z / canvas.width) * star.opacity;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `rgba(0, 255, 255, ${opacity})`);
      gradient.addColorStop(0.5, `rgba(0, 200, 255, ${opacity * 0.5})`);
      gradient.addColorStop(1, 'rgba(0, 150, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(animateStarfield);
  }
  animateStarfield();

  // ===== Enhanced Audio-Reactive Orbs =====
  const orbCanvas = document.getElementById('orb-canvas');
  const octx = orbCanvas.getContext('2d');
  
  function resizeOrbs() {
    orbCanvas.width = window.innerWidth;
    orbCanvas.height = window.innerHeight;
  }
  
  resizeOrbs();

  const orbs = Array.from({ length: 30 }, () => ({
    x: Math.random() * orbCanvas.width,
    y: Math.random() * orbCanvas.height,
    radius: 8 + Math.random() * 12,
    dx: (Math.random() - 0.5) * 0.8,
    dy: (Math.random() - 0.5) * 0.8,
    hue: Math.random() * 360,
    pulsePhase: Math.random() * Math.PI * 2
  }));

  function animateOrbs() {
    octx.clearRect(0, 0, orbCanvas.width, orbCanvas.height);
    analyser.getByteFrequencyData(dataArray);

    for (let i = 0; i < orbs.length; i++) {
      const orb = orbs[i];
      
      orb.x += orb.dx;
      orb.y += orb.dy;
      orb.hue += 0.3;
      orb.pulsePhase += 0.02;

      // Wrap around screen
      if (orb.x < -orb.radius) orb.x = orbCanvas.width + orb.radius;
      if (orb.x > orbCanvas.width + orb.radius) orb.x = -orb.radius;
      if (orb.y < -orb.radius) orb.y = orbCanvas.height + orb.radius;
      if (orb.y > orbCanvas.height + orb.radius) orb.y = -orb.radius;

      const volume = dataArray[i % dataArray.length] / 255;
      const pulse = Math.sin(orb.pulsePhase) * 0.3 + 1;
      const dynamicRadius = orb.radius * (0.7 + volume * 2) * pulse;

      // Main orb
      const gradient = octx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, dynamicRadius);
      gradient.addColorStop(0, `hsla(${orb.hue}, 100%, 70%, ${0.6 + volume * 0.4})`);
      gradient.addColorStop(0.4, `hsla(${orb.hue + 60}, 100%, 60%, ${0.3 + volume * 0.3})`);
      gradient.addColorStop(1, `hsla(${orb.hue + 120}, 100%, 50%, 0)`);

      octx.beginPath();
      octx.arc(orb.x, orb.y, dynamicRadius, 0, Math.PI * 2);
      octx.fillStyle = gradient;
      octx.shadowColor = `hsla(${orb.hue}, 100%, 60%, ${0.4 + volume * 0.6})`;
      octx.shadowBlur = 30 + volume * 60;
      octx.fill();
    }

    octx.shadowBlur = 0;
    requestAnimationFrame(animateOrbs);
  }
  animateOrbs();

  // ===== Interactive Particle System =====
  const particleCanvas = document.getElementById('particle-canvas');
  const pctx = particleCanvas.getContext('2d');
  
  function resizeParticles() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  }
  
  resizeParticles();

  const particles = [];
  const mouse = { x: null, y: null };

  particleCanvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    // Create particles on mouse move
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: mouse.x,
        y: mouse.y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 1,
        hue: Math.random() * 360,
        size: Math.random() * 3 + 1
      });
    }
  });

  function animateParticles() {
    pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.01;
      p.vy += 0.05; // Gravity

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      pctx.beginPath();
      pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      pctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.life * 0.8})`;
      pctx.shadowColor = `hsla(${p.hue}, 100%, 60%, ${p.life})`;
      pctx.shadowBlur = 10;
      pctx.fill();
    }

    pctx.shadowBlur = 0;
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  // ===== Responsive Resizing =====
  window.addEventListener('resize', () => {
    resizeStarfield();
    resizeOrbs();
    resizeVisualizer();
    resizeShader();
    resizeParticles();
  });

  // ===== Performance Monitoring =====
  let lastTime = performance.now();
  let fps = 60;

  function monitorPerformance() {
    const currentTime = performance.now();
    fps = 1000 / (currentTime - lastTime);
    lastTime = currentTime;

    // Reduce particle count if FPS drops
    if (fps < 30 && particles.length > 50) {
      particles.length = 50;
    }

    requestAnimationFrame(monitorPerformance);
  }
  monitorPerformance();
});
