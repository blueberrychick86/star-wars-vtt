async function main() {
  const statusEl = document.getElementById("status");
  const detailsEl = document.getElementById("details");

  try {
    statusEl.textContent = "Loading cards/index.json...";

    const res = await fetch("./cards/index.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    const data = await res.json();

    const setKeys = Object.keys(data.sets || {});
    const cardCount = Array.isArray(data.cards) ? data.cards.length : 0;

    statusEl.textContent = "✅ Card index loaded!";
    detailsEl.innerHTML = `
      <p><strong>Sets:</strong> ${setKeys.join(", ") || "(none)"}</p>
      <p><strong>Cards in index:</strong> ${cardCount}</p>
      <p><strong>Next:</strong> we’ll add a few test cards and show them in a simple list.</p>
    `;
  } catch (err) {
    statusEl.textContent = "❌ Failed to load card index";
    detailsEl.innerHTML = `<pre style="white-space:pre-wrap">${String(err)}</pre>`;
    console.error(err);
  }
}

main();
