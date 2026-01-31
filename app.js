console.log("JS running ✅");

const app = document.getElementById("app");
app.innerHTML = "";

// create a fake card
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
