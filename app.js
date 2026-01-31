console.log("LAYOUT3: zones + draggable test card + snap");

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
  #table { position: relative; width: 100vw; height: 100vh; background: #000; }

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

// ---------- table ----------
const table = document.createElement("div");
table.id = "table";
app.appendChild(table);

// ---------- constants ----------
const CARD_W = 86;
const CARD_H = Math.round((CARD_W * 3.5) / 2.5);
const GAP = 18;

let DESIGN_W = 1;
let DESIGN_H = 1;

const LEFT_MARGIN = 18;
const TOP_MARGIN = 18;

function rect(x, y, w, h) { return { x, y, w, h }; }

// ---------- zone math (unchanged) ----------
function computeZones() {
  const xPiles = 240;
  const xGalaxyDeck = xPiles + (CARD_W * 2 + GAP) + 28;

  const xRowStart = xGalaxyDeck + CARD_W + 28;
  const rowSlotGap = GAP;

  const yRow1 = 220;
  const yRow2 = yRow1 + CARD_H + GAP;

  const zones = {};

  // galaxy row (2x6)
  for (let c = 0; c < 6; c++) {
    zones[`g1${c + 1}`] = rect(xRowStart + c * (CARD_W + rowSlotGap), yRow1, CARD_W, CARD_H);
    zones[`g2${c + 1}`] = rect(xRowStart + c * (CARD_W + rowSlotGap), yRow2, CARD_W, CARD_H);
  }

  DESIGN_W = xRowStart + (CARD_W + GAP) * 6 + LEFT_MARGIN;
  DESIGN_H = yRow2 + CARD_H + TOP_MARGIN;

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

// ---------- test card ----------
let testCard = null;
let zonesScaled = [];

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
      testCard.style.left = `${e.clientX - tableRect.left - offsetX}px`;
      testCard.style.top = `${e.clientY - tableRect.top - offsetY}px`;
    });

    testCard.addEventListener("pointerup", (e) => {
      dragging = false;
      testCard.style.cursor = "grab";
      try { testCard.releasePointerCapture(e.pointerId); } catch {}

      snapToNearestZone();
    });
  }

  const w = Math.round(CARD_W * s);
  const h = Math.round(CARD_H * s);
  testCard.style.width = `${w}px`;
  testCard.style.height = `${h}px`;

  if (!testCard.dataset.placed) {
    testCard.style.left = `${ox + 40}px`;
    testCard.style.top = `${oy + 40}px`;
    testCard.dataset.placed = "1";
  }
}

// ---------- snapping ----------
function snapToNearestZone() {
  if (!zonesScaled.length) return;

  const cardRect = testCard.getBoundingClientRect();
  const cx = cardRect.left + cardRect.width / 2;
  const cy = cardRect.top + cardRect.height / 2;

  let best = null;
  let bestDist = Infinity;

  for (const z of zonesScaled) {
    const zx = z.left + z.width / 2;
    const zy = z.top + z.height / 2;
    const d = Math.hypot(cx - zx, cy - zy);
    if (d < bestDist) {
      bestDist = d;
      best = z;
    }
  }

  // snap threshold = half a card diagonal
  const snapThreshold = Math.hypot(cardRect.width, cardRect.height) * 0.6;
  if (!best || bestDist > snapThreshold) return;

  const tableRect = table.getBoundingClientRect();
  testCard.style.left = `${best.left - tableRect.left + (best.width - cardRect.width) / 2}px`;
  testCard.style.top = `${best.top - tableRect.top + (best.height - cardRect.height) / 2}px`;
}

// ---------- build ----------
function build() {
  table.innerHTML = "";
  zonesScaled = [];

  const zones = computeZones();
  const { s, ox, oy } = getTransform();

  for (const r of Object.values(zones)) {
    const el = document.createElement("div");
    el.className = "zone";
    el.style.left = `${ox + r.x * s}px`;
    el.style.top = `${oy + r.y * s}px`;
    el.style.width = `${r.w * s}px`;
    el.style.height = `${r.h * s}px`;
    table.appendChild(el);
    zonesScaled.push(el.getBoundingClientRect());
  }

  testCard = null;
  ensureTestCard(s, ox, oy);
}

window.addEventListener("resize", build);
build();
