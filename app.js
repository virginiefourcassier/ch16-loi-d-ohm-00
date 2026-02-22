(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("c");
  const ctx = canvas.getContext("2d");

  const uRange = $("uRange");
  const uTxt   = $("uTxt");
  const rTxt   = $("rTxt");
  const resGrid= $("resGrid");
  const iIdeal = $("iIdeal");
  const status = $("status");
  const resetBtn   = $("resetBtn");
  const showHotBtn = $("showHotBtn");

  const RES_VALUES = [10, 33, 47, 68, 100, 220, 330, 470];
  const clamp = (x,a,b) => Math.max(a, Math.min(b,x));
  const I_phys = (U,R) => (R>0 ? U/R : 0); // A

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
  bg.onload  = () => { state.bgOk = true; draw(); };
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
    a2a :{l:5,t:10,r:394,b:611},
    ama :{l:3,t:10,r:396,b:617},
    aua :{l:4,t:5,r:397,b:613}
  };

  const DST = {
    volt:{x:0,   y:108, w:315, h:598},
    amp :{x:913, y:108, w:367, h:559}
  };

  function drawOverlayAligned(img, srcBox, dstBox){
    const srcW = srcBox.r - srcBox.l, srcH = srcBox.b - srcBox.t;
    const sX = dstB
