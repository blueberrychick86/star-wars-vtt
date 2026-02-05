console.log("VTT BASELINE 2026-02-05 — faction borders locked + 3px borders");


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

  .card { position:absolute; border:3px solid rgba(255,255,255,0.85);
 border-radius:10px; background:#111;
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
    border: 3px solid rgba(255,255,255,0.45);
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


  /* ===== FACTION BORDER COLORS (BOARD + TRAY) ===== */
  .card.fBlue, .trayTile.fBlue{
    border-color: rgba(120,180,255,0.92);
    box-shadow: 0 0 0 2px rgba(120,180,255,0.16), 0 10px 22px rgba(0,0,0,0.45);
  }
  .card.fRed, .trayTile.fRed{
    border-color: rgba(255,110,110,0.92);
    box-shadow: 0 0 0 2px rgba(255,110,110,0.16), 0 10px 22px rgba(0,0,0,0.45);
  }
  .card.fNeutral,
.trayTile.fNeutral {
  border-color: rgba(105,105,105,1);
  box-shadow:
    0 0 0 1px rgba(105,105,105,0.55),
    0 6px 14px rgba(0,0,0,0.45);
}

  .card.fMando, .trayTile.fMando{
    border-color: rgba(140,255,170,0.95);
    box-shadow: 0 0 0 2px rgba(140,255,170,0.14), 0 10px 22px rgba(0,0,0,0.45);
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

  /* -------- TOKENS (3 big sources, tight hitboxes) -------- */
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

  /* Bin == visible cube size (click + drag starts immediately) */
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

  /* Actual cubes you drag (spawned on table) */
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

  /* Big source cubes (visual only, not draggable) */
  .tokenSourceCube{
    position:absolute;
    width:${TOKEN_BANK_CUBE_SIZE}px;
    height:${TOKEN_BANK_CUBE_SIZE}px;
    left:0; top:0;
    border-radius: 8px;
    box-sizing: border-box;
    border: 1px solid rgba(255,255,255,0.25);
    box-shadow: 0 10px 22px rgba(0,0,0,0.60);
    pointer-events:none;
    user-select:none;
  }

  /* cube color styles */
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
/* ===== BEGIN START MENU CSS (MOCKUP) ===== */

#startMenu{
  position: fixed;
  inset: 0;
  z-index: 300000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  box-sizing: border-box;

  /* Space backdrop */
  background: #000;
}

#startMenu::before{
  content:"";
  position:absolute;
  inset:0;
  background-image: url("assets/images/backgrounds/menu popup background.jpeg");
  background-size: cover;
  background-position: center;
  filter: saturate(1.05) contrast(1.05);
  opacity: 1;
}

/* subtle dark veil for readability */
#startMenu::after{
  content:"";
  position:absolute;
  inset:0;
  background: rgba(0,0,0,0.22);
}

.start-menu-window{
  position: relative;
  z-index: 1;
  width: min(980px, 96vw);
  border: 2px solid rgba(190,110,255,0.85);
  box-shadow:
    0 0 0 3px rgba(255,255,255,0.06) inset,
    0 0 40px rgba(140,80,255,0.25),
    0 20px 70px rgba(0,0,0,0.75);
  border-radius: 12px;
  padding: 30px 26px;
  box-sizing: border-box;
  color: #fff;
  text-align: center;
  overflow: hidden;
}

.menu-title{
  margin: 0;
  font-size: clamp(44px, 7vw, 84px);
  letter-spacing: 2px;
  font-weight: 900;
  text-transform: uppercase;
  text-shadow:
    0 6px 18px rgba(0,0,0,0.8),
    0 0 18px rgba(255,255,255,0.18);
  -webkit-text-stroke: 2px rgba(0,0,0,0.55);
}

.start-menu-window h1 + .menu-section{
  margin-top: 20px;
}

/* subtitle line like your mockup */
.start-menu-window .menu-subtitle{
  margin: 6px 0 18px 0;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.95;
  text-shadow: 0 2px 10px rgba(0,0,0,0.65);
}

.menu-section{
  margin: 14px 0;
}

/* “button” look in mockup: black tile with white outline */
.menu-btn{
  background: rgba(0,0,0,0.68);
  color: #fff;
  border: 2px solid rgba(255,255,255,0.70);
  border-radius: 6px;
  padding: 10px 18px;
  margin: 8px 10px;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  box-shadow:
    0 10px 24px rgba(0,0,0,0.55),
    0 0 0 0 rgba(255,255,255,0);
  transition: transform .08s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease;
}

.menu-btn:hover{
  transform: translateY(-1px);
  box-shadow:
    0 14px 28px rgba(0,0,0,0.60),
    0 0 18px rgba(255,255,255,0.14);
}

.menu-btn:active{
  transform: translateY(0px) scale(0.99);
}

/* Top BLUE / RED buttons */
.menu-btn.faction{
  width: min(220px, 40vw);
  padding: 12px 18px;
  font-size: 13px;
}

.menu-btn.faction.blue{
  background: rgba(70,105,255,0.75);
  border-color: rgba(210,225,255,0.85);
}
.menu-btn.faction.red{
  background: rgba(255,60,60,0.78);
  border-color: rgba(255,220,220,0.85);
}

/* Row buttons OG / CW / Mixed / Random */
.menu-btn.mode{
  width: min(220px, 42vw);
}

/* Selected state: strong glow/pulse */
.menu-btn.selected{
  border-color: rgba(255,255,255,0.95);
  box-shadow:
    0 0 0 3px rgba(255,255,255,0.16) inset,
    0 0 26px rgba(255,255,255,0.32),
    0 18px 36px rgba(0,0,0,0.65);
  animation: menuPulse 1.35s ease-in-out infinite;
}

@keyframes menuPulse{
  0%,100% { filter: brightness(1); }
  50% { filter: brightness(1.15); }
}

/* Inline helper text under buttons (like Empire+Rebel etc.) */
.menu-hint{
  margin-top: -2px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  opacity: 0.92;
  text-shadow: 0 2px 10px rgba(0,0,0,0.7);
}

/* Toggle row */
.toggle-row{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  background: rgba(0,0,0,0.48);
  border: 2px solid rgba(255,255,255,0.55);
  border-radius: 8px;
  padding: 10px 14px;
}

.toggle-row input{
  width: 18px;
  height: 18px;
}

/* bottom right play/cancel cluster */
.menu-actions{
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 10px;
}

.menu-btn.play,
.menu-btn.cancel{
  width: min(220px, 42vw);
  padding: 12px 18px;
  font-size: 14px;
}

.menu-btn.play{
  border-color: rgba(255,255,255,0.85);
}

.menu-btn.cancel{
  border-color: rgba(255,255,255,0.70);
}

/* Mobile spacing */
@media (max-width: 720px){
  .start-menu-window{ padding: 18px 14px; }
  .menu-btn{ margin: 8px 6px; }
  .menu-actions{ justify-content: center; }
}

/* ===== END START MENU CSS (MOCKUP) ===== */



`;
document.head.appendChild(style);
// ================= START MENU (STEP 1: container only) =================
const startMenuBackdrop = document.createElement("div");
startMenuBackdrop.id = "startMenuBackdrop";
startMenuBackdrop.style.display = "none"; // hidden for now
startMenuBackdrop.style.position = "fixed";
startMenuBackdrop.style.inset = "0";
startMenuBackdrop.style.zIndex = "300000";
startMenuBackdrop.style.background = "rgba(0,0,0,0.75)";

// simple placeholder content (we will replace later)
const startMenuCard = document.createElement("div");
startMenuCard.textContent = "START MENU PLACEHOLDER";
startMenuCard.style.color = "white";
startMenuCard.style.fontSize = "24px";
startMenuCard.style.fontWeight = "900";
startMenuCard.style.display = "flex";
startMenuCard.style.alignItems = "center";
startMenuCard.style.justifyContent = "center";
startMenuCard.style.width = "100%";
startMenuCard.style.height = "100%";

startMenuBackdrop.appendChild(startMenuCard);
document.body.appendChild(startMenuBackdrop);

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
const factionTestBtn = document.createElement("button");
factionTestBtn.className = "hudBtn";
factionTestBtn.textContent = "FACTION TEST";
hud.appendChild(factionTestBtn);


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
// trayShell.dataset.player = PLAYER_COLOR; // glow disabled (faction borders only)


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
  // player glow disabled (faction borders only)
  delete trayShell.dataset.player;
}


function openTray() {
  trayShell.style.display = "block";
  trayShell.style.pointerEvents = "auto";
  trayState.open = true;
 
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
  applyFactionBorderClass(tile, card);

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

  // Token banks: anchors (no visible zone)
  // 3 source cubes tucked under each player's draw/discard piles.
  const pilesW = (CARD_W * 2) + GAP;              // discard + gap + draw
  const pilesCenterX = xPiles + (pilesW / 2);

  const bankW = (TOKEN_BIN_W * 3) + (TOKEN_BIN_GAP * 2);
  const bankH = TOKEN_BIN_H;

  // center the bank under the two piles
  const bankX = Math.round(pilesCenterX - bankW / 2);

  const bankGap = 14;

  const yP1TokenBank = yBottomPiles + CARD_H + bankGap;
  const yP2TokenBank = yTopPiles - bankGap - bankH;

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

// ---------- snapping (with zone acceptance) ----------
const SNAP_ZONE_IDS = new Set([
  "p2_draw","p2_discard","p2_exile_draw","p2_exile_perm",
  "p1_draw","p1_discard","p1_exile_draw","p1_exile_perm",
  "galaxy_deck","galaxy_discard","outer_rim",
  "g11","g12","g13","g14","g15","g16",
  "g21","g22","g23","g24","g25","g26",
  "p2_base_stack","p1_base_stack",
]);

const UNIT_SNAP_ZONE_IDS = new Set([
  "p2_draw","p2_discard","p2_exile_draw","p2_exile_perm",
  "p1_draw","p1_discard","p1_exile_draw","p1_exile_perm",
  "galaxy_deck","galaxy_discard","outer_rim",
  "g11","g12","g13","g14","g15","g16",
  "g21","g22","g23","g24","g25","g26",
]);

const BASE_SNAP_ZONE_IDS = new Set(["p1_base_stack","p2_base_stack"]);

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

  const kind = cardEl.dataset.kind || "unit";
  const allowed = (kind === "base") ? BASE_SNAP_ZONE_IDS : UNIT_SNAP_ZONE_IDS;

  const cardRect = cardEl.getBoundingClientRect();
  const cx = cardRect.left + cardRect.width / 2;
  const cy = cardRect.top + cardRect.height / 2;

  let best = null;
  let bestDist = Infinity;

  for (const z of zonesMeta) {
    if (!allowed.has(z.id)) continue;
    const zx = z.left + z.width / 2;
    const zy = z.top + z.height / 2;
    const d = Math.hypot(cx - zx, cy - zy);
    if (d < bestDist) { bestDist = d; best = z; }
  }

  if (!best) return;

  const cardDiag = Math.hypot(cardRect.width, cardRect.height);
  const zoneDiag = Math.hypot(best.width, best.height);
  const threshold = Math.max(cardDiag, zoneDiag) * 0.55;

  if (bestDist > threshold) return;

  const stageRect = stage.getBoundingClientRect();
  const targetCenterX = (best.left + best.width / 2 - stageRect.left) / camera.scale;
  const targetCenterY = (best.top + best.height / 2 - stageRect.top) / camera.scale;

  const w = parseFloat(cardEl.style.width);
  const h = parseFloat(cardEl.style.height);

  cardEl.style.left = `${targetCenterX - w / 2}px`;
  cardEl.style.top  = `${targetCenterY - h / 2}px`;
}

function snapBaseToNearestBaseStack(baseEl) {
  if (!zonesMeta.length) return;

  const baseRect = baseEl.getBoundingClientRect();
  const cx = baseRect.left + baseRect.width / 2;
  const cy = baseRect.top + baseRect.height / 2;

  let best = null;
  let bestDist = Infinity;

  for (const z of zonesMeta) {
    if (!BASE_SNAP_ZONE_IDS.has(z.id)) continue;
    const zx = z.left + z.width / 2;
    const zy = z.top + z.height / 2;
    const d = Math.hypot(cx - zx, cy - zy);
    if (d < bestDist) { bestDist = d; best = z; }
  }

  if (!best) return;

  const zoneDiag = Math.hypot(best.width, best.height);
  const baseDiag = Math.hypot(baseRect.width, baseRect.height);
  const threshold = Math.max(zoneDiag, baseDiag) * 0.70;

  if (bestDist > threshold) return;

  const stageRect = stage.getBoundingClientRect();
  const targetCenterX = (best.left + best.width / 2 - stageRect.left) / camera.scale;
  const targetCenterY = (best.top + best.height / 2 - stageRect.top) / camera.scale;

  baseEl.style.left = `${targetCenterX - BASE_W / 2}px`;
  baseEl.style.top  = `${targetCenterY - BASE_H / 2}px`;
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

  forceMarker.addEventListener("pointercancel", () => { draggingMarker = false; });

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

function clearCapturedAssignment(baseEl){
  const side = baseEl.dataset.capSide;
  const idx = Number(baseEl.dataset.capIndex || "-1");
  if (!side || idx < 0) return;
  if (capOccupied[side] && capOccupied[side][idx] === baseEl.dataset.cardId) {
    capOccupied[side][idx] = null;
  }
  delete baseEl.dataset.capSide;
  delete baseEl.dataset.capIndex;
}

function snapBaseAutoFill(baseEl){
  const capP2 = zonesCache.p2_captured_bases;
  const capP1 = zonesCache.p1_captured_bases;

  const b = baseEl.getBoundingClientRect();
  const cx = b.left + b.width/2;
  const cy = b.top + b.height/2;

  const inRect = (r) => (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom);

  const stageRect = stage.getBoundingClientRect();

  const rectFor = (capRect) => {
    const l = stageRect.left + capRect.x * camera.scale;
    const t = stageRect.top  + capRect.y * camera.scale;
    return { left:l, top:t, right:l + capRect.w * camera.scale, bottom:t + capRect.h * camera.scale };
  };

  const p2R = rectFor(capP2);
  const p1R = rectFor(capP1);

  let side = null;
  if (inRect(p2R)) side = "p2";
  else if (inRect(p1R)) side = "p1";

  if (!side){
    clearCapturedAssignment(baseEl);
    return;
  }

  const occ = capOccupied[side];
  let idx = occ.findIndex(v => v === null);
  if (idx === -1) idx = CAP_SLOTS - 1;

  occ[idx] = baseEl.dataset.cardId;
  baseEl.dataset.capSide = side;
  baseEl.dataset.capIndex = String(idx);

  const target = capSlotCenters[side][idx];
  baseEl.style.left = `${target.x - BASE_W/2}px`;
  baseEl.style.top  = `${target.y - BASE_H/2}px`;
  baseEl.style.zIndex = String(CAP_Z_BASE + idx);
}

// ---------- rotation + flip ----------
function applyRotationSize(cardEl) {
  const rot = ((Number(cardEl.dataset.rot || "0") % 360) + 360) % 360;
  cardEl.style.width = `${CARD_W}px`;
  cardEl.style.height = `${CARD_H}px`;
  cardEl.style.transformOrigin = "50% 50%";
  cardEl.style.transform = `rotate(${rot}deg)`;
  const face = cardEl.querySelector(".cardFace");
  if (face) face.style.transform = "none";
}

function toggleRotate(cardEl) {
  const cur = ((Number(cardEl.dataset.rot || "0") % 360) + 360) % 360;
  const next = (cur + 90) % 360;
  cardEl.dataset.rot = String(next);
  applyRotationSize(cardEl);
  refreshSnapRects();
}

function toggleFlip(cardEl) {
  const cur = cardEl.dataset.face || "up";
  cardEl.dataset.face = (cur === "up") ? "down" : "up";
}

// ---------- TOKEN BANKS (FREEFORM CUBES) ----------
let tokenBankEls = { p1: null, p2: null };

function tokenClassFor(type) {
  if (type === "damage") return "tokenRed";
  if (type === "attack") return "tokenBlue";
  return "tokenGold";
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

function attachTokenDragHandlers(el) {
  let dragging = false;
  let offX = 0, offY = 0;

  el.addEventListener("pointerdown", (e) => {
    if (previewOpen) return;
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

  el.addEventListener("pointercancel", () => { dragging = false; });
}

function spawnTokenFromBin(owner, type, clientX, clientY, pointerId) {
  if (tokenPools[owner][type] <= 0) return;

  tokenPools[owner][type] -= 1;

  // Spawn token centered under the pointer, then immediately drag it (single click-drag).
  const stageRect0 = stage.getBoundingClientRect();
  const px0 = (clientX - stageRect0.left) / camera.scale;
  const py0 = (clientY - stageRect0.top)  / camera.scale;

  const tok = createTokenCube(owner, type, px0, py0);
  tok.style.zIndex = "60000";

  // Make sure the same pointer is controlling the token right away.
  try { tok.setPointerCapture(pointerId); } catch {}

  function move(e) {
    const stageRect = stage.getBoundingClientRect();
    const px = (e.clientX - stageRect.left) / camera.scale;
    const py = (e.clientY - stageRect.top)  / camera.scale;
    tok.style.left = `${px - TOKEN_SIZE/2}px`;
    tok.style.top  = `${py - TOKEN_SIZE/2}px`;
  }

  function up(e) {
    try { tok.releasePointerCapture(pointerId); } catch {}
    tok.style.zIndex = "16000";
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerup", up, true);
    window.removeEventListener("pointercancel", up, true);
  }

  // Track movement even if pointer drifts outside the bin.
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

    // big source cube (visual only)
    const source = document.createElement("div");
    source.className = `tokenSourceCube ${tokenClassFor(b.type)}`;
    source.style.left = `0px`;
    source.style.top  = `0px`;
    bin.appendChild(source);

    bin.addEventListener("pointerdown", (e) => {
      if (previewOpen) return;
      if (e.button !== 0) return;
      e.preventDefault();
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
  tokenBankEls[owner] = bank;
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
factionTestBtn.addEventListener("click", (e) => {
  e.preventDefault();

  const cards = [TEST_BLUE, TEST_RED, TEST_NEUTRAL2, TEST_MANDO2];

  // spawn in a row near the top-middle so you can see them quickly
  const startX = DESIGN_W * 0.34;
  const startY = DESIGN_H * 0.10;
  const stepX = CARD_W + 18;

  cards.forEach((c, i) => {
    const el = makeCardEl(c, "unit");
    el.style.left = `${startX + i * stepX}px`;
    el.style.top  = `${startY}px`;
    el.style.zIndex = "15000";
    stage.appendChild(el);
  });
});

// ---------- build ----------
function build() {
  stage.innerHTML = "";

  const zones = computeZones();
  zonesCache = zones;

  stage.style.width = `${DESIGN_W}px`;
  stage.style.height = `${DESIGN_H}px`;

  // Draw standard zones (skip token bank anchors)
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

  // Token banks (freeform cubes only)
  buildTokenBank("p2", zones.p2_token_bank);
  buildTokenBank("p1", zones.p1_token_bank);

  applyCamera();
  refreshSnapRects();
  ensureDrawCountBadges();
  bindPileZoneClicks();
  fitToScreen();
}
function initBoard() {
  build();
}


window.addEventListener("resize", () => fitToScreen());
if (window.visualViewport) window.visualViewport.addEventListener("resize", () => fitToScreen());

// ---------- card factory ----------
// ===== FACTION BORDER HELPERS =====
function getFactionKey(cardData){
  const raw = String(
    cardData.faction ??
    cardData.side ??
    cardData.allegiance ??
    cardData.border ??
    ""
  ).toLowerCase().trim();

  // Mandalorian ALWAYS green even if treated as neutral sometimes
  if (raw === "mando" || raw === "mandalorian" || raw === "mandalorians") return "mando";

  // Neutral variants
  if (raw === "neutral" || raw === "grey" || raw === "gray" || raw === "silver") return "neutral";

  // Color factions
  if (raw === "blue") return "blue";
  if (raw === "red") return "red";

  // If later your dataset uses names instead of colors, tolerate common ones:
  if (raw === "empire" || raw === "separatists" || raw === "separatist") return "blue";
  if (raw === "rebels" || raw === "rebel" || raw === "republic") return "red";

  return "";
}

function applyFactionBorderClass(el, cardData){
  el.classList.remove("fBlue","fRed","fNeutral","fMando");
  const k = getFactionKey(cardData);
  if (k === "blue") el.classList.add("fBlue");
  else if (k === "red") el.classList.add("fRed");
  else if (k === "neutral") el.classList.add("fNeutral");
  else if (k === "mando") el.classList.add("fMando");
}

function makeCardEl(cardData, kind) {
  const el = document.createElement("div");
  el.className = "card";
  applyFactionBorderClass(el, cardData);
  el.dataset.kind = kind;
  el.dataset.cardId = `${cardData.id}_${Math.random().toString(16).slice(2)}`;
  el.dataset.face = "up";

  const face = document.createElement("div");
  face.className = "cardFace";
  face.style.backgroundImage = `url('${cardData.img || ""}')`;
  el.appendChild(face);

  const back = document.createElement("div");
  back.className = "cardBack";
  back.textContent = "Face Down";
  el.appendChild(back);

  if (kind === "unit") {
    el.dataset.rot = "0";
    applyRotationSize(el);
  } else if (kind === "base") {
    el.style.width = `${BASE_W}px`;
    el.style.height = `${BASE_H}px`;
    face.style.transform = "none";
  }

  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    togglePreview(cardData);
  });

  attachDragHandlers(el, cardData, kind);
  return el;
}

// ---------- drag handlers ----------
function attachDragHandlers(el, cardData, kind) {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  let pressTimer = null;
  let longPressFired = false;
  let downX = 0;
  let downY = 0;
  let movedDuringPress = false;

  let baseHadCapturedAssignment = false;
  let baseFreedAssignment = false;

  const DOUBLE_TAP_MS = 360;
  const FLIP_CONFIRM_MS = 380;

  let flipTimer = null;
  let suppressNextPointerUp = false;

  function clearFlipTimer() { if (flipTimer) { clearTimeout(flipTimer); flipTimer = null; } }
  function clearPressTimer(){ if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }

  function startLongPress(e) {
    clearPressTimer();
    longPressFired = false;
    movedDuringPress = false;
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
    if (e.button !== 0) return;

    clearFlipTimer();
    suppressNextPointerUp = false;

    const now = Date.now();
    const dt = now - lastTap;
    lastTap = now;

    if (kind === "unit" && dt < DOUBLE_TAP_MS) {
      suppressNextPointerUp = true;
      toggleRotate(el);
      return;
    }

    el.setPointerCapture(e.pointerId);
    dragging = true;
    startLongPress(e);

    if (kind === "base") {
      baseHadCapturedAssignment = !!el.dataset.capSide;
      baseFreedAssignment = false;
    }

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
    if (Math.hypot(dx, dy) > 8) movedDuringPress = true;

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
    clearPressTimer();
    try { el.releasePointerCapture(e.pointerId); } catch {}
    dragging = false;

    if (suppressNextPointerUp) {
      suppressNextPointerUp = false;
      el.style.zIndex = (kind === "base") ? "12000" : "15000";
      return;
    }

    if (longPressFired) {
      longPressFired = false;
      return;
    }

    if (!movedDuringPress) {
      clearFlipTimer();
      flipTimer = setTimeout(() => {
        toggleFlip(el);
        if (kind === "base") {
          if (el.dataset.capSide) {
            const idx = Number(el.dataset.capIndex || "0");
            el.style.zIndex = String(CAP_Z_BASE + idx);
          } else el.style.zIndex = "12000";
        } else el.style.zIndex = "15000";
      }, FLIP_CONFIRM_MS);
      return;
    }

    if (kind === "base") {
      snapBaseAutoFill(el);
      if (!el.dataset.capSide) {
        snapBaseToNearestBaseStack(el);
        el.style.zIndex = "12000";
      }
    } else {
      snapCardToNearestZone(el);
      el.style.zIndex = "15000";
    }
  });

  el.addEventListener("pointercancel", () => {
    dragging = false;
    clearPressTimer();
    clearFlipTimer();
    suppressNextPointerUp = false;
  });
}

// ---------- demo card data ----------
const OBIWAN = {
  id: "obiwan",
  name: "Obi-Wan Kenobi",
  type: "Unit",
  subtype: "Jedi",
  cost: 4,
  attack: 2,
  resources: 1,
  force: 1,
  effect: "If you control the Force, draw 1 card.",
  reward: "Gain 1 Force.",
  img: "https://picsum.photos/250/350?random=12"
};


const TEST_BASE = {
  id: "base_test",
  name: "Test Base",
  type: "Base",
  subtype: "",
  cost: 0,
  attack: 0,
  resources: 0,
  force: 0,
  effect: "This is a test base card.",
  reward: "—",
  img: "https://picsum.photos/350/250?random=22"
};
const TEST_BLUE = {
  id: "test_blue",
  name: "TEST Blue",
  type: "Unit",
  subtype: "Blue",
  faction: "blue",
  cost: 1, attack: 1, resources: 1, force: 0,
  effect: "Faction border test.",
  reward: "—",
  img: "https://picsum.photos/250/350?random=301"
};

const TEST_RED = {
  id: "test_red",
  name: "TEST Red",
  type: "Unit",
  subtype: "Red",
  faction: "red",
  cost: 1, attack: 1, resources: 1, force: 0,
  effect: "Faction border test.",
  reward: "—",
  img: "https://picsum.photos/250/350?random=302"
};

const TEST_NEUTRAL2 = {
  id: "test_neutral2",
  name: "TEST Neutral",
  type: "Unit",
  subtype: "Neutral",
  faction: "neutral",
  cost: 1, attack: 1, resources: 1, force: 0,
  effect: "Faction border test.",
  reward: "—",
  img: "https://picsum.photos/250/350?random=303"
};

const TEST_MANDO2 = {
  id: "test_mando2",
  name: "TEST Mando",
  type: "Unit",
  subtype: "Mandalorian",
  faction: "mandalorian",
  cost: 1, attack: 1, resources: 1, force: 0,
  effect: "Faction border test.",
  reward: "—",
  img: "https://picsum.photos/250/350?random=304"
};

// ---------- pile data (demo) ----------
(function initDemoPiles(){
  function cloneCard(base, overrides){
    const id = `${base.id}_${Math.random().toString(16).slice(2)}`;
    return { ...base, ...overrides, id };
  }

  function makeMany(prefix, count){
    const out = [];
    for (let i = 1; i <= count; i++){
      out.push(cloneCard(OBIWAN, { name: `${prefix} ${i}` }));
    }
    return out;
  }

  piles = {
    p1_draw: [ ...makeMany("P1 Draw Card", 30) ],

    p2_draw: [ ...makeMany("P2 Draw Card", 30) ],
    p1_discard: [ ...makeMany("Discard Example", 25) ],
    p2_discard: [ ...makeMany("Discard Example", 25) ],
    p1_exile: [ ...makeMany("Exiled Example", 18) ],
    p2_exile: [ ...makeMany("Exiled Example", 18) ],
  };
})();

// ---------- spawn test cards ----------
const unitCard = makeCardEl(OBIWAN, "unit");
unitCard.style.left = `${DESIGN_W * 0.42}px`;
unitCard.style.top  = `${DESIGN_H * 0.12}px`;
unitCard.style.zIndex = "15000";
stage.appendChild(unitCard);

const BASE_TEST_COUNT = 2;
for (let i = 0; i < BASE_TEST_COUNT; i++) {
  const baseCard = makeCardEl(TEST_BASE, "base");
  baseCard.style.left = `${DESIGN_W * (0.14 + i * 0.08)}px`;
  baseCard.style.top  = `${DESIGN_H * (0.22 + i * 0.02)}px`;
  baseCard.style.zIndex = "12000";
  stage.appendChild(baseCard);
}
// ===== BEGIN START MENU BEHAVIOR (NO PRESELECT) =====
(function startMenuBehavior(){
  const menu = document.getElementById("startMenu");
  if (!menu) return;

  // Mark up existing buttons into groups WITHOUT changing HTML
  const buttons = Array.from(menu.querySelectorAll(".menu-btn"));

  // Heuristic grouping by button text
  const factionBtns = buttons.filter(b => /^(blue|red)$/i.test((b.textContent || "").trim()));
  const modeBtns = buttons.filter(b => /^(original trilogy|clone wars|mixed|random)$/i.test((b.textContent || "").trim()));

  // Add style classes used by CSS above (optional but helps)
  factionBtns.forEach(b => {
    b.classList.add("faction");
    const t = (b.textContent || "").trim().toLowerCase();
    if (t === "blue") b.classList.add("blue");
    if (t === "red")  b.classList.add("red");
  });
  modeBtns.forEach(b => b.classList.add("mode"));

  function clearSelected(group){
    group.forEach(btn => btn.classList.remove("selected"));
  }
  function selectOne(group, btn){
    clearSelected(group);
    btn.classList.add("selected");
  }

  // No defaults selected (as requested)
  clearSelected(factionBtns);
  clearSelected(modeBtns);

  factionBtns.forEach(btn => {
    btn.addEventListener("click", () => selectOne(factionBtns, btn));
  });

  modeBtns.forEach(btn => {
    btn.addEventListener("click", () => selectOne(modeBtns, btn));
  });

  // Optional: make "Invite a Friend" a no-op placeholder (does not touch board)
  const inviteBtn = buttons.find(b => /invite a friend/i.test((b.textContent || "").trim()));
  if (inviteBtn) {
    inviteBtn.addEventListener("click", () => {
      // placeholder: later we can wire this to a share link / room code
      alert("Invite feature coming soon.");
    });
  }
})();
// ===== END START MENU BEHAVIOR (NO PRESELECT) =====

// --- Start Menu Logic ---
document.getElementById("playBtn").addEventListener("click", () => {
  document.getElementById("startMenu").style.display = "none";
  initBoard();
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  document.getElementById("startMenu").style.display = "none";
});

