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

    vMode: "OFF", // "OFF" | "VDC"
    aMode: "OFF", // "OFF" | "2A" | "mA" | "uA"

    showHotspots: false,
    bgOk: false
  };

  // ====== IMAGES ======
  const bg = new Image();
  bg.src = "fond.jpg?v=7";
  bg.onload = () => { state.bgOk = true; draw(); };
  bg.onerror = () => { state.bgOk = false; draw(); };

  const imgVolt = new Image();
  imgVolt.src = "voltmetre.png?v=7";

  const imgA2A = new Image();
  imgA2A.src = "amperemetre_2A.png?v=7";

  const imgAmA = new Image();
  imgAmA.src = "amperemetre_mA.png?v=7";

  const imgAuA = new Image();
  imgAuA.src = "amperemetre_microA.png?v=7";

  // ============================================================
  // OVERLAYS ✅
  // Demande utilisateur : agrandir légèrement + descendre un peu,
  // et chaque multimètre vers son bord extérieur.
  // + voltmètre : plus étroit ; ampèremètre : un peu plus à droite/bas
  // ============================================================
  const OVER = {
    // gauche : un peu plus vers la gauche, un peu plus bas, légèrement agrandi
    // et un poil moins large (voltmètre "plus étroit")
    volt: { x: 0.000, y: 0.145, w: 0.295, h: 0.835 },

    // droite : un peu plus vers la droite, un peu plus bas, légèrement agrandi
    amp:  { x: 0.710, y: 0.148, w: 0.345, h: 0.835 }
  };

  // ============================================================
  // HOTSPOTS ✅ (RELATIFS aux overlays)
  // => si tu touches OVER, les zones suivent automatiquement.
  // Les rectangles ci-dessous sont en "coordonnées relatives overlay".
  // ============================================================

  const HOT_REL = {
    // --- Voltmètre (gauche) ---
    // zone V⎓ : arc bas-gauche du sélecteur (assez large pour clic facile)
    v_vdc: { x: 0.18, y: 0.42, w: 0.64, h: 0.22 },
    // zone OFF : bas-gauche, proche "OFF"
    v_off: { x: 0.20, y: 0.64, w: 0.42, h: 0.16 },

    // --- Ampèremètre (droite) ---
    // 2A (en haut à droite de l’arc)
    a_2a:  { x: 0.56, y: 0.40, w: 0.36, h: 0.15 },
    // mA (milieu droite)
    a_ma:  { x: 0.56, y: 0.52, w: 0.36, h: 0.15 },
    // µA (bas droite)
    a_ua:  { x: 0.56, y: 0.64, w: 0.36, h: 0.15 },
    // OFF (bas-gauche)
    a_off: { x: 0.20, y: 0.64, w: 0.40, h: 0.16 }
  };

  function relToAbs(box, r) {
    return {
      x: box.x + r.x * box.w,
      y: box.y + r.y * box.h,
      w: r.w * box.w,
      h: r.h * box.h
    };
  }

  function HOT() {
    return {
      v_vdc: relToAbs(OVER.volt, HOT_REL.v_vdc),
      v_off: relToAbs(OVER.volt, HOT_REL.v_off),

      a_2a:  relToAbs(OVER.amp,  HOT_REL.a_2a),
      a_ma:  relToAbs(OVER.amp,  HOT_REL.a_ma),
      a_ua:  relToAbs(OVER.amp,  HOT_REL.a_ua),
      a_off: relToAbs(OVER.amp,  HOT_REL.a_off)
    };
  }

  // ====== LCD (texte) : on le place aussi RELATIF aux overlays ======
  const LCD_REL = {
    volt: { x: 0.28, y: 0.10 }, // écran en haut
    amp:  { x: 0.28, y: 0.10 }
  };

  function lcdAbs(which) {
    const box = which === "volt" ? OVER.volt : OVER.amp;
    const r = which === "volt" ? LCD_REL.volt : LCD_REL.amp;
    return { x: (box.x + r.x * box.w), y: (box.y + r.y * box.h) };
  }

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
        setActive(r);
        sync();
        draw();
      };
      resGrid.appendChild(b);
    });
    setActive(state.R);
  }

  function setActive(R) {
    [...resGrid.querySelectorAll("button")].forEach(b => {
      b.classList.toggle("active", Number(b.dataset.r) === R);
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

    const rangeA =
      state.aMode === "2A" ? 2 :
      state.aMode === "mA" ? 0.2 :
      0.02;

    if (I > rangeA + 1e-12) return "ERREUR";

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
    if (state.vMode === "VDC") {
      ctx.drawImage(
        imgVolt,
        OVER.volt.x * canvas.width,
        OVER.volt.y * canvas.height,
        OVER.volt.w * canvas.width,
        OVER.volt.h * canvas.height
      );
    }

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
      const p = lcdAbs("volt");
      ctx.fillText(vt, p.x * canvas.width, p.y * canvas.height);
    }
    if (at) {
      const p = lcdAbs("amp");
      ctx.fillText(at, p.x * canvas.width, p.y * canvas.height);
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
      const h = HOT();
      drawHotRect(h.v_vdc, "lime");
      drawHotRect(h.v_off, "lime");

      drawHotRect(h.a_2a, "cyan");
      drawHotRect(h.a_ma, "cyan");
      drawHotRect(h.a_ua, "cyan");
      drawHotRect(h.a_off, "cyan");
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
    console.log("CLICK canvas", p.x.toFixed(3), p.y.toFixed(3));

    const h = HOT();

    if (inRect(p.x, p.y, h.v_vdc)) {
      state.vMode = "VDC";
      status.textContent = "Voltmètre : V⎓ sélectionné.";
      draw();
      return;
    }
    if (inRect(p.x, p.y, h.v_off)) {
      state.vMode = "OFF";
      status.textContent = "Voltmètre : OFF.";
      draw();
      return;
    }

    if (inRect(p.x, p.y, h.a_2a)) {
      state.aMode = "2A";
      status.textContent = "Ampèremètre : 2A sélectionné (moins précis).";
      draw();
      return;
    }
    if (inRect(p.x, p.y, h.a_ma)) {
      state.aMode = "mA";
      status.textContent = "Ampèremètre : mA sélectionné (plus précis).";
      draw();
      return;
    }
    if (inRect(p.x, p.y, h.a_ua)) {
      state.aMode = "uA";
      status.textContent = "Ampèremètre : plus petit calibre sélectionné (plus précis).";
      draw();
      return;
    }
    if (inRect(p.x, p.y, h.a_off)) {
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
    setActive(100);
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
