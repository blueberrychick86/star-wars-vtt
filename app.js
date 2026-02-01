console.log("VTT: camera + drag/snap + preview + FORCE(7) + CAPTURED(7) + BASE autofill + stable z-stack + TRAY(draw/search)");

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
  #table { position: fixed; inset: 0; background: #000; overflow: hidden; touch-action: none; }
  #hud { position: fixed; left: 12px; top: 12px; z-index: 100000; display:flex; gap:8px; pointer-events:auto; }
  .hudBtn { background: rgba(255,255,255,0.12); color:#fff; border:1px solid rgba(255,255,255,0.25);
    border-radius:10px; padding:10px 12px; font-weight:700; letter-spacing:0.5px;
    user-select:none; touch-action:manipulation; cursor:pointer; }

  #stage { position:absolute; left:0; top:0; transform-origin:0 0; will-change:transform; }

  .zone { position:absolute; border:2px solid rgba(255,255,255,0.35); border-radius:10px; box-sizing:border-box; background:transparent; }
  .zone.clickable { cursor:pointer; }
  .zone.clickable:hover { border-color: rgba(255,255,255,0.60); background: rgba(255,255,255,0.03); }

  .card { position:absolute; border:2px solid rgba(255,255,255,0.85); border-radius:10px; background:#111;
    box-sizing:border-box; user-select:none; touch-action:none; cursor:grab; overflow:hidden; }

  .cardFace { position:absolute; inset:0; background-size:cover; background-position:center; will-change:transform; }

  /* force track */
  .forceSlot { position:absolute; border-radius:10px; box-sizing:border-box; border:1px dashed rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.02); pointer-events:none; }
  .forceSlot.neutral { border:1px dashed rgba(255,255,255,0.35); background: rgba(255,255,255,0.06); }
  .forceMarker { position:absolute; width:28px; height:28px; border-radius:999px; border:2px solid rgba(255,255,255,0.9);
    background: rgba(120,180,255,0.22); box-shadow:0 8px 20px rgba(0,0,0,0.6); box-sizing:border-box; z-index:99999;
    touch-action:none; cursor:grab; }

  /* captured base slots */
  .capSlot { position:absolute; border-radius:10px; box-sizing:border-box; border:1px dashed rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.01); pointer-events:none; }

  /* preview overlay */
  #previewBackdrop { position:fixed; inset:0; background: rgba(0,0,0,0.62); z-index:200000; display:none;
    align-items:center; justify-content:center; padding:12px; touch-action:none; }

  #previewCard { width:min(96vw, 520px); max-height:92vh; border-radius:16px; border:1px solid rgba(255,255,255,0.22);
    background: rgba(15,15,18,0.98); box-shadow:0 12px 40px rgba(0,0,0,0.7); overflow:hidden; color:#fff;
    display:flex; flex-direction:column; }

  #previewHeader { display:flex; align-items:center; justify-content:space-between; padding:10px 12px;
    border-bottom:1px solid rgba(255,255,255,0.10); }

  #previewHeaderLeft { display:flex; flex-direction:column; gap:2px; }
  #previewTitle { font-size:18px; font-weight:900; margin:0; line-height:1.1; }
  #previewSub { opacity:0.9; font-size:13px; margin:0; }

  #closePreviewBtn { border:1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.08); color:#fff;
    border-radius:12px; padding:8px 10px; font-weight:900; font-size:14px; user-select:none; touch-action:manipulation;
    cursor:pointer; }

  #previewScroll { overflow:auto; -webkit-overflow-scrolling:touch; padding:12px; }
  #previewTop { display:grid; grid-template-columns:110px 1fr; gap:12px; align-items:start; }
  #previewImg { width:110px; aspect-ratio:2.5 / 3.5; border-radius:10px; border:1px solid rgba(255,255,255,0.18);
    background:#000; background-size:cover; background-position:center; }
  .pillRow { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
  .pill { font-size:12px; padding:6px 10px; border-radius:999px; border:1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.06); white-space:nowrap; }
  .sectionLabel { font-size:12px; opacity:0.8; margin:12px 0 6px 0; letter-spacing:0.3px; text-transform:uppercase; }
  .textBox { font-size:14px; line-height:1.3; padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.06); }

  @media (max-width: 380px) {
    #previewTop { grid-template-columns: 96px 1fr; }
    #previewImg { width: 96px; }
    #previewTitle { font-size: 16px; }
  }

  /* -------- TRAY -------- */
  #trayShell {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 150000;
    pointer-events: none;
    padding: 8px;
    box-sizing: border-box;
  }
  #tray {
    width: min(1120px, calc(100vw - 16px));
    margin: 0 auto;
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    border: 1px solid rgba(255,255,255,0.22);
    background: rgba(14,14,16,0.92);
    backdrop-filter: blur(8px);
    box-shadow: 0 -10px 26px rgba(0,0,0,0.55);
    transform: translateY(120%);
    transition: transform 140ms ease-out;
    pointer-events: auto;
    overflow: hidden;
  }
  #tray.open { transform: translateY(0); }
  #trayHeaderBar {
    display:flex; align-items:center; justify-content:space-between;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.10);
  }
  #trayTitle {
    color:#fff;
    font-weight: 900;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    font-size: 12px;
    user-select:none;
  }
  #trayCloseBtn {
    border:1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.08);
    color:#fff;
    border-radius: 12px;
    padding: 8px 10px;
    font-weight: 900;
    cursor:pointer;
    user-select:none;
    touch-action:manipulation;
  }

  #traySearchRow {
    display:none;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.10);
    gap: 10px;
  }
  #traySearchRow.show { display:flex; align-items:center; }
  #traySearchInput {
    flex: 1;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 10px 12px;
    color:#fff;
    font-weight: 800;
    outline: none;
  }
  #traySearchInput::placeholder { color: rgba(255,255,255,0.55); font-weight: 700; }

  #trayBody {
    padding: 10px 12px 14px 12px;
  }
  #trayCarousel {
    display:flex;
    gap: 10px;
    overflow-x:auto;
    overflow-y:hidden;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x;
  }

  .trayTile {
    flex: 0 0 auto;
    width: 108px;
    height: 151px;
    border-radius: 12px;
    border: 2px solid rgba(255,255,255,0.45);
    background: rgba(255,255,255,0.04);
    position: relative;
    overflow: hidden;
    cursor: grab;
    user-select:none;
    touch-action:none;
  }
  .trayTile:active { cursor: grabbing; }
  .trayTileImg {
    position:absolute; inset:0;
    background-size:cover; background-position:center;
    filter: saturate(1.02);
  }
  .trayTileLabel {
    position:absolute; left:8px; right:8px; bottom:8px;
    color: rgba(255,255,255,0.95);
    font-size: 11px;
    font-weight: 900;
    line-height: 1.05;
    text-shadow: 0 1px 2px rgba(0,0,0,0.70);
    pointer-events:none;
  }

  /* public "backs count" indicator on board */
  .trayCountBadge {
    position:absolute;
    width: 42px; height: 42px;
    border-radius: 999px;
    border: 2px solid rgba(255,255,255,0.22);
    background: rgba(255,255,255,0.06);
    display:flex; align-items:center; justify-content:center;
    color: rgba(255,255,255,0.92);
    font-weight: 900;
    box-shadow: 0 10px 20px rgba(0,0,0,0.45);
    pointer-events:none;
    user-select:none;
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

// ---------- preview overlay ----------
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

function hidePreview() { previewBackdrop.style.display = "none"; previewOpen = false; }
function showPreview(cardData) {
  const imgEl = previewBackdrop.querySelector("#previewImg");
  const titleEl = previewBackdrop.querySelector("#previewTitle");
  const subEl = previewBackdrop.querySelector("#previewSub");
  const pillsEl = previewBackdrop.querySelector("#previewPills");
  const effEl = previewBackdrop.querySelector("#previewEffect");
  const rewEl = previewBackdrop.querySelector("#previewReward");
  const scrollEl = previewBackdrop.querySelector("#previewScroll");

  imgEl.style.backgroundImage = `url('${cardData.img || ""}')`;
  titleEl.textContent = cardData.name || "Card";
  subEl.textContent = `${cardData.type || "—"}${cardData.subtype ? " • " + cardData.subtype : ""}`;

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
function togglePreview(cardData) { if (previewOpen) hidePreview(); else showPreview(cardData); }

previewBackdrop.querySelector("#closePreviewBtn").addEventListener("click", (e) => { e.preventDefault(); hidePreview(); });
previewBackdrop.addEventListener("pointerdown", (e) => { if (e.target === previewBackdrop) hidePreview(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && previewOpen) hidePreview(); });

// ---------- TRAY DOM ----------
const trayShell = document.createElement("div");
trayShell.id = "trayShell";
trayShell.style.pointerEvents = "none";

const tray = document.createElement("div");
tray.id = "tray";

const trayHeaderBar = document.createElement("div");
trayHeaderBar.id = "trayHeaderBar";

const trayTitle = document.createElement("div");
trayTitle.id = "trayTitle";
trayTitle.textContent = "TRAY";

const trayCloseBtn = document.createElement("button");
trayCloseBtn.id = "trayCloseBtn";
trayCloseBtn.type = "button";
trayCloseBtn.textContent = "Close";

trayHeaderBar.appendChild(trayTitle);
trayHeaderBar.appendChild(trayCloseBtn);

const traySearchRow = document.createElement("div");
traySearchRow.id = "traySearchRow";

const traySearchInput = document.createElement("input");
traySearchInput.id = "traySearchInput";
traySearchInput.type = "text";
traySearchInput.placeholder = "Search… (blank shows all)";
traySearchRow.appendChild(traySearchInput);

const trayBody = document.createElement("div");
trayBody.id = "trayBody";

const trayCarousel = document.createElement("div");
trayCarousel.id = "trayCarousel";
trayBody.appendChild(trayCarousel);

tray.appendChild(trayHeaderBar);
tray.appendChild(traySearchRow);
tray.appendChild(trayBody);
trayShell.appendChild(tray);
table.appendChild(trayShell);

// ---------- constants ----------
const CARD_W = 86;
const CARD_H = Math.round((CARD_W * 3.5) / 2.5);
const BASE_W = CARD_H;
const BASE_H = CARD_W;

const GAP = 18;
const BIG_GAP = 28;

const CAP_SLOTS = 7;
const CAP_OVERLAP = Math.round(BASE_H * 0.45);
const CAP_W = BASE_W;
const CAP_H = BASE_H + (CAP_SLOTS - 1) * CAP_OVERLAP;

let DESIGN_W = 1;
let DESIGN_H = 1;
function rect(x, y, w, h) { return { x, y, w, h }; }

// ---------- force track ----------
const FORCE_SLOTS = 7;
const FORCE_NEUTRAL_INDEX = 3;
const FORCE_MARKER_SIZE = 28;

let forceSlotCenters = [];
let forceMarker = null;

// ---------- captured stacks (centers + occupancy) ----------
const capSlotCenters = { p1: [], p2: [] };
const capOccupied = { p1: Array(CAP_SLOTS).fill(null), p2: Array(CAP_SLOTS).fill(null) };
let zonesCache = null;

// z-index base for captured stacks
const CAP_Z_BASE = 20000;

// ---------- zone math ----------
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
  DESIGN_H = Math.max(yBottomBase + BASE_H + 18, yCapBottom + CAP_H + 18);

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

    outer_rim: rect(xOuterRim, yRow1 + Math.round((forceTrackH / 2) - (CARD_H / 2)), CARD_W, CARD_H),
    force_track: rect(xForce, yForceTrack, forceTrackW, forceTrackH),
    galaxy_discard: rect(xGalaxyDiscard, yRow1 + Math.round((forceTrackH / 2) - (CARD_H / 2)), CARD_W, CARD_H),

    p1_draw: rect(xPiles, yBottomPiles, CARD_W, CARD_H),
    p1_discard: rect(xPiles + CARD_W + GAP, yBottomPiles, CARD_W, CARD_H),
    p1_base_stack: rect(xRowStart + (rowWidth / 2) - (BASE_W / 2), yBottomBase, BASE_W, BASE_H),

    p1_exile_draw: rect(xOuterRim, yBotExile, CARD_W, CARD_H),
    p1_exile_perm: rect(xOuterRim + CARD_W + GAP, yBotExile, CARD_W, CARD_H),

    p1_captured_bases: rect(xCaptured, yCapBottom, CAP_W, CAP_H),
  };
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
fitBtn.addEventListener("click", (e) => { e.preventDefault(); fitToScreen(); });

const BOARD_MIN_SCALE = 0.25;
const BOARD_MAX_SCALE = 4.0;

function viewportToDesign(vx, vy){
  return { x: (vx - camera.tx) / camera.scale, y: (vy - camera.ty) / camera.scale };
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

const boardPointers = new Map();
let boardLast = { x: 0, y: 0 };
let pinchStartDist = 0;
let pinchStartScale = 1;
let pinchMid = { x: 0, y: 0 };

table.addEventListener("pointerdown", (e) => {
  if (previewOpen) return;
  if (trayState.open) return;
  if (e.target.closest(".card")) return;
  if (e.target.closest(".forceMarker")) return;
  if (e.target.closest("#hud")) return;
  if (e.target.closest("#previewBackdrop")) return;
  if (e.target.closest("#tray")) return;

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
  if (trayState.open) return;
  e.preventDefault();
  const zoomIntensity = 0.0018;
  const delta = -e.deltaY;
  const newScale = camera.scale * (1 + delta * zoomIntensity);
  setScaleAround(newScale, e.clientX, e.clientY);
}, { passive: false });

// ---------- snapping for non-base cards ----------
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

  forceMarker.addEventListener("pointercancel", () => { draggingMarker = false; });

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

  if (forceSlotCenters[initialIndex]) {
    const s = forceSlotCenters[initialIndex];
    forceMarker.style.left = `${s.x - FORCE_MARKER_SIZE / 2}px`;
    forceMarker.style.top  = `${s.y - FORCE_MARKER_SIZE / 2}px`;
  }
}

// ---------- captured bases: slots + occupancy + stable stacking ----------
function buildCapturedBaseSlots(capRect, sideLabel) {
  stage.querySelectorAll(`.capSlot[data-cap-side="${sideLabel}"]`).forEach(el => el.remove());
  capSlotCenters[sideLabel] = [];

  for (let i = 0; i < CAP_SLOTS; i++) {
    const y = capRect.y + i * CAP_OVERLAP;
    const x = capRect.x;

    const slot = document.createElement("div");
    slot.className = "capSlot";
    slot.dataset.capSide = sideLabel;
    slot.style.left = `${x}px`;
    slot.style.top = `${y}px`;
    slot.style.width = `${capRect.w}px`;
    slot.style.height = `${BASE_H}px`;
    stage.appendChild(slot);

    capSlotCenters[sideLabel].push({ x: x + capRect.w / 2, y: y + BASE_H / 2 });
  }
}

function pointInRect(px, py, r) {
  return (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
}

function clearCapturedAssignment(baseEl) {
  const side = baseEl.dataset.capSide;
  const idxStr = baseEl.dataset.capIndex;
  if (!side || idxStr == null) return;

  const idx = Number(idxStr);
  if (!Number.isFinite(idx)) return;

  const id = baseEl.dataset.cardId || null;
  if (capOccupied[side] && capOccupied[side][idx] === id) capOccupied[side][idx] = null;

  delete baseEl.dataset.capSide;
  delete baseEl.dataset.capIndex;
}

function placeBaseAtSlot(baseEl, side, idx) {
  const centers = capSlotCenters[side];
  if (!centers || !centers[idx]) return;

  const w = parseFloat(baseEl.style.width);
  const h = parseFloat(baseEl.style.height);
  const s = centers[idx];

  baseEl.style.left = `${s.x - w / 2}px`;
  baseEl.style.top  = `${s.y - h / 2}px`;
  baseEl.style.zIndex = String(CAP_Z_BASE + idx);

  baseEl.dataset.capSide = side;
  baseEl.dataset.capIndex = String(idx);
  capOccupied[side][idx] = baseEl.dataset.cardId;
}

function normalizeCapturedStacks(side) {
  capOccupied[side] = Array(CAP_SLOTS).fill(null);

  const bases = [...stage.querySelectorAll('.card[data-kind="base"]')]
    .filter(el => el.dataset.capSide === side && el.dataset.capIndex != null);

  bases.sort((a,b) => Number(a.dataset.capIndex) - Number(b.dataset.capIndex));

  let slot = 0;
  for (const b of bases) {
    if (slot >= CAP_SLOTS) slot = CAP_SLOTS - 1;
    placeBaseAtSlot(b, side, slot);
    slot++;
  }

  if (bases.length > CAP_SLOTS) {
    for (let i = CAP_SLOTS; i < bases.length; i++) {
      const b = bases[i];
      placeBaseAtSlot(b, side, CAP_SLOTS - 1);
      const n = i - (CAP_SLOTS - 1);
      b.style.top = `${parseFloat(b.style.top) + n * 2}px`;
      b.style.left = `${parseFloat(b.style.left) + n * 2}px`;
      b.style.zIndex = String(CAP_Z_BASE + (CAP_SLOTS - 1) + n);
    }
  }
}

function snapBaseAutoFill(baseEl) {
  if (!zonesCache) return;

  const w = parseFloat(baseEl.style.width);
  const h = parseFloat(baseEl.style.height);
  const left = parseFloat(baseEl.style.left || "0");
  const top  = parseFloat(baseEl.style.top  || "0");
  const cx = left + w / 2;
  const cy = top + h / 2;

  const inP2 = pointInRect(cx, cy, zonesCache.p2_captured_bases);
  const inP1 = pointInRect(cx, cy, zonesCache.p1_captured_bases);

  const side = inP2 ? "p2" : (inP1 ? "p1" : null);
  if (!side) return;

  let idx = capOccupied[side].findIndex(v => v == null);
  if (idx === -1) idx = CAP_SLOTS - 1;

  placeBaseAtSlot(baseEl, side, idx);
  normalizeCapturedStacks(side);
}

// ---------- DEMO pile data (replace later with real decks) ----------
function uid(prefix="c") { return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`; }

const DEMO_CARDS = [
  {
    img: "./cards/test/obiwan.jpg",
    name: "Obi-Wan Kenobi",
    type: "Unit",
    subtype: "Jedi",
    cost: "6",
    attack: "4",
    resources: "—",
    force: "2",
    effect: "When you reveal Obi-Wan Kenobi from the top of your deck, add him to your hand and reveal the next card instead.",
    reward: "Gain 3 Resources and 3 Force.",
    kind: "unit",
  },
  {
    img: "./cards/test/obiwan.jpg",
    name: "TIE Fighter",
    type: "Ship",
    subtype: "",
    cost: "2",
    attack: "2",
    resources: "—",
    force: "—",
    effect: "Demo card.",
    reward: "—",
    kind: "unit",
  },
  {
    img: "./cards/test/obiwan.jpg",
    name: "Stormtrooper",
    type: "Unit",
    subtype: "Trooper",
    cost: "1",
    attack: "1",
    resources: "—",
    force: "—",
    effect: "Demo card.",
    reward: "—",
    kind: "unit",
  },
  {
    img: "./cards/test/base.jpg",
    name: "Test Base",
    type: "Base",
    subtype: "Location",
    cost: "—",
    attack: "—",
    resources: "—",
    force: "—",
    effect: "Test base card for captured-base auto-fill.",
    reward: "—",
    kind: "base",
  },
];

function cloneDemoCard(i) {
  const src = DEMO_CARDS[i % DEMO_CARDS.length];
  return { ...src, id: uid("card") };
}

const piles = {
  p1_deck: [],
  p2_deck: [],
  p1_discard: [],
  p2_discard: [],
  p1_exile: [],
  p2_exile: [],
};

// Populate decks with demo cards
for (let i = 0; i < 20; i++) piles.p1_deck.push(cloneDemoCard(i));
for (let i = 0; i < 20; i++) piles.p2_deck.push(cloneDemoCard(i + 7));
// Put a few into discard/exile so search is testable
for (let i = 0; i < 6; i++) piles.p1_discard.push(cloneDemoCard(i + 3));
for (let i = 0; i < 4; i++) piles.p1_exile.push(cloneDemoCard(i + 10));
for (let i = 0; i < 5; i++) piles.p2_discard.push(cloneDemoCard(i + 2));
for (let i = 0; i < 3; i++) piles.p2_exile.push(cloneDemoCard(i + 12));

// ---------- unit rotation ----------
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
  if (rot === 0) { cardEl.style.width = `${CARD_W}px`; cardEl.style.height = `${CARD_H}px`; }
  else { cardEl.style.width = `${CARD_H}px`; cardEl.style.height = `${CARD_W}px`; }
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

// ---------- build ----------
let drawCountBadgeP1 = null;
let drawCountBadgeP2 = null;

function ensureDrawCountBadges(zones) {
  // remove old if present (build() clears stage anyway)
  drawCountBadgeP1 = document.createElement("div");
  drawCountBadgeP1.className = "trayCountBadge";
  drawCountBadgeP1.dataset.side = "p1";
  drawCountBadgeP1.textContent = "0";

  drawCountBadgeP2 = document.createElement("div");
  drawCountBadgeP2.className = "trayCountBadge";
  drawCountBadgeP2.dataset.side = "p2";
  drawCountBadgeP2.textContent = "0";

  // place near draw deck slots (design coords)
  const p1 = zones.p1_draw;
  const p2 = zones.p2_draw;

  drawCountBadgeP1.style.left = `${p1.x + p1.w + 12}px`;
  drawCountBadgeP1.style.top  = `${p1.y + 10}px`;

  drawCountBadgeP2.style.left = `${p2.x + p2.w + 12}px`;
  drawCountBadgeP2.style.top  = `${p2.y + 10}px`;

  stage.appendChild(drawCountBadgeP1);
  stage.appendChild(drawCountBadgeP2);
  setDrawCount("p1", trayState.drawItems.filter(x => x.owner === "p1").length);
  setDrawCount("p2", trayState.drawItems.filter(x => x.owner === "p2").length);
}

function setDrawCount(owner, n) {
  if (owner === "p1" && drawCountBadgeP1) drawCountBadgeP1.textContent = String(n);
  if (owner === "p2" && drawCountBadgeP2) drawCountBadgeP2.textContent = String(n);
}

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

    // clickable cues for piles
    if (id === "p1_draw" || id === "p2_draw" ||
        id === "p1_discard" || id === "p2_discard" ||
        id === "p1_exile_draw" || id === "p1_exile_perm" ||
        id === "p2_exile_draw" || id === "p2_exile_perm") {
      el.classList.add("clickable");
    }

    stage.appendChild(el);
  }

  buildForceTrackSlots(zones.force_track);
  ensureForceMarker(FORCE_NEUTRAL_INDEX);

  buildCapturedBaseSlots(zones.p2_captured_bases, "p2");
  buildCapturedBaseSlots(zones.p1_captured_bases, "p1");

  ensureDrawCountBadges(zones);

  applyCamera();
  refreshSnapRects();
  fitToScreen();

  bindPileZoneClicks(); // must rebind after rebuild
}
build();

window.addEventListener("resize", () => fitToScreen());
if (window.visualViewport) window.visualViewport.addEventListener("resize", () => fitToScreen());

// ---------- card factory ----------
function makeCardEl(cardData, kind) {
  const el = document.createElement("div");
  el.className = "card";
  el.dataset.kind = kind;
  el.dataset.cardId = `${cardData.id}_${Math.random().toString(16).slice(2)}`;

  const face = document.createElement("div");
  face.className = "cardFace";
  face.style.backgroundImage = `url('${cardData.img || ""}')`;
  el.appendChild(face);

  if (kind === "unit") {
    el.dataset.rot = "0";
    applyRotationSize(el);
  } else if (kind === "base") {
    el.style.width = `${BASE_W}px`;
    el.style.height = `${BASE_H}px`;
    face.style.transform = "none";
  }

  // Right click / contextmenu = preview (PC)
  el.addEventListener("contextmenu", (e) => { e.preventDefault(); togglePreview(cardData); });

  // Click on board card = preview (mobile/pc), but don't conflict with drag
  el.addEventListener("click", () => {
    if (previewOpen) return;
    togglePreview(cardData);
  });

  attachDragHandlers(el, cardData, kind);
  return el;
}

// ---------- drag handlers (bases only free slot after real drag) ----------
function attachDragHandlers(el, cardData, kind) {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  let pressTimer = null;
  let longPressFired = false;
  let downX = 0;
  let downY = 0;

  let baseHadCapturedAssignment = false;
  let baseFreedAssignment = false;

  function clearPressTimer() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
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

    baseHadCapturedAssignment = (kind === "base" && el.dataset.capSide && el.dataset.capIndex != null);
    baseFreedAssignment = false;

    startLongPress(e);

    dragging = true;

    const stageRect = stage.getBoundingClientRect();
    const px = (e.clientX - stageRect.left) / camera.scale;
    const py = (e.clientY - stageRect.top) / camera.scale;

    const left = parseFloat(el.style.left || "0");
    const top = parseFloat(el.style.top || "0");
    offsetX = px - left;
    offsetY = py - top;

    el.style.zIndex = String(50000);
  });

  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;

    const dx = e.clientX - downX;
    const dy = e.clientY - downY;

    if (!longPressFired && Math.hypot(dx, dy) > 8) {
      clearPressTimer();

      if (kind === "base" && baseHadCapturedAssignment && !baseFreedAssignment) {
        clearCapturedAssignment(el);
        baseFreedAssignment = true;
      }
    }

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

    if (kind === "base") {
      snapBaseAutoFill(el);
      if (!el.dataset.capSide) el.style.zIndex = "12000";
    } else {
      snapCardToNearestZone(el);
      el.style.zIndex = "15000";
    }
  });

  el.addEventListener("pointercancel", () => {
    dragging = false;
    clearPressTimer();
  });
}

// ---------- TRAY state + logic ----------
const trayState = {
  open: false,
  mode: "draw", // "draw" | "search"
  // Draw items: [{ owner, pileKey, card }]
  drawItems: [],
  // Search state
  searchPileKey: null,
  searchOwner: null,
  searchTitle: "",
  searchOriginalIds: [],
  searchRemovedIds: new Set(),
  searchQuery: "",
};

function openTray() {
  tray.classList.add("open");
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  trayShell.style.pointerEvents = "auto";
  // ^ (harmless) keeps pointer-events enabled even if browser drops a style update mid-gesture

  trayState.open = true;
}

function closeTray() {
  if (!trayState.open) return;

  if (trayState.mode === "draw") {
    // Return remaining drawn cards to their original deck pile, preserving order.
    // To restore pre-draw state: push back in reverse draw order.
    const remaining = trayState.drawItems.slice();
    for (let i = remaining.length - 1; i >= 0; i--) {
      const it = remaining[i];
      piles[it.pileKey].push(it.card);
    }
    trayState.drawItems = [];
    setDrawCount("p1", 0);
    setDrawCount("p2", 0);
  } else if (trayState.mode === "search") {
    const pileKey = trayState.searchPileKey;
    if (pileKey) {
      const removed = trayState.searchRemovedIds;

      const byId = new Map();
      for (const c of piles[pileKey]) byId.set(c.id, c);

      // Rebuild from original snapshot order, skipping removed.
      const rebuilt = [];
      for (const id of trayState.searchOriginalIds) {
        if (removed.has(id)) continue;
        const card = byId.get(id);
        if (card) rebuilt.push(card);
      }
      piles[pileKey] = rebuilt;
    }

    trayState.searchPileKey = null;
    trayState.searchOwner = null;
    trayState.searchTitle = "";
    trayState.searchOriginalIds = [];
    trayState.searchRemovedIds = new Set();
    trayState.searchQuery = "";
  }

  trayState.open = false;
  tray.classList.remove("open");
  trayShell.style.pointerEvents = "none";
  traySearchRow.classList.remove("show");
  trayCarousel.innerHTML = "";
}

trayCloseBtn.addEventListener("click", () => {
  if (previewOpen) return;
  closeTray();
});

traySearchInput.addEventListener("input", () => {
  trayState.searchQuery = traySearchInput.value || "";
  renderTray();
});

function normalize(s) { return (s || "").toLowerCase().trim(); }

function openTrayDraw() {
  trayState.mode = "draw";
  trayTitle.textContent = "TRAY (DRAW)";
  traySearchRow.classList.remove("show");
  openTray();
  renderTray();
}

function openTraySearch(owner, pileKey, title) {
  trayState.mode = "search";
  trayState.searchOwner = owner;
  trayState.searchPileKey = pileKey;
  trayState.searchTitle = title;
  trayState.searchQuery = "";
  trayState.searchRemovedIds = new Set();
  trayState.searchOriginalIds = piles[pileKey].map(c => c.id);

  trayTitle.textContent = `SEARCH: ${title}`;
  traySearchInput.value = "";
  traySearchRow.classList.add("show");
  openTray();
  renderTray();
}

function renderTray() {
  trayCarousel.innerHTML = "";

  if (!trayState.open) return;

  if (trayState.mode === "draw") {
    // Show drawn cards (private)
    for (const item of trayState.drawItems) {
      const tile = makeTrayTile(item.card);
      tile.addEventListener("click", () => {
        if (tile.__justDragged) { tile.__justDragged = false; return; }
        showPreview(item.card);
      });
      makeTrayTileDraggable(tile, item.card, () => {
        trayState.drawItems = trayState.drawItems.filter(x => x.card.id !== item.card.id);
        setDrawCount(item.owner, trayState.drawItems.filter(x => x.owner === item.owner).length);
        renderTray();
      });
      trayCarousel.appendChild(tile);
    }
  } else {
    const pileKey = trayState.searchPileKey;
    if (!pileKey) return;

    const q = normalize(trayState.searchQuery);
    const removed = trayState.searchRemovedIds;

    // ordered list from snapshot
    const pileById = new Map();
    for (const c of piles[pileKey]) pileById.set(c.id, c);

    const ordered = [];
    for (const id of trayState.searchOriginalIds) {
      if (removed.has(id)) continue;
      const card = pileById.get(id);
      if (card) ordered.push(card);
    }

    // blank shows all in natural order
    const visible = q ? ordered.filter(c => normalize(c.name).includes(q)) : ordered;

    for (const card of visible) {
      const tile = makeTrayTile(card);
      tile.addEventListener("click", () => {
        if (tile.__justDragged) { tile.__justDragged = false; return; }
        showPreview(card);
      });

      makeTrayTileDraggable(tile, card, () => {
        trayState.searchRemovedIds.add(card.id);
        // Remove from live pile
        piles[pileKey] = piles[pileKey].filter(c => c.id !== card.id);
        renderTray();
      });

      trayCarousel.appendChild(tile);
    }
  }
}

function makeTrayTile(card) {
  const tile = document.createElement("div");
  tile.className = "trayTile";

  const img = document.createElement("div");
  img.className = "trayTileImg";
  img.style.backgroundImage = `url('${card.img || ""}')`;

  const label = document.createElement("div");
  label.className = "trayTileLabel";
  label.textContent = card.name || "Card";

  tile.appendChild(img);
  tile.appendChild(label);
  return tile;
}

// Drag from tray -> board (public)
function makeTrayTileDraggable(tile, card, onCommitToBoard) {
  let dragging = false;
  let ghost = null;
  let start = { x:0, y:0 };

  tile.addEventListener("pointerdown", (e) => {
    if (previewOpen) return;
    e.preventDefault();
    dragging = true;
    tile.__justDragged = false;
    start = { x: e.clientX, y: e.clientY };
    tile.setPointerCapture(e.pointerId);

    // ghost follows pointer (UI layer)
    ghost = document.createElement("div");
    ghost.style.position = "fixed";
    ghost.style.left = `${e.clientX - 54}px`;
    ghost.style.top = `${e.clientY - 75}px`;
    ghost.style.width = "108px";
    ghost.style.height = "151px";
    ghost.style.borderRadius = "12px";
    ghost.style.border = "2px solid rgba(255,255,255,0.85)";
    ghost.style.background = "rgba(20,20,22,0.92)";
    ghost.style.zIndex = "170000";
    ghost.style.pointerEvents = "none";
    ghost.style.boxSizing = "border-box";
    ghost.style.display = "flex";
    ghost.style.alignItems = "center";
    ghost.style.justifyContent = "center";
    ghost.style.color = "#fff";
    ghost.style.fontWeight = "900";
    ghost.style.textAlign = "center";
    ghost.style.padding = "10px";
    ghost.textContent = card.name || "Card";
    document.body.appendChild(ghost);
  });

  tile.addEventListener("pointermove", (e) => {
    if (!dragging || !ghost) return;
    ghost.style.left = `${e.clientX - 54}px`;
    ghost.style.top  = `${e.clientY - 75}px`;
  });

  tile.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;

    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6;
    tile.__justDragged = moved;

    if (ghost) { ghost.remove(); ghost = null; }

    const trayRect = tray.getBoundingClientRect();
    const releasedOverTray = (e.clientY >= trayRect.top);

    if (!releasedOverTray) {
      // Spawn on board at drop location (design coords)
      const p = viewportToDesign(e.clientX, e.clientY);
      const kind = (card.kind === "base" || (card.type || "").toLowerCase() === "base") ? "base" : "unit";
      const el = makeCardEl(card, kind);

      // center at drop point
      const w = kind === "base" ? BASE_W : CARD_W;
      const h = kind === "base" ? BASE_H : CARD_H;

      el.style.left = `${p.x - w / 2}px`;
      el.style.top  = `${p.y - h / 2}px`;
      el.style.zIndex = kind === "base" ? "12000" : "15000";

      stage.appendChild(el);

      if (kind === "base") snapBaseAutoFill(el);
      else snapCardToNearestZone(el);

      onCommitToBoard();
    }
  });

  tile.addEventListener("pointercancel", () => {
    dragging = false;
    if (ghost) { ghost.remove(); ghost = null; }
  });
}

// ---------- pile zone click bindings ----------
function getZoneEl(id) {
  return stage.querySelector(`.zone[data-zone-id="${id}"]`);
}

function bindPileZoneClicks() {
  // Clear previous listeners by cloning nodes (safe & simple)
  for (const id of ["p1_draw","p2_draw","p1_discard","p2_discard","p1_exile_draw","p1_exile_perm","p2_exile_draw","p2_exile_perm"]) {
    const el = getZoneEl(id);
    if (!el) continue;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
  }

  // Re-grab after clone
  const zP1Draw = getZoneEl("p1_draw");
  const zP2Draw = getZoneEl("p2_draw");
  const zP1Discard = getZoneEl("p1_discard");
  const zP2Discard = getZoneEl("p2_discard");
  const zP1ExD = getZoneEl("p1_exile_draw");
  const zP1ExP = getZoneEl("p1_exile_perm");
  const zP2ExD = getZoneEl("p2_exile_draw");
  const zP2ExP = getZoneEl("p2_exile_perm");

  // Draw: 1 per click into tray
  function handleDraw(owner, pileKey) {
    if (previewOpen) return;

    // If tray is open in SEARCH mode, ignore draw clicks to avoid confusion
    if (trayState.open && trayState.mode === "search") return;

    openTrayDraw();
    const card = piles[pileKey].pop();
    if (!card) return;

    trayState.drawItems.push({ owner, pileKey, card });

    setDrawCount(owner, trayState.drawItems.filter(x => x.owner === owner).length);
    renderTray();
  }

  zP1Draw?.addEventListener("click", () => handleDraw("p1", "p1_deck"));
  zP2Draw?.addEventListener("click", () => handleDraw("p2", "p2_deck"));

  // Search: discard/exile opens tray in search mode
  zP1Discard?.addEventListener("click", () => { if (!previewOpen) openTraySearch("p1", "p1_discard", "P1 DISCARD"); });
  zP2Discard?.addEventListener("click", () => { if (!previewOpen) openTraySearch("p2", "p2_discard", "P2 DISCARD"); });

  // Exile draw + exile perm both open same exile pile
  zP1ExD?.addEventListener("click", () => { if (!previewOpen) openTraySearch("p1", "p1_exile", "P1 EXILE"); });
  zP1ExP?.addEventListener("click", () => { if (!previewOpen) openTraySearch("p1", "p1_exile", "P1 EXILE"); });

  zP2ExD?.addEventListener("click", () => { if (!previewOpen) openTraySearch("p2", "p2_exile", "P2 EXILE"); });
  zP2ExP?.addEventListener("click", () => { if (!previewOpen) openTraySearch("p2", "p2_exile", "P2 EXILE"); });
}

// ---------- spawn a couple test cards (kept from your original intent) ----------
const unitCard = makeCardEl(
  {
    id: "obiwan_test",
    img: "./cards/test/obiwan.jpg",
    name: "Obi-Wan Kenobi",
    type: "Unit",
    subtype: "Jedi",
    cost: "6",
    attack: "4",
    resources: "—",
    force: "2",
    effect: "When you reveal Obi-Wan Kenobi from the top of your deck, add him to your hand and reveal the next card instead.",
    reward: "Gain 3 Resources and 3 Force.",
    kind: "unit",
  },
  "unit"
);
unitCard.style.left = `${DESIGN_W * 0.42}px`;
unitCard.style.top  = `${DESIGN_H * 0.12}px`;
unitCard.style.zIndex = "15000";
stage.appendChild(unitCard);

const BASE_TEST_COUNT = 10;
for (let i = 0; i < BASE_TEST_COUNT; i++) {
  const baseCard = makeCardEl(
    {
      id: `base_test_${i}`,
      img: "./cards/test/base.jpg",
      name: "Test Base",
      type: "Base",
      subtype: "Location",
      cost: "—",
      attack: "—",
      resources: "—",
      force: "—",
      effect: "Test base card for captured-base auto-fill.",
      reward: "—",
      kind: "base",
    },
    "base"
  );
  baseCard.style.left = `${DESIGN_W * (0.14 + i * 0.03)}px`;
  baseCard.style.top  = `${DESIGN_H * (0.22 + i * 0.02)}px`;
  baseCard.style.zIndex = "12000";
  stage.appendChild(baseCard);
}

// keyboard rotate for the first unit (kept)
window.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") toggleRotate(unitCard);
});
