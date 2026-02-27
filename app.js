/* ========================================================================
   Star Wars Deckbuilding VTT — Rebuild v3 (Exact Board + Correct POV)
   - Board layout matches provided image exactly (DESIGN 848x788)
   - 2×6 battlefield slots (12 total)
   - Force track = 7 discrete snap slots (index 0..6, center = 3)
   - P2 POV: camera rotates 180, cards corrected so local+neutral upright,
     opponent upside down (across-table feel)
   - Invite defaults joiner to opposite seat via URL param seat=p1|p2
   - 2-player online via your existing Cloudflare WS room worker
   - Desktop + mobile / iPhone friendly (pointer events + iOS gesture prevention)
   ======================================================================== */

(() => {
  "use strict";

  // ---------------------------
  // HTML refs (from your index.html)
  // ---------------------------
  const elStartMenu = document.getElementById("startMenu");
  const elApp = document.getElementById("app");
  const elName = document.getElementById("hostNameInput");
  const elMando = document.getElementById("mandoToggle");
  const elPlay = document.getElementById("playBtn");
  const elCancel = document.getElementById("cancelBtn");
  const menuBtns = Array.from(document.querySelectorAll("#startMenu .menu-btn"));

  const btnBlue = menuBtns.find(b => (b.textContent || "").trim().toLowerCase() === "blue");
  const btnRed  = menuBtns.find(b => (b.textContent || "").trim().toLowerCase() === "red");

  const btnOT    = menuBtns.find(b => (b.textContent || "").trim().toLowerCase() === "original trilogy");
  const btnCW    = menuBtns.find(b => (b.textContent || "").trim().toLowerCase() === "clone wars");
  const btnMixed = menuBtns.find(b => (b.textContent || "").trim().toLowerCase() === "mixed");
  const btnRand  = menuBtns.find(b => (b.textContent || "").trim().toLowerCase() === "random");

  document.body.classList.add("menuReady");

  // ---------------------------
  // DESIGN size = your board image size
  // ---------------------------
  const DESIGN_W = 848;
  const DESIGN_H = 788;

  // ---------------------------
  // Exact rectangles extracted from your board image
  // (x,y,w,h) in board/world coords
  // ---------------------------
  const RECT = {
    // Bases (isolated)
    p2Base: { x: 370, y: 39,  w: 61, h: 44, label: "P2 BASE" },
    p1Base: { x: 370, y: 705, w: 61, h: 43, label: "P1 BASE" },

    // Token squares (top & bottom)
    p2TokenR: { x:  86, y: 232, w: 23, h: 22 },
    p2TokenB: { x: 114, y: 232, w: 22, h: 22 },
    p2TokenY: { x: 141, y: 232, w: 23, h: 22 },

    p1TokenR: { x:  86, y: 542, w: 23, h: 23 },
    p1TokenB: { x: 114, y: 542, w: 22, h: 23 },
    p1TokenY: { x: 141, y: 542, w: 23, h: 23 },

    // Left piles (deck + discard) top and bottom
    p2Deck:    { x:  76, y: 261, w: 44, h: 62, label: "P2 DECK" },
    p2Discard: { x: 129, y: 266, w: 44, h: 57, label: "P2 DISC" },

    p1Deck:    { x:  76, y: 474, w: 44, h: 61, label: "P1 DECK" },
    p1Discard: { x: 129, y: 474, w: 44, h: 61, label: "P1 DISC" },

    // Battlefield (2 rows × 6 cols)
    // Row 1 y=328, Row 2 y=398
    bf1_1: { x: 246, y: 328, w: 44, h: 61 },
    bf1_2: { x: 299, y: 328, w: 44, h: 61 },
    bf1_3: { x: 352, y: 328, w: 44, h: 61 },
    bf1_4: { x: 405, y: 328, w: 44, h: 61 },
    bf1_5: { x: 458, y: 328, w: 44, h: 61 },
    bf1_6: { x: 511, y: 328, w: 44, h: 61 },

    bf2_1: { x: 246, y: 398, w: 44, h: 62 },
    bf2_2: { x: 299, y: 398, w: 44, h: 61 },
    bf2_3: { x: 352, y: 398, w: 44, h: 61 },
    bf2_4: { x: 405, y: 398, w: 44, h: 61 },
    bf2_5: { x: 458, y: 398, w: 44, h: 61 },
    bf2_6: { x: 511, y: 398, w: 44, h: 62 },

    // Flank piles beside battlefield (your “tall vertical slots” in description)
    flankLeft:  { x: 188, y: 363, w: 44, h: 61, label: "FLANK L" },
    flankRight: { x: 569, y: 363, w: 45, h: 61, label: "FLANK R" },

    // Right-side single slot beside force (present in image)
    rightOfForce: { x: 658, y: 363, w: 44, h: 61, label: "R SLOT" },

    // Right player auxiliary zones (top pair & bottom pair)
    p2AuxA: { x: 588, y: 252, w: 43, h: 62, label: "P2 AUX A" },
    p2AuxB: { x: 640, y: 252, w: 44, h: 62, label: "P2 AUX B" },

    p1AuxA: { x: 587, y: 474, w: 44, h: 61, label: "P1 AUX A" },
    p1AuxB: { x: 640, y: 474, w: 44, h: 61, label: "P1 AUX B" },

    // Force track ladder (7 discrete snap slots live inside this strip)
    forceStrip: { x: 622, y: 328, w: 27, h: 132, label: "FORCE" },

    // Far-right tall stacks (in image; keeping as shared piles for now)
    tallTop:    { x: 716, y: 186, w: 62, h: 164, label: "TALL TOP" },
    tallBottom: { x: 716, y: 438, w: 62, h: 163, label: "TALL BOT" },
  };

  // Derived “zones” used for placement/snap. (Rectangles above are ground truth.)
  const ZONES = {
    p2Base: RECT.p2Base,
    p1Base: RECT.p1Base,

    p2Deck: RECT.p2Deck,
    p2Discard: RECT.p2Discard,
    p1Deck: RECT.p1Deck,
    p1Discard: RECT.p1Discard,

    flankLeft: RECT.flankLeft,
    flankRight: RECT.flankRight,

    p2AuxA: RECT.p2AuxA,
    p2AuxB: RECT.p2AuxB,
    p1AuxA: RECT.p1AuxA,
    p1AuxB: RECT.p1AuxB,

    rightOfForce: RECT.rightOfForce,
    forceStrip: RECT.forceStrip,

    tallTop: RECT.tallTop,
    tallBottom: RECT.tallBottom,
  };

  const BF_SLOTS = [
    RECT.bf1_1, RECT.bf1_2, RECT.bf1_3, RECT.bf1_4, RECT.bf1_5, RECT.bf1_6,
    RECT.bf2_1, RECT.bf2_2, RECT.bf2_3, RECT.bf2_4, RECT.bf2_5, RECT.bf2_6,
  ];

  const TOKEN_BINS = {
    p2: { r: RECT.p2TokenR, b: RECT.p2TokenB, y: RECT.p2TokenY },
    p1: { r: RECT.p1TokenR, b: RECT.p1TokenB, y: RECT.p1TokenY },
  };

  // WS (from your old file)
  const WS_BASE = "wss://sw-vtt-rooms-worker.blueberrychick86.workers.dev/ws?room=";

  // ---------------------------
  // Helpers
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
  const safeJSON = (s) => { try { return JSON.parse(s); } catch { return null; } };

  function getParam(name) { try { return new URL(location.href).searchParams.get(name); } catch { return null; } }
  function setParam(name, value) {
    const u = new URL(location.href);
    u.searchParams.set(name, value);
    history.replaceState({}, "", u.toString());
  }

  function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    } catch {}
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

  // iOS gesture prevention
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gestureend", (e) => e.preventDefault(), { passive: false });

  // ---------------------------
  // Game state (host authoritative)
  // ---------------------------
  const state = {
    v: 3,
    room: "",
    createdAt: now(),
    era: "Original Trilogy",
    mandoNeutral: false,

    turn: { active: "p1", n: 1, startedAt: now() },

    players: {
      p1: { name: "Blue", clientId: null, connected: false },
      p2: { name: "Red",  clientId: null, connected: false },
    },

    objects: {},

    stacks: {
      p1Deck:    { order: [] },
      p1Discard: { order: [] },
      p2Deck:    { order: [] },
      p2Discard: { order: [] },
    },

    // Force ladder: 7 discrete positions, center = 3
    force: { idx: 3 }
  };

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

    seatWanted: null,
    seat: null,
    isHost: false,

    ws: null,
    netReady: false,
    lastHostSnapshotAt: 0,
    suppressSendUntil: 0,

    dragging: null,
    lastTouchedId: null,

    cam: { scale: 1, rotDeg: 0, tx: 0, ty: 0 },
  };

  // ---------------------------
  // CSS
  // ---------------------------
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --bg:#0b0b0d;
      --stroke:rgba(255,255,255,.22);
      --stroke2:rgba(255,255,255,.14);
      --text:rgba(255,255,255,.92);
      --muted:rgba(255,255,255,.65);
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
      font-weight:800;font-size:13px;
    }
    .btn:active{transform:translateY(1px)}
    .btn.primary{border-color:rgba(58,160,255,.55)}
    .btn.ghost{background:transparent}

    .statusDot{width:9px;height:9px;border-radius:99px;display:inline-block;margin-right:6px;background:#666}
    .statusDot.on{background:#39d06f}
    .statusDot.warn{background:#d9b85a}

    .stageWrap{position:absolute;inset:0;overflow:hidden;touch-action:none;}
    .stage{
      position:absolute;left:0;top:0;width:${DESIGN_W}px;height:${DESIGN_H}px;
      transform-origin:center center;will-change: transform;
    }

    .zone{
      position:absolute;border:1px solid rgba(255,255,255,.18);border-radius:10px;
      background:rgba(255,255,255,.01);
      pointer-events:none;
    }

    .obj{
      position:absolute;border:1px solid rgba(255,255,255,.26);border-radius:10px;
      background:rgba(255,255,255,.035);
      box-shadow:0 10px 25px rgba(0,0,0,.35);
      user-select:none;touch-action:none;
      display:flex;align-items:center;justify-content:center;text-align:center;
      padding:6px;
    }
    .obj.card{border-radius:12px}
    .obj.card .t{font-size:11px;line-height:1.15;color:rgba(255,255,255,.88)}
    .obj.card.faceDown{background:rgba(30,34,44,.9)}
    .obj.card.faceDown .t{color:rgba(255,255,255,.35)}

    .obj.token{
      width:22px;height:22px;border-radius:6px;padding:0;
      display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;
    }
    .obj.token.red{background:rgba(255,58,58,.45)}
    .obj.token.blue{background:rgba(58,160,255,.45)}
    .obj.token.gold{background:rgba(217,184,90,.42)}

    .obj.force{
      width:20px;height:20px;border-radius:999px;
      background:rgba(255,255,255,.12);
      border:1px solid rgba(255,255,255,.35);
      box-shadow:0 8px 20px rgba(0,0,0,.35);
      padding:0;
    }

    .toast{
      position:absolute;left:50%;bottom:18px;transform:translateX(-50%);
      background:rgba(10,10,14,.72);border:1px solid var(--stroke2);
      padding:8px 10px;border-radius:12px;font-size:13px;z-index:80;
      opacity:0;pointer-events:none;transition:opacity .18s ease;
      max-width:min(92vw,560px);text-align:center;
    }
    .toast.on{opacity:1}

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
  // DOM
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

  let toastTimer = null;
  function showToast(msg, ms = 2200) {
    toast.textContent = msg;
    toast.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("on"), ms);
  }

  // Debug zones (visual outlines)
  function addZoneOutline(r) {
    const d = document.createElement("div");
    d.className = "zone";
    d.style.left = r.x + "px";
    d.style.top = r.y + "px";
    d.style.width = r.w + "px";
    d.style.height = r.h + "px";
    stage.appendChild(d);
  }

  // outlines for fixed rectangles
  Object.values(ZONES).forEach(addZoneOutline);
  BF_SLOTS.forEach(addZoneOutline);
  // token squares outlines
  Object.values(TOKEN_BINS.p1).forEach(addZoneOutline);
  Object.values(TOKEN_BINS.p2).forEach(addZoneOutline);

  // ---------------------------
  // Camera (seat POV)
  // ---------------------------
  function viewportSize() { return { w: window.innerWidth, h: window.innerHeight }; }

  function applyCamera() {
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

  function screenToWorld(clientX, clientY) {
    const s = local.cam.scale || 1;
    const tx = local.cam.tx || 0;
    const ty = local.cam.ty || 0;
    const rot = (local.cam.rotDeg || 0) * Math.PI / 180;

    let x = (clientX - tx) / s;
    let y = (clientY - ty) / s;

    const cx = DESIGN_W / 2, cy = DESIGN_H / 2;
    const dx = x - cx, dy = y - cy;
    const cos = Math.cos(-rot), sin = Math.sin(-rot);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return { x: rx + cx, y: ry + cy };
  }

  // ---------------------------
  // Objects
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
      id, type: "card",
      x, y,
      w: 44, h: 61,
      rot: 0,
      faceUp: !!faceUp,
      owner,            // "p1"|"p2"|null
      label: label || "Card",
      z: 10,
      attachedTo: null,
      stackId: stackId || null
    };
    return id;
  }

  function createToken(tokenType, x, y, owner = null) {
    const id = uid();
    state.objects[id] = {
      id, type: "token",
      tokenType, owner,
      x, y,
      w: 22, h: 22,
      rot: 0,
      faceUp: true,
      label: tokenType.toUpperCase(),
      z: 20,
      attachedTo: null,
      stackId: null
    };
    return id;
  }

  function createForceMarkerIfMissing() {
    if (state.objects.forceMarker) return;
    state.objects.forceMarker = {
      id: "forceMarker",
      type: "force",
      x: 0, y: 0,
      w: 20, h: 20,
      rot: 0,
      faceUp: true,
      owner: null,
      label: "",
      z: 40
    };
  }

  // Force snap points (7 slots) inside forceStrip.
  // We place 7 evenly spaced centers from top to bottom.
  function forceSlotCenters() {
    const r = RECT.forceStrip;
    const n = 7;
    const centers = [];
    const topPad = 10;
    const botPad = 10;
    const usable = (r.h - topPad - botPad);
    for (let i = 0; i < n; i++) {
      const t = (n === 1) ? 0.5 : (i / (n - 1));
      const cy = r.y + topPad + usable * t;
      const cx = r.x + r.w / 2;
      centers.push({ i, cx, cy });
    }
    return centers;
  }

  function setForceIndex(idx) {
    state.force.idx = clamp(idx|0, 0, 6);
    updateForceMarkerFromIndex();
    queueNetSend();
    render();
  }

  function updateForceMarkerFromIndex() {
    createForceMarkerIfMissing();
    const m = state.objects.forceMarker;
    const pts = forceSlotCenters();
    const p = pts[clamp(state.force.idx|0, 0, 6)];
    m.x = p.cx - m.w / 2;
    m.y = p.cy - m.h / 2;
  }

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
      t.x = best.x + best.w - t.w - 2;
      t.y = best.y + 2;
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

  // Card visual correction:
  // - viewer seat sees their own + neutral upright
  // - opponent upside down
  function extraVisualRotationForCard(o) {
    if (!local.seat) return 0;
    const viewer = local.seat;     // p1|p2
    const owner = o.owner || null; // p1|p2|null
    const camRot = (viewer === "p2") ? 180 : 0;
    const isOpponent = (owner && owner !== viewer);

    if (camRot === 0) return isOpponent ? 180 : 0;
    return isOpponent ? 0 : 180;
  }

  function render() {
    // remove deleted
    for (const [id, el] of objEls.entries()) {
      if (!state.objects[id]) { el.remove(); objEls.delete(id); }
    }

    updateForceMarkerFromIndex();
    renderHUD();

    const objects = Object.values(state.objects).sort((a, b) => (a.z || 0) - (b.z || 0));

    for (const o of objects) {
      const el = ensureObjEl(o);

      el.classList.toggle("card", o.type === "card");
      el.classList.toggle("token", o.type === "token");
      el.classList.toggle("force", o.type === "force");

      el.style.left = o.x + "px";
      el.style.top = o.y + "px";
      el.style.width = o.w + "px";
      el.style.height = o.h + "px";
      el.style.zIndex = String(o.z || 1);

      let rot = (o.rot || 0);
      if (o.type === "card") rot += extraVisualRotationForCard(o);
      el.style.transform = `rotate(${rot}deg)`;

      if (o.type === "card") {
        el.classList.toggle("faceDown", !o.faceUp);
        el.innerHTML = `<div class="t">${o.faceUp ? (o.label || "Card") : "—"}</div>`;
      } else if (o.type === "token") {
        el.classList.toggle("red", o.tokenType === "red");
        el.classList.toggle("blue", o.tokenType === "blue");
        el.classList.toggle("gold", o.tokenType === "gold");
        el.innerHTML = `<div class="t">${o.label || ""}</div>`;
      } else if (o.type === "force") {
        el.innerHTML = "";
      }
    }
  }

  // ---------------------------
  // Seed board (host)
  // ---------------------------
  function seedTabletop() {
    state.objects = {};
    state.stacks.p1Deck.order = [];
    state.stacks.p1Discard.order = [];
    state.stacks.p2Deck.order = [];
    state.stacks.p2Discard.order = [];

    state.force.idx = 3;
    createForceMarkerIfMissing();
    updateForceMarkerFromIndex();

    // Battlefield 12 slots (neutral)
    for (let i = 0; i < BF_SLOTS.length; i++) {
      const r = BF_SLOTS[i];
      createCard("Row " + (i + 1), r.x, r.y, null, null, true);
    }

    // Bases (owner-specific)
    createCard("P2 Base", RECT.p2Base.x, RECT.p2Base.y, "p2", null, true);
    createCard("P1 Base", RECT.p1Base.x, RECT.p1Base.y, "p1", null, true);

    // Left deck stacks: create 10 cards in each deck pile (face-down)
    for (let i = 0; i < 10; i++) {
      const idP2 = createCard("P2 Deck", RECT.p2Deck.x, RECT.p2Deck.y, "p2", "p2Deck", false);
      state.stacks.p2Deck.order.push(idP2);

      const idP1 = createCard("P1 Deck", RECT.p1Deck.x, RECT.p1Deck.y, "p1", "p1Deck", false);
      state.stacks.p1Deck.order.push(idP1);
    }

    // Flanks + right-of-force slot (neutral placeholders)
    createCard("Flank L", RECT.flankLeft.x, RECT.flankLeft.y, null, null, true);
    createCard("Flank R", RECT.flankRight.x, RECT.flankRight.y, null, null, true);
    createCard("R Slot",  RECT.rightOfForce.x, RECT.rightOfForce.y, null, null, true);

    // Aux zones (owner-specific placeholders)
    createCard("P2 Aux A", RECT.p2AuxA.x, RECT.p2AuxA.y, "p2", null, true);
    createCard("P2 Aux B", RECT.p2AuxB.x, RECT.p2AuxB.y, "p2", null, true);
    createCard("P1 Aux A", RECT.p1AuxA.x, RECT.p1AuxA.y, "p1", null, true);
    createCard("P1 Aux B", RECT.p1AuxB.x, RECT.p1AuxB.y, "p1", null, true);

    // Tall stacks (neutral placeholders)
    createCard("Tall Top", RECT.tallTop.x + 8, RECT.tallTop.y + 8, null, null, false);
    createCard("Tall Bot", RECT.tallBottom.x + 8, RECT.tallBottom.y + 8, null, null, false);

    // Blue always starts
    state.turn.active = "p1";
    state.turn.n = 1;
    state.turn.startedAt = now();
  }

  // ---------------------------
  // Actions
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

  function discardSelected() {
    const id = local.lastTouchedId;
    if (!id || !state.objects[id]) return showToast("Tap a card first.");
    const o = state.objects[id];
    if (o.type !== "card") return showToast("Tap a card first.");

    const seat = (o.owner === "p2") ? "p2" : "p1";
    const dz = (seat === "p2") ? RECT.p2Discard : RECT.p1Discard;

    o.x = dz.x + 2 + Math.random() * 4;
    o.y = dz.y + 2 + Math.random() * 4;
    o.faceUp = true;
    o.stackId = (seat === "p2") ? "p2Discard" : "p1Discard";
    bringToFront(o.id);

    if (seat === "p2") state.stacks.p2Discard.order.push(o.id);
    else state.stacks.p1Discard.order.push(o.id);

    queueNetSend();
    render();
  }

  function drawOne(seat) {
    const stack = (seat === "p2") ? state.stacks.p2Deck : state.stacks.p1Deck;
    if (!stack.order.length) return showToast("Deck empty.");
    const topId = stack.order.pop();
    const c = state.objects[topId];
    if (!c) return;

    // Place “hand” near token bins for that seat (no guessing visual slots)
    const bin = (seat === "p2") ? TOKEN_BINS.p2 : TOKEN_BINS.p1;
    const baseX = bin.r.x + 10;
    const baseY = (seat === "p2") ? (bin.r.y + 50) : (bin.r.y - 85);

    c.x = clamp(baseX + Math.random() * 80, 10, DESIGN_W - 80);
    c.y = clamp(baseY + Math.random() * 30, 10, DESIGN_H - 80);

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

  // ---------------------------
  // Pointer drag
  // ---------------------------
  function onObjPointerDown(e) {
    const el = e.currentTarget;
    const oid = el.dataset.oid;
    const o = state.objects[oid];
    if (!o) return;

    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch {}

    local.lastTouchedId = oid;

    // Mobile double-tap flip
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

    const p = screenToWorld(e.clientX, e.clientY);
    local.dragging = { id: oid, dx: p.x - o.x, dy: p.y - o.y, pointerId: e.pointerId };

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
    o.x = clamp(p.x - d.dx, -60, DESIGN_W - 10);
    o.y = clamp(p.y - d.dy, -60, DESIGN_H - 10);

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

  // Spawn tokens when clicking the colored squares (exact hit areas)
  function pointInRect(p, r) {
    return (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
  }

  stage.addEventListener("pointerdown", (e) => {
    const p = screenToWorld(e.clientX, e.clientY);

    // Force strip click: snap to nearest of 7
    if (pointInRect(p, RECT.forceStrip)) {
      e.preventDefault();
      const pts = forceSlotCenters();
      let best = pts[0];
      let bestD = Infinity;
      for (const t of pts) {
        const d = Math.abs(p.y - t.cy);
        if (d < bestD) { bestD = d; best = t; }
      }
      setForceIndex(best.i);
      return;
    }

    // Token squares
    const hit = (seatKey, colorKey, tokenType) => {
      const r = TOKEN_BINS[seatKey][colorKey];
      if (pointInRect(p, r)) {
        e.preventDefault();
        createToken(tokenType, r.x + 1, r.y + 1, seatKey);
        queueNetSend();
        render();
        return true;
      }
      return false;
    };

    if (hit("p2", "r", "red")) return;
    if (hit("p2", "b", "blue")) return;
    if (hit("p2", "y", "gold")) return;
    if (hit("p1", "r", "red")) return;
    if (hit("p1", "b", "blue")) return;
    if (hit("p1", "y", "gold")) return;

  }, { passive: false });

  // ---------------------------
  // HUD buttons
  // ---------------------------
  document.getElementById("btnFlip").addEventListener("click", () => {
    const id = local.lastTouchedId;
    if (!id || !state.objects[id] || state.objects[id].type !== "card") {
      showToast("Double-tap a card to flip (or tap then press Flip).");
      return;
    }
    toggleFlip(id);
  });

  document.getElementById("btnRotate").addEventListener("click", () => {
    const id = local.lastTouchedId;
    if (!id || !state.objects[id]) return showToast("Tap a piece first.");
    rotate90(id);
  });

  document.getElementById("btnDraw").addEventListener("click", () => {
    if (!local.seat) return showToast("Seat not assigned yet.");
    if (state.turn.active !== local.seat) return showToast("Not your turn.");
    drawOne(local.seat);
  });

  document.getElementById("btnDiscard").addEventListener("click", () => discardSelected());

  document.getElementById("btnEndTurn").addEventListener("click", () => {
    if (!local.seat) return showToast("Seat not assigned yet.");
    if (state.turn.active !== local.seat) return showToast("Not your turn.");
    endTurn();
  });

  document.getElementById("btnHelp").addEventListener("click", () => {
    showToast("Drag pieces. Double-tap to flip. Force track snaps to 7 slots. Tokens: tap colored squares to spawn, drop onto cards to attach.");
  });

  // ---------------------------
  // Networking
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
    render();

    ws.addEventListener("open", () => {
      local.netReady = true;
      render();

      send({
        t: "hello",
        room: state.room,
        clientId: local.clientId,
        name: getPlayerName(),
        seatWanted: local.seatWanted,
        at: now()
      });

      if (local.isHost) {
        seedTabletop();
        queueNetSend(true);
      }

      showToast("Connected. Room: " + state.room);
    });

    ws.addEventListener("message", (ev) => {
      const obj = safeJSON(ev.data);
      if (!obj || obj.room !== state.room) return;
      if (obj.clientId && obj.clientId === local.clientId) return;

      if (obj.t === "hello") {
        if (local.isHost) handleHelloAsHost(obj);
        return;
      }

      if (obj.t === "claim") {
        if (obj.seat === "p1" || obj.seat === "p2") {
          state.players[obj.seat].clientId = obj.clientId || null;
          state.players[obj.seat].name = obj.name || state.players[obj.seat].name;
          state.players[obj.seat].connected = true;

          if (obj.clientId === local.clientId) {
            local.seat = obj.seat;
            applyCamera();
            render();
          }
        }
        render();
        return;
      }

      if (obj.t === "snap" && obj.state && obj.fromHost) {
        Object.assign(state, obj.state);
        local.suppressSendUntil = now() + 200;

        if (!local.seat) {
          if (state.players.p1.clientId === local.clientId) local.seat = "p1";
          if (state.players.p2.clientId === local.clientId) local.seat = "p2";
        }

        applyCamera();
        render();
        return;
      }
    });

    ws.addEventListener("close", () => {
      local.netReady = false;
      render();
      showToast("Disconnected.");
    });

    ws.addEventListener("error", () => {
      local.netReady = false;
      render();
    });
  }

  function handleHelloAsHost(msg) {
    const desired = (msg.seatWanted === "p1" || msg.seatWanted === "p2") ? msg.seatWanted : null;

    if (desired && !state.players[desired].clientId) {
      state.players[desired].clientId = msg.clientId || null;
      state.players[desired].name = msg.name || state.players[desired].name;
      state.players[desired].connected = true;
      send({ t: "claim", room: state.room, clientId: msg.clientId, seat: desired, name: msg.name, at: now() });
      queueNetSend(true);
      return;
    }

    const free = !state.players.p1.clientId ? "p1" : (!state.players.p2.clientId ? "p2" : null);
    if (free) {
      state.players[free].clientId = msg.clientId || null;
      state.players[free].name = msg.name || state.players[free].name;
      state.players[free].connected = true;
      send({ t: "claim", room: state.room, clientId: msg.clientId, seat: free, name: msg.name, at: now() });
      queueNetSend(true);
    }
  }

  function queueNetSend(force = false) {
    if (!local.netReady || !local.ws || local.ws.readyState !== 1) return;
    if (!local.isHost) return;
    if (now() < local.suppressSendUntil) return;

    if (!queueNetSend._raf || force) {
      if (queueNetSend._raf) cancelAnimationFrame(queueNetSend._raf);
      queueNetSend._raf = requestAnimationFrame(() => {
        queueNetSend._raf = 0;
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
  // Menu logic + auto-opposite invite seat
  // ---------------------------
  function getPlayerName() {
    const v = (elName && elName.value ? elName.value : "").trim();
    return v || "Player";
  }

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
  if (elMando) elMando.addEventListener("change", () => { state.mandoNeutral = !!elMando.checked; });

  const roomFromURL = (getParam("room") || "").trim();
  const seatFromURL = (getParam("seat") || "").trim().toLowerCase();

  if (roomFromURL) {
    if (seatFromURL === "p1" || seatFromURL === "p2") selectSeat(seatFromURL);
    else selectSeat("p2");
    connect(roomFromURL);
  } else {
    selectSeat("p1");
    selectEra("Original Trilogy");
  }

  function showInviteUI(room, inviteSeatForJoiner) {
    const existing = elStartMenu.querySelector(".inviteBox");
    if (existing) existing.remove();

    const win = elStartMenu.querySelector(".start-menu-window");
    if (!win) return;

    const inviteURL = (() => {
      const u = new URL(location.href);
      u.searchParams.set("room", room);
      u.searchParams.set("seat", inviteSeatForJoiner);
      return u.toString();
    })();

    const invite = document.createElement("div");
    invite.className = "inviteBox";
    invite.innerHTML = `
      <div><b>Room:</b> ${room}</div>
      <div style="margin-top:6px"><b>Invite Link:</b> <span style="word-break:break-all">${inviteURL}</span></div>
      <div class="inviteActions">
        <button class="btn primary" id="copyInviteBtn">Copy Invite Link</button>
        <button class="btn" id="enterGameBtn">Enter Game</button>
      </div>
      <div style="margin-top:8px">Joiner auto-defaults to <b>${inviteSeatForJoiner.toUpperCase()}</b>.</div>
    `;
    win.appendChild(invite);

    invite.querySelector("#copyInviteBtn")?.addEventListener("click", async () => {
      await copyToClipboard(inviteURL);
      showToast("Invite link copied.");
    });

    invite.querySelector("#enterGameBtn")?.addEventListener("click", () => {
      elStartMenu.style.display = "none";
      setParam("room", room);
      applyCamera();
      render();
    });
  }

  elPlay.addEventListener("click", () => {
    const room = roomFromURL || randHex(6).toUpperCase();
    state.room = room;
    state.mandoNeutral = !!(elMando && elMando.checked);

    local.isHost = !roomFromURL;

    if (local.isHost) {
      const seat = (local.seatWanted === "p2") ? "p2" : "p1";
      local.seat = seat;

      state.players[seat].clientId = local.clientId;
      state.players[seat].name = getPlayerName();
      state.players[seat].connected = true;

      state.turn.active = "p1";
      state.turn.n = 1;
      state.turn.startedAt = now();

      connect(room);

      const inviteSeat = (seat === "p1") ? "p2" : "p1";
      showInviteUI(room, inviteSeat);
    } else {
      connect(room);
      showToast("Joining room " + room + "…");
    }

    applyCamera();
    render();
  });

  elCancel.addEventListener("click", () => {
    elStartMenu.style.display = "none";
    applyCamera();
    render();
  });

  // ---------------------------
  // Boot
  // ---------------------------
  applyCamera();
  render();

})();
