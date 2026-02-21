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
  bg.src = "fond.jpg?v=9";
  bg.onload = () => { state.bgOk = true; draw(); };

  const imgVolt = new Image();
  imgVolt.src = "voltmetre.png?v=9";

  const imgA2A = new Image();
  imgA2A.src = "amperemetre_2A.png?v=9";

  const imgAmA = new Image();
  imgAmA.src = "amperemetre_mA.png?v=9";

  const imgAuA = new Image();
  imgAuA.src = "amperemetre_microA.png?v=9";

  const OVER = {
    volt: { x: 0.0, y: 0.145, w: 0.295, h: 0.835 },
    amp:  { x: 0.71, y: 0.148, w: 0.345, h: 0.835 }
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

  function normPos(evt) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - r.left) / r.width,
      y: (evt.clientY - r.top) / r.height
    };
  }

  function inRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w &&
           py >= r.y && py <= r.y + r.h;
  }

  canvas.addEventListener("click", (e) => {
    const p = normPos(e);

    // zones approximatives temporaires
    const hVolt = {
      x: OVER.volt.x + 0.18 * OVER.volt.w,
      y: OVER.volt.y + 0.42 * OVER.volt.h,
      w: 0.64 * OVER.volt.w,
      h: 0.22 * OVER.volt.h
    };

    const hVoltOff = {
      x: OVER.volt.x + 0.20 * OVER.volt.w,
      y: OVER.volt.y + 0.64 * OVER.volt.h,
      w: 0.42 * OVER.volt.w,
      h: 0.16 * OVER.volt.h
    };

    const hA2A = {
      x: OVER.amp.x + 0.56 * OVER.amp.w,
      y: OVER.amp.y + 0.40 * OVER.amp.h,
      w: 0.36 * OVER.amp.w,
      h: 0.15 * OVER.amp.h
    };

    const hAma = {
      x: OVER.amp.x + 0.56 * OVER.amp.w,
      y: OVER.amp.y + 0.52 * OVER.amp.h,
      w: 0.36 * OVER.amp.w,
      h: 0.15 * OVER.amp.h
    };

    const hAua = {
      x: OVER.amp.x + 0.56 * OVER.amp.w,
      y: OVER.amp.y + 0.64 * OVER.amp.h,
      w: 0.36 * OVER.amp.w,
      h: 0.15 * OVER.amp.h
    };

    if (inRect(p.x, p.y, hVolt)) state.vMode = "VDC";
    else if (inRect(p.x, p.y, hVoltOff)) state.vMode = "OFF";
    else if (inRect(p.x, p.y, hA2A)) state.aMode = "2A";
    else if (inRect(p.x, p.y, hAma)) state.aMode = "mA";
    else if (inRect(p.x, p.y, hAua)) state.aMode = "uA";

    draw();
  });

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
