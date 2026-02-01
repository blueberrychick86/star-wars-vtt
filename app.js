console.log("VTT: tray(draw+search) + preview + deck-click draw + pile-click search + order-preserve restore");

///////////////////////////////
// Base page
///////////////////////////////
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.height = "100vh";
document.body.style.background = "#000";
document.body.style.overflow = "hidden";
document.body.style.touchAction = "none";
document.body.style.fontFamily = "Arial, sans-serif";

const app = document.getElementById("app");
app.innerHTML = "";

///////////////////////////////
// CSS
///////////////////////////////
const style = document.createElement("style");
style.textContent = `
  #table { position: fixed; inset: 0; background: #000; overflow: hidden; touch-action: none; }

  /* stage/camera */
  #stage {
    position:absolute; left:0; top:0;
    transform-origin:0 0;
    will-change:transform;
  }

  /* zones */
  .zone {
    position:absolute;
    border:2px solid rgba(255,255,255,0.28);
    border-radius:12px;
    box-sizing:border-box;
    background: rgba(255,255,255,0.02);
  }
  .zoneLabel {
    position:absolute; left:10px; top:8px;
    font-size:12px; color: rgba(255,255,255,0.7);
    user-select:none; pointer-events:none;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }
  .zone.clickable {
    cursor:pointer;
    border-color: rgba(255,255,255,0.40);
  }
  .zone.clickable:hover {
    border-color: rgba(255,255,255,0.65);
    background: rgba(255,255,255,0.05);
  }

  /* cards on board */
  .card {
    position:absolute;
    width: 140px; height: 196px; /* 2.5 x 3.5 ratio-ish */
    border-radius:12px;
    border:2px solid rgba(255,255,255,0.85);
    background:#111;
    box-sizing:border-box;
    overflow:hidden;
    user-select:none;
    touch-action:none;
    cursor:grab;
  }
  .card:active { cursor:grabbing; }
  .cardFace {
    position:absolute; inset:0;
    display:flex;
    align-items:center; justify-content:center;
    font-weight:800;
    color:#fff;
    text-align:center;
    padding:10px;
    line-height:1.1;
    background: linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02));
  }
  .cardBack {
    position:absolute; inset:0;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0.02));
    display:flex; align-items:center; justify-content:center;
    color: rgba(255,255,255,0.85);
    font-weight:900;
    letter-spacing:2px;
    text-transform:uppercase;
  }

  /* Public "facedown count" indicator */
  .countStack {
    position:absolute;
    width: 90px; height: 120px;
    border-radius: 12px;
    border: 2px solid rgba(255,255,255,0.25);
    background: rgba(255,255,255,0.03);
    box-sizing:border-box;
    display:flex; align-items:center; justify-content:center;
    color: rgba(255,255,255,0.85);
    font-weight:900;
    user-select:none;
    pointer-events:none;
  }
  .countStack .miniBack {
    position:absolute; inset:10px;
    border-radius:10px;
    border: 1px solid rgba(255,255,255,0.20);
    background: rgba(255,255,255,0.06);
  }
  .countStack .countNum {
    position:relative;
    font-size: 22px;
  }

  /* Bottom tray */
  #trayShell {
    position:fixed;
    left:0; right:0; bottom:0;
    z-index: 100000;
    pointer-events:none; /* enabled only when open */
  }
  #tray {
    margin: 0 auto;
    width: min(1100px, calc(100vw - 16px));
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    border: 2px solid rgba(255,255,255,0.25);
    background: rgba(15,15,15,0.92);
    backdrop-filter: blur(8px);
    transform: translateY(110%);
    transition: transform 140ms ease-out;
    pointer-events:auto;
  }
  #tray.open {
    transform: translateY(0);
  }
  #trayHeader {
    display:flex; align-items:center; justify-content:space-between;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.10);
  }
  #trayTitle {
    color:#fff;
    font-weight:900;
    letter-spacing:0.6px;
    text-transform:uppercase;
    font-size: 13px;
    user-select:none;
  }
  #trayClose {
    background: rgba(255,255,255,0.10);
    color:#fff;
    border:1px solid rgba(255,255,255,0.25);
    border-radius: 10px;
    padding: 8px 10px;
    font-weight:900;
    cursor:pointer;
    user-select:none;
    touch-action:manipulation;
  }

  /* Search input (only in search mode) */
  #traySearchRow {
    display:none;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.10);
    gap: 10px;
    align-items:center;
  }
  #traySearchRow.show { display:flex; }
  #traySearch {
    flex:1;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 12px;
    padding: 10px 12px;
    color:#fff;
    font-weight:800;
    outline:none;
  }
  #traySearch::placeholder { color: rgba(255,255,255,0.55); font-weight:700; }

  /* Carousel */
  #trayBody {
    padding: 10px 12px 14px 12px;
  }
  #carousel {
    display:flex;
    gap: 10px;
    overflow-x:auto;
    overflow-y:hidden;
    padding-bottom: 8px;
    touch-action: pan-x;
    -webkit-overflow-scrolling: touch;
  }
  .trayCard {
    flex: 0 0 auto;
    width: 108px; height: 151px;
    border-radius: 12px;
    border: 2px solid rgba(255,255,255,0.55);
    background: rgba(255,255,255,0.04);
    position:relative;
    cursor:grab;
    user-select:none;
    touch-action:none;
    overflow:hidden;
  }
  .trayCard:active { cursor:grabbing; }
  .trayCard .label {
    position:absolute; left:8px; right:8px; bottom:8px;
    font-size: 11px;
    color: rgba(255,255,255,0.92);
    font-weight: 900;
    text-shadow: 0 1px 2px rgba(0,0,0,0.7);
    line-height:1.05;
  }
  .trayCard .back {
    position:absolute; inset:0;
    display:flex; align-items:center; justify-content:center;
    color: rgba(255,255,255,0.78);
    font-weight: 900;
    letter-spacing: 2px;
    text-transform: uppercase;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16), rgba(255,255,255,0.02));
  }

  /* Preview overlay (blocks interaction) */
  #previewOverlay {
    position:fixed; inset:0;
    background: rgba(0,0,0,0.86);
    z-index: 200000;
    display:none;
    align-items:center; justify-content:center;
    pointer-events:auto;
    touch-action:none;
  }
  #previewOverlay.show { display:flex; }
  #previewPanel {
    width: min(520px, calc(100vw - 24px));
    height: min(760px, calc(100vh - 24px));
    border: 2px solid rgba(255,255,255,0.25);
    border-radius: 16px;
    background: rgba(18,18,18,0.92);
    position:relative;
    overflow:hidden;
    box-sizing:border-box;
  }
  #previewClose {
    position:absolute;
    right: 10px; top: 10px;
    background: rgba(255,255,255,0.10);
    color:#fff;
    border:1px solid rgba(255,255,255,0.25);
    border-radius: 10px;
    padding: 8px 10px;
    font-weight:900;
    cursor:pointer;
    user-select:none;
    touch-action:manipulation;
    z-index: 3;
  }
  #previewViewport {
    position:absolute; inset:0;
    display:flex;
    align-items:center; justify-content:center;
    overflow:hidden;
  }
  #previewCard {
    width: 380px; height: 532px; /* readable */
    border-radius: 16px;
    border: 2px solid rgba(255,255,255,0.55);
    background: rgba(255,255,255,0.04);
    box-sizing:border-box;
    display:flex;
    align-items:center; justify-content:center;
    color:#fff;
    font-weight:900;
    text-align:center;
    padding:16px;
    line-height:1.05;
    transform-origin: center;
  }
`;
document.head.appendChild(style);

///////////////////////////////
// DOM scaffolding
///////////////////////////////
const table = document.createElement("div");
table.id = "table";

const stage = document.createElement("div");
stage.id = "stage";

const trayShell = document.createElement("div");
trayShell.id = "trayShell";

const tray = document.createElement("div");
tray.id = "tray";

const trayHeader = document.createElement("div");
trayHeader.id = "trayHeader";

const trayTitle = document.createElement("div");
trayTitle.id = "trayTitle";
trayTitle.textContent = "Tray";

const trayClose = document.createElement("button");
trayClose.id = "trayClose";
trayClose.textContent = "Close";

trayHeader.appendChild(trayTitle);
trayHeader.appendChild(trayClose);

const traySearchRow = document.createElement("div");
traySearchRow.id = "traySearchRow";

const traySearch = document.createElement("input");
traySearch.id = "traySearch";
traySearch.type = "text";
traySearch.placeholder = "Search cards… (blank shows all)";
traySearchRow.appendChild(traySearch);

const trayBody = document.createElement("div");
trayBody.id = "trayBody";

const carousel = document.createElement("div");
carousel.id = "carousel";
trayBody.appendChild(carousel);

tray.appendChild(trayHeader);
tray.appendChild(traySearchRow);
tray.appendChild(trayBody);
trayShell.appendChild(tray);

const previewOverlay = document.createElement("div");
previewOverlay.id = "previewOverlay";

const previewPanel = document.createElement("div");
previewPanel.id = "previewPanel";

const previewClose = document.createElement("button");
previewClose.id = "previewClose";
previewClose.textContent = "Close";

const previewViewport = document.createElement("div");
previewViewport.id = "previewViewport";

const previewCard = document.createElement("div");
previewCard.id = "previewCard";
previewCard.textContent = "";

previewViewport.appendChild(previewCard);
previewPanel.appendChild(previewClose);
previewPanel.appendChild(previewViewport);
previewOverlay.appendChild(previewPanel);

table.appendChild(stage);
table.appendChild(trayShell);
table.appendChild(previewOverlay);
app.appendChild(table);

///////////////////////////////
// Utility
///////////////////////////////
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function makeId(prefix="c") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

///////////////////////////////
// Camera (simple, stable)
///////////////////////////////
const camera = {
  x: 0,
  y: 0,
  scale: 1,
};

function applyCamera() {
  stage.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
}

function screenToWorld(px, py) {
  const rect = table.getBoundingClientRect();
  const x = (px - rect.left - camera.x) / camera.scale;
  const y = (py - rect.top - camera.y) / camera.scale;
  return { x, y };
}

applyCamera();

// Wheel zoom (desktop)
table.addEventListener("wheel", (e) => {
  // Don't zoom while preview is open
  if (previewOverlay.classList.contains("show")) return;

  e.preventDefault();
  const delta = -Math.sign(e.deltaY) * 0.10;
  const oldScale = camera.scale;
  const newScale = clamp(oldScale * (1 + delta), 0.5, 2.0);

  const before = screenToWorld(e.clientX, e.clientY);
  camera.scale = newScale;
  const after = screenToWorld(e.clientX, e.clientY);

  // Keep mouse point stable
  camera.x += (after.x - before.x) * newScale;
  camera.y += (after.y - before.y) * newScale;

  applyCamera();
}, { passive: false });

// Right-drag pan (desktop). On mobile, panning will come later.
let panDragging = false;
let panStart = { x:0, y:0, camX:0, camY:0 };

table.addEventListener("pointerdown", (e) => {
  if (previewOverlay.classList.contains("show")) return;
  // Right mouse = pan
  if (e.button === 2) {
    panDragging = true;
    panStart = { x:e.clientX, y:e.clientY, camX:camera.x, camY:camera.y };
    table.setPointerCapture(e.pointerId);
  }
});
table.addEventListener("pointermove", (e) => {
  if (!panDragging) return;
  const dx = e.clientX - panStart.x;
  const dy = e.clientY - panStart.y;
  camera.x = panStart.camX + dx;
  camera.y = panStart.camY + dy;
  applyCamera();
});
table.addEventListener("pointerup", (e) => {
  panDragging = false;
});
table.addEventListener("contextmenu", (e) => e.preventDefault()); // keep right click usable

///////////////////////////////
// Data model
///////////////////////////////
const CARD_DB = [
  { name: "X-Wing", type: "ship" },
  { name: "TIE Fighter", type: "ship" },
  { name: "Darth Vader", type: "char" },
  { name: "Luke Skywalker", type: "char" },
  { name: "Blaster Barrage", type: "event" },
  { name: "Force Push", type: "event" },
  { name: "Clone Trooper", type: "unit" },
  { name: "Stormtrooper", type: "unit" },
  { name: "Millennium Falcon", type: "ship" },
  { name: "Obi-Wan Kenobi", type: "char" },
];

function createCardData(seedIdx) {
  const pick = CARD_DB[seedIdx % CARD_DB.length];
  return {
    id: makeId("card"),
    name: pick.name,
    type: pick.type,
  };
}

// piles store card objects in order. We'll treat "top of pile" as the END of the array.
const piles = {
  p1Deck: [],
  p2Deck: [],
  p1Discard: [],
  p2Discard: [],
  p1Exile: [],
  p2Exile: [],
};

for (let i=0; i<25; i++) piles.p1Deck.push(createCardData(i));
for (let i=0; i<25; i++) piles.p2Deck.push(createCardData(i+50));

// Board cards: { card, x, y, faceUp, el }
const boardCards = new Map();

///////////////////////////////
// Zones (clickable piles + play area)
///////////////////////////////
const zones = {};
function addZone(key, x, y, w, h, label, clickable=false) {
  const z = document.createElement("div");
  z.className = "zone" + (clickable ? " clickable" : "");
  z.style.left = `${x}px`;
  z.style.top = `${y}px`;
  z.style.width = `${w}px`;
  z.style.height = `${h}px`;

  const l = document.createElement("div");
  l.className = "zoneLabel";
  l.textContent = label;
  z.appendChild(l);

  stage.appendChild(z);
  zones[key] = { el:z, x, y, w, h, label };
  return z;
}

// Layout baseline (simple starter). You'll adjust these later to your real layout.
const BOARD_W = 2200;
const BOARD_H = 1400;

// Big play area
addZone("playArea", 520, 220, 1160, 920, "Play Area", false);

// P1 (bottom-left-ish)
addZone("p1DeckZone",   80, 980, 180, 260, "P1 Deck", true);
addZone("p1DiscardZone", 280, 980, 180, 260, "P1 Discard", true);
addZone("p1ExileZone",  480, 980, 180, 260, "P1 Exile", true);

// P2 (top-left-ish)
addZone("p2DeckZone",   80, 80, 180, 260, "P2 Deck", true);
addZone("p2DiscardZone", 280, 80, 180, 260, "P2 Discard", true);
addZone("p2ExileZone",  480, 80, 180, 260, "P2 Exile", true);

// Count indicators (opponent-visible “backs” count)
const p1Count = document.createElement("div");
p1Count.className = "countStack";
p1Count.style.left = "690px";
p1Count.style.top = "1030px";
p1Count.innerHTML = `<div class="miniBack"></div><div class="countNum">0</div>`;
stage.appendChild(p1Count);

const p2Count = document.createElement("div");
p2Count.className = "countStack";
p2Count.style.left = "690px";
p2Count.style.top = "130px";
p2Count.innerHTML = `<div class="miniBack"></div><div class="countNum">0</div>`;
stage.appendChild(p2Count);

function setCount(which, n) {
  const el = (which === "p1") ? p1Count : p2Count;
  el.querySelector(".countNum").textContent = String(n);
  el.style.opacity = n > 0 ? "1" : "0.55";
}

///////////////////////////////
// Tray state
///////////////////////////////
const trayState = {
  open: false,
  mode: "draw",        // "draw" | "search"
  owner: "p1",         // which player is using the tray right now
  // draw items: [{ card, returnPileKey }]
  drawItems: [],
  // search: original snapshot of pile at open
  searchPileKey: null,
  searchOriginalIds: [],
  searchRemovedIds: new Set(),
  searchQuery: "",
};

// Helper: open tray in draw mode (owner determines which count indicator updates)
function openTrayDraw(owner) {
  trayState.open = true;
  trayState.mode = "draw";
  trayState.owner = owner;

  trayTitle.textContent = `${owner.toUpperCase()} TRAY (DRAW)`;
  traySearchRow.classList.remove("show");

  tray.classList.add("open");
  trayShell.style.pointerEvents = "auto";

  // Board shift logic is intentionally minimal right now.
  // We avoid covering play area by keeping tray compact.
  renderTray();
}

// Helper: open tray in search mode for a specific pile
function openTraySearch(owner, pileKey, title) {
  trayState.open = true;
  trayState.mode = "search";
  trayState.owner = owner;
  trayState.searchPileKey = pileKey;
  trayState.searchQuery = "";
  traySearch.value = "";
  trayState.searchRemovedIds = new Set();
  trayState.searchOriginalIds = piles[pileKey].map(c => c.id);

  trayTitle.textContent = `${owner.toUpperCase()} SEARCH (${title})`;
  traySearchRow.classList.add("show");

  tray.classList.add("open");
  trayShell.style.pointerEvents = "auto";

  renderTray();
}

// Close tray: return unplayed draw cards; restore search pile order
function closeTray() {
  if (!trayState.open) return;

  if (trayState.mode === "draw") {
    // Return remaining draw items to their return pile, preserving order.
    // To restore pile to pre-draw state, we push back in reverse draw order.
    const remaining = trayState.drawItems;
    for (let i = remaining.length - 1; i >= 0; i--) {
      const item = remaining[i];
      piles[item.returnPileKey].push(item.card);
    }
    trayState.drawItems = [];
    setCount(trayState.owner, 0);
  }

  if (trayState.mode === "search") {
    const pileKey = trayState.searchPileKey;
    if (pileKey) {
      // Rebuild pile in exact original order minus removed.
      const removed = trayState.searchRemovedIds;
      const byId = new Map();
      for (const c of piles[pileKey]) byId.set(c.id, c);
      // BUT piles[pileKey] has been mutated by removals (if any)
      // To be safe, also include any cards that still exist in original snapshot:
      const allCards = [...piles[pileKey]];
      for (const c of allCards) byId.set(c.id, c);

      const rebuilt = [];
      for (const id of trayState.searchOriginalIds) {
        if (removed.has(id)) continue;
        const cardObj = byId.get(id);
        if (cardObj) rebuilt.push(cardObj);
      }
      piles[pileKey] = rebuilt;
    }

    trayState.searchPileKey = null;
    trayState.searchOriginalIds = [];
    trayState.searchRemovedIds = new Set();
    trayState.searchQuery = "";
  }

  trayState.open = false;
  tray.classList.remove("open");
  trayShell.style.pointerEvents = "none";
  carousel.innerHTML = "";
}

trayClose.addEventListener("click", () => {
  if (previewOverlay.classList.contains("show")) return;
  closeTray();
});

traySearch.addEventListener("input", () => {
  trayState.searchQuery = traySearch.value || "";
  renderTray(); // blank shows all (natural order)
});

///////////////////////////////
// Preview overlay (read-only magnifier)
///////////////////////////////
let previewScale = 1;
let previewPan = { x:0, y:0 };
let previewPanning = false;
let previewStart = { x:0, y:0, panX:0, panY:0 };

function openPreview(card) {
  // blocks interaction by design
  previewOverlay.classList.add("show");
  previewOverlay.style.display = "flex";
  previewScale = 1;
  previewPan = { x:0, y:0 };
  applyPreviewTransform();

  previewCard.textContent = card?.name ? card.name : "CARD";
  // (When you wire real images later, you’ll swap previewCard for an <img> or background.)
}

function closePreview() {
  previewOverlay.classList.remove("show");
  previewOverlay.style.display = "none";
}

function applyPreviewTransform() {
  previewCard.style.transform = `translate(${previewPan.x}px, ${previewPan.y}px) scale(${previewScale})`;
}

previewClose.addEventListener("click", closePreview);
previewOverlay.addEventListener("pointerdown", (e) => {
  // drag-to-pan inside preview
  previewPanning = true;
  previewStart = { x: e.clientX, y: e.clientY, panX: previewPan.x, panY: previewPan.y };
  previewOverlay.setPointerCapture(e.pointerId);
});
previewOverlay.addEventListener("pointermove", (e) => {
  if (!previewPanning) return;
  previewPan.x = previewStart.panX + (e.clientX - previewStart.x);
  previewPan.y = previewStart.panY + (e.clientY - previewStart.y);
  applyPreviewTransform();
});
previewOverlay.addEventListener("pointerup", () => {
  previewPanning = false;
});
previewOverlay.addEventListener("wheel", (e) => {
  e.preventDefault();
  const delta = -Math.sign(e.deltaY) * 0.12;
  previewScale = clamp(previewScale * (1 + delta), 0.7, 2.6);
  applyPreviewTransform();
}, { passive:false });

///////////////////////////////
// Render tray
///////////////////////////////
function normalize(s) {
  return (s || "").toLowerCase().trim();
}

function renderTray() {
  carousel.innerHTML = "";

  if (!trayState.open) return;

  if (trayState.mode === "draw") {
    // show drawn cards (private)
    const items = trayState.drawItems;
    for (const item of items) {
      const tile = document.createElement("div");
      tile.className = "trayCard";
      // In draw mode, we show the BACK by default (private reveal happens via preview if needed).
      tile.innerHTML = `<div class="back">DRAW</div><div class="label"></div>`;
      const label = tile.querySelector(".label");
      label.textContent = item.card.name;

      // tap/click for preview
      tile.addEventListener("click", (e) => {
        // prevent click after dragging
        if (tile.__justDragged) { tile.__justDragged = false; return; }
        openPreview(item.card);
      });

      // drag out to board => becomes public
      makeTrayTileDraggable(tile, item.card, () => {
        // remove this item from drawItems
        trayState.drawItems = trayState.drawItems.filter(x => x.card.id !== item.card.id);
        setCount(trayState.owner, trayState.drawItems.length);
        renderTray();
      });

      carousel.appendChild(tile);
    }
  }

  if (trayState.mode === "search") {
    const pileKey = trayState.searchPileKey;
    if (!pileKey) return;

    const q = normalize(trayState.searchQuery);
    const removed = trayState.searchRemovedIds;

    // Build ordered list from original snapshot, excluding removed
    const pileById = new Map();
    for (const c of piles[pileKey]) pileById.set(c.id, c);

    const ordered = [];
    for (const id of trayState.searchOriginalIds) {
      if (removed.has(id)) continue;
      const c = pileById.get(id);
      if (!c) continue;
      ordered.push(c);
    }

    // Filter view only (blank => all in natural order)
    const visible = q
      ? ordered.filter(c => normalize(c.name).includes(q))
      : ordered;

    for (const card of visible) {
      const tile = document.createElement("div");
      tile.className = "trayCard";
      // Search mode shows label; you can swap to show faces later.
      tile.innerHTML = `<div class="back">PILE</div><div class="label"></div>`;
      tile.querySelector(".label").textContent = card.name;

      tile.addEventListener("click", () => openPreview(card));

      makeTrayTileDraggable(tile, card, () => {
        // dragging out removes from pile snapshot set
        trayState.searchRemovedIds.add(card.id);

        // also remove from the live pile array immediately so nothing else can "draw" it
        piles[pileKey] = piles[pileKey].filter(c => c.id !== card.id);

        renderTray();
      });

      carousel.appendChild(tile);
    }
  }
}

///////////////////////////////
// Board card creation + dragging
///////////////////////////////
let zCounter = 1;

function addCardToBoard(card, worldX, worldY) {
  const el = document.createElement("div");
  el.className = "card";
  el.style.left = `${worldX}px`;
  el.style.top = `${worldY}px`;
  el.style.zIndex = String(++zCounter);

  const face = document.createElement("div");
  face.className = "cardFace";
  face.textContent = card.name;

  el.appendChild(face);
  stage.appendChild(el);

  const state = {
    card,
    x: worldX,
    y: worldY,
    faceUp: true,
    el
  };
  boardCards.set(card.id, state);

  // click => preview
  el.addEventListener("click", (e) => {
    if (el.__justDragged) { el.__justDragged = false; return; }
    openPreview(card);
  });

  makeBoardCardDraggable(state);
  return state;
}

function makeBoardCardDraggable(state) {
  const el = state.el;
  let dragging = false;
  let start = { x:0, y:0, ox:0, oy:0 };

  el.addEventListener("pointerdown", (e) => {
    if (previewOverlay.classList.contains("show")) return;
    // don't steal right-click pan
    if (e.button === 2) return;

    dragging = true;
    el.__justDragged = false;
    el.style.zIndex = String(++zCounter);
    start = { x: e.clientX, y: e.clientY, ox: state.x, oy: state.y };
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;

    const dx = (e.clientX - start.x) / camera.scale;
    const dy = (e.clientY - start.y) / camera.scale;
    state.x = start.ox + dx;
    state.y = start.oy + dy;
    el.style.left = `${state.x}px`;
    el.style.top = `${state.y}px`;
  });

  el.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    el.__justDragged = true;

    // basic snap: if dropped near play area bounds, keep as is; later you can snap to slots
    // (intentionally minimal right now)
  });
}

///////////////////////////////
// Dragging from tray to board
///////////////////////////////
function makeTrayTileDraggable(tile, card, onCommitToBoard) {
  let dragging = false;
  let ghost = null;
  let start = { x:0, y:0 };

  tile.addEventListener("pointerdown", (e) => {
    if (previewOverlay.classList.contains("show")) return;
    // prevent default page gestures
    e.preventDefault();

    dragging = true;
    tile.__justDragged = false;
    start = { x: e.clientX, y: e.clientY };

    // Create a ghost that follows the pointer (UI layer)
    ghost = document.createElement("div");
    ghost.style.position = "fixed";
    ghost.style.left = `${e.clientX - 54}px`;
    ghost.style.top = `${e.clientY - 75}px`;
    ghost.style.width = "108px";
    ghost.style.height = "151px";
    ghost.style.borderRadius = "12px";
    ghost.style.border = "2px solid rgba(255,255,255,0.9)";
    ghost.style.background = "rgba(30,30,30,0.9)";
    ghost.style.zIndex = "150000";
    ghost.style.pointerEvents = "none";
    ghost.style.display = "flex";
    ghost.style.alignItems = "center";
    ghost.style.justifyContent = "center";
    ghost.style.color = "#fff";
    ghost.style.fontWeight = "900";
    ghost.style.padding = "10px";
    ghost.style.boxSizing = "border-box";
    ghost.style.textAlign = "center";
    ghost.textContent = card.name;
    document.body.appendChild(ghost);

    tile.setPointerCapture(e.pointerId);
  });

  tile.addEventListener("pointermove", (e) => {
    if (!dragging || !ghost) return;
    ghost.style.left = `${e.clientX - 54}px`;
    ghost.style.top = `${e.clientY - 75}px`;
  });

  tile.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;

    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6;
    tile.__justDragged = moved;

    if (ghost) {
      ghost.remove();
      ghost = null;
    }

    // If released over the table (not over the tray area), commit to board.
    // We'll treat anything above the tray header area as "board".
    const trayRect = tray.getBoundingClientRect();
    const releasedOverTray = (e.clientY >= trayRect.top);

    if (!releasedOverTray) {
      // Convert pointer position to world coords
      const w = screenToWorld(e.clientX, e.clientY);
      addCardToBoard(card, w.x - 70, w.y - 98);
      onCommitToBoard();
    }
  });
}

///////////////////////////////
// Clickable zones: deck draws, discard/exile opens search tray
///////////////////////////////
function zoneCenter(key) {
  const z = zones[key];
  return { x: z.x + z.w/2, y: z.y + z.h/2 };
}

function bindZoneClick(zoneKey, fn) {
  zones[zoneKey].el.addEventListener("click", (e) => {
    if (previewOverlay.classList.contains("show")) return;
    fn(e);
  });
}

// Draw: click deck zone
bindZoneClick("p1DeckZone", () => {
  openTrayDraw("p1");
  const pileKey = "p1Deck";
  const card = piles[pileKey].pop(); // top from end
  if (!card) return;

  trayState.drawItems.push({ card, returnPileKey: pileKey });
  setCount("p1", trayState.drawItems.length);
  renderTray();
});

bindZoneClick("p2DeckZone", () => {
  openTrayDraw("p2");
  const pileKey = "p2Deck";
  const card = piles[pileKey].pop();
  if (!card) return;

  trayState.drawItems.push({ card, returnPileKey: pileKey });
  setCount("p2", trayState.drawItems.length);
  renderTray();
});

// Search: click discard/exile zones
bindZoneClick("p1DiscardZone", () => openTraySearch("p1", "p1Discard", "P1 DISCARD"));
bindZoneClick("p1ExileZone",   () => openTraySearch("p1", "p1Exile",   "P1 EXILE"));
bindZoneClick("p2DiscardZone", () => openTraySearch("p2", "p2Discard", "P2 DISCARD"));
bindZoneClick("p2ExileZone",   () => openTraySearch("p2", "p2Exile",   "P2 EXILE"));

///////////////////////////////
// Demo: put a couple cards on board to test preview
///////////////////////////////
addCardToBoard(createCardData(101), 980, 580);
addCardToBoard(createCardData(102), 1180, 580);

// Start camera centered-ish
camera.x = 40;
camera.y = 20;
camera.scale = 0.9;
applyCamera();

// Initialize counts
setCount("p1", 0);
setCount("p2", 0);
