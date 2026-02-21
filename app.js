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
  const I_phys = (U, R) => (R > 0 ? U / R : 0);

  const state = {
    U: parseFloat(uRange.value || "0"),
    R: 100,
    vMode: "OFF",
    aMode: "OFF",
    showHotspots: false,
    bgOk: false
  };

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

  const SRC = {
    volt: { l: 3, t: 3, r: 354, b: 673 },
    a2a:  { l: 5, t: 10, r: 394, b: 611 },
    ama:  { l: 3, t: 10, r: 396, b: 617 },
    aua:  { l: 4, t: 5,  r: 397, b: 613 }
  };

  const DST = {
    volt: { x: 0,   y: 108, w: 315, h: 598 },
    amp:  { x: 913, y: 108, w: 367, h: 559 }
  };

  function drawOverlayAligned(img, srcBox, dstBox) {
    const srcW = srcBox.r - srcBox.l;
    const srcH = srcBox.b - srcBox.t;
    const s = Math.min(dstBox.w / srcW, dstBox.h / srcH);

    const fitW = srcW * s;
    const fitH = srcH * s;

    const offX = dstBox.x + (dstBox.w - fitW) / 2;
    const offY = dstBox.y + (dstBox.h - fitH) / 2;

    const dx = offX - srcBox.l * s;
    const dy = offY - srcBox.t * s;
    const dw = img.width * s;
    const dh = img.height * s;

    ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
  }

  const LCD_CENTER = {
    volt: { x: 0.102, y: 0.295 },
    amp:  { x: 0.900, y: 0.298 } // 🔼 légèrement remonté
  };

  function readVoltText() {
    if (state.vMode !== "VDC") return "";
    return state.U.toFixed(2) + " V";
  }

  function readAmpText() {
    if (state.aMode === "OFF") return "";

    const I = I_phys(state.U, state.R);
    const rangeA =
      state.aMode === "2A" ? 2 :
      state.aMode === "mA" ? 0.2 :
      0.02;

    if (I > rangeA + 1e-12) return "ERREUR";

    if (state.aMode === "2A") return I.toFixed(2) + " A";
    if (state.aMode === "mA") return (I * 1000).toFixed(1) + " mA";
    if (state.aMode === "uA") return (I * 1_000_000).toFixed(0) + " µA";

    return "";
  }

  function drawLCDText() {
    ctx.save();
    ctx.fillStyle = "black";
    ctx.font = "bold 30px monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const vt = readVoltText();
    const at = readAmpText();

    if (vt)
      ctx.fillText(vt,
        LCD_CENTER.volt.x * canvas.width,
        LCD_CENTER.volt.y * canvas.height
      );

    if (at)
      ctx.fillText(at,
        LCD_CENTER.amp.x * canvas.width,
        LCD_CENTER.amp.y * canvas.height
      );

    ctx.restore();
  }

  function buildResButtons() {
    resGrid.innerHTML = "";
    RES_VALUES.forEach((r) => {
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = `${r} Ω`;
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
    iIdeal.textContent = (I_phys(state.U, state.R) * 1000).toFixed(1);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!state.bgOk) return;

    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    if (state.vMode === "VDC")
      drawOverlayAligned(imgVolt, SRC.volt, DST.volt);

    let imgA = null, srcA = null;
    if (state.aMode === "2A") { imgA = imgA2A; srcA = SRC.a2a; }
    if (state.aMode === "mA") { imgA = imgAmA; srcA = SRC.ama; }
    if (state.aMode === "uA") { imgA = imgAuA; srcA = SRC.aua; }

    if (imgA && srcA)
      drawOverlayAligned(imgA, srcA, DST.amp);

    drawLCDText();
  }

  uRange.addEventListener("input", () => { sync(); draw(); });

  buildResButtons();
  sync();
  draw();
})();
