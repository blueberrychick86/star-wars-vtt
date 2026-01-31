async function main() {
  const statusEl = document.getElementById("status");
  const detailsEl = document.getElementById("details");

  try {
    statusEl.textContent = "Loading cards/index.json...";

    const res = await fetch("./cards/index.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    const data = await res.json();

    const set
