(async () => {
  let audioStarted = false;
  const controlText = document.getElementById("controlText");

  // --- Background music ---
  const bgMusic = document.getElementById("bgMusic");

  document.documentElement.addEventListener(
    "pointerdown",
    async () => {
      if (!audioStarted) {
        await Tone.start();
        audioStarted = true;

        // Start background music
        bgMusic.play();

        controlText.textContent = "Now Playing";
        controlText.classList.add("pulsing");
      }
    },
    { once: true }
  );

  const synth = new Tone.Synth().toDestination();
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", resize);
  resize();

  const notes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
  const N = 50,
    STRIP_H = 2000,
    BLOOM_DURATION = 600,
    SCROLL_SPEED = 0.7,
    TRIGGER_H = 40;

  // --- Create background stars ---
  const starCanvas = document.createElement("canvas");
  const sctx = starCanvas.getContext("2d");
  starCanvas.width = canvas.width;
  starCanvas.height = canvas.height;
  for (let i = 0; i < 200; i++) {
    sctx.beginPath();
    sctx.arc(
      Math.random() * starCanvas.width,
      Math.random() * starCanvas.height,
      Math.random() * 1.5,
      0,
      Math.PI * 2
    );
    sctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5 + 0.2})`;
    sctx.fill();
  }

  // --- Create flowers ---
  const flowers = Array.from({ length: N }, (_, i) => {
    const hue = 50 + Math.random() * 20 - 10;
    return {
      x: Math.random() * canvas.width,
      y: (i / N) * STRIP_H + (Math.random() * 100 - 50),
      note: notes[i % notes.length],
      color: `hsla(${hue}, ${80 + Math.random() * 10}%, ${
        40 + Math.random() * 10
      }%, 0.5)`,
      baseSize: 30 * (0.5 + Math.random()),
      bloom: 0,
      blooming: false,
      bloomStart: 0,
    };
  });

  const lines = Array.from(
    { length: 6 },
    (_, i) => canvas.height * 0.4 + i * 50
  );

  let scrollY = 0,
    waveOffset = 0;

  // --- Drawing functions ---
  const drawFlower = (p, y) => {
    const size = p.baseSize * (0.3 + 0.7 * p.bloom);
    const petals = 4 + Math.floor(p.bloom * 4);
    const hsla = p.color.match(/hsla\((\d+),\s*(\d+)%,\s*(\d+)%,/);
    const [h, s, l] = hsla ? hsla.slice(1, 4).map(Number) : [0, 100, 50];
    const color = `hsla(${h}, ${Math.min(100, s + p.bloom * 20)}%, ${Math.min(
      90,
      l + p.bloom * 30
    )}%, ${0.5 + 0.5 * p.bloom})`;

    ctx.shadowBlur = 15 + p.bloom * 20;
    ctx.shadowColor = color;
    ctx.fillStyle = color;

    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        p.x + Math.cos(a) * (size * 0.3),
        y + Math.sin(a) * (size * 0.3),
        size * 0.7,
        size * 0.35,
        a,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(p.x, y, size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.7 + 0.3 * p.bloom})`;
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(starCanvas, 0, 0);

    // Draw sine-wave lines
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(100,200,255,0.7)";
    ctx.shadowBlur = 20;
    ctx.shadowColor = "rgba(100,200,255,1)";

    lines.forEach((y) => {
      ctx.beginPath();
      for (let i = 0; i <= 50; i++) {
        const x = (i / 50) * canvas.width;
        ctx.lineTo(x, y + Math.sin(x * 0.02 + waveOffset) * 10);
      }
      ctx.stroke();
    });
    ctx.shadowBlur = 0;

    // Draw flowers
    flowers.forEach((p) => {
      let y = p.y - scrollY;
      if (y < -50) p.y += STRIP_H;
      else if (y > canvas.height + 50) p.y -= STRIP_H;
      else drawFlower(p, y);
    });
  };

  // --- Scroll handler ---
  window.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (!audioStarted) return;
      scrollY += e.deltaY * SCROLL_SPEED;
      const now = Tone.now();

      flowers.forEach((p) => {
        const y = p.y - scrollY;
        lines.forEach((barY) => {
          if (
            Math.abs(y - barY) < TRIGGER_H / 2 &&
            now - (p._last || 0) > 0.2
          ) {
            synth.triggerAttackRelease(p.note, "8n");
            p.blooming = true;
            p.bloomStart = performance.now();
            p._last = now;
          }
        });
      });
    },
    { passive: false }
  );

  // --- Animation loop ---
  const animate = (t) => {
    waveOffset += 0.05;
    flowers.forEach((p) => {
      if (p.blooming) {
        p.bloom = Math.min(1, (t - p.bloomStart) / BLOOM_DURATION);
        if (p.bloom >= 1) {
          p.blooming = false;
          setTimeout(() => (p.bloom = 0), 300);
        }
      }
    });
    draw();
    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
})();
