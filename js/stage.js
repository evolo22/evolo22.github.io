// Sizes the stage to fill the window, wires up nav links,
// the minimize/close buttons, and the "at my puter" status.
(function () {
  const W = 1600, H = 900;
  const cfg = window.LIZARD_CONFIG || {};
  const stage = document.getElementById("stage");

  // ---------- fill the window ----------
  // Everything is designed for a 1600x900 screen. Scale it by how much
  // bigger or smaller this screen is, then make the stage exactly as big as the
  // window (in design pixels), so the panels stretch edge to edge.
  function fit() {
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const s = Math.min(vw / W, vh / H);
    stage.style.setProperty("--s", s);
    stage.style.setProperty("--w", vw / s + "px");
    stage.style.setProperty("--h", vh / s + "px");
    window.stageScale = s;
    window.dispatchEvent(new CustomEvent("stagescale", { detail: s }));
  }
  window.addEventListener("resize", fit);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", fit);
  fit();

  // ---------- links ----------
  document.querySelectorAll("[data-link]").forEach((a) => {
    const href = cfg.links && cfg.links[a.dataset.link];
    if (href) a.href = href;
  });

  // ---------- minimize ----------
  const desk = document.getElementById("desk");
  const chip = document.getElementById("chip");
  document.getElementById("btn-min").addEventListener("click", () => {
    desk.classList.add("minimized");
    chip.hidden = false;
    chip.focus();
  });
  chip.addEventListener("click", () => {
    desk.classList.remove("minimized");
    chip.hidden = true;
  });

  // ---------- close (CRT power-off) ----------
  const screen = document.getElementById("screen");
  const off = document.getElementById("poweroff");
  let isOff = false;
  document.getElementById("btn-close").addEventListener("click", () => {
    screen.classList.remove("crt-on");
    screen.classList.add("crt-off");
    setTimeout(() => { off.hidden = false; isOff = true; }, 650);
  });
  function reboot() {
    if (!isOff) return;
    isOff = false;
    off.hidden = true;
    screen.classList.remove("crt-off");
    screen.classList.add("crt-on");
  }
  document.getElementById("reboot").addEventListener("click", reboot);
  window.addEventListener("keydown", reboot);
  off.addEventListener("click", reboot);

  // ---------- status ----------
  const statusEl = document.getElementById("status");
  const statusText = document.getElementById("status-text");

  function ago(ms) {
    const m = Math.round(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    const h = Math.round(m / 60);
    if (h < 48) return h + " hr ago";
    return Math.round(h / 24) + " days ago";
  }

  function render(online, lastSeen) {
    statusEl.classList.toggle("away", !online);
    statusText.textContent = online ? "At my puter!" : "Away!";
    statusEl.title = lastSeen ? "Last seen at my puter " + ago(Date.now() - lastSeen) : "";
  }

  async function poll() {
    let online = false, last = 0;
    if (cfg.statusUrl) {
      try {
        const r = await fetch(cfg.statusUrl, { cache: "no-store" });
        const j = await r.json();
        online = !!j.online;
        last = j.last_seen || 0;
      } catch (e) { /* network hiccup -> show away */ }
    }
    render(online, last);
  }
  poll();
  setInterval(poll, (cfg.pollSeconds || 60) * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
})();
