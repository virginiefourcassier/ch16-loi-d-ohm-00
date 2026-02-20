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

  // ====== Données électriques ======
  const RES_VALUES = [10, 33, 47, 68, 100, 220, 330, 470];

  const state = {
    U: parseFloat(uRange.value),
    R: 100,

    // états “sélecteurs”
    vOn: false,                 // devient true quand on clique sur la zone V⎓ (gauche)
    aRangeIndex: null,          // 0,1,2 quand on clique une zone A⎓ (droite)

    // calibres A⎓ (3 positions demandées)
    aRangesA: [0.002, 0.02, 0.2], // 2 mA, 20 mA, 200 mA (en ampères)

    // aide debug visuel
    showHotspots: false,
  };

  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }
  function I_phys(U,R){ return (R > 0) ? (U / R) : 0; } // A

  // ====== Image de fond (ta PJ) ======
  const bg = new Image();
  let bgOk = false;
  bg.onload = () => { bgOk = true; draw(); };
  bg.onerror = () => { bgOk = false; draw(); };
  bg.src = "fond.jpg"; // <-- tu mets ta PJ renommée "fond.jpg" à la racine

  // ====== HOTSPOTS (zones cliquables) ======
  // Coordonnées en fraction (0..1) de la taille du canvas.
  // Ajustables si besoin.
  //
  // NOTE : si c'est décalé chez toi, tu ajustes x,y,w,h ci-dessous.
  const HOT = {
    // Voltmètre gauche : une zone cliquable sur "V continu"
    v_dc: { x: 0.125, y: 0.345, w: 0.16, h: 0.19 },

    // Ampèremètre droite : 3 zones (3 calibres DC)
    // du plus grand au plus petit OU l’inverse : ici on met 200mA, 20mA, 2mA
    a_200m: { x: 0.735, y: 0.350, w: 0.16, h: 0.11 }, // 200 mA
    a_20m:  { x: 0.735, y: 0.465, w: 0.16, h: 0.11 }, // 20 mA
    a_2m:   { x: 0.735, y: 0.580, w: 0.16, h: 0.11 }, // 2 mA
  };

  // Positions des “molettes” (pour dessiner un repère tourné)
  // (à ajuster si besoin : centre x,y en fraction + rayon en px)
  const KNOB = {
    v: { cx: 0.165, cy: 0.530, r: 70 },
    a: { cx: 0.835, cy: 0.530, r: 70 },
  };

  // Angles (en radians) du repère pour simuler la rotation
  // (valeurs esthétiques, pas critiques)
  const ANG = {
    v_off: -2.2,
    v_dc:  -1.2,
    a_200m: -1.35,
    a_20m:  -1.65,
    a_2m:   -1.95,
    a_off:  -2.2,
  };

  // Zones “écran LCD” où on superpose le texte
  const LCD = {
    v: { x: 0.085, y: 0.205, w: 0.255, h: 0.105 },
    a: { x: 0.675, y: 0.205, w: 0.255, h: 0.105 },
  };

  function inRect(px,py, r){
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  function normPos(evt){
    const rect = canvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left) / rect.width;
    const y = (evt.clientY - rect.top) / rect.height;
    return { x, y };
  }

  // ====== UI R ======
  function setActiveR(R){
    [...resGrid.querySelectorAll("button")].forEach(b => {
      b.classList.toggle("active", Number(b.dataset.r) === R);
    });
  }

  function buildResButtons(){
    resGrid.innerHTML = "";
    RES_VALUES.forEach(r => {
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = `${r} Ω`;
      b.dataset.r = String(r);
      b.addEventListener("click", () => {
        state.R = r;
        rTxt.textContent = String(r);
        setActiveR(r);
        syncNumbers();
        draw();
      });
      resGrid.appendChild(b);
    });
    setActiveR(state.R);
  }

  // ====== Mesures / affichages ======
  function format_mA(valA, decimals){
    return (valA * 1000).toFixed(decimals);
  }

  function readVoltmeter(){
    // Uniquement actif après clic sur zone V⎓
    if (!state.vOn) return { text: "", unit: "" };

    // Ici, on suppose (comme physix) que le voltmètre est correctement branché aux bornes de R
    const U = state.U;
    // Affichage : 2 décimales
    return { text: U.toFixed(2), unit: "V" };
  }

  function readAmmeter(){
    if (state.aRangeIndex === null) return { text:"", unit:"" };

    const I = I_phys(state.U, state.R); // A
    const rangeA = state.aRangesA[state.aRangeIndex]; // A

    // Si calibre < intensité : ERREUR
    if (I > rangeA + 1e-12) return { text:"ERREUR", unit:"" };

    // Précision augmente quand on diminue le calibre
    // 200mA -> 1 décimale ; 20mA -> 2 ; 2mA -> 3
    const decimals = (state.aRangeIndex === 0) ? 1 : (state.aRangeIndex === 1) ? 2 : 3;
    return { text: format_mA(I, decimals), unit:"mA" };
  }

  function syncNumbers(){
    state.U = clamp(parseFloat(uRange.value), 0, 10);
    uTxt.textContent = state.U.toFixed(1);

    rTxt.textContent = String(state.R);

    const I = I_phys(state.U, state.R);
    iIdeal.textContent = format_mA(I, 1);
  }

  // ====== Dessin ======
  function drawHotRect(h, color){
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(h.x * canvas.width, h.y * canvas.height, h.w * canvas.width, h.h * canvas.height);
    ctx.restore();
  }

  function drawKnobMarker(which, angle){
    const k = KNOB[which];
    const cx = k.cx * canvas.width;
    const cy = k.cy * canvas.height;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // repère (ligne)
    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(k.r, 0);
    ctx.stroke();

    // point au bout
    ctx.fillStyle = "rgba(255,77,109,.92)";
    ctx.beginPath();
    ctx.arc(k.r, 0, 8, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  }

  function drawLCD(which, text, unit){
    const r = LCD[which];
    const x = r.x * canvas.width;
    const y = r.y * canvas.height;
    const w = r.w * canvas.width;
    const h = r.h * canvas.height;

    // léger voile pour lisibilité (sans masquer totalement l'écran)
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.10)";
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = "rgba(0,0,0,.78)";
    ctx.font = "700 56px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textBaseline = "middle";

    const t = text || "";
    const ux = unit || "";

    // texte principal
    ctx.fillText(t, x + 18, y + h/2);

    // unité à droite
    ctx.font = "700 28px system-ui, Segoe UI, Arial";
    ctx.fillText(ux, x + w - 55, y + h/2 + 6);

    ctx.restore();
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Fond
    if (bgOk){
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#111831";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = "rgba(233,238,252,.85)";
      ctx.font = "800 18px system-ui, Segoe UI, Arial";
      ctx.fillText("Erreur : fond.jpg introuvable (mets l'image à la racine du dépôt).", 24, 36);
    }

    // Mesures (overlay)
    const v = readVoltmeter();
    const a = readAmmeter();
    drawLCD("v", v.text, v.unit);
    drawLCD("a", a.text, a.unit);

    // Repères “molettes”
    // Voltmètre : OFF tant que pas cliqué
    drawKnobMarker("v", state.vOn ? ANG.v_dc : ANG.v_off);

    // Ampèremètre : angle selon calibre choisi
    let aAng = ANG.a_off;
    if (state.aRangeIndex === 0) aAng = ANG.a_200m;
    if (state.aRangeIndex === 1) aAng = ANG.a_20m;
    if (state.aRangeIndex === 2) aAng = ANG.a_2m;
    drawKnobMarker("a", aAng);

    // Debug visuel : zones
    if (state.showHotspots){
      drawHotRect(HOT.v_dc, "rgba(103,232,166,.95)");
      drawHotRect(HOT.a_200m, "rgba(122,167,255,.95)");
      drawHotRect(HOT.a_20m,  "rgba(122,167,255,.95)");
      drawHotRect(HOT.a_2m,   "rgba(122,167,255,.95)");
    }
  }

  // ====== Click handler (zones cliquables) ======
  canvas.addEventListener("click", (evt) => {
    const p = normPos(evt);

    // Voltmètre (1 zone)
    if (inRect(p.x, p.y, HOT.v_dc)){
      state.vOn = true;
      status.textContent = "Voltmètre réglé sur V⎓ : affichage de la tension U aux bornes de R.";
      draw();
      return;
    }

    // Ampèremètre (3 zones)
    if (inRect(p.x, p.y, HOT.a_200m)){
      state.aRangeIndex = 0;
      status.textContent = "Ampèremètre réglé sur calibre 200 mA (A⎓).";
      draw();
      return;
    }
    if (inRect(p.x, p.y, HOT.a_20m)){
      state.aRangeIndex = 1;
      status.textContent = "Ampèremètre réglé sur calibre 20 mA (A⎓).";
      draw();
      return;
    }
    if (inRect(p.x, p.y, HOT.a_2m)){
      state.aRangeIndex = 2;
      status.textContent = "Ampèremètre réglé sur calibre 2 mA (A⎓).";
      draw();
      return;
    }
  });

  // ====== Events UI ======
  uRange.addEventListener("input", () => {
    syncNumbers();
    draw();
  });

  resetBtn.addEventListener("click", () => {
    state.U = 3.0;
    state.R = 100;
    state.vOn = false;
    state.aRangeIndex = null;
    uRange.value = String(state.U);
    setActiveR(state.R);
    syncNumbers();
    status.textContent = "Reset : cliquez sur les zones des multimètres pour choisir V⎓ et un calibre A⎓.";
    draw();
  });

  showHotBtn.addEventListener("click", () => {
    state.showHotspots = !state.showHotspots;
    draw();
  });

  // ====== Init ======
  buildResButtons();
  syncNumbers();
  status.textContent = "Cliquez sur la zone V⎓ (voltmètre gauche) et sur un calibre A⎓ (ampèremètre droite).";
  draw();

})();
