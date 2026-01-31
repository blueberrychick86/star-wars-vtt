async function main() {
  const statusEl = document.getElementById("status");
  const detailsEl = document.getElementById("details");

  try {
    statusEl.textContent = "Loading cards/index.json...";

    const res = await fetch("./cards/index.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    const data = await res.json();

    const setKeys = Object.keys(data.sets || {});
    const cards = Array.isArray(data.cards) ? data.cards : [];

    statusEl.textContent = "✅ Card index loaded!";
    detailsEl.innerHTML = `
      <p><strong>Sets:</strong> ${setKeys.join(", ") || "(none)"}</p>
      <p><strong>Cards in index:</strong> ${cards.length}</p>
      <hr style="border:0;border-top:1px solid #2a2f3a;margin:14px 0;" />
      <div id="cardList"></div>
    `;

    const listEl = document.getElementById("cardList");

    if (cards.length === 0) {
      listEl.innerHTML = "<p>(No cards yet)</p>";
      return;
    }

    const rows = cards.map((c) => {
      const safeName = escapeHtml(c.name || c.id || "(unnamed)");
      const safeMeta = escapeHtml(`${c.set || ""} • ${c.color || ""} • ${c.faction || ""}`);
      const safeFront = escapeHtml(c.front || "");

      return `
        <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid #2a2f3a;">
          <div style="width:80px;height:112px;border:1px dashed #2a2f3a;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#9aa4b2;font-size:12px;flex:0 0 auto;">
            img
          </div>
          <div>
            <div style="font-weight:700;">${safeName}</div>
            <div style="color:#9aa4b2;font-size:13px;margin-top:2px;">${safeMeta}</div>
            <div style="color:#9aa4b2;font-size:12px;margin-top:6px;">front: <code>${safeFront}</code></div>
          </div>
        </div>
      `;
    }).join("");

    listEl.innerHTML = rows;

  } catch (err) {
    statusEl.textContent = "❌ Failed to load card index";
    detailsEl.innerHTML = `<pre style="white-space:pre-wrap">${String(err)}</pre>`;
    console.error(err);
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

main();
