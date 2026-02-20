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

  const state = {
    U: parseFloat(uRange.value || "0"),
    R: 100,
    vOn: false,
    aRangeIndex: null,
    aRangesA: [2, 0.2, 0.02], // 2A / 200mA / 20mA
    showHotspots: false,
    bgOk: false
  };

  const I_phys = (U, R) => (R > 0 ? U / R : 0);
  const format_mA = (A, d) => (A * 1000).toFixed(d);

  // ---- IMAGES ----
  const bg = new Image();
  bg.src = "fond.jpg?v=5";
  bg.onload = () => { state.bgOk = true; draw(); };

  const imgVolt = new Image();
  imgVolt.src = "voltmetre.png?v=1";

  const imgA2A = new Image();
  imgA2A.src = "amperemetre_2A.png?v=1";

  const imgAmA = new Image();
  imgAmA.src = "amperemetre_mA.png?v=1";

  const imgAuA = new Image();
  imgAuA.src = "amperemetre_microA.png?v=1";

  // ---- HOTSPOTS (à ajuster si besoin) ----
  const HOT = {
    v_dc:   { x: 0.07, y: 0.38, w: 0.20, h: 0.18 },

    a_2A:   { x: 0.73, y: 0.40, w: 0.18, h: 0.12 },
    a_200m: { x: 0.73, y: 0.52, w: 0.18, h: 0.12 },
    a_20m:  { x: 0.73, y: 0.64, w: 0.18, h: 0.12 },
  };

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

  function readVoltmeter() {
    if (!state.vOn) return "";
    return state.U.toFixed(2);
  }

  function readAmmeter() {
    if (state.aRangeIndex === null) return "";

    const I = I_phys(state.U, state.R);
    const range = state.aRangesA[state.aRangeIndex];

    if (I > range) return "ERREUR";

    const decimals = state.aRangeIndex === 0 ? 1 :
                     state.aRangeIndex === 1 ? 2 : 3;

    return format_mA(I, decimals);
  }

  function buildResButtons() {
    resGrid.innerHTML = "";
    RES_VALUES.forEach(r => {
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = r + " Ω";
      b.dataset.r = r;
      b.onclick = () => {
        state.R = r;
        sync();
        draw();
      };
      resGrid.appendChild(b);
    });
  }

  function sync() {
    state.U = parseFloat(uRange.value);
    uTxt.textContent = state.U.toFixed(1);
    rTxt.textContent = state.R;
    iIdeal.textContent = format_mA(I_phys(state.U, state.R), 1);
  }

  function drawHotRect(r, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(
      r.x * canvas.width,
      r.y * canvas.height,
      r.w * canvas.width,
      r.h * canvas.height
    );
  }

  function drawMultimeters() {

    // VOLTMÈTRE
    ctx.drawImage(imgVolt,
      0.05 * canvas.width,
      0.10 * canvas.height,
      0.30 * canvas.width,
      0.75 * canvas.height
    );

    // AMPÈREMÈTRE
    let imgA = imgA2A;
    if (state.aRangeIndex === 1) imgA = imgAmA;
    if (state.aRangeIndex === 2) imgA = imgAuA;

    ctx.drawImage(imgA,
      0.65 * canvas.width,
      0.10 * canvas.height,
      0.30 * canvas.width,
      0.75 * canvas.height
    );
  }

  function drawLCD() {

    // Volt
    ctx.fillStyle = "black";
    ctx.font = "bold 40px monospace";
    ctx.fillText(readVoltmeter(),
      0.12 * canvas.width,
      0.23 * canvas.height
    );

    // Amp
    ctx.fillText(readAmmeter(),
      0.72 * canvas.width,
      0.23 * canvas.height
    );
  }

  function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.bgOk)
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    drawMultimeters();
    drawLCD();

    if (state.showHotspots) {
      drawHotRect(HOT.v_dc, "lime");
      drawHotRect(HOT.a_2A, "cyan");
      drawHotRect(HOT.a_200m, "cyan");
      drawHotRect(HOT.a_20m, "cyan");
    }
  }

  canvas.addEventListener("click", (e) => {
    const p = normPos(e);

    if (inRect(p.x, p.y, HOT.v_dc)) {
      state.vOn = true;
      draw();
      return;
    }

    if (inRect(p.x, p.y, HOT.a_2A)) {
      state.aRangeIndex = 0;
      draw();
      return;
    }

    if (inRect(p.x, p.y, HOT.a_200m)) {
      state.aRangeIndex = 1;
      draw();
      return;
    }

    if (inRect(p.x, p.y, HOT.a_20m)) {
      state.aRangeIndex = 2;
      draw();
      return;
    }
  });

  uRange.addEventListener("input", () => {
    sync();
    draw();
  });

  resetBtn.onclick = () => {
    state.U = 3;
    state.R = 100;
    state.vOn = false;
    state.aRangeIndex = null;
    uRange.value = 3;
    sync();
    draw();
  };

  showHotBtn.onclick = () => {
    state.showHotspots = !state.showHotspots;
    draw();
  };

  buildResButtons();
  sync();
  draw();
})();
