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

  const state = {
    U: parseFloat(uRange.value || "0"),
    R: 100,
    vMode: "OFF",
    aMode: "OFF",
    showHotspots: false,
    bgOk: false
  };

  // === Images ===
  const bg = new Image();
  bg.src = "fond.jpg?v=3006";
  bg.onload = () => { state.bgOk = true; draw(); };
  bg.onerror = () => { state.bgOk = false; draw(); };

  const imgVolt = new Image();
  imgVolt.src = "voltmetre.png?v=3006";
  const imgA2A = new Image();
  imgA2A.src = "amperemetre_2A.png?v=3006";
  const imgAmA = new Image();
  imgAmA.src = "amperemetre_mA.png?v=3006";
  const imgAuA = new Image();
  imgAuA.src = "amperemetre_microA.png?v=3006";

  // Bbox utiles
  const SRC = {
    volt:{l:3,t:3,r:354,b:673},
    a2a:{l:5,t:10,r:394,b:611},
    ama:{l:3,t:10,r:396,b:617},
    aua:{l:4,t:5,r:397,b:613}
  };

  const DST = {
    volt:{x:0,   y:108, w:315, h:598},
    amp: {x:913, y:108, w:367, h:559}
  };

  function drawOverlayAligned(img, srcBox, dstBox) {
    const srcW = srcBox.r - srcBox.l, srcH = srcBox.b - srcBox.t;
    const sX = dstBox.w / srcW, sY = dstBox.h / srcH;
    const s = Math.min(sX, sY);
    const fitW = srcW * s, fitH = srcH * s;
    const offX = dstBox.x + (dstBox.w - fitW) / 2;
    const offY = dstBox.y + (dstBox.h - fitH) / 2;
    const dx = offX - srcBox.l * s, dy = offY - srcBox.t * s;
    const dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
    return {x:offX, y:offY, w:fitW, h:fitH};
  }

  // Zones de base
  function hotFromMeterBox(m, kind) {
    if (kind === "volt") {
      return {
        // sera corrigée ailleurs
        v_vdc:{x: m.x+0.060*m.w, y: m.y+0.430*m.h, w:0.085*m.w, h:0.120*m.h},
        v_off:{x: m.x+0.105*m.w, y: m.y+0.610*m.h, w:0.095*m.w, h:0.100*m.h}
      };
    }
    // valeurs de base pour l’ampèremètre (seront recalées ensuite)
    return {
      a_2a:{x: m.x+0.835*m.w, y: m.y+0.360*m.h, w:0.120*m.w, h:0.105*m.h},
      a_ma:{x: m.x+0.835*m.w, y: m.y+0.455*m.h, w:0.120*m.w, h:0.105*m.h},
      a_ua:{x: m.x+0.835*m.w, y: m.y+0.550*m.h, w:0.120*m.w, h:0.105*m.h},
      a_off:{x: m.x+0.210*m.w, y: m.y+0.610*m.h, w:0.110*m.w, h:0.095*m.h}
    };
  }

  function drawHotRect(r,color){
    ctx.save();
    ctx.strokeStyle=color;
    ctx.lineWidth=3;
    ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.restore();
  }

  // === LCD ===
  function readVoltText(){
    if(state.vMode!=="VDC") return "";
    return state.U.toFixed(2)+" V";
  }
  function readAmpText(){
    if(state.aMode==="OFF") return "";
    const I=I_phys(state.U,state.R);
    const rangeA = state.aMode==="2A"?2: state.aMode==="mA"?0.2:0.02;
    if(I>rangeA+1e-12) return "ERREUR";
    if(state.aMode==="2A") return I.toFixed(2)+" A";
    if(state.aMode==="mA") return (I*1000).toFixed(1)+" mA";
    if(state.aMode==="uA") return (I*1e6).toFixed(0)+" µA";
    return "";
  }
  function drawLCDText(){
    ctx.save();
    ctx.fillStyle="black";
    ctx.font="bold 30px monospace";
    ctx.textBaseline="middle";
    ctx.textAlign="center";
    const vt=readVoltText(), at=readAmpText();
    if(vt) ctx.fillText(vt, 0.102*canvas.width, 0.295*canvas.height);
    if(at) ctx.fillText(at, 0.900*canvas.width, 0.298*canvas.height);
    ctx.restore();
  }

  // === interface ===
  function buildResButtons(){
    resGrid.innerHTML="";
    RES_VALUES.forEach(r=>{
      const b=document.createElement("button");
      b.className="btn";
      b.textContent=`${r} Ω`;
      b.dataset.r=String(r);
      b.onclick=()=>{state.R=r; setActive(r); sync(); draw();};
      resGrid.appendChild(b);
    });
    setActive(state.R);
  }
  function setActive(R){
    [...resGrid.querySelectorAll("button")]
      .forEach(b=>b.classList.toggle("active",Number(b.dataset.r)===R));
  }
  function sync(){
    state.U=clamp(parseFloat(uRange.value||"0"),0,parseFloat(uRange.max||"12"));
    uTxt.textContent=state.U.toFixed(1);
    rTxt.textContent=String(state.R);
    iIdeal.textContent=(I_phys(state.U,state.R)*1000).toFixed(1);
  }

  let HOT=null;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!state.bgOk){
      ctx.fillStyle="#0f1730";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle="rgba(255,77,109,.95)";
      ctx.font="900 34px system-ui,Segoe UI,Arial";
      ctx.fillText("FOND NON CHARGÉ",40,90);
      return;
    }
    ctx.drawImage(bg,0,0,canvas.width,canvas.height);

    if(state.vMode==="VDC"){
      drawOverlayAligned(imgVolt,SRC.volt,DST.volt);
    }
    let imgA=null,srcA=null;
    if(state.aMode==="2A"){imgA=imgA2A;srcA=SRC.a2a;}
    if(state.aMode==="mA"){imgA=imgAmA;srcA=SRC.ama;}
    if(state.aMode==="uA"){imgA=imgAuA;srcA=SRC.aua;}
    if(imgA&&srcA){
      drawOverlayAligned(imgA,srcA,DST.amp);
    }

    const hv=hotFromMeterBox(DST.volt,"volt");
    const ha=hotFromMeterBox(DST.amp,"amp");
    HOT={...hv,...ha};

    // V centré + OFF voltmètre + OFF ampèremètre déjà calés précédemment
    {
      const cx=0.039*canvas.width, cy=0.555*canvas.height;
      const w=0.085*DST.volt.w, h=0.120*DST.volt.h/2;
      HOT.v_vdc={x:cx-w/2,y:cy-h/2,w,h};
    }
    {
      const cx=0.054*canvas.width, cy=0.642*canvas.height;
      const w=0.095*DST.volt.w, h=0.100*DST.volt.h;
      HOT.v_off={x:cx-w/2,y:cy-h/2,w,h};
    }
    {
      const cx=0.842*canvas.width, cy=0.631*canvas.height;
      const w=0.110*DST.amp.w, h=0.095*DST.amp.h;
      HOT.a_off={x:cx-w/2,y:cy-h/2,w,h};
    }

    // === Recentrage des calibres A ===
    // a_2a centré sur (0.945, 0.479)
    {
      const cx = 0.945 * canvas.width;
      const cy = 0.479 * canvas.height;
      const w  = 0.10 * DST.amp.w;   // un peu plus petit que 0.120
      const h  = 0.08 * DST.amp.h;   // un peu plus petit que 0.105
      HOT.a_2a = { x: cx - w/2, y: cy - h/2, w, h };
    }
    // a_ma centré sur (0.928, 0.447)
    {
      const cx = 0.928 * canvas.width;
      const cy = 0.447 * canvas.height;
      const w  = 0.10 * DST.amp.w;
      const h  = 0.08 * DST.amp.h;
      HOT.a_ma = { x: cx - w/2, y: cy - h/2, w, h };
    }
    // a_ua centré sur (0.910, 0.427)
    {
      const cx = 0.910 * canvas.width;
      const cy = 0.427 * canvas.height;
      const w  = 0.10 * DST.amp.w;
      const h  = 0.08 * DST.amp.h;
      HOT.a_ua = { x: cx - w/2, y: cy - h/2, w, h };
    }
    // avec ces tailles, les trois rectangles restent séparés (pas de chevauchement).

    drawLCDText();
    if(state.showHotspots && HOT){
      drawHotRect(HOT.v_vdc,"yellow");
      drawHotRect(HOT.v_off,"yellow");
      drawHotRect(HOT.a_2a,"cyan");
      drawHotRect(HOT.a_ma,"cyan");
      drawHotRect(HOT.a_ua,"cyan");
      drawHotRect(HOT.a_off,"cyan");
    }
  }

  // === Clics ===
  function normPos(evt){
    const r=canvas.getBoundingClientRect();
    return {x:(evt.clientX-r.left)/r.width, y:(evt.clientY-r.top)/r.height};
  }
  function inRect(px,py,r){
    return px>=r.x && px<=r.x+r.w && py>=r.y && py<=r.y+r.h;
  }

  canvas.addEventListener("click",(e)=>{
    if(!HOT) return;
    const p=normPos(e);
    console.log("CLICK canvas", p.x.toFixed(3), p.y.toFixed(3));
    const x=p.x*canvas.width, y=p.y*canvas.height;

    if(inRect(x,y,HOT.v_vdc)){
      state.vMode="VDC";
      status.textContent="Voltmètre : V⎓ sélectionné.";
      draw(); return;
    }
    if(inRect(x,y,HOT.v_off)){
      state.vMode="OFF";
      status.textContent="Voltmètre : OFF.";
      draw(); return;
    }

    if(inRect(x,y,HOT.a_2a)){
      state.aMode="uA";
      status.textContent="Ampèremètre : µA sélectionné.";
      draw(); return;
    }
    if(inRect(x,y,HOT.a_ma)){
      state.aMode="mA";
      status.textContent="Ampèremètre : mA sélectionné.";
      draw(); return;
    }
    if(inRect(x,y,HOT.a_ua)){
      state.aMode="2A";
      status.textContent="Ampèremètre : 2A sélectionné.";
      draw(); return;
    }
    if(inRect(x,y,HOT.a_off)){
      state.aMode="OFF";
      status.textContent="Ampèremètre : OFF.";
      draw(); return;
    }
  });

  // === Events ===
  uRange.addEventListener("input",()=>{sync();draw();});
  resetBtn.onclick=()=>{
    state.U=3;
    state.R=100;
    state.vMode="OFF";
    state.aMode="OFF";
    uRange.value="3";
    setActive(100);
    sync();
    status.textContent="Reset : OFF.";
    draw();
  };
  showHotBtn.onclick=()=>{
    state.showHotspots=!state.showHotspots;
    draw();
  };

  // === Init ===
  buildResButtons();
  sync();
  status.textContent="Départ : OFF. Clique V⎓ puis un calibre A.";
  draw();
})();
