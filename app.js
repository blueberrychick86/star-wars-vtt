console.log("JS owns the screen");

// hard reset page styling
document.body.style.margin = "0";
document.body.style.background = "#0b0d12";
document.body.style.display = "flex";
document.body.style.alignItems = "center";
document.body.style.justifyContent = "center";
document.body.style.height = "100vh";
document.body.style.color = "white";

const app = document.getElementById("app");

// card
const card = document.createElement("div");
card.textContent = "CARD";
card.style.width = "250px";
card.style.height = "350px";
card.style.border = "2px solid white";
card.style.display = "flex";
card.style.alignItems = "center";
card.style.justifyContent = "center";
card.style.fontSize = "2rem";

app.appendChild(card);
