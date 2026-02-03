// ===== BUILD STAMP (if you don't see this in console + badge, you're not running this file) =====
const BUILD_ID = "VTT_BASELINE_REWORK_2026-02-03__LAYERS+TOKENBINS+TRAYBTN";
console.log("VTT BUILD:", BUILD_ID);

// ---------- base page ----------
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.height = "100vh";
document.body.style.background = "#000";
document.body.style.overflow = "hidden";
document.body.style.touchAction = "none";
document.body.style.fontFamily = "Arial, sans-serif";

const app = document.getElementById("app");
if (!app) {
  document.body.innerHTML = `<div style="color:white;padding:16px;font-family:Arial">Missing #app container in index.html</div>`;
  throw new Error("Missing #app container");
}
app.innerHTML = "";

// ---------- constants ----------
const CARD_W = 86;
const CARD_H = Math.round((CARD_W * 3.5) / 2.5);
const BASE_W = CARD_H;
const BASE_H = CARD_W;

const GAP = 18;
const BIG_GAP = 28;

const FORCE_SLOTS = 7;
const FORCE_NEUTRAL_INDEX = 3;
const FORCE_MARKER_SIZE = 28;

const CAP_SLOTS = 7;
const CAP_OVERLAP = Math.round(BASE_H * 0.45);
const CAP_W = BASE_W;
const CAP_H = BASE_H + (CAP_SLOTS - 1) * CAP_OVERLAP;
const CAP_Z_BASE = 20000;

const BASE_ROW_GAP = 480;
const CAP_DISCARD_GAP = 26;
const EXILE_GAP = GAP;

// Tray drag tuning
const TRAY_HOLD_TO_DRAG_MS = 260;
const TRAY_MOVE_CANCEL_PX = 8;
const TRAY_TAP_MOVE_PX = 6;

// -------- token system --------
// Per-player pools (you can tweak these any time)
const TOKENS_DAMAGE_PER_PLAYER   = 25; // red (persistent)
const TOKENS_ATTACK_PER_PLAYER   = 30; // blue (temporary per turn)
const TOKENS_RESOURCE_PER_PLAYER = 20; // gold (temporary per turn)

// Spawned cube size (small enough to sit on cards)
const TOKEN_SIZE = 18;

// Source cube visual size (and hit area) — user wanted these visibly larger
const TOKEN_BANK_CUBE_SIZE = 46;

// Hit area should match the visible cube size (no huge invisible area)
const TOKEN_BIN_HIT = TOKEN_BANK_CUBE_SIZE;
const TOKEN_BIN_GAP = 10;

// ---------- helpers ----------
let DESIGN_W = 1;
let DESIGN_H = 1;
function rect(x, y, w, h) { return { x, y, w, h }; }

// ---------- CSS ----------
const style = document.createElement("style");
style.textContent = `
  #table { position: fixed; inset: 0; background: #000; overflow: hidden; touch-action: none; }

  #hud {
    position: fixed; left: 10px; top: 10px; z-index: 100000;
    display:flex; gap:6px; flex-wrap:wrap; pointer-events:auto;
  }
  .hudBtn {
    background: rgba(255,255,255,0.10); color:#fff;
    border:1px solid rgba(255,255,255,0.22); border-radius:8px;
    padding:6px 8px; font-weight:900; letter-spacing:0.4px; font-size:11px; line-height:1;
    user-select:none; touch-action:manipulation; cursor:pointer;
  }

  #buildBadge{
    position: fixed; left: 10px; bottom: 10px; z-index: 999999;
    background: rgba(0,0,0,0.72);
    border: 1px solid rgba(255,255,255,0.18);
    color: rgba(255,255,255,0.90);
    padding: 8px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.3px;
    pointer-events:none;
    max-width: min(92vw, 520px);
    overflow:hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #stage { position:absolute; left:0; top:0; transform-origin:0 0; will-change:transform; }
  .layer{ position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; }
  #zonesLayer{ pointer-events:auto; }
  #piecesLayer{ pointer-events:auto; }
  #uiLayer{ pointer-events:auto; }

  .zone { position:absolute; border:2px solid rgba(255,255,255,0.35); border-radius:10px; box-sizing:border-box; background:transparent; }
  .zone.clickable{ cursor:pointer; }
  .zone.clickable:hover{ border-color: rgba(255,255,255,0.60); background: rgba(255,255,255,0.03); }

  .forceSlot {
    position:absolute; border-radius:10px; box-sizing:border-box;
    border:1px dashed rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.02); pointer-events:none;
  }
  .forceSlot.neutral { border:1px dashed rgba(255,255,255,0.35); background: rgba(255,255,255,0.06); }

  .forceMarker {
    position:absolute; width:${FORCE_MARKER_SIZE}px; height:${FORCE_MARKER_SIZE}px; border-radius:999px;
    border:2px solid rgba(255,255,255,0.9); background: rgba(120,180,255,0.22);
    box-shadow:0 8px 20px rgba(0,0,0,0.6); box-sizing:border-box; z-index:99999;
    touch-action:none; cursor:grab;
  }

  .capSlot {
    position:absolute; border-radius:10px; box-sizing:border-box;
    border:1px dashed rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.01); pointer-events:none;
  }

  .card {
    position:absolute; border:2px solid rgba(255,255,255,0.85); border-radius:10px; background:#111;
    box-sizing:border-box; user-select:none; touch-action:none; cursor:grab; overflow:hidden;
  }
  .cardFace { position:absolute; inset:0; background-size:cover; background-position:center; will-change:transform; }
  .cardBack {
    position:absolute; inset:0;
    background: repeating-linear-gradient(45deg, rgba(255,255,255,0.10), rgba(255,255,255,0.10) 8px, rgba(0,0,0,0.25) 8px, rgba(0,0,0,0.25) 16px);
    display:none; align-items:center; justify-content:center; color: rgba(255,255,255,0.92);
    font-weight: 900; letter-spacing: 0.6px; text-transform: uppercase; text-shadow: 0 2px 8px rgba(0,0,0,0.7);
  }
  .card[data-face='down'] .cardBack { display:flex; }
  .card[data-face='down'] .cardFace { filter: brightness(0.35); }

  /* token banks */
  .tokenBank{
    position:absolute; background: transparent; border:none; padding:0; box-sizing:border-box;
    pointer-events:auto;
  }
  .tokenBinsRow{
    display:flex; gap:${TOKEN_BIN_GAP}px; align-items:center; justify-content:flex-start;
  }
  .tokenBin{
    width:${TOKEN_BIN_HIT}px; height:${TOKEN_BIN_HIT}px;
    border:none; background:transparent; position:relative; box-sizing:border-box;
    cursor:pointer; user-select:none; touch-action:none;
  }
  .tokenSourceCube{
    position:absolute; width:${TOKEN_BANK_CUBE_SIZE}px; height:${TOKEN_BANK_CUBE_SIZE}px;
    left:${Math.round((TOKEN_BIN_HIT - TOKEN_BANK_CUBE_SIZE)/2)}px;
    top:${Math.round((TOKEN_BIN_HIT - TOKEN_BANK_CUBE_SIZE)/2)}px;
    border-radius:8px; box-sizing:border-box;
    border:1px solid rgba(255,255,255,0.25); box-shadow: 0 10px 22px rgba(0,0,0,0.60);
    pointer-events:none;
  }
  .tokenCube{
    position:absolute; width:${TOKEN_SIZE}px; height:${TOKEN_SIZE}px; border-radius:4px;
    box-sizing:border-box; border:1px solid rgba(255,255,255,0.25);
    box-shadow: 0 8px 18px rgba(0,0,0,0.55);
    touch-action:none; cursor:grab; user-select:none;
  }
  .tokenRed{ background: linear-gradient(145deg, rgba(255,120,120,0.95), rgba(160,20,20,0.98)); }
  .tokenBlue{ background: linear-gradient(145deg, rgba(140,200,255,0.95), rgba(25,90,170,0.98)); }
  .tokenGold{ background: linear-gradient(145deg, rgba(255,235,160,0.98), rgba(145,95,10,0.98)); border-color: rgba(255,255,255,0.30); }

  /* tray */
  .trayShell{
    position: fixed; left: 10px; right: 10px; bottom: 10px;
    background: rgba(0,0,0,0.88);
    border: 1px solid rgba(255,255,255,0.20);
    border-radius: 14px;
    padding: 10px;
    z-index: 200000;
    color: rgba(255,255,255,0.92);
    display:none;
    box-shadow: 0 18px 55px rgba(0,0,0,0.70);
    pointer-events:auto;
  }
  .trayHeader{
    display:flex; align-items:center; justify-content:space-between; gap:10px;
    padding: 2px 2px 8px;
  }
  .trayTitle{ font-weight: 900; letter-spacing: 0.4px; font-size: 12px; opacity: 0.92; }
  .trayBtn{
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.22);
    color: rgba(255,255,255,0.92);
    border-radius: 10px;
    padding: 7px 10px;
    font-weight: 900;
    font-size: 11px;
    cursor:pointer;
    user-select:none;
    touch-action:manipulation;
  }
  .trayControls{
    display:flex; gap:8px; align-items:center; flex-wrap:wrap;
    padding: 0 2px 8px;
  }
  .traySearch{
    flex: 1 1 220px;
    min-width: 180px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.16);
    color: rgba(255,255,255,0.92);
    border-radius: 10px;
    padding: 9px 10px;
    font-weight: 900;
    font-size: 12px;
    outline:none;
  }
  .trayBody{
    max-height: 34vh;
    overflow:auto;
    border-top: 1px solid rgba(255,255,255,0.12);
    padding-top: 8px;
  }
  .trayGrid{
    display:flex; gap:10px; flex-wrap:wrap;
    padding: 2px 2px 0;
  }
  .trayCardMini{
    width:${CARD_W}px; height:${CARD_H}px;
    border: 1px solid rgba(255,255,255,0.22);
    border-radius: 10px;
    background: rgba(255,255,255,0.06);
    overflow:hidden;
    position:relative;
    touch-action:none;
    cursor:pointer;
  }
  .trayCardMini .cardFace{ filter: none; }
  .trayCardMini .cardBack{ display:none; }
`;
document.head.appendChild(style);

// ---------- table + hud + badge + stage ----------
const table = document.createElement("div");
table.id = "table";
app.appendChild(table);

const hud = document.createElement("div");
hud.id = "hud";
table.appendChild(hud);

function makeHudBtn(label) {
  const b = document.createElement("button");
  b.className = "hudBtn";
  b.textContent = label;
  hud.appendChild(b);
  return b;
}

const fitBtn = makeHudBtn("FIT");
const endP1Btn = makeHudBtn("END P1");
const endP2Btn = makeHudBtn("END P2");
const resetTokensBtn = makeHudBtn("RESET");
const trayP1Btn = makeHudBtn("TRAY P1");
const trayP2Btn = makeHudBtn("TRAY P2");

const buildBadge = document.createElement("div");
buildBadge.id = "buildBadge";
buildBadge.textContent = `BUILD: ${BUILD_ID}`;
table.appendChild(buildBadge);

const stage = document.createElement("div");
stage.id = "stage";
table.appendChild(stage);

// ---------- persistent layers (so rebuilds don't wipe pieces) ----------
const zonesLayer = document.createElement("div");
zonesLayer.id = "zonesLayer";
zonesLayer.className = "layer";
stage.appendChild(zonesLayer);

const piecesLayer = document.createElement("div");
piecesLayer.id = "piecesLayer";
piecesLayer.className = "layer";
stage.appendChild(piecesLayer);

const uiLayer = document.createElement("div");
uiLayer.id = "uiLayer";
uiLayer.className = "layer";
stage.appendChild(uiLayer);

// ---------- tray ui ----------
const trayShell = document.createElement("div");
trayShell.className = "trayShell";
trayShell.innerHTML = `
  <div class="trayHeader">
    <div class="trayTitle" id="trayTitle">Tray</div>
    <button class="trayBtn" id="trayCloseBtn">X</button>
  </div>
  <div class="trayControls">
    <input class="traySearch" id="traySearchInput" placeholder="Search..." />
  </div>
  <div class="trayBody">
    <div class="trayGrid" id="trayGrid"></div>
  </div>
`;
table.appendChild(trayShell);

const trayTitleEl = trayShell.querySelector("#trayTitle");
const trayCloseBtn = trayShell.querySelector("#trayCloseBtn");
const traySearchInput = trayShell.querySelector("#traySearchInput");
const trayGrid = trayShell.querySelector("#trayGrid");
trayCloseBtn.addEventListener("click", () => closeTray());

const trayState = {
  open: false,
  owner: "p1",
  pileKey: "draw",
  title: "Tray",
  filter: "",
  cards: [],
};

function openTray(owner, pileKey, title, cards) {
  trayState.open = true;
  trayState.owner = owner;
  trayState.pileKey = pileKey;
  trayState.title = title;
  trayState.cards = cards || [];
  trayTitleEl.textContent = title || "Tray";
  trayShell.style.display = "block";
  traySearchInput.value = trayState.filter || "";
  renderTray();
}
function closeTray() {
  trayState.open = false;
  trayShell.style.display = "none";
}
function renderTray() {
  const q = (trayState.filter || "").trim().toLowerCase();
  trayGrid.innerHTML = "";

  const list = trayState.cards || [];
  const filtered = q
    ? list.filter(c => (c.name || "").toLowerCase().includes(q))
    : list;

  filtered.forEach((cardObj) => {
    const mini = document.createElement("div");
    mini.className = "trayCardMini";
    mini.title = cardObj.name || "Card";

    const face = document.createElement("div");
    face.className = "cardFace";
    if (cardObj.img) face.style.backgroundImage = `url("${cardObj.img}")`;
    mini.appendChild(face);

    trayGrid.appendChild(mini);
  });
}
traySearchInput.addEventListener("input", () => {
  trayState.filter = traySearchInput.value || "";
  renderTray();
});

// ---------- state ----------
let zonesCache = null;
let forceSlotCenters = [];
let forceMarker = null;

// token state
const tokenPools = {
  p1: { damage: TOKENS_DAMAGE_PER_PLAYER, attack: TOKENS_ATTACK_PER_PLAYER, resource: TOKENS_RESOURCE_PER_PLAYER },
  p2: { damage: TOKENS_DAMAGE_PER_PLAYER, attack: TOKENS_ATTACK_PER_PLAYER, resource: TOKENS_RESOURCE_PER_PLAYER },
};
const tokenEls = new Set();

// piles (minimal data so tray can show something)
const piles = {
  p1: { draw: [], discard: [], exile: [] },
  p2: { draw: [], discard: [], exile: [] },
};

// ---------- camera ----------
const camera = { scale: 1, tx: 0, ty: 0 };
function viewportSize() {
  const vv = window.visualViewport;
  return { w: vv ? vv.width : window.innerWidth, h: vv ? vv.height : window.innerHeight };
}
function applyCamera() {
  stage.style.transform = `translate(${camera.tx}px, ${camera.ty}px) scale(${camera.scale})`;
}
function viewportToDesign(vx, vy){
  return { x: (vx - camera.tx) / camera.scale, y: (vy - camera.ty) / camera.scale };
}
function fitToScreen() {
  const { w, h } = viewportSize();
  const margin = 16;
  const usableW = Math.max(200, w);

  const s = Math.min(
    (usableW - margin * 2) / DESIGN_W,
    (h - margin * 2) / DESIGN_H
  );
  camera.scale = s;
  camera.tx = Math.round((usableW - DESIGN_W * s) / 2);
  camera.ty = Math.round((h - DESIGN_H * s) / 2);
  applyCamera();
}
fitBtn.addEventListener("click", (e) => { e.preventDefault(); fitToScreen(); });

window.addEventListener("resize", () => fitToScreen());
if (window.visualViewport) window.visualViewport.addEventListener("resize", () => fitToScreen());

// ---------- layout ----------
function computeZones() {
  const xPiles = 240;
  const xGalaxyDeck = xPiles + (CARD_W * 2 + GAP) + BIG_GAP;

  const xRowStart = xGalaxyDeck + CARD_W + BIG_GAP;
  const rowSlotGap = GAP;
  const rowWidth = (CARD_W * 6) + (rowSlotGap * 5);

  const xOuterRim = xRowStart + rowWidth + BIG_GAP;
  const xForce = xOuterRim + CARD_W + GAP;
  const forceTrackW = 52;

  const xGalaxyDiscard = xForce + forceTrackW + GAP;
  const xCaptured = xGalaxyDiscard + CARD_W + BIG_GAP;

  const yTopPiles = 90;
  const yRow1 = 220;
  const yRow2 = yRow1 + CARD_H + GAP;

  const yForceTrack = yRow1;
  const forceTrackH = (CARD_H * 2) + GAP;

  const yGalaxyDeck = yRow1 + Math.round(CARD_H / 2) + Math.round(GAP / 2);

  const yTopBase = yRow1 - BASE_H - BASE_ROW_GAP;
  const yBottomBase = (yRow2 + CARD_H) + BASE_ROW_GAP;

  const yTopExile = yRow1 - (CARD_H + BIG_GAP);
  const yBotExile = yRow2 + CARD_H + BIG_GAP;

  const yBottomPiles = yBotExile;

  const yGalaxyDiscard = yRow1 + Math.round((forceTrackH / 2) - (CARD_H / 2));
  const yCapTop = yGalaxyDiscard - 26 - (BASE_H + (CAP_SLOTS - 1) * Math.round(BASE_H * 0.45));
  const yCapBottom = yGalaxyDiscard + CARD_H + 26;

  // token banks centered under draw+discard piles
  const bankW = (TOKEN_BIN_HIT * 3) + (TOKEN_BIN_GAP * 2);
  const bankH = TOKEN_BIN_HIT;

  const pilesW = (CARD_W * 2) + GAP;
  const bankX = Math.round(xPiles + (pilesW - bankW) / 2);
  const bankGap = 14;

  const zones = {
    p2_discard: rect(xPiles, yTopPiles, CARD_W, CARD_H),
    p2_draw: rect(xPiles + CARD_W + GAP, yTopPiles, CARD_W, CARD_H),
    p2_base_stack: rect(xRowStart + (rowWidth / 2) - (BASE_W / 2), yTopBase, BASE_W, BASE_H),
    p2_exile_draw: rect(xForce - CARD_W - GAP, yTopExile, CARD_W, CARD_H),
    p2_exile_perm: rect(xForce - GAP, yTopExile, CARD_W, CARD_H),

    galaxy_deck: rect(xGalaxyDeck, yGalaxyDeck, CARD_W, CARD_H),
    outer_rim: rect(xOuterRim, yGalaxyDiscard, CARD_W, CARD_H),
    force_track: rect(xForce, yForceTrack, forceTrackW, forceTrackH),
    galaxy_discard: rect(xGalaxyDiscard, yGalaxyDiscard, CARD_W, CARD_H),

    p1_discard: rect(xPiles, yBottomPiles, CARD_W, CARD_H),
    p1_draw: rect(xPiles + CARD_W + GAP, yBottomPiles, CARD_W, CARD_H),
    p1_base_stack: rect(xRowStart + (rowWidth / 2) - (BASE_W / 2), yBottomBase, BASE_W, BASE_H),
    p1_exile_draw: rect(xForce - CARD_W - GAP, yBotExile, CARD_W, CARD_H),
    p1_exile_perm: rect(xForce - GAP, yBotExile, CARD_W, CARD_H),

    p2_captured_bases: rect(xCaptured, yCapTop, BASE_W, BASE_H + (CAP_SLOTS - 1) * CAP_OVERLAP),
    p1_captured_bases: rect(xCaptured, yCapBottom, BASE_W, BASE_H + (CAP_SLOTS - 1) * CAP_OVERLAP),

    p2_token_bank: rect(bankX, yTopPiles - bankGap - bankH, bankW, bankH),
    p1_token_bank: rect(bankX, yBottomPiles + CARD_H + bankGap, bankW, bankH),
  };

  for (let c = 0; c < 6; c++) {
    zones["g1" + (c + 1)] = rect(xRowStart + c * (CARD_W + rowSlotGap), yRow1, CARD_W, CARD_H);
    zones["g2" + (c + 1)] = rect(xRowStart + c * (CARD_W + rowSlotGap), yRow2, CARD_W, CARD_H);
  }

  // normalize to positive
  const PAD = 18;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of Object.values(zones)) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  const shiftX = (minX < PAD) ? (PAD - minX) : 0;
  const shiftY = (minY < PAD) ? (PAD - minY) : 0;

  if (shiftX || shiftY) {
    for (const r of Object.values(zones)) { r.x += shiftX; r.y += shiftY; }
    maxX += shiftX; maxY += shiftY;
  }

  DESIGN_W = Math.ceil(maxX + PAD);
  DESIGN_H = Math.ceil(maxY + PAD);
  return zones;
}

// ---------- force track ----------
function buildForceTrackSlots(forceRect) {
  zonesLayer.querySelectorAll(".forceSlot").forEach(el => el.remove());
  forceSlotCenters = [];

  const pad = 10;
  const usableH = forceRect.h - pad * 2;

  for (let i = 0; i < FORCE_SLOTS; i++) {
    const t = FORCE_SLOTS === 1 ? 0.5 : i / (FORCE_SLOTS - 1);
    const cy = forceRect.y + pad + t * usableH;
    const cx = forceRect.x + forceRect.w / 2;
    forceSlotCenters.push({ x: cx, y: cy });

    const slot = document.createElement("div");
    slot.className = "forceSlot" + (i === FORCE_NEUTRAL_INDEX ? " neutral" : "");
    slot.style.left = `${forceRect.x}px`;
    slot.style.top = `${Math.round(cy - 16)}px`;
    slot.style.width = `${forceRect.w}px`;
    slot.style.height = `32px`;
    zonesLayer.appendChild(slot);
  }
}
function ensureForceMarker(initialIndex = FORCE_NEUTRAL_INDEX) {
  if (forceMarker && forceMarker.isConnected) return;
  forceMarker = document.createElement("div");
  forceMarker.className = "forceMarker";
  uiLayer.appendChild(forceMarker);

  const c = forceSlotCenters[initialIndex] || forceSlotCenters[FORCE_NEUTRAL_INDEX];
  if (c) {
    forceMarker.style.left = `${c.x - FORCE_MARKER_SIZE / 2}px`;
    forceMarker.style.top  = `${c.y - FORCE_MARKER_SIZE / 2}px`;
  }
}

// ---------- tokens ----------
function tokenClassFor(type) {
  if (type === "damage") return "tokenRed";
  if (type === "attack") return "tokenBlue";
  return "tokenGold";
}
function attachTokenDragHandlers(el) {
  let dragging = false;
  let offX = 0, offY = 0;

  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    el.setPointerCapture(e.pointerId);
    dragging = true;

    const stageRect = stage.getBoundingClientRect();
    const px = (e.clientX - stageRect.left) / camera.scale;
    const py = (e.clientY - stageRect.top) / camera.scale;

    const left = parseFloat(el.style.left || "0");
    const top  = parseFloat(el.style.top || "0");
    offX = px - left;
    offY = py - top;
    el.style.zIndex = "60000";
  });

  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const stageRect = stage.getBoundingClientRect();
    const px = (e.clientX - stageRect.left) / camera.scale;
    const py = (e.clientY - stageRect.top) / camera.scale;
    el.style.left = `${px - offX}px`;
    el.style.top  = `${py - offY}px`;
  });

  el.addEventListener("pointerup", (e) => {
    dragging = false;
    try { el.releasePointerCapture(e.pointerId); } catch {}
    el.style.zIndex = "16000";
  });
}
function createTokenCube(owner, type, x, y) {
  const t = document.createElement("div");
  t.className = `tokenCube ${tokenClassFor(type)}`;
  t.dataset.owner = owner;
  t.dataset.type = type;
  t.style.left = `${x - TOKEN_SIZE/2}px`;
  t.style.top  = `${y - TOKEN_SIZE/2}px`;
  t.style.zIndex = "16000";
  piecesLayer.appendChild(t);
  tokenEls.add(t);
  attachTokenDragHandlers(t);
  return t;
}
function spawnTokenFromBin(owner, type, clientX, clientY, pointerId) {
  if (tokenPools[owner][type] <= 0) return;
  tokenPools[owner][type] -= 1;

  const p = viewportToDesign(clientX, clientY);
  const tok = createTokenCube(owner, type, p.x, p.y);

  try { tok.setPointerCapture(pointerId); } catch {}
}
function buildTokenBank(owner, r) {
  const bank = document.createElement("div");
  bank.className = "tokenBank";
  bank.style.left = `${r.x}px`;
  bank.style.top  = `${r.y}px`;
  bank.style.width = `${r.w}px`;
  bank.style.height = `${r.h}px`;

  const row = document.createElement("div");
  row.className = "tokenBinsRow";

  ["damage","attack","resource"].forEach((type) => {
    const bin = document.createElement("div");
    bin.className = "tokenBin";

    const source = document.createElement("div");
    source.className = `tokenSourceCube ${tokenClassFor(type)}`;
    bin.appendChild(source);

    bin.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      spawnTokenFromBin(owner, type, e.clientX, e.clientY, e.pointerId);
    });

    row.appendChild(bin);
  });

  bank.appendChild(row);
  uiLayer.appendChild(bank);
}
function returnTokensForOwner(owner, typesToReturn) {
  for (const t of Array.from(tokenEls)) {
    if (!t.isConnected) { tokenEls.delete(t); continue; }
    if (t.dataset.owner !== owner) continue;
    if (!typesToReturn.includes(t.dataset.type)) continue;
    tokenPools[owner][t.dataset.type] += 1;
    t.remove();
    tokenEls.delete(t);
  }
}
function endTurn(owner) { returnTokensForOwner(owner, ["attack","resource"]); }
function resetAllTokens() {
  for (const t of Array.from(tokenEls)) { if (t.isConnected) t.remove(); tokenEls.delete(t); }
  tokenPools.p1.damage = TOKENS_DAMAGE_PER_PLAYER;
  tokenPools.p1.attack = TOKENS_ATTACK_PER_PLAYER;
  tokenPools.p1.resource = TOKENS_RESOURCE_PER_PLAYER;
  tokenPools.p2.damage = TOKENS_DAMAGE_PER_PLAYER;
  tokenPools.p2.attack = TOKENS_ATTACK_PER_PLAYER;
  tokenPools.p2.resource = TOKENS_RESOURCE_PER_PLAYER;
}

endP1Btn.addEventListener("click", (e) => { e.preventDefault(); endTurn("p1"); });
endP2Btn.addEventListener("click", (e) => { e.preventDefault(); endTurn("p2"); });
resetTokensBtn.addEventListener("click", (e) => { e.preventDefault(); resetAllTokens(); });

function openTrayDraw(owner, pileKey, title) {
  const list = (piles[owner] && piles[owner][pileKey]) ? piles[owner][pileKey] : [];
  openTray(owner, pileKey, title, list);
}
trayP1Btn.addEventListener("click", (e) => { e.preventDefault(); openTrayDraw("p1", "draw", "P1 Draw"); });
trayP2Btn.addEventListener("click", (e) => { e.preventDefault(); openTrayDraw("p2", "draw", "P2 Draw"); });

// ---------- build ----------
function build() {
  // Rebuild geometry without wiping movable pieces
  zonesLayer.innerHTML = "";
  uiLayer.innerHTML = "";

  const zones = computeZones();
  zonesCache = zones;

  stage.style.width = `${DESIGN_W}px`;
  stage.style.height = `${DESIGN_H}px`;
  zonesLayer.style.width = `${DESIGN_W}px`;
  zonesLayer.style.height = `${DESIGN_H}px`;
  piecesLayer.style.width = `${DESIGN_W}px`;
  piecesLayer.style.height = `${DESIGN_H}px`;
  uiLayer.style.width = `${DESIGN_W}px`;
  uiLayer.style.height = `${DESIGN_H}px`;

  // draw zones (skip token bank anchors)
  for (const [id, rr] of Object.entries(zones)) {
    if (id === "p1_token_bank" || id === "p2_token_bank") continue;
    const el = document.createElement("div");
    el.className = "zone";
    el.dataset.zoneId = id;
    el.style.left = `${rr.x}px`;
    el.style.top = `${rr.y}px`;
    el.style.width = `${rr.w}px`;
    el.style.height = `${rr.h}px`;
    zonesLayer.appendChild(el);
  }

  buildForceTrackSlots(zones.force_track);
  ensureForceMarker(FORCE_NEUTRAL_INDEX);

  // rebuild token banks
  buildTokenBank("p2", zones.p2_token_bank);
  buildTokenBank("p1", zones.p1_token_bank);

  applyCamera();
  fitToScreen();
}

// ---------- seed piles so tray isn't empty ----------
function seedDemoPiles() {
  // only seed once
  if (piles.p1.draw.length || piles.p2.draw.length) return;

  for (let i = 1; i <= 10; i++) {
    piles.p1.draw.push({ name: `P1 Card ${i}`, img: "" });
    piles.p2.draw.push({ name: `P2 Card ${i}`, img: "" });
  }
}
seedDemoPiles();
build();
