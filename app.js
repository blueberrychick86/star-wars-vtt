// app.js — baseline proof-of-life
console.log("JS running ✅");

window.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("status");
  if (el) el.textContent = "JS running ✅";
});
