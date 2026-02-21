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
  bg.src = "fond.jpg?v=3002";
  bg.onload = () => { state.bgOk = true; draw(); };
  bg.onerror = () => { state.bgOk = false; draw(); };

  const imgVolt = new Image();
  imgVolt.src = "voltmetre.png?v=3002";

  const imgA2A = new Image();
  imgA2A.src = "amperemetre_2A.png?v=3002";

  const imgAmA = new Image();
  imgAmA.src = "amperemetre_mA.png?v=3002";

  const imgAuA = new Image();
  imgAuA.src = "amperemetre_microA.png?v=3002";

  // ====== ALIGNEMENT PAR "ZONE UTILE" (bbox alpha) ======
  const SRC = {
    volt: { l: 3, t: 3, r: 354, b: 673 },   // w=351 h=670
    a2a:  { l: 5, t: 10, r: 394, b: 611 },  // w=389 h=601
    ama:  { l: 3, t: 10, r: 396, b: 617 },  // w=393 h=607
    aua:  { l: 4, t: 5,  r: 397, b: 613 }   // w=393 h=608
  };

  // Rectangle cible (dans fond.jpg) des multimètres
  const DST = {
    volt: { x: 0,   y: 108, w: 315, h: 598 },
    amp:  { x: 913, y: 108, w: 367, h: 559 }
  };

  function drawOverlayAligned(img, srcBox, dstBox) {
    const srcW = srcBox.r - srcBox.l;
    const srcH = srcBox.b - srcBox.t;

    const sX = dstBox.w / srcW;
    const sY = dstBox.h / srcH;
    const s = Math.min(sX, sY);

    const fitW = srcW * s;
    const fitH = srcH * s;

    const offX = dstBox.x + (dstBox.w - fitW) / 2;
    const offY = dstBox.y + (dstBox.h - fitH) / 2;

    const dx = offX - srcBox.l * s;
    const dy = offY - srcBox.t * s;
    const dw = img.width * s;
    const dh = img.height * s;

    ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);

    return { x: offX, y: offY, w: fitW, h: fitH };
  }

  // ====== HOTSPOTS (recalés) ======
  function hotFromMeterBox(m, kind) {
    if (kind === "volt") {
      return {
        v_vdc: { x: m.x + 0.060 * m.w, y: m.y + 0.430 * m.h, w: 0.085 * m.w, h: 0.120 * m.h },
        v_off: { x: m.x + 0.105 * m.w, y: m.y + 0.610 * m.h, w: 0.095 * m.w, h: 0.100 * m.h }
      };
    }
    return {
      a_2a: { x: m.x + 0.835 * m.w, y: m.y + 0.360 * m.h, w: 0.120 * m.w, h: 0.105 * m.h },
      a_ma: { x: m.x + 0.835 * m.w, y: m.y + 0.455 * m.h, w: 0.120 * m.w, h: 0.105 * m.h },
      a_ua: { x: m.x + 0.835 * m.w, y: m.y + 0.550 * m.h, w: 0.120 * m.w, h: 0.105 * m.h },
      a_off:{ x: m.x + 0.210 * m.w, y: m.y + 0.610 * m.h, w: 0.110 * m.w, h: 0.095 * m.h }
    };
  }

  function drawHotRect(r, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  }

  // ====== LCD (texte) — centré dans l'écran gris ======
  // Boîte LCD relative AU MULTIMÈTRE (DST.*) : à ajuster si besoin.
  // x/y = coin haut-gauche ; w/h = taille (en fraction du multimètre).
  const LCD_BOX_FRAC = {
    volt: { x: 0.13, y: 0.055, w: 0.74, h: 0.16 },
    amp:  { x: 0.13, y: 0.055, w: 0.74, h: 0.16 }
  };

  // Décalage "extérieur" (en fraction de la largeur du multimètre)
  const LCD_OUT_SHIFT = {
    volt: -0.020, // vers la gauche
    amp:  +0.020  // vers la droite
  };

  // Remontée globale (en fraction de la hauteur du multimètre)
  const LCD_UP_SHIFT = -0.010; // un peu plus haut

  function readVoltText() {
    if (state.vMode !== "VDC") return "";
    return state.U.toFixed(2) + " V";
  }

  function readAmpText() {
    if (state.aMode === "OFF") return "";

    const I = I_phys(state.U, state.R); // A

    const rangeA =
      state.aMode === "2A" ? 2 :
      state.aMode === "mA" ? 0.2 :
      0.02;

    if (I > rangeA + 1e-12) return "ERREUR";

    if (state.aMode === "2A") {
      return I.toFixed(2) + " A";
    }
    if (state.aMode === "mA") {
      return (I * 1000).toFixed(1) + " mA";
    }
    if (state.aMode === "uA") {
      return (I * 1_000_000).toFixed(0) + " µA";
    }
    return "";
  }

  function drawLCDText() {
    const vt = readVoltText();
    const at = readAmpText();
    if (!vt && !at) return;

    ctx.save();
    ctx.fillStyle = "black";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    // Taille de police proportionnelle à la hauteur de l'écran LCD
    // (on la calcule sur le volt, quasi identique à l'amp)
    const lcdV = LCD_BOX_FRAC.volt;
    const lcdHpx = lcdV.h * DST.volt.h;
    const fontPx = Math.round(lcdHpx * 0.55);
    ctx.font = `bold ${fontPx}px monospace`;

    // Voltmètre
    if (vt) {
      const m = DST.volt;
      const b = LCD_BOX_FRAC.volt;
      const cx = m.x + (b.x + b.w / 2) * m.w + LCD_OUT_SHIFT.volt * m.w;
      const cy = m.y + (b.y + b.h / 2) * m.h + LCD_UP_SHIFT * m.h;
      ctx.fillText(vt, cx, cy);
    }

    // Ampèremètre
    if (at) {
      const m = DST.amp;
      const b = LCD_BOX_FRAC.amp;
      const cx = m.x + (b.x + b.w / 2) * m.w + LCD_OUT_SHIFT.amp * m.w;
      const cy = m.y + (b.y + b.h / 2) * m.h + LCD_UP_SHIFT * m.h;
      ctx.fillText(at, cx, cy);
    }

    ctx.restore();
  }

  // ====== UI ======
  function buildResButtons() {
    resGrid.innerHTML = "";
    RES_VALUES.forEach((r) => {
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
    [...resGrid.querySelectorAll("button")].forEach((b) => {
      b.classList.toggle("active", Number(b.dataset.r) === R);
    });
  }

  function sync() {
    state.U = clamp(parseFloat(uRange.value || "0"), 0, 10);
    uTxt.textContent = state.U.toFixed(1);
    rTxt.textContent = String(state.R);
    iIdeal.textContent = (I_phys(state.U, state.R) * 1000).toFixed(1);
  }

  // ====== DESSIN ======
  let HOT = null;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!state.bgOk) {
      ctx.fillStyle = "#0f1730";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,77,109,.95)";
      ctx.font = "900 34px system-ui, Segoe UI, Arial";
      ctx.fillText("FOND NON CHARGÉ", 40, 90);
      return;
    }

    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // overlays
    if (state.vMode === "VDC") {
      drawOverlayAligned(imgVolt, SRC.volt, DST.volt);
    }

    let imgA = null, srcA = null;
    if (state.aMode === "2A") { imgA = imgA2A; srcA = SRC.a2a; }
    if (state.aMode === "mA") { imgA = imgAmA; srcA = SRC.ama; }
    if (state.aMode === "uA") { imgA = imgAuA; srcA = SRC.aua; }

    if (imgA && srcA) {
      drawOverlayAligned(imgA, srcA, DST.amp);
    }

    // hotspots (toujours, même si OFF)
    const hv = hotFromMeterBox(DST.volt, "volt");
    const ha = hotFromMeterBox(DST.amp, "amp");
    HOT = { ...hv, ...ha };

    // texte LCD
    drawLCDText();

    if (state.showHotspots && HOT) {
      drawHotRect(HOT.v_vdc, "yellow");
      drawHotRect(HOT.v_off, "yellow");
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
    if (!HOT) return;

    const p = normPos(e);
    const x = p.x * canvas.width;
    const y = p.y * canvas.height;

    if (inRect(x, y, HOT.v_vdc)) {
      state.vMode = "VDC";
      status.textContent = "Voltmètre : V⎓ sélectionné.";
      draw();
      return;
    }
    if (inRect(x, y, HOT.v_off)) {
      state.vMode = "OFF";
      status.textContent = "Voltmètre : OFF.";
      draw();
      return;
    }

    // interversion conservée (OK chez vous)
    if (inRect(x, y, HOT.a_2a)) {
      state.aMode = "uA";
      status.textContent = "Ampèremètre : µA sélectionné.";
      draw();
      return;
    }
    if (inRect(x, y, HOT.a_ma)) {
      state.aMode = "mA";
      status.textContent = "Ampèremètre : mA sélectionné.";
      draw();
      return;
    }
    if (inRect(x, y, HOT.a_ua)) {
      state.aMode = "2A";
      status.textContent = "Ampèremètre : 2A sélectionné.";
      draw();
      return;
    }
    if (inRect(x, y, HOT.a_off)) {
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
    status.textContent = "Reset : OFF.";
    draw();
  };

  showHotBtn.onclick = () => {
    state.showHotspots = !state.showHotspots;
    draw();
  };

  // ====== INIT ======
  buildResButtons();
  sync();
  status.textContent = "Départ : OFF. Clique V⎓ puis un calibre A.";
  draw();
})();
