console.log("JS running — baseline locked");

const app = document.getElementById("app");
app.innerHTML = "";

const card = document.createElement("div");
card.textContent = "VERTICAL CARD";

// Star Wars card size: 2.5in × 3.5in → scaled
card.style.width = "250px";
card.style.height = "350px";

card.style.border = "2px solid white";
card.style.display = "flex";
card.style.alignItems = "center";
card.style.justifyContent = "center";
card.style.fontSize = "1.5rem";
card.style.userSelect = "none";

app.appendChild(card);
