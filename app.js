console.log("VTT: CLEAN BASELINE (token bins = hit area, no empty clickable space, 3 bins per player, anchored under draw/discard)");

// ---------- base page ----------
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.height = "100vh";
document.body.style.background = "#000";
document.body.style.overflow = "hidden";
document.body.style.touchAction = "none";
document.body.style.fontFamily = "Arial, sans-serif";

const app = document.getElementById("app");
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

// Far red end: user plays BLUE from bottom, so RED end is "away" (top of track)
const FORCE_RED_END_INDEX = 0;

const CAP_SLOTS = 7;
const CAP_OVERLAP = Math.round(BASE_H * 0.45);
const CAP_W = BASE_W;
const CAP_H = BASE_H + (CAP_SLOTS - 1) * CAP_OVERLAP;

// Layout knobs
const BASE_ROW_GAP = 480;      // bases farther from galaxy row (mirrored)
const CAP_DISCARD_GAP = 26;    // captured stacks centered around galaxy discard
const EXILE_GAP = GAP;         // gap between exile draw + exile perm piles

let DESIGN_W = 1;
let DESIGN_H = 1;
function rect(x, y, w, h) { return { x, y, w, h }; }

// ---------- START MENU CONFIG ----------
const gameConfig = {
  setMode: "mixed",      // "og" | "cw" | "mixed"
  mandoNeutrals: true,   // include Mandalorian as neutrals
  p1Side: "blue"         // "blue" | "red" (Player 1 choice; Player 2 is the other side)
};

function applySetModeDefaults() {
  // Set determines factions automatically (no manual faction picks)
  // mixed => All Blue vs All Red
  // og    => Empire vs Rebels
  // cw    => Separatists vs Republic
  // (We keep these as derived values for later deck-loading logic.)
  if (gameConfig.setMode === "mixed") {
    gameConfig.blueFaction = "all_blue";
    gameConfig.redFaction = "all_red";
  } else if (gameConfig.setMode === "og") {
    gameConfig.blueFaction = "empire";
    gameConfig.redFaction = "rebels";
  } else {
    gameConfig.blueFaction = "separatists";
    gameConfig.redFaction = "republic";
  }
}

function randomizeConfig() {
  const sets = ["og", "cw", "mixed"];
  gameConfig.setMode = sets[Math.floor(Math.random() * sets.length)];
  gameConfig.mandoNeutrals = Math.random() < 0.6;
  gameConfig.p1Side = Math.random() < 0.5 ? "blue" : "red";
  applySetModeDefaults();
}

function describeAutoFactionsHTML() {
  if (gameConfig.setMode === "mixed") {
    return `Blue = <b>All Blue</b> (Empire + Separatists), Red = <b>All Red</b> (Rebels + Republic).`;
  }
  if (gameConfig.setMode === "og") {
    return `Blue = <b>Empire</b>, Red = <b>Rebels</b>.`;
  }
  return `Blue = <b>Separatists</b>, Red = <b>Republic</b>.`;
}

applySetModeDefaults();

// ---------- TOKENS ----------
const TOKENS_DAMAGE_PER_PLAYER   = 25; // red (persistent)
const TOKENS_ATTACK_PER_PLAYER   = 30; // blue (temp per turn)
const TOKENS_RESOURCE_PER_PLAYER = 20; // gold (temp per turn)

// Spawned cube size (small enough to sit on cards)
const TOKEN_SIZE = 18;

// Make the "bin" (hit area) exactly the visible source-cube size (NO empty clickable space)
const TOKEN_BANK_CUBE_SIZE = 44;
const TOKEN_BIN_W = TOKEN_BANK_CUBE_SIZE;
const TOKEN_BIN_H = TOKEN_BANK_CUBE_SIZE;
const TOKEN_BIN_GAP = 10;

// ---------- CSS ----------
const style = document.createElement("style");
style.textContent = `
  #table { position: fixed; inset: 0; background: #000; overflow: hidden; touch-action: none; }
  #hud {
    position: fixed;
    left: 10px;
    top: 10px;
    z-index: 100000;
    display:flex;
    gap:6px;
    flex-wrap:wrap;
    pointer-events:auto;
  }
  .hudBtn {
    background: rgba(255,255,255,0.10);
    color:#fff;
    border:1px solid rgba(255,255,255,0.22);
    border-radius:8px;
    padding:6px 8px;
    font-weight:900;
    letter-spacing:0.4px;
    font-size:11px;
    line-height:1;
    user-select:none;
    touch-action:manipulation;
    cursor:pointer;
  }

  #stage { position:absolute; left:0; top:0; transform-origin:0 0; will-change:transform; }

  .zone { position:absolute; border:2px solid rgba(255,255,255,0.35); border-radius:10px; box-sizing:border-box; background:transparent; }

  .forceSlot { position:absolute; border-radius:10px; box-sizing:border-box; border:1px dashed rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.02); pointer-events:none; }
  .forceSlot.neutral { border:1px dashed rgba(255,255,255,0.35); background: rgba(255,255,255,0.06); }

  .forceMarker { position:absolute; width:${FORCE_MARKER_SIZE}px; height:${FORCE_MARKER_SIZE}px; border-radius:999px; border:2px solid rgba(255,255,255,0.9);
    background: rgba(120,180,255,0.22); box-shadow:0 8px 20px rgba(0,0,0,0.6); box-sizing:border-box; z-index:99999;
    touch-action:none; cursor:grab; }

  .capSlot { position:absolute; border-radius:10px; box-sizing:border-box; border:1px dashed rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.01); pointer-events:none; }

  /* -------- TOKENS (FREEFORM LOOK) -------- */
  .tokenBank{
    position:absolute;
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
    box-sizing: border-box;
    pointer-events:auto;
  }
  .tokenBinsRow{
    display:flex;
    gap: ${TOKEN_BIN_GAP}px;
    align-items:center;
    justify-content:flex-start;
  }

  .tokenBin{
    width: ${TOKEN_BIN_W}px;
    height:${TOKEN_BIN_H}px;
    border: none;
    background: transparent;
    position: relative;
    box-sizing: border-box;
    cursor: pointer;
    user-select:none;
    touch-action:none;
  }

  .tokenCube{
    position:absolute;
    width:${TOKEN_SIZE}px;
    height:${TOKEN_SIZE}px;
    border-radius: 4px;
    box-sizing: border-box;
    border: 1px solid rgba(255,255,255,0.25);
    box-shadow: 0 8px 18px rgba(0,0,0,0.55);
    touch-action:none;
    cursor: grab;
    user-select:none;
  }
  .tokenCube:active{ cursor: grabbing; }

  .tokenSourceCube{
    position:absolute;
    width:${TOKEN_BANK_CUBE_SIZE}px;
    height:${TOKEN_BANK_CUBE_SIZE}px;
    border-radius: 8px;
    box-sizing: border-box;
    border: 1px solid rgba(255,255,255,0.25);
    box-shadow: 0 10px 22px rgba(0,0,0,0.60);
    pointer-events:none;
    user-select:none;
    left: 0px;
    top: 0px;
  }

  .tokenRed{
    background: linear-gradient(145deg, rgba(255,120,120,0.95), rgba(160,20,20,0.98));
  }
  .tokenBlue{
    background: linear-gradient(145deg, rgba(140,200,255,0.95), rgba(25,90,170,0.98));
  }
  .tokenGold{
    background: linear-gradient(145deg, rgba(255,235,160,0.98), rgba(145,95,10,0.98));
    border-color: rgba(255,255,255,0.30);
  }

  /* ---------- START MENU (overlay) ---------- */
  .startMenuOverlay{
    position: fixed;
    inset: 0;
    z-index: 200000;
    background: rgba(0,0,0,0.72);
    backdrop-filter: blur(6px);
    display:flex;
    align-items:center;
    justify-content:center;
    padding: 18px;
    box-sizing:border-box;
  }
  .startMenuPanel{
    width: min(520px, 92vw);
    max-height: 88vh;
    overflow:auto;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(15,15,15,0.92);
    box-shadow: 0 18px 55px rgba(0,0,0,0.70);
    padding: 14px 14px 12px;
    color: rgba(255,255,255,0.92);
  }
  .smTitle{
    font-weight: 900;
    letter-spacing: 0.6px;
    font-size: 16px;
    margin-bottom: 10px;
  }
  .smSection{
    border-top: 1px solid rgba(255,255,255,0.12);
    padding-top: 10px;
    margin-top: 10px;
  }
  .smSection:first-of-type{
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }
  .smRow{
    display:flex;
    flex-direction: column;
    gap: 6px;
    margin: 8px 0;
  }
  .smLabel{
    font-size: 12px;
    opacity: 0.85;
    font-weight: 900;
    letter-spacing: 0.2px;
  }
  .smOptions{
    display:flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .smOpt{
    display:flex;
    align-items:center;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.16);
    background: rgba(255,255,255,0.05);
    user-select:none;
    transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
  }
  .smOpt input{ transform: translateY(1px); }
  .smOpt:has(input:checked){
    background: rgba(255,255,255,0.14);
    border-color: rgba(255,255,255,0.35);
    box-shadow: 0 10px 24px rgba(0,0,0,0.55);
    transform: translateY(-1px);
  }
  .smOptBlue:has(input:checked){
    background: rgba(90,170,255,0.22);
    border-color: rgba(120,200,255,0.55);
    box-shadow: 0 0 0 2px rgba(120,200,255,0.18), 0 14px 30px rgba(0,0,0,0.65);
  }
  .smOptRed:has(input:checked){
    background: rgba(255,90,90,0.18);
    border-color: rgba(255,130,130,0.55);
    box-shadow: 0 0 0 2px rgba(255,130,130,0.16), 0 14px 30px rgba(0,0,0,0.65);
  }
  .smActions{
    display:flex;
    gap: 8px;
    justify-content:flex-end;
    margin-top: 12px;
  }
  .smBtn{
    background: rgba(255,255,255,0.10);
    color:#fff;
    border:1px solid rgba(255,255,255,0.22);
    border-radius:12px;
    padding:10px 12px;
    font-weight:900;
    letter-spacing:0.4px;
    font-size: 12px;
    cursor:pointer;
  }
  .smBtnPrimary{
    background: rgba(120,180,255,0.22);
    border-color: rgba(120,180,255,0.40);
  }
  .smTiny{
    font-size: 11px;
    opacity: 0.78;
    line-height: 1.25;
    margin-top: 6px;
  }
`;
document.head.appendChild(style);

// ---------- table + hud + stage ----------
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
const menuBtn = makeHudBtn("MENU");
const endP1Btn = makeHudBtn("END P1");
const endP2Btn = makeHudBtn("END P2");
const resetTokensBtn = makeHudBtn("RESET");

const stage = document.createElement("div");
stage.id = "stage";
table.appendChild(stage);

// ---------- state ----------
let forceSlotCenters = [];
let forceMarker = null;
const capSlotCenters = { p1: [], p2: [] };

// token state
const tokenPools = {
  p1: { damage: TOKENS_DAMAGE_PER_PLAYER, attack: TOKENS_ATTACK_PER_PLAYER, resource: TOKENS_RESOURCE_PER_PLAYER },
  p2: { damage: TOKENS_DAMAGE_PER_PLAYER, attack: TOKENS_ATTACK_PER_PLAYER, resource: TOKENS_RESOURCE_PER_PLAYER },
};
const tokenEls = new Set();
let zonesCache = null;

// ---------- layout helpers ----------
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
  const yCapTop = yGalaxyDiscard - CAP_DISCARD_GAP - CAP_H;
  const yCapBottom = yGalaxyDiscard + CARD_H + CAP_DISCARD_GAP;

  const xForceCenter = xForce + (forceTrackW / 2);
  const xExileLeft = xForceCenter - (CARD_W + (EXILE_GAP / 2));

  // Token banks: centered under discard+draw piles (both players), mirrored for P2
  const bankW = (TOKEN_BIN_W * 3) + (TOKEN_BIN_GAP * 2);
  const bankH = TOKEN_BIN_H;

  const pilesW = (CARD_W * 2) + GAP;
  const pilesCenterX = xPiles + (pilesW / 2);
  const bankX = Math.round(pilesCenterX - (bankW / 2));

  const bankGap = 14;
  const yP2TokenBank = yTopPiles - bankGap - bankH;        // above P2 piles (mirrored)
  const yP1TokenBank = yBottomPiles + CARD_H + bankGap;    // below P1 piles

  let zones = {
    // P2 (top) — discard LEFT, draw RIGHT
    p2_discard: rect(xPiles, yTopPiles, CARD_W, CARD_H),
    p2_draw: rect(xPiles + CARD_W + GAP, yTopPiles, CARD_W, CARD_H),

    p2_base_stack: rect(xRowStart + (rowWidth / 2) - (BASE_W / 2), yTopBase, BASE_W, BASE_H),

    p2_exile_draw: rect(xExileLeft, yTopExile, CARD_W, CARD_H),
    p2_exile_perm: rect(xExileLeft + CARD_W + EXILE_GAP, yTopExile, CARD_W, CARD_H),

    p2_captured_bases: rect(xCaptured, yCapTop, CAP_W, CAP_H),

    galaxy_deck: rect(xGalaxyDeck, yGalaxyDeck, CARD_W, CARD_H),

    outer_rim: rect(xOuterRim, yGalaxyDiscard, CARD_W, CARD_H),
    force_track: rect(xForce, yForceTrack, forceTrackW, forceTrackH),
    galaxy_discard: rect(xGalaxyDiscard, yGalaxyDiscard, CARD_W, CARD_H),

    // P1 (bottom) — discard LEFT, draw RIGHT
    p1_discard: rect(xPiles, yBottomPiles, CARD_W, CARD_H),
    p1_draw: rect(xPiles + CARD_W + GAP, yBottomPiles, CARD_W, CARD_H),

    p1_base_stack: rect(xRowStart + (rowWidth / 2) - (BASE_W / 2), yBottomBase, BASE_W, BASE_H),

    p1_exile_draw: rect(xExileLeft, yBotExile, CARD_W, CARD_H),
    p1_exile_perm: rect(xExileLeft + CARD_W + EXILE_GAP, yBotExile, CARD_W, CARD_H),

    p1_captured_bases: rect(xCaptured, yCapBottom, CAP_W, CAP_H),

    // token bank anchors
    p1_token_bank: rect(bankX, yP1TokenBank, bankW, bankH),
    p2_token_bank: rect(bankX, yP2TokenBank, bankW, bankH),
  };

  for (let c = 0; c < 6; c++) {
    zones["g1" + (c + 1)] = rect(xRowStart + c * (CARD_W + rowSlotGap), yRow1, CARD_W, CARD_H);
    zones["g2" + (c + 1)] = rect(xRowStart + c * (CARD_W + rowSlotGap), yRow2, CARD_W, CARD_H);
  }

  // normalize so nothing is negative (FIT-safe)
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
    for (const r of Object.values(zones)) {
      r.x += shiftX;
      r.y += shiftY;
    }
    maxX += shiftX;
    maxY += shiftY;
  }

  DESIGN_W = Math.ceil(maxX + PAD);
  DESIGN_H = Math.ceil(maxY + PAD);

  return zones;
}

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

  const s = Math.min(
    (w - margin * 2) / DESIGN_W,
    (h - margin * 2) / DESIGN_H
  );

  camera.scale = s;
  camera.tx = Math.round((w - DESIGN_W * s) / 2);
  camera.ty = Math.round((h - DESIGN_H * s) / 2);

  applyCamera();
}
fitBtn.addEventListener("click", (e) => { e.preventDefault(); fitToScreen(); });

// ---------- force track ----------
function buildForceTrackSlots(forceRect) {
  stage.querySelectorAll(".forceSlot").forEach(el => el.remove());
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
    stage.appendChild(slot);
  }
}

function moveForceMarkerToIndex(index) {
  if (!forceMarker) return;
  if (!forceSlotCenters.length) return;
  const i = Math.max(0, Math.min(FORCE_SLOTS - 1, index));
  const c = forceSlotCenters[i];
  forceMarker.style.left = `${c.x - FORCE_MARKER_SIZE / 2}px`;
  forceMarker.style.top  = `${c.y - FORCE_MARKER_SIZE / 2}px`;
}

function ensureForceMarker(initialIndex = FORCE_NEUTRAL_INDEX) {
  if (forceMarker) return;

  forceMarker = document.createElement("div");
  forceMarker.className = "forceMarker";
  stage.appendChild(forceMarker);

  let draggingMarker = false;
  let markerOffX = 0;
  let markerOffY = 0;

  function snapMarkerToNearestSlot() {
    if (!forceSlotCenters.length) return;

    const left = parseFloat(forceMarker.style.left || "0");
    const top = parseFloat(forceMarker.style.top || "0");
    const cx = left + FORCE_MARKER_SIZE / 2;
    const cy = top + FORCE_MARKER_SIZE / 2;

    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < forceSlotCenters.length; i++) {
      const s = forceSlotCenters[i];
      const d = Math.hypot(cx - s.x, cy - s.y);
      if (d < bestD) { bestD = d; best = i; }
    }

    const target = forceSlotCenters[best];
    forceMarker.style.left = `${target.x - FORCE_MARKER_SIZE / 2}px`;
    forceMarker.style.top  = `${target.y - FORCE_MARKER_SIZE / 2}px`;
  }

  forceMarker.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    forceMarker.setPointerCapture(e.pointerId);
    draggingMarker = true;

    const stageRect = stage.getBoundingClientRect();
    const px = (e.clientX - stageRect.left) / camera.scale;
    const py = (e.clientY - stageRect.top) / camera.scale;

    const left = parseFloat(forceMarker.style.left || "0");
    const top = parseFloat(forceMarker.style.top || "0");
    markerOffX = px - left;
    markerOffY = py - top;
  });

  forceMarker.addEventListener("pointermove", (e) => {
    if (!draggingMarker) return;
    const stageRect = stage.getBoundingClientRect();
    const px = (e.clientX - stageRect.left) / camera.scale;
    const py = (e.clientY - stageRect.top) / camera.scale;
    forceMarker.style.left = `${px - markerOffX}px`;
    forceMarker.style.top  = `${py - markerOffY}px`;
  });

  forceMarker.addEventListener("pointerup", (e) => {
    draggingMarker = false;
    try { forceMarker.releasePointerCapture(e.pointerId); } catch {}
    snapMarkerToNearestSlot();
  });

  if (forceSlotCenters.length) {
    const c = forceSlotCenters[initialIndex] || forceSlotCenters[FORCE_NEUTRAL_INDEX];
    forceMarker.style.left = `${c.x - FORCE_MARKER_SIZE / 2}px`;
    forceMarker.style.top  = `${c.y - FORCE_MARKER_SIZE / 2}px`;
  }
}

// ---------- captured slots ----------
function buildCapturedBaseSlots(capRect, sideLabel) {
  stage.querySelectorAll(".capSlot[data-cap-side='" + sideLabel + "']").forEach(el => el.remove());
  capSlotCenters[sideLabel] = [];

  const startX = capRect.x;
  const startY = capRect.y;

  for (let i = 0; i < CAP_SLOTS; i++) {
    const slotY = startY + i * CAP_OVERLAP;
    const cx = startX + CAP_W / 2;
    const cy = slotY + BASE_H / 2;

    capSlotCenters[sideLabel].push({ x: cx, y: cy });

    const slot = document.createElement("div");
    slot.className = "capSlot";
    slot.dataset.capSide = sideLabel;
    slot.dataset.capIndex = String(i);
    slot.style.left = `${startX}px`;
    slot.style.top  = `${slotY}px`;
    slot.style.width = `${CAP_W}px`;
    slot.style.height = `${BASE_H}px`;
    stage.appendChild(slot);
  }
}

// ---------- Tokens ----------
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
  stage.appendChild(t);
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

  const stageRect = stage.getBoundingClientRect();
  const px = (clientX - stageRect.left) / camera.scale;
  const py = (clientY - stageRect.top) / camera.scale;

  const left = parseFloat(tok.style.left || "0");
  const top  = parseFloat(tok.style.top || "0");
  const offX = px - left;
  const offY = py - top;

  tok.style.zIndex = "60000";

  function move(e) {
    const px2 = (e.clientX - stageRect.left) / camera.scale;
    const py2 = (e.clientY - stageRect.top) / camera.scale;
    tok.style.left = `${px2 - offX}px`;
    tok.style.top  = `${py2 - offY}px`;
  }
  function up() {
    try { tok.releasePointerCapture(pointerId); } catch {}
    tok.style.zIndex = "16000";
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerup", up, true);
    window.removeEventListener("pointercancel", up, true);
  }

  window.addEventListener("pointermove", move, true);
  window.addEventListener("pointerup", up, true);
  window.addEventListener("pointercancel", up, true);
}

function buildTokenBank(owner, r) {
  const bank = document.createElement("div");
  bank.className = "tokenBank";
  bank.style.left = `${r.x}px`;
  bank.style.top  = `${r.y}px`;
  bank.style.width = `${r.w}px`;
  bank.style.height = `${r.h}px`;
  bank.dataset.owner = owner;

  const row = document.createElement("div");
  row.className = "tokenBinsRow";

  const bins = [
    { type:"damage" },
    { type:"attack" },
    { type:"resource" },
  ];

  for (const b of bins) {
    const bin = document.createElement("div");
    bin.className = "tokenBin";
    bin.dataset.owner = owner;
    bin.dataset.type = b.type;

    const source = document.createElement("div");
    source.className = `tokenSourceCube ${tokenClassFor(b.type)}`;
    bin.appendChild(source);

    bin.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      spawnTokenFromBin(owner, b.type, e.clientX, e.clientY, e.pointerId);
    });

    row.appendChild(bin);
  }

  bank.appendChild(row);

  bank.addEventListener("pointerdown", (e) => e.stopPropagation());
  bank.addEventListener("pointermove", (e) => e.stopPropagation());
  bank.addEventListener("pointerup", (e) => e.stopPropagation());

  stage.appendChild(bank);
}

function returnTokensForOwner(owner, typesToReturn) {
  const toRemove = [];
  for (const t of tokenEls) {
    if (!t.isConnected) { toRemove.push(t); continue; }
    if (t.dataset.owner !== owner) continue;
    const type = t.dataset.type;
    if (!typesToReturn.includes(type)) continue;
    toRemove.push(t);
    tokenPools[owner][type] += 1;
  }
  for (const t of toRemove) {
    if (t.isConnected) t.remove();
    tokenEls.delete(t);
  }
}

function endTurn(owner) {
  returnTokensForOwner(owner, ["attack","resource"]);
}

function resetAllTokens() {
  for (const t of Array.from(tokenEls)) {
    if (t.isConnected) t.remove();
    tokenEls.delete(t);
  }
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

// ---------- build ----------
function build() {
  stage.innerHTML = "";

  const zones = computeZones();
  zonesCache = zones;

  stage.style.width = `${DESIGN_W}px`;
  stage.style.height = `${DESIGN_H}px`;

  for (const [id, rr] of Object.entries(zones)) {
    if (id === "p1_token_bank" || id === "p2_token_bank") continue;
    const el = document.createElement("div");
    el.className = "zone";
    el.dataset.zoneId = id;
    el.style.left = `${rr.x}px`;
    el.style.top = `${rr.y}px`;
    el.style.width = `${rr.w}px`;
    el.style.height = `${rr.h}px`;
    stage.appendChild(el);
  }

  buildForceTrackSlots(zones.force_track);
  ensureForceMarker(FORCE_NEUTRAL_INDEX);

  buildCapturedBaseSlots(zones.p2_captured_bases, "p2");
  buildCapturedBaseSlots(zones.p1_captured_bases, "p1");

  buildTokenBank("p2", zones.p2_token_bank);
  buildTokenBank("p1", zones.p1_token_bank);

  applyCamera();
  fitToScreen();
}
build();

// ---------- START MENU ----------
let startMenuOverlayEl = null;

function closeStartMenu() {
  if (startMenuOverlayEl && startMenuOverlayEl.isConnected) startMenuOverlayEl.remove();
  startMenuOverlayEl = null;

  // Setup rule applied silently:
  // Force track starts at far RED end.
  moveForceMarkerToIndex(FORCE_RED_END_INDEX);
}

function renderStartMenu() {
  if (startMenuOverlayEl && startMenuOverlayEl.isConnected) startMenuOverlayEl.remove();

  const overlay = document.createElement("div");
  overlay.className = "startMenuOverlay";

  const panel = document.createElement("div");
  panel.className = "startMenuPanel";

  panel.innerHTML = `
    <div class="smTitle">Start Menu</div>

    <div class="smSection">
      <div class="smRow">
        <div class="smLabel">Set</div>
        <div class="smOptions">
          <label class="smOpt"><input type="radio" name="setMode" value="og"> OG only</label>
          <label class="smOpt"><input type="radio" name="setMode" value="cw"> Clone Wars only</label>
          <label class="smOpt"><input type="radio" name="setMode" value="mixed"> Mixed (OG + CW)</label>
        </div>
      </div>
    </div>

    <div class="smSection">
      <div class="smRow">
        <div class="smLabel">Player 1 plays</div>
        <div class="smOptions">
          <label class="smOpt smOptBlue"><input type="radio" name="p1Side" value="blue"> Blue</label>
          <label class="smOpt smOptRed"><input type="radio" name="p1Side" value="red"> Red</label>
        </div>
        <div class="smTiny">Player 2 automatically gets the other side.</div>
      </div>
    </div>

    <div class="smSection">
      <div class="smRow">
        <div class="smLabel">Factions (auto)</div>
        <div class="smTiny">${describeAutoFactionsHTML()}</div>
      </div>
    </div>

    <div class="smSection">
      <div class="smRow">
        <div class="smLabel">Mandalorian</div>
        <div class="smOptions">
          <label class="smOpt">
            <input type="checkbox" name="mandoNeutrals">
            Include Mandalorian as neutrals
          </label>
        </div>
      </div>
    </div>

    <div class="smActions">
      <button class="smBtn" data-action="random">Random</button>
      <button class="smBtn smBtnPrimary" data-action="start">START</button>
    </div>
  `;

  overlay.appendChild(panel);
  table.appendChild(overlay);
  startMenuOverlayEl = overlay;

  // initial UI values
  panel.querySelector(`input[name="setMode"][value="${gameConfig.setMode}"]`).checked = true;
  panel.querySelector(`input[name="p1Side"][value="${gameConfig.p1Side}"]`).checked = true;
  panel.querySelector(`input[name="mandoNeutrals"]`).checked = !!gameConfig.mandoNeutrals;

  function readUIToConfig() {
    gameConfig.setMode = panel.querySelector(`input[name="setMode"]:checked`).value;
    gameConfig.p1Side = panel.querySelector(`input[name="p1Side"]:checked`).value;
    gameConfig.mandoNeutrals = !!panel.querySelector(`input[name="mandoNeutrals"]`).checked;
    applySetModeDefaults();
  }

  panel.addEventListener("change", (e) => {
    // Rebuild when set changes so auto-faction text updates
    if (e.target && e.target.name === "setMode") {
      readUIToConfig();
      renderStartMenu();
      return;
    }
    readUIToConfig();
  });

  panel.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    if (btn.dataset.action === "random") {
      randomizeConfig();
      renderStartMenu();
      return;
    }

    if (btn.dataset.action === "start") {
      readUIToConfig();
      closeStartMenu();
    }
  });
}

menuBtn.addEventListener("click", (e) => {
  e.preventDefault();
  renderStartMenu();
});

// Show menu on load
renderStartMenu();

window.addEventListener("resize", () => fitToScreen());
if (window.visualViewport) window.visualViewport.addEventListener("resize", () => fitToScreen());
