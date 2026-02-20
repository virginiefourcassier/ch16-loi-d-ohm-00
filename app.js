(() => {
  "use strict";

  const $ = (id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Élément manquant : #${id}`);
    return el;
  };

  // Canvas
  const canvas = $("c");
  const ctx = canvas.getContext("2d");

  // Générateur / R
  const uRange = $("uRange");
  const rRange = $("rRange");
  const uTxt = $("uTxt");
  const rTxt = $("rTxt");

  // Voltmètre
  const vDial = $("vDial");
  const vRedJack = $("vRedJack");
  const vBlackNode = $("vBlackNode");
  const vRedNode = $("vRedNode");

  // Ampèremètre
  const aDial = $("aDial");
  const aRedJack = $("aRedJack");
  const aBlackNode = $("aBlackNode");
  const aRedNode = $("aRedNode");

  // UI
  const statusBox = $("statusBox");
  const resetBtn = $("resetBtn");
  const refBtn = $("refBtn");
  const refCard = $("refCard");
  const refTxt = $("refTxt");

  // Image centrale optionnelle
  const montageImg = new Image();
  let montageOk = false;
  montageImg.onload = () => { montageOk = true; draw(); };
  montageImg.onerror = () => { montageOk = false; draw(); };
  montageImg.src = "montage.jpg"; // optionnel

  // ====== État ======
  const state = {
    U: parseFloat(uRange.value),
    R: parseFloat(rRange.value),
    // fusible mA de l'ampèremètre
    aFuseBlown: false,
  };

  // ====== Circuit (modèle simple) ======
  // Série: Source U en série avec R.
  // Noeuds:
  // N0 : borne - source
  // N1 : borne + source
  // NR : borne R côté + (après la coupure série droite)
  // NL : borne R côté - (avant retour N0)
  // SER_L / SER_R : points de coupure pour insérer l'ampèremètre en série
  //
  // Ici: N1 -> SER_L -> (ampèremètre si branché) -> SER_R -> NR -> R -> NL -> N0
  //
  // Si ampèremètre n'est pas inséré correctement: on considère circuit "ouvert" => I=0.
  // Si ampèremètre est branché en parallèle (ex: entre N1 et N0) en mode courant : court-circuit => FUSE/OL.

  function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }

  function idealCurrent(U, R){
    if (R <= 0) return 0;
    return U / R; // A
  }

  // Potentiels idéaux des noeuds si circuit fermé (sans résistance interne)
  function nodeVoltages(U){
    // Choix: N0 = 0V, N1 = U
    return {
      N0: 0,
      N1: U,
      SER_L: U,   // avant insertion A
      SER_R: U,   // après insertion A (idéal)
      NR: U,      // borne R côté +
      NL: 0,      // borne R côté -
    };
  }

  function format7segNumber(valStr){
    // valStr déjà prêt (ex: "3.40", "OL", "FUSE")
    return valStr;
  }

  function parseDial(dialVal){
    // Voltmètre: OFF, V_0.2, V_2, V_20
    // Ampèremètre: OFF, A_0.002, A_0.02, A_0.2, A_10
    if (dialVal === "OFF") return { mode:"OFF" };
    const [m, r] = dialVal.split("_"); // "V" / "A"
    const range = parseFloat(r);
    return { mode:m, range };
  }

  // ====== Vérification branchements ======
  function isVoltmeterWiredCorrectly(dial, redJack){
    // On accepte uniquement V⎓ et redJack=V (VΩmA)
    if (dial.mode !== "V") return false;
    if (redJack !== "V") return false;
    return true;
  }

  function isAmmeterJackCorrectForRange(dial, redJack){
    if (dial.mode !== "A") return false;
    if (dial.range === 10) return redJack === "10A";
    // gammes mA
    return redJack === "mA";
  }

  function isAmmeterInsertedInSeries(blackNode, redNode){
    // Insertion correcte : entre SER_L et SER_R (dans un sens ou l’autre)
    const a = blackNode, b = redNode;
    return (a === "SER_L" && b === "SER_R") || (a === "SER_R" && b === "SER_L");
  }

  function isAmmeterParallelShort(blackNode, redNode){
    // Court-circuit "grossier" si relié entre N1 et N0
    const a = blackNode, b = redNode;
    return (a === "N1" && b === "N0") || (a === "N0" && b === "N1");
  }

  function isAmmeterAcrossResistor(blackNode, redNode){
    // Branché aux bornes de la résistance (NR <-> NL)
    const a = blackNode, b = redNode;
    return (a === "NR" && b === "NL") || (a === "NL" && b === "NR");
  }

  function computeCircuitClosed(){
    // Circuit fermé si l'ampèremètre est correctement inséré en série
    // OU si l'ampèremètre est OFF/voltage mode et on considère que la boucle est fermée "sans coupure".
    //
    // Mais dans notre modèle, la coupure existe et doit être pontée.
    // Pour rendre réaliste : le circuit n'est fermé QUE si l'ampèremètre relie SER_L et SER_R.
    //
    const aD = parseDial(aDial.value);
    const aInserted = isAmmeterInsertedInSeries(aBlackNode.value, aRedNode.value);
    // Même si le sélecteur est OFF, les pointes peuvent physiquement relier : on ferme si insertion série.
    return aInserted;
  }

  // ====== Mesures ======
  function readVoltmeter(){
    const d = parseDial(vDial.value);
    if (d.mode === "OFF") return { text:"", on:false, note:"Voltmètre sur OFF." };

    // Mauvaise fonction (ex: l'élève met le voltmètre sur un mode qui n'existe pas ici)
    if (d.mode !== "V") return { text:"OL", on:true, note:"Voltmètre non réglé sur V⎓." };

    // Mauvais jack rouge
    if (vRedJack.value !== "V") return { text:"OL", on:true, note:"Voltmètre : jack rouge incorrect (mettre VΩmA)." };

    // Valeur mesurée = différence de potentiel entre noeuds sélectionnés
    const closed = computeCircuitClosed();
    const V = nodeVoltages(state.U);
    // Si circuit ouvert, on garde N1=U et N0=0, NR=U (car côté source), NL=0 (retour) — c'est cohérent ici.
    // (Dans un vrai montage, certaines tensions pourraient dépendre, mais on reste pédagogique.)
    const Vb = V[vBlackNode.value];
    const Vr = V[vRedNode.value];
    const meas = (Vr - Vb);

    const abs = Math.abs(meas);
    if (abs > d.range + 1e-12) return { text:"OL", on:true, note:`Voltmètre hors calibre (${d.range} V).` };

    // Affichage type DMM: selon gamme
    let decimals = 2;
    if (d.range === 0.2) decimals = 3; // 200 mV -> mV précision
    if (d.range === 2) decimals = 3;
    if (d.range === 20) decimals = 2;

    const text = meas.toFixed(decimals);
    return { text, on:true, note: closed ? "Voltmètre : OK." : "Circuit ouvert (ampèremètre non inséré) : mesures partielles possibles." };
  }

  function readAmmeter(){
    const d = parseDial(aDial.value);
    if (d.mode === "OFF") return { text:"", on:false, note:"Ampèremètre sur OFF." };

    if (d.mode !== "A") return { text:"OL", on:true, note:"Ampèremètre non réglé sur A⎓." };

    // Fusible déjà grillé ?
    if (state.aFuseBlown && d.range < 10) {
      return { text:"FUSE", on:true, note:"Fusible mA grillé (reset pour réarmer)." };
    }

    // Jack rouge adapté ?
    if (!isAmmeterJackCorrectForRange(d, aRedJack.value)) {
      return { text:"OL", on:true, note:"Ampèremètre : jack rouge incompatible avec le calibre choisi." };
    }

    // Court-circuit si branché N1<->N0 ou aux bornes de R en mode courant
    if (isAmmeterParallelShort(aBlackNode.value, aRedNode.value) || isAmmeterAcrossResistor(aBlackNode.value, aRedNode.value)) {
      if (d.range < 10) {
        state.aFuseBlown = true;
        return { text:"FUSE", on:true, note:"Court-circuit en mode mA → fusible grillé." };
      }
      return { text:"OL", on:true, note:"Court-circuit potentiel en 10A → surcharge." };
    }

    // Mesure correcte seulement si inséré en série (SER_L <-> SER_R)
    const inserted = isAmmeterInsertedInSeries(aBlackNode.value, aRedNode.value);
    if (!inserted) return { text:"0.000", on:true, note:"Ampèremètre non inséré en série (utiliser SER_L et SER_R)." };

    // Circuit fermé -> I = U/R
    const I = idealCurrent(state.U, state.R);
    const abs = Math.abs(I);

    // Hors calibre
    if (abs > d.range + 1e-12) return { text:"OL", on:true, note:`Ampèremètre hors calibre (${d.range} A).` };

    // Format affichage selon gamme
    // En mA pour gammes < 1A (ce qui est le cas ici, sauf 10A)
    let text;
    if (d.range < 1) {
      // affichage en mA, avec 1 décimale sur 200mA/20mA, etc.
      const mA = I * 1000;
      const dec = (d.range <= 0.002) ? 2 : 1; // 2mA -> un peu plus fin
      text = mA.toFixed(dec);
      return { text, on:true, unit:"mA", note:"Ampèremètre : OK (mA)." };
    } else {
      // 10A
      text = I.toFixed(3);
      return { text, on:true, unit:"A", note:"Ampèremètre : OK (A)." };
    }
  }

  // ====== Référence (valeurs idéales) ======
  function updateRef(){
    const I = idealCurrent(state.U, state.R);
    const mA = I * 1000;
    refTxt.textContent = `U = ${state.U.toFixed(1)} V ; R = ${state.R.toFixed(0)} Ω ; I = ${mA.toFixed(1)} mA (idéal)`;
  }

  // ====== Dessin des multimètres + montage ======
  function roundRect(x,y,w,h,r, fill, stroke){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
    if (fill){ ctx.fillStyle = fill; ctx.fill(); }
    if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  function drawDMM(x,y,w,h, title, reading, unit, dialText, isOn, alertText){
    // body
    roundRect(x,y,w,h,18,"rgba(0,0,0,.35)","rgba(255,255,255,.10)");
    // header label
    ctx.fillStyle = "rgba(233,238,252,.92)";
    ctx.font = "800 12px system-ui,Segoe UI,Arial";
    ctx.fillText(title, x+14, y+18);

    // screen
    const sx = x+14, sy = y+26, sw = w-28, sh = 62;
    roundRect(sx,sy,sw,sh,12, isOn ? "rgba(103,232,166,.12)" : "rgba(0,0,0,.25)", "rgba(255,255,255,.10)");

    // reading
    ctx.fillStyle = isOn ? "rgba(103,232,166,.92)" : "rgba(233,238,252,.22)";
    ctx.font = "900 34px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    const txt = format7segNumber(reading);
    ctx.fillText(txt, sx+14, sy+44);

    // unit
    ctx.fillStyle = isOn ? "rgba(233,238,252,.78)" : "rgba(233,238,252,.22)";
    ctx.font = "800 16px system-ui,Segoe UI,Arial";
    ctx.fillText(unit || "", sx+sw-52, sy+44);

    // knob zone
    const kx = x + w/2, ky = y + h - 110;
    ctx.fillStyle = "rgba(255,255,255,.06)";
    ctx.beginPath(); ctx.arc(kx,ky,68,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(kx,ky,68,0,Math.PI*2); ctx.stroke();

    // pointer (simple)
    ctx.save();
    ctx.translate(kx,ky);
    ctx.rotate(-Math.PI/2 + dialText.angle);
    ctx.strokeStyle = "rgba(233,238,252,.75)";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(54,0);
    ctx.stroke();
    ctx.restore();

    // dial label
    ctx.fillStyle = "rgba(233,238,252,.80)";
    ctx.font = "800 12px system-ui,Segoe UI,Arial";
    ctx.fillText(dialText.label, x+14, y+h-18);

    // alert
    if (alertText){
      ctx.fillStyle = "rgba(255,77,109,.95)";
      ctx.font = "900 12px system-ui,Segoe UI,Arial";
      ctx.fillText(alertText, sx+sw-70, sy+18);
    }

    // jacks representation (COM / VΩmA / mA / 10A)
    // purely decorative here; wiring done via selects
    const jy = y + h - 36;
    const jx1 = x + 40, jx2 = x + 90, jx3 = x + w - 90, jx4 = x + w - 40;

    drawJack(jx1, jy, "COM", "#9aa4b2");
    drawJack(jx2, jy, "VΩmA", "#67e8a6");
    drawJack(jx3, jy, "mA", "#67e8a6");
    drawJack(jx4, jy, "10A", "#ff4d6d");
  }

  function drawJack(x,y,label,color){
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.arc(x,y,10,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x,y,10,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = "rgba(233,238,252,.70)";
    ctx.font = "700 10px system-ui,Segoe UI,Arial";
    ctx.fillText(label, x-16, y+22);
  }

  function dialVisual(val){
    // convert select value into (label, angle)
    // just aesthetic
    const map = {
      "OFF": { label:"OFF", angle: 0.0 },
      "V_0.2": { label:"V⎓ 200mV", angle: 0.6 },
      "V_2": { label:"V⎓ 2V", angle: 1.0 },
      "V_20": { label:"V⎓ 20V", angle: 1.4 },
      "A_0.002": { label:"A⎓ 2mA", angle: 0.6 },
      "A_0.02": { label:"A⎓ 20mA", angle: 1.0 },
      "A_0.2": { label:"A⎓ 200mA", angle: 1.4 },
      "A_10": { label:"A⎓ 10A", angle: 1.8 },
    };
    return map[val] || { label: val, angle: 0.0 };
  }

  function drawCircuitPanel(x,y,w,h){
    roundRect(x,y,w,h,18,"rgba(255,255,255,.04)","rgba(255,255,255,.10)");

    ctx.fillStyle = "rgba(233,238,252,.92)";
    ctx.font = "800 16px system-ui,Segoe UI,Arial";
    ctx.fillText("Montage / points de connexion", x+14, y+22);

    // draw nodes labels (visual map)
    const p = {
      N1: {x:x+85, y:y+78},
      N0: {x:x+85, y:y+h-70},
      SER_L: {x:x+w/2-80, y:y+78},
      SER_R: {x:x+w/2+80, y:y+78},
      NR: {x:x+w-110, y:y+78},
      NL: {x:x+w-110, y:y+h-70},
    };

    // wires rectangle
    ctx.strokeStyle = "rgba(233,238,252,.70)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.N1.x, p.N1.y);
    ctx.lineTo(p.SER_L.x, p.SER_L.y);
    ctx.lineTo(p.SER_R.x, p.SER_R.y);
    ctx.lineTo(p.NR.x, p.NR.y);
    ctx.lineTo(p.NL.x, p.NL.y);
    ctx.lineTo(p.N0.x, p.N0.y);
    ctx.closePath();
    ctx.stroke();

    // source label
    ctx.fillStyle = "rgba(122,167,255,.20)";
    roundRect(x+20, y+52, 130, 140, 14, "rgba(122,167,255,.12)", "rgba(122,167,255,.45)");
    ctx.fillStyle = "rgba(233,238,252,.92)";
    ctx.font = "800 13px system-ui,Segoe UI,Arial";
    ctx.fillText("Générateur", x+32, y+74);
    ctx.fillStyle = "rgba(233,238,252,.80)";
    ctx.font = "900 18px system-ui,Segoe UI,Arial";
    ctx.fillText(`${state.U.toFixed(1)} V`, x+42, y+118);

    // resistor label
    roundRect(x+w-230, y+52, 200, 64, 14, "rgba(255,209,102,.10)", "rgba(255,209,102,.45)");
    ctx.fillStyle = "rgba(233,238,252,.92)";
    ctx.font = "800 13px system-ui,Segoe UI,Arial";
    ctx.fillText("Résistance", x+w-218, y+74);
    ctx.fillStyle = "rgba(233,238,252,.85)
