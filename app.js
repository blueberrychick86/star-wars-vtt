/* app.js — LAYOUT5
   Changes:
   - Swap Draw/Discard pile positions and mirror for P2
   - Tray slightly shorter so piles remain visible
   - Single-click/tap a board card flips it (without breaking drag)
   - Rotate support (keyboard R on desktop; rotate button on selected card for mobile)
   - Snapping centers to slots precisely
*/

/* ------------------------ CONFIG ------------------------ */

const CACHE_TAG = "LAYOUT5";

// Card visual sizes (CSS px). Keep consistent with your existing visuals.
const CARD_W = 125;
const CARD_H = 175;

// Snap threshold (px) — how close to a slot to snap.
const SNAP_DIST = 90;

// Tray height tweak: smaller so draw/discard piles remain visible.
const TRAY_MAX_H_VH = 32; // was taller before; adjust if needed (28–36 is a good range)

// Rotation step
const ROT_STEP = 90;

/* ------------------------ STATE ------------------------ */

const state = {
  trayOpen: false,
  trayMode: "search", // "draw" or "search"
  trayPileKey: null,  // which pile the tray is currently showing
  trayItems: [],      // cards currently in tray (objects)
  trayTokenQuery: "",
  previewOpen: false,

  // privacy not implemented yet (per your handoff)
  // selection
  selectedCardId: null,

  // drag
  dragging: null, // { id, startX, startY, originX, originY, moved }
};

/* ------------------------ DEMO PILES ------------------------ */
/* Keep your demo data; later we’ll bind to real IDs/images. */

function makeDemoCard(id, name) {
  return {
    id,
    name,
    faceUp: true,
    rotation: 0,
    // public when dragged out (your rule)
    isPublic: false,
    // image placeholders:
    imgFront: null,
    imgBack: null,
  };
}

// Demo piles (token-searchable names)
const piles = {
  // P1
  p1Draw: [
    makeDemoCard("p1d1", "Draw Example A"),
    makeDemoCard("p1d2", "Draw Example B"),
    makeDemoCard("p1d3", "Draw Example C"),
  ],
  p1Discard: [
    makeDemoCard("p1dis1", "Discard Example A"),
    makeDemoCard("p1dis2", "Discard Example B"),
    makeDemoCard("p1dis3", "Discard Example C"),
  ],
  p1Exile: [
    makeDemoCard("p1ex1", "Exile Example A"),
    makeDemoCard("p1ex2", "Exile Example B"),
  ],

  // P2
  p2Draw: [
    makeDemoCard("p2d1", "Draw Example A"),
    makeDemoCard("p2d2", "Draw Example B"),
    makeDemoCard("p2d3", "Draw Example C"),
  ],
  p2Discard: [
    makeDemoCard("p2dis1", "Discard Example A"),
    makeDemoCard("p2dis2", "Discard Example B"),
    makeDemoCard("p2dis3", "Discard Example C"),
  ],
  p2Exile: [
    makeDemoCard("p2ex1", "Exile Example A"),
    makeDemoCard("p2ex2", "Exile Example B"),
  ],
};

/* ------------------------ BOARD SLOTS ------------------------ */
/* We’ll keep a simple slot layout and just move the piles.
   Slot ids are used for snap centering.
*/

const slots = []; // { id, x, y, w, h, label }

function buildSlots() {
  slots.length = 0;

  // Table area reference
  // We’ll layout relative to viewport and center-ish
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Table margins
  const left = Math.max(16, Math.floor(vw * 0.05));
  const right = vw - left;

  // Midline
  const midY = Math.floor(vh * 0.52);

  // Pile area columns (left/right)
  const colGap = 24;

  // --- P1 side (left-ish) ---
  // REQUEST: swap draw and discard positions.
  // Previously: (example) draw above discard. Now: discard above draw (or vice versa)
  // Also keep exile nearby.
  const p1X = left + 10;
  const pileYTop = midY - 210;

  // P1 DISCARD on top, DRAW below (swapped)
  slots.push(slot("p1DiscardSlot", p1X, pileYTop, CARD_W, CARD_H, "P1 Discard"));
  slots.push(slot("p1DrawSlot",    p1X, pileYTop + CARD_H + 14, CARD_W, CARD_H, "P1 Draw"));
  slots.push(slot("p1ExileSlot",   p1X, pileYTop + (CARD_H + 14) * 2, CARD_W, CARD_H, "P1 Exile"));

  // --- P2 side (right-ish) mirrored ---
  const p2X = right - CARD_W - 10;

  // Mirror means the same vertical order, but on the opposite side.
  slots.push(slot("p2DiscardSlot", p2X, pileYTop, CARD_W, CARD_H, "P2 Discard"));
  slots.push(slot("p2DrawSlot",    p2X, pileYTop + CARD_H + 14, CARD_W, CARD_H, "P2 Draw"));
  slots.push(slot("p2ExileSlot",   p2X, pileYTop + (CARD_H + 14) * 2, CARD_W, CARD_H, "P2 Exile"));

  // You likely have more slots in your real layout; this is focused on your requested fixes.
}

function slot(id, x, y, w, h, label) {
  return { id, x, y, w, h, label };
}

/* ------------------------ DOM ------------------------ */

const dom = {
  root: null,
  table: null,
  board: null,
  tray: null,
  trayHeader: null,
  traySearch: null,
  trayCarousel: null,
  trayClose: null,
  trayBadge: null,
  previewModal: null,
  previewInner: null,
  previewClose: null,
};

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "style") Object.assign(e.style, v);
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of children) {
    if (typeof c === "string") e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  }
  return e;
}

/* ------------------------ INIT ------------------------ */

window.addEventListener("load", () => {
  dom.root = document.body;

  injectBaseStyles();
  buildSlots();
  buildUI();
  renderAll();

  window.addEventListener("resize", () => {
    buildSlots();
    renderSlots();
  });

  // Desktop rotate: R key rotates selected card 90°
  window.addEventListener("keydown", (e) => {
    if (state.previewOpen) return;
    if (!state.selectedCardId) return;

    if (e.key.toLowerCase() === "r") {
      const cardEl = document.querySelector(`[data-card-id="${state.selectedCardId}"]`);
      if (!cardEl) return;
      rotateCardEl(cardEl, ROT_STEP);
    }
  });
});

/* ------------------------ STYLES ------------------------ */

function injectBaseStyles() {
  const css = `
    :root{
      --card-w:${CARD_W}px;
      --card-h:${CARD_H}px;
      --tray-max-h:${TRAY_MAX_H_VH}vh;
    }
    html,body{
      margin:0; padding:0;
      width:100%; height:100%;
      overflow:hidden;
      background:#111;
      color:#eee;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      user-select:none;
      touch-action:none;
    }
    #table{
      position:relative;
      width:100vw; height:100vh;
      overflow:hidden;
    }
    .slot{
      position:absolute;
      width:var(--card-w);
      height:var(--card-h);
      border:2px solid rgba(255,255,255,0.16);
      border-radius:10px;
      box-sizing:border-box;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:12px;
      color:rgba(255,255,255,0.55);
      background:rgba(255,255,255,0.03);
    }
    .card{
      position:absolute;
      width:var(--card-w);
      height:var(--card-h);
      border-radius:10px;
      overflow:hidden;
      box-shadow:0 10px 24px rgba(0,0,0,0.6);
      background:linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04));
      border:1px solid rgba(255,255,255,0.18);
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
      letter-spacing:0.2px;
      cursor:grab;
      touch-action:none;
      transform-origin:center center;
    }
    .card:active{ cursor:grabbing; }
    .card.selected{
      outline:2px solid rgba(255, 230, 0, 0.85);
      outline-offset:2px;
    }
    .card .label{
      padding:10px;
      text-align:center;
      line-height:1.15;
      font-size:13px;
    }

    /* Mini controls shown on selected card (mobile-friendly) */
    .miniControls{
      position:absolute;
      left:8px;
      right:8px;
      bottom:8px;
      display:flex;
      gap:8px;
      justify-content:space-between;
      pointer-events:none;
    }
    .miniBtn{
      pointer-events:auto;
      flex:1;
      padding:6px 8px;
      font-size:12px;
      border-radius:8px;
      border:1px solid rgba(255,255,255,0.22);
      background:rgba(0,0,0,0.35);
      color:#fff;
      text-align:center;
    }

    /* Tray */
    .tray{
      position:absolute;
      left:50%;
      transform:translateX(-50%);
      bottom:12px;
      width:min(980px, calc(100vw - 24px));
      max-height:var(--tray-max-h);
      border:1px solid rgba(255,255,255,0.18);
      border-radius:16px;
      background:rgba(10,10,10,0.92);
      box-shadow:0 12px 40px rgba(0,0,0,0.6);
      padding:10px 12px;
      display:none;
      z-index:50;
      overflow:hidden;
    }
    .tray.open{ display:block; }
    .trayHeader{
      display:flex;
      align-items:center;
      gap:10px;
      margin-bottom:8px;
    }
    .trayTitle{
      font-weight:800;
      font-size:14px;
      opacity:0.95;
      flex:1;
    }
    .trayBadge{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width:24px;
      height:22px;
      padding:0 8px;
      border-radius:999px;
      background:rgba(255,255,255,0.10);
      border:1px solid rgba(255,255,255,0.18);
      font-size:12px;
      opacity:0.95;
    }
    .trayClose{
      padding:6px 10px;
      border-radius:10px;
      border:1px solid rgba(255,255,255,0.22);
      background:rgba(255,255,255,0.08);
      color:#fff;
      cursor:pointer;
      font-size:12px;
    }
    .traySearch{
      width:100%;
      box-sizing:border-box;
      border-radius:12px;
      padding:10px 12px;
      border:1px solid rgba(255,255,255,0.18);
      background:rgba(0,0,0,0.35);
      color:#fff;
      outline:none;
      margin-bottom:8px;
    }
    .carousel{
      display:flex;
      gap:10px;
      overflow-x:auto;
      padding-bottom:6px;
      -webkit-overflow-scrolling:touch;
    }
    .carousel::-webkit-scrollbar{ height:8px; }
    .carousel::-webkit-scrollbar-thumb{ background:rgba(255,255,255,0.16); border-radius:99px; }
    .trayCard{
      flex:0 0 auto;
      width:var(--card-w);
      height:var(--card-h);
      border-radius:12px;
      border:1px solid rgba(255,255,255,0.18);
      background:rgba(255,255,255,0.06);
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:800;
      cursor:grab;
      position:relative;
    }

    /* Preview modal */
    .previewModal{
      position:absolute;
      inset:0;
      background:rgba(0,0,0,0.76);
      display:none;
      align-items:center;
      justify-content:center;
      z-index:100;
    }
    .previewModal.open{ display:flex; }
    .previewInner{
      width:min(760px, calc(100vw - 24px));
      max-height:min(88vh, 820px);
      overflow:auto;
      background:rgba(15,15,15,0.98);
      border:1px solid rgba(255,255,255,0.18);
      border-radius:18px;
      padding:14px;
      position:relative;
    }
    .previewClose{
      position:sticky;
      top:0;
      float:right;
      padding:8px 10px;
      border-radius:10px;
      border:1px solid rgba(255,255,255,0.22);
      background:rgba(255,255,255,0.10);
      color:#fff;
      cursor:pointer;
      font-size:12px;
      margin-bottom:10px;
    }

    /* When preview open: block pan/zoom by blocking pointer events to table content behind */
    .previewBlocker{
      pointer-events:none;
    }
    .previewModal.open{
      pointer-events:auto;
    }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
}

/* ------------------------ UI BUILD ------------------------ */

function buildUI() {
  // Table root
  dom.table = document.getElementById("table");
  if (!dom.table) {
    dom.table = el("div", { id: "table" });
    dom.root.appendChild(dom.table);
  }

  // Slots layer
  dom.board = el("div", { id: "board", style: { position: "absolute", inset: 0 } });
  dom.table.appendChild(dom.board);

  // Tray
  dom.tray = el("div", { class: "tray", id: "tray" });
  dom.trayHeader = el("div", { class: "trayHeader" }, [
    el("div", { class: "trayTitle", id: "trayTitle" }, ["Tray"]),
    (dom.trayBadge = el("div", { class: "trayBadge", id: "trayBadge" }, ["0"])),
    (dom.trayClose = el("button", { class: "trayClose", id: "trayClose" }, ["Close"])),
  ]);
  dom.tray.appendChild(dom.trayHeader);

  dom.traySearch = el("input", {
    class: "traySearch",
    id: "traySearch",
    placeholder: "Search (token-based)… e.g. discard b",
    autocomplete: "off",
    spellcheck: "false",
  });
  dom.tray.appendChild(dom.traySearch);

  dom.trayCarousel = el("div", { class: "carousel", id: "trayCarousel" });
  dom.tray.appendChild(dom.trayCarousel);

  dom.table.appendChild(dom.tray);

  dom.trayClose.addEventListener("click", closeTray);
  dom.traySearch.addEventListener("input", () => {
    state.trayTokenQuery = dom.traySearch.value;
    renderTray();
  });

  // Preview modal
  dom.previewModal = el("div", { class: "previewModal", id: "previewModal" });
  dom.previewInner = el("div", { class: "previewInner", id: "previewInner" }, [
    (dom.previewClose = el("button", { class: "previewClose" }, ["Close"])),
    el("div", { id: "previewContent" }, ["Preview"]),
  ]);
  dom.previewModal.appendChild(dom.previewInner);
  dom.table.appendChild(dom.previewModal);

  dom.previewClose.addEventListener("click", closePreview);

  // Trap preview events so board doesn’t pan/zoom when open.
  ["pointerdown", "pointermove", "pointerup", "wheel", "touchstart", "touchmove"].forEach((evt) => {
    dom.previewModal.addEventListener(evt, (e) => {
      e.stopPropagation();
      e.preventDefault();
    }, { passive: false });
  });
}

/* ------------------------ RENDER ------------------------ */

function renderAll() {
  renderSlots();
  renderPilesAsCardsOnBoard();
  renderTray();
}

function renderSlots() {
  // Remove old slot nodes
  [...dom.board.querySelectorAll(".slot")].forEach((n) => n.remove());

  for (const s of slots) {
    const node = el("div", {
      class: "slot",
      "data-slot-id": s.id,
      style: { left: `${s.x}px`, top: `${s.y}px` },
    }, [s.label]);
    node.addEventListener("click", () => onSlotClick(s.id));
    dom.board.appendChild(node);
  }
}

function renderPilesAsCardsOnBoard() {
  // Remove existing pile-top cards (we only show one "pile top" card as a clickable zone)
  [...dom.board.querySelectorAll(".card.pileTop")].forEach((n) => n.remove());

  // Render pile-top as a card-shaped clickable placeholder
  const mapping = [
    { pileKey: "p1Draw",    slotId: "p1DrawSlot" },
    { pileKey: "p1Discard", slotId: "p1DiscardSlot" },
    { pileKey: "p1Exile",   slotId: "p1ExileSlot" },
    { pileKey: "p2Draw",    slotId: "p2DrawSlot" },
    { pileKey: "p2Discard", slotId: "p2DiscardSlot" },
    { pileKey: "p2Exile",   slotId: "p2ExileSlot" },
  ];

  for (const m of mapping) {
    const s = slots.find(x => x.id === m.slotId);
    if (!s) continue;

    const count = piles[m.pileKey].length;
    const node = el("div", {
      class: "card pileTop",
      style: { left: `${s.x}px`, top: `${s.y}px` },
      "data-pile-key": m.pileKey,
      "data-card-id": `pileTop-${m.pileKey}`,
    }, [
      el("div", { class: "label" }, [
        `${labelForPile(m.pileKey)}\n(${count})`
      ])
    ]);

    node.addEventListener("click", () => {
      // draw piles: clicking draws one card into tray
      // discard/exile: opens tray search mode
      if (m.pileKey === "p1Draw" || m.pileKey === "p2Draw") {
        openTray("draw", m.pileKey);
        drawOneIntoTray(m.pileKey);
      } else {
        openTray("search", m.pileKey);
      }
    });

    // right click opens preview of pile top (optional)
    node.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openPreview({ name: `${labelForPile(m.pileKey)} (pile)` });
    });

    dom.board.appendChild(node);
  }
}

/* ------------------------ TRAY LOGIC ------------------------ */

function openTray(mode, pileKey) {
  state.trayOpen = true;
  state.trayMode = mode;
  state.trayPileKey = pileKey;
  state.trayTokenQuery = "";
  dom.traySearch.value = "";
  dom.tray.classList.add("open");
  renderTray();
}

function closeTray() {
  // Return unplayed tray cards to pile top preserving order
  // Rule: closing tray returns any unplayed drawn cards to top preserving order.
  // Also for discard/exile search: restore exact order minus removed cards.
  if (state.trayOpen && state.trayPileKey) {
    const pile = piles[state.trayPileKey];

    // We only ever remove from pile temporarily into tray (draw/search).
    // Cards that were dragged out are removed from trayItems already.
    // So to restore: we put remaining trayItems back onto the TOP in the correct order.

    // IMPORTANT: preserve exact original order
    // Our trayItems list is in the same order they were pulled (top-first).
    // To put back onto top preserving order, we unshift in reverse.
    for (let i = state.trayItems.length - 1; i >= 0; i--) {
      pile.unshift(state.trayItems[i]);
    }
  }

  state.trayOpen = false;
  state.trayMode = "search";
  state.trayPileKey = null;
  state.trayItems = [];
  state.trayTokenQuery = "";
  dom.tray.classList.remove("open");
  renderPilesAsCardsOnBoard();
  renderTray();
}

function renderTray() {
  if (!state.trayOpen) {
    dom.trayBadge.textContent = "0";
    dom.trayCarousel.innerHTML = "";
    return;
  }

  const title = state.trayMode === "draw"
    ? `${labelForPile(state.trayPileKey)} — Draw Tray`
    : `${labelForPile(state.trayPileKey)} — Search Tray`;

  dom.tray.querySelector("#trayTitle").textContent = title;

  const badgeCount = (state.trayMode === "draw")
    ? state.trayItems.length
    : piles[state.trayPileKey].length;

  dom.trayBadge.textContent = String(badgeCount);

  // Search mode: show pile items filtered by token query
  let list = [];
  if (state.trayMode === "search") {
    list = [...piles[state.trayPileKey]];
    const q = tokenize(dom.traySearch.value.trim());
    if (q.length) {
      list = list.filter(c => matchesTokens(c.name, q));
    }
  } else {
    // Draw mode: show cards currently in tray (private until dragged out)
    list = [...state.trayItems];
  }

  // Render carousel
  dom.trayCarousel.innerHTML = "";
  list.forEach((card) => {
    const node = el("div", {
      class: "trayCard",
      "data-tray-card-id": card.id,
      draggable: false,
    }, [el("div", { class: "label" }, [card.name])]);

    // Drag from tray to board makes public and removes from tray/pile
    node.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      // If draw mode, card is already removed from pile temporarily (in trayItems)
      // If search mode, remove from pile into "dragging card" now.
      let actualCard = card;

      if (state.trayMode === "search") {
        // remove this card from pile now (public once placed)
        const idx = piles[state.trayPileKey].findIndex(c => c.id === card.id);
        if (idx >= 0) actualCard = piles[state.trayPileKey].splice(idx, 1)[0];
      } else {
        // draw mode: remove from trayItems
        const idx = state.trayItems.findIndex(c => c.id === card.id);
        if (idx >= 0) actualCard = state.trayItems.splice(idx, 1)[0];
      }

      // Spawn board card at tray position and begin drag
      actualCard.isPublic = true;
      spawnBoardCardAtPointer(actualCard, e.clientX, e.clientY);
      renderPilesAsCardsOnBoard();
      renderTray();
    });

    node.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openPreview(card);
    });

    dom.trayCarousel.appendChild(node);
  });
}

function drawOneIntoTray(pileKey) {
  const pile = piles[pileKey];
  if (!pile.length) return;
  // Pull 1 from top into trayItems
  const c = pile.shift();
  state.trayItems.push(c);
  renderPilesAsCardsOnBoard();
  renderTray();
}

/* ------------------------ PREVIEW ------------------------ */

function openPreview(card) {
  state.previewOpen = true;
  dom.previewModal.classList.add("open");
  const content = dom.previewInner.querySelector("#previewContent");
  content.textContent = `Preview: ${card?.name ?? "Card"}`;
}

function closePreview() {
  state.previewOpen = false;
  dom.previewModal.classList.remove("open");
}

/* ------------------------ BOARD CARDS ------------------------ */

function spawnBoardCardAtPointer(card, x, y) {
  // Create a card element on board at pointer, centered
  const node = el("div", {
    class: "card",
    "data-card-id": card.id,
    style: {
      left: `${x - CARD_W / 2}px`,
      top: `${y - CARD_H / 2}px`,
    }
  }, [
    el("div", { class: "label" }, [card.name]),
    el("div", { class: "miniControls", style: { display: "none" } }, [
      el("div", { class: "miniBtn", "data-mini-flip": "1" }, ["Flip"]),
      el("div", { class: "miniBtn", "data-mini-rot": "1" }, ["Rotate"]),
    ])
  ]);

  // store state on element
  node.__cardState = {
    id: card.id,
    name: card.name,
    faceUp: card.faceUp ?? true,
    rotation: card.rotation ?? 0,
  };

  applyCardTransform(node);

  // pointer interactions
  setupCardInteractions(node);

  dom.board.appendChild(node);
  selectCard(node);
  beginDrag(node, x, y);
}

function setupCardInteractions(node) {
  // Single click/tap flip — but only if it was NOT a drag.
  node.addEventListener("pointerdown", (e) => {
    if (state.previewOpen) return;
    e.preventDefault();
    e.stopPropagation();

    // select
    selectCard(node);

    // start drag tracking
    beginDrag(node, e.clientX, e.clientY);
  });

  node.addEventListener("pointermove", (e) => {
    if (!state.dragging || state.dragging.id !== node.dataset.cardId) return;
    e.preventDefault();
    e.stopPropagation();
    moveDrag(node, e.clientX, e.clientY);
  });

  node.addEventListener("pointerup", (e) => {
    if (!state.dragging || state.dragging.id !== node.dataset.cardId) return;
    e.preventDefault();
    e.stopPropagation();

    const moved = state.dragging.moved;
    endDrag(node);

    // If it was a tap/click (no meaningful movement) => flip
    if (!moved) {
      flipCardEl(node);
    } else {
      // If moved => snap to nearest slot center
      snapToNearestSlotCenter(node);
    }
  });

  // Right-click preview (desktop)
  node.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openPreview({ name: node.__cardState?.name ?? "Card" });
  });

  // Mini controls for mobile/any: appear when selected
  node.addEventListener("click", (e) => {
    // no-op; flip handled on pointerup without move
  });
}

function beginDrag(node, x, y) {
  const rect = node.getBoundingClientRect();
  state.dragging = {
    id: node.dataset.cardId,
    startX: x,
    startY: y,
    originLeft: rect.left,
    originTop: rect.top,
    moved: false,
  };
}

function moveDrag(node, x, y) {
  const dx = x - state.dragging.startX;
  const dy = y - state.dragging.startY;

  if (!state.dragging.moved) {
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) state.dragging.moved = true;
  }

  node.style.left = `${state.dragging.originLeft + dx}px`;
  node.style.top = `${state.dragging.originTop + dy}px`;
}

function endDrag(node) {
  state.dragging = null;
}

/* ------------------------ FLIP / ROTATE ------------------------ */

function flipCardEl(node) {
  // Flip toggles faceUp -> just changes label for now (images later).
  const s = node.__cardState;
  s.faceUp = !s.faceUp;

  // For now: show "(Back)" when faceDown
  const label = node.querySelector(".label");
  label.textContent = s.faceUp ? s.name : `${s.name}\n(Back)`;

  applyCardTransform(node);
}

function rotateCardEl(node, deg) {
  const s = node.__cardState;
  s.rotation = (s.rotation + deg) % 360;
  applyCardTransform(node);
  snapToNearestSlotCenter(node); // keep it centered in the slot if it was snapped
}

function applyCardTransform(node) {
  const s = node.__cardState;
  node.style.transform = `rotate(${s.rotation}deg)`;
}

/* ------------------------ SELECTION + MINI UI ------------------------ */

function selectCard(node) {
  // clear other
  document.querySelectorAll(".card.selected").forEach((c) => {
    c.classList.remove("selected");
    const mc = c.querySelector(".miniControls");
    if (mc) mc.style.display = "none";
  });

  node.classList.add("selected");
  state.selectedCardId = node.dataset.cardId;

  // show mini controls (good for mobile rotate)
  const mc = node.querySelector(".miniControls");
  if (mc) {
    mc.style.display = "flex";

    const flipBtn = mc.querySelector('[data-mini-flip="1"]');
    const rotBtn = mc.querySelector('[data-mini-rot="1"]');

    // bind once
    if (!mc.__bound) {
      mc.__bound = true;

      flipBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        flipCardEl(node);
      });

      rotBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        rotateCardEl(node, ROT_STEP);
      });
    }
  }
}

/* ------------------------ SNAPPING (CENTER) ------------------------ */

function snapToNearestSlotCenter(cardEl) {
  const rect = cardEl.getBoundingClientRect();
  const cardCenter = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };

  let best = null;
  for (const s of slots) {
    const sx = s.x + s.w / 2;
    const sy = s.y + s.h / 2;
    const d = Math.hypot(sx - cardCenter.x, sy - cardCenter.y);
    if (best === null || d < best.d) best = { s, d, sx, sy };
  }

  if (!best || best.d > SNAP_DIST) return;

  // Place card so its center aligns with slot center
  const left = best.sx - CARD_W / 2;
  const top = best.sy - CARD_H / 2;

  cardEl.style.left = `${left}px`;
  cardEl.style.top = `${top}px`;
}

/* ------------------------ SLOT CLICK ------------------------ */

function onSlotClick(slotId) {
  // slots themselves are clickable; pile-top cards already handle the pile behavior.
  // Leave this empty for now.
}

/* ------------------------ TOKEN SEARCH ------------------------ */

function tokenize(str) {
  if (!str) return [];
  return str
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function matchesTokens(name, tokens) {
  const n = (name || "").toLowerCase();
  return tokens.every(t => n.includes(t));
}

/* ------------------------ HELPERS ------------------------ */

function labelForPile(pileKey) {
  switch (pileKey) {
    case "p1Draw": return "P1 Draw";
    case "p1Discard": return "P1 Discard";
    case "p1Exile": return "P1 Exile";
    case "p2Draw": return "P2 Draw";
    case "p2Discard": return "P2 Discard";
    case "p2Exile": return "P2 Exile";
    default: return pileKey;
  }
}
