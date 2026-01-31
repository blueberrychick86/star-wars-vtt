console.log("LAYOUT2-FIX: zones + draggable BLACK test card");

// ---------- base page ----------
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.height = "100vh";
document.body.style.background = "#1b1b1b";
document.body.style.overflow = "hidden";
document.body.style.touchAction = "none";
document.body.style.fontFamily = "Arial, sans-serif";

const app = document.getElementById("app");
app.innerHTML = "";

// ---------- inject CSS ----------
const style = document.createElement("style");
style.textContent = `
  #table { position: relative; width: 100vw; height: 100vh; background: #f6f6f6; }

  .zone {
    position: absolute;
    border: 2px solid rgba(0,0,0,0.35);
    border-radius: 10px;
    box-sizing: border-box;
    background: transparent;
  }

  /* test card */
  .card {
    position: absolute;
    border: 2px solid rgba(255,255,255,0.85); /* FIXED */
    border-radius: 10px;
    background: #000;           /* BLACK card */
    color: #fff;                /* white text */
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    touch-action: none;
    cursor: grab;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
`;
document.head.appendChild(style);

// ---------- table surface ----------
const table = document.createElement("div");
table.id = "table";
app.appendChild(table);

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

const LEFT_MARGIN = 18;
const TOP_MARGIN = 18;

function rect(x, y, w, h) { return { x, y, w, h }; }

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

  DESIGN_W = xCaptured + CAP_W + LEFT_MARGIN;
  DESIGN_H = Math.max(
    yBottomBase + BASE_H + TOP_MARGIN,
    yCapBottom + CAP_H + TOP_MARGIN
  );

  const zones = {
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

  return zones;
}

function getTransform() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const usableW = Math.max(200, w - LEFT_MARGIN * 2);
  const usableH = Math.max(200, h - TOP_MARGIN * 2);
  const s = Math.min(usableW / DESIGN_W, usableH / DESIGN_H);
  const ox = LEFT_MARGIN;
  const oy = (h - DESIGN_H * s) / 2;
  return { s, ox, oy };
}

// ---------- draggable test card ----------
let testCard = null;

function ensureTestCard(s, ox, oy) {
  if (!testCard) {
    testCard = document.createElement("div");
    testCard.className = "card";
    testCard.textContent = "TEST CARD";
    testCard.style.zIndex = "9999";
    table.appendChild(testCard);

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    testCard.addEventListener("pointerdown", (e) => {
      dragging = true;
      testCard.setPointerCapture(e.pointerId);
      testCard.style.cursor = "grabbing";

      const r = testCard.getBoundingClientRect();
      offsetX = e.clientX - r.left;
      offsetY = e.clientY - r.top;
    });

    testCard.addEventListener("pointermove", (e) => {
      if (!dragging) return;

      const tableRect = table.getBoundingClientRect();
      const x = e.clientX - tableRect.left - offsetX;
      const y = e.clientY - tableRect.top - offsetY;

      testCard.style.left = `${x}px`;
      testCard.style.top = `${y}px`;
    });

    testCard.addEventListener("pointerup", (e) => {
      dragging = false;
      testCard.style.cursor = "grab";
      try { testCard.releasePointerCapture(e.pointerId); } catch {}
    });
  }

  const w = Math.round(CARD_W * s);
  const h = Math.round(CARD_H * s);
  testCard.style.width = `${w}px`;
  testCard.style.height = `${h}px`;
  testCard.style.fontSize = `${Math.max(12, Math.round(14 * s))}px`;

  if (!testCard.dataset.placed) {
    const x = ox + (DESIGN_W * s) * 0.5 - w / 2;
    const y = oy + (DESIGN_H * s) * 0.12 - h / 2;
    testCard.style.left = `${Math.round(x)}px`;
    testCard.style.top = `${Math.round(y)}px`;
    testCard.dataset.placed = "1";
  }
}

// ---------- build ----------
function build() {
  table.innerHTML = "";

  const zones = computeZones();
  const { s, ox, oy } = getTransform();

  for (const [id, r] of Object.entries(zones)) {
    const el = document.createElement("div");
    el.className = "zone";
    el.dataset.zoneId = id;
    el.style.left = (ox + r.x * s) + "px";
    el.style.top = (oy + r.y * s) + "px";
    el.style.width = (r.w * s) + "px";
    el.style.height = (r.h * s) + "px";
    table.appendChild(el);
  }

  testCard = null; // re-create after clearing
  ensureTestCard(s, ox, oy);
}

window.addEventListener("resize", build);
build();
