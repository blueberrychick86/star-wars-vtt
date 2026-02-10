/* ========================================================================
   Star Wars VTT — CLEAN BASELINE 2026-02-08 (Non-destructive cleanup)
   - Keeps ALL existing features
   - Removes duplicate “early crash overlay vs crash overlay” conflicts
   - Makes boot + overlay + menu audio more robust (no optional chaining)
   - Keeps tray, tokens, snapping, preview, rotate/flip, invite/join flow
   ======================================================================== */

console.log("VTT BASELINE 2026-02-08 (CLEAN) — faction borders locked + 3px borders");

/* =========================
   PATCH A — BOOT FAILSAFE
   - Forces menu visible even if JS crashes
   - Adds ultra-early crash overlay (ES5-safe)
   ========================= */
(function () {
  function showMenuAnyway() {
    try {
      if (document.body) document.body.classList.add("menuReady");
      var m = document.getElementById("startMenu");
      if (m) m.style.display = "block";
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showMenuAnyway);
  } else {
    showMenuAnyway();
  }

  function ensureOverlay() {
    if (document.getElementById("earlyCrashOverlay")) return;

    var style = document.createElement("style");
    style.textContent =
      "#earlyCrashOverlay{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.92);color:#fff;display:none;padding:16px;font-family:Arial,sans-serif}" +
      "#earlyCrashOverlay .box{max-width:900px;margin:0 auto;border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:12px;background:rgba(20,20,24,.98)}" +
      "#earlyCrashOverlay h2{margin:0 0 10px;font-size:16px;text-transform:uppercase;letter-spacing:.6px}" +
      "#earlyCrashOverlay pre{white-space:pre-wrap;word-break:break-word;margin:0;font-size:12px;line-height:1.35;border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:10px;background:rgba(255,255,255,.06)}";
    document.head.appendChild(style);

    var wrap = document.createElement("div");
    wrap.id = "earlyCrashOverlay";
    wrap.innerHTML =
      '<div class="box">' +
      "<h2>VTT crashed — copy this</h2>" +
      '<pre id="earlyCrashText"></pre>' +
      "</div>";
    document.body.appendChild(wrap);
  }

  function showOverlay(title, msg) {
    try {
      ensureOverlay();
      showMenuAnyway();
      var el = document.getElementById("earlyCrashOverlay");
      var pre = document.getElementById("earlyCrashText");
      if (!el || !pre) return;

      var ua = (navigator && navigator.userAgent) ? navigator.userAgent : "";
      var when = (new Date()).toISOString();
      pre.textContent =
        "When: " + when + "\n" +
        "URL: " + location.href + "\n" +
        "UA: " + ua + "\n\n" +
        "Title: " + String(title || "Error") + "\n\n" +
        String(msg || "(no details)");
      el.style.display = "block";
    } catch (e) {}
  }

  window.addEventListener("error", function (e) {
    var title = (e && e.message) ? e.message : "window.error";
    var where = (e && e.filename) ? (e.filename + ":" + (e.lineno || 0) + ":" + (e.colno || 0)) : "";
    var stack = (e && e.error && e.error.stack) ? e.error.stack : "";
    showOverlay(title, where + "\n\n" + (stack || ""));
  });

  window.addEventListener("unhandledrejection", function (e) {
    var r = e ? e.reason : null;
    var title = (r && r.message) ? r.message : "unhandledrejection";
    var stack = (r && r.stack) ? r.stack : "";
    showOverlay(title, stack || String(r || ""));
  });

  window.__earlyCrash = showOverlay;
})();
/* ===== END PATCH A ===== */


/* =========================
   BASE PAGE
   ========================= */
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.height = "100vh";
document.body.style.background = "#000";
document.body.style.overflow = "hidden";
document.body.style.touchAction = "none";
document.body.style.fontFamily = "Arial, sans-serif";

var app = document.getElementById("app");
if (app) app.innerHTML = "";

/* =========================
   CONSTANTS
   ========================= */
var CARD_W = 86;
var CARD_H = Math.round((CARD_W * 3.5) / 2.5);
var BASE_W = CARD_H;
var BASE_H = CARD_W;

var GAP = 18;
var BIG_GAP = 28;

var FORCE_SLOTS = 7;
var FORCE_NEUTRAL_INDEX = 3;
var FORCE_MARKER_SIZE = 28;

var CAP_SLOTS = 7;
var CAP_OVERLAP = Math.round(BASE_H * 0.45);
var CAP_W = BASE_W;
var CAP_H = BASE_H + (CAP_SLOTS - 1) * CAP_OVERLAP;
var CAP_Z_BASE = 20000;

// Layout knobs
var BASE_ROW_GAP = 480;
var CAP_DISCARD_GAP = 26;
var EXILE_GAP = GAP;

// Tray drag tuning
var TRAY_HOLD_TO_DRAG_MS = 260;
var TRAY_MOVE_CANCEL_PX = 8;
var TRAY_TAP_MOVE_PX = 6;

// Player color (tray glow disabled; kept for future)
var PLAYER_COLOR = "blue";

// Token pools
var TOKENS_DAMAGE_PER_PLAYER = 25;
var TOKENS_ATTACK_PER_PLAYER = 30;
var TOKENS_RESOURCE_PER_PLAYER = 20;

var TOKEN_SIZE = 18;
var TOKEN_BANK_CUBE_SIZE = 44;
var TOKEN_BIN_W = TOKEN_BANK_CUBE_SIZE;
var TOKEN_BIN_H = TOKEN_BANK_CUBE_SIZE;
var TOKEN_BIN_GAP = 10;

var DESIGN_W = 1;
var DESIGN_H = 1;

function rect(x, y, w, h) { return { x: x, y: y, w: w, h: h }; }

/* =========================
   CSS
   ========================= */
var style = document.createElement("style");
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

  /* Global spacing for MenuFont */
  .menu-font,
  .inviteBtn,
  .invite-topline,
  .invite-letter,
  .menu-btn,
  button{
    font-family: "MenuFont", Arial, sans-serif;
    word-spacing: 0.6em;
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

  .forceSlot { position:absolute; border-radius:10px; box-sizing:border-box; border:1px dashed rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.02); pointer-events:none; }
  .forceSlot.neutral { border:1px dashed rgba(255,255,255,0.35); background: rgba(255,255,255,0.06); }
  .forceMarker { position:absolute; width:28px; height:28px; border-radius:999px; border:2px solid rgba(255,255,255,0.9);
    background: rgba(120,180,255,0.22); box-shadow:0 8px 20px rgba(0,0,0,0.6); box-sizing:border-box; z-index:99999;
    touch-action:none; cursor:grab; }

  .capSlot { position:absolute; border-radius:10px; box-sizing:border-box; border:1px dashed rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.01); pointer-events:none; }

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
  .card.fNeutral, .trayTile.fNeutral{
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

  /* -------- TOKENS -------- */
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
  .tokenRed{  background: linear-gradient(145deg, rgba(255,120,120,0.95), rgba(160,20,20,0.98)); }
  .tokenBlue{ background: linear-gradient(145deg, rgba(140,200,255,0.95), rgba(25,90,170,0.98)); }
  .tokenGold{
    background: linear-gradient(145deg, rgba(255,235,160,0.98), rgba(145,95,10,0.98));
    border-color: rgba(255,255,255,0.30);
  }

  /* ===== BEGIN START MENU CSS (MOCKUP) ===== */
  @font-face{
    font-family: "MenuTitleFont";
    src: url("fonts/TitleFont.woff2") format("woff2");
    font-weight: 900;
    font-style: normal;
    font-display: swap;
  }
  @font-face{
    font-family: "MenuFont";
    src: url("fonts/MenuFont.woff2") format("woff2");
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
  }

  #startMenu{
    font-family: Arial, sans-serif;
    position: fixed;
    inset: 0;
    z-index: 300000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    box-sizing: border-box;
    background: #000;
    overflow: auto;
    touch-action: pan-y;
    -webkit-overflow-scrolling: touch;
  }

  /* TRAY SCROLLBAR */
  #trayCarousel{ scrollbar-width: thin; scrollbar-color: #444 #111; }
  #trayCarousel::-webkit-scrollbar{ width: 8px; }
  #trayCarousel::-webkit-scrollbar-track{ background: #111; }
  #trayCarousel::-webkit-scrollbar-thumb{ background-color: #444; border-radius: 6px; border: 2px solid #111; }
  #trayCarousel::-webkit-scrollbar-thumb:hover{ background-color: #555; }

  /* MENU SCROLLBAR */
  #startMenu{ scrollbar-width: thin; scrollbar-color: #444 #111; }
  #startMenu::-webkit-scrollbar{ width: 10px; }
  #startMenu::-webkit-scrollbar-track{ background: #111; }
  #startMenu::-webkit-scrollbar-thumb{ background-color: #444; border-radius: 8px; border: 2px solid #111; }
  #startMenu::-webkit-scrollbar-thumb:hover{ background-color: #555; }

  #startMenu::before{
    content:"";
    position:absolute;
    inset:0;
    background-image: url("assets/images/backgrounds/menu_bg.jpg");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 1;
  }
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
    max-height: calc(100vh - 36px);
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    border: 1px solid rgba(255,255,255,0.25);
    box-shadow:
      0 0 0 2px rgba(255,255,255,0.04) inset,
      0 20px 70px rgba(0,0,0,0.75);
    border-radius: 12px;
    padding: 30px 26px;
    box-sizing: border-box;
    color: #fff;
    text-align: center;
  }

  .menu-title{
    margin: 0;
    font-family: "MenuTitleFont", Arial, sans-serif;
    font-size: clamp(44px, 6.5vw, 88px);
    font-weight: 900;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #000;
    -webkit-text-stroke: 3px #f6d44a;
    paint-order: stroke fill;
    text-shadow:
      0 2px 8px rgba(0,0,0,0.90),
      0 0 26px rgba(246,212,74,0.25);
    line-height: 1.02;
  }

  .start-menu-window h1 + .menu-section{ margin-top: 20px; }

  .start-menu-window .menu-subtitle{
    margin: 6px 0 18px 0;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 1px;
    text-transform: uppercase;
    opacity: 0.95;
    text-shadow: 0 2px 10px rgba(0,0,0,0.65);
  }

  .menu-section{ margin: 14px 0; }

  .menu-btn{
    background: rgba(0,0,0,0.68);
    color: #fff;
    border: 2px solid rgba(255,255,255,0.70);
    border-radius: 6px;
    padding: 8px 16px;
    margin: 8px 10px;
    font-family: "MenuFont", Arial, sans-serif;
    font-size: 12.5px;
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
  .menu-btn:active{ transform: translateY(0px) scale(0.99); }

  .menu-btn.faction{ width: min(160px, 32vw); padding: 10px 16px; font-size: 14px; }
  .menu-btn.faction.blue{ border-color: rgba(120,180,255,0.95); }
  .menu-btn.faction.red{  border-color: rgba(255,110,110,0.95); }

  .menu-btn.mode{ font-size: 12px; width: min(220px, 42vw); }

  .menu-btn.selected{
    border-color: rgba(140,255,170,0.98);
    box-shadow:
      0 0 0 3px rgba(140,255,170,0.22) inset,
      0 0 30px rgba(140,255,170,0.62),
      0 0 70px rgba(140,255,170,0.28),
      0 18px 36px rgba(0,0,0,0.70);
    animation: menuPulseGreen 1.05s ease-in-out infinite;
  }

  /* Keep faction glow while selected */
  .menu-btn.faction.blue.selected{
    border-color: rgba(120,180,255,0.95) !important;
    box-shadow:
      0 0 0 3px rgba(140,255,170,0.18) inset,
      0 0 20px rgba(120,180,255,0.75),
      0 0 48px rgba(120,180,255,0.35),
      0 18px 36px rgba(0,0,0,0.70);
    animation: menuPulseGreen 1.05s ease-in-out infinite;
  }
  .menu-btn.faction.red.selected{
    border-color: rgba(255,110,110,0.95) !important;
    box-shadow:
      0 0 0 3px rgba(140,255,170,0.18) inset,
      0 0 20px rgba(255,110,110,0.75),
      0 0 48px rgba(255,110,110,0.35),
      0 18px 36px rgba(0,0,0,0.70);
    animation: menuPulseGreen 1.05s ease-in-out infinite;
  }

  @keyframes menuPulseGreen{
    0%,100% { filter: brightness(1); }
    50% { filter: brightness(1.22); }
  }

  .menu-hint{
    margin: 6px 0 0 0;
    font-size: 12px;
    font-family: Arial, sans-serif;
    font-weight: 900;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    opacity: 0.95;
    text-shadow: 0 2px 10px rgba(0,0,0,0.75);
  }

  .menu-hint.allegiance-shift{
    animation: allegianceShift 0.85s linear infinite;
    text-shadow:
      0 0 10px rgba(120,180,255,0.55),
      0 0 10px rgba(255,110,110,0.55),
      0 2px 10px rgba(0,0,0,0.75);
  }

  @keyframes allegianceShift{
    0%   { color: rgba(120,180,255,0.98); filter: brightness(1.05); }
    50%  { color: rgba(255,110,110,0.98); filter: brightness(1.18); }
    100% { color: rgba(120,180,255,0.98); filter: brightness(1.05); }
  }

  .toggle-row{
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-family: "MenuFont", Arial, sans-serif;
    font-size: 12.5px;
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
    accent-color: rgba(140,255,170,0.98);
    filter: drop-shadow(0 0 0 rgba(140,255,170,0));
  }
  .toggle-row input:checked{
    filter:
      drop-shadow(0 0 10px rgba(140,255,170,0.85))
      drop-shadow(0 0 22px rgba(140,255,170,0.35));
  }

  .menu-actions{
    display: flex;
    justify-content: flex-end;
    gap: 16px;
    margin-top: 10px;
  }

  .menu-btn.play, .menu-btn.cancel{
    width: min(220px, 42vw);
    padding: 12px 18px;
    font-size: 14px;
  }

  body.menuReady #startMenu{ opacity: 1; transition: opacity .12s ease; }
  #startMenu{ opacity: 0; }

  @media (max-width: 720px){
    .start-menu-window{ padding: 18px 14px; }
    .menu-btn{ margin: 8px 6px; }
    .menu-actions{ justify-content: center; }
  }
  /* ===== END START MENU CSS ===== */
`;
document.head.appendChild(style);
document.body.classList.add("menuReady");

/* =========================
   INVITE MODAL CSS (ADDITIVE)
   ========================= */
var inviteStyle = document.createElement("style");
inviteStyle.textContent = `
  #inviteMenu{
    font-family: Arial, sans-serif;
    position: fixed;
    inset: 0;
    z-index: 350000;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 18px;
    box-sizing: border-box;
    background: #000;
    overflow: auto;
    touch-action: pan-y;
    -webkit-overflow-scrolling: touch;
  }
  #inviteMenu::before{
    content:"";
    position:absolute;
    inset:0;
    background-image: url("assets/images/backgrounds/menu_bg.jpg");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 1;
  }
  #inviteMenu::after{
    content:"";
    position:absolute;
    inset:0;
    background: rgba(0,0,0,0.22);
  }
  .invite-window{
    position: relative;
    z-index: 1;
    width: min(720px, 94vw);
    max-height: calc(100vh - 12px);
    overflow: visible;
    -webkit-overflow-scrolling: touch;
    border: 1px solid rgba(255,255,255,0.25);
    box-shadow:
      0 0 0 2px rgba(255,255,255,0.04) inset,
      0 20px 70px rgba(0,0,0,0.75);
    border-radius: 12px;
    padding: 26px 22px;
    box-sizing: border-box;
    color: #fff;
    text-align: center;
  }
  .invite-topline{
    margin: 6px 0 14px 0;
    font-family: "MenuFont", Arial, sans-serif;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    opacity: 0.95;
    text-shadow: 0 2px 10px rgba(0,0,0,0.70);
  }
  .invite-title{
    margin: 0 0 10px 0;
    font-family: "MenuTitleFont", Arial, sans-serif;
    font-size: clamp(44px, 6.5vw, 88px);
    font-weight: 900;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #000;
    -webkit-text-stroke: 3px #f6d44a;
    paint-order: stroke fill;
    text-shadow:
      0 2px 8px rgba(0,0,0,0.90),
      0 0 26px rgba(246,212,74,0.25);
    line-height: 1.02;
  }
  .invite-title .line2{ display:block; margin-top: 6px; }
  .invite-hostedby{
    margin: 6px 0 18px 0;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    opacity: 0.95;
    text-shadow: 0 2px 10px rgba(0,0,0,0.70);
  }
  .invite-panel{ box-sizing: border-box; width: 100%; max-width: 560px; margin: 0 auto; }
  .invite-letter{
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    margin: 0 auto 10px auto;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
    overflow: visible;
    max-height: none;
    font-family: "MenuFont", Arial, sans-serif;
    font-size: 12px;
    line-height: 1.4;
    text-align: center;
  }
  .invite-name-row{
    display:flex;
    align-items:center;
    justify-content:center;
    gap: 12px;
    flex-wrap: wrap;
    margin: 10px 0 18px 0;
  }
  .invite-name-label{
    font-family: "MenuFont", Arial, sans-serif;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    opacity: 0.95;
    text-shadow: 0 2px 10px rgba(0,0,0,0.70);
  }
  .invite-name-input{
    width: 150px;
    border: 2px solid rgba(255,255,255,0.70);
    background: rgba(0,0,0,0.55);
    color:#fff;
    border-radius: 10px;
    padding: 0px 8px;
    font-family: "MenuFont", Arial, sans-serif;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    outline: none;
    box-shadow: 0 12px 26px rgba(0,0,0,0.55);
  }
  .invite-name-input::placeholder{ color: rgba(255,255,255,0.55); }
  .invite-name-input:focus{
    border-color: rgba(140,255,170,0.98);
    box-shadow:
      0 0 0 3px rgba(140,255,170,0.22) inset,
      0 0 26px rgba(140,255,170,0.45),
      0 18px 36px rgba(0,0,0,0.70);
  }
  .invite-actions{
    display:flex;
    justify-content:center;
    gap: 34px;
    flex-wrap: wrap;
    margin: 8px 0 14px 0;
  }
  .inviteBtn{
    background: rgba(0,0,0,0.68);
    color:#fff;
    border: 2px solid rgba(255,255,255,0.80);
    border-radius: 10px;
    padding: 10px 22px;
    min-width: 160px;
    font-family: "MenuFont", Arial, sans-serif;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    cursor: pointer;
    user-select:none;
    touch-action: manipulation;
    box-shadow: 0 12px 26px rgba(0,0,0,0.60);
    transition: transform .10s ease, box-shadow .18s ease, border-color .18s ease;
  }
  .inviteBtn:hover{
    transform: translateY(-1px);
    border-color: rgba(140,255,170,0.98);
    box-shadow:
      0 0 0 3px rgba(140,255,170,0.22) inset,
      0 0 26px rgba(140,255,170,0.62),
      0 0 60px rgba(140,255,170,0.28),
      0 18px 36px rgba(0,0,0,0.70);
  }
  .inviteBtn:active{ transform: translateY(0px) scale(0.99); }
  .invite-footer{
    margin-top: 8px;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 0.9px;
    text-transform: uppercase;
    opacity: 0.95;
    text-shadow: 0 2px 10px rgba(0,0,0,0.70);
    white-space: pre-line;
  }
`;
document.head.appendChild(inviteStyle);


/* =========================
   AUDIO (WebAudio mixer)
   - Fix: menu clicks now auto-unlock audio if needed
   ========================= */
var AUDIO_PATHS = {
  menu: "assets/audio/menu_theme.mp3",
  click: "assets/audio/ui_click.mp3"
};

// Prefetch raw bytes (no decode before gesture)
var AudioPrefetch = {
  menuArr: null,
  clickArr: null,
  started: false
};

function prefetchArrayBuffer(url){
  return fetch(url).then(function(r){ return r.arrayBuffer(); })
    .catch(function(e){ console.warn("Audio prefetch failed:", url, e); return null; });
}
function beginAudioPrefetch(){
  if (AudioPrefetch.started) return;
  AudioPrefetch.started = true;
  AudioPrefetch.menuArr  = prefetchArrayBuffer(AUDIO_PATHS.menu);
  AudioPrefetch.clickArr = prefetchArrayBuffer(AUDIO_PATHS.click);
}
beginAudioPrefetch();

var AudioMix = {
  ctx: null,
  master: null,
  musicGain: null,
  sfxGain: null,
  buffers: { menu: null, click: null },
  musicSrc: null,
  unlocked: false,
  loading: false,
  wantMenu: false
};

var MENU_MUSIC_VOL = 0.02;
var UI_CLICK_VOL   = 1.00;

function audioLoadBufferPrefetched(key, url) {
  var p = null;
  try {
    if (key === "menu" && AudioPrefetch.menuArr) p = AudioPrefetch.menuArr;
    if (key === "click" && AudioPrefetch.clickArr) p = AudioPrefetch.clickArr;
  } catch (e) {}

  return Promise.resolve(p).then(function(arr){
    if (!arr) {
      return fetch(url).then(function(r){ return r.arrayBuffer(); });
    }
    return arr;
  }).then(function(arr2){
    return AudioMix.ctx.decodeAudioData(arr2);
  });
}

function tryStartMenuMusic() {
  if (!AudioMix.unlocked) return;
  if (!AudioMix.buffers.menu) return;
  if (AudioMix.musicSrc) return;

  var src = AudioMix.ctx.createBufferSource();
  src.buffer = AudioMix.buffers.menu;
  src.loop = true;
  src.connect(AudioMix.musicGain);
  src.start();
  AudioMix.musicSrc = src;
}

function audioInitOnce() {
  if (AudioMix.unlocked) return Promise.resolve(true);
  if (AudioMix.loading) return Promise.resolve(false);
  AudioMix.loading = true;

  var AC = window.AudioContext || window.webkitAudioContext;
  AudioMix.ctx = new AC();

  AudioMix.master = AudioMix.ctx.createGain();
  AudioMix.musicGain = AudioMix.ctx.createGain();
  AudioMix.sfxGain = AudioMix.ctx.createGain();

  AudioMix.master.gain.value = 1.0;
  AudioMix.musicGain.gain.value = MENU_MUSIC_VOL;
  AudioMix.sfxGain.gain.value = UI_CLICK_VOL;

  AudioMix.musicGain.connect(AudioMix.master);
  AudioMix.sfxGain.connect(AudioMix.master);
  AudioMix.master.connect(AudioMix.ctx.destination);

  return Promise.resolve().then(function(){
    try { return AudioMix.ctx.resume(); } catch (e) { return null; }
  }).then(function(){
    AudioMix.unlocked = true;

    return Promise.all([
      audioLoadBufferPrefetched("menu",  AUDIO_PATHS.menu),
      audioLoadBufferPrefetched("click", AUDIO_PATHS.click)
    ]).then(function(bufs){
      AudioMix.buffers.menu = bufs[0];
      AudioMix.buffers.click = bufs[1];
      if (AudioMix.wantMenu) tryStartMenuMusic();
      return true;
    }).catch(function(e){
      console.warn("Audio preload failed:", e);
      return false;
    });
  });
}

function setMenuMusicVolume(v) {
  MENU_MUSIC_VOL = Math.max(0, Math.min(1, v));
  try {
    if (AudioMix.musicGain && AudioMix.ctx) {
      AudioMix.musicGain.gain.setValueAtTime(MENU_MUSIC_VOL, AudioMix.ctx.currentTime);
    }
  } catch (e) {}
}

function fadeMenuMusicTo(targetVol, ms) {
  if (typeof ms !== "number") ms = 700;
  targetVol = Math.max(0, Math.min(1, targetVol));
  try {
    if (!AudioMix.musicGain || !AudioMix.ctx) return;
    var t = AudioMix.ctx.currentTime;
    var g = AudioMix.musicGain.gain;

    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(targetVol, t + ms / 1000);
  } catch (e) {}
}

function setUiClickVolume(v) {
  UI_CLICK_VOL = Math.max(0, Math.min(1, v));
  try {
    if (AudioMix.sfxGain && AudioMix.ctx) {
      AudioMix.sfxGain.gain.setValueAtTime(UI_CLICK_VOL, AudioMix.ctx.currentTime);
    }
  } catch (e) {}
}

function playUiClick() {
  if (!AudioMix.unlocked || !AudioMix.buffers.click) return;
  var src = AudioMix.ctx.createBufferSource();
  src.buffer = AudioMix.buffers.click;
  src.connect(AudioMix.sfxGain);
  src.start();
}

function startMenuMusic() {
  if (!AudioMix.unlocked) return;
  AudioMix.wantMenu = true;

  try {
    if (AudioMix.musicGain && AudioMix.ctx) {
      AudioMix.musicGain.gain.setValueAtTime(0, AudioMix.ctx.currentTime);
    }
  } catch (e) {}

  tryStartMenuMusic();
  fadeMenuMusicTo(MENU_MUSIC_VOL, 700);
}

function stopMenuMusic() {
  AudioMix.wantMenu = false;
  if (!AudioMix.musicSrc) return;
  try { AudioMix.musicSrc.stop(); } catch (e) {}
  AudioMix.musicSrc = null;
}

// Unlock audio on first gesture anywhere (kept)
window.addEventListener("pointerdown", function () {
  audioInitOnce().then(function(){
    var menuEl = document.getElementById("startMenu");
    var inviteEl = document.getElementById("inviteMenu");

    var menuShowing = false;
    var inviteShowing = false;

    try {
      menuShowing = !!menuEl && window.getComputedStyle(menuEl).display !== "none";
      inviteShowing = !!inviteEl && window.getComputedStyle(inviteEl).display !== "none";
    } catch (e) {}

    if (menuShowing && !inviteShowing) startMenuMusic();
  });
}, { once: true });

/* =========================
   TABLE + HUD + STAGE
   ========================= */
var table = document.createElement("div");
table.id = "table";
app.appendChild(table);

var hud = document.createElement("div");
hud.id = "hud";
table.appendChild(hud);

function mkHudBtn(txt){
  var b = document.createElement("button");
  b.className = "hudBtn";
  b.textContent = txt;
  hud.appendChild(b);
  return b;
}

var fitBtn = mkHudBtn("FIT");
var endP1Btn = mkHudBtn("END P1");
var endP2Btn = mkHudBtn("END P2");
var resetTokensBtn = mkHudBtn("RESET");
var factionTestBtn = mkHudBtn("FACTION TEST");

var stage = document.createElement("div");
stage.id = "stage";
table.appendChild(stage);

/* =========================
   PREVIEW OVERLAY
   ========================= */
var previewBackdrop = document.createElement("div");
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

// HARD modal trap
(function trapPreviewInteractions(){
  function stop(e){ e.preventDefault(); e.stopPropagation(); }
  function stopNoPrevent(e){ e.stopPropagation(); }

  previewBackdrop.addEventListener("pointerdown", stop, { capture:true });
  previewBackdrop.addEventListener("pointermove", stop, { capture:true });
  previewBackdrop.addEventListener("pointerup", stopNoPrevent, { capture:true });
  previewBackdrop.addEventListener("pointercancel", stopNoPrevent, { capture:true });
  previewBackdrop.addEventListener("wheel", stop, { capture:true, passive:false });

  previewBackdrop.addEventListener("touchstart", stopNoPrevent, { capture:true, passive:true });
  previewBackdrop.addEventListener("touchmove", stop, { capture:true, passive:false });
  previewBackdrop.addEventListener("touchend", stopNoPrevent, { capture:true, passive:true });

  previewBackdrop.addEventListener("contextmenu", function(e){ e.preventDefault(); e.stopPropagation(); }, { capture:true });
})();

/* =========================
   TRAY
   ========================= */
var trayShell = document.createElement("div");
trayShell.id = "trayShell";
trayShell.style.pointerEvents = "none";
trayShell.style.display = "none";

var tray = document.createElement("div");
tray.id = "tray";

var trayHeaderBar = document.createElement("div");
trayHeaderBar.id = "trayHeaderBar";

var trayTitle = document.createElement("div");
trayTitle.id = "trayTitle";
trayTitle.textContent = "TRAY";

var trayCloseBtn = document.createElement("button");
trayCloseBtn.id = "trayCloseBtn";
trayCloseBtn.type = "button";
trayCloseBtn.textContent = "✕";
trayCloseBtn.setAttribute("aria-label", "Close tray");

trayHeaderBar.appendChild(trayTitle);
trayHeaderBar.appendChild(trayCloseBtn);

var traySearchRow = document.createElement("div");
traySearchRow.id = "traySearchRow";

var traySearchInput = document.createElement("input");
traySearchInput.id = "traySearchInput";
traySearchInput.type = "text";
traySearchInput.placeholder = "Search… (blank shows all)";
traySearchRow.appendChild(traySearchInput);

var trayBody = document.createElement("div");
trayBody.id = "trayBody";

var trayCarousel = document.createElement("div");
trayCarousel.id = "trayCarousel";
trayBody.appendChild(trayCarousel);

tray.appendChild(trayHeaderBar);
tray.appendChild(traySearchRow);
tray.appendChild(trayBody);

trayShell.appendChild(tray);
table.appendChild(trayShell);

trayShell.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
trayShell.addEventListener("pointermove", function(e){ e.stopPropagation(); });
trayShell.addEventListener("pointerup",   function(e){ e.stopPropagation(); });
trayShell.addEventListener("wheel",       function(e){ e.stopPropagation(); }, { passive: true });

/* =========================
   STATE
   ========================= */
var piles = {};
var previewOpen = false;

var forceSlotCenters = [];
var forceMarker = null;

var capSlotCenters = { p1: [], p2: [] };
var capOccupied = { p1: Array(CAP_SLOTS).fill(null), p2: Array(CAP_SLOTS).fill(null) };
var zonesCache = null;

// Tokens
var tokenPools = {
  p1: { damage: TOKENS_DAMAGE_PER_PLAYER, attack: TOKENS_ATTACK_PER_PLAYER, resource: TOKENS_RESOURCE_PER_PLAYER },
  p2: { damage: TOKENS_DAMAGE_PER_PLAYER, attack: TOKENS_ATTACK_PER_PLAYER, resource: TOKENS_RESOURCE_PER_PLAYER }
};
var tokenEls = new Set();

/* =========================
   PREVIEW FUNCTIONS
   ========================= */
function hidePreview() {
  previewBackdrop.style.display = "none";
  previewOpen = false;
  boardPointers.clear();
}

function showPreview(cardData) {
  var imgEl = previewBackdrop.querySelector("#previewImg");
  var titleEl = previewBackdrop.querySelector("#previewTitle");
  var subEl = previewBackdrop.querySelector("#previewSub");
  var pillsEl = previewBackdrop.querySelector("#previewPills");
  var effEl = previewBackdrop.querySelector("#previewEffect");
  var rewEl = previewBackdrop.querySelector("#previewReward");
  var scrollEl = previewBackdrop.querySelector("#previewScroll");

  imgEl.style.backgroundImage = "url('" + (cardData.img || "") + "')";
  titleEl.textContent = cardData.name || "Card";
  subEl.textContent = (cardData.type || "—") + (cardData.subtype ? " • " + cardData.subtype : "");

  pillsEl.innerHTML = "";
  var pills = [
    "Cost: " + ((cardData.cost != null) ? cardData.cost : "—"),
    "Attack: " + ((cardData.attack != null) ? cardData.attack : "—"),
    "Resources: " + ((cardData.resources != null) ? cardData.resources : "—"),
    "Force: " + ((cardData.force != null) ? cardData.force : "—")
  ];

  for (var i = 0; i < pills.length; i++) {
    var d = document.createElement("div");
    d.className = "pill";
    d.textContent = pills[i];
    pillsEl.appendChild(d);
  }

  effEl.textContent = (cardData.effect != null) ? cardData.effect : "—";
  rewEl.textContent = (cardData.reward != null) ? cardData.reward : "—";

  previewBackdrop.style.display = "flex";
  previewOpen = true;

  boardPointers.clear();
  scrollEl.scrollTop = 0;
}

function togglePreview(cardData) { if (previewOpen) hidePreview(); else showPreview(cardData); }

previewBackdrop.querySelector("#closePreviewBtn").addEventListener("click", function(e){ e.preventDefault(); hidePreview(); });
previewBackdrop.addEventListener("pointerdown", function(e){ if (e.target === previewBackdrop) hidePreview(); });
window.addEventListener("keydown", function(e){ if (e.key === "Escape" && previewOpen) hidePreview(); });

/* =========================
   TRAY STATE + BEHAVIOR
   ========================= */
var trayState = {
  open: false,
  mode: "draw",
  drawItems: [],
  searchPileKey: null,
  searchOwner: null,
  searchTitle: "",
  searchOriginalIds: [],
  searchRemovedIds: new Set(),
  searchQuery: ""
};

function setTrayPlayerColor(color) {
  PLAYER_COLOR = color;
  // glow disabled by design; kept for future
  try { delete trayShell.dataset.player; } catch (e) {}
}

function openTray() {
  trayShell.style.display = "block";
  trayShell.style.pointerEvents = "auto";
  trayState.open = true;
}

function closeTray() {
  if (!trayState.open) return;

  if (trayState.mode === "draw") {
    for (var i = trayState.drawItems.length - 1; i >= 0; i--) {
      var it = trayState.drawItems[i];
      if (!piles[it.pileKey]) piles[it.pileKey] = [];
      piles[it.pileKey].unshift(it.card);
    }
    trayState.drawItems = [];
    setDrawCount("p1", 0);
    setDrawCount("p2", 0);
  } else if (trayState.mode === "search") {
    var pileKey = trayState.searchPileKey;
    if (pileKey && piles[pileKey]) {
      var removed = trayState.searchRemovedIds;
      var byId = new Map();
      for (var j = 0; j < piles[pileKey].length; j++) byId.set(piles[pileKey][j].id, piles[pileKey][j]);

      var rebuilt = [];
      for (var k = 0; k < trayState.searchOriginalIds.length; k++) {
        var id = trayState.searchOriginalIds[k];
        if (removed.has(id)) continue;
        var card = byId.get(id);
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

trayCloseBtn.addEventListener("click", function(){ if (!previewOpen) closeTray(); });

function normalize(s) { return (s || "").toLowerCase().trim(); }
function tokenMatch(query, target) {
  var q = normalize(query);
  if (!q) return true;
  var tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  var t = normalize(target);
  for (var i = 0; i < tokens.length; i++) {
    if (t.indexOf(tokens[i]) === -1) return false;
  }
  return true;
}

traySearchInput.addEventListener("input", function(){
  trayState.searchQuery = traySearchInput.value || "";
  renderTray();
});

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
  trayState.searchOriginalIds = (piles[pileKey] || []).map(function(c){ return c.id; });

  trayTitle.textContent = "SEARCH: " + title;
  traySearchInput.value = "";
  traySearchRow.classList.add("show");
  openTray();
  renderTray();

  setTimeout(function(){ try { traySearchInput.focus(); } catch (e) {} }, 0);
}

function makeTrayTile(card) {
  var tile = document.createElement("div");
  tile.className = "trayTile";
  applyFactionBorderClass(tile, card);

  var img = document.createElement("div");
  img.className = "trayTileImg";
  img.style.backgroundImage = "url('" + (card.img || "") + "')";

  var label = document.createElement("div");
  label.className = "trayTileLabel";
  label.textContent = card.name || "Card";

  tile.appendChild(img);
  tile.appendChild(label);
  return tile;
}

/* Mobile tray drag:
   - Scroll normally
   - Hold to drag out */
function makeTrayTileDraggable(tile, card, onCommitToBoard) {
  var holdTimer = null;
  var holdArmed = false;
  var dragging = false;
  var ghost = null;
  var start = { x: 0, y: 0 };
  var last = { x: 0, y: 0 };
  var pid = null;

  function clearHold() {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    holdArmed = false;
  }

  function startDragNow() {
    if (dragging) return;
    dragging = true;
    tile.__justDragged = false;
    trayShell.classList.add("dragging");

    try { tile.setPointerCapture(pid); } catch (e) {}

    ghost = document.createElement("div");
    ghost.style.position = "fixed";
    ghost.style.left = (last.x - 54) + "px";
    ghost.style.top  = (last.y - 75) + "px";
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

    var trayRect = tray.getBoundingClientRect();
    var releasedOverTray =
      clientX >= trayRect.left && clientX <= trayRect.right &&
      clientY >= trayRect.top  && clientY <= trayRect.bottom;

    if (!releasedOverTray) {
      var p = viewportToDesign(clientX, clientY);
      var kind = (card.kind === "base" || String(card.type || "").toLowerCase() === "base") ? "base" : "unit";
      var el = makeCardEl(card, kind);

      var w = (kind === "base") ? BASE_W : CARD_W;
      var h = (kind === "base") ? BASE_H : CARD_H;

      el.style.left = (p.x - w / 2) + "px";
      el.style.top  = (p.y - h / 2) + "px";
      el.style.zIndex = (kind === "base") ? "12000" : "15000";

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

  tile.addEventListener("contextmenu", function(e){
    e.preventDefault(); e.stopPropagation();
    showPreview(card);
  });

  tile.addEventListener("pointerdown", function(e){
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
    holdTimer = setTimeout(function(){
      if (!holdArmed) return;
      startDragNow();
    }, TRAY_HOLD_TO_DRAG_MS);
  });

  tile.addEventListener("pointermove", function(e){
    if (previewOpen) return;
    last = { x: e.clientX, y: e.clientY };

    if (holdArmed && !dragging) {
      var moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (moved > TRAY_MOVE_CANCEL_PX) clearHold();
      return;
    }

    if (dragging && ghost) {
      e.preventDefault();
      e.stopPropagation();
      ghost.style.left = (e.clientX - 54) + "px";
      ghost.style.top  = (e.clientY - 75) + "px";
    }
  });

  tile.addEventListener("pointerup", function(e){
    var moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > TRAY_TAP_MOVE_PX;

    if (!dragging) {
      var wasHoldArmed = holdArmed;
      clearHold();
      if (!moved && wasHoldArmed) {
        tile.__tapJustHappened = true;
        setTimeout(function(){ tile.__tapJustHappened = false; }, 0);
      }
      return;
    }

    dragging = false;
    clearHold();
    tile.__justDragged = true;

    try { tile.releasePointerCapture(e.pointerId); } catch (err) {}
    finishDrag(e.clientX, e.clientY);
  });

  tile.addEventListener("pointercancel", function(){
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
    for (var i = 0; i < trayState.drawItems.length; i++) {
      (function(item){
        var tile = makeTrayTile(item.card);

        tile.addEventListener("click", function(){
          if (tile.__justDragged) { tile.__justDragged = false; return; }
          showPreview(item.card);
        });

        makeTrayTileDraggable(tile, item.card, function(){
          trayState.drawItems = trayState.drawItems.filter(function(x){ return x.card.id !== item.card.id; });
          setDrawCount(item.owner, trayState.drawItems.filter(function(x){ return x.owner === item.owner; }).length);
          renderTray();
        });

        trayCarousel.appendChild(tile);
      })(trayState.drawItems[i]);
    }
  } else {
    var pileKey = trayState.searchPileKey;
    if (!pileKey) return;

    var removed = trayState.searchRemovedIds;

    var pileById = new Map();
    var arr = piles[pileKey] || [];
    for (var j = 0; j < arr.length; j++) pileById.set(arr[j].id, arr[j]);

    var ordered = [];
    for (var k = 0; k < trayState.searchOriginalIds.length; k++) {
      var id = trayState.searchOriginalIds[k];
      if (removed.has(id)) continue;
      var card = pileById.get(id);
      if (card) ordered.push(card);
    }

    var q = trayState.searchQuery || "";
    var visible = q ? ordered.filter(function(c){ return tokenMatch(q, c.name || ""); }) : ordered;

    for (var t = 0; t < visible.length; t++) {
      (function(card){
        var tile2 = makeTrayTile(card);

        tile2.addEventListener("click", function(){
          if (tile2.__justDragged) { tile2.__justDragged = false; return; }
          showPreview(card);
        });

        makeTrayTileDraggable(tile2, card, function(){
          trayState.searchRemovedIds.add(card.id);
          piles[pileKey] = (piles[pileKey] || []).filter(function(c){ return c.id !== card.id; });
          renderTray();
        });

        trayCarousel.appendChild(tile2);
      })(visible[t]);
    }
  }
}

/* =========================
   DRAW COUNT BADGES
   ========================= */
var drawCountBadges = { p1: null, p2: null };

function ensureDrawCountBadges() {
  if (!zonesCache) return;
  var z1 = zonesCache.p1_draw;
  var z2 = zonesCache.p2_draw;

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

  drawCountBadges.p1.style.left = Math.round(z1.x + z1.w + 10) + "px";
  drawCountBadges.p1.style.top  = Math.round(z1.y + z1.h/2 - 17) + "px";

  drawCountBadges.p2.style.left = Math.round(z2.x + z2.w + 10) + "px";
  drawCountBadges.p2.style.top  = Math.round(z2.y + z2.h/2 - 17) + "px";

  setDrawCount("p1", 0);
  setDrawCount("p2", 0);
}

function setDrawCount(owner, n) {
  var b = drawCountBadges[owner];
  if (!b) return;
  b.textContent = String(n);
  b.style.display = (n > 0) ? "flex" : "none";
}

/* =========================
   PILE CLICK BINDINGS
   ========================= */
function bindPileZoneClicks() {
  var clickMap = [
    { id:"p1_draw", owner:"p1", pileKey:"p1_draw", label:"P1 DRAW" },
    { id:"p2_draw", owner:"p2", pileKey:"p2_draw", label:"P2 DRAW" },

    { id:"p1_discard", owner:"p1", pileKey:"p1_discard", label:"P1 DISCARD" },
    { id:"p2_discard", owner:"p2", pileKey:"p2_discard", label:"P2 DISCARD" },

    { id:"p1_exile_draw", owner:"p1", pileKey:"p1_exile", label:"P1 EXILE" },
    { id:"p1_exile_perm", owner:"p1", pileKey:"p1_exile", label:"P1 EXILE" },

    { id:"p2_exile_draw", owner:"p2", pileKey:"p2_exile", label:"P2 EXILE" },
    { id:"p2_exile_perm", owner:"p2", pileKey:"p2_exile", label:"P2 EXILE" }
  ];

  for (var i = 0; i < clickMap.length; i++) {
    (function(m){
      var el = stage.querySelector(".zone[data-zone-id='" + m.id + "']");
      if (!el) return;
      el.classList.add("clickable");

      // remove old listeners safely
      var clone = el.cloneNode(true);
      el.replaceWith(clone);

      clone.addEventListener("pointerdown", function(e){
        if (previewOpen) return;
        e.stopPropagation();

        if (m.id === "p1_draw" || m.id === "p2_draw") {
          if (!piles[m.pileKey] || piles[m.pileKey].length === 0) return;

          openTrayDraw();
          var card = piles[m.pileKey].shift();
          trayState.drawItems.push({ owner: m.owner, pileKey: m.pileKey, card: card });
          setDrawCount(m.owner, trayState.drawItems.filter(function(x){ return x.owner === m.owner; }).length);
          renderTray();
          return;
        }

        openTraySearch(m.owner, m.pileKey, m.label);
      });
    })(clickMap[i]);
  }
}

/* =========================
   ZONE MATH
   ========================= */
function computeZones() {
  var xPiles = 240;
  var xGalaxyDeck = xPiles + (CARD_W * 2 + GAP) + BIG_GAP;

  var xRowStart = xGalaxyDeck + CARD_W + BIG_GAP;
  var rowSlotGap = GAP;
  var rowWidth = (CARD_W * 6) + (rowSlotGap * 5);

  var xOuterRim = xRowStart + rowWidth + BIG_GAP;

  var xForce = xOuterRim + CARD_W + GAP;
  var forceTrackW = 52;

  var xGalaxyDiscard = xForce + forceTrackW + GAP;
  var xCaptured = xGalaxyDiscard + CARD_W + BIG_GAP;

  var yTopPiles = 90;

  var yRow1 = 220;
  var yRow2 = yRow1 + CARD_H + GAP;

  var yForceTrack = yRow1;
  var forceTrackH = (CARD_H * 2) + GAP;

  var yGalaxyDeck = yRow1 + Math.round(CARD_H / 2) + Math.round(GAP / 2);

  var yTopBase = yRow1 - BASE_H - BASE_ROW_GAP;
  var yBottomBase = (yRow2 + CARD_H) + BASE_ROW_GAP;

  var yTopExile = yRow1 - (CARD_H + BIG_GAP);
  var yBotExile = yRow2 + CARD_H + BIG_GAP;

  var yBottomPiles = yBotExile;

  var yGalaxyDiscard = yRow1 + Math.round((forceTrackH / 2) - (CARD_H / 2));
  var yCapTop = yGalaxyDiscard - CAP_DISCARD_GAP - CAP_H;
  var yCapBottom = yGalaxyDiscard + CARD_H + CAP_DISCARD_GAP;

  var xForceCenter = xForce + (forceTrackW / 2);
  var xExileLeft = xForceCenter - (CARD_W + (EXILE_GAP / 2));

  // Token banks under piles
  var pilesW = (CARD_W * 2) + GAP;
  var pilesCenterX = xPiles + (pilesW / 2);

  var bankW = (TOKEN_BIN_W * 3) + (TOKEN_BIN_GAP * 2);
  var bankH = TOKEN_BIN_H;
  var bankX = Math.round(pilesCenterX - bankW / 2);

  var bankGap = 14;
  var yP1TokenBank = yBottomPiles + CARD_H + bankGap;
  var yP2TokenBank = yTopPiles - bankGap - bankH;

  var zones = {
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

    p1_token_bank: rect(bankX, yP1TokenBank, bankW, bankH),
    p2_token_bank: rect(bankX, yP2TokenBank, bankW, bankH)
  };

  for (var c = 0; c < 6; c++) {
    zones["g1" + (c + 1)] = rect(xRowStart + c * (CARD_W + rowSlotGap), yRow1, CARD_W, CARD_H);
    zones["g2" + (c + 1)] = rect(xRowStart + c * (CARD_W + rowSlotGap), yRow2, CARD_W, CARD_H);
  }

  // Normalize (FIT-safe)
  var PAD = 18;
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  var keys = Object.keys(zones);
  for (var i = 0; i < keys.length; i++) {
    var r = zones[keys[i]];
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }

  var shiftX = (minX < PAD) ? (PAD - minX) : 0;
  var shiftY = (minY < PAD) ? (PAD - minY) : 0;

  if (shiftX || shiftY) {
    for (var j = 0; j < keys.length; j++) {
      zones[keys[j]].x += shiftX;
      zones[keys[j]].y += shiftY;
    }
    maxX += shiftX;
    maxY += shiftY;
  }

  DESIGN_W = Math.ceil(maxX + PAD);
  DESIGN_H = Math.ceil(maxY + PAD);

  return zones;
}

/* =========================
   CAMERA + INPUT
   ========================= */
var camera = { scale: 1, tx: 0, ty: 0 };

function viewportSize() {
  var vv = window.visualViewport;
  return { w: vv ? vv.width : window.innerWidth, h: vv ? vv.height : window.innerHeight };
}
function applyCamera() {
  stage.style.transform = "translate(" + camera.tx + "px, " + camera.ty + "px) scale(" + camera.scale + ")";
}

function fitToScreen() {
  var vs = viewportSize();
  var w = vs.w, h = vs.h;
  var margin = 16;

  var trayW = 0;
  try { if (trayShell && trayShell.style.display !== "none") trayW = trayShell.getBoundingClientRect().width; } catch (e) {}

  var usableW = Math.max(200, w - trayW);
  var s = Math.min(
    (usableW - margin * 2) / DESIGN_W,
    (h - margin * 2) / DESIGN_H
  );

  camera.scale = s;

  var centerTx = Math.round((usableW - DESIGN_W * s) / 2);
  var centerTy = Math.round((h - DESIGN_H * s) / 2);

  var leftBias = Math.min(90, Math.round(w * 0.10));
  camera.tx = centerTx - leftBias;
  camera.ty = centerTy;

  applyCamera();
  refreshSnapRects();
}

fitBtn.addEventListener("click", function(e){ e.preventDefault(); fitToScreen(); });

var BOARD_MIN_SCALE = 0.25;
var BOARD_MAX_SCALE = 4.0;

function viewportToDesign(vx, vy){
  return { x: (vx - camera.tx) / camera.scale, y: (vy - camera.ty) / camera.scale };
}
function setScaleAround(newScale, vx, vy){
  var clamped = Math.max(BOARD_MIN_SCALE, Math.min(BOARD_MAX_SCALE, newScale));
  var world = viewportToDesign(vx, vy);

  camera.scale = clamped;
  camera.tx = vx - world.x * camera.scale;
  camera.ty = vy - world.y * camera.scale;

  applyCamera();
  refreshSnapRects();
}
function dist(a,b){ return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
function mid(a,b){ return { x:(a.clientX+b.clientX)/2, y:(a.clientY+b.clientY)/2 }; }

var boardPointers = new Map();
var boardLast = { x: 0, y: 0 };
var pinchStartDist = 0;
var pinchStartScale = 1;
var pinchMid = { x: 0, y: 0 };

table.addEventListener("pointerdown", function(e){
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
    var pts = Array.from(boardPointers.values());
    pinchStartDist = dist(pts[0], pts[1]);
    pinchStartScale = camera.scale;
    pinchMid = mid(pts[0], pts[1]);
  }
});

table.addEventListener("pointermove", function(e){
  if (previewOpen) return;
  if (!boardPointers.has(e.pointerId)) return;
  boardPointers.set(e.pointerId, e);

  if (boardPointers.size === 1) {
    var dx = e.clientX - boardLast.x;
    var dy = e.clientY - boardLast.y;
    camera.tx += dx;
    camera.ty += dy;
    boardLast = { x: e.clientX, y: e.clientY };
    applyCamera();
    refreshSnapRects();
    return;
  }

  if (boardPointers.size === 2) {
    var pts = Array.from(boardPointers.values());
    var d = dist(pts[0], pts[1]);
    var factor = d / pinchStartDist;
    setScaleAround(pinchStartScale * factor, pinchMid.x, pinchMid.y);
  }
});

function endBoardPointer(e){
  boardPointers.delete(e.pointerId);
  if (boardPointers.size === 1){
    var p = Array.from(boardPointers.values())[0];
    boardLast = { x: p.clientX, y: p.clientY };
  }
}
table.addEventListener("pointerup", endBoardPointer);
table.addEventListener("pointercancel", function(){ boardPointers.clear(); });

table.addEventListener("wheel", function(e){
  if (previewOpen) return;
  if (e.target.closest("#tray")) return;
  if (e.target.closest("#trayShell")) return;
  if (e.target.closest("#previewBackdrop")) return;
  e.preventDefault();
  var zoomIntensity = 0.0018;
  var delta = -e.deltaY;
  var newScale = camera.scale * (1 + delta * zoomIntensity);
  setScaleAround(newScale, e.clientX, e.clientY);
}, { passive: false });

/* =========================
   SNAPPING
   ========================= */
var SNAP_ZONE_IDS = new Set([
  "p2_draw","p2_discard","p2_exile_draw","p2_exile_perm",
  "p1_draw","p1_discard","p1_exile_draw","p1_exile_perm",
  "galaxy_deck","galaxy_discard","outer_rim",
  "g11","g12","g13","g14","g15","g16",
  "g21","g22","g23","g24","g25","g26",
  "p2_base_stack","p1_base_stack"
]);

var UNIT_SNAP_ZONE_IDS = new Set([
  "p2_draw","p2_discard","p2_exile_draw","p2_exile_perm",
  "p1_draw","p1_discard","p1_exile_draw","p1_exile_perm",
  "galaxy_deck","galaxy_discard","outer_rim",
  "g11","g12","g13","g14","g15","g16",
  "g21","g22","g23","g24","g25","g26"
]);

var BASE_SNAP_ZONE_IDS = new Set(["p1_base_stack","p2_base_stack"]);

var zonesMeta = [];
function refreshSnapRects() {
  zonesMeta = [];
  var els = stage.querySelectorAll(".zone");
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    var id = el.dataset.zoneId;
    if (!SNAP_ZONE_IDS.has(id)) continue;
    var b = el.getBoundingClientRect();
    zonesMeta.push({ id: id, left: b.left, top: b.top, width: b.width, height: b.height });
  }
}

function snapCardToNearestZone(cardEl) {
  if (!zonesMeta.length) return;

  var kind = cardEl.dataset.kind || "unit";
  var allowed = (kind === "base") ? BASE_SNAP_ZONE_IDS : UNIT_SNAP_ZONE_IDS;

  var cardRect = cardEl.getBoundingClientRect();
  var cx = cardRect.left + cardRect.width / 2;
  var cy = cardRect.top + cardRect.height / 2;

  var best = null;
  var bestDist = Infinity;

  for (var i = 0; i < zonesMeta.length; i++) {
    var z = zonesMeta[i];
    if (!allowed.has(z.id)) continue;
    var zx = z.left + z.width / 2;
    var zy = z.top + z.height / 2;
    var d = Math.hypot(cx - zx, cy - zy);
    if (d < bestDist) { bestDist = d; best = z; }
  }
  if (!best) return;

  var cardDiag = Math.hypot(cardRect.width, cardRect.height);
  var zoneDiag = Math.hypot(best.width, best.height);
  var threshold = Math.max(cardDiag, zoneDiag) * 0.55;
  if (bestDist > threshold) return;

  var stageRect = stage.getBoundingClientRect();
  var targetCenterX = (best.left + best.width / 2 - stageRect.left) / camera.scale;
  var targetCenterY = (best.top + best.height / 2 - stageRect.top) / camera.scale;

  var w = parseFloat(cardEl.style.width);
  var h = parseFloat(cardEl.style.height);

  cardEl.style.left = (targetCenterX - w / 2) + "px";
  cardEl.style.top  = (targetCenterY - h / 2) + "px";
}

function snapBaseToNearestBaseStack(baseEl) {
  if (!zonesMeta.length) return;

  var baseRect = baseEl.getBoundingClientRect();
  var cx = baseRect.left + baseRect.width / 2;
  var cy = baseRect.top + baseRect.height / 2;

  var best = null;
  var bestDist = Infinity;

  for (var i = 0; i < zonesMeta.length; i++) {
    var z = zonesMeta[i];
    if (!BASE_SNAP_ZONE_IDS.has(z.id)) continue;
    var zx = z.left + z.width / 2;
    var zy = z.top + z.height / 2;
    var d = Math.hypot(cx - zx, cy - zy);
    if (d < bestDist) { bestDist = d; best = z; }
  }
  if (!best) return;

  var zoneDiag = Math.hypot(best.width, best.height);
  var baseDiag = Math.hypot(baseRect.width, baseRect.height);
  var threshold = Math.max(zoneDiag, baseDiag) * 0.70;
  if (bestDist > threshold) return;

  var stageRect = stage.getBoundingClientRect();
  var targetCenterX = (best.left + best.width / 2 - stageRect.left) / camera.scale;
  var targetCenterY = (best.top + best.height / 2 - stageRect.top) / camera.scale;

  baseEl.style.left = (targetCenterX - BASE_W / 2) + "px";
  baseEl.style.top  = (targetCenterY - BASE_H / 2) + "px";
}

/* =========================
   FORCE TRACK
   ========================= */
function buildForceTrackSlots(forceRect) {
  var old = stage.querySelectorAll(".forceSlot");
  for (var i = 0; i < old.length; i++) old[i].remove();
  forceSlotCenters = [];

  var pad = 10;
  var usableH = forceRect.h - pad * 2;

  for (var s = 0; s < FORCE_SLOTS; s++) {
    var t = (FORCE_SLOTS === 1) ? 0.5 : s / (FORCE_SLOTS - 1);
    var cy = forceRect.y + pad + t * usableH;
    var cx = forceRect.x + forceRect.w / 2;

    forceSlotCenters.push({ x: cx, y: cy });

    var slot = document.createElement("div");
    slot.className = "forceSlot" + ((s === FORCE_NEUTRAL_INDEX) ? " neutral" : "");
    slot.style.left = forceRect.x + "px";
    slot.style.top = Math.round(cy - 16) + "px";
    slot.style.width = forceRect.w + "px";
    slot.style.height = "32px";
    stage.appendChild(slot);
  }
}

function ensureForceMarker(initialIndex) {
  if (typeof initialIndex !== "number") initialIndex = FORCE_NEUTRAL_INDEX;
  if (forceMarker) return;

  forceMarker = document.createElement("div");
  forceMarker.className = "forceMarker";
  stage.appendChild(forceMarker);

  var draggingMarker = false;
  var markerOffX = 0;
  var markerOffY = 0;

  function snapMarkerToNearestSlot() {
    if (!forceSlotCenters.length) return;

    var left = parseFloat(forceMarker.style.left || "0");
    var top = parseFloat(forceMarker.style.top || "0");
    var cx = left + FORCE_MARKER_SIZE / 2;
    var cy = top + FORCE_MARKER_SIZE / 2;

    var best = 0;
    var bestD = Infinity;
    for (var i = 0; i < forceSlotCenters.length; i++) {
      var s = forceSlotCenters[i];
      var d = Math.hypot(cx - s.x, cy - s.y);
      if (d < bestD) { bestD = d; best = i; }
    }

    var target = forceSlotCenters[best];
    forceMarker.style.left = (target.x - FORCE_MARKER_SIZE / 2) + "px";
    forceMarker.style.top  = (target.y - FORCE_MARKER_SIZE / 2) + "px";
  }

  forceMarker.addEventListener("pointerdown", function(e){
    if (previewOpen) return;
    if (e.button !== 0) return;
    forceMarker.setPointerCapture(e.pointerId);
    draggingMarker = true;

    var stageRect = stage.getBoundingClientRect();
    var px = (e.clientX - stageRect.left) / camera.scale;
    var py = (e.clientY - stageRect.top) / camera.scale;

    var left = parseFloat(forceMarker.style.left || "0");
    var top = parseFloat(forceMarker.style.top || "0");
    markerOffX = px - left;
    markerOffY = py - top;
  });

  forceMarker.addEventListener("pointermove", function(e){
    if (!draggingMarker) return;
    var stageRect = stage.getBoundingClientRect();
    var px = (e.clientX - stageRect.left) / camera.scale;
    var py = (e.clientY - stageRect.top) / camera.scale;
    forceMarker.style.left = (px - markerOffX) + "px";
    forceMarker.style.top  = (py - markerOffY) + "px";
  });

  forceMarker.addEventListener("pointerup", function(e){
    draggingMarker = false;
    try { forceMarker.releasePointerCapture(e.pointerId); } catch (err) {}
    snapMarkerToNearestSlot();
  });

  forceMarker.addEventListener("pointercancel", function(){ draggingMarker = false; });

  if (forceSlotCenters.length) {
    var c = forceSlotCenters[initialIndex] || forceSlotCenters[FORCE_NEUTRAL_INDEX];
    forceMarker.style.left = (c.x - FORCE_MARKER_SIZE / 2) + "px";
    forceMarker.style.top  = (c.y - FORCE_MARKER_SIZE / 2) + "px";
  }
}

/* =========================
   CAPTURED BASE SLOTS
   ========================= */
function buildCapturedBaseSlots(capRect, sideLabel) {
  var old = stage.querySelectorAll(".capSlot[data-cap-side='" + sideLabel + "']");
  for (var i = 0; i < old.length; i++) old[i].remove();
  capSlotCenters[sideLabel] = [];

  var startX = capRect.x;
  var startY = capRect.y;

  for (var k = 0; k < CAP_SLOTS; k++) {
    var slotY = startY + k * CAP_OVERLAP;
    var cx = startX + CAP_W / 2;
    var cy = slotY + BASE_H / 2;

    capSlotCenters[sideLabel].push({ x: cx, y: cy });

    var slot = document.createElement("div");
    slot.className = "capSlot";
    slot.dataset.capSide = sideLabel;
    slot.dataset.capIndex = String(k);
    slot.style.left = startX + "px";
    slot.style.top  = slotY + "px";
    slot.style.width = CAP_W + "px";
    slot.style.height = BASE_H + "px";
    stage.appendChild(slot);
  }
}

function clearCapturedAssignment(baseEl){
  var side = baseEl.dataset.capSide;
  var idx = Number(baseEl.dataset.capIndex || "-1");
  if (!side || idx < 0) return;
  if (capOccupied[side] && capOccupied[side][idx] === baseEl.dataset.cardId) {
    capOccupied[side][idx] = null;
  }
  delete baseEl.dataset.capSide;
  delete baseEl.dataset.capIndex;
}

function snapBaseAutoFill(baseEl){
  var capP2 = zonesCache.p2_captured_bases;
  var capP1 = zonesCache.p1_captured_bases;

  var b = baseEl.getBoundingClientRect();
  var cx = b.left + b.width/2;
  var cy = b.top + b.height/2;

  function inRect(r){ return (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom); }

  var stageRect = stage.getBoundingClientRect();

  function rectFor(capRect){
    var l = stageRect.left + capRect.x * camera.scale;
    var t = stageRect.top  + capRect.y * camera.scale;
    return { left:l, top:t, right:l + capRect.w * camera.scale, bottom:t + capRect.h * camera.scale };
  }

  var p2R = rectFor(capP2);
  var p1R = rectFor(capP1);

  var side = null;
  if (inRect(p2R)) side = "p2";
  else if (inRect(p1R)) side = "p1";

  if (!side){
    clearCapturedAssignment(baseEl);
    return;
  }

  var occ = capOccupied[side];
  var idx = occ.findIndex(function(v){ return v === null; });
  if (idx === -1) idx = CAP_SLOTS - 1;

  occ[idx] = baseEl.dataset.cardId;
  baseEl.dataset.capSide = side;
  baseEl.dataset.capIndex = String(idx);

  var target = capSlotCenters[side][idx];
  baseEl.style.left = (target.x - BASE_W/2) + "px";
  baseEl.style.top  = (target.y - BASE_H/2) + "px";
  baseEl.style.zIndex = String(CAP_Z_BASE + idx);
}

/* =========================
   ROTATE + FLIP
   ========================= */
function applyRotationSize(cardEl) {
  var rot = ((Number(cardEl.dataset.rot || "0") % 360) + 360) % 360;
  cardEl.style.width = CARD_W + "px";
  cardEl.style.height = CARD_H + "px";
  cardEl.style.transformOrigin = "50% 50%";
  cardEl.style.transform = "rotate(" + rot + "deg)";
  var face = cardEl.querySelector(".cardFace");
  if (face) face.style.transform = "none";
}

function toggleRotate(cardEl) {
  var cur = ((Number(cardEl.dataset.rot || "0") % 360) + 360) % 360;
  var next = (cur + 90) % 360;
  cardEl.dataset.rot = String(next);
  applyRotationSize(cardEl);
  refreshSnapRects();
}

function toggleFlip(cardEl) {
  var cur = cardEl.dataset.face || "up";
  cardEl.dataset.face = (cur === "up") ? "down" : "up";
}

/* =========================
   TOKENS
   ========================= */
var tokenBankEls = { p1: null, p2: null };

function tokenClassFor(type) {
  if (type === "damage") return "tokenRed";
  if (type === "attack") return "tokenBlue";
  return "tokenGold";
}

function createTokenCube(owner, type, x, y) {
  var t = document.createElement("div");
  t.className = "tokenCube " + tokenClassFor(type);
  t.dataset.owner = owner;
  t.dataset.type = type;
  t.style.left = (x - TOKEN_SIZE/2) + "px";
  t.style.top  = (y - TOKEN_SIZE/2) + "px";
  t.style.zIndex = "16000";
  stage.appendChild(t);
  tokenEls.add(t);

  attachTokenDragHandlers(t);
  return t;
}

function attachTokenDragHandlers(el) {
  var dragging = false;
  var offX = 0, offY = 0;

  el.addEventListener("pointerdown", function(e){
    if (previewOpen) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    el.setPointerCapture(e.pointerId);
    dragging = true;

    var stageRect = stage.getBoundingClientRect();
    var px = (e.clientX - stageRect.left) / camera.scale;
    var py = (e.clientY - stageRect.top) / camera.scale;

    var left = parseFloat(el.style.left || "0");
    var top  = parseFloat(el.style.top || "0");
    offX = px - left;
    offY = py - top;

    el.style.zIndex = "60000";
  });

  el.addEventListener("pointermove", function(e){
    if (!dragging) return;
    var stageRect = stage.getBoundingClientRect();
    var px = (e.clientX - stageRect.left) / camera.scale;
    var py = (e.clientY - stageRect.top) / camera.scale;

    el.style.left = (px - offX) + "px";
    el.style.top  = (py - offY) + "px";
  });

  el.addEventListener("pointerup", function(e){
    dragging = false;
    try { el.releasePointerCapture(e.pointerId); } catch (err) {}
    el.style.zIndex = "16000";
  });

  el.addEventListener("pointercancel", function(){ dragging = false; });
}

function spawnTokenFromBin(owner, type, clientX, clientY, pointerId) {
  if (tokenPools[owner][type] <= 0) return;

  tokenPools[owner][type] -= 1;

  var stageRect0 = stage.getBoundingClientRect();
  var px0 = (clientX - stageRect0.left) / camera.scale;
  var py0 = (clientY - stageRect0.top)  / camera.scale;

  var tok = createTokenCube(owner, type, px0, py0);
  tok.style.zIndex = "60000";

  try { tok.setPointerCapture(pointerId); } catch (e) {}

  function move(e) {
    var stageRect = stage.getBoundingClientRect();
    var px = (e.clientX - stageRect.left) / camera.scale;
    var py = (e.clientY - stageRect.top)  / camera.scale;
    tok.style.left = (px - TOKEN_SIZE/2) + "px";
    tok.style.top  = (py - TOKEN_SIZE/2) + "px";
  }

  function up(e) {
    try { tok.releasePointerCapture(pointerId); } catch (err) {}
    tok.style.zIndex = "16000";
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerup", up, true);
    window.removeEventListener("pointercancel", up, true);
  }

  window.addEventListener("pointermove", move, true);
  window.addEventListener("pointerup", up, true);
  window.addEventListener("pointercancel", up, true);
}

function buildTokenBank(owner, r) {
  var bank = document.createElement("div");
  bank.className = "tokenBank";
  bank.style.left = r.x + "px";
  bank.style.top  = r.y + "px";
  bank.style.width = r.w + "px";
  bank.style.height = r.h + "px";
  bank.dataset.owner = owner;

  var row = document.createElement("div");
  row.className = "tokenBinsRow";

  var bins = [
    { type:"damage" },
    { type:"attack" },
    { type:"resource" }
  ];

  for (var i = 0; i < bins.length; i++) {
    (function(b){
      var bin = document.createElement("div");
      bin.className = "tokenBin";
      bin.dataset.owner = owner;
      bin.dataset.type = b.type;

      var source = document.createElement("div");
      source.className = "tokenSourceCube " + tokenClassFor(b.type);
      source.style.left = "0px";
      source.style.top  = "0px";
      bin.appendChild(source);

      bin.addEventListener("pointerdown", function(e){
        if (previewOpen) return;
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        spawnTokenFromBin(owner, b.type, e.clientX, e.clientY, e.pointerId);
      });

      row.appendChild(bin);
    })(bins[i]);
  }

  bank.appendChild(row);
  bank.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
  bank.addEventListener("pointermove", function(e){ e.stopPropagation(); });
  bank.addEventListener("pointerup", function(e){ e.stopPropagation(); });

  stage.appendChild(bank);
  tokenBankEls[owner] = bank;
}

function returnTokensForOwner(owner, typesToReturn) {
  var toRemove = [];
  tokenEls.forEach(function(t){
    if (!t.isConnected) { toRemove.push(t); return; }
    if (t.dataset.owner !== owner) return;
    var type = t.dataset.type;
    if (typesToReturn.indexOf(type) === -1) return;
    toRemove.push(t);
    tokenPools[owner][type] += 1;
  });

  for (var i = 0; i < toRemove.length; i++) {
    var t = toRemove[i];
    if (t.isConnected) t.remove();
    tokenEls.delete(t);
  }
}

function endTurn(owner) {
  returnTokensForOwner(owner, ["attack","resource"]);
}

function resetAllTokens() {
  Array.from(tokenEls).forEach(function(t){
    if (t.isConnected) t.remove();
    tokenEls.delete(t);
  });

  tokenPools.p1.damage = TOKENS_DAMAGE_PER_PLAYER;
  tokenPools.p1.attack = TOKENS_ATTACK_PER_PLAYER;
  tokenPools.p1.resource = TOKENS_RESOURCE_PER_PLAYER;

  tokenPools.p2.damage = TOKENS_DAMAGE_PER_PLAYER;
  tokenPools.p2.attack = TOKENS_ATTACK_PER_PLAYER;
  tokenPools.p2.resource = TOKENS_RESOURCE_PER_PLAYER;
}

endP1Btn.addEventListener("click", function(e){ e.preventDefault(); endTurn("p1"); });
endP2Btn.addEventListener("click", function(e){ e.preventDefault(); endTurn("p2"); });
resetTokensBtn.addEventListener("click", function(e){ e.preventDefault(); resetAllTokens(); });

/* =========================
   BUILD
   ========================= */
function build() {
  stage.innerHTML = "";

  var zones = computeZones();
  zonesCache = zones;

  stage.style.width = DESIGN_W + "px";
  stage.style.height = DESIGN_H + "px";

  var entries = Object.entries(zones);
  for (var i = 0; i < entries.length; i++) {
    var id = entries[i][0];
    var rr = entries[i][1];
    if (id === "p1_token_bank" || id === "p2_token_bank") continue;

    var el = document.createElement("div");
    el.className = "zone";
    el.dataset.zoneId = id;
    el.style.left = rr.x + "px";
    el.style.top = rr.y + "px";
    el.style.width = rr.w + "px";
    el.style.height = rr.h + "px";
    stage.appendChild(el);
  }

  buildForceTrackSlots(zones.force_track);
  ensureForceMarker(FORCE_NEUTRAL_INDEX);

  buildCapturedBaseSlots(zones.p2_captured_bases, "p2");
  buildCapturedBaseSlots(zones.p1_captured_bases, "p1");

  buildTokenBank("p2", zones.p2_token_bank);
  buildTokenBank("p1", zones.p1_token_bank);

  applyCamera();
  refreshSnapRects();
  ensureDrawCountBadges();
  bindPileZoneClicks();
  fitToScreen();
}

function initBoard() { build(); }

window.addEventListener("resize", function(){ fitToScreen(); });
if (window.visualViewport) window.visualViewport.addEventListener("resize", function(){ fitToScreen(); });

/* =========================
   FACTION BORDER HELPERS
   ========================= */
function getFactionKey(cardData){
  var raw = String(
    (cardData.faction != null) ? cardData.faction :
    (cardData.side != null) ? cardData.side :
    (cardData.allegiance != null) ? cardData.allegiance :
    (cardData.border != null) ? cardData.border :
    ""
  ).toLowerCase().trim();

  if (raw === "mando" || raw === "mandalorian" || raw === "mandalorians") return "mando";
  if (raw === "neutral" || raw === "grey" || raw === "gray" || raw === "silver") return "neutral";
  if (raw === "blue") return "blue";
  if (raw === "red") return "red";

  if (raw === "empire" || raw === "separatists" || raw === "separatist") return "blue";
  if (raw === "rebels" || raw === "rebel" || raw === "republic") return "red";

  return "";
}

function applyFactionBorderClass(el, cardData){
  el.classList.remove("fBlue","fRed","fNeutral","fMando");
  var k = getFactionKey(cardData);
  if (k === "blue") el.classList.add("fBlue");
  else if (k === "red") el.classList.add("fRed");
  else if (k === "neutral") el.classList.add("fNeutral");
  else if (k === "mando") el.classList.add("fMando");
}

/* =========================
   CARD FACTORY + DRAG
   ========================= */
function makeCardEl(cardData, kind) {
  var el = document.createElement("div");
  el.className = "card";
  applyFactionBorderClass(el, cardData);
  el.dataset.kind = kind;
  el.dataset.cardId = String(cardData.id) + "_" + Math.random().toString(16).slice(2);
  el.dataset.face = "up";

  var face = document.createElement("div");
  face.className = "cardFace";
  face.style.backgroundImage = "url('" + (cardData.img || "") + "')";
  el.appendChild(face);

  var back = document.createElement("div");
  back.className = "cardBack";
  back.textContent = "Face Down";
  el.appendChild(back);

  if (kind === "unit") {
    el.dataset.rot = "0";
    applyRotationSize(el);
  } else {
    el.style.width = BASE_W + "px";
    el.style.height = BASE_H + "px";
    face.style.transform = "none";
  }

  el.addEventListener("contextmenu", function(e){
    e.preventDefault();
    e.stopPropagation();
    togglePreview(cardData);
  });

  attachDragHandlers(el, cardData, kind);
  return el;
}

function attachDragHandlers(el, cardData, kind) {
  var dragging = false;
  var offsetX = 0;
  var offsetY = 0;

  var pressTimer = null;
  var longPressFired = false;
  var downX = 0;
  var downY = 0;
  var movedDuringPress = false;

  var baseHadCapturedAssignment = false;
  var baseFreedAssignment = false;

  var DOUBLE_TAP_MS = 360;
  var FLIP_CONFIRM_MS = 380;

  var flipTimer = null;
  var suppressNextPointerUp = false;

  function clearFlipTimer(){ if (flipTimer) { clearTimeout(flipTimer); flipTimer = null; } }
  function clearPressTimer(){ if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }

  function startLongPress(e) {
    clearPressTimer();
    longPressFired = false;
    movedDuringPress = false;
    downX = e.clientX;
    downY = e.clientY;

    pressTimer = setTimeout(function(){
      longPressFired = true;
      showPreview(cardData);
    }, 380);
  }

  var lastTap = 0;

  el.addEventListener("pointerdown", function(e){
    if (previewOpen) return;
    if (e.button !== 0) return;

    clearFlipTimer();
    suppressNextPointerUp = false;

    var now = Date.now();
    var dt = now - lastTap;
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

    var stageRect = stage.getBoundingClientRect();
    var px = (e.clientX - stageRect.left) / camera.scale;
    var py = (e.clientY - stageRect.top) / camera.scale;

    var left = parseFloat(el.style.left || "0");
    var top = parseFloat(el.style.top || "0");
    offsetX = px - left;
    offsetY = py - top;

    el.style.zIndex = "50000";
  });

  el.addEventListener("pointermove", function(e){
    if (!dragging) return;

    var dx = e.clientX - downX;
    var dy = e.clientY - downY;
    if (Math.hypot(dx, dy) > 8) movedDuringPress = true;

    if (!longPressFired && Math.hypot(dx, dy) > 8) {
      clearPressTimer();

      if (kind === "base" && baseHadCapturedAssignment && !baseFreedAssignment) {
        clearCapturedAssignment(el);
        baseFreedAssignment = true;
      }
    }

    if (longPressFired) return;

    var stageRect = stage.getBoundingClientRect();
    var px = (e.clientX - stageRect.left) / camera.scale;
    var py = (e.clientY - stageRect.top) / camera.scale;

    el.style.left = (px - offsetX) + "px";
    el.style.top  = (py - offsetY) + "px";
  });

  el.addEventListener("pointerup", function(e){
    clearPressTimer();
    try { el.releasePointerCapture(e.pointerId); } catch (err) {}
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
      flipTimer = setTimeout(function(){
        toggleFlip(el);
        if (kind === "base") {
          if (el.dataset.capSide) {
            var idx = Number(el.dataset.capIndex || "0");
            el.style.zIndex = String(CAP_Z_BASE + idx);
          } else {
            el.style.zIndex = "12000";
          }
        } else {
          el.style.zIndex = "15000";
        }
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

  el.addEventListener("pointercancel", function(){
    dragging = false;
    clearPressTimer();
    clearFlipTimer();
    suppressNextPointerUp = false;
  });
}

/* =========================
   DEV DATA (kept)
   ========================= */
var OBIWAN = {
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

var TEST_BASE = {
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

var TEST_BLUE = {
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

var TEST_RED = {
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

var TEST_NEUTRAL2 = {
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

var TEST_MANDO2 = {
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

(function initDemoPiles(){
  function cloneCard(base, overrides){
    var id = base.id + "_" + Math.random().toString(16).slice(2);
    var out = {};
    for (var k in base) out[k] = base[k];
    for (var j in overrides) out[j] = overrides[j];
    out.id = id;
    return out;
  }

  function makeMany(prefix, count){
    var out = [];
    for (var i = 1; i <= count; i++){
      out.push(cloneCard(OBIWAN, { name: prefix + " " + i }));
    }
    return out;
  }

  piles = {
    p1_draw: makeMany("P1 Draw Card", 30),
    p2_draw: makeMany("P2 Draw Card", 30),
    p1_discard: makeMany("Discard Example", 25),
    p2_discard: makeMany("Discard Example", 25),
    p1_exile: makeMany("Exiled Example", 18),
    p2_exile: makeMany("Exiled Example", 18)
  };
})();

var DEV_SPAWN_TEST_CARDS = false;
if (DEV_SPAWN_TEST_CARDS) {
  var unitCard = makeCardEl(OBIWAN, "unit");
  unitCard.style.left = (DESIGN_W * 0.42) + "px";
  unitCard.style.top  = (DESIGN_H * 0.12) + "px";
  unitCard.style.zIndex = "15000";
  stage.appendChild(unitCard);

  var BASE_TEST_COUNT = 2;
  for (var i = 0; i < BASE_TEST_COUNT; i++) {
    var baseCard = makeCardEl(TEST_BASE, "base");
    baseCard.style.left = (DESIGN_W * (0.14 + i * 0.08)) + "px";
    baseCard.style.top  = (DESIGN_H * (0.22 + i * 0.02)) + "px";
    baseCard.style.zIndex = "12000";
    stage.appendChild(baseCard);
  }
}

factionTestBtn.addEventListener("click", function(e){
  e.preventDefault();
  var cards = [TEST_BLUE, TEST_RED, TEST_NEUTRAL2, TEST_MANDO2];
  var startX = DESIGN_W * 0.34;
  var startY = DESIGN_H * 0.10;
  var stepX = CARD_W + 18;

  for (var i = 0; i < cards.length; i++) {
    var el = makeCardEl(cards[i], "unit");
    el.style.left = (startX + i * stepX) + "px";
    el.style.top  = startY + "px";
    el.style.zIndex = "15000";
    stage.appendChild(el);
  }
});

/* =========================
   START MENU (ROBUST)
   - Change: menu clicks auto-unlock audio so click sound is reliable
   ========================= */
function initStartMenu() {
  function qsGet(key){
    try { return new URLSearchParams(location.search).get(key); } catch (e) { return null; }
  }
  function qsSet(url, key, val){
    var u = new URL(url);
    if (val === undefined || val === null || val === "") u.searchParams.delete(key);
    else u.searchParams.set(key, String(val));
    return u.toString();
  }
  function stripJoinQuery(){
    try {
      var u = new URL(location.href);
      ["join","host","hostFaction","mode","mando"].forEach(function(k){ u.searchParams.delete(k); });
      history.replaceState(null, "", u.toString());
    } catch (e) {}
  }
  function oppositeFaction(f){ return (String(f).toLowerCase() === "blue") ? "red" : "blue"; }

  function getHostName(){
    var el = document.getElementById("hostNameInput");
    var v = (el && el.value) ? el.value.trim() : "";
    return v || "Player";
  }

  // Invite modal
  var inviteMenu = document.createElement("div");
  inviteMenu.id = "inviteMenu";
  inviteMenu.innerHTML = `
    <div class="invite-window">
      <div class="invite-topline" id="inviteTopLine">YOU HAVE BEEN INVITED TO PLAY</div>
      <h1 class="invite-title">
        STAR WARS:
        <span class="line2">THE CARD GAME</span>
      </h1>
      <div class="invite-hostedby" id="inviteHostedBy">HOSTED BY: HOST PLAYER NAME</div>

      <div class="invite-panel">
        <div class="invite-name-row">
          <div class="invite-name-label">YOUR NAME</div>
          <input id="guestNameInput" class="invite-name-input" type="text" placeholder="Guest" maxlength="24" />
        </div>

        <div class="invite-letter" id="inviteLetter"></div>

        <div class="invite-actions">
          <button class="inviteBtn" id="inviteAcceptBtn" type="button">Accept</button>
          <button class="inviteBtn" id="inviteDeclineBtn" type="button">Decline</button>
        </div>

        <div class="invite-footer" id="inviteFooter"></div>
      </div>
    </div>
  `;
  document.body.appendChild(inviteMenu);

  function sideNamesFor(mode, faction){
    mode = String(mode||"").toLowerCase();
    faction = String(faction||"").toLowerCase();

    if (mode === "original trilogy") return (faction === "blue") ? "EMPIRE" : "REBELS";
    if (mode === "clone wars") return (faction === "blue") ? "SEPARATISTS" : "REPUBLIC";
    if (mode === "mixed") return (faction === "blue") ? "EMPIRE AND SEPARATISTS" : "REBELS AND REPUBLIC";
    return "";
  }

  function showInviteModal(cfg){
    var hostedBy = inviteMenu.querySelector("#inviteHostedBy");
    var letter   = inviteMenu.querySelector("#inviteLetter");
    var footer   = inviteMenu.querySelector("#inviteFooter");

    var modeKey = String(cfg.mode || "").toLowerCase();
    var isRandom = (modeKey === "random");

    hostedBy.textContent = "HOSTED BY: " + String(cfg.host || "Player").toUpperCase();

    var letterText = "";
    if (isRandom){
      letterText = "HOST HAS SELECTED: RANDOM........ WHAT SIDE WILL YOU PLAY?";
    } else {
      var hostF = String(cfg.hostFaction || "").toLowerCase();
      var hostFtxt = hostF ? hostF.toUpperCase() : "NOT LOCKED YET";
      var youPlayAs = hostF ? sideNamesFor(modeKey, oppositeFaction(hostF)) : "WAITING ON HOST";
      letterText = "HOST HAS SELECTED: (" + hostFtxt + ") " + String(modeKey).toUpperCase() + "........\n........YOU WILL PLAY AS " + youPlayAs;
    }

    footer.textContent = cfg.mandoNeutral ? "MANDALORIANS WILL BE PLAYED AS NEUTRALS" : "";
    letter.textContent = letterText;

    inviteMenu.style.display = "flex";
  }

  function hideInviteModal(){ inviteMenu.style.display = "none"; }

  function readJoinConfig(){
    var join = (qsGet("join") === "1");
    if (!join) return null;

    var mode = (qsGet("mode") || "").toLowerCase();
    var mandoNeutral = (qsGet("mando") === "1");
    var host = (qsGet("host") || "Player").trim();
    var hostFaction = (qsGet("hostFaction") || "").toLowerCase();

    return { join:true, host:host, mode:mode, mandoNeutral:!!mandoNeutral, hostFaction: hostFaction || null };
  }

  function applyGuestConfigAndStart(cfg){
    var guestFaction = oppositeFaction(cfg.hostFaction);
    var guestNameEl = document.getElementById("guestNameInput");
    var guestName = (guestNameEl && guestNameEl.value ? guestNameEl.value.trim() : "") || "Guest";

    window.__gameConfig = {
      role: "guest",
      guestName: guestName,
      hostName: cfg.host,
      mode: cfg.mode || "original trilogy",
      mandoNeutral: !!cfg.mandoNeutral,
      p1Faction: cfg.hostFaction,
      p2Faction: guestFaction,
      youAre: "p2"
    };

    window.__menuSelection = window.__menuSelection || {};
    window.__menuSelection.hostName = window.__gameConfig.hostName || "Player";
    window.__menuSelection.guestName = guestName;
    window.__menuSelection.mode = window.__gameConfig.mode;
    window.__menuSelection.mandoNeutral = window.__gameConfig.mandoNeutral;
    window.__menuSelection.faction = guestFaction;

    try { setTrayPlayerColor(guestFaction); } catch (e) {}

    try { var sm = document.getElementById("startMenu"); if (sm) sm.style.display = "none"; } catch (e) {}
    hideInviteModal();

    try { initBoard(); } catch (err) { console.error("initBoard() failed:", err); }
    console.log("Joined as guest (P2):", window.__gameConfig);
  }

  // Wire invite modal buttons
  (function(){
    var acceptBtn = inviteMenu.querySelector("#inviteAcceptBtn");
    var declineBtn = inviteMenu.querySelector("#inviteDeclineBtn");

    function markSelected(btn){
      acceptBtn.classList.remove("selected");
      declineBtn.classList.remove("selected");
      btn.classList.add("selected");
    }

    acceptBtn.addEventListener("click", function(){
      audioInitOnce().then(function(){
        playUiClick();
        fadeMenuMusicTo(0, 200);
        setTimeout(function(){ stopMenuMusic(); }, 220);

        markSelected(acceptBtn);

        var cfg = readJoinConfig();
        if (!cfg || !cfg.hostFaction){
          hideInviteModal();
          return;
        }
        applyGuestConfigAndStart(cfg);
      });
    });

    declineBtn.addEventListener("click", function(){
      audioInitOnce().then(function(){
        playUiClick();
        markSelected(declineBtn);

        stripJoinQuery();
        hideInviteModal();

        try {
          var m = document.getElementById("startMenu");
          if (m) m.style.display = "flex";
        } catch (e) {}
      });
    });

    inviteMenu.addEventListener("pointerdown", function(e){
      if (e.target === inviteMenu){
        audioInitOnce().then(function(){ playUiClick(); });
        stripJoinQuery();
        hideInviteModal();
        try {
          var m = document.getElementById("startMenu");
          if (m) m.style.display = "flex";
        } catch (err) {}
      }
    });
  })();

  var menu = document.getElementById("startMenu");
  if (!menu) return false;

  var allBtns = Array.from(menu.querySelectorAll(".menu-btn"));

  // Click sound on menu buttons (now also unlocks audio)
  for (var i = 0; i < allBtns.length; i++) {
    (function(b){
      b.addEventListener("click", function(){
        audioInitOnce().then(function(){ playUiClick(); });
      });
    })(allBtns[i]);
  }

  function txt(el){ return (el.textContent || "").trim().toLowerCase(); }

  var inviteBtn = null;
  var factionBtns = [];
  var modeBtns = [];

  for (var j = 0; j < allBtns.length; j++) {
    var b = allBtns[j];
    var t = txt(b);

    if (t === "blue") { b.classList.add("faction","blue"); factionBtns.push(b); }
    else if (t === "red") { b.classList.add("faction","red"); factionBtns.push(b); }
    else if (t === "original trilogy" || t === "clone wars" || t === "mixed" || t === "random") {
      b.classList.add("mode");
      modeBtns.push(b);
    } else if (t === "invite a friend") {
      inviteBtn = b;
    }
  }

  var playBtn = menu.querySelector("#playBtn") || menu.querySelector(".menu-btn.play");
  var cancelBtn = menu.querySelector("#cancelBtn") || menu.querySelector(".menu-btn.cancel");
  var mandoToggle = menu.querySelector("#mandoToggle");

  if (!modeBtns.length || !playBtn) {
    console.warn("StartMenu found but missing mode buttons or Play button. Not starting board.");
    return true;
  }

  function clearSelected(btns){ btns.forEach(function(b){ b.classList.remove("selected"); }); }
  function selectOne(btns, btn){ clearSelected(btns); btn.classList.add("selected"); }
  function getSelectedFaction(){
    var b = factionBtns.find(function(x){ return x.classList.contains("selected"); });
    return b ? txt(b) : "";
  }

  window.__menuSelection = window.__menuSelection || { faction:"", mode:"", mandoNeutral:false };

  function hintFor(modeKey, factionKey){
    if (modeKey === "random") return "WHERE WILL YOUR\nALLEGIANCE LIE?";
    if (!factionKey){
      if (modeKey === "original trilogy") return "EMPIRE+REBEL";
      if (modeKey === "clone wars") return "SEPERATIST+REPUBLIC";
      if (modeKey === "mixed") return "EMPIRE+REBEL\nSEPERATIST+REPUBLIC";
      return "";
    }
    if (modeKey === "original trilogy") return (factionKey === "blue") ? "EMPIRE" : "REBEL";
    if (modeKey === "clone wars") return (factionKey === "blue") ? "SEPERATIST" : "REPUBLIC";
    if (modeKey === "mixed") return (factionKey === "blue") ? "EMPIRE+SEPERATIST" : "REBEL+REPUBLIC";
    return "";
  }

  function ensureModeHints(){
    modeBtns.forEach(function(btn){
      var hint = btn.nextElementSibling;
      var isHint = hint && hint.classList && hint.classList.contains("menu-hint");
      if (!isHint){
        hint = document.createElement("div");
        hint.className = "menu-hint";
        hint.style.whiteSpace = "pre-line";
        btn.insertAdjacentElement("afterend", hint);
      }
    });
  }

  function updateModeHints(){
    var factionKey = getSelectedFaction();
    modeBtns.forEach(function(btn){
      var key = txt(btn);
      var hint = btn.nextElementSibling;
      if (!hint || !hint.classList || !hint.classList.contains("menu-hint")) return;
      hint.textContent = hintFor(key, factionKey);
    });

    var randomBtn = modeBtns.find(function(b){ return txt(b) === "random"; });
    if (randomBtn){
      var randomHint = randomBtn.nextElementSibling;
      if (randomHint && randomHint.classList.contains("menu-hint")){
        randomHint.classList.toggle("allegiance-shift", randomBtn.classList.contains("selected"));
      }
    }
  }

  clearSelected(factionBtns);
  clearSelected(modeBtns);
  ensureModeHints();
  updateModeHints();

  if (mandoToggle){
    window.__menuSelection.mandoNeutral = !!mandoToggle.checked;
    mandoToggle.addEventListener("change", function(){
      window.__menuSelection.mandoNeutral = !!mandoToggle.checked;
    });
  }

  factionBtns.forEach(function(btn){
    btn.addEventListener("click", function(){
      selectOne(factionBtns, btn);
      window.__menuSelection.faction = txt(btn);
      updateModeHints();
    });
  });

  modeBtns.forEach(function(btn){
    btn.addEventListener("click", function(){
      selectOne(modeBtns, btn);
      var key = txt(btn);
      window.__menuSelection.mode = key;

      if (key === "random"){
        clearSelected(factionBtns);
        window.__menuSelection.faction = "";
      }
      updateModeHints();
    });
  });

  if (inviteBtn){
    inviteBtn.addEventListener("click", function(){
      stopMenuMusic();

      var hostName = getHostName();
      var modeKey = (window.__menuSelection && window.__menuSelection.mode) ? window.__menuSelection.mode : "";
      var mando = !!(window.__menuSelection && window.__menuSelection.mandoNeutral);
      var faction = (window.__menuSelection && window.__menuSelection.faction) ? window.__menuSelection.faction : "";

      if (!modeKey){
        alert("Pick a Mode first (Original Trilogy / Clone Wars / Mixed / Random).");
        return;
      }
      if (!faction && modeKey !== "random"){
        alert("Pick Blue or Red first (or choose Random mode).");
        return;
      }

      var url = location.href.split("#")[0];
      url = qsSet(url, "join", "1");
      url = qsSet(url, "host", hostName);
      url = qsSet(url, "mode", modeKey);
      url = qsSet(url, "mando", mando ? "1" : "0");
      url = qsSet(url, "hostFaction", faction || "");

      var isRandom = (modeKey === "random");
      var hostFactionText = isRandom ? "WHICH SIDE WILL YOU SERVE?" : faction.toUpperCase();
      var guestFactionText = isRandom ? "WHICH SIDE WILL YOU SERVE?" : oppositeFaction(faction).toUpperCase();
      var mandoText = mando ? "YES (as Neutral)" : "NO";

      var msg =
        "INVITE FROM: " + hostName + "\n" +
        "MODE: " + String(modeKey).toUpperCase() + "\n" +
        "HOST FACTION: " + hostFactionText + "\n" +
        "YOU WILL BE: " + guestFactionText + "\n" +
        "MANDALORIANS: " + mandoText;

      if (navigator.share){
        navigator.share({ title:"Star Wars VTT Invite", text: msg, url: url }).catch(function(){});
      } else {
        navigator.clipboard.writeText(msg + "\n\n" + url).then(function(){
          alert("Invite copied!\n\n" + msg + "\n\n" + url);
        }).catch(function(){
          prompt("Copy this invite:", msg + "\n\n" + url);
        });
      }
    });
  }

  function applyMenuSelection(sel){
    var out = {};
    for (var k in sel) out[k] = sel[k];

    if (out.mode === "random") out.faction = (Math.random() < 0.5) ? "blue" : "red";
    if (!out.faction) out.faction = "blue";

    try { setTrayPlayerColor(out.faction); } catch (e) {}
    window.__appliedSelection = out;
    return out;
  }

  playBtn.addEventListener("click", function(e){
    e.preventDefault();
    audioInitOnce().then(function(){
      try { AudioMix.ctx.resume(); } catch (err) {}
      fadeMenuMusicTo(0, 350);
      setTimeout(function(){ stopMenuMusic(); }, 360);

      var applied = applyMenuSelection(window.__menuSelection || {});
      menu.style.display = "none";
      try { initBoard(); } catch (err2) { console.error("initBoard() failed:", err2); }
      console.log("Menu applied:", applied);
    });
  });

  if (cancelBtn){
    cancelBtn.addEventListener("click", function(e){
      e.preventDefault();
      menu.style.display = "none";
    });
  }

  // Join link → show invite modal
  var joinCfg = readJoinConfig();
  if (joinCfg && joinCfg.join) {
    showInviteModal(joinCfg);
    try { menu.style.display = "none"; } catch (e) {}
  }

  return true;
}

/* =========================
   BOOT (failsafe)
   ========================= */
try {
  try { document.body.classList.add("menuReady"); } catch (e) {}
  var ok = initStartMenu();
  if (!ok) initBoard();
} catch (err) {
  try { console.error("BOOT crashed:", err); } catch (e) {}
  try {
    if (window.__earlyCrash) {
      window.__earlyCrash("BOOT crashed", (err && (err.stack || err.message)) ? (err.stack || err.message) : String(err));
    }
  } catch (e2) {}
}
