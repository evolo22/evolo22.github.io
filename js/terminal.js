// A tiny fake terminal. On the home page it loops through silly
// LizardCo TermLink sessions forever. projects.js reuses Term() for READMEs.
//
// Script line syntax:
//   "> text"   typed out as a command
//   "!text"    bright/bold output
//   "~800"     pause 800ms
//   "%LABEL"   animated progress bar
//   anything else is printed as normal output
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

  function Term(box) {
    const lines = document.createElement("div");
    box.appendChild(lines);
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    let token = 0;

    const scroll = () => { box.scrollTop = box.scrollHeight; };

    const api = {
      clear() { token++; lines.textContent = ""; },

      line(text = "", cls = "") {
        const d = document.createElement("div");
        d.className = "tl" + (cls ? " " + cls : "");
        d.textContent = text;
        d.appendChild(cursor);
        lines.appendChild(d);
        while (lines.childElementCount > 150) lines.firstElementChild.remove();
        scroll();
        return d;
      },

      async type(text, cls, speed = 42, prefix = "") {
        const my = token;
        const d = api.line(prefix, cls);
        const t = document.createTextNode("");
        d.insertBefore(t, cursor);
        if (reduce) { t.data = text; return; }
        for (const ch of text) {
          if (my !== token) return;
          t.data += ch;
          scroll();
          await sleep(speed * rand(0.4, 1.7));
        }
      },

      async progress(label) {
        const my = token;
        const d = api.line("");
        const n = 24;
        for (let i = 0; i <= n; i++) {
          if (my !== token) return;
          d.textContent = `${label} [${"#".repeat(i)}${".".repeat(n - i)}] ${Math.round((i / n) * 100)}%`;
          d.appendChild(cursor);
          await sleep(reduce ? 20 : rand(40, 170));
        }
      },

      async run(steps) {
        const my = token;
        for (const s of steps) {
          if (my !== token) return false;
          if (s.startsWith("> ")) {
            await sleep(rand(300, 800));
            await api.type(s.slice(2), "cmd", 42, "> ");
            await sleep(rand(250, 550));
          } else if (s.startsWith("~")) {
            await sleep(+s.slice(1));
          } else if (s.startsWith("!")) {
            api.line(s.slice(1), "hi");
            await sleep(rand(60, 140));
          } else if (s.startsWith("%")) {
            await api.progress(s.slice(1));
          } else {
            api.line(s);
            await sleep(rand(45, 120));
          }
        }
        return my === token;
      },
    };
    return api;
  }
  window.Term = Term;

  // ---------------------------------------------------------------- content

  const BOOT = [
    "!LIZARDCO INDUSTRIES (TM) TERMLINK PROTOCOL",
    "!COPYRIGHT 2287 LIZARDCO INDUSTRIES. ALL SCALES RESERVED.",
    "- TERRARIUM SERVER 7 -",
    "~600",
    "> SET TERMINAL/INQUIRE",
    "LZ-3000 (SCALY EDITION)",
    "> SET HALT RESTART/MAINT",
    "Initializing LizardCo(TM) Basking Agent v0.9.1",
    "Loading heat lamp drivers............ OK",
    "Loading cricket inventory............ OK",
    "Loading sense of purpose............. NOT FOUND (continuing anyway)",
    "~500",
    "",
  ];

  const WORDS = ["CRICKETS", "HEATLAMP", "SHEDDING", "MEALWORM", "SUNBATHE", "TERRAPIN", "SCALIEST", "BASILISK", "COLDNESS", "TAILLESS"];
  const JUNK = "!@#$%^&*()_+-=[]{};:'\",.<>/?|\\";

  function likeness(a, b) {
    let n = 0;
    for (let i = 0; i < a.length; i++) if (a[i] === b[i]) n++;
    return n;
  }

  function junk(len) {
    let s = "";
    for (let i = 0; i < len; i++) s += pick(JUNK.split(""));
    return s;
  }

  function hackBlock() {
    const words = shuffle(WORDS).slice(0, 6);
    const answer = pick(words);
    const out = [
      "> LOGON ADMIN",
      "!LIZARDCO INDUSTRIES (TM) TERMLINK PROTOCOL",
      "ENTER PASSWORD NOW",
      "",
      "4 ATTEMPT(S) LEFT: ▮ ▮ ▮ ▮",
      "",
    ];
    // hex dump with the candidate words hidden in it
    const slots = shuffle([...Array(12).keys()]).slice(0, words.length);
    const cols = [...Array(12)].map((_, i) => {
      const w = words[slots.indexOf(i)];
      if (!w) return junk(12);
      const at = Math.floor(Math.random() * 5);
      return junk(at) + w + junk(4 - at);
    });
    const base = 0xf4a0 + Math.floor(Math.random() * 0x400) * 4;
    const hex = (n) => "0x" + n.toString(16).toUpperCase();
    for (let i = 0; i < 6; i++) {
      out.push(`${hex(base + i * 12)} ${cols[i]}   ${hex(base + 72 + i * 12)} ${cols[i + 6]}`);
    }
    out.push("~600");

    let left = 4;
    const wrong = shuffle(words.filter((w) => w !== answer)).slice(0, 1 + Math.floor(Math.random() * 3));
    for (const g of wrong) {
      left--;
      out.push("> " + g, "!Entry denied.", `Likeness=${likeness(g, answer)}`, "~250",
               `${left} ATTEMPT(S) LEFT: ${"▮ ".repeat(left).trim()}`);
    }
    out.push("> " + answer, "!Exact match!", "Please wait while system is accessed.", "%ACCESSING", "~800", "");
    return out;
  }

  const FORTUNES = [
    "You will find the bug in the last place you look. Because then you stop looking.",
    "A segfault is just the computer asking for a hug.",
    "Today is a good day to rewrite it in Rust. (It is not.)",
    "The cache was warm. The lizard was warmer.",
    "Never trust a compiler that says 'probably fine'.",
    "Your GPU kernel will run 40x faster once you stop looking at it.",
  ];

  const BLOCKS = [
    hackBlock,

    [
      "> cat ~/logs/personal_log_042.txt",
      "!PERSONAL LOG - ENTRY 42",
      "Day 3 of debugging the PSP. It has begun to debug me.",
      "The heat lamp flickered again. I am choosing to read this as a sign.",
      "Note to self: do not lick the solder. Again.",
      "~1200",
    ],

    [
      "> sudo make me a sandwich",
      "lizard is not in the sudoers file. This incident will be reported to the heat lamp.",
      "~700",
    ],

    [
      "> nvcc --gpu-architecture=sm_vibes main.cu",
      "nvcc fatal   : Unsupported gpu architecture 'sm_vibes'",
      "> nvcc --gpu-architecture=sm_90 main.cu",
      "main.cu(12): warning: lizard detected on keyboard",
      "main.cu(13): warning: lizard detected on keyboard",
      "main.cu(14): warning: lizard has left the keyboard",
      "!Build succeeded (with emotional support).",
      "~900",
    ],

    [
      "> top -n 1",
      "  PID USER      %CPU  COMMAND",
      "    1 lizard    97.3  bask",
      "   42 lizard     2.1  shed_skin.sh",
      "  128 lizard     0.5  think_about_crickets",
      "  404 lizard     0.0  motivation (zombie)",
      "~1000",
    ],

    [
      "> RUN DIAGNOSTICS: TERRARIUM_07",
      "Humidity ............. 62%      [ OK ]",
      "Heat lamp ............ ON       [ OK ]",
      "Cricket reserves ..... LOW      [ !! ]",
      "Lizard morale ........ HIGH     [ OK ]",
      "Owner sleep .......... 4.5 HRS  [ !! ]",
      "~1000",
    ],

    [
      "> fortune",
      "__FORTUNE__",
      "~1200",
    ],

    [
      "> ls ~/projects",
      "psp_homebrew/   cyberdeck/   lizard_deck/   definitely_not_another_side_project/",
      "~700",
    ],

    [
      "> ./flash_psp --firmware=custom",
      "Detecting PSP-3000.................. FOUND",
      "Checking battery.................... 41% (living dangerously)",
      "%FLASHING",
      "!Done. Your PSP now runs homebrew and has opinions.",
      "~900",
    ],

    [
      "> cat /terminals/overseer_memo.txt",
      "!MEMO: TO ALL TERRARIUM STAFF",
      "Whoever keeps feeding crickets into the server rack: please stop.",
      "It does not eat them. It just stores them. In the RAM.",
      "We are now out of crickets AND memory.",
      "- Management",
      "~1300",
    ],

    [
      "> man cat",
      "!NAME",
      "     cat -- concatenate files and print on the standard output",
      "!BUGS",
      "     Is not an actual cat. Repeated petting of the terminal has no effect.",
      "~1000",
    ],

    [
      "> git push --force",
      "Are you sure? The lizard is watching.",
      " ! [rejected]   main -> main (vibe check failed)",
      "hint: try being nicer to your coworkers first.",
      "~900",
    ],

    [
      "> uptime",
      " 03:14:07 up 3 days, 4:20, 1 lizard, load average: crickets, crickets, crickets",
      "~800",
    ],

    [
      "> ping crickets.local",
      "64 bytes from crickets.local: icmp_seq=1 ttl=64 time=0.4 ms (crunchy)",
      "64 bytes from crickets.local: icmp_seq=2 ttl=64 time=0.3 ms (crunchy)",
      "64 bytes from crickets.local: icmp_seq=3 ttl=64 time=-- (eaten)",
      "~800",
    ],
  ];

  // ---------------------------------------------------------------- loop
  const box = document.getElementById("terminal");
  if (box && box.dataset.mode === "loop") {
    const term = Term(box);
    (async () => {
      await term.run(BOOT);
      let last = null;
      for (;;) {
        let b;
        do { b = pick(BLOCKS); } while (b === last);
        last = b;
        let steps = typeof b === "function" ? b() : b;
        steps = steps.map((s) => (s === "__FORTUNE__" ? pick(FORTUNES) : s));
        await term.run(steps);
        term.line("");
        await sleep(1200);
      }
    })();
  }
})();
