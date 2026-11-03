// Glitches the profile picture: it sits still, then every few seconds it
// breaks up for a moment (slices jump sideways, the color channels split).
(function () {
  const box = document.querySelector(".portrait");
  const img = box && box.querySelector("img");
  if (!img) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // tweak these to taste
  const MIN_GAP = 1800;     // ms between glitches (random between MIN and MAX)
  const MAX_GAP = 5000;
  const MIN_LEN = 140;      // ms a glitch lasts
  const MAX_LEN = 420;
  const FRAME = 55;         // ms between glitch frames (lower = more frantic)
  const MAX_SHIFT = 28;     // how far slices jump sideways (design px)

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  const base = document.createElement("canvas");  // the image, cover-fit
  const red = document.createElement("canvas");   // red channel only
  const cyan = document.createElement("canvas");  // green + blue channels

  let cw = 0, ch = 0, px = 1;
  let glitchEnd = 0, nextGlitch = 1200, nextFrame = 0, clean = false;
  const rand = (a, b) => a + Math.random() * (b - a);

  function tinted(target, color) {
    const c = target.getContext("2d");
    target.width = cw; target.height = ch;
    c.drawImage(base, 0, 0);
    c.globalCompositeOperation = "multiply";
    c.fillStyle = color;
    c.fillRect(0, 0, cw, ch);
  }

  function resize() {
    const w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    px = Math.min(3, (window.devicePixelRatio || 1) * (window.stageScale || 1));
    cw = canvas.width = base.width = Math.round(w * px);
    ch = canvas.height = base.height = Math.round(h * px);

    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(cw / iw, ch / ih);
    const sw = cw / s, sh = ch / s;
    const b = base.getContext("2d");
    b.imageSmoothingEnabled = false;
    b.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, cw, ch);

    tinted(red, "#ff0000");
    tinted(cyan, "#00ffff");
    clean = false;
  }

  function drawClean() {
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(base, 0, 0);
    clean = true;
  }

  function drawGlitch() {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#0d1a14";
    ctx.fillRect(0, 0, cw, ch);

    // color split: red channel one way, green+blue the other
    const split = rand(2, 7) * px * (Math.random() < 0.5 ? -1 : 1);
    ctx.drawImage(red, -split, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(cyan, split, 0);
    ctx.globalCompositeOperation = "source-over";

    // torn horizontal slices
    const n = 2 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const y = Math.random() * ch;
      const h = rand(3, 38) * px;
      const off = rand(-MAX_SHIFT, MAX_SHIFT) * px;
      const src = Math.random() < 0.3 ? (Math.random() < 0.5 ? red : cyan) : base;
      ctx.drawImage(src, 0, y, cw, h, off, y, cw, h);
    }

    // a bright scan line now and then
    if (Math.random() < 0.4) {
      ctx.fillStyle = "rgba(200, 255, 230, .35)";
      ctx.fillRect(0, Math.random() * ch, cw, rand(1, 3) * px);
    }
    clean = false;
  }

  function loop(now) {
    if (now >= nextGlitch) {
      glitchEnd = now + rand(MIN_LEN, MAX_LEN);
      nextGlitch = glitchEnd + rand(MIN_GAP, MAX_GAP);
    }
    if (now < glitchEnd) {
      if (now >= nextFrame) { drawGlitch(); nextFrame = now + FRAME; }
    } else if (!clean) {
      drawClean();
    }
    requestAnimationFrame(loop);
  }

  function start() {
    box.appendChild(canvas);
    img.style.visibility = "hidden";
    resize();
    drawClean();
    window.addEventListener("stagescale", () => { resize(); drawClean(); });
    if (window.ResizeObserver) new ResizeObserver(() => { resize(); drawClean(); }).observe(box);
    if (!reduce) requestAnimationFrame(loop);
  }

  if (img.complete && img.naturalWidth) start();
  else img.addEventListener("load", start);
})();
