console.log("VTT: aligned layout + tray restored + rotate(90-cycle) + flip(single-tap confirmed) + search/draw tray + captured/exile alignment + zone-acceptance (bases vs units) + per-player token banks (freeform cubes, big sources, no counters) + end-turn return (blue+gold) + UI sizing tweaks");

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

const CAP_SLOTS = 7;
const CAP_OVERLAP = Math.round(BASE_H * 0.45);
const CAP_W = BASE_W;
const CAP_H = BASE_H + (CAP_SLOTS - 1) * CAP_OVERLAP;
const CAP_Z_BASE = 20000;

// Layout knobs
const BASE_ROW_GAP = 480;      // bases farther from galaxy row (mirrored)
const CAP_DISCARD_GAP = 26;    // captured stacks centered around galaxy discard
const EXILE_GAP = GAP;         // gap between exile draw + exile perm piles

// -------- tray drag tuning (mobile-friendly) --------
const TRAY_HOLD_TO_DRAG_MS = 260;   // hold this long to start dragging out of tray
const TRAY_MOVE_CANCEL_PX = 8;      // if you move more than this before hold triggers, it's treated as scroll
const TRAY_TAP_MOVE_PX = 6;         // tap threshold

// -------- player color (for tray border glow) --------
let PLAYER_COLOR = "blue"; // "blue" | "red" | "green"

// -------- token system --------
// Per-player pools (you can tweak these any time)
const TOKENS_DAMAGE_PER_PLAYER   = 25; // red (persistent)
const TOKENS_ATTACK_PER_PLAYER   = 30; // blue (temporary per turn)
const TOKENS_RESOURCE_PER_PLAYER = 20; // gold (temporary per turn)

// Spawned cube size (small enough to sit on cards)
const TOKEN_SIZE = 18;

// Token bank bins: 3 big source cubes in a row.
// IMPORTANT: hit area == visible cube size (no oversized invisible bins).
const TOKEN_BANK_CUBE_SIZE = 44;      // visible source cube
const TOKEN_BIN_W = TOKEN_BANK_CUBE_SIZE;
const TOKEN_BIN_H = TOKEN_BANK_CUBE_SIZE;
const TOKEN_BIN_GAP = 10;

let DESIGN_W = 1;
let DESIGN_H = 1;
function rect(x, y, w, h) { return { x, y, w, h }; }

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
  .zone.clickable{ cursor:pointer; }
  .zone.clickable:hover{ border-color: rgba(255,255,255,0.60); background: rgba(255,255,255,0.03); }

  .card { position:absolute; border:2px solid rgba(255,255,255,0.85); border-radius:10px; background:#111;
    box-sizing:border-box; user-select:none; touch-action:none; cursor:grab; overflow:hidden; }

  .cardFace { position:absolute; inset:0; background-size:cover; background-position:center; will-change:transform; }

  /* Face-down overlay */
  .cardBack {
    position:absolute; inset:0;
    background: repeating-linear-gradient(45deg, rgba(255,255,255,0.10), rgba(255,255,255,0.10) 8px, rgba(0,0,0,0.25) 8px, rgba(0,0,0,0.25) 16px);
    display:none;
    align-items:center;
    justify-content:center;
    color: rgba(255,255,255,0.92);
    font-weight: 900;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    text-shadow: 0 2px 8px rgba(0,0,0,0.7);
  }
  .card[data-face='down'] .cardBack { display:flex; }
  .card[data-face='down'] .cardFace { filter: brightness(0.35); }

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

  /* -------- TRAY (RIGHT DRAWER) -------- */
  #trayShell{
    position: fixed;
    top: 0; bottom: 0; right: 0;
    width: min(150px, 24vw);
    padding: 4px;
    box-sizing: border-box;
    z-index: 150000;
    pointer-events: none;
    display: none;
  }

  #tray{
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.22);
    background: rgba(14,14,16,0.92);
    backdrop-filter: blur(8px);
    box-shadow: -10px 0 26px rgba(0,0,0,0.55);
    overflow: hidden;
    pointer-events: auto;
  }

  #trayHeaderBar{
    display:flex; align-items:center; justify-content:space-between;
    padding: 6px 8px;
    border-bottom: 1px solid rgba(255,255,255,0.10);
    gap: 6px;
  }
  #trayTitle{
    color:#fff;
    font-weight: 900;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    font-size: 10px;
    line-height: 1.1;
    user-select:none;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  #trayCloseBtn{
    border:1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.08);
    color:#fff;
    border-radius: 10px;
    padding: 6px 8px;
    font-weight: 900;
    font-size: 14px;
    cursor:pointer;
    user-select:none;
    touch-action:manipulation;
    line-height: 1;
  }

  #traySearchRow{
    display:none;
    padding: 6px 8px;
    border-bottom: 1px solid rgba(255,255,255,0.10);
    gap: 6px;
  }
  #traySearchRow.show{ display:flex; align-items:center; }
  #traySearchInput{
    flex: 1;
    min-width: 0;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 6px 8px;
    color:#fff;
    font-weight: 800;
    font-size: 12px;
    outline: none;
  }
  #traySearchInput::placeholder{ color: rgba(255,255,255,0.55); font-weight: 700; }

  #trayBody{
    flex: 1;
    overflow: hidden;
    padding: 4px;
  }

  #trayCarousel{
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    padding-right: 2px;
    padding-bottom: 20px;
  }

  #trayShell.dragging #trayCarousel{
    overflow: hidden;
    touch-action: none;
  }

  .trayTile{
    flex: 0 0 auto;
    width: 100%;
    max-width: 84px;
    aspect-ratio: 2.5 / 3.5;
    margin: 0 auto;
    border-radius: 9px;
    border: 2px solid rgba(255,255,255,0.45);
    background: rgba(255,255,255,0.04);
    position: relative;
    overflow: hidden;
    cursor: grab;
    user-select:none;
    touch-action: pan-y;
  }
  .trayTile:active{ cursor: grabbing; }
  .trayTileImg{ position:absolute; inset:0; background-size:cover; background-position:center; }
  .trayTileLabel{
    position:absolute; left:10px; right:10px; bottom:10px;
    color: rgba(255,255,255,0.95);
    font-size: 12px;
    font-weight: 900;
    line-height: 1.05;
    text-shadow: 0 1px 2px rgba(0,0,0,0.70);
    pointer-events:none;
  }

  #trayShell[data-player="blue"] .trayTile{
    border-color: rgba(120,180,255,0.80);
    box-shadow: 0 0 0 2px rgba(120,180,255,0.20), 0 10px 22px rgba(0,0,0,0.45);
  }
  #trayShell[data-player="red"] .trayTile{
    border-color: rgba(255,110,110,0.80);
    box-shadow: 0 0 0 2px rgba(255,110,110,0.20), 0 10px 22px rgba(0,0,0,0.45);
  }
  #trayShell[data-player="green"] .trayTile{
    border-color: rgba(140,255,170,0.80);
    box-shadow: 0 0 0 2px rgba(140,255,170,0.18), 0 10px 22px rgba(0,0,0,0.45);
  }

  .trayCountBadge{
    position:absolute;
    width: 34px; height: 34px;
    border-radius: 999px;
    border: 2px solid rgba(255,255,255,0.20);
    background: rgba(255,255,255,0.06);
    display:flex; align-items:center; justify-content:center;
    color: rgba(255,255,255,0.92);
    font-weight: 900;
    font-size: 12px;
    box-shadow: 0 10px 20px rgba(0,0,0,0.45);
    pointer-events:none;
    user-select:none;
  }

  /* -------- TOKENS (SOURCE BINS) -------- */
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

  .tokenSourceCube{
    position:absolute;
    width:${TOKEN_BANK_CUBE_SIZE}px;
    height:${TOKEN_BANK_CUBE_SIZE}px;
    left:0;
    top:0;
    border-radius: 8px;
    box-sizing: border-box;
    border: 1px solid rgba(255,255,255,0.25);
    box-shadow: 0 10px 22px rgba(0,0,0,0.60);
    pointer-events:none;
    user-select:none;
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

const endP1Btn = document.createElement("button");
endP1Btn.className = "hudBtn";
endP1Btn.textContent = "END P1";
hud.appendChild(endP1Btn);

const endP2Btn = document.createElement("button");
endP2Btn.className = "hudBtn";
endP2Btn.textContent = "END P2";
hud.appendChild(endP2Btn);

const resetTokensBtn = document.createElement("button");
resetTokensBtn.className = "hudBtn";
resetTokensBtn.textContent = "RESET";
hud.appendChild(resetTokensBtn);

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

// HARD-MODAL preview (block board input)
(function trapPreviewInteractions(){
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
  const stopNoPrevent = (e) => { e.stopPropagation(); };

  previewBackdrop.addEventListener("pointerdown", stop, { capture:true });
  previewBackdrop.addEventListener("pointermove", stop, { capture:true });
  previewBackdrop.addEventListener("pointerup", stopNoPrevent, { capture:true });
  previewBackdrop.addEventListener("pointercancel", stopNoPrevent, { capture:true });
  previewBackdrop.addEventListener("wheel", stop, { capture:true, passive:false });

  previewBackdrop.addEventListener("touchstart", stopNoPrevent, { capture:true, passive:true });
  previewBackdrop.addEventListener("touchmove", stop, { capture:true, passive:false });
  previewBackdrop.addEventListener("touchend", stopNoPrevent, { capture:true, passive:true });

  previewBackdrop.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); }, { capture:true });
})();

// ---------- tray ----------
const trayShell = document.createElement("div");
trayShell.id = "trayShell";
trayShell.style.pointerEvents = "none";
trayShell.style.display = "none";
trayShell.dataset.player = PLAYER_COLOR; // glow

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
trayCloseBtn.textContent = "✕";
trayCloseBtn.setAttribute("aria-label", "Close tray");

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

// Stop tray interactions from bubbling into board pan/zoom
trayShell.addEventListener("pointerdown", (e) => e.stopPropagation());
trayShell.addEventListener("pointermove", (e) => e.stopPropagation());
trayShell.addEventListener("pointerup",   (e) => e.stopPropagation());
trayShell.addEventListener("wheel",       (e) => e.stopPropagation(), { passive: true });

// ---------- state ----------
let piles = {};
let previewOpen = false;

let forceSlotCenters = [];
let forceMarker = null;

const capSlotCenters = { p1: [], p2: [] };
const capOccupied = { p1: Array(CAP_SLOTS).fill(null), p2: Array(CAP_SLOTS).fill(null) };
let zonesCache = null;

// token state
const tokenPools = {
  p1: { damage: TOKENS_DAMAGE_PER_PLAYER, attack: TOKENS_ATTACK_PER_PLAYER, resource: TOKENS_RESOURCE_PER_PLAYER },
  p2: { damage: TOKENS_DAMAGE_PER_PLAYER, attack: TOKENS_ATTACK_PER_PLAYER, resource: TOKENS_RESOURCE_PER_PLAYER },
};
const tokenEls = new Set(); // live token elements on board

// ---------- preview functions ----------
function hidePreview() {
  previewBackdrop.style.display = "none";
  previewOpen = false;
  boardPointers.clear();
}

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

  boardPointers.clear();
  scrollEl.scrollTop = 0;
}

function togglePreview(cardData) { if (previewOpen) hidePreview(); else showPreview(cardData); }

previewBackdrop.querySelector("#closePreviewBtn").addEventListener("click", (e) => { e.preventDefault(); hidePreview(); });
previewBackdrop.addEventListener("pointerdown", (e) => { if (e.target === previewBackdrop) hidePreview(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && previewOpen) hidePreview(); });

// ---------- TRAY state + behavior ----------
const trayState = {
  open: false,
  mode: "draw",
  drawItems: [],
  searchPileKey: null,
  searchOwner: null,
  searchTitle: "",
  searchOriginalIds: [],
  searchRemovedIds: new Set(),
  searchQuery: "",
};

function setTrayPlayerColor(color) {
  PLAYER_COLOR = color;
  trayShell.dataset.player = color;
}

function openTray() {
  trayShell.style.display = "block";
  trayShell.style.pointerEvents = "auto";
  trayState.open = true;
  trayShell.dataset.player = PLAYER_COLOR;
}

function closeTray() {
  if (!trayState.open) return;

  if (trayState.mode === "draw") {
    for (let i = trayState.drawItems.length - 1; i >= 0; i--) {
      const it = trayState.drawItems[i];
      if (!piles[it.pileKey]) piles[it.pileKey] = [];
      piles[it.pileKey].unshift(it.card);
    }
    trayState.drawItems = [];
    setDrawCount("p1", 0);
    setDrawCount("p2", 0);
  } else if (trayState.mode === "search") {
    const pileKey = trayState.searchPileKey;
    if (pileKey && piles[pileKey]) {
      const removed = trayState.searchRemovedIds;
      const byId = new Map();
      for (const c of piles[pileKey]) byId.set(c.id, c);

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

  traySearchRow.classList.remove("show");
  trayCarousel.innerHTML = "";

  trayShell.classList.remove("dragging");
  trayShell.style.pointerEvents = "none";
  trayShell.style.display = "none";
}

trayCloseBtn.addEventListener("click", () => { if (!previewOpen) closeTray(); });

function normalize(s) { return (s || "").toLowerCase().trim(); }
function tokenMatch(query, target) {
  const q = normalize(query);
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const t = normalize(target);
  return tokens.every(tok => t.includes(tok));
}

traySearchInput.addEventListener("input", () => { trayState.searchQuery = traySearchInput.value || ""; renderTray(); });

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
  trayState.searchOriginalIds = (piles[pileKey] || []).map(c => c.id);

  trayTitle.textContent = `SEARCH: ${title}`;
  traySearchInput.value = "";
  traySearchRow.classList.add("show");
  openTray();
  renderTray();

  setTimeout(() => { try { traySearchInput.focus(); } catch {} }, 0);
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

/**
 * Mobile fix:
 * - Default behavior inside tray is SCROLL.
 * - To DRAG OUT to the board: press-and-hold (TRAY_HOLD_TO_DRAG_MS), then drag.
 */
function makeTrayTileDraggable(tile, card, onCommitToBoard) {
  let holdTimer = null;
  let holdArmed = false;
  let dragging = false;
  let ghost = null;
  let start = { x: 0, y: 0 };
  let last = { x: 0, y: 0 };
  let pid = null;

  function clearHold() {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    holdArmed = false;
  }

  function startDragNow() {
    if (dragging) return;
    dragging = true;
    tile.__justDragged = false;
    trayShell.classList.add("dragging");

    try { tile.setPointerCapture(pid); } catch {}

    ghost = document.createElement("div");
    ghost.style.position = "fixed";
    ghost.style.left = `${last.x - 54}px`;
    ghost.style.top  = `${last.y - 75}px`;
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
  }

  function finishDrag(clientX, clientY) {
    if (ghost) { ghost.remove(); ghost = null; }
    trayShell.classList.remove("dragging");

    const trayRect = tray.getBoundingClientRect();
    const releasedOverTray =
      clientX >= trayRect.left && clientX <= trayRect.right &&
      clientY >= trayRect.top  && clientY <= trayRect.bottom;

    if (!releasedOverTray) {
      const p = viewportToDesign(clientX, clientY);
      const kind = (card.kind === "base" || (card.type || "").toLowerCase() === "base") ? "base" : "unit";
      const el = makeCardEl(card, kind);

      const w = kind === "base" ? BASE_W : CARD_W;
      const h = kind === "base" ? BASE_H : CARD_H;

      el.style.left = `${p.x - w / 2}px`;
      el.style.top  = `${p.y - h / 2}px`;
      el.style.zIndex = kind === "base" ? "12000" : "15000";

      stage.appendChild(el);

      if (kind === "base") {
        snapBaseAutoFill(el);
        if (!el.dataset.capSide) snapBaseToNearestBaseStack(el);
      } else {
        snapCardToNearestZone(el);
      }

      onCommitToBoard();
    }
  }

  // Right-click preview (PC)
  tile.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); showPreview(card); });

  tile.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (previewOpen) return;
    e.stopPropagation();

    pid = e.pointerId;
    start = { x: e.clientX, y: e.clientY };
    last  = { x: e.clientX, y: e.clientY };
    holdArmed = true;
    tile.__justDragged = false;

    clearHold();
    holdArmed = true;
    holdTimer = setTimeout(() => {
      if (!holdArmed) return;
      startDragNow();
    }, TRAY_HOLD_TO_DRAG_MS);
  });

  tile.addEventListener("pointermove", (e) => {
    if (previewOpen) return;
    last = { x: e.clientX, y: e.clientY };

    if (holdArmed && !dragging) {
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (moved > TRAY_MOVE_CANCEL_PX) {
        clearHold();
      }
      return;
    }

    if (dragging && ghost) {
      e.preventDefault();
      e.stopPropagation();
      ghost.style.left = `${e.clientX - 54}px`;
      ghost.style.top  = `${e.clientY - 75}px`;
    }
  });

  tile.addEventListener("pointerup", (e) => {
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > TRAY_TAP_MOVE_PX;

    if (!dragging) {
      const wasHoldArmed = holdArmed;
      clearHold();
      if (!moved && wasHoldArmed) {
        tile.__tapJustHappened = true;
        setTimeout(() => { tile.__tapJustHappened = false; }, 0);
      }
      return;
    }

    dragging = false;
    clearHold();
    tile.__justDragged = true;

    try { tile.releasePointerCapture(e.pointerId); } catch {}

    finishDrag(e.clientX, e.clientY);
  });

  tile.addEventListener("pointercancel", () => {
    clearHold();
    if (ghost) { ghost.remove(); ghost = null; }
    trayShell.classList.remove("dragging");
    dragging = false;
  });
}

function renderTray() {
  trayCarousel.innerHTML = "";
  if (!trayState.open) return;

  if (trayState.mode === "draw") {
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

    const removed = trayState.searchRemovedIds;

    const pileById = new Map();
    for (const c of (piles[pileKey] || [])) pileById.set(c.id, c);

    const ordered = [];
    for (const id of trayState.searchOriginalIds) {
      if (removed.has(id)) continue;
      const card = pileById.get(id);
      if (card) ordered.push(card);
    }

    const q = trayState.searchQuery || "";
    const visible = q ? ordered.filter(c => tokenMatch(q, c.name || "")) : ordered;

    for (const card of visible) {
      const tile = makeTrayTile(card);

      tile.addEventListener("click", () => {
        if (tile.__justDragged) { tile.__justDragged = false; return; }
        showPreview(card);
      });

      makeTrayTileDraggable(tile, card, () => {
        trayState.searchRemovedIds.add(card.id);
        piles[pileKey] = (piles[pileKey] || []).filter(c => c.id !== card.id);
        renderTray();
      });

      trayCarousel.appendChild(tile);
    }
  }
}

// ---------- draw-count badges ----------
const drawCountBadges = { p1: null, p2: null };

function ensureDrawCountBadges() {
  if (!zonesCache) return;
  const z1 = zonesCache.p1_draw;
  const z2 = zonesCache.p2_draw;

  if (!drawCountBadges.p1) {
    drawCountBadges.p1 = document.createElement("div");
    drawCountBadges.p1.className = "trayCountBadge";
    stage.appendChild(drawCountBadges.p1);
  }
  if (!drawCountBadges.p2) {
    drawCountBadges.p2 = document.createElement("div");
    drawCountBadges.p2.className = "trayCountBadge";
    stage.appendChild(drawCountBadges.p2);
  }

  drawCountBadges.p1.style.left = `${Math.round(z1.x + z1.w + 10)}px`;
  drawCountBadges.p1.style.top  = `${Math.round(z1.y + z1.h/2 - 17)}px`;

  drawCountBadges.p2.style.left = `${Math.round(z2.x + z2.w + 10)}px`;
  drawCountBadges.p2.style.top  = `${Math.round(z2.y + z2.h/2 - 17)}px`;

  setDrawCount("p1", 0);
  setDrawCount("p2", 0);
}

function setDrawCount(owner, n) {
  const b = drawCountBadges[owner];
  if (!b) return;
  b.textContent = String(n);
  b.style.display = n > 0 ? "flex" : "none";
}

// ---------- pile click bindings ----------
function bindPileZoneClicks() {
  const clickMap = [
    { id:"p1_draw", owner:"p1", pileKey:"p1_draw", label:"P1 DRAW" },
    { id:"p2_draw", owner:"p2", pileKey:"p2_draw", label:"P2 DRAW" },

    { id:"p1_discard", owner:"p1", pileKey:"p1_discard", label:"P1 DISCARD" },
    { id:"p2_discard", owner:"p2", pileKey:"p2_discard", label:"P2 DISCARD" },

    { id:"p1_exile_draw", owner:"p1", pileKey:"p1_exile", label:"P1 EXILE" },
    { id:"p1_exile_perm", owner:"p1", pileKey:"p1_exile", label:"P1 EXILE" },

    { id:"p2_exile_draw", owner:"p2", pileKey:"p2_exile", label:"P2 EXILE" },
    { id:"p2_exile_perm", owner:"p2", pileKey:"p2_exile", label:"P2 EXILE" },
  ];

  for (const m of clickMap) {
    const el = stage.querySelector(".zone[data-zone-id='" + m.id + "']");
    if (!el) continue;
    el.classList.add("clickable");

    const clone = el.cloneNode(true);
    el.replaceWith(clone);

    clone.addEventListener("pointerdown", (e) => {
      if (previewOpen) return;
      e.stopPropagation();

      if (m.id === "p1_draw" || m.id === "p2_draw") {
        if (!piles[m.pileKey] || piles[m.pileKey].length === 0) return;

        openTrayDraw();
        const card = piles[m.pileKey].shift();
        trayState.drawItems.push({ owner: m.owner, pileKey: m.pileKey, card });
        setDrawCount(m.owner, trayState.drawItems.filter(x => x.owner === m.owner).length);
        renderTray();
        return;
      }

      openTraySearch(m.owner, m.pileKey, m.label);
    });
  }
}

// ---------- zone math (ALIGNED + TRAY COMPATIBLE) ----------
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

  // token banks centered under draw+discard piles
  const bankW = (TOKEN_BIN_W * 3) + (TOKEN_BIN_GAP * 2);
  const bankH = TOKEN_BIN_H;

  const pilesW = (CARD_W * 2) + GAP;
  const pilesCenterX = xPiles + (pilesW / 2);
  const bankX = Math.round(pilesCenterX - (bankW / 2));
  const bankGap = 14;

  const yP1TokenBank = yBottomPiles + CARD_H + bankGap;
  const yP2TokenBank = yTopPiles - bankGap - bankH;

  let zones = {
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

function fitToScreen() {
  const { w, h } = viewportSize();
  const margin = 16;

  let trayW = 0;
  try { if (trayShell && trayShell.style.display !== "none") trayW = trayShell.getBoundingClientRect().width; } catch {}

  const usableW = Math.max(200, w - trayW);
  const s = Math.min(
    (usableW - margin * 2) / DESIGN_W,
    (h - margin * 2) / DESIGN_H
  );

  camera.scale = s;

  const centerTx = Math.round((usableW - DESIGN_W * s) / 2);
  const centerTy = Math.round((h - DESIGN_H * s) / 2);

  const leftBias = Math.min(90, Math.round(w * 0.10));
  camera.tx = centerTx - leftBias;
  camera.ty = centerTy;

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

// Board pan/zoom (ignore tray + preview + cards + tokens)
table.addEventListener("pointerdown", (e) => {
  if (previewOpen) return;
  if (e.target.closest("#tray")) return;
  if (e.target.closest("#trayShell")) return;
  if (e.target.closest("#previewBackdrop")) return;
  if (e.target.closest(".card")) return;
  if (e.target.closest(".forceMarker")) return;
  if (e.target.closest(".tokenCube")) return;
  if (e.target.closest(".tokenBin")) return;
  if (e.target.closest("#hud")) return;

  table.setPointerCapture(e.pointerId);
  boardPointers.set(e.pointerId, e);
  boardLast = { x: e.clientX, y: e.clientY };

  if (boardPointers.size === 2) {
    const pts = [...boardPointers.values()];
    pinchStartDist = dist(pts[0], pts[1]);
    pinchStartScale = camera.scale;
    pinchMid = mid(pts[0], pts[1]);
  }
});

table.addEventListener("pointermove", (e) => {
  if (previewOpen) return;
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
  if (e.target.closest("#tray")) return;
  if (e.target.closest("#trayShell")) return;
  if (e.target.closest("#previewBackdrop")) return;
  e.preventDefault();
  const zoomIntensity = 0.0018;
  const delta = -e.deltaY;
  const newScale = camera.scale * (1 + delta * zoomIntensity);
  setScaleAround(newScale, e.clientX, e.clientY);
}, { passive: false });

/* -------------- SNIPPING NOTE --------------
The remainder of the file includes:
- snap rules
- force track + marker
- captured base slots + auto-fill stacking
- card drag/rotate/flip logic
- token bank build + click-and-drag spawn
- build() + demo piles + demo cards
- setTrayPlayerColor("blue")
------------------------------------------- */

/* The full baseline file is what you're using now (this snippet continues in your repo). */
