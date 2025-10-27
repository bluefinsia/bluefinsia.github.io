// this entire script is wrapped in an Immediately Invoked Function Expression (IIFE)
// that is also an asynchronous function: `(async () => { ... })();`.

// why use this?
// enabling `await` for Asynchronous Initialization
// because Tone.js, require asynchronous initialization steps
// the `await` keyword allows us to pause execution until a Promise (e.g., from `Tone.start()`) resolves
// JavaScript's global scope (the top level of your script) does not natively allow the use of `await`
// by declaring the IIFE as `async`, we create a valid asynchronous context
// where `await` can be used safely and correctly at what appears to be the "top level" of our script's logic
// this ensures that audio components (like `Tone.start()` and `bgMusic.play()`)
// are fully ready before any attempts to play sounds, preventing errors or silent playback

// also
// creating a Private Scope (Preventing Global Pollution) to solve
// variables (e.g., `audioStarted`, `synth`, `canvas`) and functions
// declared directly in the global scope can lead to naming collisions
// with other scripts or libraries on the same page
// the IIFE creates its own function scope. Any variables declared
// with `let` or `const` inside this IIFE are confined to that scope
// this encapsulates the script's logic, making it more robust, easier to maintain
// and preventing unintended side effects from external code

(async () => {
  // Flag to check if audio has been started by user interaction
  let audioStarted = false;
  // Get the control text element from the DOM
  const controlText = document.getElementById("controlText");

  // --- This is background music ---
  // Get the background music audio element from the DOM
  const bgMusic = document.getElementById("bgMusic");

  // Event listener for the first user interaction (pointerdown) on the document
  // This is crucial for web audio APIs that require a user gesture to start playback.
  document.documentElement.addEventListener(
    "pointerdown",
    async () => {
      // If audio hasn't started yet
      if (!audioStarted) {
        // Start the Tone.js audio context
        await Tone.start();
        // Set the flag to true as audio is now enabled
        audioStarted = true;

        // Start playing the background music
        bgMusic.play();

        // Update the control text to indicate audio is playing
        controlText.textContent = "Now Playing";
        // Add a pulsing class for visual feedback
        controlText.classList.add("pulsing");
      }
    },
    { once: true } // Ensures this event listener only fires once
  );

  // Initialize a basic synthesizer using Tone.js and connect it to the master output
  const synth = new Tone.Synth().toDestination();
  // Get the canvas element and its 2D rendering context
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  // Function to resize the canvas to fill the entire window
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  // Add event listeners for window resize to adjust canvas dimensions
  window.addEventListener("resize", resize);
  // Initial call to set canvas size on load
  resize();

  // Define an array of musical notes for the flowers
  const notes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
  // Constants for various visual and interactive parameters
  const N = 50, // Number of flowers
    STRIP_H = 2000, // Height of the "strip" where flowers are distributed (simulates a long scrollable area)
    BLOOM_DURATION = 600, // Duration of a flower's blooming animation in milliseconds
    SCROLL_SPEED = 0.7, // Multiplier for scroll delta to control scroll speed
    TRIGGER_H = 40; // Height around a line that triggers a flower note

  // --- This is background stars ---
  // Create an offscreen canvas for drawing static background stars
  const starCanvas = document.createElement("canvas");
  const sctx = starCanvas.getContext("2d");
  // Set dimensions of the star canvas
  starCanvas.width = canvas.width;
  starCanvas.height = canvas.height;
  // Draw 200 random stars on the star canvas
  for (let i = 0; i < 200; i++) {
    sctx.beginPath();
    sctx.arc(
      Math.random() * starCanvas.width, // Random X position
      Math.random() * starCanvas.height, // Random Y position
      Math.random() * 1.5, // Random radius
      0,
      Math.PI * 2
    );
    // Set random alpha for varied star brightness
    sctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5 + 0.2})`;
    sctx.fill();
  }

  // --- This is blooming flowers ---
  // Create an array of flower objects
  const flowers = Array.from({ length: N }, (_, i) => {
    const hue = 50 + Math.random() * 20 - 10; // Random hue for flower color
    return {
      x: Math.random() * canvas.width, // Random X position
      y: (i / N) * STRIP_H + (Math.random() * 100 - 50), // Y position distributed along STRIP_H
      note: notes[i % notes.length], // Assign a note from the notes array
      color: `hsla(${hue}, ${80 + Math.random() * 10}%, ${
        40 + Math.random() * 10
      }%, 0.5)`, // HSLA color string
      baseSize: 30 * (0.5 + Math.random()), // Random base size for the flower
      bloom: 0, // Current bloom state (0 to 1)
      blooming: false, // Flag if the flower is currently blooming
      bloomStart: 0, // Timestamp when blooming started
    };
  });

  // Define an array of Y coordinates for the horizontal "lines" that flowers interact with
  const lines = Array.from(
    { length: 6 },
    (_, i) => canvas.height * 0.4 + i * 50
  );

  // Variables for current scroll position and wave animation offset
  let scrollY = 0,
    waveOffset = 0;

  // --- This drawing functions ---
  // Function to draw a single flower
  const drawFlower = (p, y) => {
    // Calculate current size based on baseSize and bloom state
    const size = p.baseSize * (0.3 + 0.7 * p.bloom);
    // Determine number of petals based on bloom state
    const petals = 4 + Math.floor(p.bloom * 4);
    // Extract H, S, L from the flower's color for dynamic adjustment
    const hsla = p.color.match(/hsla\((\d+),\s*(\d+)%,\s*(\d+)%,/);
    const [h, s, l] = hsla ? hsla.slice(1, 4).map(Number) : [0, 100, 50];
    // Adjust color saturation and lightness based on bloom state
    const color = `hsla(${h}, ${Math.min(100, s + p.bloom * 20)}%, ${Math.min(
      90,
      l + p.bloom * 30
    )}%, ${0.5 + 0.5 * p.bloom})`;

    // Apply shadow effect for a glowing look
    ctx.shadowBlur = 15 + p.bloom * 20;
    ctx.shadowColor = color;
    ctx.fillStyle = color;

    // Draw petals
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2; // Angle for each petal
      ctx.beginPath();
      ctx.ellipse(
        p.x + Math.cos(a) * (size * 0.3), // Petal X position offset
        y + Math.sin(a) * (size * 0.3), // Petal Y position offset
        size * 0.7, // Petal width
        size * 0.35, // Petal height
        a, // Rotation angle
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Draw the center of the flower
    ctx.beginPath();
    ctx.arc(p.x, y, size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.7 + 0.3 * p.bloom})`; // White center, brighter when blooming
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow blur
  };

  // Main drawing function that renders the entire scene
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    ctx.drawImage(starCanvas, 0, 0); // Draw the pre-rendered stars

    // Draw sine-wave lines
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(100,200,255,0.7)";
    ctx.shadowBlur = 20;
    ctx.shadowColor = "rgba(100,200,255,1)";

    lines.forEach((y) => {
      ctx.beginPath();
      // Draw a sine wave for each line
      for (let i = 0; i <= 50; i++) {
        const x = (i / 50) * canvas.width;
        ctx.lineTo(x, y + Math.sin(x * 0.02 + waveOffset) * 10);
      }
      ctx.stroke();
    });
    ctx.shadowBlur = 0; // Reset shadow blur

    // Draw flowers
    flowers.forEach((p) => {
      let y = p.y - scrollY; // Adjust flower Y position based on scroll
      // Implement continuous scrolling: if a flower goes off-screen, wrap it around
      if (y < -50) p.y += STRIP_H;
      else if (y > canvas.height + 50) p.y -= STRIP_H;
      else drawFlower(p, y); // Only draw if visible
    });
  };

  // --- This is scroll handler ---
  // Event listener for mouse wheel scroll
  window.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault(); // Prevent default page scrolling
      if (!audioStarted) return; // Do nothing if audio hasn't started

      scrollY += e.deltaY * SCROLL_SPEED; // Update scroll position

      const now = Tone.now(); // Get current Tone.js time

      flowers.forEach((p) => {
        const y = p.y - scrollY; // Calculate current visible Y position of the flower
        lines.forEach((barY) => {
          // Check if flower is close to a line and enough time has passed since last bloom
          if (
            Math.abs(y - barY) < TRIGGER_H / 2 && // Within trigger height of a line
            now - (p._last || 0) > 0.2 // Cooldown to prevent rapid re-triggering
          ) {
            synth.triggerAttackRelease(p.note, "8n"); // Play the flower's note
            p.blooming = true; // Set flower to blooming state
            p.bloomStart = performance.now(); // Record bloom start time
            p._last = now; // Update last bloom time
          }
        });
      });
    },
    { passive: false } // Ensures preventDefault can be called
  );

  // --- This is animation loop ---
  // The main animation loop function
  const animate = (t) => {
    waveOffset += 0.05; // Increment wave offset for line animation
    flowers.forEach((p) => {
      if (p.blooming) {
        // Calculate current bloom progress
        p.bloom = Math.min(1, (t - p.bloomStart) / BLOOM_DURATION);
        // If blooming is complete
        if (p.bloom >= 1) {
          p.blooming = false; // Stop blooming flag
          // After a short delay, reset bloom state to 0 for next bloom
          setTimeout(() => (p.bloom = 0), 300);
        }
      }
    });
    draw(); // Call the main drawing function
    requestAnimationFrame(animate); // Request the next animation frame
  };

  // Start the animation loop
  requestAnimationFrame(animate);
})();
