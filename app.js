(() => {
  "use strict";

  const must = (id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Élément manquant dans index.html : #${id}`);
    return el;
  };

  // DOM indispensables
  const canvas = must("c");
  const ctx = canvas.getContext("2d");

  const uRange = must("uRange");
  const uTxt   = must("uTxt");
  const rTxt   = must("rTxt");
  const iTxt   = must("iTxt");
  const iUnit  = must("iUnit");
  const resGrid = must("resGrid");

  // DOM optionnels (si présents)
  const vRangeSel = document.getElementById("vRangeSel"); // calibre V
  const aRangeSel = document.getElementById("aRangeSel"); // calibre A

  const resetBtn = document.getElementById("resetBtn");
  const snapBtn  = document.getElementById("snapBtn");
  const logCard  = document.getElementById("logCard");
  const logTxt   = document.getElementById("logTxt");

  const RES_VALUES = [10, 33, 47, 68, 100, 220, 330, 470];

  const state = {
    U: 0.0,
    R: 100
  };

  function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
  function computeI(U, R){ return (R > 0) ? (U / R) : 0; }

  function formatCurrent(I_A){
    const abs = Math.abs(I_A);
    if (abs < 1) return { val: (I_A * 1000).toFixed(1), unit: "mA" };
    return { val: I_A.toFixed(3), unit: "A" };
  }
  function formatVoltage(U){ return U.toFixed(1); }

  function setActiveButton(R){
    [...resGrid.querySelectorAll("button")].forEach(btn => {
      btn.classList.toggle("active", Number(btn.dataset.r) === R);
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

  function draw(){
    // (ton code de dessin actuel ici inchangé)
    // 👉 Important : s’assurer qu’il utilise state.U/state.R
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Exemple minimal de preuve visuelle si besoin :
    ctx.fillStyle = "rgba(233,238,252,.9)";
    ctx.font = "700 18px system-ui,Segoe UI,Arial";
    ctx.fillText(`U = ${state.U.toFixed(1)} V  |  R = ${state.R} Ω`, 24, 40);
  }

  // 🔧 Écouteur slider (input + change)
  const onU = () => {
    state.U = clamp(parseFloat(uRange.value || "0"), 0, 10);
    syncUI();
    draw();
  };
  uRange.addEventListener("input", onU);
  uRange.addEventListener("change", onU);

  // Boutons (si présents)
  if (resetBtn) resetBtn.addEventListener("click", () => {
    state.U = 0.0; state.R = 100;
    uRange.value = "0";
    setActiveButton(state.R);
    if (logCard) logCard.style.display = "none";
    syncUI(); draw();
  });

  if (snapBtn && logCard && logTxt) snapBtn.addEventListener("click", () => {
    const I = computeI(state.U, state.R);
    const fI = formatCurrent(I);
    logTxt.textContent = `U = ${state.U.toFixed(1)} V ; R = ${state.R} Ω ; I = ${fI.val} ${fI.unit}`;
    logCard.style.display = "block";
  });

  // ✅ INIT : lire la valeur du slider et mettre à jour l’affichage
  buildResButtons();
  onU();      // <-- indispensable : synchro immédiate
})();
