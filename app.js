(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("c");
  const ctx = canvas.getContext("2d");

  const uRange = $("uRange");
  const uTxt = $("uTxt");
  const rTxt = $("rTxt");
  const resGrid = $("resGrid");
  const iIdeal = $("iIdeal");
  const status = $("status");
  const resetBtn = $("resetBtn");
  const showHotBtn = $("showHotBtn");

  const RES_VALUES = [10, 33, 47, 68, 100, 220, 330, 470];

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const I_phys = (U, R) => (R > 0 ? U / R : 0); // A

  // ====== ÉTAT ======
  const state = {
    U: parseFloat(uRange.value || "0"),
    R: 100,

    // voltmètre
    vMode: "OFF", // "OFF" | "VDC"

    // ampèremètre
    aMode: "OFF", // "OFF" | "2A" | "mA" | "uA"

    showHotspots: false,
    bgOk: false
  };

  // ====== IMAGES ======
  const bg = new Image();
  bg.src = "fond.jpg?v=6";
  bg.onload = () => { state.bgOk = true; draw(); };
  bg.onerror = () => { state.bgOk = false; draw(); };

  // Images "positions" (superposées uniquement après clic)
  const imgVolt = new Image();
  imgVolt.src = "voltmetre.png?v=1";

  const imgA2A = new Image();
  imgA2A.src = "amperemetre_2A.png?v=1";

  const imgAmA = new Image();
  imgAmA.src = "amperemetre_mA.png?v=1";

  const imgAuA = new Image();
  imgAuA.src = "amperemetre_microA.png?v=1";

  // ====== PLACEMENT DES OVERLAYS (corrigé) ======
const OVER = {
  // un peu plus grand, un peu plus bas, et vers le bord extérieur
  volt: { x: 0.020, y: 0.125, w: 0.335, h: 0.800 },
  amp:  { x: 0.655, y: 0.125, w: 0.335, h: 0.800 }
};

// ====== HOTSPOTS (corrigé) ======
const HOT = {
  // Voltmètre gauche : zones décalées vers la gauche + bas
  v_vdc: { x: 0.045, y: 0.415, w: 0.225, h: 0.195 },
  v_off: { x: 0.060, y: 0.640, w: 0.160, h: 0.120 },

  // Ampèremètre droit : zones décalées vers la droite + bas
  a_2a:  { x: 0.745, y: 0.430, w: 0.200, h: 0.120 },
  a_ma:  { x: 0.745, y: 0.555, w: 0.200, h: 0.120 },
  a_ua:  { x: 0.745, y: 0.680, w: 0.200, h: 0.120 },
  a_off: { x: 0.705, y: 0.640, w: 0.160, h: 0.120 }
};

  // ====== LCD (texte superposé) ======
  const LCD_POS = {
    volt: { x: 0.12, y: 0.23 }, // en fraction
    amp:  { x: 0.72, y: 0.23 }
  };

  // ====== UI ======
  function buildResButtons() {
    resGrid.innerHTML = "";
    RES_VALUES.forEach(r => {
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = `${r} Ω`;
      b.dataset.r = String(r);
      b.onclick = () => {
        state.R = r;
        sync();
        draw();
      };
      resGrid.appendChild(b);
    });
  }

  function sync() {
    state.U = clamp(parseFloat(uRange.value || "0"), 0, 10);
    uTxt.textContent = state.U.toFixed(1);
    rTxt.textContent = String(state.R);

    const I = I_phys(state.U, state.R);
    iIdeal.textContent = (I * 1000).toFixed(1);
  }

  // ====== MESURES ======
  function readVoltText() {
    if (state.vMode !== "VDC") return "";
    return state.U.toFixed(2);
  }

  function readAmpText() {
    if (state.aMode === "OFF") return "";

    const I = I_phys(state.U, state.R); // A

    // calibres max (A)
    const rangeA =
      state.aMode === "2A" ? 2 :
      state.aMode === "mA" ? 0.2 :
      0.02; // "uA" = plus petit calibre (20 mA)

    if (I > rangeA + 1e-12) return "ERREUR";

    // précision : 2A = moins précis
    const decimals =
      state.aMode === "2A" ? 0 :
      state.aMode === "mA" ? 1 :
      2;

    return (I * 1000).toFixed(decimals); // mA
  }

  // ====== DESSIN ======
  function drawHotRect(r, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(
      r.x * canvas.width,
      r.y * canvas.height,
      r.w * canvas.width,
      r.h * canvas.height
    );
    ctx.restore();
  }

  function drawOverlays() {
    // voltmètre
    if (state.vMode === "VDC") {
      ctx.drawImage(
        imgVolt,
        OVER.volt.x * canvas.width,
        OVER.volt.y * canvas.height,
        OVER.volt.w * canvas.width,
        OVER.volt.h * canvas.height
      );
    }

    // ampèremètre
    let img = null;
    if (state.aMode === "2A") img = imgA2A;
    if (state.aMode === "mA") img = imgAmA;
    if (state.aMode === "uA") img = imgAuA;

    if (img) {
      ctx.drawImage(
        img,
        OVER.amp.x * canvas.width,
        OVER.amp.y * canvas.height,
        OVER.amp.w * canvas.width,
        OVER.amp.h * canvas.height
      );
    }
  }

  function drawLCDText() {
    ctx.save();
    ctx.fillStyle = "black";
    ctx.font = "bold 40px monospace";

    const vt = readVoltText();
    const at = readAmpText();

    if (vt) {
      ctx.fillText(
        vt,
        LCD_POS.volt.x * canvas.width,
        LCD_POS.volt.y * canvas.height
      );
    }
    if (at) {
      ctx.fillText(
        at,
        LCD_POS.amp.x * canvas.width,
        LCD_POS.amp.y * canvas.height
      );
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.bgOk) {
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#0f1730";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,77,109,.95)";
      ctx.font = "900 34px system-ui, Segoe UI, Arial";
      ctx.fillText("FOND NON CHARGÉ", 40, 90);
    }

    drawOverlays();
    drawLCDText();

    if (state.showHotspots) {
      drawHotRect(HOT.v_vdc, "lime");
      drawHotRect(HOT.v_off, "lime");

      drawHotRect(HOT.a_2a, "cyan");
      drawHotRect(HOT.a_ma, "cyan");
      drawHotRect(HOT.a_ua, "cyan");
      drawHotRect(HOT.a_off, "cyan");
    }
  }

  // ====== CLICS ======
  function normPos(evt) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - r.left) / r.width,
      y: (evt.clientY - r.top) / r.height
    };
  }
  function inRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  canvas.addEventListener("click", (e) => {
    const p = normPos(e);
    console.log("CLICK canvas", p.x.toFixed(3), p.y.toFixed(3)); // ✅ DEBUG

    // Voltmètre
    if (inRect(p.x, p.y, HOT.v_vdc)) {
      state.vMode = "VDC";
      status.textContent = "Voltmètre : V⎓ sélectionné.";
      draw();
      return;
    }
    if (inRect(p.x, p.y, HOT.v_off)) {
      state.vMode = "OFF";
      status.textContent = "Voltmètre : OFF.";
      draw();
      return;
    }

    // Ampèremètre
    if (inRect(p.x, p.y, HOT.a_2a)) {
      state.aMode = "2A";
      status.textContent = "Ampèremètre : 2A sélectionné (moins précis).";
      draw();
      return;
    }
    if (inRect(p.x, p.y, HOT.a_ma)) {
      state.aMode = "mA";
      status.textContent = "Ampèremètre : mA sélectionné (plus précis).";
      draw();
      return;
    }
    if (inRect(p.x, p.y, HOT.a_ua)) {
      state.aMode = "uA";
      status.textContent = "Ampèremètre : plus petit calibre sélectionné (plus précis).";
      draw();
      return;
    }
    if (inRect(p.x, p.y, HOT.a_off)) {
      state.aMode = "OFF";
      status.textContent = "Ampèremètre : OFF.";
      draw();
      return;
    }
  });

  // ====== EVENTS UI ======
  uRange.addEventListener("input", () => { sync(); draw(); });

  resetBtn.onclick = () => {
    state.U = 3;
    state.R = 100;
    state.vMode = "OFF";
    state.aMode = "OFF";

    uRange.value = "3";
    sync();
    status.textContent = "Reset : les deux multimètres sont sur OFF.";
    draw();
  };

  showHotBtn.onclick = () => {
    state.showHotspots = !state.showHotspots;
    draw();
  };

  // ====== INIT ======
  buildResButtons();
  sync();
  status.textContent = "Départ : OFF. Clique sur V⎓ (gauche) puis sur un calibre A (droite).";
  draw();
})();
