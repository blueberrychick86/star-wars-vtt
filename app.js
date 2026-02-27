/* ========================================================================
   Star Wars Deckbuilding VTT — Fresh Rebuild (2-player online + correct POV)
   - Uses your existing Cloudflare WS room worker:
       wss://sw-vtt-rooms-worker.blueberrychick86.workers.dev/ws?room=<ROOM>
   - Seat-locked POV: each player sees THEIR side at the bottom
   - Fixes P2 facing by rotating CAMERA (board), not rotating card logic
   - Freeform tabletop mechanics: drag cards/tokens, draw/discard, end turn,
     force marker, tokens attach to cards
   - Desktop + mobile (iPhone 12 Pro friendly)
   ======================================================================== */

(() => {
  "use strict";

  // ---------------------------
  // Required HTML element IDs (from your index.html)
  // ---------------------------
  const elStartMenu = document.getElementById("startMenu");
  const elApp = document.getElementById("app");
  const elName = document.getElementById("hostNameInput");
  const elMando = document.getElementById("mandoToggle");
  const elPlay = document.getElementById("playBtn");
  const elCancel = document.getElementById("cancelBtn");
  const menuBtns = Array.from(document.querySelectorAll("#startMenu .menu-btn"));

  // Seat buttons are literal text: "Blue" and "Red"
  const btnBlue = menuBtns.find(b => (b.textContent || "").trim().toLowerCase() === "blue");
  const btnRed  = menuBtns.find(b => (b.textContent || "").trim().toLowerCase() === "red");

  // Era buttons (we store selection, but mechanics are freeform)
  const btnOT    = menuBtns.find(b => (b.textContent || "").trim().toLowerCase() === "original trilogy");
  const btnCW    = menuBtns.find(b => (b.textContent || "").trim().toLowerCase() === "clone wars");
  const btnMixed = menuBtns.find(b => (b.textContent || "").trim().toLowerCase() === "mixed");
  const btnRand  = menuBtns.find(b => (b.textContent || "").trim().toLowerCase() === "random");

  // Make menu visible once JS boots (your HTML waits for this)
  document.body.classList.add("menuReady");

  // ---------------------------
  // Constants / Layout (world coords)
  // ---------------------------
  const DESIGN_W = 900;
  const DESIGN_H = 700;

  // Zones approximate your screenshot layout (you can tweak later)
  const ZONES = {
    centerRow: { x: 250, y: 290, w: 400, h: 140, label: "CENTER ROW" },
    forceTrack: { x: 650, y: 250, w: 40, h: 200, label: "FORCE" },

    p1Deck:    { x: 795, y: 520, w: 70, h: 110, label: "P1 DECK" },
    p1Discard: { x: 795, y: 390, w: 70, h: 110, label: "P1 DISC" },
    p2Deck:    { x: 795, y: 160, w: 70, h: 110, label: "P2 DECK" },
    p2Discard: { x: 795, y:  30, w: 70, h: 110, label: "P2 DISC" },

    p1Hand: { x:  40, y: 500, w: 180, h: 140, label: "P1 HAND" },
    p2Hand: { x:  40, y:  70, w: 180, h: 140, label: "P2 HAND" },

    p1Base: { x: 405, y: 610, w: 90, h: 70, label: "P1 BASE" },
    p2Base: { x: 405, y:  20, w: 90, h: 70, label: "P2 BASE" },

    // Token bins
    p1Tokens: { x: 65, y: 455, w: 120, h: 35, label: "P1 TOKENS" },
    p2Tokens: { x: 65, y: 215, w: 120, h: 35, label: "P2 TOKENS" },
  };

  const WS_BASE = "wss://sw-vtt-rooms-worker.blueberrychick86.workers.dev/ws?room=";

  // ---------------------------
  // Utilities
  // ---------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => Date.now();
  const randHex = (n) => {
    const chars = "abcdef0123456789";
    let s = "";
    for (let i = 0; i < n; i++) s += chars[(Math.random() * chars.length) | 0];
    return s;
  };
  const uid = () => randHex(8) + "_" + now().toString(16);

  function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }

  function getParam(name) {
    try { return new URL(location.href).searchParams.get(name); } catch { return null; }
  }
  function setParam(name, value) {
    const u = new URL(location.href);
    u.searchParams.set(name, value);
    history.replaceState({}, "", u.toString());
  }

  function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
    } catch {}
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand("copy"); } catch {}
    ta.remove();
    return Promise.resolve();
  }

  // iOS / Mobile safety: prevent pinch-to-zoom & double-tap zoom while interacting
  // (We can’t add viewport meta from JS reliably, so we block gesture behavior.)
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gestureend", (e) => e.preventDefault(), { passive: false });

  // ---------------------------
  // Synced game state (authoritative = "host" client)
  // ---------------------------
  const state = {
    v: 1,
    room: "",
    createdAt: now(),
    era: "Original Trilogy",
    mandoNeutral: false,

    // Blue always starts
    turn: { active: "p1", n: 1, startedAt: now() },

    players: {
      p1: { name: "Blue", clientId: null, connected: false },
      p2: { name: "Red",  clientId: null, connected: false },
    },

    // Tabletop objects
    // objects[id] = { id,type,x,y,w,h,rot,faceUp,owner,label,z,tokenType,attachedTo }
    objects: {},

    stacks: {
      p1Deck:    { order: [] },
      p1Discard: { order: [] },
      p2Deck:    { order: [] },
      p2Discard: { order: [] },
    },

    force: { pos: 0 } // 0..10 (0 = far red end, 10 = far blue end)
  };

  // Local-only runtime
  const local = {
    clientId: (() => {
      try {
        const k = "vttClientId";
        let v = sessionStorage.getItem(k);
        if (!v) { v = "c_" + uid(); sessionStorage.setItem(k, v); }
        return v;
      } catch {
        return "c_" + uid();
      }
    })(),
    seatWanted: null,   // "p1" or "p2"
    seat: null,         // finalized seat for POV
    isHost: false,

    ws: null,
    netReady: false,
    lastHostSnapshotAt: 0,
    lastSentAt: 0,
    suppressSendUntil: 0,

    dragging: null, // {id, dx, dy, pointerId}
    lastTouchedId: null,

    cam: { scale: 1, rotDeg: 0, tx: 0, ty: 0 },
  };

  // ---------------------------
  // UI / CSS injection
  // ---------------------------
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --bg:#0b0b0d;
      --panel:#111319;
      --stroke:rgba(255,255,255,.22);
      --stroke2:rgba(255,255,255,.14);
      --text:rgba(255,255,255,.92);
      --muted:rgba(255,255,255,.65);
      --good:#3aa0ff;
      --bad:#ff3a3a;
      --gold:#d9b85a;
    }
    html,body{height:100%;margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;}
    #app{height:100vh;width:100vw;overflow:hidden;position:relative;touch-action:none;}

    .hud{
      position:absolute;left:10px;top:10px;z-index:60;
      display:flex;gap:8px;align-items:center;flex-wrap:wrap;
      background:rgba(10,10,14,.55);backdrop-filter: blur(10px);
      border:1px solid var(--stroke2);border-radius:12px;padding:8px 10px;
      user-select:none;
    }
    .hud .tag{font-size:12px;color:var(--muted)}
    .btn{
      appearance:none;border:1px solid var(--stroke2);
      background:rgba(30,34,44,.65);
      color:var(--text);border-radius:10px;padding:7px 10px;
      font-weight:700;font-size:13px;
    }
    .btn:active{transform:translateY(1px)}
    .btn.primary{border-color:rgba(58,160,255,.55)}
    .btn.danger{border-color:rgba(255,58,58,.45)}
    .btn.ghost{background:transparent}

    .statusDot{width:9px;height:9px;border-radius:99px;display:inline-block;margin-right:6px;background:#666}
    .statusDot.on{background:#39d06f}
    .statusDot.warn{background:#d9b85a}

    .stageWrap{position:absolute;inset:0;overflow:hidden;touch-action:none;}
    .stage{
      position:absolute;left:0;top:0;width:${DESIGN_W}px;height:${DESIGN_H}px;
      transform-origin:center center;
      will-change: transform;
    }

    .zone{
      position:absolute;border:1px solid var(--stroke2);border-radius:10px;
      background:rgba(255,255,255,.02);
      box-shadow:0 0 0 1px rgba(0,0,0,.4) inset;
    }
    .zoneLabel{
      position:absolute;left:8px;top:6px;font-size:11px;color:rgba(255,255,255,.5);
      letter-spacing:.08em;user-select:none;pointer-events:none;
    }

    .tokenBin{display:flex;gap:6px;align-items:center;justify-content:flex-start;padding:6px 8px;}
    .bin{width:18px;height:18px;border-radius:5px;border:1px solid rgba(255,255,255,.22);box-shadow:0 2px 8px rgba(0,0,0,.35);}
    .bin.red{background:#ff3a3a}
    .bin.blue{background:#3aa0ff}
    .bin.gold{background:#d9b85a}

    .obj{
      position:absolute;border:1px solid rgba(255,255,255,.28);border-radius:10px;
      background:rgba(255,255,255,.04);
      box-shadow:0 10px 25px rgba(0,0,0,.35);
      user-select:none;touch-action:none;
      display:flex;align-items:center;justify-content:center;text-align:center;
      padding:6px;
    }
    .obj.card{border-radius:12px}
    .obj.card .t{font-size:12px;line-height:1.15;color:rgba(255,255,255,.88)}
    .obj.card.faceDown{background:rgba(30,34,44,.9)}
    .obj.card.faceDown .t{color:rgba(255,255,255,.35)}

    .obj.token{
      width:26px;height:26px;border-radius:8px;padding:0;
      display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;
    }
    .obj.token.red{background:rgba(255,58,58,.35)}
    .obj.token.blue{background:rgba(58,160,255,.35)}
    .obj.token.gold{background:rgba(217,184,90,.30)}

    .obj.marker{width:24px;height:24px;border-radius:999px;background:rgba(255,255,255,.08)}

    .toast{
      position:absolute;left:50%;bottom:18px;transform:translateX(-50%);
      background:rgba(10,10,14,.72);border:1px solid var(--stroke2);
      padding:8px 10px;border-radius:12px;font-size:13px;z-index:80;
      opacity:0;pointer-events:none;transition:opacity .18s ease;
      max-width:min(92vw,560px);text-align:center;
    }
    .toast.on{opacity:1}

    /* Start menu is your HTML; this makes it look clean on mobile too */
    #startMenu{
      position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:100;
      background:rgba(0,0,0,.68);padding:18px;
    }
    #startMenu .start-menu-window{
      width:min(540px,92vw);
      background:rgba(12,14,18,.92);
      border:1px solid var(--stroke2);border-radius:18px;
      padding:16px 16px 14px;
      box-shadow:0 20px 60px rgba(0,0,0,.55);
    }
    #startMenu .menu-title{margin:0 0 10px;font-size:26px;line-height:1.05;letter-spacing:.04em}
    #startMenu .menu-section{margin:10px 0;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
    #startMenu .menu-btn{
      border:1px solid var(--stroke2);background:rgba(30,34,44,.65);color:var(--text);
      border-radius:12px;padding:10px 12px;font-weight:800;font-size:14px;
    }
    #startMenu .menu-btn.play{border-color:rgba(58,160,255,.55)}
    #startMenu .menu-btn.cancel{border-color:rgba(255,58,58,.45)}
    #startMenu .name-row{display:flex;gap:10px;align-items:center;width:100%}
    #startMenu .name-label{color:var(--muted);min-width:88px}
    #startMenu .name-input{
      flex:1;border:1px solid var(--stroke2);border-radius:12px;
      background:rgba(0,0,0,.25);color:var(--text);
      padding:10px 12px;font-size:14px;outline:none;
    }
    #startMenu .toggle-row{display:flex;gap:10px;align-items:center;color:var(--muted);font-size:13px}

    .inviteBox{
      border:1px solid var(--stroke2);
      background:rgba(0,0,0,.25);
      border-radius:14px;
      padding:10px 12px;
      width:100%;
      color:var(--muted);
      font-size:13px;
      line-height:1.25;
    }
    .inviteBox b{color:var(--text)}
    .inviteActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
  `;
  document.head.appendChild(style);

  // ---------------------------
  // Build game DOM
  // ---------------------------
  const stageWrap = document.createElement("div");
  stageWrap.className = "stageWrap";
  const stage = document.createElement("div");
  stage.className = "stage";
  stageWrap.appendChild(stage);

  const hud = document.createElement("div");
  hud.className = "hud";
  hud.innerHTML = `
    <span class="tag"><span id="netDot" class="statusDot warn"></span><span id="netLabel">Offline</span></span>
    <span class="tag">Room: <b id="roomLabel">—</b></span>
    <span class="tag">Seat: <b id="seatLabel">—</b></span>
    <span class="tag">Turn: <b id="turnLabel">Blue</b></span>
    <button class="btn primary" id="btnDraw">Draw</button>
    <button class="btn" id="btnDiscard">Discard</button>
    <button class="btn" id="btnEndTurn">End Turn</button>
    <button class="btn" id="btnFlip">Flip</button>
    <button class="btn" id="btnRotate">Rotate</button>
    <button class="btn ghost" id="btnHelp">Help</button>
  `;

  const toast = document.createElement("div");
  toast.className = "toast";

  elApp.appendChild(stageWrap);
  elApp.appendChild(hud);
  elApp.appendChild(toast);

  // ---------------------------
  // Toast
  // ---------------------------
  let toastTimer = null;
  function showToast(msg, ms = 2200) {
    toast.textContent = msg;
    toast.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("on"), ms);
  }

  // ---------------------------
  // Zones render
  // ---------------------------
  const zoneDivs = {};
  function addZoneDiv(key, z) {
    const d = document.createElement("div");
    d.className = "zone";
    d.dataset.zone = key;
    d.style.left = z.x + "px";
    d.style.top = z.y + "px";
    d.style.width = z.w + "px";
    d.style.height = z.h + "px";
    const lab = document.createElement("div");
    lab.className = "zoneLabel";
    lab.textContent = z.label || key;
    d.appendChild(lab);
    stage.appendChild(d);
    return d;
  }
  Object.keys(ZONES).forEach(k => zoneDivs[k] = addZoneDiv(k, ZONES[k]));

  function decorateTokenZone(zoneKey) {
    const z = zoneDivs[zoneKey];
    z.classList.add("tokenBin");
    const lab = z.querySelector(".zoneLabel");
    if (lab) lab.style.display = "none";
    z.innerHTML = `
      <div class="bin red" data-spawn="red" title="Spawn red token"></div>
      <div class="bin blue" data-spawn="blue" title="Spawn blue token"></div>
      <div class="bin gold" data-spawn="gold" title="Spawn gold token"></div>
    `;
  }
  decorateTokenZone("p1Tokens");
  decorateTokenZone("p2Tokens");

  // ---------------------------
  // Camera / POV
  // ---------------------------
  function viewportSize() { return { w: window.innerWidth, h: window.innerHeight }; }

  function applyCamera() {
    // POV is camera rotation only:
    // - local seat p1 => rot 0
    // - local seat p2 => rot 180
    const rotDeg = (local.seat === "p2") ? 180 : 0;
    local.cam.rotDeg = rotDeg;

    const vs = viewportSize();
    const scale = Math.min(vs.w / DESIGN_W, vs.h / DESIGN_H);
    local.cam.scale = scale;

    const tx = (vs.w - DESIGN_W * scale) / 2;
    const ty = (vs.h - DESIGN_H * scale) / 2;
    local.cam.tx = tx;
    local.cam.ty = ty;

    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale}) rotate(${rotDeg}deg)`;
  }
  window.addEventListener("resize", applyCamera, { passive: true });

  // Screen -> world inverse mapping (handles rot 180 correctly)
  function screenToWorld(clientX, clientY) {
    const s = local.cam.scale || 1;
    const tx = local.cam.tx || 0;
    const ty = local.cam.ty || 0;
    const rot = (local.cam.rotDeg || 0) * Math.PI / 180;

    let x = (clientX - tx) / s;
    let y = (clientY - ty) / s;

    // undo rotation about center
    const cx = DESIGN_W / 2, cy = DESIGN_H / 2;
    const dx = x - cx, dy = y - cy;
    const cos = Math.cos(-rot), sin = Math.sin(-rot);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return { x: rx + cx, y: ry + cy };
  }

  // ---------------------------
  // Object model helpers
  // ---------------------------
  function bringToFront(id) {
    const o = state.objects[id];
    if (!o) return;
    let maxZ = 1;
    for (const oo of Object.values(state.objects)) maxZ = Math.max(maxZ, oo.z || 1);
    o.z = maxZ + 1;
  }

  function createCard(label, x, y, owner = null, stackId = null, faceUp = true) {
    const id = uid();
    state.objects[id] = {
      id,
      type: "card",
      x, y,
      w: 70, h: 100,
      rot: 0,
      faceUp: !!faceUp,
      owner,
      label: label || "Card",
      z: 10,
      tokenType: null,
      attachedTo: null,
      stackId: stackId || null,
    };
    return id;
  }

  function createToken(tokenType, x, y, owner = null) {
    const id = uid();
    state.objects[id] = {
      id,
      type: "token",
      tokenType,
      x, y,
      w: 26, h: 26,
      rot: 0,
      faceUp: true,
      owner,
      label: tokenType.toUpperCase(),
      z: 20,
      attachedTo: null,
      stackId: null,
    };
    return id;
  }

  function createForceMarkerIfMissing() {
    if (state.objects.forceMarker) return;
    state.objects.forceMarker = {
      id: "forceMarker",
      type: "marker",
      x: ZONES.forceTrack.x + 8,
      y: ZONES.forceTrack.y + ZONES.forceTrack.h - 28,
      w: 24, h: 24,
      rot: 0,
      faceUp: true,
      owner: null,
      label: "",
      z: 30,
      attachedTo: null,
      stackId: null,
    };
  }

  function forcePosToY(pos) {
    const z = ZONES.forceTrack;
    const minY = z.y + 8;
    const maxY = z.y + z.h - 32;
    const t = clamp(pos / 10, 0, 1);
    return maxY + (minY - maxY) * t;
  }

  function updateForceMarkerFromPos() {
    createForceMarkerIfMissing();
    const m = state.objects.forceMarker;
    m.x = ZONES.forceTrack.x + 8;
    m.y = forcePosToY(state.force.pos);
  }

  // Attach token if released over a card
  function attachTokenIfOverCard(tokenId) {
    const t = state.objects[tokenId];
    if (!t || t.type !== "token") return;
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;

    let best = null;
    for (const o of Object.values(state.objects)) {
      if (o.type !== "card") continue;
      if (cx >= o.x && cx <= o.x + o.w && cy >= o.y && cy <= o.y + o.h) {
        if (!best || (o.z || 0) > (best.z || 0)) best = o;
      }
    }
    if (best) {
      t.attachedTo = best.id;
      t.x = best.x + best.w - t.w - 4;
      t.y = best.y + 4;
      t.z = (best.z || 1) + 1;
    } else {
      t.attachedTo = null;
    }
  }

  // ---------------------------
  // Rendering
  // ---------------------------
  const objEls = new Map();

  function ensureObjEl(o) {
    let el = objEls.get(o.id);
    if (el) return el;
    el = document.createElement("div");
    el.className = "obj";
    el.dataset.oid = o.id;
    el.addEventListener("pointerdown", onObjPointerDown, { passive: false });
    el.addEventListener("dblclick", (e) => {
      e.preventDefault();
      if (o.type === "card") toggleFlip(o.id);
    });
    stage.appendChild(el);
    objEls.set(o.id, el);
    return el;
  }

  function renderHUD() {
    const netDot = document.getElementById("netDot");
    const netLabel = document.getElementById("netLabel");
    const roomLabel = document.getElementById("roomLabel");
    const seatLabel = document.getElementById("seatLabel");
    const turnLabel = document.getElementById("turnLabel");

    roomLabel.textContent = state.room ? state.room : "—";
    seatLabel.textContent = local.seat ? (local.seat === "p1" ? "Blue (P1)" : "Red (P2)") : "—";
    turnLabel.textContent = state.turn.active === "p1" ? "Blue" : "Red";

    netDot.classList.remove("on", "warn");
    if (local.netReady) { netDot.classList.add("on"); netLabel.textContent = "Online"; }
    else { netDot.classList.add("warn"); netLabel.textContent = "Offline"; }
  }

  function render() {
    // remove deleted elements
    for (const [id, el] of objEls.entries()) {
      if (!state.objects[id]) { el.remove(); objEls.delete(id); }
    }

    // ensure force marker position consistent
    updateForceMarkerFromPos();

    renderHUD();

    const objects = Object.values(state.objects).sort((a, b) => (a.z || 0) - (b.z || 0));
    for (const o of objects) {
      const el = ensureObjEl(o);
      el.classList.toggle("card", o.type === "card");
      el.classList.toggle("token", o.type === "token");
      el.classList.toggle("marker", o.type === "marker");

      el.style.left = o.x + "px";
      el.style.top = o.y + "px";
      el.style.width = o.w + "px";
      el.style.height = o.h + "px";
      el.style.zIndex = String(o.z || 1);

      // IMPORTANT: We do NOT special-case owner seat rotation.
      // Camera rotation handles POV, so P2 sees opponent upside down naturally.
      el.style.transform = `rotate(${o.rot || 0}deg)`;

      if (o.type === "card") {
        el.classList.toggle("faceDown", !o.faceUp);
        el.innerHTML = `<div class="t">${o.faceUp ? (o.label || "Card") : "—"}</div>`;
      } else if (o.type === "token") {
        el.classList.toggle("red", o.tokenType === "red");
        el.classList.toggle("blue", o.tokenType === "blue");
        el.classList.toggle("gold", o.tokenType === "gold");
        el.innerHTML = `<div class="t">${o.label || ""}</div>`;
      } else if (o.type === "marker") {
        el.innerHTML = "";
      }
    }
  }

  // ---------------------------
  // Core tabletop setup (host creates initial tabletop)
  // ---------------------------
  function seedTabletop() {
    state.objects = {};
    state.stacks.p1Deck.order = [];
    state.stacks.p1Discard.order = [];
    state.stacks.p2Deck.order = [];
    state.stacks.p2Discard.order = [];

    state.force.pos = 0;
    createForceMarkerIfMissing();
    updateForceMarkerFromPos();

    // Create center row placeholders (10)
    const row = ZONES.centerRow;
    const cols = 5, rows = 2;
    const gap = 10, cardW = 70, cardH = 100;

    let idx = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = row.x + 20 + c * (cardW + gap);
        const y = row.y + 20 + r * (cardH + gap);
        createCard("Row " + idx, x, y, null, null, true);
        idx++;
      }
    }

    // Hands (visual)
    for (let i = 0; i < 5; i++) {
      createCard("P1 Hand " + (i + 1), ZONES.p1Hand.x + 10 + i * 32, ZONES.p1Hand.y + 30, "p1");
      createCard("P2 Hand " + (i + 1), ZONES.p2Hand.x + 10 + i * 32, ZONES.p2Hand.y + 30, "p2");
    }

    // Deck stacks (10 each) face-down
    for (let i = 0; i < 10; i++) {
      const id1 = createCard("P1 Deck", ZONES.p1Deck.x + 6, ZONES.p1Deck.y + 6, "p1", "p1Deck", false);
      state.stacks.p1Deck.order.push(id1);

      const id2 = createCard("P2 Deck", ZONES.p2Deck.x + 6, ZONES.p2Deck.y + 6, "p2", "p2Deck", false);
      state.stacks.p2Deck.order.push(id2);
    }

    // Bases
    createCard("P1 Base", ZONES.p1Base.x + 10, ZONES.p1Base.y - 15, "p1");
    createCard("P2 Base", ZONES.p2Base.x + 10, ZONES.p2Base.y - 15, "p2");

    // Turn
    state.turn.active = "p1";
    state.turn.n = 1;
    state.turn.startedAt = now();
  }

  // ---------------------------
  // Object interactions
  // ---------------------------
  function toggleFlip(id) {
    const o = state.objects[id];
    if (!o || o.type !== "card") return;
    o.faceUp = !o.faceUp;
    queueNetSend();
    render();
  }

  function rotate90(id) {
    const o = state.objects[id];
    if (!o) return;
    o.rot = ((o.rot || 0) + 90) % 360;
    queueNetSend();
    render();
  }

  function discardTopmostSelected() {
    const id = local.lastTouchedId;
    if (!id || !state.objects[id]) return showToast("Tap a card first.");
    const o = state.objects[id];
    if (o.type !== "card") return showToast("Tap a card first.");

    const seat = (o.owner === "p2") ? "p2" : "p1"; // default to p1 if owner unknown
    const dz = (seat === "p1") ? ZONES.p1Discard : ZONES.p2Discard;
    o.x = dz.x + 8 + Math.random() * 8;
    o.y = dz.y + 8 + Math.random() * 8;
    o.faceUp = true;
    o.stackId = (seat === "p1") ? "p1Discard" : "p2Discard";
    bringToFront(o.id);

    // push into discard order (best-effort)
    if (seat === "p1") state.stacks.p1Discard.order.push(o.id);
    else state.stacks.p2Discard.order.push(o.id);

    queueNetSend();
    render();
  }

  function drawOne(seat) {
    const stack = (seat === "p2") ? state.stacks.p2Deck : state.stacks.p1Deck;
    if (!stack.order.length) return showToast("Deck empty.");
    const topId = stack.order.pop();
    const c = state.objects[topId];
    if (!c) return;

    const hz = (seat === "p2") ? ZONES.p2Hand : ZONES.p1Hand;
    c.x = hz.x + 12 + Math.random() * (hz.w - 90);
    c.y = hz.y + 30 + Math.random() * (hz.h - 120);
    c.stackId = null;
    c.faceUp = true;
    c.owner = seat;
    bringToFront(c.id);

    queueNetSend();
    render();
  }

  function endTurn() {
    state.turn.active = (state.turn.active === "p1") ? "p2" : "p1";
    state.turn.n += 1;
    state.turn.startedAt = now();
    queueNetSend();
    render();
  }

  // Pointer drag
  function onObjPointerDown(e) {
    const el = e.currentTarget;
    const oid = el.dataset.oid;
    const o = state.objects[oid];
    if (!o) return;

    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch {}

    local.lastTouchedId = oid;

    // Mobile double-tap flip (quick tap twice)
    if (!onObjPointerDown._tap) onObjPointerDown._tap = {};
    const tap = onObjPointerDown._tap;
    const tNow = now();
    if (tap[oid] && (tNow - tap[oid] < 320) && o.type === "card") {
      tap[oid] = 0;
      toggleFlip(oid);
      return;
    }
    tap[oid] = tNow;

    bringToFront(oid);

    // dragging offset in world coords
    const p = screenToWorld(e.clientX, e.clientY);
    local.dragging = { id: oid, dx: p.x - o.x, dy: p.y - o.y, pointerId: e.pointerId };

    // detach token while dragging
    if (o.type === "token") o.attachedTo = null;

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp, { passive: false });

    render();
  }

  function onPointerMove(e) {
    if (!local.dragging) return;
    e.preventDefault();
    const d = local.dragging;
    const o = state.objects[d.id];
    if (!o) return;

    const p = screenToWorld(e.clientX, e.clientY);
    o.x = clamp(p.x - d.dx, -50, DESIGN_W - 10);
    o.y = clamp(p.y - d.dy, -50, DESIGN_H - 10);

    queueNetSend();
    render();
  }

  function onPointerUp(e) {
    if (!local.dragging) return;
    e.preventDefault();
    const d = local.dragging;
    const o = state.objects[d.id];
    local.dragging = null;

    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);

    if (o && o.type === "token") {
      attachTokenIfOverCard(o.id);
      queueNetSend();
    }
    render();
  }

  // Token bin spawn
  stage.addEventListener("pointerdown", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const spawn = t.dataset.spawn;
    if (!spawn) return;
    e.preventDefault();

    const zoneEl = t.closest(".zone");
    let owner = null;
    if (zoneEl && zoneEl.dataset.zone === "p1Tokens") owner = "p1";
    if (zoneEl && zoneEl.dataset.zone === "p2Tokens") owner = "p2";

    const p = screenToWorld(e.clientX, e.clientY);
    createToken(spawn, p.x - 13, p.y - 13, owner);
    queueNetSend();
    render();
  }, { passive: false });

  // Force marker drag (click anywhere in force track to set)
  zoneDivs.forceTrack.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const p = screenToWorld(e.clientX, e.clientY);
    const z = ZONES.forceTrack;
    const minY = z.y + 8;
    const maxY = z.y + z.h - 32;
    const y = clamp(p.y, minY, maxY);
    // invert mapping
    const t = (maxY - y) / (maxY - minY);
    state.force.pos = Math.round(clamp(t * 10, 0, 10));
    updateForceMarkerFromPos();
    queueNetSend();
    render();
  }, { passive: false });

  // ---------------------------
  // HUD buttons
  // ---------------------------
  document.getElementById("btnFlip").addEventListener("click", () => {
    const id = local.lastTouchedId;
    if (!id || !state.objects[id] || state.objects[id].type !== "card") {
      showToast("Double-tap a card to flip (or tap a card then press Flip).");
      return;
    }
    toggleFlip(id);
  });

  document.getElementById("btnRotate").addEventListener("click", () => {
    const id = local.lastTouchedId;
    if (!id || !state.objects[id]) return showToast("Tap a card/token first.");
    rotate90(id);
  });

  document.getElementById("btnDraw").addEventListener("click", () => {
    if (!local.seat) return showToast("Pick Blue or Red first.");
    if (state.turn.active !== local.seat) return showToast("Not your turn.");
    drawOne(local.seat);
  });

  document.getElementById("btnDiscard").addEventListener("click", () => discardTopmostSelected());

  document.getElementById("btnEndTurn").addEventListener("click", () => {
    if (!local.seat) return showToast("Pick Blue or Red first.");
    if (state.turn.active !== local.seat) return showToast("Not your turn.");
    endTurn();
  });

  document.getElementById("btnHelp").addEventListener("click", () => {
    showToast("Drag objects. Double-tap a card to flip. Tokens snap to cards when released on top. Force track: tap inside to move marker.");
  });

  // ---------------------------
  // Networking (Cloudflare WS room worker)
  // We assume the worker is a broadcast relay:
  // - it forwards JSON messages to all clients in the room
  //
  // Messages we use:
  //  - hello: {t:"hello", room, clientId, name, seatWanted, at}
  //  - claim: {t:"claim", room, clientId, seat, name, at} (host assigns seats best-effort)
  //  - snap:  {t:"snap", room, clientId, fromHost:true, state, at} (authoritative host snapshot)
  //  - ping:  {t:"ping", room, clientId, at}
  // ---------------------------
  function wsURL(roomId) { return WS_BASE + encodeURIComponent(roomId); }

  function send(msg) {
    const ws = local.ws;
    if (!ws || ws.readyState !== 1) return false;
    try { ws.send(JSON.stringify(msg)); return true; } catch { return false; }
  }

  function connect(roomId) {
    if (!roomId) return;
    state.room = roomId;

    const ws = new WebSocket(wsURL(roomId));
    local.ws = ws;
    local.netReady = false;
    renderHUD();

    ws.addEventListener("open", () => {
      local.netReady = true;
      renderHUD();

      send({
        t: "hello",
        room: state.room,
        clientId: local.clientId,
        name: getPlayerName(),
        seatWanted: local.seatWanted,
        at: now()
      });

      // Host pushes initial snapshot shortly after connect
      if (local.isHost) {
        // seed tabletop once on host
        seedTabletop();
        queueNetSend(true);
      }

      showToast("Connected. Room: " + state.room);
    });

    ws.addEventListener("message", (ev) => {
      const obj = safeJSON(ev.data);
      if (!obj || obj.room !== state.room) return;

      // Ignore our own echoes if present
      if (obj.clientId && obj.clientId === local.clientId) return;

      if (obj.t === "hello") {
        // Host tries to assign seats based on who is free
        if (local.isHost) handleHelloAsHost(obj);
        return;
      }

      if (obj.t === "claim") {
        // Apply seat assignment
        if (obj.seat === "p1" || obj.seat === "p2") {
          state.players[obj.seat].clientId = obj.clientId || null;
          state.players[obj.seat].name = obj.name || state.players[obj.seat].name;
          state.players[obj.seat].connected = true;

          // If this claim is for us, set our seat and camera
          if (obj.clientId === local.clientId) {
            local.seat = obj.seat;
            applyCamera();
            render();
          }
        }
        renderHUD();
        return;
      }

      if (obj.t === "snap" && obj.state && obj.fromHost) {
        // Accept host-authoritative snapshot
        Object.assign(state, obj.state);
        local.suppressSendUntil = now() + 200;
        if (!local.seat) {
          // If we haven't been assigned, infer seat if our clientId matches
          if (state.players.p1.clientId === local.clientId) local.seat = "p1";
          if (state.players.p2.clientId === local.clientId) local.seat = "p2";
        }
        applyCamera();
        render();
        return;
      }

      if (obj.t === "ping") return;
    });

    ws.addEventListener("close", () => {
      local.netReady = false;
      renderHUD();
      showToast("Disconnected.");
    });

    ws.addEventListener("error", () => {
      local.netReady = false;
      renderHUD();
    });
  }

  function getPlayerName() {
    const v = (elName && elName.value ? elName.value : "").trim();
    return v || "Player";
  }

  function handleHelloAsHost(msg) {
    // Host assigns seat based on availability and preference
    const desired = (msg.seatWanted === "p1" || msg.seatWanted === "p2") ? msg.seatWanted : null;

    // mark connected (best effort)
    if (desired) {
      // if desired seat free, grant it
      if (!state.players[desired].clientId) {
        state.players[desired].clientId = msg.clientId || null;
        state.players[desired].name = msg.name || state.players[desired].name;
        state.players[desired].connected = true;
        send({ t: "claim", room: state.room, clientId: msg.clientId, seat: desired, name: msg.name, at: now() });
        queueNetSend(true);
        return;
      }
    }

    // otherwise grant first free seat
    const free = !state.players.p1.clientId ? "p1" : (!state.players.p2.clientId ? "p2" : null);
    if (free) {
      state.players[free].clientId = msg.clientId || null;
      state.players[free].name = msg.name || state.players[free].name;
      state.players[free].connected = true;
      send({ t: "claim", room: state.room, clientId: msg.clientId, seat: free, name: msg.name, at: now() });
      queueNetSend(true);
    }
  }

  // Host snapshot sender
  function queueNetSend(force = false) {
    if (!local.netReady || !local.ws || local.ws.readyState !== 1) return;
    if (!local.isHost) return; // only host sends authoritative snapshots

    if (now() < local.suppressSendUntil) return;
    if (!queueNetSend._raf || force) {
      if (queueNetSend._raf) cancelAnimationFrame(queueNetSend._raf);
      queueNetSend._raf = requestAnimationFrame(() => {
        queueNetSend._raf = 0;
        // Snapshot throttling (still feels real-time)
        const tNow = now();
        if (!force && (tNow - local.lastHostSnapshotAt) < 60) return;
        local.lastHostSnapshotAt = tNow;

        send({
          t: "snap",
          room: state.room,
          clientId: local.clientId,
          fromHost: true,
          state: state,
          at: tNow
        });
      });
    }
  }

  // ---------------------------
  // Start Menu flow
  // ---------------------------
  function markSelected(btn, on) {
    if (!btn) return;
    btn.style.borderColor = on ? "rgba(58,160,255,.75)" : "rgba(255,255,255,.14)";
    btn.style.boxShadow = on ? "0 0 0 2px rgba(58,160,255,.22) inset" : "none";
  }

  function selectSeat(seat) {
    local.seatWanted = seat;
    markSelected(btnBlue, seat === "p1");
    markSelected(btnRed,  seat === "p2");
  }

  function selectEra(label) {
    state.era = label;
    const all = [btnOT, btnCW, btnMixed, btnRand].filter(Boolean);
    all.forEach(b => markSelected(b, (b.textContent || "").trim() === label));
  }

  if (btnBlue) btnBlue.addEventListener("click", () => selectSeat("p1"));
  if (btnRed)  btnRed.addEventListener("click", () => selectSeat("p2"));

  if (btnOT)    btnOT.addEventListener("click", () => selectEra("Original Trilogy"));
  if (btnCW)    btnCW.addEventListener("click", () => selectEra("Clone Wars"));
  if (btnMixed) btnMixed.addEventListener("click", () => selectEra("Mixed"));
  if (btnRand)  btnRand.addEventListener("click", () => selectEra("Random"));

  if (elMando) {
    elMando.addEventListener("change", () => {
      state.mandoNeutral = !!elMando.checked;
    });
  }

  // If URL includes ?room=xxxx, we are joining
  const roomFromURL = (getParam("room") || "").trim();
  if (roomFromURL) {
    // Joining player: menu stays visible until seat picked, then host will claim
    state.room = roomFromURL;
    // Default seatWanted if none: p2
    if (!local.seatWanted) selectSeat("p2");
    // Auto connect right away (host will claim)
    connect(roomFromURL);
  } else {
    // Hosting (no room yet)
    // Default selections
    if (!local.seatWanted) selectSeat("p1");
    selectEra("Original Trilogy");
  }

  // Host Game button
  elPlay.addEventListener("click", () => {
    const room = roomFromURL || randHex(6).toUpperCase();
    state.room = room;
    state.mandoNeutral = !!(elMando && elMando.checked);

    // Host is this client if no room param exists
    local.isHost = !roomFromURL;
    if (local.isHost) {
      // Host assigns itself immediately to seatWanted (if free)
      const seat = (local.seatWanted === "p2") ? "p2" : "p1";
      local.seat = seat;

      state.players[seat].clientId = local.clientId;
      state.players[seat].name = getPlayerName();
      state.players[seat].connected = true;

      // Start turn always p1 (Blue) regardless of who hosts.
      state.turn.active = "p1";
      state.turn.n = 1;
      state.turn.startedAt = now();

      // Connect WS and seed tabletop
      connect(room);

      // Show invite link UI inside the menu (don’t hide immediately)
      showInviteUI(room);
    } else {
      // Join flow: connect to existing room
      connect(room);
      // We can hide menu once connected + seat assigned
      // but we’ll let user close manually.
      showToast("Joining room " + room + "…");
    }

    applyCamera();
    render();
  });

  // Cancel button just hides menu (doesn't disconnect)
  elCancel.addEventListener("click", () => {
    elStartMenu.style.display = "none";
    applyCamera();
    render();
  });

  function showInviteUI(room) {
    // Inject invite block below host button area
    const existing = elStartMenu.querySelector(".inviteBox");
    if (existing) existing.remove();

    const win = elStartMenu.querySelector(".start-menu-window");
    if (!win) return;

    const invite = document.createElement("div");
    invite.className = "inviteBox";
    const inviteURL = (() => {
      const u = new URL(location.href);
      u.searchParams.set("room", room);
      return u.toString();
    })();

    invite.innerHTML = `
      <div><b>Room:</b> ${room}</div>
      <div style="margin-top:6px"><b>Invite Link:</b> <span style="word-break:break-all">${inviteURL}</span></div>
      <div class="inviteActions">
        <button class="menu-btn play" id="copyInviteBtn">Copy Invite Link</button>
        <button class="menu-btn" id="enterGameBtn">Enter Game</button>
      </div>
      <div style="margin-top:8px">Host stays authoritative: only host pushes sync snapshots.</div>
    `;
    win.appendChild(invite);

    const copyBtn = invite.querySelector("#copyInviteBtn");
    const enterBtn = invite.querySelector("#enterGameBtn");

    if (copyBtn) copyBtn.addEventListener("click", async () => {
      await copyToClipboard(inviteURL);
      showToast("Invite link copied.");
    });

    if (enterBtn) enterBtn.addEventListener("click", () => {
      elStartMenu.style.display = "none";
      // persist room in URL
      setParam("room", room);
      applyCamera();
      render();
    });
  }

  // ---------------------------
  // Boot: initial render/camera
  // ---------------------------
  applyCamera();
  render();

})();
