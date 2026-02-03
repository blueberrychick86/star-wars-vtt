console.log("VTT: CLEAN BASELINE + START MENU v1");

// ---------- BASE PAGE ----------
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.height = "100vh";
document.body.style.background = "#000";
document.body.style.overflow = "hidden";
document.body.style.touchAction = "none";
document.body.style.fontFamily = "Arial, sans-serif";

const app = document.getElementById("app");
app.innerHTML = "";

// ---------- CONSTANTS ----------
const CARD_W = 86;
const CARD_H = Math.round((CARD_W * 3.5) / 2.5);
const BASE_W = CARD_H;
const BASE_H = CARD_W;

const GAP = 18;
const BIG_GAP = 28;

const FORCE_SLOTS = 7;
const FORCE_NEUTRAL_INDEX = 3;
const FORCE_MARKER_SIZE = 28;

const TOKEN_SIZE = 18;
const TOKEN_BANK_SIZE = 44;
const TOKEN_BIN_GAP = 10;

let DESIGN_W = 1;
let DESIGN_H = 1;

// ---------- GAME CONFIG ----------
const gameConfig = {
  setMode: "mixed",
  blueChoice: "all_blue",
  redChoice: "all_red",
  mandoNeutrals: true
};

function configSummaryLine() {
  return `BLUE: ${gameConfig.blueChoice} | RED: ${gameConfig.redChoice} | Mando: ${gameConfig.mandoNeutrals ? "ON" : "OFF"} | Set: ${gameConfig.setMode}`;
}

// ---------- CSS ----------
const style = document.createElement("style");
style.textContent = `
#table { position:fixed; inset:0; background:#000; overflow:hidden; }
#stage { position:absolute; transform-origin:0 0; }

#hud {
  position:fixed;
  top:10px;
  left:10px;
  display:flex;
  gap:6px;
  z-index:100000;
}

.hudBtn {
  font-size:11px;
  padding:6px 8px;
  border-radius:8px;
  background:rgba(255,255,255,0.1);
  color:#fff;
  border:1px solid rgba(255,255,255,0.25);
  cursor:pointer;
}

.hudReadout {
  padding:6px 8px;
  font-size:11px;
  border-radius:8px;
  background:rgba(255,255,255,0.08);
  border:1px solid rgba(255,255,255,0.18);
  color:#fff;
}

.zone {
  position:absolute;
  border:2px solid rgba(255,255,255,0.35);
  border-radius:10px;
}

.tokenBank {
  position:absolute;
  display:flex;
  gap:${TOKEN_BIN_GAP}px;
}

.tokenBin {
  width:${TOKEN_BANK_SIZE}px;
  height:${TOKEN_BANK_SIZE}px;
  cursor:pointer;
}

.tokenSource {
  width:${TOKEN_BANK_SIZE}px;
  height:${TOKEN_BANK_SIZE}px;
  border-radius:8px;
  box-shadow:0 8px 18px rgba(0,0,0,0.6);
}

.token {
  position:absolute;
  width:${TOKEN_SIZE}px;
  height:${TOKEN_SIZE}px;
  border-radius:4px;
  box-shadow:0 6px 14px rgba(0,0,0,0.6);
  cursor:grab;
}

.red { background:linear-gradient(145deg,#ff7777,#a00000); }
.blue { background:linear-gradient(145deg,#8fd1ff,#1450aa); }
.gold { background:linear-gradient(145deg,#ffeaa0,#9a6a00); }

.startMenuOverlay {
  position:fixed;
  inset:0;
  background:rgba(0,0,0,0.75);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:200000;
}

.startMenu {
  width:320px;
  background:#111;
  border-radius:16px;
  padding:16px;
  color:#fff;
  border:1px solid rgba(255,255,255,0.2);
}

.startMenu h2 {
  margin-top:0;
}

.startMenu button {
  margin-top:10px;
  width:100%;
  padding:10px;
  border-radius:10px;
  border:none;
  background:#3a7bd5;
  color:#fff;
  font-weight:700;
  cursor:pointer;
}
`;
document.head.appendChild(style);

// ---------- TABLE ----------
const table = document.createElement("div");
table.id = "table";
app.appendChild(table);

const stage = document.createElement("div");
stage.id = "stage";
table.appendChild(stage);

// ---------- HUD ----------
const hud = document.createElement("div");
hud.id = "hud";
table.appendChild(hud);

function hudBtn(label) {
  const b = document.createElement("button");
  b.className = "hudBtn";
  b.textContent = label;
  hud.appendChild(b);
  return b;
}

const fitBtn = hudBtn("FIT");
const menuBtn = hudBtn("MENU");

const hudReadout = document.createElement("div");
hudReadout.className = "hudReadout";
hudReadout.textContent = "Not started";
hud.appendChild(hudReadout);

// ---------- CAMERA ----------
const camera = { scale:1, x:0, y:0 };

function applyCamera() {
  stage.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
}

function fitToScreen() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.scale = Math.min(w / DESIGN_W, h / DESIGN_H) * 0.95;
  camera.x = (w - DESIGN_W * camera.scale) / 2;
  camera.y = (h - DESIGN_H * camera.scale) / 2;
  applyCamera();
}

fitBtn.onclick = fitToScreen;

// ---------- LAYOUT ----------
function buildLayout() {
  stage.innerHTML = "";

  const pilesX = 120;
  const pilesY1 = 120;
  const pilesY2 = 520;

  const bankW = TOKEN_BANK_SIZE * 3 + TOKEN_BIN_GAP * 2;
  const pilesW = CARD_W * 2 + GAP;
  const bankX = pilesX + pilesW / 2 - bankW / 2;

  function zone(x,y,w,h) {
    const z = document.createElement("div");
    z.className = "zone";
    z.style.left = x+"px";
    z.style.top = y+"px";
    z.style.width = w+"px";
    z.style.height = h+"px";
    stage.appendChild(z);
  }

  zone(pilesX, pilesY1, CARD_W, CARD_H);
  zone(pilesX + CARD_W + GAP, pilesY1, CARD_W, CARD_H);
  zone(pilesX, pilesY2, CARD_W, CARD_H);
  zone(pilesX + CARD_W + GAP, pilesY2, CARD_W, CARD_H);

  buildTokenBank("p2", bankX, pilesY1 - TOKEN_BANK_SIZE - 14);
  buildTokenBank("p1", bankX, pilesY2 + CARD_H + 14);

  DESIGN_W = 1200;
  DESIGN_H = 900;
  fitToScreen();
}

// ---------- TOKENS ----------
function buildTokenBank(owner, x, y) {
  const bank = document.createElement("div");
  bank.className = "tokenBank";
  bank.style.left = x+"px";
  bank.style.top = y+"px";

  [["red","red"],["blue","blue"],["gold","gold"]].forEach(([cls,type])=>{
    const bin = document.createElement("div");
    bin.className = "tokenBin";
    const src = document.createElement("div");
    src.className = `tokenSource ${cls}`;
    bin.appendChild(src);

    bin.onpointerdown = e => {
      const t = document.createElement("div");
      t.className = `token ${cls}`;
      t.style.left = e.clientX+"px";
      t.style.top = e.clientY+"px";
      stage.appendChild(t);
    };

    bank.appendChild(bin);
  });

  stage.appendChild(bank);
}

// ---------- START MENU ----------
function showStartMenu() {
  const overlay = document.createElement("div");
  overlay.className = "startMenuOverlay";

  const menu = document.createElement("div");
  menu.className = "startMenu";
  menu.innerHTML = `
    <h2>Start Game</h2>
    <p>Blue always goes first.</p>
    <button id="startBtn">START</button>
  `;

  overlay.appendChild(menu);
  table.appendChild(overlay);

  menu.querySelector("#startBtn").onclick = () => {
    overlay.remove();
    hudReadout.textContent = configSummaryLine();
  };
}

menuBtn.onclick = showStartMenu;

// ---------- INIT ----------
buildLayout();
showStartMenu();
