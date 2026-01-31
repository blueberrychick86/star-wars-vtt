console.log("MOBILE-FIX: camera fit + full zones + black test card + snap + rotate");

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

// ---------- CSS ----------
const style = document.createElement("style");
style.textContent = `
  #table {
    position: fixed;
    inset: 0;
    background: #000;
    overflow: hidden;
  }

  #hud {
    position: fixed;
    left: 12px;
    top: 12px;
    z-index: 100000;
    display: flex;
    gap: 8px;
    pointer-events: auto;
  }

  .hudBtn {
    background: rgba(255,255,255,0.12);
    color: white;
    border: 1px solid rgba(255,255,255,0.25);
    border-radius: 10px;
    padding: 10px 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
    user-select: none;
    touch-action: manipulation;
  }

  /* stage is transformed by our camera */
  #stage {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
    will-change: transform;
  }

  .zone {
    position: absolute;
    border: 2px solid rgba(255,255,255,0.35);
    border-radius: 10px;
    box-sizing: border-box;
    background: transparent;
  }

  .card {
    position: absolute;
    border: 2px solid rgba(255,255,255,0.85);
    border-radius: 10px;
    background: #000;
    color: #fff;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    touch-action: none;
    cursor: grab;
    font-weight: 700;
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

const fitBtn = document.createElement("button");
fitBtn.className = "hudBtn";
fitBtn.textContent = "FIT";
hud.appendChild(fitBtn);

const stage = document.createElement("div");
stage.id = "stage";
table.appendChild(stage);

// ---------- constants from offline ----------
const CARD_W = 86;
const CARD_H = Math.round((CARD_W * 3.5) / 2.5);
const BASE_W = CARD_H;
const BASE_H = CARD_W;

const CAP_W = BASE_W;
const CAP_OVERLAP = Math.round(BASE_H * 0.45);
const CAP_H = BASE_H + (7 - 1) * CAP_OVERLAP;

const GAP = 18;
const BIG_GAP = 28;

let DESIGN_W = 1;
let DESIGN_H = 1;

function rect(x, y, w, h) { return { x, y, w, h }; }

// ---------- zone math (design-space) ----------
function computeZones() {
  const xPiles = 240;
  const xGalaxyDeck = xPiles + (CARD_W * 2 + GAP) + BIG_GAP;

  const xRowStart = xGalaxyDeck + CARD_W + BIG_GAP;
  const rowSlotGap = GAP;
  const rowWidth = (CARD_W * 6) + (rowSlotGap * 5);

  const xOuterRim = xRowStart + rowWidth + BIG_GAP;
  const xForce = xOuterRim + CARD_W + GAP;
  const xGalaxyDiscard = xForce + 52 + GAP;
  const xCaptured = xGalaxyDiscard + CARD_W + BIG_GAP;

  const yTopBase = 20;
  const yTopPiles = 90;

  const yRow1 = 220;
  const yRow2 = yRow1 + CARD_H + GAP;

  const yForceTrack = yRow1;
  const forceTrackW = 52;
  const forceTrackH = (CARD_H * 2) + GAP;

  const yTopExile = yRow1 - (CARD_H + BIG_GAP);
  const yBotExile = yRow2 + CARD_H + BIG_GAP;

  const yBottomPiles = yRow2 + CARD_H + 110;
  const yBottomBase = yBottomPiles + CARD_H + 30;

  const yCapTop = 45;
  const yCapBottom = yRow2 + CARD_H + 35;

  DESIGN_W = xCaptured + CAP_W + 18;
  DESIGN_H = Math.max(
    yBottomBase + BASE_H + 18,
    yCapBottom + CAP_H + 18
  );

  return {
    p2_draw: rect(xPiles, yTopPiles, CARD_W, CARD_H),
    p2_discard: rect(xPiles + CARD_W + GAP, yTopPiles, CARD_W, CARD_H),
    p2_base_stack: rect(xRowStart + (rowWidth / 2) - (BASE_W / 2), yTopBase, BASE_W, BASE_H),

    p2_exile_draw: rect(xOuterRim, yTopExile, CARD_W, CARD_H),
    p2_exile_perm: rect(xOuterRim + CARD_W + GAP, yTopExile, CARD_W, CARD_H),

    p2_captured_bases: rect(xCaptured, yCapTop, CAP_W, CAP_H),

    galaxy_deck: rect(
      xGalaxyDeck,
      yRow1 + Math.round((CARD_H + GAP) / 2) - Math.round(CARD_H / 2),
      CARD_W,
      CARD_H
    ),

    ...(() => {
      const out = {};
      for (let c = 0; c < 6; c++) {
        out[`g1${c + 1}`] = rect(xRowStart + c * (CARD_W + rowSlotGap), yRow1, CARD_W, CARD_H);
        out[`g2${c + 1}`] = rect(xRowStart + c * (CARD_W + rowSlotGap), yRow2, CARD_W, CARD_H);
      }
      return out;
    })(),

    outer_rim: rect(
      xOuterRim,
      yRow1 + Math.round((forceTrackH / 2) - (CARD_H / 2)),
      CARD_W,
      CARD_H
    ),
    force_track: rect(xForce, yForceTrack, forceTrackW, forceTrackH),
    galaxy_discard: rect(
      xGalaxyDiscard,
      yRow1 + Math.round((forceTrackH / 2) - (CARD_H / 2)),
      CARD_W,
      CARD_H
    ),

    p1_draw: rect(xPiles, yBottomPiles, CARD_W, CARD_H),
    p1_discard: rect(xPiles + CARD_W + GAP, yBottomPiles, CARD_W, CARD_H),
    p1_base_stack: rect(xRowStart + (rowWidth / 2) - (BASE_W / 2), yBottomBase, BASE_W, BASE_H),

    p1_exile_draw: rect(xOuterRim, yBotExile, CARD_W, CARD_H),
    p1_exile_perm: rect(xOuterRim + CARD_W + GAP, yBotExile, CARD_W, CARD_H),

    p1_captured_bases: rect(xCaptured, yCapBottom, CAP_W, CAP_H),
  };
}

// ---------- camera (fit + center) ----------
const camera = { scale: 1, tx: 0, ty: 0 };

function viewportSize() {
  // visualViewport is best on iOS Safari (accounts for address bar)
  const vv = window.visualViewport;
  return {
    w: vv ? vv.width : window.innerWidth,
    h: vv ? vv.height : window.innerHeight,
  };
}

function applyCamera() {
  stage.style.transform = `translate(${camera.tx}px, ${camera.ty}px) scale(${camera.scale})`;
}

function fitToScreen() {
  const { w, h } = viewportSize();
  const margin = 16;

  const s = Math.min((w - margin * 2) / DESIGN_W, (h - margin * 2) / DESIGN_H);
  camera.scale = s;

  camera.tx = Math.round((w - DESIGN_W * s) / 2);
  camera.ty = Math.round((h - DESIGN_H * s) / 2);

  applyCamera();
  refreshSnapRects(); // after transform changes
}

fitBtn.addEventListener("click", (e) => {
  e.preventDefault();
  fitToScreen();
});

// ---------- snapping ----------
const SNAP_ZONE_IDS = new Set([
  "p2_draw","p2_discard","p2_exile_draw","p2_exile_perm",
  "p1_draw","p1_discard","p1_exile_draw","p1_exile_perm",
  "galaxy_deck","galaxy_discard","outer_rim",
  "g11","g12","g13","g14","g15","g16",
  "g21","g22","g23","g24","g25","g26",
  "p2_base_stack","p1_base_stack",
]);

let zonesMeta = []; // viewport rects

function refreshSnapRects() {
  zonesMeta = [];
  const els = stage.querySelectorAll(".zone");
  els.forEach((el) => {
    const id = el.dataset.zoneId;
    if (!SNAP_ZONE_IDS.has(id)) return;
    const b = el.getBoundingClientRect();
    zonesMeta.push({ id, left: b.left, top: b.top, width: b.width, height: b.height });
  });
}

function snapCardToNearestZone(cardEl) {
  if (!zonesMeta.length) return;

  const cardRect = cardEl.getBoundingClientRect();
  const cx = cardRect.left + cardRect.width / 2;
  const cy = cardRect.top + cardRect.height / 2;

  let best = null;
  let bestDist = Infinity;

  for (const z of zonesMeta) {
    const zx = z.left + z.width / 2;
    const zy = z.top + z.height / 2;
    const d = Math.hypot(cx - zx, cy - zy);
    if (d < bestDist) {
      bestDist = d;
      best = z;
    }
  }

  const cardDiag = Math.hypot(cardRect.width, cardRect.height);
  const zoneDiag = best ? Math.hypot(best.width, best.height) : cardDiag;
  const threshold = Math.max(cardDiag, zoneDiag) * 0.55;

  if (!best || bestDist > threshold) return;

  // Convert viewport target to stage coords
  const stageRect = stage.getBoundingClientRect();
  const targetCenterX = (best.left + best.width / 2 - stageRect.left) / camera.scale;
  const targetCenterY = (best.top + best.height / 2 - stageRect.top) / camera.scale;

  const w = parseFloat(cardEl.style.width);
  const h = parseFloat(cardEl.style.height);

  cardEl.style.left = `${targetCenterX - w / 2}px`;
  cardEl.style.top  = `${targetCenterY - h / 2}px`;
}

// ---------- rotation (swap size, no transform) ----------
function applyRotationSize(cardEl) {
  const rot = Number(cardEl.dataset.rot || "0");
  if (rot === 0) {
    cardEl.style.width = `${CARD_W}px`;
    cardEl.style.height = `${CARD_H}px`;
  } else {
    cardEl.style.width = `${CARD_H}px`;
    cardEl.style.height = `${CARD_W}px`;
  }
}

function toggleRotate(cardEl) {
  const cur = Number(cardEl.dataset.rot || "0");
  const next = cur === 0 ? 90 : 0;

  const beforeW = parseFloat(cardEl.style.width);
  const beforeH = parseFloat(cardEl.style.height);

  cardEl.dataset.rot = String(next);
  applyRotationSize(cardEl);

  const afterW = parseFloat(cardEl.style.width);
  const afterH = parseFloat(cardEl.style.height);

  // Keep same visual center in stage coords
  const left = parseFloat(cardEl.style.left || "0");
  const top = parseFloat(cardEl.style.top || "0");
  cardEl.style.left = `${left + (beforeW - afterW) / 2}px`;
  cardEl.style.top  = `${top + (beforeH - afterH) / 2}px`;

  refreshSnapRects();
}

// ---------- test card (in stage coords) ----------
const testCard = document.createElement("div");
testCard.className = "card";
testCard.textContent = "TEST CARD";
testCard.dataset.rot = "0";
applyRotationSize(testCard);
testCard.style.left = `${DESIGN_W * 0.42}px`;
testCard.style.top  = `${DESIGN_H * 0.12}px`;
testCard.style.zIndex = "9999";
stage.appendChild(testCard);

// Drag in stage coords (mobile-friendly)
let dragging = false;
let offsetX = 0;
let offsetY = 0;
let lastTapMs = 0;

testCard.addEventListener("pointerdown", (e) => {
  const now = Date.now();
  if (now - lastTapMs < 300) {
    toggleRotate(testCard);
    lastTapMs = 0;
    return;
  }
  lastTapMs = now;

  dragging = true;
  testCard.setPointerCapture(e.pointerId);
  testCard.style.cursor = "grabbing";

  const stageRect = stage.getBoundingClientRect();
  const px = (e.clientX - stageRect.left) / camera.scale;
  const py = (e.clientY - stageRect.top) / camera.scale;

  const left = parseFloat(testCard.style.left || "0");
  const top = parseFloat(testCard.style.top || "0");
  offsetX = px - left;
  offsetY = py - top;
});

testCard.addEventListener("pointermove", (e) => {
  if (!dragging) return;

  const stageRect = stage.getBoundingClientRect();
  const px = (e.clientX - stageRect.left) / camera.scale;
  const py = (e.clientY - stageRect.top) / camera.scale;

  testCard.style.left = `${px - offsetX}px`;
  testCard.style.top  = `${py - offsetY}px`;
});

testCard.addEventListener("pointerup", (e) => {
  dragging = false;
  testCard.style.cursor = "grab";
  try { testCard.releasePointerCapture(e.pointerId); } catch {}
  snapCardToNearestZone(testCard);
});

// Keyboard rotate (PC)
window.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") toggleRotate(testCard);
});

// ---------- build zones ----------
function build() {
  stage.innerHTML = "";
  stage.appendChild(testCard);

  const zones = computeZones();
  stage.style.width = `${DESIGN_W}px`;
  stage.style.height = `${DESIGN_H}px`;

  for (const [id, r] of Object.entries(zones)) {
    const el = document.createElement("div");
    el.className = "zone";
    el.dataset.zoneId = id;
    el.style.left = `${r.x}px`;
    el.style.top = `${r.y}px`;
    el.style.width = `${r.w}px`;
    el.style.height = `${r.h}px`;
    stage.appendChild(el);
  }

  applyCamera();
  refreshSnapRects();
  fitToScreen();
}

build();

// keep fit stable on iOS resize/address-bar changes
window.addEventListener("resize", () => fitToScreen());
if (window.visualViewport) window.visualViewport.addEventListener("resize", () => fitToScreen());
