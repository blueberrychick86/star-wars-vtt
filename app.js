console.log("Cards + Slots v1");

// Own the page (JS-only styling)
document.body.style.margin = "0";
document.body.style.background = "#0b0d12";
document.body.style.height = "100vh";
document.body.style.display = "flex";
document.body.style.alignItems = "center";
document.body.style.justifyContent = "center";
document.body.style.color = "white";
document.body.style.fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif";

// App container
const app = document.getElementById("app");
app.textContent = "";

// Layout wrapper (stack rows)
const wrap = document.createElement("div");
wrap.style.display = "flex";
wrap.style.flexDirection = "column";
wrap.style.gap = "24px";
wrap.style.alignItems = "center";
app.appendChild(wrap);

// Row containers
function makeRow() {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "24px";
  row.style.alignItems = "center";
  return row;
}

const topRow = makeRow();
const bottomRow = makeRow();
wrap.appendChild(topRow);
wrap.appendChild(bottomRow);

// Card factory
function makeCard(label) {
  const card = document.createElement("div");
  card.textContent = label;
  card.style.width = "250px";
  card.style.height = "350px";
  card.style.border = "2px solid white";
  card.style.borderRadius = "12px";
  card.style.display = "flex";
  card.style.alignItems = "center";
  card.style.justifyContent = "center";
  card.style.fontSize = "1.5rem";
  card.style.userSelect = "none";
  return card;
}

// Slot factory
function makeSlot(label) {
  const slot = document.createElement("div");
  slot.textContent = label;
  slot.style.width = "250px";
  slot.style.height = "350px";
  slot.style.border = "2px dashed #777";
  slot.style.borderRadius = "12px";
  slot.style.display = "flex";
  slot.style.alignItems = "center";
  slot.style.justifyContent = "center";
  slot.style.fontSize = "1.1rem";
  slot.style.color = "#777";
  slot.style.userSelect = "none";
  return slot;
}

// Build UI
topRow.appendChild(makeCard("CARD A"));
topRow.appendChild(makeCard("CARD B"));

bottomRow.appendChild(makeSlot("SLOT A"));
bottomRow.appendChild(makeSlot("SLOT B"));
