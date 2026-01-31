console.log("VTT: camera pan/zoom + card drag/snap + preview + FORCE(7) + CAPTURED(7) + BASE drops into captured slots");

//
// ---------- base page ----------
//
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.height = "100vh";
document.body.style.background = "#000";
document.body.style.overflow = "hidden";
document.body.style.touchAction = "none";
document.body.style.fontFamily = "Arial, sans-serif";

const app = document.getElementById("app");
app.innerHTML = "";

//
// ---------- CSS ----------
//
const style = document.createElement("style");
style.textContent = `
  #table {
    position: fixed;
    inset: 0;
    background: #000;
    overflow: hidden;
    touch-action: none;
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
    cursor: pointer;
  }

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
    background: #111;
    box-sizing: border-box;
    user-select: none;
    touch-action: none;
    cursor: grab;
    overflow: hidden;
  }

  .cardFace {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    will-change: transform;
  }

  /* ---------- force track (7 slots + marker) ---------- */
  .forceSlot {
    position: absolute;
    border-radius: 10px;
    box-sizing: border-box;
    border: 1px dashed rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.02);
    pointer-events: none;
  }
  .forceSlot.neutral {
    border: 1px dashed rgba(255,255,255,0.35);
    background: rgba(255,255,255,0.06);
  }
  .forceMarker {
    position: absolute;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    border: 2px solid rgba(255,255,255,0.9);
    background: rgba(120,180,255,0.22);
    box-shadow: 0 8px 20px rgba(0,0,0,0.6);
    box-sizing: border-box;
    z-index: 99999;
    touch-action: none;
    cursor: grab;
  }

  /* ---------- captured bases (7 stepped slots) ---------- */
  .capSlot {
    position: absolute;
    border-radius: 10px;
    box-sizing: border-box;
    border: 1px dashed rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.01);
    pointer-events: none;
  }

  /* ---------- preview overlay ---------- */
  #previewBackdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.62);
    z-index: 200000;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 12px;
    touch-action: none;
  }

  #previewCard {
    width: min(96vw, 520px);
    max-height: 92vh;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.22);
    background: rgba(15,15,18,0.98);
    box-shadow: 0 12px 40px rgba(0,0,0,0.7);
    overflow: hidden;
    color: white;
    display: flex;
    flex-direction: column;
  }

  #previewHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.10);
  }

  #previewHeaderLeft {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  #previewTitle {
    font-size: 18px;
    font-weight: 900;
    margin: 0;
    line-height: 1.1;
  }

  #previewSub {
    opacity: 0.9;
    font-size: 13px;
    margin: 0;
  }

  #closePreviewBtn {
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.08);
    color: white;
    border-radius: 12px;
    padding: 8px 10px;
    font-weight: 900;
    font-size: 14px;
    user-select: none;
    touch-action: manipulation;
    cursor: pointer;
  }

  #previewScroll {
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    padding: 12px;
  }

  #previewTop {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 12px;
    align-items: start;
  }

  #previewImg {
    width: 110px;
    aspect-ratio: 2.5 / 3.5;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.18);
    background: #000;
    background-size: cover;
    background-position: center;
  }

  .pillRow {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }

  .pill {
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.06);
    white-space: nowrap;
  }

  .sectionLabel {
    font-size: 12px;
    opacity: 0.8;
    margin: 12px 0 6px 0;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .textBox {
    font-size: 14px;
    line-height: 1.3;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.06);
  }

  @media (max-width: 380px) {
    #previewTop { grid-template-columns: 96px 1fr; }
    #previewImg { width: 96px; }
    #previewTitle { font-size: 16px; }
  }
`;
document.head.appendChild(style);

//
// ---------- table + hud + stage ----------
//
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

//
// ---------- preview overlay ----------
//
const previewBackdrop = document.createElement("div");
previewBackdrop.id = "previewBackdrop";
previewBackdrop.innerHTML = `
  <div id="previewCard" role="dialog" aria-modal="true">
    <div id="previewHeader">
      <div id="previewHeaderLeft">
        <p id="previewTitle"></p>
        <p id="previewSub"></p>
      </div>
      <button id="closePreviewBtn" type="button">✕</button>
    </div>

    <div id="previewScroll">
      <div id="previewTop">
        <div id="previewImg"></div>
        <div>
          <div class="pillRow" id="previewPills"></div>
        </div>
      </div>

      <div class="sectionLabel">Effect</div>
      <div class="textBox" id="previewEffect"></div>

      <div class="sectionLabel">Reward</div>
      <div class="textBox" id="previewReward"></div>
    </div>
  </div>
`;
table.appendChild(previewBackdrop);

let previewOpen = false;

function hidePreview() {
  previewBackdrop.style.display = "none";
  previewOpen = false;
}
function showPreview(cardData) {
  const imgEl = previewBackdrop.querySelector("#previewImg");
  const titleEl = previewBackdrop.querySelector("#previewTitle");
  const subEl = previewBackdrop.querySelector("#previewSub");
  const pillsEl = previewBackdrop.querySelector("#previewPills");
  const effEl = previewBackdrop.querySelector("#previewEffect");
  const rewEl = previewBackdrop.querySelector("#previewReward");
  const scrollEl = previewBackdrop.querySelector("#previewScroll");

  imgEl.style.backgroundImage = `url('${cardData.img}')`;
  titleEl.textContent = cardData.name;
  subEl.textContent = `${cardData.type}${cardData.subtype ? " • " + cardData.subtype : ""}`;

  pillsEl.innerHTML = "";
  const pills = [
    `Cost: ${cardData.cost ?? "—"}`,
    `Attack: ${cardData.attack ?? "—"}`,
    `Resources: ${cardData.resources ?? "—"}`,
    `Force: ${cardData.force ?? "—"}`,
  ];
  for (const p of pills) {
    const d = document.createElement("div");
    d.className = "pill";
    d.textContent = p;
    pillsEl.appendChild(d);
  }

  effEl.textContent = cardData.effect ?? "—";
  rewEl.textContent = cardData.reward ?? "—";

  previewBackdrop.style.display = "flex";
  previewOpen = true;
  scrollEl.scrollTop = 0;
}
function togglePreview(cardData) {
  if (previewOpen) hidePreview();
  else showPreview(cardData);
}
previewBackdrop.querySelector("#closePreviewBtn").addEventListener("click", (e) => {
  e.preventDefault();
  hidePreview();
});
previewBackdrop.addEventListener("pointerdown", (e) => {
  if (e.target === previewBackdrop) hidePreview();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && previewOpen) hidePreview();
});

//
// ---------- constants (design space) ----------
//
const CARD_W = 86;
const CARD_H = Math.round((CARD_W * 3.5) / 2.5);

const BASE_W = CARD_H; // horizontal base width
const BASE_H = CARD_W; // horizontal base height

const GAP = 18;
const BIG_GAP = 28;

const CAP_SLOTS = 7;
const CAP_OVERLAP = Math.round(BASE_H * 0.45);
const CAP_W = BASE_W;
const CAP_H = BASE_H + (CAP_SLOTS - 1) * CAP_OVERLAP;

let DESIGN_W = 1;
let DESIGN_H = 1;

function rect(x, y, w, h) { return { x, y, w, h }; }

//
// ---------- force track constants ----------
//
const FORCE_SLOTS = 7;
const FORCE_NEUTRAL_INDEX = 3;
const FORCE_MARKER_SIZE = 28;

let forceSlotCenters = [];
let forceMarker = null;

//
// ---------- captured base slot centers (for snapping bases) ----------
//
const capSlotCenters = { p1: [], p2: [] };

//
// ---------- zone math (design-space) ----------
//
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

//
// ---------- camera (fit + pan + zoom) ----------
//
const camera = { scale: 1, tx: 0, ty: 0 };

function viewportSize() {
  const vv = window.visualViewport;
  return { w: vv ? vv.width : window.innerWidth, h: vv ? vv.height : window.innerHeight };
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
  refreshSnapRects();
}
fitBtn.addEventListener("click", (e) => {
  e.preventDefault();
  fitToScreen();
});

//
// Board pan/zoom helpers
//
const BOARD_MIN_SCALE = 0.25;
const BOARD_MAX_SCALE = 4.0;

function viewportToDesign(vx, vy){
  return {
    x: (vx - camera.tx) / camera.scale,
    y: (vy - camera.ty) / camera.scale
  };
}
function setScaleAround(newScale, vx, vy){
  const clamped = Math.max(BOARD_MIN_SCALE, Math.min(BOARD_MAX_SCALE, newScale));
  const world = viewportToDesign(vx, vy);

  camera.scale = clamped;
  camera.tx = vx - world.x * camera.scale;
  camera.ty = vy - world.y * camera.scale;

  applyCamera();
  refreshSnapRects();
}
function dist(a,b){ return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
function mid(a,b){ return { x:(a.clientX+b.clientX)/2, y:(a.clientY+b.clientY)/2 }; }

//
// Board gesture listeners (drag empty space to pan, pinch/wheel to zoom)
// IMPORTANT: ignore gestures if you start on a card, HUD, preview, or force marker.
//
const boardPointers = new Map();
let boardLast = { x: 0, y: 0 };
let pinchStartDist = 0;
let pinchStartScale = 1;
let pinchMid = { x: 0, y: 0 };

table.addEventListener("pointerdown", (e) => {
  if (previewOpen) return;
  if (e.target.closest(".card")) return;
  if (e.target.closest(".forceMarker")) return;
  if (e.target.closest("#hud")) return;
  if (e.target.closest("#previewBackdrop")) return;

  table.setPointerCapture(e.pointerId);
  boardPointers.set(e.pointerId, e);
  boardLast = { x: e.clientX, y: e.clientY };

  if (boardPointers.size === 2) {
    const pts = [...boardPointers.values()];
    pinchStartDist = dist(pts[0], pts[1]);
    pinchStartScale = camera.scale;
    const m = mid(pts[0], pts[1]);
    pinchMid = { x: m.x, y: m.y };
  }
});

table.addEventListener("pointermove", (e) => {
  if (!boardPointers.has(e.pointerId)) return;
  boardPointers.set(e.pointerId, e);

  if (boardPointers.size === 1) {
    const dx = e.clientX - boardLast.x;
    const dy = e.clientY - boardLast.y;
    camera.tx += dx;
    camera.ty += dy;
    boardLast = { x: e.clientX, y: e.clientY };
    applyCamera();
    refreshSnapRects();
    return;
  }

  if (boardPointers.size === 2) {
    const pts = [...boardPointers.values()];
    const d = dist(pts[0], pts[1]);
    const factor = d / pinchStartDist;
    setScaleAround(pinchStartScale * factor, pinchMid.x, pinchMid.y);
  }
});

function endBoardPointer(e){
  boardPointers.delete(e.pointerId);
  if (boardPointers.size === 1){
    const p = [...boardPointers.values()][0];
    boardLast = { x: p.clientX, y: p.clientY };
  }
}
table.addEventListener("pointerup", endBoardPointer);
table.addEventListener("pointercancel", () => boardPointers.clear());

table.addEventListener("wheel", (e) => {
  if (previewOpen) return;
  e.preventDefault();

  const zoomIntensity = 0.0018;
  const delta = -e.deltaY;
  const newScale = camera.scale * (1 + delta * zoomIntensity);

  setScaleAround(newScale, e.clientX, e.clientY);
}, { passive: false });

//
// ---------- snapping for non-base cards ----------
//
const SNAP_ZONE_IDS = new Set([
  "p2_draw","p2_discard","p2_exile_draw","p2_exile_perm",
  "p1_draw","p1_discard","p1_exile_draw","p1_exile_perm",
  "galaxy_deck","galaxy_discard","outer_rim",
  "g11","g12","g13","g14","g15","g16",
  "g21","g22","g23","g24","g25","g26",
  "p2_base_stack","p1_base_stack",
]);

let zonesMeta = [];

function refreshSnapRects() {
  zonesMeta = [];
  stage.querySelectorAll(".zone").forEach((el) => {
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
    if (d < bestDist) { bestDist = d; best = z; }
  }

  const cardDiag = Math.hypot(cardRect.width, cardRect.height);
  const zoneDiag = best ? Math.hypot(best.width, best.height) : cardDiag;
  const threshold = Math.max(cardDiag, zoneDiag) * 0.55;

  if (!best || bestDist > threshold) return;

  const stageRect = stage.getBoundingClientRect();
  const targetCenterX = (best.left + best.width / 2 - stageRect.left) / camera.scale;
  const targetCenterY = (best.top + best.height / 2 - stageRect.top) / camera.scale;

  const w = parseFloat(cardEl.style.width);
  const h = parseFloat(cardEl.style.height);

  cardEl.style.left = `${targetCenterX - w / 2}px`;
  cardEl.style.top  = `${targetCenterY - h / 2}px`;
}

//
// ---------- force track: 7 slots + marker ----------
//
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
    if (previewOpen) return;

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

  forceMarker.addEventListener("pointercancel", () => {
    draggingMarker = false;
  });

  // Tap/click inside force track to jump marker
  stage.addEventListener("pointerdown", (e) => {
    if (previewOpen) return;
    const z = e.target.closest(".zone");
    if (!z || z.dataset.zoneId !== "force_track") return;
    if (!forceSlotCenters.length) return;

    const stageRect = stage.getBoundingClientRect();
    const px = (e.clientX - stageRect.left) / camera.scale;
    const py = (e.clientY - stageRect.top) / camera.scale;

    forceMarker.style.left = `${px - FORCE_MARKER_SIZE / 2}px`;
    forceMarker.style.top  = `${py - FORCE_MARKER_SIZE / 2}px`;
    snapMarkerToNearestSlot();
  });

  // initial placement (neutral)
  if (forceSlotCenters[initialIndex]) {
    const s = forceSlotCenters[initialIndex];
    forceMarker.style.left = `${s.x - FORCE_MARKER_SIZE / 2}px`;
    forceMarker.style.top  = `${s.y - FORCE_MARKER_SIZE / 2}px`;
  }
}

//
// ---------- captured bases: 7 stepped slots (AND centers for snapping) ----------
//
function buildCapturedBaseSlots(capRect, sideLabel) {
  // clear existing for this side
  stage.querySelectorAll(`.capSlot[data-cap-side="${sideLabel}"]`).forEach(el => el.remove());
  capSlotCenters[sideLabel] = [];

  const slotW = capRect.w;
  const slotH = BASE_H;

  for (let i = 0; i < CAP_SLOTS; i++) {
    const y = capRect.y + i * CAP_OVERLAP;
    const x = capRect.x;

    // visual slot
    const slot = document.createElement("div");
    slot.className = "capSlot";
    slot.dataset.capSide = sideLabel;
    slot.style.left = `${x}px`;
    slot.style.top = `${y}px`;
    slot.style.width = `${slotW}px`;
    slot.style.height = `${slotH}px`;
    stage.appendChild(slot);

    // center for snapping (design coords)
    capSlotCenters[sideLabel].push({
      x: x + slotW / 2,
      y: y + slotH / 2
    });
  }
}

// snap BASE card to nearest captured slot (top or bottom)
function snapBaseToCapturedSlot(baseEl) {
  const w = parseFloat(baseEl.style.width);
  const h = parseFloat(baseEl.style.height);

  const left = parseFloat(baseEl.style.left || "0");
  const top  = parseFloat(baseEl.style.top  || "0");
  const cx = left + w / 2;
  const cy = top + h / 2;

  let best = null;
  let bestDist = Infinity;

  function consider(side) {
    for (let i = 0; i < capSlotCenters[side].length; i++) {
      const s = capSlotCenters[side][i];
      const d = Math.hypot(cx - s.x, cy - s.y);
      if (d < bestDist) {
        bestDist = d;
        best = { side, idx: i, x: s.x, y: s.y };
      }
    }
  }

  consider("p2");
  consider("p1");

  // threshold: must be reasonably near the captured area
  const threshold = Math.max(w, h) * 1.2;
  if (!best || bestDist > threshold) return;

  baseEl.style.left = `${best.x - w / 2}px`;
  baseEl.style.top  = `${best.y - h / 2}px`;
}

//
// ---------- test card data ----------
//
const OBIWAN = {
  id: "obiwan_test",
  img: "./cards/test/obiwan.jpg",
  name: "Obi-Wan Kenobi",
  type: "Unit",
  subtype: "Jedi",
  cost: "6",
  attack: "4",
  resources: "—",
  force: "2",
  effect:
    "When you reveal Obi-Wan Kenobi from the top of your deck, add him to your hand and reveal the next card instead.",
  reward: "Gain 3 Resources and 3 Force.",
};

// Test base (use any image you have; swap path later)
const TEST_BASE = {
  id: "base_test",
  img: "./cards/test/base.jpg", // <-- put any base image here (or reuse obiwan.jpg if you want)
  name: "Test Base",
  type: "Base",
  subtype: "Location",
  cost: "—",
  attack: "—",
  resources: "—",
  force: "—",
  effect: "This is a test base card for captured-base slot snapping.",
  reward: "—",
};

//
// ---------- unit rotation (swap size + rotate image) ----------
//
function updateCardFaceRotation(cardEl) {
  const faceEl = cardEl.querySelector(".cardFace");
  if (!faceEl) return;

  const rot = Number(cardEl.dataset.rot || "0");

  if (rot === 0) {
    faceEl.style.left = "0";
    faceEl.style.top = "0";
    faceEl.style.width = "100%";
    faceEl.style.height = "100%";
    faceEl.style.transform = "none";
  } else {
    const w = parseFloat(cardEl.style.width);
    const h = parseFloat(cardEl.style.height);

    faceEl.style.left = "50%";
    faceEl.style.top = "50%";
    faceEl.style.width = `${h}px`;
    faceEl.style.height = `${w}px`;
    faceEl.style.transform = "translate(-50%, -50%) rotate(90deg)";
  }
}

function applyRotationSize(cardEl) {
  const rot = Number(cardEl.dataset.rot || "0");
  if (rot === 0) {
    cardEl.style.width = `${CARD_W}px`;
    cardEl.style.height = `${CARD_H}px`;
  } else {
    cardEl.style.width = `${CARD_H}px`;
    cardEl.style.height = `${CARD_W}px`;
  }
  updateCardFaceRotation(cardEl);
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

  const left = parseFloat(cardEl.style.left || "0");
  const top = parseFloat(cardEl.style.top || "0");
  cardEl.style.left = `${left + (beforeW - afterW) / 2}px`;
  cardEl.style.top  = `${top + (beforeH - afterH) / 2}px`;

  refreshSnapRects();
}

//
// ---------- build stage ----------
//
let zonesCache = null;

function build() {
  stage.innerHTML = "";

  const zones = computeZones();
  zonesCache = zones;

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

  // force slots + marker
  buildForceTrackSlots(zones.force_track);
  ensureForceMarker(FORCE_NEUTRAL_INDEX);

  // captured base slots + centers for snapping
  buildCapturedBaseSlots(zones.p2_captured_bases, "p2");
  buildCapturedBaseSlots(zones.p1_captured_bases, "p1");

  applyCamera();
  refreshSnapRects();
  fitToScreen();
}

build();

window.addEventListener("resize", () => fitToScreen());
if (window.visualViewport) window.visualViewport.addEventListener("resize", () => fitToScreen());

//
// ---------- helper: create a card element ----------
//
function makeCardEl(cardData, kind) {
  const el = document.createElement("div");
  el.className = "card";
  el.dataset.kind = kind;
  el.dataset.cardId = cardData.id;

  // face
  const face = document.createElement("div");
  face.className = "cardFace";
  face.style.backgroundImage = `url('${cardData.img}')`;
  el.appendChild(face);

  // size rules
  if (kind === "unit") {
    el.dataset.rot = "0";
    applyRotationSize(el);
    updateCardFaceRotation(el);
  } else if (kind === "base") {
    // Bases are horizontal: 3.5" wide x 2.5" tall (BASE_W x BASE_H)
    el.style.width = `${BASE_W}px`;
    el.style.height = `${BASE_H}px`;
    // no rotation transforms on base face
    face.style.transform = "none";
  }

  // preview: right click (PC)
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    togglePreview(cardData);
  });

  attachDragHandlers(el, cardData, kind);

  return el;
}

//
// ---------- drag + long-press preview + (unit) rotate ----------
//
function attachDragHandlers(el, cardData, kind) {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  let pressTimer = null;
  let longPressFired = false;
  let downX = 0;
  let downY = 0;

  function clearPressTimer() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

  function startLongPress(e) {
    clearPressTimer();
    longPressFired = false;
    downX = e.clientX;
    downY = e.clientY;

    pressTimer = setTimeout(() => {
      longPressFired = true;
      showPreview(cardData);
    }, 380);
  }

  // Double-tap to rotate ONLY for units
  let lastTap = 0;

  el.addEventListener("pointerdown", (e) => {
    if (previewOpen) return;

    el.setPointerCapture(e.pointerId);

    if (kind === "unit") {
      const now = Date.now();
      if (now - lastTap < 280) {
        toggleRotate(el);
        lastTap = 0;
        clearPressTimer();
        longPressFired = false;
        return;
      }
      lastTap = now;
    }

    startLongPress(e);

    dragging = true;
    const stageRect = stage.getBoundingClientRect();
    const px = (e.clientX - stageRect.left) / camera.scale;
    const py = (e.clientY - stageRect.top) / camera.scale;

    const left = parseFloat(el.style.left || "0");
    const top = parseFloat(el.style.top || "0");
    offsetX = px - left;
    offsetY = py - top;

    // bring to front as you drag more cards later
    el.style.zIndex = String(9000 + Math.floor(Math.random() * 1000));
  });

  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;

    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    if (!longPressFired && Math.hypot(dx, dy) > 8) clearPressTimer();
    if (longPressFired) return;

    const stageRect = stage.getBoundingClientRect();
    const px = (e.clientX - stageRect.left) / camera.scale;
    const py = (e.clientY - stageRect.top) / camera.scale;

    el.style.left = `${px - offsetX}px`;
    el.style.top  = `${py - offsetY}px`;
  });

  el.addEventListener("pointerup", (e) => {
    dragging = false;
    clearPressTimer();
    try { el.releasePointerCapture(e.pointerId); } catch {}

    if (longPressFired) {
      longPressFired = false;
      return;
    }

    // DROP BEHAVIOR
    if (kind === "base") {
      // Bases drop into captured-base slots
      snapBaseToCapturedSlot(el);
    } else {
      // Normal cards use normal snapping
      snapCardToNearestZone(el);
    }
  });

  el.addEventListener("pointercancel", () => {
    dragging = false;
    clearPressTimer();
  });
}

// Keyboard rotate (PC) — rotates ONLY the unit test card we create below
window.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") {
    const unit = stage.querySelector('.card[data-kind="unit"]');
    if (unit) toggleRotate(unit);
  }
});

//
// ---------- spawn test cards ----------
//
const unitCard = makeCardEl(OBIWAN, "unit");
unitCard.style.left = `${DESIGN_W * 0.42}px`;
unitCard.style.top  = `${DESIGN_H * 0.12}px`;
unitCard.style.zIndex = "9999";
stage.appendChild(unitCard);

const baseCard = makeCardEl(TEST_BASE, "base");
baseCard.style.left = `${DESIGN_W * 0.18}px`;
baseCard.style.top  = `${DESIGN_H * 0.18}px`;
baseCard.style.zIndex = "9998";
stage.appendChild(baseCard);
