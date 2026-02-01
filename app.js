(function () {
  // ======= HARD DEBUG BOOTSTRAP (shows errors on screen) =======
  function showFatal(err) {
    try {
      document.body.innerHTML = "";
      document.body.style.margin = "0";
      document.body.style.background = "#111";
      document.body.style.color = "#fff";
      document.body.style.fontFamily = "Arial, sans-serif";
      document.body.style.padding = "16px";

      const h = document.createElement("div");
      h.style.fontSize = "18px";
      h.style.fontWeight = "900";
      h.textContent = "VTT crashed — error shown below:";
      document.body.appendChild(h);

      const pre = document.createElement("pre");
      pre.style.whiteSpace = "pre-wrap";
      pre.style.wordBreak = "break-word";
      pre.style.marginTop = "12px";
      pre.style.padding = "12px";
      pre.style.borderRadius = "12px";
      pre.style.background = "rgba(255,255,255,0.06)";
      pre.style.border = "1px solid rgba(255,255,255,0.12)";
      pre.textContent =
        (err && err.stack) ? err.stack :
        (err && err.message) ? err.message :
        String(err);
      document.body.appendChild(pre);

      const tip = document.createElement("div");
      tip.style.marginTop = "12px";
      tip.style.opacity = "0.9";
      tip.textContent =
        "If you can, also open DevTools Console and copy the red error line.";
      document.body.appendChild(tip);
    } catch (e) {
      // last resort
      alert("VTT crashed: " + (err && err.message ? err.message : String(err)));
    }
  }

  function showRunningBadge() {
    const b = document.createElement("div");
    b.textContent = "JS is running (boot ok)";
    b.style.position = "fixed";
    b.style.left = "12px";
    b.style.bottom = "12px";
    b.style.zIndex = "999999";
    b.style.padding = "10px 12px";
    b.style.borderRadius = "12px";
    b.style.background = "rgba(255,255,255,0.10)";
    b.style.border = "1px solid rgba(255,255,255,0.20)";
    b.style.color = "#fff";
    b.style.fontWeight = "900";
    b.style.fontFamily = "Arial, sans-serif";
    b.style.pointerEvents = "none";
    document.body.appendChild(b);
  }

  function boot() {
    try {
      console.log("VTT: PATCH2 rotate(90-cycle) + flip(single-tap confirmed) + piles swap/mirror + tray right-drawer vertical");

      // ---------- base page ----------
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.body.style.height = "100vh";
      document.body.style.background = "#000";
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.body.style.fontFamily = "Arial, sans-serif";

      // ✅ ensure app exists
      let app = document.getElementById("app");
      if (!app) {
        app = document.createElement("div");
        app.id = "app";
        document.body.appendChild(app);
      }
      app.innerHTML = "";

      // ---------- CSS ----------
      const style = document.createElement("style");
      style.textContent = `
        #table { position: fixed; inset: 0; background: #000; overflow: hidden; touch-action: none; }
        #hud { position: fixed; left: 12px; top: 12px; z-index: 100000; display:flex; gap:8px; pointer-events:auto; }
        .hudBtn { background: rgba(255,255,255,0.12); color:#fff; border:1px solid rgba(255,255,255,0.25);
          border-radius:10px; padding:10px 12px; font-weight:700; letter-spacing:0.5px;
          user-select:none; touch-action:manipulation; cursor:pointer; }

        #stage { position:absolute; left:0; top:0; transform-origin:0 0; will-change:transform; }

        .zone { position:absolute; border:2px solid rgba(255,255,255,0.35); border-radius:10px; box-sizing:border-box; background:transparent; }

        .card { position:absolute; border:2px solid rgba(255,255,255,0.85); border-radius:10px; background:#111;
          box-sizing:border-box; user-select:none; touch-action:none; cursor:grab; overflow:hidden; }

        .cardFace { position:absolute; inset:0; background-size:cover; background-position:center; will-change:transform; }

        .cardBack {
          position:absolute; inset:0;
          background: repeating-linear-gradient(45deg, rgba(255,255,255,0.10), rgba(255,255,255,0.10) 8px, rgba(0,0,0,0.25) 8px, rgba(0,0,0,0.25) 16px);
          display:none; align-items:center; justify-content:center;
          color: rgba(255,255,255,0.92);
          font-weight: 900;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          text-shadow: 0 2px 8px rgba(0,0,0,0.7);
        }
        .card[data-face='down'] .cardBack { display:flex; }
        .card[data-face='down'] .cardFace { filter: brightness(0.35); }

        .forceSlot { position:absolute; border-radius:10px; box-sizing:border-box; border:1px dashed rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.02); pointer-events:none; }
        .forceSlot.neutral { border:1px dashed rgba(255,255,255,0.35); background: rgba(255,255,255,0.06); }
        .forceMarker { position:absolute; width:28px; height:28px; border-radius:999px; border:2px solid rgba(255,255,255,0.9);
          background: rgba(120,180,255,0.22); box-shadow:0 8px 20px rgba(0,0,0,0.6); box-sizing:border-box; z-index:99999;
          touch-action:none; cursor:grab; }

        .capSlot { position:absolute; border-radius:10px; box-sizing:border-box; border:1px dashed rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.01); pointer-events:none; }

        #previewBackdrop { position:fixed; inset:0; background: rgba(0,0,0,0.62); z-index:200000; display:none;
          align-items:center; justify-content:center; padding:12px; touch-action:none; }

        #previewCard { width:min(96vw, 520px); max-height:92vh; border-radius:16px; border:1px solid rgba(255,255,255,0.22);
          background: rgba(15,15,18,0.98); box-shadow:0 12px 40px rgba(0,0,0,0.7); overflow:hidden; color:#fff;
          display:flex; flex-direction:column; }

        #previewHeader { display:flex; align-items:center; justify-content:space-between; padding:10px 12px;
          border-bottom:1px solid rgba(255,255,255,0.10); }

        #previewHeaderLeft { display:flex; flex-direction:column; gap:2px; }
        #previewTitle { font-size:18px; font-weight:900; margin:0; line-height:1.1; }
        #previewSub { opacity:0.9; font-size:13px; margin:0; }

        #closePreviewBtn { border:1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.08); color:#fff;
          border-radius:12px; padding:8px 10px; font-weight:900; font-size:14px; user-select:none; touch-action:manipulation;
          cursor:pointer; }

        #previewScroll { overflow:auto; -webkit-overflow-scrolling:touch; padding:12px; }
        #previewTop { display:grid; grid-template-columns:110px 1fr; gap:12px; align-items:start; }
        #previewImg { width:110px; aspect-ratio:2.5 / 3.5; border-radius:10px; border:1px solid rgba(255,255,255,0.18);
          background:#000; background-size:cover; background-position:center; }
        .pillRow { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
        .pill { font-size:12px; padding:6px 10px; border-radius:999px; border:1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.06); white-space:nowrap; }
        .sectionLabel { font-size:12px; opacity:0.8; margin:12px 0 6px 0; letter-spacing:0.3px; text-transform:uppercase; }
        .textBox { font-size:14px; line-height:1.3; padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.06); }

        #trayShell{
          position: fixed; top: 0; bottom: 0; right: 0;
          width: min(150px, 24vw);
          padding: 4px;
          box-sizing: border-box;
          z-index: 150000;
          pointer-events: none;
        }
        #tray{
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.22);
          background: rgba(14,14,16,0.92);
          backdrop-filter: blur(8px);
          box-shadow: -10px 0 26px rgba(0,0,0,0.55);
          overflow: hidden;
          pointer-events: auto;
        }

        #trayHeaderBar{
          display:flex; align-items:center; justify-content:space-between;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.10);
        }
        #trayTitle{
          color:#fff;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          font-size: 12px;
          user-select:none;
        }
        #trayCloseBtn{
          border:1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.08);
          color:#fff;
          border-radius: 12px;
          padding: 8px 10px;
          font-weight: 900;
          cursor:pointer;
          user-select:none;
          touch-action:manipulation;
        }

        #traySearchRow{
          display:none;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.10);
          gap: 10px;
        }
        #traySearchRow.show{ display:flex; align-items:center; }
        #traySearchInput{
          flex: 1;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 10px 12px;
          color:#fff;
          font-weight: 800;
          outline: none;
        }
        #traySearchInput::placeholder{ color: rgba(255,255,255,0.55); font-weight: 700; }

        #trayBody{
          flex: 1;
          overflow: hidden;
          padding: 4px;
        }

        #trayCarousel{
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 6px;

          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;

          touch-action: pan-y;
          padding-right: 2px;
          padding-bottom: 20px;
        }

        .trayTile{
          flex: 0 0 auto;
          width: 100%;
          max-width: 84px;
          aspect-ratio: 2.5 / 3.5;
          margin: 0 auto;

          border-radius: 9px;
          border: 2px solid rgba(255,255,255,0.45);
          background: rgba(255,255,255,0.04);
          position: relative;
          overflow: hidden;
          cursor: grab;
          user-select:none;
          touch-action:none;
        }

        .trayTile:active{ cursor: grabbing; }
        .trayTileImg{ position:absolute; inset:0; background-size:cover; background-position:center; }
        .trayTileLabel{
          position:absolute; left:10px; right:10px; bottom:10px;
          color: rgba(255,255,255,0.95);
          font-size: 12px;
          font-weight: 900;
          line-height: 1.05;
          text-shadow: 0 1px 2px rgba(0,0,0,0.70);
          pointer-events:none;
        }

        .zone.clickable{ cursor:pointer; }
        .zone.clickable:hover{ border-color: rgba(255,255,255,0.60); background: rgba(255,255,255,0.03); }

        .trayCountBadge{
          position:absolute;
          width: 42px; height: 42px;
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,0.22);
          background: rgba(255,255,255,0.06);
          display:flex; align-items:center; justify-content:center;
          color: rgba(255,255,255,0.92);
          font-weight: 900;
          box-shadow: 0 10px 20px rgba(0,0,0,0.45);
          pointer-events:none;
          user-select:none;
        }
      `;
      document.head.appendChild(style);

      // ---------- table + hud + stage ----------
      const table = document.createElement("div");
      table.id = "table";
      app.appendChild(table);

      const hud = document.createElement("div");
      hud.id = "hud";
      table.appendChild(hud);

      const fitBtn = document.createElement("button");
      fitBtn.className = "hudBtn";
      fitBtn.textContent = "FIT";
      hud.appendChild(fitBtn);

      const stage = document.createElement("div");
      stage.id = "stage";
      table.appendChild(stage);

      // ======= If we got here, drawing is working =======
      showRunningBadge();

      // IMPORTANT:
      // I’m stopping here on purpose.
      // If your page was white, this proves whether JS is running and whether it crashes before render.
      //
      // NEXT STEP:
      // If you still see white but you see the crash text, copy that error here.
      //
      // If you see the "JS is running" badge on black background, then the break is later in your full script
      // and we’ll paste the remaining code back in next, in ONE chunk.

      // TEMP visible marker so you can confirm render without the rest of the logic:
      const msg = document.createElement("div");
      msg.textContent = "Canvas created. If you see this, the white-screen crash was earlier.";
      msg.style.position = "absolute";
      msg.style.left = "18px";
      msg.style.top = "64px";
      msg.style.color = "#fff";
      msg.style.fontWeight = "900";
      msg.style.zIndex = "999999";
      stage.appendChild(msg);

    } catch (err) {
      showFatal(err);
    }
  }

  // Run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
