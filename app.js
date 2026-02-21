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
    bgOk: false
  };

  const bg = new Image();
  bg.src = "fond.jpg?v=12";
  bg.onload = () => { state.bgOk = true; draw(); };

  const imgVolt = new Image();
  imgVolt.src = "voltmetre.png?v=12";

  const imgA2A = new Image();
  imgA2A.src = "amperemetre_2A.png?v=12";

  const imgAmA = new Image();
  imgAmA.src = "amperemetre_mA.png?v=12";

  const imgAuA = new Image();
  imgAuA.src = "amperemetre_microA.png?v=12";

  // === POSITIONS EXACTES (en pixels réels 1280x720) ===

  const LEFT = { x: 5, y: 110, w: 264, h: 555 };
  const RIGHT = { x: 1009, y: 109, w: 263, h: 556 };

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
    iIdeal.textContent = (I_phys(state.U, state.R) * 1000).toFixed(1);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (state.bgOk) ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    if (state.vMode === "VDC") {
      ctx.drawImage(imgVolt, LEFT.x, LEFT.y, LEFT.w, LEFT.h);
    }

    let img = null;
    if (state.aMode === "2A") img = imgA2A;
    if (state.aMode === "mA") img = imgAmA;
    if (state.aMode === "uA") img = imgAuA;

    if (img) {
      ctx.drawImage(img, RIGHT.x, RIGHT.y, RIGHT.w, RIGHT.h);
    }
  }

  function inRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w &&
           py >= r.y && py <= r.y + r.h;
  }

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * canvas.height);

    if (inRect(x, y, LEFT)) state.vMode = "VDC";
    if (inRect(x, y, RIGHT)) state.aMode = "mA";

    draw();
  });

  uRange.addEventListener("input", () => { sync(); draw(); });

  resetBtn.onclick = () => {
    state.U = 3;
    state.R = 100;
    state.vMode = "OFF";
    state.aMode = "OFF";
    uRange.value = "3";
    sync();
    draw();
  };

  buildResButtons();
  sync();
  draw();
})();
