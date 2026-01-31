console.log("Baseline locked");

// Own the page
document.body.style.margin = "0";
document.body.style.background = "#0b0d12";
document.body.style.height = "100vh";
document.body.style.display = "flex";
document.body.style.alignItems = "center";
document.body.style.justifyContent = "center";
document.body.style.color = "white";

// App container
const app = document.getElementById("app");
app.textContent = ""; // removes "Starting..." immediately

// Row container
const row = document.createElement("div");
row.style.display = "flex";
row.style.gap = "24px";

// Card factory
function makeCard(label) {
  const card = document.createElement("div");
  card.textContent = label;
  card.style.width = "250px";
  card.style.height = "350px";
  card.style.border = "2px solid white";
  card.style.display = "flex";
  card.style.alignItems = "center";
  card.style.justifyContent = "center";
  card.style.fontSize = "1.5rem";
  return card;
}

// Two cards
row.appendChild(makeCard("CARD A"));
row.appendChild(makeCard("CARD B"));

app.appendChild(row);
