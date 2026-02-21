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

  const OVER = {
    volt: { x: 0.000, y: 0.145, w: 0.295, h: 0.835 },
    amp:  { x: 0.710, y: 0.148, w: 0.345, h: 0.835 }
  };

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

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.bgOk) {
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    }

    // ✅ CADRE JAUNE DE TEST (visible)
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

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

  uRange.addEventListener("input", () => {
    sync();
    draw();
  });

  resetBtn.onclick = () => {
    state.U = 3;
    state.R = 100;
    state.vMode = "OFF";
    state.aMode = "OFF";
    uRange.value = "3";
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
