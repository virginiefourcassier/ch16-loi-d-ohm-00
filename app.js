(() => {
  "use strict";

  // ====== Modèle ======
  const RES_VALUES = [10, 33, 47, 68, 100, 220, 330, 470];

  const state = {
    U: 0.0,
    R: 100,
    // UI
    pinned: null
  };

  // ====== DOM ======
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  const uRange = document.getElementById("uRange");
  const uTxt = document.getElementById("uTxt");
  const rTxt = document.getElementById("rTxt");
  const iTxt = document.getElementById("iTxt");
  const iUnit = document.getElementById("iUnit");

  const resGrid = document.getElementById("resGrid");
  const resetBtn = document.getElementById("resetBtn");
  const snapBtn = document.getElementById("snapBtn");
  const logCard = document.getElementById("logCard");
  const logTxt = document.getElementById("logTxt");

  // ====== Utils ======
  function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }

  function computeI(U, R){
    if (R <= 0) return 0;
    return U / R; // A
  }

  // format I en mA si < 1A, sinon A
  function formatCurrent(I_A){
    const abs = Math.abs(I_A);
    if (abs < 1) {
      return { val: (I_A * 1000).toFixed(1), unit: "mA" };
    }
    return { val: I_A.toFixed(3), unit: "A" };
  }

  function formatVoltage(U){
    return U.toFixed(1);
  }

  function setActiveButton(R){
    [...resGrid.querySelectorAll("button")].forEach(btn => {
      btn.classList.toggle("active", Number(btn.dataset.r) === R);
    });
  }

  // ====== UI init ======
  function buildResButtons(){
    resGrid.innerHTML = "";
    RES_VALUES.forEach(r => {
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = `${r} Ω`;
      b.dataset.r = String(r);
      b.addEventListener("click", () => {
        state.R = r;
        setActiveButton(r);
        syncUI();
        draw();
      });
      resGrid.appendChild(b);
    });
    setActiveButton(state.R);
  }

  function syncUI(){
    uTxt.textContent = formatVoltage(state.U);
    rTxt.textContent = String(state.R);

    const I = computeI(state.U, state.R);
    const f = formatCurrent(I);
    iTxt.textContent = f.val;
    iUnit.textContent = f.unit;
  }

  // ====== Dessin : style "montage + 2 multimètres" ======
  function draw(){
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    // fond
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(0,0,w,h);

    // grille légère
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let x=20; x<w; x+=40){
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
    }
    for (let y=20; y<h; y+=40){
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
    }

    // zones
    const margin = 26;
    const circuit = { x: margin, y: 36, w: w - 2*margin, h: 250 };
    const meters = { x: margin, y: circuit.y + circuit.h + 16, w: w - 2*margin, h: h - (circuit.y + circuit.h + 16) - margin };

    // Titre montage
    ctx.fillStyle = "rgba(233,238,252,.92)";
    ctx.font = "700 18px system-ui,Segoe UI,Arial";
    ctx.fillText("Montage (simulation)", circuit.x, circuit.y - 10);

    // plaque du circuit
    roundRect(circuit.x, circuit.y, circuit.w, circuit.h, 16, "rgba(255,255,255,0.04)", "rgba(255,255,255,0.10)");

    // --- Dessiner circuit : générateur + résistance + fils + points de mesure ---
    const cx = circuit.x, cy = circuit.y;

    // Points clés
    const left = cx + 70, right = cx + circuit.w - 80;
    const top = cy + 70, bottom = cy + circuit.h - 60;

    // Générateur (à gauche)
    drawSource(left - 30, (top+bottom)/2 - 38, 60, 76, state.U);

    // Résistance (au centre haut)
    const rx = (left+right)/2 - 110, ry = top - 22;
    drawResistor(rx, ry, 220, 44, state.R);

    // Ampèremètre en série (bas)
    const ax = (left+right)/2 - 40, ay = bottom - 22;
    drawInlineAmmeter(ax, ay, 80, 44);

    // Fils (rectangulaires)
    wire(left+30, (top+bottom)/2, rx, (top+bottom)/2);            // source -> vers centre
    wire(rx, (top+bottom)/2, rx, top);                            // monter
    wire(rx, top, rx+220, top);                                   // vers résistance
    wire(rx+220, top, right, top);                                // jusqu'à droite
    wire(right, top, right, bottom);                               // descendre à droite
    wire(right, bottom, ax+80, bottom);                            // vers ampèremètre
    wire(ax, bottom, left, bottom);                                // retour vers gauche
    wire(left, bottom, left, (top+bottom)/2);                      // remonter vers source

    // Branchement voltmètre (en dérivation sur la résistance)
    const v1 = { x: rx+10, y: top };
    const v2 = { x: rx+210, y: top };
    drawProbe(v1.x, v1.y, "#ff4d6d"); // rouge
    drawProbe(v2.x, v2.y, "#9aa4b2"); // noir/gris

    // Liaisons vers voltmètre (bas gauche)
    const vmPos = { x: meters.x + 10, y: meters.y + 18, w: 360, h: meters.h - 30 };
    const amPos = { x: meters.x + meters.w - 370, y: meters.y + 18, w: 360, h: meters.h - 30 };

    // tracés câbles vers multimètres
    cable(v1.x, v1.y, vmPos.x + 120, vmPos.y + 28, "#ff4d6d");
    cable(v2.x, v2.y, vmPos.x + 220, vmPos.y + 28, "#9aa4b2");

    // câbles ampèremètre (bornes série)
    // On place deux points aux bornes de l'ampèremètre inline
    const aL = { x: ax, y: bottom };
    const aR = { x: ax+80, y: bottom };
    drawProbe(aL.x, aL.y, "#ff4d6d");
    drawProbe(aR.x, aR.y, "#9aa4b2");
    cable(aL.x, aL.y, amPos.x + 120, amPos.y + 28, "#ff4d6d");
    cable(aR.x, aR.y, amPos.x + 220, amPos.y + 28, "#9aa4b2");

    // --- Multimètres ---
    const I = computeI(state.U, state.R);
    const fI = formatCurrent(I);

    drawMultimeter(vmPos.x, vmPos.y, vmPos.w, vmPos.h, "VOLTMÈTRE (V⎓)", `${formatVoltage(state.U)}`, "V");
    drawMultimeter(amPos.x, amPos.y, amPos.w, amPos.h, "AMPÈREMÈTRE (A⎓)", `${fI.val}`, fI.unit);

    // petit rappel loi
    ctx.fillStyle = "rgba(233,238,252,.72)";
    ctx.font = "600 13px system-ui,Segoe UI,Arial";
    ctx.fillText(`Loi d’Ohm : I = U / R`, cx + 14, cy + circuit.h - 14);
  }

  // ====== Primitives dessin ======
  function roundRect(x,y,w,h,r, fill, stroke){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
    if (fill){
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke){
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function wire(x1,y1,x2,y2){
    ctx.strokeStyle = "rgba(255,255,255,.75)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
  }

  function cable(x1,y1,x2,y2,color){
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    // courbe douce
    const mx = (x1+x2)/2;
    ctx.bezierCurveTo(mx, y1+40, mx, y2-40, x2, y2);
    ctx.stroke();
  }

  function drawProbe(x,y,color){
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x,y,6,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath();
    ctx.arc(x+2,y+2,6,0,Math.PI*2);
    ctx.fill();
  }

  function drawSource(x,y,w,h,U){
    roundRect(x,y,w,h,14,"rgba(122,167,255,.10)","rgba(122,167,255,.45)");
    ctx.fillStyle = "rgba(233,238,252,.92)";
    ctx.font = "800 14px system-ui,Segoe UI,Arial";
    ctx.fillText("Générateur", x+10, y+22);

    // symbole +/-
    ctx.strokeStyle = "rgba(233,238,252,.9)";
    ctx.lineWidth = 2;
    // +
    ctx.beginPath();
    ctx.moveTo(x+18, y+40); ctx.lineTo(x+18, y+58);
    ctx.moveTo(x+10, y+49); ctx.lineTo(x+26, y+49);
    ctx.stroke();
    // -
    ctx.beginPath();
    ctx.moveTo(x+10, y+66); ctx.lineTo(x+26, y+66);
    ctx.stroke();

    ctx.fillStyle = "rgba(233,238,252,.80)";
    ctx.font = "700 14px system-ui,Segoe UI,Arial";
    ctx.fillText(`${U.toFixed(1)} V`, x+10, y+h-12);
  }

  function drawResistor(x,y,w,h,R){
    roundRect(x,y,w,h,14,"rgba(255,209,102,.10)","rgba(255,209,102,.45)");
    ctx.fillStyle = "rgba(233,238,252,.92)";
    ctx.font = "800 14px system-ui,Segoe UI,Arial";
    ctx.fillText("Résistance", x+10, y+22);
    ctx.fillStyle = "rgba(233,238,252,.82)";
    ctx.font = "800 16px system-ui,Segoe UI,Arial";
    ctx.fillText(`${R} Ω`, x+w-80, y+28);

    // zigzag
    const zx1 = x+20, zx2 = x+w-20, zy = y+h-16;
    ctx.strokeStyle = "rgba(233,238,252,.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(zx1, zy);
    const n = 10;
    for (let i=1;i<=n;i++){
      const t = i/n;
      const xx = zx1 + t*(zx2-zx1);
      const yy = zy + (i%2===0 ? -8 : 8);
      ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }

  function drawInlineAmmeter(x,y,w,h){
    roundRect(x,y,w,h,14,"rgba(103,232,166,.10)","rgba(103,232,166,.45)");
    ctx.fillStyle = "rgba(233,238,252,.92)";
    ctx.font = "900 18px system-ui,Segoe UI,Arial";
    ctx.fillText("A", x+w/2-6, y+h/2+7);
  }

  function drawMultimeter(x,y,w,h,title,reading,unit){
    // corps
    roundRect(x,y,w,h,18,"rgba(255,255,255,.06)","rgba(255,255,255,.12)");

    // en-tête
    ctx.fillStyle = "rgba(233,238,252,.92)";
    ctx.font = "800 14px system-ui,Segoe UI,Arial";
    ctx.fillText(title, x+14, y+22);

    // écran
    const sx = x+18, sy = y+34, sw = w-36, sh = 54;
    roundRect(sx,sy,sw,sh,12,"rgba(0,0,0,.35)","rgba(255,255,255,.10)");

    // digits (style 7-seg simplifié)
    ctx.fillStyle = "rgba(103,232,166,.92)";
    ctx.font = "900 34px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    const txt = `${reading}`;
    ctx.fillText(txt, sx+16, sy+41);

    ctx.fillStyle = "rgba(233,238,252,.70)";
    ctx.font = "800 16px system-ui,Segoe UI,Arial";
    ctx.fillText(unit, sx+sw-46, sy+41);

    // bornes
    const bY = y + h - 28;
    drawJack(x+78, bY, "#ff4d6d", "VΩ");
    drawJack(x+w-78, bY, "#9aa4b2", "COM");
  }

  function drawJack(x,y,color,label){
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x,y,9,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath();
    ctx.arc(x+2,y+2,9,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "rgba(233,238,252,.75)";
    ctx.font = "700 12px system-ui,Segoe UI,Arial";
    ctx.fillText(label, x-14, y+24);
  }

  // ====== Events ======
  uRange.addEventListener("input", () => {
    state.U = clamp(parseFloat(uRange.value), 0, 10);
    syncUI();
    draw();
  });

  resetBtn.addEventListener("click", () => {
    state.U = 0.0;
    state.R = 100;
    uRange.value = "0";
    setActiveButton(state.R);
    logCard.style.display = "none";
    state.pinned = null;
    syncUI();
    draw();
  });

  snapBtn.addEventListener("click", () => {
    con
