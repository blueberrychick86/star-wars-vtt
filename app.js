console.log("VTT: camera + drag/snap + preview + FORCE(7) + CAPTURED(7) + BASE autofill + stable z-stack");

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

  .card { position:absolute; border:2px solid rgba(255,255,255,0.85); border-radius:10px; background:#111;
    box-sizing:border-box; user-select:none; touch-action:none; cursor:grab; overflow:hidden; }

  .cardFace { position:absolute; inset:0; background-size:cover; background-position:center; will-change:transform; }

  .forceSlot { position:absolute; border-radius:10px; box-sizing:border-box; border:1px dashed rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.02); pointer-events:none; }
  .forceSlot.neutral { border:1px dashed rgba(255,255,255,0.35); background: rgba(255,255,255,0.06); }
  .forceMarker { position:absolute; width:28px; height:28px; border-radius:999px; border:2px solid rgba(255,255,255,0.9);
    background: rgba(120,180,255,0.22); box-shadow:0 8px 20px rgba(0,0,0,0.6); box-sizing:border-box; z-index:99999;
    touch-action:none; cursor:grab; }

  .capSlot { position:absolute; border-radius:10px; box-sizing:border-box; border:1px dashed rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.01); pointer-events:none; }
`;
document.head.appendChild(style);

// ---------- constants ----------
const CARD_W = 86;
const CARD_H = Math.round((CARD_W * 3.5) / 2.5);
const BASE_W = CARD_H;
const BASE_H = CARD_W;

const GAP = 18;
const BIG_GAP = 28;
const BASE_ROW_GAP = 40; // 🔧 NEW: controls distance from Galaxy Row

const CAP_SLOTS = 7;
const CAP_OVERLAP = Math.round(BASE_H * 0.45);
const CAP_W = BASE_W;
const CAP_H = BASE_H + (CAP_SLOTS - 1) * CAP_OVERLAP;

let DESIGN_W = 1;
let DESIGN_H = 1;
function rect(x, y, w, h) { return { x, y, w, h }; }

// ---------- zone math ----------
function computeZones() {
  const xPiles = 240;
  const xGalaxyDeck = xPiles + (CARD_W * 2 + GAP) + BIG_GAP;

  const xRowStart = xGalaxyDeck + CARD_W + BIG_GAP;
  const rowWidth = (CARD_W * 6) + (GAP * 5);

  const xOuterRim = xRowStart + rowWidth + BIG_GAP;
  const xForce = xOuterRim + CARD_W + GAP;
  const xGalaxyDiscard = xForce + 52 + GAP;
  const xCaptured = xGalaxyDiscard + CARD_W + BIG_GAP;

  const yRow1 = 220;
  const yRow2 = yRow1 + CARD_H + GAP;

  // 🔒 DO NOT TOUCH — required by multiple zones
  const yForceTrack = yRow1;
  const forceTrackW = 52;
  const forceTrackH = (CARD_H * 2) + GAP;

  // 🔧 ONLY base stacks move
  const yTopBase = Math.max(20, yRow1 - BASE_H - BASE_ROW_GAP);
  const yBottomBase = yRow2 + CARD_H + BASE_ROW_GAP;

  const yTopPiles = 90;
  const yBottomPiles = yRow2 + CARD_H + 110;

  const yTopExile = yRow1 - (CARD_H + BIG_GAP);
  const yBotExile = yRow2 + CARD_H + BIG_GAP;

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
